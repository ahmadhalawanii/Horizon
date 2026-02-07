"""All API routes for the Horizon backend."""
import json
import asyncio
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import Home, Room, Device, Telemetry, Recommendation, Scenario, UserPreference
from backend.schemas import (
    TwinStateOut, HomeOut, RoomOut, DeviceOut,
    TelemetryIn,
    ForecastPoint,
    OptimizeIn, OptimizeOut, ActionOut,
    SimulateOut, KpiOut,
    RecommendationOut,
    UserPreferenceIn, UserPreferenceOut,
)
from backend.config import get_settings
from backend.ws_manager import manager

router = APIRouter()
settings = get_settings()


# ─── 1) Health ────────────────────────────────────────────
@router.get("/health")
def health():
    return {"status": "ok", "service": "horizon-backend"}


# ─── 2) Twin State ───────────────────────────────────────
@router.get("/twin/state", response_model=TwinStateOut)
def twin_state(db: Session = Depends(get_db)):
    home = db.query(Home).first()
    if not home:
        raise HTTPException(404, "No home found. Run seed first.")
    rooms = db.query(Room).filter(Room.home_id == home.id).all()
    devices_by_room: dict[str, list[DeviceOut]] = {}
    for room in rooms:
        devs = db.query(Device).filter(Device.room_id == room.id).all()
        devices_by_room[str(room.id)] = [
            DeviceOut(
                id=d.id, room_id=d.room_id, type=d.type, name=d.name,
                status=d.status, power_kw=d.power_kw,
                setpoint=d.setpoint,
                metadata_json=json.loads(d.metadata_json) if d.metadata_json else None,
            )
            for d in devs
        ]
    return TwinStateOut(
        home=HomeOut(id=home.id, name=home.name),
        rooms=[RoomOut(id=r.id, home_id=r.home_id, name=r.name) for r in rooms],
        devices_by_room=devices_by_room,
    )


# ─── 3) Twin Update (+ WS broadcast) ────────────────────
@router.post("/twin/update")
async def twin_update(body: TelemetryIn, db: Session = Depends(get_db)):
    device = db.query(Device).filter(Device.id == body.device_id).first()
    if not device:
        raise HTTPException(404, f"Device {body.device_id} not found")

    # Update device current state
    device.power_kw = body.power_kw
    if body.status:
        device.status = body.status
    if body.temp_c is not None and device.type == "ac":
        pass  # temp_c is ambient, not setpoint

    # Insert telemetry row
    t = Telemetry(
        device_id=body.device_id,
        ts=body.ts,
        power_kw=body.power_kw,
        temp_c=body.temp_c,
        status=body.status or device.status,
    )
    db.add(t)
    db.commit()

    # Broadcast via WebSocket
    msg = {
        "type": "telemetry_update",
        "device_id": device.id,
        "room_id": device.room_id,
        "power_kw": body.power_kw,
        "temp_c": body.temp_c,
        "status": body.status or device.status,
        "ts": body.ts.isoformat() if isinstance(body.ts, datetime) else str(body.ts),
    }
    await manager.broadcast(msg)
    return {"ok": True}


# ─── 4) Forecast ─────────────────────────────────────────
@router.get("/forecast", response_model=list[ForecastPoint])
def forecast(horizon: int = Query(24, ge=1, le=48), db: Session = Depends(get_db)):
    from ml.forecasting import forecast_next_24h
    # Gather recent telemetry for heuristic
    recent = (
        db.query(Telemetry)
        .order_by(Telemetry.ts.desc())
        .limit(96 * 5)  # up to 5 days of 15-min data
        .all()
    )
    # Get active scenario context
    scenario = db.query(Scenario).filter(Scenario.name == "normal").first()
    context = json.loads(scenario.payload_json) if scenario else {}

    history = [
        {"ts": t.ts.isoformat() if isinstance(t.ts, datetime) else str(t.ts),
         "power_kw": t.power_kw}
        for t in reversed(recent)
    ]
    points = forecast_next_24h(history, context, horizon_hours=horizon)
    return points


# ─── 5) Optimize ─────────────────────────────────────────
@router.post("/optimize", response_model=OptimizeOut)
def optimize(body: OptimizeIn = OptimizeIn(), db: Session = Depends(get_db)):
    from ml.optimizer import generate_recommendations
    # Load saved preferences as defaults
    pref = db.query(UserPreference).first()
    constraints = {
        "comfort_min_c": body.comfort_min_c or (pref.comfort_min_c if pref else 22.0),
        "comfort_max_c": body.comfort_max_c or (pref.comfort_max_c if pref else 26.0),
        "ev_departure_time": body.ev_departure_time or (pref.ev_departure_time if pref else "07:30"),
        "ev_target_soc": body.ev_target_soc or (pref.ev_target_soc if pref else 80.0),
        "max_shift_minutes": body.max_shift_minutes or (pref.max_shift_minutes if pref else 120),
        "mode": body.mode or (pref.mode if pref else "balanced"),
    }
    # Get forecast for optimization
    scenario = db.query(Scenario).filter(Scenario.name == "normal").first()
    context = json.loads(scenario.payload_json) if scenario else {}

    actions = generate_recommendations(constraints, context, settings)

    # Save to DB
    for a in actions:
        rec = Recommendation(
            ts=datetime.utcnow(),
            title=a["title"],
            reason=a["reason"],
            estimated_kwh_saved=a["estimated_kwh_saved"],
            estimated_aed_saved=a["estimated_aed_saved"],
            estimated_co2_saved=a["estimated_co2_saved"],
            confidence=a["confidence"],
            action_json=json.dumps(a.get("action", {})),
        )
        db.add(rec)
    db.commit()

    return OptimizeOut(
        actions=[
            ActionOut(
                title=a["title"],
                reason=a["reason"],
                estimated_kwh_saved=a["estimated_kwh_saved"],
                estimated_aed_saved=a["estimated_aed_saved"],
                estimated_co2_saved=a["estimated_co2_saved"],
                confidence=a["confidence"],
                action=a.get("action"),
            )
            for a in actions
        ]
    )


# ─── 6) Simulate ─────────────────────────────────────────
@router.get("/simulate", response_model=SimulateOut)
def simulate(scenario: str = Query("normal"), db: Session = Depends(get_db)):
    from ml.optimizer import simulate_scenario
    sc = db.query(Scenario).filter(Scenario.name == scenario).first()
    if not sc:
        raise HTTPException(404, f"Scenario '{scenario}' not found")
    payload = json.loads(sc.payload_json)
    pref = db.query(UserPreference).first()
    constraints = {
        "comfort_min_c": pref.comfort_min_c if pref else 22.0,
        "comfort_max_c": pref.comfort_max_c if pref else 26.0,
        "ev_departure_time": pref.ev_departure_time if pref else "07:30",
        "ev_target_soc": pref.ev_target_soc if pref else 80.0,
        "max_shift_minutes": pref.max_shift_minutes if pref else 120,
        "mode": pref.mode if pref else "balanced",
    }
    result = simulate_scenario(payload, constraints, settings)
    return SimulateOut(**result)


# ─── 7) KPIs ─────────────────────────────────────────────
@router.get("/kpis", response_model=KpiOut)
def kpis(db: Session = Depends(get_db)):
    from ml.kpi import compute_kpis
    # Use normal scenario for KPI calc
    sc = db.query(Scenario).filter(Scenario.name == "normal").first()
    if not sc:
        return KpiOut(kwh_saved=0, aed_saved=0, co2_avoided=0, comfort_compliance=1.0)
    payload = json.loads(sc.payload_json)
    pref = db.query(UserPreference).first()
    constraints = {
        "comfort_min_c": pref.comfort_min_c if pref else 22.0,
        "comfort_max_c": pref.comfort_max_c if pref else 26.0,
        "mode": pref.mode if pref else "balanced",
    }
    result = compute_kpis(payload, constraints, settings)
    return KpiOut(**result)


# ─── 8) Actions log ──────────────────────────────────────
@router.get("/actions", response_model=list[RecommendationOut])
def get_actions(db: Session = Depends(get_db)):
    recs = db.query(Recommendation).order_by(Recommendation.ts.desc()).limit(50).all()
    return [
        RecommendationOut(
            id=r.id,
            ts=r.ts.isoformat() if isinstance(r.ts, datetime) else str(r.ts),
            title=r.title,
            reason=r.reason,
            estimated_kwh_saved=r.estimated_kwh_saved,
            estimated_aed_saved=r.estimated_aed_saved,
            estimated_co2_saved=r.estimated_co2_saved,
            confidence=r.confidence,
            action_json=json.loads(r.action_json) if r.action_json else None,
        )
        for r in recs
    ]


# ─── 9) WebSocket ────────────────────────────────────────
@router.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive; ignore client messages
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)


# ─── Preferences endpoints ───────────────────────────────
@router.get("/preferences", response_model=UserPreferenceOut)
def get_preferences(db: Session = Depends(get_db)):
    pref = db.query(UserPreference).first()
    if not pref:
        raise HTTPException(404, "No preferences found. Run seed first.")
    return pref


@router.put("/preferences", response_model=UserPreferenceOut)
def update_preferences(body: UserPreferenceIn, db: Session = Depends(get_db)):
    pref = db.query(UserPreference).filter(UserPreference.home_id == body.home_id).first()
    if not pref:
        pref = UserPreference(home_id=body.home_id)
        db.add(pref)
    pref.comfort_min_c = body.comfort_min_c
    pref.comfort_max_c = body.comfort_max_c
    pref.ev_departure_time = body.ev_departure_time
    pref.ev_target_soc = body.ev_target_soc
    pref.max_shift_minutes = body.max_shift_minutes
    pref.mode = body.mode
    db.commit()
    db.refresh(pref)
    return pref


# ─── Telemetry history for sparklines ────────────────────
@router.get("/telemetry/{device_id}")
def get_telemetry(device_id: int, hours: int = Query(2, ge=1, le=48), db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(hours=hours)
    rows = (
        db.query(Telemetry)
        .filter(Telemetry.device_id == device_id, Telemetry.ts >= cutoff)
        .order_by(Telemetry.ts.asc())
        .all()
    )
    return [
        {
            "ts": r.ts.isoformat() if isinstance(r.ts, datetime) else str(r.ts),
            "power_kw": r.power_kw,
            "temp_c": r.temp_c,
        }
        for r in rows
    ]
