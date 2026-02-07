import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { ActionItem, OptimizeInput, RoomThermalState, DeviceComputed } from "../lib/api";
import DeviceCard from "../components/DeviceCard";
import RecommendationCard from "../components/RecommendationCard";
import clsx from "clsx";

export default function Console() {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<ActionItem[]>([]);

  // Preference form state
  const [comfortMin, setComfortMin] = useState(22);
  const [comfortMax, setComfortMax] = useState(26);
  const [evDeparture, setEvDeparture] = useState("07:30");
  const [evSoc, setEvSoc] = useState(80);
  const [maxShift, setMaxShift] = useState(120);
  const [mode, setMode] = useState<"comfort" | "balanced" | "saver">("balanced");

  const { data: twinState, isLoading } = useQuery({
    queryKey: ["twin-state"],
    queryFn: api.getTwinState,
    refetchInterval: 3000,
  });

  // Load saved preferences
  useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const pref = await api.getPreferences();
      setComfortMin(pref.comfort_min_c);
      setComfortMax(pref.comfort_max_c);
      setEvDeparture(pref.ev_departure_time);
      setEvSoc(pref.ev_target_soc);
      setMaxShift(pref.max_shift_minutes);
      setMode(pref.mode);
      return pref;
    },
  });

  const rooms = twinState?.rooms ?? [];
  const activeRoomId = selectedRoom ?? rooms[0]?.room_id ?? null;
  const activeRoom = rooms.find((r) => r.room_id === activeRoomId);

  // Get devices for the selected room from the twin's computed state
  const devices: DeviceComputed[] = activeRoomId
    ? (twinState?.devices ?? []).filter((d) => d.room_id === activeRoomId)
    : [];

  const handleSavePreferences = async () => {
    try {
      await api.putPreferences({
        home_id: 1,
        comfort_min_c: comfortMin,
        comfort_max_c: comfortMax,
        ev_departure_time: evDeparture,
        ev_target_soc: evSoc,
        max_shift_minutes: maxShift,
        mode,
      });
      toast.success("Preferences saved — twin model updated");
    } catch {
      toast.error("Failed to save preferences");
    }
  };

  const handleGenerate = async () => {
    const toastId = toast.loading("Generating recommendations...");
    try {
      const input: OptimizeInput = {
        comfort_min_c: comfortMin,
        comfort_max_c: comfortMax,
        ev_departure_time: evDeparture,
        ev_target_soc: evSoc,
        max_shift_minutes: maxShift,
        mode,
      };
      const result = await api.postOptimize(input);
      setRecommendations(result.actions);
      toast.success(`${result.actions.length} recommendations generated`, { id: toastId });
    } catch {
      toast.error("Failed to generate recommendations", { id: toastId });
    }
  };

  const handleApply = async (action: ActionItem) => {
    toast.success(`Applied: ${action.title}`);
    await queryClient.invalidateQueries({ queryKey: ["kpis"] });
    await queryClient.invalidateQueries({ queryKey: ["actions-log"] });
    await queryClient.invalidateQueries({ queryKey: ["simulate"] });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-horizon-muted">
        Initializing digital twin...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with twin status */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Digital Twin Console</h2>
          <p className="text-sm text-horizon-muted mt-1">
            Physics-computed state of {twinState?.home_name ?? "Home"} —{" "}
            <span className="text-horizon-accent font-mono">
              {twinState?.twin_step_count ?? 0} model steps
            </span>
          </p>
        </div>
        {/* Environment strip */}
        {twinState?.environment && (
          <div className="flex gap-4 text-xs text-horizon-muted">
            <span>Outside: <b className="text-horizon-amber">{twinState.environment.outside_temp_c}°C</b></span>
            <span>Solar: <b>{twinState.environment.solar_irradiance_w_m2.toFixed(0)} W/m²</b></span>
            <span>Grid CO₂: <b>{twinState.environment.grid_carbon_intensity} kg/kWh</b></span>
          </div>
        )}
      </div>

      {/* Live energy bar */}
      {twinState?.energy && (
        <div className="card flex items-center gap-6 py-3">
          <div className="text-center">
            <p className="text-lg font-mono font-bold text-horizon-accent">
              {twinState.energy.current_power_kw.toFixed(2)} kW
            </p>
            <p className="text-[10px] text-horizon-muted">LIVE DRAW</p>
          </div>
          <div className="h-8 w-px bg-horizon-border" />
          <div className="text-center">
            <p className="text-sm font-mono">{twinState.energy.total_energy_kwh.toFixed(1)} kWh</p>
            <p className="text-[10px] text-horizon-muted">TODAY</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-mono">{twinState.energy.cost_aed.toFixed(2)} AED</p>
            <p className="text-[10px] text-horizon-muted">COST</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-mono">{twinState.energy.co2_kg.toFixed(1)} kg</p>
            <p className="text-[10px] text-horizon-muted">CO₂</p>
          </div>
          <div className="text-center">
            <p className="text-sm font-mono">{twinState.energy.peak_power_kw.toFixed(1)} kW</p>
            <p className="text-[10px] text-horizon-muted">PEAK</p>
          </div>
          <div className="ml-auto text-center">
            <p className={clsx(
              "text-sm font-mono font-bold",
              (twinState.comfort_summary.compliance_pct >= 95) ? "text-horizon-green" : "text-horizon-amber"
            )}>
              {twinState.comfort_summary.compliance_pct}%
            </p>
            <p className="text-[10px] text-horizon-muted">COMFORT</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Room tree with thermal state */}
        <div className="col-span-3">
          <div className="card">
            <h3 className="text-sm font-semibold text-horizon-muted mb-3">
              {twinState?.home_name ?? "Home"}
            </h3>
            <div className="space-y-1">
              {rooms.map((room) => (
                <RoomButton
                  key={room.room_id}
                  room={room}
                  isActive={activeRoomId === room.room_id}
                  onClick={() => setSelectedRoom(room.room_id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Device cards with computed state */}
        <div className="col-span-5">
          {/* Room thermal summary */}
          {activeRoom && (
            <div className="card mb-4 flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-horizon-muted">Room Temperature (twin-computed)</p>
                <p className="text-2xl font-mono font-bold">
                  {activeRoom.current_temp_c.toFixed(1)}°C
                </p>
              </div>
              <div className="text-right text-sm">
                <TrendBadge trend={activeRoom.temp_trend_c_per_hour} />
                <p className="text-xs text-horizon-muted mt-1">
                  {activeRoom.humidity_pct}% humidity
                </p>
                {activeRoom.minutes_to_setpoint > 0 && (
                  <p className="text-xs text-horizon-accent mt-1">
                    ~{activeRoom.minutes_to_setpoint.toFixed(0)} min to setpoint
                  </p>
                )}
              </div>
              <ComfortBadge status={activeRoom.comfort_status} />
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {devices.length === 0 ? (
              <div className="card text-center text-horizon-muted text-sm">
                No devices in this room
              </div>
            ) : (
              devices.map((dev) => (
                <DeviceCard key={dev.device_id} device={dev} />
              ))
            )}
          </div>
        </div>

        {/* Right: Preferences + Recommendations */}
        <div className="col-span-4 space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-horizon-muted mb-4">
              Comfort & Schedule Preferences
            </h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-horizon-muted">
                  Comfort Range: {comfortMin}°C – {comfortMax}°C
                </label>
                <div className="flex gap-2 mt-1">
                  <input type="range" min={18} max={28} value={comfortMin}
                    onChange={(e) => setComfortMin(Number(e.target.value))}
                    className="flex-1 accent-horizon-accent" />
                  <input type="range" min={20} max={32} value={comfortMax}
                    onChange={(e) => setComfortMax(Number(e.target.value))}
                    className="flex-1 accent-horizon-accent" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-horizon-muted">EV Departure</label>
                  <input type="time" value={evDeparture}
                    onChange={(e) => setEvDeparture(e.target.value)}
                    className="w-full mt-1 bg-horizon-surface border border-horizon-border rounded-lg px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="text-xs text-horizon-muted">Target SOC</label>
                  <input type="number" min={20} max={100} value={evSoc}
                    onChange={(e) => setEvSoc(Number(e.target.value))}
                    className="w-full mt-1 bg-horizon-surface border border-horizon-border rounded-lg px-3 py-1.5 text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs text-horizon-muted">Max Shift: {maxShift} min</label>
                <input type="range" min={0} max={480} step={15} value={maxShift}
                  onChange={(e) => setMaxShift(Number(e.target.value))}
                  className="w-full mt-1 accent-horizon-accent" />
              </div>
              <div>
                <label className="text-xs text-horizon-muted">Mode</label>
                <div className="flex gap-2 mt-1">
                  {(["comfort", "balanced", "saver"] as const).map((m) => (
                    <button key={m} onClick={() => setMode(m)}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                        mode === m
                          ? "bg-horizon-accent text-white"
                          : "bg-horizon-surface text-horizon-muted border border-horizon-border hover:border-horizon-accent/40"
                      )}>{m}</button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSavePreferences} className="btn-secondary flex-1 text-xs">
                Save Preferences
              </button>
              <button onClick={handleGenerate} className="btn-primary flex-1 text-xs">
                Generate Recommendations
              </button>
            </div>
          </div>

          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-horizon-muted">
                AI Recommendations ({recommendations.length})
              </h3>
              {recommendations.map((action, i) => (
                <RecommendationCard key={i} action={action} onApply={() => handleApply(action)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function RoomButton({ room, isActive, onClick }: {
  room: RoomThermalState;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusColor = {
    comfortable: "text-horizon-green",
    warm: "text-horizon-amber",
    cool: "text-cyan-400",
    out_of_band: "text-horizon-red",
  }[room.comfort_status] || "text-gray-500";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors",
        isActive
          ? "bg-horizon-accent/10 text-horizon-accent"
          : "text-horizon-muted hover:text-horizon-text hover:bg-horizon-card"
      )}
    >
      <div className="flex items-center justify-between">
        <span>{room.room_name}</span>
        <span className={clsx("font-mono text-xs", statusColor)}>
          {room.current_temp_c.toFixed(1)}°C
        </span>
      </div>
    </button>
  );
}

function TrendBadge({ trend }: { trend: number }) {
  if (Math.abs(trend) < 0.1) {
    return <span className="text-xs text-horizon-muted font-mono">→ stable</span>;
  }
  return (
    <span className={clsx(
      "text-xs font-mono",
      trend > 0 ? "text-horizon-amber" : "text-cyan-400"
    )}>
      {trend > 0 ? "↑" : "↓"} {Math.abs(trend).toFixed(1)}°C/hr
    </span>
  );
}

function ComfortBadge({ status }: { status: string }) {
  const config = {
    comfortable: { bg: "bg-horizon-green/10", text: "text-horizon-green", label: "Comfortable" },
    warm: { bg: "bg-horizon-amber/10", text: "text-horizon-amber", label: "Warm" },
    cool: { bg: "bg-cyan-400/10", text: "text-cyan-400", label: "Cool" },
    out_of_band: { bg: "bg-horizon-red/10", text: "text-horizon-red", label: "Out of Band" },
  }[status] || { bg: "bg-gray-700/30", text: "text-gray-500", label: status };

  return (
    <span className={clsx("px-2 py-1 rounded-lg text-xs font-medium", config.bg, config.text)}>
      {config.label}
    </span>
  );
}
