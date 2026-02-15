import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ActionItem } from "../lib/api";
import clsx from "clsx";

export default function Actions() {
  const { data: actions, isLoading } = useQuery({
    queryKey: ["actions-log"],
    queryFn: () => api.getActions(),
    refetchInterval: 10_000,
  });

  const { autopilotActions, manualActions } = useMemo(() => {
    if (!actions) return { autopilotActions: [], manualActions: [] };
    return {
      autopilotActions: actions.filter((a) => a.source === "autopilot"),
      manualActions: actions.filter((a) => a.source !== "autopilot"),
    };
  }, [actions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-horizon-muted">
        Loading actions...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Actions</h2>
        <p className="text-sm text-horizon-muted mt-1">
          AI-generated recommendations grouped by source
        </p>
      </div>

      {/* Autopilot actions */}
      <ActionGroup
        title="Autopilot"
        badge="AI"
        badgeColor="bg-horizon-green/10 text-horizon-green"
        actions={autopilotActions}
      />

      {/* Manual actions */}
      <ActionGroup
        title="Manual"
        badge="User"
        badgeColor="bg-horizon-accent/10 text-horizon-accent"
        actions={manualActions}
      />

      {actions?.length === 0 && (
        <div className="card text-center text-horizon-muted text-sm py-12">
          No actions yet. Use the Overview page to generate recommendations.
        </div>
      )}
    </div>
  );
}

function ActionGroup({
  title,
  badge,
  badgeColor,
  actions,
}: {
  title: string;
  badge: string;
  badgeColor: string;
  actions: ActionItem[];
}) {
  if (actions.length === 0) return null;

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold text-horizon-muted">{title}</h3>
        <span
          className={clsx(
            "px-2 py-0.5 text-xs font-medium rounded-full",
            badgeColor
          )}
        >
          {badge} ({actions.length})
        </span>
      </div>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <ActionRow key={action.id ?? i} action={action} />
        ))}
      </div>
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
    <div className="card flex items-start gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-horizon-muted font-mono">{ts}</span>
          <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-horizon-muted rounded">
            {(action.confidence * 100).toFixed(0)}%
          </span>
        </div>
        <h4 className="text-sm font-medium">{action.title}</h4>
        <p className="text-xs text-horizon-muted mt-0.5">{action.reason}</p>
        <div className="flex gap-4 mt-2 text-xs">
          <span className="text-horizon-green font-mono">
            {action.estimated_kwh_saved.toFixed(1)} kWh
          </span>
          <span className="text-horizon-amber font-mono">
            {action.estimated_aed_saved.toFixed(2)} AED
          </span>
          <span className="text-horizon-accent font-mono">
            {action.estimated_co2_saved.toFixed(2)} kg CO₂
          </span>
        </div>
      </div>
    </div>
  );
}
