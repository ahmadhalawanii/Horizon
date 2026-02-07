import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ActionItem } from "../lib/api";
import clsx from "clsx";

type FilterDevice = "all" | "ac" | "ev" | "water_heater" | "washer";

export default function Actions() {
  const [deviceFilter, setDeviceFilter] = useState<FilterDevice>("all");
  const [minConfidence, setMinConfidence] = useState(0);

  const { data: actions, isLoading } = useQuery({
    queryKey: ["actions-log"],
    queryFn: api.getActions,
    refetchInterval: 10_000,
  });

  const filtered = useMemo(() => {
    if (!actions) return [];
    return actions.filter((a) => {
      if (a.confidence < minConfidence) return false;
      if (deviceFilter === "all") return true;
      const title = a.title.toLowerCase();
      if (deviceFilter === "ac") return title.includes("cool") || title.includes("ac");
      if (deviceFilter === "ev") return title.includes("ev") || title.includes("charg");
      if (deviceFilter === "water_heater") return title.includes("water") || title.includes("heat");
      if (deviceFilter === "washer") return title.includes("wash") || title.includes("laundry");
      return true;
    });
  }, [actions, deviceFilter, minConfidence]);

  const handleExport = (format: "json" | "csv") => {
    if (!filtered.length) return;

    if (format === "json") {
      const blob = new Blob([JSON.stringify(filtered, null, 2)], {
        type: "application/json",
      });
      download(blob, "horizon_actions.json");
    } else {
      const header =
        "Timestamp,Title,Reason,kWh Saved,AED Saved,CO2 Saved,Confidence\n";
      const rows = filtered
        .map(
          (a) =>
            `"${a.ts ?? ""}","${a.title}","${a.reason}",${a.estimated_kwh_saved},${a.estimated_aed_saved},${a.estimated_co2_saved},${a.confidence}`
        )
        .join("\n");
      const blob = new Blob([header + rows], { type: "text/csv" });
      download(blob, "horizon_actions.csv");
    }
  };

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Action Log</h2>
          <p className="text-sm text-horizon-muted mt-1">
            History of AI-generated recommendations and applied actions
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport("json")}
            className="btn-secondary text-xs"
          >
            Export JSON
          </button>
          <button
            onClick={() => handleExport("csv")}
            className="btn-secondary text-xs"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-center gap-4">
        <div>
          <label className="text-xs text-horizon-muted mr-2">Device Type</label>
          <div className="inline-flex gap-1 mt-1">
            {(
              [
                ["all", "All"],
                ["ac", "AC"],
                ["ev", "EV"],
                ["water_heater", "Water Heater"],
                ["washer", "Washer"],
              ] as const
            ).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setDeviceFilter(val)}
                className={clsx(
                  "px-3 py-1 rounded-lg text-xs transition-colors",
                  deviceFilter === val
                    ? "bg-horizon-accent text-white"
                    : "bg-horizon-surface text-horizon-muted border border-horizon-border hover:border-horizon-accent/30"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-horizon-muted">
            Min Confidence: {(minConfidence * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={minConfidence}
            onChange={(e) => setMinConfidence(Number(e.target.value))}
            className="w-32 accent-horizon-accent"
          />
        </div>
        <span className="text-xs text-horizon-muted ml-auto">
          {filtered.length} action{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Action Timeline */}
      {isLoading ? (
        <div className="card text-center text-horizon-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="card text-center text-horizon-muted text-sm py-12">
          No actions yet. Use "Dispatch AI Plan" on the Overview page or
          "Generate Recommendations" on the Console.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((action, i) => (
            <ActionRow key={action.id ?? i} action={action} />
          ))}
        </div>
      )}
    </div>
  );
}

function ActionRow({ action }: { action: ActionItem }) {
  const ts = action.ts
    ? new Date(action.ts).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
    : "—";

  return (
    <div className="card flex items-start gap-4 hover:border-horizon-accent/20 transition-colors">
      {/* Timeline dot */}
      <div className="flex flex-col items-center mt-1">
        <div className="w-2.5 h-2.5 rounded-full bg-horizon-accent" />
        <div className="w-px h-full bg-horizon-border mt-1" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-xs font-mono text-horizon-muted">{ts}</span>
          <span className="px-2 py-0.5 text-[10px] font-mono bg-horizon-green/10 text-horizon-green rounded-full">
            {(action.confidence * 100).toFixed(0)}% conf.
          </span>
        </div>
        <h4 className="text-sm font-semibold">{action.title}</h4>
        <p className="text-xs text-horizon-muted mt-0.5">{action.reason}</p>

        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-horizon-green font-mono">
            {action.estimated_kwh_saved.toFixed(1)} kWh
          </span>
          <span className="text-horizon-amber font-mono">
            {action.estimated_aed_saved.toFixed(2)} AED
          </span>
          <span className="text-cyan-400 font-mono">
            {action.estimated_co2_saved.toFixed(2)} kg CO₂
          </span>
        </div>
      </div>
    </div>
  );
}
