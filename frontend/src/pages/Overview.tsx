import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import KpiCard from "../components/KpiCard";
import ForecastChart from "../components/ForecastChart";

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

  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: api.getPreferences,
  });

  const autopilotOn = prefs?.autopilot_enabled ?? false;

  const handleSimulateSpike = async () => {
    const toastId = toast.loading("Simulating high usage...");
    try {
      const result = await api.simulateSpike(1, "peak");
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });
      await queryClient.invalidateQueries({ queryKey: ["simulate"] });
      toast.success(result.message, { id: toastId, duration: 4000 });
    } catch {
      toast.error("Simulation failed", { id: toastId });
    }
  };

  const handleLetAiFix = async () => {
    const toastId = toast.loading("Running AI optimization...");
    try {
      const result = await api.postOptimize({ mode: "balanced" });
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });
      await queryClient.invalidateQueries({ queryKey: ["actions-log"] });
      const totalSaved = result.actions.reduce(
        (sum, a) => sum + a.estimated_kwh_saved,
        0
      );
      toast.success(
        `${result.actions.length} actions, est. ${totalSaved.toFixed(1)} kWh saved`,
        { id: toastId, duration: 4000 }
      );
    } catch {
      toast.error("Optimization failed", { id: toastId });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Hero Card */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-sm text-horizon-muted">Current usage</p>
            <p className="text-4xl font-bold font-mono tracking-tight">
              {twinState?.energy.current_power_kw.toFixed(1) ?? "—"}{" "}
              <span className="text-lg text-horizon-muted font-normal">kW</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                autopilotOn ? "bg-horizon-green" : "bg-gray-300"
              }`}
            />
            <span className="text-sm font-medium">
              Autopilot {autopilotOn ? "On" : "Off"}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="kWh Saved"
          value={kpiLoading ? "..." : (kpis?.kwh_saved?.toFixed(1) ?? "0")}
          unit="kWh"
          icon="⚡"
          color="green"
        />
        <KpiCard
          label="Cost Saved"
          value={kpiLoading ? "..." : (kpis?.aed_saved?.toFixed(1) ?? "0")}
          unit="AED"
          icon="💰"
          color="amber"
        />
        <KpiCard
          label="CO₂ Avoided"
          value={kpiLoading ? "..." : (kpis?.co2_avoided?.toFixed(1) ?? "0")}
          unit="kg"
          icon="🌱"
          color="green"
        />
        <KpiCard
          label="Comfort"
          value={
            kpiLoading
              ? "..."
              : ((kpis?.comfort_compliance ?? 0) * 100).toFixed(0) + "%"
          }
          unit="in band"
          icon="🏠"
          color={
            (kpis?.comfort_compliance ?? 1) >= 0.95 ? "green" : "amber"
          }
        />
      </div>

      {/* Forecast Chart */}
      {forecastLoading ? (
        <div className="card h-64 flex items-center justify-center text-horizon-muted">
          Loading forecast...
        </div>
      ) : forecast ? (
        <ForecastChart data={forecast} />
      ) : null}

      {/* CTA Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={handleSimulateSpike} className="btn-secondary flex-1 text-sm">
          Simulate high usage
        </button>
        {!autopilotOn && (
          <button onClick={handleLetAiFix} className="btn-primary flex-1 text-sm">
            Let AI fix it
          </button>
        )}
      </div>
    </div>
  );
}
