import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from "react-native";
import { api, ActionItem } from "../services/api";

export default function ActionsScreen() {
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const data = await api.getActions();
      setActions(data);
    } catch (err: any) {
      console.log("Failed to load actions:", err.message);
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

  const autopilotActions = actions.filter((a) => a.source === "autopilot");
  const manualActions = actions.filter((a) => a.source !== "autopilot");

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {autopilotActions.length > 0 && (
        <>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>Autopilot</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AI ({autopilotActions.length})</Text>
            </View>
          </View>
          {autopilotActions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </>
      )}

      {manualActions.length > 0 && (
        <>
          <View style={styles.groupHeader}>
            <Text style={styles.groupTitle}>Manual</Text>
            <View style={[styles.badge, styles.badgeBlue]}>
              <Text style={[styles.badgeText, styles.badgeTextBlue]}>
                User ({manualActions.length})
              </Text>
            </View>
          </View>
          {manualActions.map((action) => (
            <ActionCard key={action.id} action={action} />
          ))}
        </>
      )}

      {actions.length === 0 && (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>
            No actions yet. Use the Home screen to generate recommendations.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

function ActionCard({ action }: { action: ActionItem }) {
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
    <View style={styles.card}>
      <Text style={styles.cardTs}>{ts}</Text>
      <Text style={styles.cardTitle}>{action.title}</Text>
      <Text style={styles.cardReason}>{action.reason}</Text>
      <View style={styles.metrics}>
        <Text style={styles.metricGreen}>
          {action.estimated_kwh_saved.toFixed(1)} kWh
        </Text>
        <Text style={styles.metricAmber}>
          {action.estimated_aed_saved.toFixed(2)} AED
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },
  content: { padding: 16, paddingBottom: 40 },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    marginBottom: 8,
  },
  groupTitle: { fontSize: 13, fontWeight: "600", color: "#64748b" },
  badge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: { fontSize: 11, fontWeight: "600", color: "#16a34a" },
  badgeBlue: { backgroundColor: "#dbeafe" },
  badgeTextBlue: { color: "#2563eb" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 6,
  },
  cardTs: { fontSize: 11, color: "#94a3b8", fontFamily: "monospace" },
  cardTitle: { fontSize: 14, fontWeight: "600", color: "#1e293b", marginTop: 4 },
  cardReason: { fontSize: 12, color: "#64748b", marginTop: 2 },
  metrics: { flexDirection: "row", gap: 12, marginTop: 8 },
  metricGreen: { fontSize: 12, fontWeight: "600", color: "#16a34a", fontFamily: "monospace" },
  metricAmber: { fontSize: 12, fontWeight: "600", color: "#d97706", fontFamily: "monospace" },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: { fontSize: 14, color: "#64748b", textAlign: "center" },
});
