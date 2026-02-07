"""
The Horizon Digital Twin Model.

This is the CORE of what makes Horizon a digital twin, not just a dashboard.

The HomeTwinModel:
1. Maintains a physics-based model of the entire home
2. Steps forward in time with each telemetry input
3. Computes derived quantities sensors can't measure directly:
   - Room temperatures from thermal dynamics
   - EV time-to-target from charging curve
   - Water heater efficiency from tank model
   - Comfort forecasts from thermal trends
4. Provides the FULL computed state of the home at any time

Usage:
    twin = HomeTwinModel.from_seed_data(home, rooms, devices, preferences)
    twin.ingest_telemetry(device_id=1, power_kw=2.3, temp_c=38.0, status="on")
    state = twin.get_state()  # returns full computed twin state
"""
import time
import math
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import Optional, Any

from ml.device_models import (
    ACModel, ACState,
    EVChargerModel, EVState,
    WaterHeaterModel, WaterHeaterState,
    WasherDryerModel, WasherState,
)
from ml.thermal_model import (
    RoomThermalModel, RoomThermalState,
    compute_solar_irradiance, compute_occupancy,
)


@dataclass
class EnvironmentState:
    """Current environmental conditions (from scenario or sensors)."""
    outside_temp_c: float = 36.0
    solar_irradiance_w_m2: float = 500.0
    wind_speed_ms: float = 2.0
    humidity_pct: float = 55.0
    grid_carbon_intensity: float = 0.45  # kg CO2 / kWh


@dataclass
class EnergyAccumulator:
    """Tracks energy totals computed by the twin since reset."""
    total_energy_kwh: float = 0.0
    cost_aed: float = 0.0
    co2_kg: float = 0.0
    peak_power_kw: float = 0.0
    _tariff: float = 0.38
    _emission_factor: float = 0.45

    def accumulate(self, power_kw: float, dt_seconds: float):
        dt_hours = dt_seconds / 3600.0
        energy = power_kw * dt_hours
        self.total_energy_kwh = round(self.total_energy_kwh + energy, 4)
        self.cost_aed = round(self.total_energy_kwh * self._tariff, 2)
        self.co2_kg = round(self.total_energy_kwh * self._emission_factor, 2)
        self.peak_power_kw = round(max(self.peak_power_kw, power_kw), 3)


@dataclass
class TwinSnapshot:
    """Complete computed state of the digital twin at a point in time."""
    timestamp: str
    home_name: str

    # Environment
    environment: dict

    # Per-room computed state (from thermal model)
    rooms: list[dict]

    # Per-device computed state (from device models)
    devices: list[dict]

    # Aggregated energy metrics
    energy: dict

    # Overall comfort
    comfort_summary: dict

    # Twin metadata
    twin_step_count: int
    twin_uptime_seconds: float


class HomeTwinModel:
    """
    The digital twin for a home.

    This is not a database — it's a continuously evolving model of the
    physical home. Every telemetry input advances the physics simulation,
    and the twin computes values that raw sensors cannot provide.
    """

    def __init__(self, home_name: str = "Villa A"):
        self.home_name = home_name
        self.room_models: dict[int, RoomThermalModel] = {}
        self.device_models: dict[int, Any] = {}
        self.device_room_map: dict[int, int] = {}  # device_id -> room_id
        self.device_type_map: dict[int, str] = {}   # device_id -> type

        self.environment = EnvironmentState()
        self.energy = EnergyAccumulator()
        self.comfort_min_c = 22.0
        self.comfort_max_c = 26.0
        self.ev_target_soc = 80.0
        self.ev_departure_time = "07:30"

        self._step_count = 0
        self._start_time = time.time()
        self._last_step_time = time.time()

    # ─── Factory ──────────────────────────────────────────
    @classmethod
    def from_seed_data(
        cls,
        home_name: str,
        rooms: list[dict],
        devices: list[dict],
        preferences: dict,
        outside_temp_c: float = 36.0,
    ) -> "HomeTwinModel":
        """
        Initialize the twin from seed/DB data.

        rooms: [{"id": 1, "name": "Living Room"}, ...]
        devices: [{"id": 1, "room_id": 1, "type": "ac", "name": "...", "setpoint": 24.0, ...}, ...]
        preferences: {"comfort_min_c": 22, "comfort_max_c": 26, ...}
        """
        twin = cls(home_name=home_name)
        twin.comfort_min_c = preferences.get("comfort_min_c", 22.0)
        twin.comfort_max_c = preferences.get("comfort_max_c", 26.0)
        twin.ev_target_soc = preferences.get("ev_target_soc", 80.0)
        twin.ev_departure_time = preferences.get("ev_departure_time", "07:30")

        # Initialize room thermal models
        mid_comfort = (twin.comfort_min_c + twin.comfort_max_c) / 2.0
        for room in rooms:
            rid = room["id"]
            rname = room["name"]
            # Start at mid-comfort for AC'd rooms, outside temp for garage
            initial_temp = mid_comfort if rname != "Garage" else min(outside_temp_c, mid_comfort + 4)
            twin.room_models[rid] = RoomThermalModel(rid, rname, initial_temp_c=initial_temp)

        # Initialize device models
        for dev in devices:
            did = dev["id"]
            rid = dev["room_id"]
            dtype = dev["type"]
            dname = dev["name"]
            twin.device_room_map[did] = rid
            twin.device_type_map[did] = dtype

            if dtype == "ac":
                model = ACModel(did, rid, dname)
                model.state.setpoint_c = dev.get("setpoint", 24.0) or 24.0
                model.state.room_temp_c = mid_comfort
                model.state.status = dev.get("status", "on")
                twin.device_models[did] = model
            elif dtype == "ev_charger":
                model = EVChargerModel(did, rid, dname)
                model.state.soc_pct = 45.0  # start at 45%
                twin.device_models[did] = model
            elif dtype == "water_heater":
                model = WaterHeaterModel(did, rid, dname)
                twin.device_models[did] = model
            elif dtype == "washer_dryer":
                model = WasherDryerModel(did, rid, dname)
                twin.device_models[did] = model

        twin.environment.outside_temp_c = outside_temp_c
        return twin

    # ─── Core Step ────────────────────────────────────────
    def ingest_telemetry(
        self,
        device_id: int,
        power_kw: float,
        temp_c: Optional[float] = None,
        status: Optional[str] = None,
        ts: Optional[datetime] = None,
    ) -> dict:
        """
        Feed a telemetry reading into the twin.

        This is the key method: it doesn't just store data, it ADVANCES
        the physics simulation and computes derived quantities.

        Returns the twin's computed response for this device.
        """
        now = time.time()
        dt_seconds = min(now - self._last_step_time, 60.0)  # cap at 60s
        self._last_step_time = now
        self._step_count += 1

        # Update environment if outdoor temp sensor reading
        if temp_c is not None and device_id in self.device_type_map:
            if self.device_type_map[device_id] == "ac":
                # AC temp_c is the ambient/outside reading from the unit's sensor
                self.environment.outside_temp_c = temp_c

        # Update solar based on time of day
        current_hour = datetime.utcnow().hour + datetime.utcnow().minute / 60.0
        self.environment.solar_irradiance_w_m2 = compute_solar_irradiance(current_hour)

        # Step the specific device model
        device_result = self._step_device(device_id, dt_seconds, power_kw, status)

        # Step ALL room thermal models (temperature evolves continuously)
        self._step_all_rooms(dt_seconds, current_hour)

        # Accumulate energy
        total_power = sum(self._get_device_power(did) for did in self.device_models)
        self.energy.accumulate(total_power, dt_seconds)

        return device_result

    def _step_device(self, device_id: int, dt_seconds: float,
                     power_kw: float, status: Optional[str]) -> dict:
        """Step a specific device model forward."""
        if device_id not in self.device_models:
            return {"device_id": device_id, "error": "unknown device"}

        model = self.device_models[device_id]
        dtype = self.device_type_map[device_id]
        room_id = self.device_room_map[device_id]

        if dtype == "ac":
            room_model = self.room_models.get(room_id)
            room_temp = room_model.state.current_temp_c if room_model else 25.0
            model.step(
                dt_seconds,
                room_temp_c=room_temp,
                outside_temp_c=self.environment.outside_temp_c,
                setpoint_c=model.state.setpoint_c,
                status=status or model.state.status,
            )
            return {"device_id": device_id, "type": "ac", "computed": asdict(model.state)}

        elif dtype == "ev_charger":
            plugged_in = (status or model.state.status) in ("charging", "on", "standby")
            model.step(
                dt_seconds,
                plugged_in=plugged_in and power_kw > 0.01,
                target_soc=self.ev_target_soc,
                departure_time=self.ev_departure_time,
            )
            # Override power from model if we got a real reading
            if power_kw > 0.01:
                model.state.status = "charging"
            return {"device_id": device_id, "type": "ev_charger", "computed": asdict(model.state)}

        elif dtype == "water_heater":
            model.step(dt_seconds, status_override=status)
            return {"device_id": device_id, "type": "water_heater", "computed": asdict(model.state)}

        elif dtype == "washer_dryer":
            trigger = (status == "on" or power_kw > 0.1) and not model._running
            model.step(dt_seconds, trigger_start=trigger)
            return {"device_id": device_id, "type": "washer_dryer", "computed": asdict(model.state)}

        return {"device_id": device_id}

    def _step_all_rooms(self, dt_seconds: float, hour_of_day: float):
        """Step thermal model for every room."""
        for room_id, room_model in self.room_models.items():
            # Gather AC cooling for this room
            cooling_kw = 0.0
            device_heat_kw = 0.0
            for did, dmodel in self.device_models.items():
                if self.device_room_map.get(did) != room_id:
                    continue
                dtype = self.device_type_map[did]
                if dtype == "ac":
                    cooling_kw += dmodel.get_cooling_kw()
                elif dtype == "water_heater" and dmodel.state.element_on:
                    device_heat_kw += 0.1  # waste heat from heater
                elif dtype == "washer_dryer" and dmodel.state.power_kw > 0:
                    device_heat_kw += dmodel.state.power_kw * 0.15  # waste heat

            # Occupancy
            occupancy = compute_occupancy(hour_of_day, room_model.room_name)

            room_model.step(
                dt_seconds=dt_seconds,
                outside_temp_c=self.environment.outside_temp_c,
                solar_w_per_m2=self.environment.solar_irradiance_w_m2,
                n_occupants=occupancy,
                device_heat_kw=device_heat_kw,
                cooling_kw=cooling_kw,
                comfort_min_c=self.comfort_min_c,
                comfort_max_c=self.comfort_max_c,
            )

    def _get_device_power(self, device_id: int) -> float:
        model = self.device_models.get(device_id)
        if not model:
            return 0.0
        return getattr(model.state, 'power_kw', 0.0)

    # ─── State Export ────────────────────────────────────
    def get_state(self) -> TwinSnapshot:
        """
        Get the complete computed state of the digital twin.

        This is what the frontend displays — all values are COMPUTED
        by the twin's models, not raw sensor readings.
        """
        now = datetime.utcnow()

        # Room states
        rooms = []
        comfort_ok_count = 0
        total_rooms_with_ac = 0
        for rid, rmodel in self.room_models.items():
            rs = rmodel.state
            room_dict = {
                "room_id": rs.room_id,
                "room_name": rs.room_name,
                "current_temp_c": rs.current_temp_c,
                "temp_trend_c_per_hour": rs.temp_trend_c_per_hour,
                "humidity_pct": rs.humidity_pct,
                "comfort_status": rs.comfort_status,
                "heat_gain_kw": rs.heat_gain_kw,
                "cooling_output_kw": rs.cooling_output_kw,
                "minutes_to_setpoint": rs.minutes_to_setpoint,
            }
            rooms.append(room_dict)

            # Check if this room has AC
            has_ac = any(
                self.device_type_map.get(did) == "ac"
                for did, rm in self.device_room_map.items() if rm == rid
            )
            if has_ac:
                total_rooms_with_ac += 1
                if rs.comfort_status in ("comfortable", "cool"):
                    comfort_ok_count += 1

        # Device states
        devices = []
        for did, dmodel in self.device_models.items():
            dtype = self.device_type_map[did]
            state_dict = asdict(dmodel.state)
            devices.append({
                "device_id": did,
                "room_id": self.device_room_map[did],
                "type": dtype,
                "name": dmodel.name,
                **state_dict,
            })

        # Total power
        total_power = sum(self._get_device_power(did) for did in self.device_models)

        # Comfort compliance
        comfort_compliance = (
            comfort_ok_count / total_rooms_with_ac if total_rooms_with_ac > 0 else 1.0
        )

        return TwinSnapshot(
            timestamp=now.isoformat(),
            home_name=self.home_name,
            environment={
                "outside_temp_c": self.environment.outside_temp_c,
                "solar_irradiance_w_m2": round(self.environment.solar_irradiance_w_m2, 1),
                "humidity_pct": self.environment.humidity_pct,
                "grid_carbon_intensity": self.environment.grid_carbon_intensity,
            },
            rooms=rooms,
            devices=devices,
            energy={
                "current_power_kw": round(total_power, 3),
                "total_energy_kwh": self.energy.total_energy_kwh,
                "cost_aed": self.energy.cost_aed,
                "co2_kg": self.energy.co2_kg,
                "peak_power_kw": self.energy.peak_power_kw,
            },
            comfort_summary={
                "compliance_pct": round(comfort_compliance * 100, 1),
                "comfort_band": f"{self.comfort_min_c}–{self.comfort_max_c}°C",
                "rooms_comfortable": comfort_ok_count,
                "rooms_total": total_rooms_with_ac,
            },
            twin_step_count=self._step_count,
            twin_uptime_seconds=round(time.time() - self._start_time, 1),
        )

    def get_state_dict(self) -> dict:
        """Get state as a plain dict (for JSON serialization)."""
        snap = self.get_state()
        return asdict(snap)
