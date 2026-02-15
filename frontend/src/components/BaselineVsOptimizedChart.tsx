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
}

export default function BaselineVsOptimizedChart({
  data,
  title = "Baseline vs Optimized Load",
}: Props) {
  const chartData = data.ts.map((ts, i) => ({
    time: new Date(ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    baseline: data.baseline_kw[i],
    optimized: data.optimized_kw[i],
  }));

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-horizon-muted mb-4">{title}</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="baselineGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="optimizedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="time"
              stroke="#94a3b8"
              tick={{ fill: "#64748b", fontSize: 11 }}
              interval={2}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: "#64748b", fontSize: 11 }}
              label={{
                value: "kW",
                angle: -90,
                position: "insideLeft",
                fill: "#64748b",
                fontSize: 11,
              }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: 8,
                color: "#1e293b",
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12, color: "#64748b" }} />
            <Area
              type="monotone"
              dataKey="baseline"
              name="Baseline"
              stroke="#dc2626"
              strokeWidth={2}
              fill="url(#baselineGrad)"
              animationDuration={1000}
            />
            <Area
              type="monotone"
              dataKey="optimized"
              name="Optimized"
              stroke="#16a34a"
              strokeWidth={2}
              fill="url(#optimizedGrad)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
