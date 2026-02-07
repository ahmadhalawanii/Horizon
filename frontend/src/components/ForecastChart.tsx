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
    band: [p.lower_kw, p.upper_kw],
  }));

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-horizon-muted mb-4">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="forecastGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
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
              fill="#0a0e17"
              fillOpacity={1}
            />
            <Area
              type="monotone"
              dataKey="predicted"
              stroke="#06b6d4"
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
