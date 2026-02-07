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
  health: () => request<{ status: string }>("/health"),

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
};

// ─── Types ───────────────────────────────────────────────
export interface TwinState {
  home: { id: number; name: string };
  rooms: { id: number; home_id: number; name: string }[];
  devices_by_room: Record<string, DeviceInfo[]>;
}

export interface DeviceInfo {
  id: number;
  room_id: number;
  type: string;
  name: string;
  status: string;
  power_kw: number;
  setpoint: number | null;
  metadata_json: Record<string, unknown> | null;
}

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
