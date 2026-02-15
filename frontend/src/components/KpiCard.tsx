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
  cyan: "border-blue-200 bg-blue-50",
  green: "border-green-200 bg-green-50",
  amber: "border-amber-200 bg-amber-50",
  red: "border-red-200 bg-red-50",
};

export default function KpiCard({
  label,
  value,
  unit,
  icon,
  color = "cyan",
}: KpiCardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border p-4 transition-all",
        colorMap[color]
      )}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">{icon}</span>
        <span className="text-xs text-horizon-muted font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold font-mono tracking-tight text-horizon-text">
        {value}
      </p>
      <p className="text-xs text-horizon-muted mt-0.5">{unit}</p>
    </div>
  );
}
