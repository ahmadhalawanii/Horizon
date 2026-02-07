"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel, Field
from typing import Optional, Any
from datetime import datetime


# ─── Twin (computed by digital twin model) ────────────────
class RoomThermalOut(BaseModel):
    room_id: int
    room_name: str
    current_temp_c: float
    temp_trend_c_per_hour: float
    humidity_pct: float
    comfort_status: str  # comfortable / warm / cool / out_of_band
    heat_gain_kw: float
    cooling_output_kw: float
    minutes_to_setpoint: float


class DeviceComputedOut(BaseModel):
    device_id: int
    room_id: int
    type: str
    name: str
    status: str
    power_kw: float
    # AC-specific computed fields
    setpoint_c: Optional[float] = None
    room_temp_c: Optional[float] = None
    cop: Optional[float] = None
    compressor_load_pct: Optional[float] = None
    cooling_output_kw: Optional[float] = None
    runtime_minutes: Optional[float] = None
    cycles_today: Optional[int] = None
    # EV-specific computed fields
    soc_pct: Optional[float] = None
    energy_delivered_kwh: Optional[float] = None
    time_to_target_minutes: Optional[float] = None
    max_charge_rate_kw: Optional[float] = None
    battery_capacity_kwh: Optional[float] = None
    estimated_full_time: Optional[str] = None
    estimated_target_time: Optional[str] = None
    # Water heater computed fields
    water_temp_c: Optional[float] = None
    target_temp_c: Optional[float] = None
    element_on: Optional[bool] = None
    heat_loss_rate_kw: Optional[float] = None
    energy_stored_kwh: Optional[float] = None
    # Washer computed fields
    cycle_phase: Optional[str] = None
    progress_pct: Optional[float] = None
    time_remaining_min: Optional[float] = None
    energy_this_cycle_kwh: Optional[float] = None


class EnvironmentOut(BaseModel):
    outside_temp_c: float
    solar_irradiance_w_m2: float
    humidity_pct: float
    grid_carbon_intensity: float


class EnergyOut(BaseModel):
    current_power_kw: float
    total_energy_kwh: float
    cost_aed: float
    co2_kg: float
    peak_power_kw: float


class ComfortSummaryOut(BaseModel):
    compliance_pct: float
    comfort_band: str
    rooms_comfortable: int
    rooms_total: int


class TwinStateOut(BaseModel):
    """Full computed digital twin state — NOT raw DB rows."""
    timestamp: str
    home_name: str
    environment: EnvironmentOut
    rooms: list[RoomThermalOut]
    devices: list[DeviceComputedOut]
    energy: EnergyOut
    comfort_summary: ComfortSummaryOut
    twin_step_count: int
    twin_uptime_seconds: float


# ─── Legacy simple state (for backwards compat) ──────────
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


# ─── Layout Import (from iOS LiDAR scanner) ──────────────
class FurnitureItemIn(BaseModel):
    type: str
    center: list[float]  # [x, y]
    size: list[float]    # [width, depth]


class RoomLayoutIn(BaseModel):
    id: str
    name: str
    polygon: list[list[float]]  # [[x,y], ...]
    height_m: float = 2.8
    furniture: list[FurnitureItemIn] = []


class LayoutImportIn(BaseModel):
    home_name: str
    rooms: list[RoomLayoutIn]


class LayoutImportOut(BaseModel):
    home_id: int
    rooms_created: int
    rooms_updated: int


# ─── Layout State (for 3D frontend view) ─────────────────
class RoomGeometryOut(BaseModel):
    room_id: int
    room_name: str
    polygon: list[list[float]]
    height_m: float
    furniture: list[dict] = []
    devices: list[dict] = []


class LayoutStateOut(BaseModel):
    home_id: int
    home_name: str
    rooms: list[RoomGeometryOut]
