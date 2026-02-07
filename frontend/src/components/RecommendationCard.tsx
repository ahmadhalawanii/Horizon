import type { ActionItem } from "../lib/api";

interface Props {
  action: ActionItem;
  onApply?: () => void;
  showApply?: boolean;
}

export default function RecommendationCard({
  action,
  onApply,
  showApply = true,
}: Props) {
  return (
    <div className="card border-horizon-accent/20 hover:border-horizon-accent/40 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h4 className="text-sm font-semibold text-horizon-accent">
            {action.title}
          </h4>
          <p className="text-xs text-horizon-muted mt-1">{action.reason}</p>
        </div>
        <div className="text-right shrink-0">
          <span className="inline-block px-2 py-0.5 text-xs font-mono bg-horizon-green/10 text-horizon-green rounded-full">
            {(action.confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3 text-center">
        <div className="bg-horizon-surface rounded-lg p-2">
          <p className="text-sm font-mono font-bold text-horizon-green">
            {action.estimated_kwh_saved.toFixed(1)}
          </p>
          <p className="text-[10px] text-horizon-muted">kWh saved</p>
        </div>
        <div className="bg-horizon-surface rounded-lg p-2">
          <p className="text-sm font-mono font-bold text-horizon-amber">
            {action.estimated_aed_saved.toFixed(2)}
          </p>
          <p className="text-[10px] text-horizon-muted">AED saved</p>
        </div>
        <div className="bg-horizon-surface rounded-lg p-2">
          <p className="text-sm font-mono font-bold text-cyan-400">
            {action.estimated_co2_saved.toFixed(2)}
          </p>
          <p className="text-[10px] text-horizon-muted">kg CO₂</p>
        </div>
      </div>

      {showApply && onApply && (
        <button
          onClick={onApply}
          className="btn-primary w-full mt-3 text-sm"
        >
          Apply Action
        </button>
      )}
    </div>
  );
}
