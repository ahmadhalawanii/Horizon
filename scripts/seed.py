"""
Seed the Horizon database with:
- 1 home (Villa A)
- 4 rooms
- 5 devices
- 3 scenarios (normal, peak, heatwave) with 15-min baselines
- Default user preferences
"""
import json
import math
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine, SessionLocal, Base
from backend.models import Home, Room, Device, Scenario, UserPreference


def generate_device_baseline(device_type: str, scenario: str) -> list[float]:
    """Generate 96 intervals (24h at 15-min) of baseline kW for a device + scenario."""
    n = 96
    baseline = []

    for i in range(n):
        hour = (i * 15) / 60.0

        if device_type == "ac":
            # AC: heavy during hot hours, reduced at night
            if scenario == "heatwave":
                base = 3.5
                if 12 <= hour < 18:
                    kw = base + 2.0 * math.sin(math.pi * (hour - 12) / 6)
                elif 6 <= hour < 12:
                    kw = base + 0.5
                elif 18 <= hour < 22:
                    kw = base + 0.8
                else:
                    kw = base * 0.7
            elif scenario == "peak":
                base = 2.5
                if 13 <= hour < 17:
                    kw = base + 1.8 * math.sin(math.pi * (hour - 13) / 4)
                elif 9 <= hour < 13:
                    kw = base + 0.5
                elif 17 <= hour < 21:
                    kw = base + 0.6
                else:
                    kw = base * 0.5
            else:  # normal
                base = 2.0
                if 12 <= hour < 18:
                    kw = base + 1.2 * math.sin(math.pi * (hour - 12) / 6)
                elif 6 <= hour < 12:
                    kw = base * 0.6
                elif 18 <= hour < 22:
                    kw = base * 0.7
                else:
                    kw = base * 0.3

        elif device_type == "ev_charger":
            # EV: charges in evening/night
            if 18 <= hour < 22:
                kw = 7.0 if scenario != "normal" else 5.0
            elif 22 <= hour or hour < 2:
                kw = 3.0
            else:
                kw = 0.0

        elif device_type == "water_heater":
            # Water heater: morning + evening peaks
            if 5 <= hour < 8:
                kw = 2.5
            elif 17 <= hour < 20:
                kw = 2.0
            else:
                kw = 0.3

        elif device_type == "washer_dryer":
            # Washer: typically afternoon
            if 14 <= hour < 16:
                kw = 1.8 if scenario == "peak" else 1.5
            else:
                kw = 0.0

        else:
            kw = 0.5

        baseline.append(round(max(0, kw), 3))

    return baseline


def generate_outside_temp(scenario: str) -> list[float]:
    """Generate 96 intervals of outside temperature for UAE."""
    n = 96
    temps = []
    for i in range(n):
        hour = (i * 15) / 60.0
        if scenario == "heatwave":
            base = 42.0
            variation = 6.0 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else -3.0
        elif scenario == "peak":
            base = 38.0
            variation = 5.0 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else -2.5
        else:
            base = 34.0
            variation = 4.0 * math.sin(math.pi * (hour - 6) / 12) if 6 <= hour <= 18 else -2.0
        temps.append(round(base + variation, 1))
    return temps


def generate_occupancy(scenario: str) -> list[float]:
    """Generate occupancy factor (0-1) for 96 intervals."""
    n = 96
    occ = []
    for i in range(n):
        hour = (i * 15) / 60.0
        if scenario == "peak":
            # High occupancy all day
            if 7 <= hour < 22:
                occ.append(0.9)
            else:
                occ.append(0.3)
        else:
            # Normal weekday pattern
            if 7 <= hour < 9:
                occ.append(0.8)
            elif 9 <= hour < 16:
                occ.append(0.2)
            elif 16 <= hour < 22:
                occ.append(0.9)
            else:
                occ.append(0.3)
    return occ


def seed():
    # Create all tables
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Clear existing data
        db.query(UserPreference).delete()
        db.query(Scenario).delete()
        db.query(Device).delete()
        db.query(Room).delete()
        db.query(Home).delete()
        db.commit()

        # 1. Create Home
        home = Home(id=1, name="Villa A")
        db.add(home)
        db.flush()

        # 2. Create Rooms with floor geometry (for 3D view)
        room_geometries = {
            "Living Room": {
                "polygon": [[0,0],[6,0],[6,5],[0,5]],
                "height_m": 2.8,
                "furniture": [
                    {"type": "sofa", "center": [3, 4], "size": [2.4, 1.0]},
                    {"type": "tv_unit", "center": [3, 0.4], "size": [1.8, 0.5]},
                    {"type": "coffee_table", "center": [3, 2.5], "size": [1.2, 0.6]},
                ],
            },
            "Bedroom": {
                "polygon": [[6.2,0],[10.2,0],[10.2,4],[6.2,4]],
                "height_m": 2.8,
                "furniture": [
                    {"type": "bed", "center": [8.2, 2], "size": [2.0, 1.6]},
                    {"type": "wardrobe", "center": [6.6, 2], "size": [0.6, 2.0]},
                    {"type": "nightstand", "center": [9.8, 0.8], "size": [0.5, 0.4]},
                ],
            },
            "Kitchen": {
                "polygon": [[0,5.2],[4,5.2],[4,8.2],[0,8.2]],
                "height_m": 2.8,
                "furniture": [
                    {"type": "counter", "center": [2, 5.6], "size": [3.5, 0.6]},
                    {"type": "dining_table", "center": [2, 7.2], "size": [1.5, 1.0]},
                    {"type": "fridge", "center": [0.4, 6.5], "size": [0.7, 0.7]},
                ],
            },
            "Garage": {
                "polygon": [[4.2,5.2],[10.2,5.2],[10.2,8.2],[4.2,8.2]],
                "height_m": 3.0,
                "furniture": [
                    {"type": "car_space", "center": [7.2, 6.7], "size": [4.5, 2.2]},
                ],
            },
        }
        rooms = {}
        for i, (name, geo) in enumerate(room_geometries.items(), 1):
            r = Room(
                id=i, home_id=1, name=name,
                floor_polygon_json=json.dumps(geo["polygon"]),
                height_m=geo["height_m"],
                furniture_json=json.dumps(geo["furniture"]),
            )
            rooms[name] = r
            db.add(r)
        db.flush()

        # 3. Create Devices
        devices_spec = [
            (1, 1, "ac", "AC (Living Room)", "on", 2.5, 24.0),
            (2, 2, "ac", "AC (Bedroom)", "on", 2.0, 23.0),
            (3, 3, "water_heater", "Water Heater", "on", 2.0, None),
            (4, 3, "washer_dryer", "Washer Dryer", "off", 0.0, None),
            (5, 4, "ev_charger", "EV Charger", "standby", 0.0, None),
        ]
        device_type_map = {}
        for did, rid, dtype, dname, status, power, setpoint in devices_spec:
            d = Device(
                id=did, room_id=rid, type=dtype, name=dname,
                status=status, power_kw=power, setpoint=setpoint,
            )
            db.add(d)
            device_type_map[dname] = dtype
        db.flush()

        # 4. Create Scenarios
        for sc_name in ["normal", "peak", "heatwave"]:
            desc_map = {
                "normal": "Typical UAE summer day with moderate cooling demand",
                "peak": "Hot afternoon with high occupancy and peak tariff",
                "heatwave": "Extreme heat event with sustained cooling demand",
            }
            payload = {
                "devices": {
                    "ac_living": {
                        "device_id": 1,
                        "baseline_kw": generate_device_baseline("ac", sc_name),
                    },
                    "ac_bedroom": {
                        "device_id": 2,
                        "baseline_kw": [
                            round(v * 0.8, 3) for v in generate_device_baseline("ac", sc_name)
                        ],
                    },
                    "water_heater": {
                        "device_id": 3,
                        "baseline_kw": generate_device_baseline("water_heater", sc_name),
                    },
                    "washer_dryer": {
                        "device_id": 4,
                        "baseline_kw": generate_device_baseline("washer_dryer", sc_name),
                    },
                    "ev_charger": {
                        "device_id": 5,
                        "baseline_kw": generate_device_baseline("ev_charger", sc_name),
                    },
                },
                "outside_temp_c": generate_outside_temp(sc_name),
                "occupancy": generate_occupancy(sc_name),
            }
            sc = Scenario(
                name=sc_name,
                description=desc_map[sc_name],
                payload_json=json.dumps(payload),
            )
            db.add(sc)

        # 5. User Preferences
        pref = UserPreference(
            home_id=1,
            comfort_min_c=22.0,
            comfort_max_c=26.0,
            ev_departure_time="07:30",
            ev_target_soc=80.0,
            max_shift_minutes=120,
            mode="balanced",
        )
        db.add(pref)

        db.commit()
        print("✓ Database seeded successfully!")
        print("  - 1 home: Villa A")
        print("  - 4 rooms: Living Room, Bedroom, Kitchen, Garage")
        print("  - 5 devices: 2x AC, Water Heater, Washer Dryer, EV Charger")
        print("  - 3 scenarios: normal, peak, heatwave")
        print("  - Default preferences: balanced mode, 22-26°C comfort band")

    finally:
        db.close()


if __name__ == "__main__":
    seed()
