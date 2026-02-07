import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { ActionItem, OptimizeInput } from "../lib/api";
import DeviceCard from "../components/DeviceCard";
import RecommendationCard from "../components/RecommendationCard";
import clsx from "clsx";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export default function Console() {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [recommendations, setRecommendations] = useState<ActionItem[]>([]);

  // Form state
  const [comfortMin, setComfortMin] = useState(22);
  const [comfortMax, setComfortMax] = useState(26);
  const [evDeparture, setEvDeparture] = useState("07:30");
  const [evSoc, setEvSoc] = useState(80);
  const [maxShift, setMaxShift] = useState(120);
  const [mode, setMode] = useState<"comfort" | "balanced" | "saver">("balanced");

  const { data: twinState, isLoading } = useQuery({
    queryKey: ["twin-state"],
    queryFn: api.getTwinState,
    refetchInterval: 5000,
  });

  // Load saved preferences
  useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const res = await fetch(`${BASE}/preferences`);
      if (!res.ok) return null;
      const pref = await res.json();
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
  const activeRoom = selectedRoom ?? rooms[0]?.id ?? null;
  const devices = activeRoom
    ? twinState?.devices_by_room[String(activeRoom)] ?? []
    : [];

  const handleSavePreferences = async () => {
    try {
      await fetch(`${BASE}/preferences`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          home_id: 1,
          comfort_min_c: comfortMin,
          comfort_max_c: comfortMax,
          ev_departure_time: evDeparture,
          ev_target_soc: evSoc,
          max_shift_minutes: maxShift,
          mode,
        }),
      });
      toast.success("Preferences saved");
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
      toast.success(`${result.actions.length} recommendations generated`, {
        id: toastId,
      });
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
        Loading digital twin...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Digital Twin Console</h2>

      <div className="grid grid-cols-12 gap-6">
        {/* Left: Room tree */}
        <div className="col-span-3">
          <div className="card">
            <h3 className="text-sm font-semibold text-horizon-muted mb-3">
              {twinState?.home.name ?? "Home"}
            </h3>
            <div className="space-y-1">
              {rooms.map((room) => (
                <button
                  key={room.id}
                  onClick={() => setSelectedRoom(room.id)}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                    activeRoom === room.id
                      ? "bg-horizon-accent/10 text-horizon-accent"
                      : "text-horizon-muted hover:text-horizon-text hover:bg-horizon-card"
                  )}
                >
                  {room.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle: Device cards */}
        <div className="col-span-5">
          <div className="grid grid-cols-1 gap-4">
            {devices.length === 0 ? (
              <div className="card text-center text-horizon-muted text-sm">
                No devices in this room
              </div>
            ) : (
              devices.map((dev) => <DeviceCard key={dev.id} device={dev} />)
            )}
          </div>
        </div>

        {/* Right: Preferences + Recommendations */}
        <div className="col-span-4 space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold text-horizon-muted mb-4">
              Comfort & Schedule Preferences
            </h3>

            {/* Comfort range */}
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-horizon-muted">
                  Comfort Range: {comfortMin}°C – {comfortMax}°C
                </label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="range"
                    min={18}
                    max={28}
                    value={comfortMin}
                    onChange={(e) => setComfortMin(Number(e.target.value))}
                    className="flex-1 accent-horizon-accent"
                  />
                  <input
                    type="range"
                    min={20}
                    max={32}
                    value={comfortMax}
                    onChange={(e) => setComfortMax(Number(e.target.value))}
                    className="flex-1 accent-horizon-accent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-horizon-muted">
                    EV Departure
                  </label>
                  <input
                    type="time"
                    value={evDeparture}
                    onChange={(e) => setEvDeparture(e.target.value)}
                    className="w-full mt-1 bg-horizon-surface border border-horizon-border rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-horizon-muted">
                    Target SOC
                  </label>
                  <input
                    type="number"
                    min={20}
                    max={100}
                    value={evSoc}
                    onChange={(e) => setEvSoc(Number(e.target.value))}
                    className="w-full mt-1 bg-horizon-surface border border-horizon-border rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-horizon-muted">
                  Max Shift: {maxShift} min
                </label>
                <input
                  type="range"
                  min={0}
                  max={480}
                  step={15}
                  value={maxShift}
                  onChange={(e) => setMaxShift(Number(e.target.value))}
                  className="w-full mt-1 accent-horizon-accent"
                />
              </div>

              <div>
                <label className="text-xs text-horizon-muted">Mode</label>
                <div className="flex gap-2 mt-1">
                  {(["comfort", "balanced", "saver"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(m)}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                        mode === m
                          ? "bg-horizon-accent text-white"
                          : "bg-horizon-surface text-horizon-muted border border-horizon-border hover:border-horizon-accent/40"
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={handleSavePreferences}
                className="btn-secondary flex-1 text-xs"
              >
                Save Preferences
              </button>
              <button
                onClick={handleGenerate}
                className="btn-primary flex-1 text-xs"
              >
                Generate Recommendations
              </button>
            </div>
          </div>

          {/* Recommendations */}
          {recommendations.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-horizon-muted">
                AI Recommendations ({recommendations.length})
              </h3>
              {recommendations.map((action, i) => (
                <RecommendationCard
                  key={i}
                  action={action}
                  onApply={() => handleApply(action)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
