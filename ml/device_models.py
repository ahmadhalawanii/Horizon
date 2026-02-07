"""
Physics models for each device type in the Horizon digital twin.

Each model maintains internal state and can be stepped forward in time.
They compute derived quantities that raw sensors cannot provide directly.
"""
import math
from dataclasses import dataclass, field
from typing import Optional


# ─── AC (Split Unit) Model ─────────────────────────────────
@dataclass
class ACState:
    """Live computed state of an AC unit."""
    setpoint_c: float = 24.0
    room_temp_c: float = 25.0       # computed by thermal model, fed back
    status: str = "on"               # on / off / standby
    power_kw: float = 0.0            # current electrical draw
    cooling_output_kw: float = 0.0   # thermal cooling being delivered
    cop: float = 3.0                 # coefficient of performance (computed)
    compressor_load_pct: float = 0.0 # 0-100, how hard the compressor works
    runtime_minutes: float = 0.0     # continuous runtime since last on
    cycles_today: int = 0            # compressor on/off cycles today


class ACModel:
    """
    Simplified inverter AC model.

    Physics:
    - COP degrades as delta(T_outside - T_setpoint) increases
    - Power draw is proportional to cooling demand
    - Cooling output = power_kw * COP
    - Compressor modulates 30-100% (inverter), not just on/off
    """
    RATED_CAPACITY_KW_THERMAL = 5.0   # 5 kW cooling capacity (typical 1.5 ton)
    RATED_POWER_KW = 1.8              # at full load
    COP_NOMINAL = 3.2                 # at rated conditions (35°C outside, 24°C inside)
    MIN_COMPRESSOR_PCT = 30.0         # inverter minimum modulation

    def __init__(self, device_id: int, room_id: int, name: str):
        self.device_id = device_id
        self.room_id = room_id
        self.name = name
        self.state = ACState()
        self._was_on = False

    def step(self, dt_seconds: float, room_temp_c: float, outside_temp_c: float,
             setpoint_c: float, status: str = "on") -> ACState:
        """Advance the AC model by dt_seconds."""
        self.state.setpoint_c = setpoint_c
        self.state.room_temp_c = room_temp_c
        self.state.status = status

        if status != "on":
            self.state.power_kw = 0.0
            self.state.cooling_output_kw = 0.0
            self.state.compressor_load_pct = 0.0
            if self._was_on:
                self.state.cycles_today += 1
            self._was_on = False
            return self.state

        if not self._was_on:
            self.state.cycles_today += 1
        self._was_on = True

        # COP degrades with higher outdoor temp
        delta_outdoor = max(0, outside_temp_c - 35.0)
        self.state.cop = max(1.5, self.COP_NOMINAL - 0.05 * delta_outdoor)

        # Cooling demand: proportional to (room_temp - setpoint)
        temp_error = room_temp_c - setpoint_c
        if temp_error <= 0:
            # Room is at or below setpoint — minimal compressor
            compressor_pct = self.MIN_COMPRESSOR_PCT
        else:
            # P-controller: ramp up with error, capped at 100%
            compressor_pct = min(100.0, self.MIN_COMPRESSOR_PCT + temp_error * 20.0)

        self.state.compressor_load_pct = compressor_pct
        load_fraction = compressor_pct / 100.0

        self.state.power_kw = round(self.RATED_POWER_KW * load_fraction, 3)
        self.state.cooling_output_kw = round(self.state.power_kw * self.state.cop, 3)

        self.state.runtime_minutes += dt_seconds / 60.0

        return self.state

    def get_cooling_kw(self) -> float:
        """Returns thermal cooling output in kW (used by thermal model)."""
        return self.state.cooling_output_kw


# ─── EV Charger Model ─────────────────────────────────────
@dataclass
class EVState:
    """Live computed state of the EV charger."""
    soc_pct: float = 45.0            # state of charge %
    status: str = "standby"           # charging / standby / complete
    power_kw: float = 0.0             # current charge rate
    max_charge_rate_kw: float = 7.0   # charger limit
    battery_capacity_kwh: float = 60.0
    energy_delivered_kwh: float = 0.0
    estimated_full_time: Optional[str] = None  # ISO8601 when 100% SOC
    estimated_target_time: Optional[str] = None  # when target SOC reached
    time_to_target_minutes: float = 0.0


class EVChargerModel:
    """
    EV charging model with simplified CC-CV curve.

    Physics:
    - Constant-current (CC) up to ~80% SOC: charges at max rate
    - Constant-voltage (CV) taper above 80%: rate decreases linearly to 20%
    - Charging efficiency ~92%
    """
    CHARGE_EFFICIENCY = 0.92
    CV_TAPER_START_SOC = 80.0

    def __init__(self, device_id: int, room_id: int, name: str,
                 battery_kwh: float = 60.0, max_rate_kw: float = 7.0):
        self.device_id = device_id
        self.room_id = room_id
        self.name = name
        self.state = EVState(
            battery_capacity_kwh=battery_kwh,
            max_charge_rate_kw=max_rate_kw,
        )

    def step(self, dt_seconds: float, plugged_in: bool = True,
             target_soc: float = 80.0, departure_time: Optional[str] = None) -> EVState:
        """Advance the EV charger model."""
        dt_hours = dt_seconds / 3600.0

        if not plugged_in or self.state.soc_pct >= 100.0:
            self.state.power_kw = 0.0
            self.state.status = "complete" if self.state.soc_pct >= target_soc else "standby"
            return self.state

        if self.state.soc_pct >= target_soc:
            self.state.power_kw = 0.0
            self.state.status = "complete"
            return self.state

        # CC-CV charging curve
        if self.state.soc_pct < self.CV_TAPER_START_SOC:
            charge_rate = self.state.max_charge_rate_kw
        else:
            # Linear taper from 100% rate at 80% SOC to 20% rate at 100% SOC
            taper_fraction = (self.state.soc_pct - self.CV_TAPER_START_SOC) / (100.0 - self.CV_TAPER_START_SOC)
            charge_rate = self.state.max_charge_rate_kw * max(0.2, 1.0 - 0.8 * taper_fraction)

        self.state.power_kw = round(charge_rate, 3)
        self.state.status = "charging"

        # Energy delivered this step
        energy_step = charge_rate * self.CHARGE_EFFICIENCY * dt_hours
        self.state.energy_delivered_kwh += energy_step

        # SOC update
        soc_increment = (energy_step / self.state.battery_capacity_kwh) * 100.0
        self.state.soc_pct = min(100.0, round(self.state.soc_pct + soc_increment, 2))

        # Time to target estimate
        remaining_kwh = (target_soc - self.state.soc_pct) / 100.0 * self.state.battery_capacity_kwh
        if charge_rate > 0 and remaining_kwh > 0:
            hours_remaining = remaining_kwh / (charge_rate * self.CHARGE_EFFICIENCY)
            self.state.time_to_target_minutes = round(hours_remaining * 60, 1)
        else:
            self.state.time_to_target_minutes = 0.0

        return self.state


# ─── Water Heater (Tank) Model ─────────────────────────────
@dataclass
class WaterHeaterState:
    """Live computed state of the water heater."""
    water_temp_c: float = 45.0       # current tank temperature
    target_temp_c: float = 60.0      # thermostat setpoint
    status: str = "on"                # heating / standby / off
    power_kw: float = 0.0
    element_on: bool = False          # heating element active
    heat_loss_rate_kw: float = 0.0    # standby loss rate
    energy_stored_kwh: float = 0.0    # thermal energy in tank above ambient


class WaterHeaterModel:
    """
    Tank water heater with thermostat dead-band.

    Physics:
    - Tank heat balance: dT/dt = (Q_heater - Q_loss) / (m * cp)
    - Thermostat: ON when T < target - dead_band, OFF when T >= target
    - Standby loss proportional to (T_water - T_ambient)
    """
    TANK_VOLUME_LITERS = 200.0
    ELEMENT_POWER_KW = 3.0
    ELEMENT_EFFICIENCY = 0.95
    # Thermal mass: 200L * 4.186 kJ/(kg·K) = 837.2 kJ/K = 0.2325 kWh/K
    THERMAL_MASS_KWH_PER_K = 0.2325
    # Standby loss coefficient (kW per degree above ambient)
    LOSS_COEFF_KW_PER_K = 0.002  # well-insulated tank
    DEAD_BAND_C = 3.0
    AMBIENT_C = 28.0  # UAE indoor ambient

    def __init__(self, device_id: int, room_id: int, name: str):
        self.device_id = device_id
        self.room_id = room_id
        self.name = name
        self.state = WaterHeaterState()

    def step(self, dt_seconds: float, status_override: Optional[str] = None) -> WaterHeaterState:
        """Advance the water heater model."""
        dt_hours = dt_seconds / 3600.0

        if status_override == "off":
            self.state.status = "off"
            self.state.element_on = False
            self.state.power_kw = 0.0
        else:
            # Thermostat logic with hysteresis
            if self.state.water_temp_c < (self.state.target_temp_c - self.DEAD_BAND_C):
                self.state.element_on = True
            elif self.state.water_temp_c >= self.state.target_temp_c:
                self.state.element_on = False

            self.state.status = "heating" if self.state.element_on else "standby"
            self.state.power_kw = self.ELEMENT_POWER_KW if self.state.element_on else 0.0

        # Heat input
        q_input = self.state.power_kw * self.ELEMENT_EFFICIENCY if self.state.element_on else 0.0

        # Standby heat loss
        delta_t = self.state.water_temp_c - self.AMBIENT_C
        q_loss = self.LOSS_COEFF_KW_PER_K * max(0, delta_t)
        self.state.heat_loss_rate_kw = round(q_loss, 4)

        # Temperature change: dT = (Q_in - Q_loss) * dt / thermal_mass
        dT = (q_input - q_loss) * dt_hours / self.THERMAL_MASS_KWH_PER_K
        self.state.water_temp_c = round(
            max(self.AMBIENT_C, self.state.water_temp_c + dT), 2
        )

        # Energy stored above ambient
        self.state.energy_stored_kwh = round(
            self.THERMAL_MASS_KWH_PER_K * (self.state.water_temp_c - self.AMBIENT_C), 2
        )

        return self.state


# ─── Washer/Dryer Model ─────────────────────────────────
@dataclass
class WasherState:
    """Live computed state of the washer/dryer."""
    status: str = "off"            # off / washing / rinsing / spinning / drying / complete
    power_kw: float = 0.0
    cycle_phase: str = "idle"
    progress_pct: float = 0.0      # 0-100 of current cycle
    time_remaining_min: float = 0.0
    energy_this_cycle_kwh: float = 0.0


class WasherDryerModel:
    """
    Washer/dryer with fixed cycle profile.

    Phases: wash (15min, 0.5kW) → rinse (10min, 0.3kW) → spin (10min, 0.8kW)
            → dry (30min, 2.0kW) → complete
    """
    CYCLE_PHASES = [
        ("washing",  15, 0.5),
        ("rinsing",  10, 0.3),
        ("spinning", 10, 0.8),
        ("drying",   30, 2.0),
    ]
    TOTAL_CYCLE_MIN = sum(p[1] for p in CYCLE_PHASES)  # 65 min

    def __init__(self, device_id: int, room_id: int, name: str):
        self.device_id = device_id
        self.room_id = room_id
        self.name = name
        self.state = WasherState()
        self._cycle_elapsed_min = 0.0
        self._running = False

    def start_cycle(self):
        """Start a new wash+dry cycle."""
        self._running = True
        self._cycle_elapsed_min = 0.0
        self.state.energy_this_cycle_kwh = 0.0
        self.state.status = "washing"

    def step(self, dt_seconds: float, trigger_start: bool = False) -> WasherState:
        """Advance the washer model."""
        if trigger_start and not self._running:
            self.start_cycle()

        if not self._running:
            self.state.status = "off"
            self.state.power_kw = 0.0
            self.state.cycle_phase = "idle"
            self.state.progress_pct = 0.0
            self.state.time_remaining_min = 0.0
            return self.state

        dt_min = dt_seconds / 60.0
        self._cycle_elapsed_min += dt_min

        # Determine current phase
        elapsed = 0.0
        current_phase = None
        for phase_name, duration, power in self.CYCLE_PHASES:
            if self._cycle_elapsed_min <= elapsed + duration:
                current_phase = (phase_name, duration, power)
                phase_elapsed = self._cycle_elapsed_min - elapsed
                break
            elapsed += duration
        else:
            # Cycle complete
            self._running = False
            self.state.status = "complete"
            self.state.power_kw = 0.0
            self.state.cycle_phase = "complete"
            self.state.progress_pct = 100.0
            self.state.time_remaining_min = 0.0
            return self.state

        phase_name, duration, power = current_phase
        self.state.cycle_phase = phase_name
        self.state.status = phase_name
        self.state.power_kw = power
        self.state.progress_pct = round(
            (self._cycle_elapsed_min / self.TOTAL_CYCLE_MIN) * 100, 1
        )
        self.state.time_remaining_min = round(
            self.TOTAL_CYCLE_MIN - self._cycle_elapsed_min, 1
        )
        self.state.energy_this_cycle_kwh += power * (dt_min / 60.0)

        return self.state
