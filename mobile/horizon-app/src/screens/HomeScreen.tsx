import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  RefreshControl,
} from "react-native";
import { api, KpiData, UserPreferences } from "../services/api";

interface Props {
  navigation: any;
}

export default function HomeScreen({ navigation }: Props) {
  const [kpis, setKpis] = useState<KpiData | null>(null);
  const [prefs, setPrefs] = useState<UserPreferences | null>(null);
  const [currentKw, setCurrentKw] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [k, p, twin] = await Promise.all([
        api.getKpis(),
        api.getPreferences(),
        api.getTwinState(),
      ]);
      setKpis(k);
      setPrefs(p);
      setCurrentKw(twin.energy.current_power_kw);
    } catch (err: any) {
      console.log("Failed to load:", err.message);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const autopilotOn = prefs?.autopilot_enabled ?? false;

  const handleToggleAutopilot = async () => {
    try {
      const result = await api.toggleAutopilot(1, !autopilotOn);
      setPrefs((p) => (p ? { ...p, autopilot_enabled: result.autopilot_enabled } : p));
      Alert.alert("Autopilot", result.message);
    } catch {
      Alert.alert("Error", "Failed to toggle Autopilot");
    }
  };

  const handleSimulateSpike = async () => {
    try {
      const result = await api.simulateSpike(1, "peak");
      Alert.alert("Simulation", result.message);
      await loadData();
    } catch {
      Alert.alert("Error", "Failed to simulate spike");
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Hero */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Current usage</Text>
        <Text style={styles.heroValue}>
          {currentKw?.toFixed(1) ?? "—"}{" "}
          <Text style={styles.heroUnit}>kW</Text>
        </Text>
        <View style={styles.autopilotRow}>
          <View
            style={[
              styles.dot,
              { backgroundColor: autopilotOn ? "#16a34a" : "#9ca3af" },
            ]}
          />
          <Text style={styles.autopilotLabel}>
            Autopilot {autopilotOn ? "On" : "Off"}
          </Text>
        </View>
      </View>

      {/* Subheading */}
      <Text style={styles.hint}>
        Tap "Simulate high usage" then toggle AI Autopilot to watch Horizon stabilize your home.
      </Text>

      {/* KPI Row */}
      <View style={styles.kpiRow}>
        <KpiBox label="kWh Saved" value={kpis?.kwh_saved?.toFixed(1) ?? "—"} />
        <KpiBox label="AED Saved" value={kpis?.aed_saved?.toFixed(1) ?? "—"} />
        <KpiBox label="CO₂ kg" value={kpis?.co2_avoided?.toFixed(1) ?? "—"} />
        <KpiBox
          label="Comfort"
          value={
            kpis ? ((kpis.comfort_compliance * 100).toFixed(0) + "%") : "—"
          }
        />
      </View>

      {/* Autopilot toggle */}
      <Pressable
        style={[
          styles.button,
          { backgroundColor: autopilotOn ? "#dcfce7" : "#f3f4f6" },
        ]}
        onPress={handleToggleAutopilot}
      >
        <Text
          style={[
            styles.buttonText,
            { color: autopilotOn ? "#16a34a" : "#6b7280" },
          ]}
        >
          {autopilotOn ? "Turn Autopilot Off" : "Turn Autopilot On"}
        </Text>
      </Pressable>

      {/* Action buttons */}
      <Pressable
        style={[styles.button, styles.primaryButton]}
        onPress={handleSimulateSpike}
      >
        <Text style={styles.primaryButtonText}>Simulate high usage</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate("Twin")}
      >
        <Text style={styles.buttonText}>Open Twin View</Text>
      </Pressable>

      <Pressable
        style={styles.button}
        onPress={() => navigation.navigate("Scan")}
      >
        <Text style={styles.buttonText}>Scan home (LiDAR)</Text>
      </Pressable>
    </ScrollView>
  );
}

function KpiBox({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.kpiBox}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },
  content: { padding: 16, paddingBottom: 40 },
  heroCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 12,
  },
  heroLabel: { fontSize: 13, color: "#64748b" },
  heroValue: { fontSize: 42, fontWeight: "700", color: "#1e293b", marginTop: 4 },
  heroUnit: { fontSize: 18, fontWeight: "400", color: "#64748b" },
  autopilotRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  autopilotLabel: { fontSize: 14, fontWeight: "500", color: "#1e293b" },
  hint: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 16,
    lineHeight: 18,
  },
  kpiRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  kpiBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
  },
  kpiValue: { fontSize: 18, fontWeight: "700", color: "#1e293b" },
  kpiLabel: { fontSize: 10, color: "#64748b", marginTop: 2 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginBottom: 10,
  },
  buttonText: { fontSize: 15, fontWeight: "600", color: "#1e293b" },
  primaryButton: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  primaryButtonText: { fontSize: 15, fontWeight: "600", color: "#fff" },
});
