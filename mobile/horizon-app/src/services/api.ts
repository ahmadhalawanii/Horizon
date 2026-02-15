/**
 * Horizon API client for the mobile app.
 * Talks to the same FastAPI backend as the web frontend.
 */

// Default to localhost — change this to your machine's IP when testing on device
const BASE_URL = "http://192.168.1.100:8000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json();
}

// ─── Types ───────────────────────────────────────────────

export interface KpiData {
  kwh_saved: number;
  aed_saved: number;
  co2_avoided: number;
  comfort_compliance: number;
}

export interface TwinState {
  timestamp: string;
  home_name: string;
  energy: { current_power_kw: number; total_energy_kwh: number };
  rooms: {
    room_id: number;
    room_name: string;
    current_temp_c: number;
    comfort_status: string;
  }[];
  devices: {
    device_id: number;
    room_id: number;
    type: string;
    name: string;
    status: string;
    power_kw: number;
  }[];
}

export interface UserPreferences {
  home_id: number;
  autopilot_enabled: boolean;
  mode: string;
}

export interface AutopilotToggleResult {
  home_id: number;
  autopilot_enabled: boolean;
  message: string;
}

export interface SpikeResult {
  home_id: number;
  scenario: string;
  message: string;
  kpis: KpiData;
}

export interface LayoutImportResult {
  home_id: number;
  rooms_created: number;
  rooms_updated: number;
}

export interface ActionItem {
  id: number;
  ts: string;
  title: string;
  reason: string;
  estimated_kwh_saved: number;
  estimated_aed_saved: number;
  source: string;
}

export interface RoomGeometry {
  room_id: number;
  room_name: string;
  polygon: number[][];
  devices: { device_id: number; type: string; name: string; status: string; power_kw: number }[];
}

export interface LayoutState {
  home_id: number;
  home_name: string;
  rooms: RoomGeometry[];
}

// ─── API functions ───────────────────────────────────────

export const api = {
  getKpis: () => request<KpiData>("/kpis"),

  getTwinState: () => request<TwinState>("/twin/state"),

  getPreferences: () => request<UserPreferences>("/preferences"),

  toggleAutopilot: (homeId: number, enabled: boolean) =>
    request<AutopilotToggleResult>("/autopilot/toggle", {
      method: "POST",
      body: JSON.stringify({ home_id: homeId, enabled }),
    }),

  simulateSpike: (homeId: number, scenario = "peak") =>
    request<SpikeResult>("/simulate/spike", {
      method: "POST",
      body: JSON.stringify({ home_id: homeId, scenario }),
    }),

  getLayoutState: () => request<LayoutState>("/layout/state"),

  postLayoutImport: (layout: { home_name: string; rooms: any[] }) =>
    request<LayoutImportResult>("/layout/import", {
      method: "POST",
      body: JSON.stringify(layout),
    }),

  getActions: () => request<ActionItem[]>("/actions"),
};

// Allow overriding base URL at runtime
export function setBaseUrl(url: string) {
  // This is a simple approach for a hackathon
  // In production you'd use proper config management
  (globalThis as any).__HORIZON_BASE_URL = url;
}
