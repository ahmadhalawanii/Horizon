"""
Room thermal model for the Horizon digital twin.

Simplified lumped-parameter heat balance:

    dT_room/dt = [ Q_wall + Q_solar + Q_occupancy + Q_devices - Q_cooling ] / C_thermal

Where:
    Q_wall     = (T_outside - T_room) / R_wall      [kW]  heat through walls
    Q_solar    = solar_irradiance * A_window * SHGC  [kW]  solar heat gain
    Q_occupancy = n_people * 0.1                     [kW]  body heat (~100W/person)
    Q_devices  = sum of non-AC device waste heat     [kW]  kitchen appliances, etc.
    Q_cooling  = AC cooling output                   [kW]  from AC model
    C_thermal  = room thermal mass                   [kWh/K]

This keeps it physically meaningful while being simple enough for a hackathon.
"""
from dataclasses import dataclass
from typing import Optional


@dataclass
class RoomThermalState:
    """Computed thermal state of a room."""
    room_id: int
    room_name: str
    current_temp_c: float = 25.0        # the twin's computed room temperature
    temp_trend_c_per_hour: float = 0.0  # positive = warming, negative = cooling
    humidity_pct: float = 55.0          # estimated (simple model)
    comfort_status: str = "comfortable" # comfortable / warm / cool / out_of_band
    heat_gain_kw: float = 0.0           # total heat flowing into the room
    cooling_output_kw: float = 0.0      # total AC cooling
    minutes_to_setpoint: float = 0.0    # estimated time to reach AC setpoint


# Room thermal properties (simplified for UAE villa)
ROOM_PROPERTIES = {
    "Living Room": {
        "volume_m3": 60.0,          # ~25 sqm × 2.4m
        "r_wall": 4.5,              # thermal resistance [K/kW] (moderate insulation)
        "c_thermal": 0.45,          # thermal mass [kWh/K] (concrete + furniture)
        "window_area_m2": 6.0,
        "shgc": 0.25,               # solar heat gain coefficient (tinted glass)
    },
    "Bedroom": {
        "volume_m3": 40.0,
        "r_wall": 5.0,              # better insulated (interior room)
        "c_thermal": 0.35,
        "window_area_m2": 3.0,
        "shgc": 0.20,
    },
    "Kitchen": {
        "volume_m3": 30.0,
        "r_wall": 4.0,
        "c_thermal": 0.30,
        "window_area_m2": 2.0,
        "shgc": 0.25,
    },
    "Garage": {
        "volume_m3": 50.0,
        "r_wall": 2.5,              # poorly insulated
        "c_thermal": 0.60,          # high mass (concrete floor, walls)
        "window_area_m2": 0.5,
        "shgc": 0.15,
    },
}

# Default properties for unknown rooms
DEFAULT_ROOM_PROPS = {
    "volume_m3": 40.0,
    "r_wall": 4.0,
    "c_thermal": 0.35,
    "window_area_m2": 3.0,
    "shgc": 0.22,
}


class RoomThermalModel:
    """
    Lumped-parameter thermal model for a single room.

    Steps the heat balance equation forward in time to compute
    the twin's estimate of room temperature.
    """

    def __init__(self, room_id: int, room_name: str, initial_temp_c: float = 25.0):
        self.room_id = room_id
        self.room_name = room_name
        props = ROOM_PROPERTIES.get(room_name, DEFAULT_ROOM_PROPS)
        self.r_wall = props["r_wall"]
        self.c_thermal = props["c_thermal"]
        self.window_area = props["window_area_m2"]
        self.shgc = props["shgc"]

        self.state = RoomThermalState(
            room_id=room_id,
            room_name=room_name,
            current_temp_c=initial_temp_c,
        )
        self._prev_temp = initial_temp_c

    def step(
        self,
        dt_seconds: float,
        outside_temp_c: float,
        solar_w_per_m2: float = 0.0,
        n_occupants: float = 0.0,
        device_heat_kw: float = 0.0,
        cooling_kw: float = 0.0,
        comfort_min_c: float = 22.0,
        comfort_max_c: float = 26.0,
    ) -> RoomThermalState:
        """
        Advance room temperature by dt_seconds.

        Args:
            outside_temp_c: Current outdoor temperature
            solar_w_per_m2: Solar irradiance on the windows
            n_occupants: Number of people in the room
            device_heat_kw: Waste heat from non-AC devices (kitchen, etc.)
            cooling_kw: Total AC cooling output (thermal, not electrical)
            comfort_min_c: Lower comfort bound
            comfort_max_c: Upper comfort bound
        """
        dt_hours = dt_seconds / 3600.0
        T = self.state.current_temp_c

        # Heat gains
        q_wall = (outside_temp_c - T) / self.r_wall                           # [kW]
        q_solar = (solar_w_per_m2 / 1000.0) * self.window_area * self.shgc    # [kW]
        q_occupancy = n_occupants * 0.1                                         # [kW] ~100W/person
        q_devices = device_heat_kw                                              # [kW]

        total_heat_gain = q_wall + q_solar + q_occupancy + q_devices
        net_heat = total_heat_gain - cooling_kw

        # Temperature change
        dT = (net_heat * dt_hours) / self.c_thermal
        new_temp = T + dT

        # Compute trend (°C per hour)
        if dt_seconds > 0:
            trend = dT / dt_hours
        else:
            trend = 0.0

        self.state.current_temp_c = round(new_temp, 2)
        self.state.temp_trend_c_per_hour = round(trend, 2)
        self.state.heat_gain_kw = round(total_heat_gain, 3)
        self.state.cooling_output_kw = round(cooling_kw, 3)

        # Humidity estimate (simple: higher with more occupants, lower with AC)
        base_humidity = 60.0 if outside_temp_c > 35 else 50.0
        ac_effect = -5.0 if cooling_kw > 0 else 0.0
        self.state.humidity_pct = round(
            max(30, min(80, base_humidity + n_occupants * 2 + ac_effect)), 1
        )

        # Comfort status
        if comfort_min_c <= new_temp <= comfort_max_c:
            self.state.comfort_status = "comfortable"
        elif new_temp < comfort_min_c:
            self.state.comfort_status = "cool"
        elif new_temp > comfort_max_c:
            self.state.comfort_status = "warm"
        if new_temp < comfort_min_c - 2 or new_temp > comfort_max_c + 2:
            self.state.comfort_status = "out_of_band"

        # Time to setpoint estimate (for AC'd rooms)
        if cooling_kw > 0 and trend < 0:
            # Cooling towards setpoint
            setpoint = (comfort_min_c + comfort_max_c) / 2.0
            if new_temp > setpoint and trend != 0:
                self.state.minutes_to_setpoint = round(
                    abs((new_temp - setpoint) / trend) * 60, 1
                )
            else:
                self.state.minutes_to_setpoint = 0.0
        else:
            self.state.minutes_to_setpoint = 0.0

        self._prev_temp = new_temp
        return self.state


def compute_solar_irradiance(hour_of_day: float) -> float:
    """
    Simple solar irradiance model for UAE (W/m²).

    Peak ~1000 W/m² at solar noon (12:00), zero at night.
    """
    import math
    if hour_of_day < 6.0 or hour_of_day > 18.5:
        return 0.0
    # Sinusoidal approximation centered at 12:15 (slight afternoon shift)
    solar_angle = math.pi * (hour_of_day - 6.0) / 12.5
    return max(0.0, 950.0 * math.sin(solar_angle))


def compute_occupancy(hour_of_day: float, room_name: str) -> float:
    """Simple occupancy model per room."""
    if room_name == "Bedroom":
        if 22.0 <= hour_of_day or hour_of_day < 7.0:
            return 2.0
        elif 7.0 <= hour_of_day < 9.0:
            return 1.0
        return 0.0
    elif room_name == "Living Room":
        if 7.0 <= hour_of_day < 9.0:
            return 2.0
        elif 9.0 <= hour_of_day < 16.0:
            return 0.5
        elif 16.0 <= hour_of_day < 23.0:
            return 3.0
        return 0.0
    elif room_name == "Kitchen":
        if 6.0 <= hour_of_day < 9.0:
            return 1.5
        elif 11.0 <= hour_of_day < 14.0:
            return 1.5
        elif 17.0 <= hour_of_day < 21.0:
            return 2.0
        return 0.0
    elif room_name == "Garage":
        if 7.0 <= hour_of_day < 8.0 or 17.0 <= hour_of_day < 18.0:
            return 1.0
        return 0.0
    return 0.5
