import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { SimulateResult } from "../lib/api";

interface Props {
  data: SimulateResult;
  title?: string;
  animate?: boolean;
}

export default function BaselineVsOptimizedChart({
  data,
  title = "Baseline vs Optimized Load",
  animate = true,
}: Props) {
  const chartData = data.ts.map((ts, i) => ({
    time: new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    baseline: data.baseline_kw[i],
    optimized: data.optimized_kw[i],
    saved: Math.max(0, data.deltas_kw[i]),
  }));

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-horizon-muted mb-4">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="time"
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              interval={2}
            />
            <YAxis
              stroke="#64748b"
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              label={{
                value: "kW",
                angle: -90,
                position: "insideLeft",
                fill: "#94a3b8",
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1a2332",
                border: "1px solid #1e293b",
                borderRadius: 8,
                color: "#e2e8f0",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, color: "#94a3b8" }}
            />
            <Area
              type="monotone"
              dataKey="baseline"
              name="Baseline"
              stroke="#ef4444"
              strokeWidth={2}
              fill="url(#baselineGrad)"
              isAnimationActive={animate}
              animationDuration={1500}
            />
            <Area
              type="monotone"
              dataKey="optimized"
              name="Optimized"
              stroke="#22c55e"
              strokeWidth={2}
              fill="url(#optimizedGrad)"
              isAnimationActive={animate}
              animationDuration={1500}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
