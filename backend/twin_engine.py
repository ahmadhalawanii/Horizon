"""
Singleton twin engine that manages the running digital twin model.

The twin is initialized from the database on startup and evolves with
each telemetry input. The API endpoints read from this live model,
NOT from raw database rows.
"""
import json
import logging
from typing import Optional
from datetime import datetime

from ml.digital_twin import HomeTwinModel

logger = logging.getLogger("horizon.twin")

# ─── Singleton instance ──────────────────────────────────
_twin: Optional[HomeTwinModel] = None


def get_twin() -> HomeTwinModel:
    """Get the running twin model instance."""
    global _twin
    if _twin is None:
        raise RuntimeError(
            "Twin not initialized. Call initialize_twin() first (run seed)."
        )
    return _twin


def initialize_twin(db_session) -> HomeTwinModel:
    """
    Initialize the twin from the current database state.

    Called once on backend startup. Reads home, rooms, devices, and
    preferences from the DB, then creates the physics model.
    """
    global _twin
    from backend.models import Home, Room, Device, UserPreference, Scenario

    home = db_session.query(Home).first()
    if not home:
        logger.warning("No home in DB — twin not initialized")
        return None

    rooms_db = db_session.query(Room).filter(Room.home_id == home.id).all()
    devices_db = db_session.query(Device).all()
    pref_db = db_session.query(UserPreference).first()

    rooms = [{"id": r.id, "name": r.name} for r in rooms_db]
    devices = [
        {
            "id": d.id,
            "room_id": d.room_id,
            "type": d.type,
            "name": d.name,
            "status": d.status,
            "power_kw": d.power_kw,
            "setpoint": d.setpoint,
        }
        for d in devices_db
    ]
    preferences = {
        "comfort_min_c": pref_db.comfort_min_c if pref_db else 22.0,
        "comfort_max_c": pref_db.comfort_max_c if pref_db else 26.0,
        "ev_target_soc": pref_db.ev_target_soc if pref_db else 80.0,
        "ev_departure_time": pref_db.ev_departure_time if pref_db else "07:30",
    }

    # Get initial outside temp from scenario if available
    scenario = db_session.query(Scenario).filter(Scenario.name == "normal").first()
    outside_temp = 36.0
    if scenario:
        payload = json.loads(scenario.payload_json)
        temps = payload.get("outside_temp_c", [])
        if temps:
            # Use a representative temp
            outside_temp = temps[len(temps) // 3]  # mid-morning

    _twin = HomeTwinModel.from_seed_data(
        home_name=home.name,
        rooms=rooms,
        devices=devices,
        preferences=preferences,
        outside_temp_c=outside_temp,
    )

    logger.info(
        f"Digital twin initialized: {home.name}, "
        f"{len(rooms)} rooms, {len(devices)} devices, "
        f"comfort band {preferences['comfort_min_c']}-{preferences['comfort_max_c']}°C"
    )
    return _twin


def twin_ingest(device_id: int, power_kw: float,
                temp_c: Optional[float] = None,
                status: Optional[str] = None,
                ts: Optional[datetime] = None) -> dict:
    """
    Feed telemetry into the twin and get the computed response.

    This is the primary interface: raw sensor data goes in,
    physics-computed state comes out.
    """
    twin = get_twin()
    return twin.ingest_telemetry(
        device_id=device_id,
        power_kw=power_kw,
        temp_c=temp_c,
        status=status,
        ts=ts,
    )


def twin_state() -> dict:
    """Get the full computed twin state."""
    twin = get_twin()
    return twin.get_state_dict()


def twin_update_preferences(comfort_min_c: float, comfort_max_c: float,
                            ev_target_soc: float = 80.0,
                            ev_departure_time: str = "07:30"):
    """Update the twin's constraint parameters."""
    twin = get_twin()
    twin.comfort_min_c = comfort_min_c
    twin.comfort_max_c = comfort_max_c
    twin.ev_target_soc = ev_target_soc
    twin.ev_departure_time = ev_departure_time
