import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { DeviceComputed, RoomThermalState } from "../lib/api";
import TopDownMap from "../components/TopDownMap";
import clsx from "clsx";

export default function Twin() {
  const queryClient = useQueryClient();
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);

  // Preference form
  const [comfortMin, setComfortMin] = useState(22);
  const [comfortMax, setComfortMax] = useState(26);
  const [mode, setMode] = useState<"comfort" | "balanced" | "saver">("balanced");

  const { data: twinState, isLoading } = useQuery({
    queryKey: ["twin-state"],
    queryFn: api.getTwinState,
    refetchInterval: 3000,
  });

  const { data: layoutState } = useQuery({
    queryKey: ["layout-state"],
    queryFn: api.getLayoutState,
  });

  useQuery({
    queryKey: ["preferences"],
    queryFn: async () => {
      const pref = await api.getPreferences();
      setComfortMin(pref.comfort_min_c);
      setComfortMax(pref.comfort_max_c);
      setMode(pref.mode);
      return pref;
    },
  });

  const rooms = twinState?.rooms ?? [];
  const activeRoomId = selectedRoom ?? rooms[0]?.room_id ?? null;
  const activeRoom = rooms.find((r) => r.room_id === activeRoomId);
  const devices: DeviceComputed[] = activeRoomId
    ? (twinState?.devices ?? []).filter((d) => d.room_id === activeRoomId)
    : [];

  const hasLayout = layoutState && layoutState.rooms.some((r) => r.polygon.length > 0);

  const handleSave = async () => {
    try {
      await api.putPreferences({
        home_id: 1,
        comfort_min_c: comfortMin,
        comfort_max_c: comfortMax,
        ev_departure_time: "07:30",
        ev_target_soc: 80,
        max_shift_minutes: 120,
        mode,
      });
      toast.success("Preferences saved");
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleOptimize = async () => {
    const toastId = toast.loading("Optimizing...");
    try {
      const result = await api.postOptimize({ mode });
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });
      toast.success(`${result.actions.length} recommendations`, { id: toastId });
    } catch {
      toast.error("Failed", { id: toastId });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-horizon-muted">
        Loading digital twin...
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Top-down map */}
      {hasLayout && (
        <TopDownMap
          rooms={layoutState!.rooms}
          selectedRoomId={activeRoomId}
          onRoomSelect={(id) => setSelectedRoom(id)}
        />
      )}

      {/* Two column layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Room list + devices */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-horizon-muted">Rooms</h3>
          <div className="space-y-2">
            {rooms.map((room) => (
              <RoomRow
                key={room.room_id}
                room={room}
                isActive={activeRoomId === room.room_id}
                onClick={() => setSelectedRoom(room.room_id)}
              />
            ))}
          </div>

          {/* Devices for selected room */}
          {activeRoom && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-horizon-muted">
                {activeRoom.room_name} — Devices
              </h3>
              {devices.length === 0 ? (
                <p className="text-sm text-horizon-muted">No devices</p>
              ) : (
                devices.map((dev) => (
                  <SimpleDeviceCard key={dev.device_id} device={dev} />
                ))
              )}
            </div>
          )}
        </div>

        {/* Right: Preferences */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-horizon-muted">Preferences</h3>
          <div className="card space-y-4">
            <div>
              <label className="text-xs text-horizon-muted">
                Comfort: {comfortMin}°C – {comfortMax}°C
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
            <div>
              <label className="text-xs text-horizon-muted">Mode</label>
              <div className="flex gap-2 mt-1">
                {(["comfort", "balanced", "saver"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={clsx(
                      "flex-1 py-2 rounded-lg text-xs font-medium transition-colors capitalize",
                      mode === m
                        ? "bg-horizon-accent text-white"
                        : "bg-gray-50 text-horizon-muted border border-horizon-border"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} className="btn-secondary flex-1 text-sm">
                Save
              </button>
              <button onClick={handleOptimize} className="btn-primary flex-1 text-sm">
                Optimize
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function RoomRow({
  room,
  isActive,
  onClick,
}: {
  room: RoomThermalState;
  isActive: boolean;
  onClick: () => void;
}) {
  const statusColor = {
    comfortable: "text-horizon-green",
    warm: "text-horizon-amber",
    cool: "text-horizon-accent",
    out_of_band: "text-horizon-red",
  }[room.comfort_status] || "text-gray-400";

  return (
    <button
      onClick={onClick}
      className={clsx(
        "w-full text-left px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-between",
        isActive
          ? "bg-horizon-accent/10 border border-horizon-accent/20"
          : "bg-horizon-card border border-horizon-border hover:border-horizon-accent/20"
      )}
    >
      <span className="font-medium">{room.room_name}</span>
      <div className="flex items-center gap-3">
        <span className={clsx("font-mono text-sm", statusColor)}>
          {room.current_temp_c.toFixed(1)}°C
        </span>
        <span className="text-xs text-horizon-muted capitalize">
          {room.comfort_status === "out_of_band" ? "Out" : room.comfort_status}
        </span>
      </div>
    </button>
  );
}

const DEVICE_ICONS: Record<string, string> = {
  ac: "❄",
  ev_charger: "⚡",
  water_heater: "♨",
  washer_dryer: "◎",
};

function SimpleDeviceCard({ device }: { device: DeviceComputed }) {
  const isOn =
    device.status !== "off" &&
    device.status !== "standby" &&
    device.status !== "complete";

  return (
    <div className="card flex items-center justify-between py-3">
      <div className="flex items-center gap-3">
        <span className="text-lg">{DEVICE_ICONS[device.type] || "⬡"}</span>
        <div>
          <p className="text-sm font-medium">{device.name}</p>
          <p className="text-xs text-horizon-muted capitalize">
            {device.type.replace("_", " ")}
          </p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-mono font-semibold">
          {device.power_kw.toFixed(2)} kW
        </p>
        <span
          className={clsx(
            "text-xs",
            isOn ? "text-horizon-green" : "text-horizon-muted"
          )}
        >
          {device.status}
        </span>
      </div>
    </div>
  );
}
