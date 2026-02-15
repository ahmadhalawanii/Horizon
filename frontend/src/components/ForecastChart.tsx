import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ForecastPoint } from "../lib/api";

interface ForecastChartProps {
  data: ForecastPoint[];
  title?: string;
}

export default function ForecastChart({
  data,
  title = "24h Load Forecast",
}: ForecastChartProps) {
  const chartData = data.map((p) => ({
    time: new Date(p.ts).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }),
    predicted: p.predicted_kw,
    lower: p.lower_kw,
    upper: p.upper_kw,
  }));

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-horizon-muted mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.06} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.01} />
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
            <Area
              type="monotone"
              dataKey="upper"
              stroke="none"
              fill="url(#bandGrad)"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="lower"
              stroke="none"
              fill="#f8f9fb"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#2563eb"
              strokeWidth={2}
              fill="url(#forecastGrad)"
              fillOpacity={1}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
