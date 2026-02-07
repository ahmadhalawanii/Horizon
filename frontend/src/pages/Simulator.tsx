import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import BaselineVsOptimizedChart from "../components/BaselineVsOptimizedChart";
import KpiCard from "../components/KpiCard";
import clsx from "clsx";

type ScenarioType = "normal" | "peak" | "heatwave";

const SCENARIOS: { id: ScenarioType; label: string; desc: string }[] = [
  { id: "normal", label: "Normal", desc: "Typical UAE summer day" },
  { id: "peak", label: "Peak", desc: "Hot afternoon, high occupancy" },
  { id: "heatwave", label: "Heatwave", desc: "Extreme cooling demand" },
];

export default function Simulator() {
  const queryClient = useQueryClient();
  const [scenario, setScenario] = useState<ScenarioType>("normal");
  const [animate, setAnimate] = useState(false);
  const [judgeRunning, setJudgeRunning] = useState(false);

  const { data: simData, isLoading: simLoading } = useQuery({
    queryKey: ["simulate", scenario],
    queryFn: () => api.getSimulate(scenario),
  });

  const { data: kpis } = useQuery({
    queryKey: ["kpis"],
    queryFn: api.getKpis,
  });

  // Compute deltas from simulate data
  const totalBaseline =
    simData?.baseline_kw.reduce((s, v) => s + v, 0) ?? 0;
  const totalOptimized =
    simData?.optimized_kw.reduce((s, v) => s + v, 0) ?? 0;
  const totalSaved = Math.max(0, totalBaseline - totalOptimized);
  const peakBaseline = Math.max(...(simData?.baseline_kw ?? [0]));
  const peakOptimized = Math.max(...(simData?.optimized_kw ?? [0]));
  const peakReduction =
    peakBaseline > 0
      ? (((peakBaseline - peakOptimized) / peakBaseline) * 100).toFixed(0)
      : "0";

  const handleJudgeMode = async () => {
    setJudgeRunning(true);
    const toastId = toast.loading("Judge Mode: Running optimization flow...");

    try {
      // Step 1: Select peak scenario
      setScenario("peak");
      await new Promise((r) => setTimeout(r, 1000));
      toast.loading("Selecting peak scenario...", { id: toastId });

      // Step 2: Run optimization
      await new Promise((r) => setTimeout(r, 1500));
      toast.loading("Running AI optimization (balanced)...", { id: toastId });
      await api.postOptimize({ mode: "balanced" });

      // Step 3: Fetch simulate & KPIs
      await new Promise((r) => setTimeout(r, 1000));
      toast.loading("Simulating baseline vs optimized...", { id: toastId });
      await queryClient.invalidateQueries({ queryKey: ["simulate", "peak"] });
      await queryClient.invalidateQueries({ queryKey: ["kpis"] });

      // Step 4: Animate
      await new Promise((r) => setTimeout(r, 500));
      setAnimate(true);

      toast.success("Judge Mode complete! Review the results below.", {
        id: toastId,
        duration: 5000,
      });
    } catch {
      toast.error("Judge Mode failed", { id: toastId });
    } finally {
      setJudgeRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Impact Simulator</h2>
          <p className="text-sm text-horizon-muted mt-1">
            Compare baseline vs AI-optimized energy profiles
          </p>
        </div>
        <button
          onClick={handleJudgeMode}
          disabled={judgeRunning}
          className={clsx(
            "btn-primary text-sm",
            judgeRunning && "opacity-50 cursor-not-allowed"
          )}
        >
          {judgeRunning ? "Running..." : "Judge Mode"}
        </button>
      </div>

      {/* Scenario Selector */}
      <div className="flex gap-3">
        {SCENARIOS.map((sc) => (
          <button
            key={sc.id}
            onClick={() => {
              setScenario(sc.id);
              setAnimate(false);
            }}
            className={clsx(
              "card flex-1 text-center transition-all cursor-pointer",
              scenario === sc.id
                ? "border-horizon-accent bg-horizon-accent/5"
                : "hover:border-horizon-accent/30"
            )}
          >
            <p className="text-sm font-semibold">{sc.label}</p>
            <p className="text-xs text-horizon-muted mt-1">{sc.desc}</p>
          </button>
        ))}
      </div>

      {/* Main Chart */}
      {simLoading ? (
        <div className="card h-72 flex items-center justify-center text-horizon-muted">
          Loading simulation...
        </div>
      ) : simData ? (
        <BaselineVsOptimizedChart
          data={simData}
          animate={animate}
          title={`Baseline vs Optimized — ${scenario.charAt(0).toUpperCase() + scenario.slice(1)} Scenario`}
        />
      ) : null}

      {/* Delta cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Energy Saved"
          value={totalSaved.toFixed(1)}
          unit="kWh"
          icon="⚡"
          color="green"
          trend="down"
        />
        <KpiCard
          label="Cost Saved"
          value={(totalSaved * 0.38).toFixed(2)}
          unit="AED"
          icon="💰"
          color="amber"
          trend="down"
        />
        <KpiCard
          label="CO₂ Avoided"
          value={(totalSaved * 0.45).toFixed(1)}
          unit="kg CO₂"
          icon="🌱"
          color="cyan"
          trend="down"
        />
        <KpiCard
          label="Peak Reduction"
          value={`${peakReduction}%`}
          unit="peak kW shaved"
          icon="📉"
          color="green"
        />
      </div>
    </div>
  );
}
