import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import type { DeviceComputed } from "../lib/api";
import clsx from "clsx";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const DEVICE_ICONS: Record<string, string> = {
  ac: "❄",
  ev_charger: "⚡",
  water_heater: "♨",
  washer_dryer: "◎",
};

interface DeviceCardProps {
  device: DeviceComputed;
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const { data: telemetry } = useQuery({
    queryKey: ["telemetry", device.device_id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/telemetry/${device.device_id}?hours=2`);
      return res.json() as Promise<{ ts: string; power_kw: number }[]>;
    },
    refetchInterval: 10_000,
  });

  const sparkData = (telemetry || []).map((t) => ({ v: t.power_kw }));
  const isOn = device.status !== "off" && device.status !== "standby" && device.status !== "complete";

  return (
    <div className="card flex flex-col gap-3 hover:border-horizon-accent/30 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{DEVICE_ICONS[device.type] || "⬡"}</span>
          <div>
            <p className="text-sm font-semibold">{device.name}</p>
            <p className="text-xs text-horizon-muted capitalize">
              {device.type.replace("_", " ")}
            </p>
          </div>
        </div>
        <span
          className={clsx(
            "px-2 py-0.5 rounded-full text-xs font-mono",
            isOn
              ? "bg-horizon-green/10 text-horizon-green"
              : device.status === "complete"
              ? "bg-horizon-accent/10 text-horizon-accent"
              : "bg-gray-700/30 text-gray-500"
          )}
        >
          {device.status}
        </span>
      </div>

      {/* Twin-computed metrics (type-specific) */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <Metric label="Power" value={`${device.power_kw.toFixed(2)} kW`} />

        {/* AC-specific computed values */}
        {device.type === "ac" && (
          <>
            <Metric label="Setpoint" value={`${device.setpoint_c ?? "—"}°C`} />
            <Metric
              label="Room Temp"
              value={`${device.room_temp_c?.toFixed(1) ?? "—"}°C`}
              highlight={device.room_temp_c != null && device.room_temp_c > (device.setpoint_c ?? 24) + 2}
            />
            <Metric label="COP" value={device.cop?.toFixed(1) ?? "—"} />
            <Metric
              label="Compressor"
              value={`${device.compressor_load_pct?.toFixed(0) ?? 0}%`}
            />
            <Metric
              label="Cooling"
              value={`${device.cooling_output_kw?.toFixed(1) ?? 0} kW`}
            />
          </>
        )}

        {/* EV-specific computed values */}
        {device.type === "ev_charger" && (
          <>
            <Metric label="SOC" value={`${device.soc_pct?.toFixed(1) ?? 0}%`} accent />
            <Metric
              label="Charge Rate"
              value={`${device.power_kw.toFixed(1)} / ${device.max_charge_rate_kw ?? 7} kW`}
            />
            <Metric
              label="Energy In"
              value={`${device.energy_delivered_kwh?.toFixed(1) ?? 0} kWh`}
            />
            {(device.time_to_target_minutes ?? 0) > 0 && (
              <Metric
                label="Time to Target"
                value={`${device.time_to_target_minutes?.toFixed(0)} min`}
                accent
              />
            )}
          </>
        )}

        {/* Water heater computed values */}
        {device.type === "water_heater" && (
          <>
            <Metric
              label="Water Temp"
              value={`${device.water_temp_c?.toFixed(1) ?? "—"}°C`}
              accent
            />
            <Metric
              label="Target"
              value={`${device.target_temp_c ?? 60}°C`}
            />
            <Metric
              label="Element"
              value={device.element_on ? "ON" : "OFF"}
              highlight={device.element_on ?? false}
            />
            <Metric
              label="Stored"
              value={`${device.energy_stored_kwh?.toFixed(1) ?? 0} kWh`}
            />
          </>
        )}

        {/* Washer computed values */}
        {device.type === "washer_dryer" && device.cycle_phase !== "idle" && (
          <>
            <Metric
              label="Phase"
              value={device.cycle_phase ?? "idle"}
              accent
            />
            <Metric
              label="Progress"
              value={`${device.progress_pct?.toFixed(0) ?? 0}%`}
            />
            {(device.time_remaining_min ?? 0) > 0 && (
              <Metric
                label="Remaining"
                value={`${device.time_remaining_min?.toFixed(0)} min`}
              />
            )}
          </>
        )}
      </div>

      {/* Mini sparkline */}
      {sparkData.length > 1 && (
        <div className="h-10">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <Line
                type="monotone"
                dataKey="v"
                stroke="#06b6d4"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  accent = false,
  highlight = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] text-horizon-muted uppercase tracking-wide">{label}</p>
      <p
        className={clsx(
          "font-mono text-sm font-semibold",
          highlight ? "text-horizon-amber" : accent ? "text-horizon-accent" : ""
        )}
      >
        {value}
      </p>
    </div>
  );
}
