import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import KpiCard from "../components/KpiCard";
import ForecastChart from "../components/ForecastChart";
import clsx from "clsx";

export default function Overview() {
  const queryClient = useQueryClient();

  const { data: kpis, isLoading: kpiLoading } = useQuery({
    queryKey: ["kpis"],
    queryFn: api.getKpis,
  });

  const { data: forecast, isLoading: forecastLoading } = useQuery({
    queryKey: ["forecast"],
    queryFn: () => api.getForecast(24),
  });

  const { data: twinState } = useQuery({
    queryKey: ["twin-state"],
    queryFn: api.getTwinState,
    refetchInterval: 3000,
  });

  const handleDispatch = async () => {
    const toastId = toast.loading("Running AI optimization...");
    try {
      const result = await api.postOptimize({ mode: "balanced" });
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });
      await queryClient.invalidateQueries({ queryKey: ["actions-log"] });
      await queryClient.invalidateQueries({ queryKey: ["simulate"] });

      const totalSaved = result.actions.reduce(
        (sum, a) => sum + a.estimated_kwh_saved,
        0
      );
      toast.success(
        `AI Plan dispatched! ${result.actions.length} actions, est. ${totalSaved.toFixed(1)} kWh saved.`,
        { id: toastId, duration: 4000 }
      );
    } catch {
      toast.error("Optimization failed. Check backend.", { id: toastId });
    }
  };

  const carbonBars =
    forecast?.map((p) => {
      const kw = p.predicted_kw;
      if (kw < 4) return "green";
      if (kw < 6) return "amber";
      return "red";
    }) ?? [];

  return (
    <div className="space-y-6">
      {/* Header + CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Overview</h2>
          <p className="text-sm text-horizon-muted mt-1">
            Real-time energy intelligence for {twinState?.home_name ?? "Villa A"}
          </p>
        </div>
        <button onClick={handleDispatch} className="btn-primary text-sm">
          Dispatch AI Plan
        </button>
      </div>

      {/* Twin live status strip */}
      {twinState && (
        <div className="card bg-gradient-to-r from-horizon-card to-horizon-surface flex items-center gap-6 py-3 px-5">
          <div>
            <p className="text-[10px] text-horizon-muted uppercase tracking-wider">Digital Twin</p>
            <p className="text-lg font-mono font-bold text-horizon-accent">
              {twinState.energy.current_power_kw.toFixed(2)} kW
            </p>
          </div>
          <div className="h-8 w-px bg-horizon-border" />
          {twinState.rooms
            .filter((r) => r.cooling_output_kw > 0 || r.room_name !== "Garage")
            .slice(0, 3)
            .map((room) => (
              <div key={room.room_id} className="text-center">
                <p className="text-xs text-horizon-muted">{room.room_name}</p>
                <p className={clsx(
                  "text-sm font-mono font-semibold",
                  room.comfort_status === "comfortable" ? "text-horizon-green" :
                  room.comfort_status === "warm" ? "text-horizon-amber" : "text-cyan-400"
                )}>
                  {room.current_temp_c.toFixed(1)}°C
                </p>
              </div>
          ))}
          <div className="ml-auto text-right">
            <p className="text-xs text-horizon-muted">
              Outside: <b className="text-horizon-amber">{twinState.environment.outside_temp_c}°C</b>
            </p>
            <p className="text-xs text-horizon-muted">
              Steps: <b className="text-horizon-accent font-mono">{twinState.twin_step_count}</b>
            </p>
          </div>
        </div>
      )}

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="CO₂ Saved Today"
          value={kpiLoading ? "..." : (kpis?.co2_avoided?.toFixed(1) ?? "0")}
          unit="kg CO₂"
          icon="🌱"
          color="green"
          trend="down"
        />
        <KpiCard
          label="Peak Shaved"
          value={
            kpiLoading
              ? "..."
              : ((kpis?.kwh_saved ?? 0) / 24).toFixed(1)
          }
          unit="kW avg"
          icon="⚡"
          color="amber"
          trend="down"
        />
        <KpiCard
          label="Cost Saved"
          value={kpiLoading ? "..." : (kpis?.aed_saved?.toFixed(2) ?? "0")}
          unit="AED"
          icon="💰"
          color="cyan"
          trend="down"
        />
        <KpiCard
          label="Comfort Compliance"
          value={
            kpiLoading
              ? "..."
              : ((kpis?.comfort_compliance ?? 0) * 100).toFixed(0) + "%"
          }
          unit="within band"
          icon="🏠"
          color={
            (kpis?.comfort_compliance ?? 1) >= 0.95
              ? "green"
              : "amber"
          }
        />
      </div>

      {/* 24h Forecast Chart */}
      {forecastLoading ? (
        <div className="card h-64 flex items-center justify-center text-horizon-muted">
          Loading forecast...
        </div>
      ) : forecast ? (
        <ForecastChart data={forecast} />
      ) : null}

      {/* Carbon Window Bar */}
      {carbonBars.length > 0 && (
        <div className="card">
          <h3 className="text-sm font-semibold text-horizon-muted mb-3">
            Carbon Intensity Window (24h)
          </h3>
          <div className="flex gap-0.5 h-6 rounded-lg overflow-hidden">
            {carbonBars.map((color, i) => (
              <div
                key={i}
                className={`flex-1 ${
                  color === "green"
                    ? "bg-horizon-green/60"
                    : color === "amber"
                    ? "bg-horizon-amber/60"
                    : "bg-horizon-red/60"
                }`}
                title={`Hour ${i}: ${color} intensity`}
              />
            ))}
          </div>
          <div className="flex justify-between mt-1 text-[10px] text-horizon-muted">
            <span>Now</span>
            <span>+6h</span>
            <span>+12h</span>
            <span>+18h</span>
            <span>+24h</span>
          </div>
        </div>
      )}
    </div>
  );
}
