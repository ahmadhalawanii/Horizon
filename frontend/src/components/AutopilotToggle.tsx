import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";

export default function AutopilotToggle() {
  const queryClient = useQueryClient();
  const [toggling, setToggling] = useState(false);

  const { data: prefs } = useQuery({
    queryKey: ["preferences"],
    queryFn: api.getPreferences,
  });

  const isOn = prefs?.autopilot_enabled ?? false;

  const handleToggle = async () => {
    setToggling(true);
    try {
      const result = await api.toggleAutopilot(prefs?.home_id ?? 1, !isOn);
      await queryClient.invalidateQueries({ queryKey: ["preferences"] });
      toast.success(result.message);
    } catch {
      toast.error("Failed to toggle Autopilot");
    } finally {
      setToggling(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={toggling}
      className={`
        flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium
        transition-all duration-200 border
        ${isOn
          ? "bg-green-50 border-green-200 text-green-700"
          : "bg-gray-50 border-gray-200 text-gray-500"
        }
        ${toggling ? "opacity-50" : "hover:shadow-sm"}
      `}
    >
      <span
        className={`w-2 h-2 rounded-full transition-colors ${
          isOn ? "bg-green-500" : "bg-gray-400"
        }`}
      />
      <span>AI Autopilot</span>
      <span className="text-xs">{isOn ? "On" : "Off"}</span>
    </button>
  );
}
