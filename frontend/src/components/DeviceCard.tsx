import { useQuery } from "@tanstack/react-query";
import {
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import type { DeviceInfo } from "../lib/api";
import clsx from "clsx";

const BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const DEVICE_ICONS: Record<string, string> = {
  ac: "❄",
  ev_charger: "⚡",
  water_heater: "♨",
  washer_dryer: "◎",
};

interface DeviceCardProps {
  device: DeviceInfo;
}

export default function DeviceCard({ device }: DeviceCardProps) {
  const { data: telemetry } = useQuery({
    queryKey: ["telemetry", device.id],
    queryFn: async () => {
      const res = await fetch(`${BASE}/telemetry/${device.id}?hours=2`);
      return res.json() as Promise<{ ts: string; power_kw: number }[]>;
    },
    refetchInterval: 10_000,
  });

  const sparkData = (telemetry || []).map((t) => ({ v: t.power_kw }));
  const isOn = device.status === "on";

  return (
    <div className="card flex flex-col gap-3 hover:border-horizon-accent/30 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">
            {DEVICE_ICONS[device.type] || "⬡"}
          </span>
          <div>
            <p className="text-sm font-semibold">{device.name}</p>
            <p className="text-xs text-horizon-muted capitalize">{device.type.replace("_", " ")}</p>
          </div>
        </div>
        <span
          className={clsx(
            "px-2 py-0.5 rounded-full text-xs font-mono",
            isOn
              ? "bg-horizon-green/10 text-horizon-green"
              : "bg-gray-700/30 text-gray-500"
          )}
        >
          {device.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-horizon-muted">Power</p>
          <p className="font-mono font-semibold">{device.power_kw.toFixed(2)} kW</p>
        </div>
        {device.setpoint !== null && device.setpoint !== undefined && (
          <div>
            <p className="text-xs text-horizon-muted">Setpoint</p>
            <p className="font-mono font-semibold">{device.setpoint}°C</p>
          </div>
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
