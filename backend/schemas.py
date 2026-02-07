"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ─── Twin ─────────────────────────────────────────────────
class DeviceOut(BaseModel):
    id: int
    room_id: int
    type: str
    name: str
    status: str
    power_kw: float
    setpoint: Optional[float] = None
    metadata_json: Optional[Any] = None

    class Config:
        from_attributes = True


class RoomOut(BaseModel):
    id: int
    home_id: int
    name: str

    class Config:
        from_attributes = True


class HomeOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class TwinStateOut(BaseModel):
    home: HomeOut
    rooms: list[RoomOut]
    devices_by_room: dict[str, list[DeviceOut]]


# ─── Telemetry ────────────────────────────────────────────
class TelemetryIn(BaseModel):
    device_id: int
    ts: datetime
    power_kw: float
    temp_c: Optional[float] = None
    status: Optional[str] = None


class TelemetryOut(BaseModel):
    device_id: int
    ts: str
    power_kw: float
    temp_c: Optional[float] = None
    status: Optional[str] = None


# ─── Forecast ─────────────────────────────────────────────
class ForecastPoint(BaseModel):
    ts: str
    predicted_kw: float
    lower_kw: float
    upper_kw: float


# ─── Optimize ─────────────────────────────────────────────
class OptimizeIn(BaseModel):
    comfort_min_c: Optional[float] = None
    comfort_max_c: Optional[float] = None
    ev_departure_time: Optional[str] = None
    ev_target_soc: Optional[float] = None
    max_shift_minutes: Optional[int] = None
    mode: Optional[str] = "balanced"


class ActionOut(BaseModel):
    title: str
    reason: str
    estimated_kwh_saved: float
    estimated_aed_saved: float
    estimated_co2_saved: float
    confidence: float
    action: Optional[dict] = None


class OptimizeOut(BaseModel):
    actions: list[ActionOut]


# ─── Simulate ─────────────────────────────────────────────
class SimulateOut(BaseModel):
    ts: list[str]
    baseline_kw: list[float]
    optimized_kw: list[float]
    deltas_kw: list[float]


# ─── KPIs ─────────────────────────────────────────────────
class KpiOut(BaseModel):
    kwh_saved: float
    aed_saved: float
    co2_avoided: float
    comfort_compliance: float


# ─── Actions log ──────────────────────────────────────────
class RecommendationOut(BaseModel):
    id: int
    ts: str
    title: str
    reason: str
    estimated_kwh_saved: float
    estimated_aed_saved: float
    estimated_co2_saved: float
    confidence: float
    action_json: Optional[Any] = None

    class Config:
        from_attributes = True


# ─── User Preferences ────────────────────────────────────
class UserPreferenceIn(BaseModel):
    home_id: int = 1
    comfort_min_c: float = Field(22.0, ge=18, le=30)
    comfort_max_c: float = Field(26.0, ge=18, le=32)
    ev_departure_time: str = "07:30"
    ev_target_soc: float = Field(80.0, ge=20, le=100)
    max_shift_minutes: int = Field(120, ge=0, le=480)
    mode: str = "balanced"


class UserPreferenceOut(BaseModel):
    id: int
    home_id: int
    comfort_min_c: float
    comfort_max_c: float
    ev_departure_time: str
    ev_target_soc: float
    max_shift_minutes: int
    mode: str

    class Config:
        from_attributes = True
