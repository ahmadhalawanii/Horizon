import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import BaselineVsOptimizedChart from "../components/BaselineVsOptimizedChart";
import KpiCard from "../components/KpiCard";
import clsx from "clsx";

export default function Simulator() {
  const queryClient = useQueryClient();
  const [scenario, setScenario] = useState<"normal" | "peak" | "heatwave">("normal");
  const [running, setRunning] = useState(false);

  const { data: simData, isLoading: simLoading } = useQuery({
    queryKey: ["simulate", scenario],
    queryFn: () => api.getSimulate(scenario),
  });

  // Compute deltas
  const totalBaseline = simData?.baseline_kw.reduce((s, v) => s + v, 0) ?? 0;
  const totalOptimized = simData?.optimized_kw.reduce((s, v) => s + v, 0) ?? 0;
  const totalSaved = Math.max(0, totalBaseline - totalOptimized);
  const peakBaseline = Math.max(...(simData?.baseline_kw ?? [0]));
  const peakOptimized = Math.max(...(simData?.optimized_kw ?? [0]));
  const peakReduction =
    peakBaseline > 0
      ? (((peakBaseline - peakOptimized) / peakBaseline) * 100).toFixed(0)
      : "0";

  const handleRunAutopilotSim = async () => {
    setRunning(true);
    const toastId = toast.loading("Running AI Autopilot simulation...");
    try {
      // Enable autopilot
      await api.toggleAutopilot(1, true);
      await queryClient.invalidateQueries({ queryKey: ["preferences"] });

      // Spike + refresh
      await api.simulateSpike(1, "peak");
      setScenario("peak");
      await queryClient.invalidateQueries({ queryKey: ["simulate", "peak"] });
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });

      toast.success(
        "High usage simulated. AI Autopilot reshapes the schedule while staying in your comfort range.",
        { id: toastId, duration: 5000 }
      );
    } catch {
      toast.error("Simulation failed", { id: toastId });
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Simulator</h2>
          <p className="text-sm text-horizon-muted mt-1">
            Baseline vs AI-optimized energy profiles
          </p>
        </div>
        <button
          onClick={handleRunAutopilotSim}
          disabled={running}
          className={clsx("btn-primary text-sm", running && "opacity-50")}
        >
          {running ? "Running..." : "Run AI Autopilot Simulation"}
        </button>
      </div>

      {/* Main chart */}
      {simLoading ? (
        <div className="card h-72 flex items-center justify-center text-horizon-muted">
          Loading simulation...
        </div>
      ) : simData ? (
        <BaselineVsOptimizedChart data={simData} />
      ) : null}

      {/* Delta cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Energy Saved"
          value={totalSaved.toFixed(1)}
          unit="kWh"
          icon="⚡"
          color="green"
        />
        <KpiCard
          label="Cost Saved"
          value={(totalSaved * 0.38).toFixed(1)}
          unit="AED"
          icon="💰"
          color="amber"
        />
        <KpiCard
          label="CO₂ Avoided"
          value={(totalSaved * 0.45).toFixed(1)}
          unit="kg"
          icon="🌱"
          color="green"
        />
        <KpiCard
          label="Peak Reduction"
          value={`${peakReduction}%`}
          unit="shaved"
          icon="📉"
          color="cyan"
        />
      </div>

      {/* Explanation */}
      <p className="text-sm text-horizon-muted text-center">
        High usage simulated. AI Autopilot reshapes the schedule while staying in your comfort range.
      </p>
    </div>
  );
}
