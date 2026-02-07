const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

export const api = {
  health: () => request<{ status: string; twin_active: boolean; twin_steps: number }>("/health"),
  getTwinState: () => request<TwinState>("/twin/state"),
  postTwinUpdate: (data: TelemetryInput) =>
    request("/twin/update", { method: "POST", body: JSON.stringify(data) }),
  getForecast: (horizon = 24) =>
    request<ForecastPoint[]>(`/forecast?horizon=${horizon}`),
  postOptimize: (constraints?: OptimizeInput) =>
    request<OptimizeResult>("/optimize", {
      method: "POST",
      body: JSON.stringify(constraints || {}),
    }),
  getSimulate: (scenario = "normal") =>
    request<SimulateResult>(`/simulate?scenario=${scenario}`),
  getKpis: () => request<KpiData>("/kpis"),
  getActions: () => request<ActionItem[]>("/actions"),
  getPreferences: () => request<UserPreferences>("/preferences"),
  putPreferences: (prefs: UserPreferences) =>
    request<UserPreferences>("/preferences", {
      method: "PUT",
      body: JSON.stringify(prefs),
    }),
};

// ─── Twin State (physics-computed, not raw DB) ───────────
export interface TwinState {
  timestamp: string;
  home_name: string;
  environment: EnvironmentState;
  rooms: RoomThermalState[];
  devices: DeviceComputed[];
  energy: EnergyState;
  comfort_summary: ComfortSummary;
  twin_step_count: number;
  twin_uptime_seconds: number;
}

export interface EnvironmentState {
  outside_temp_c: number;
  solar_irradiance_w_m2: number;
  humidity_pct: number;
  grid_carbon_intensity: number;
}

export interface RoomThermalState {
  room_id: number;
  room_name: string;
  current_temp_c: number;
  temp_trend_c_per_hour: number;
  humidity_pct: number;
  comfort_status: "comfortable" | "warm" | "cool" | "out_of_band";
  heat_gain_kw: number;
  cooling_output_kw: number;
  minutes_to_setpoint: number;
}

export interface DeviceComputed {
  device_id: number;
  room_id: number;
  type: string;
  name: string;
  status: string;
  power_kw: number;
  // AC
  setpoint_c?: number | null;
  room_temp_c?: number | null;
  cop?: number | null;
  compressor_load_pct?: number | null;
  cooling_output_kw?: number | null;
  runtime_minutes?: number | null;
  cycles_today?: number | null;
  // EV
  soc_pct?: number | null;
  energy_delivered_kwh?: number | null;
  time_to_target_minutes?: number | null;
  max_charge_rate_kw?: number | null;
  battery_capacity_kwh?: number | null;
  // Water heater
  water_temp_c?: number | null;
  target_temp_c?: number | null;
  element_on?: boolean | null;
  heat_loss_rate_kw?: number | null;
  energy_stored_kwh?: number | null;
  // Washer
  cycle_phase?: string | null;
  progress_pct?: number | null;
  time_remaining_min?: number | null;
  energy_this_cycle_kwh?: number | null;
}

export interface EnergyState {
  current_power_kw: number;
  total_energy_kwh: number;
  cost_aed: number;
  co2_kg: number;
  peak_power_kw: number;
}

export interface ComfortSummary {
  compliance_pct: number;
  comfort_band: string;
  rooms_comfortable: number;
  rooms_total: number;
}

// ─── Other types ─────────────────────────────────────────
export interface TelemetryInput {
  device_id: number;
  ts: string;
  power_kw: number;
  temp_c?: number;
  status?: string;
}

export interface ForecastPoint {
  ts: string;
  predicted_kw: number;
  lower_kw: number;
  upper_kw: number;
}

export interface OptimizeInput {
  comfort_min_c?: number;
  comfort_max_c?: number;
  ev_departure_time?: string;
  ev_target_soc?: number;
  max_shift_minutes?: number;
  mode?: "comfort" | "balanced" | "saver";
}

export interface OptimizeResult {
  actions: ActionItem[];
}

export interface ActionItem {
  id?: number;
  ts?: string;
  title: string;
  reason: string;
  estimated_kwh_saved: number;
  estimated_aed_saved: number;
  estimated_co2_saved: number;
  confidence: number;
  action_json?: Record<string, unknown>;
}

export interface SimulateResult {
  ts: string[];
  baseline_kw: number[];
  optimized_kw: number[];
  deltas_kw: number[];
}

export interface KpiData {
  kwh_saved: number;
  aed_saved: number;
  co2_avoided: number;
  comfort_compliance: number;
}

export interface UserPreferences {
  id?: number;
  home_id: number;
  comfort_min_c: number;
  comfort_max_c: number;
  ev_departure_time: string;
  ev_target_soc: number;
  max_shift_minutes: number;
  mode: "comfort" | "balanced" | "saver";
}
