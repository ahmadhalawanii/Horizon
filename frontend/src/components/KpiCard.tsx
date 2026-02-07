import clsx from "clsx";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit: string;
  icon: string;
  color?: "cyan" | "green" | "amber" | "red";
  trend?: "up" | "down" | "neutral";
}

const colorMap = {
  cyan: "text-horizon-accent border-horizon-accent/20 bg-horizon-accent/5",
  green: "text-horizon-green border-horizon-green/20 bg-horizon-green/5",
  amber: "text-horizon-amber border-horizon-amber/20 bg-horizon-amber/5",
  red: "text-horizon-red border-horizon-red/20 bg-horizon-red/5",
};

export default function KpiCard({
  label,
  value,
  unit,
  icon,
  color = "cyan",
  trend,
}: KpiCardProps) {
  return (
    <div
      className={clsx(
        "card flex flex-col gap-2 transition-all duration-500",
        colorMap[color]
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-2xl">{icon}</span>
        {trend && (
          <span
            className={clsx(
              "text-xs font-mono",
              trend === "down" ? "text-horizon-green" : "text-horizon-amber"
            )}
          >
            {trend === "down" ? "▼" : trend === "up" ? "▲" : "—"}
          </span>
        )}
      </div>
      <div>
        <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
        <p className="text-xs opacity-60">{unit}</p>
      </div>
      <p className="text-xs font-medium opacity-80">{label}</p>
    </div>
  );
}
