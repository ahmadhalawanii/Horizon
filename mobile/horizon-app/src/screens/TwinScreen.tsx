import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
} from "react-native";
import { api, TwinState, LayoutState } from "../services/api";
import TopDownMap from "../components/TopDownMap";

export default function TwinScreen() {
  const [twin, setTwin] = useState<TwinState | null>(null);
  const [layout, setLayout] = useState<LayoutState | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [t, l] = await Promise.all([
        api.getTwinState(),
        api.getLayoutState(),
      ]);
      setTwin(t);
      setLayout(l);
    } catch (err: any) {
      console.log("Failed to load twin:", err.message);
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

  const rooms = twin?.rooms ?? [];
  const activeRoomId = selectedRoom ?? rooms[0]?.room_id ?? null;
  const activeRoom = rooms.find((r) => r.room_id === activeRoomId);
  const devices = activeRoomId
    ? (twin?.devices ?? []).filter((d) => d.room_id === activeRoomId)
    : [];

  const hasLayout = layout && layout.rooms.some((r) => r.polygon.length > 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Map */}
      {hasLayout && (
        <TopDownMap
          rooms={layout!.rooms}
          selectedRoomId={activeRoomId}
          onRoomSelect={(id) => setSelectedRoom(id)}
        />
      )}

      {!hasLayout && (
        <View style={styles.noLayout}>
          <Text style={styles.noLayoutText}>
            No layout imported yet. Go to Home → Scan to add one.
          </Text>
        </View>
      )}

      {/* Room list */}
      <Text style={styles.sectionTitle}>Rooms</Text>
      {rooms.map((room) => {
        const isActive = room.room_id === activeRoomId;
        return (
          <Pressable
            key={room.room_id}
            style={[styles.roomRow, isActive && styles.roomRowActive]}
            onPress={() => setSelectedRoom(room.room_id)}
          >
            <Text style={[styles.roomName, isActive && styles.roomNameActive]}>
              {room.room_name}
            </Text>
            <View style={styles.roomRight}>
              <Text style={styles.roomTemp}>
                {room.current_temp_c.toFixed(1)}°C
              </Text>
              <Text style={styles.roomStatus}>{room.comfort_status}</Text>
            </View>
          </Pressable>
        );
      })}

      {/* Selected room devices */}
      {activeRoom && devices.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            {activeRoom.room_name} — Devices
          </Text>
          {devices.map((dev) => (
            <View key={dev.device_id} style={styles.deviceCard}>
              <View>
                <Text style={styles.deviceName}>{dev.name}</Text>
                <Text style={styles.deviceType}>
                  {dev.type.replace("_", " ")}
                </Text>
              </View>
              <View style={styles.deviceRight}>
                <Text style={styles.devicePower}>
                  {dev.power_kw.toFixed(2)} kW
                </Text>
                <Text
                  style={[
                    styles.deviceStatus,
                    {
                      color:
                        dev.status === "on" || dev.status === "charging"
                          ? "#16a34a"
                          : "#9ca3af",
                    },
                  ]}
                >
                  {dev.status}
                </Text>
              </View>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },
  content: { padding: 16, paddingBottom: 40 },
  noLayout: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    alignItems: "center",
    marginBottom: 16,
  },
  noLayoutText: { fontSize: 13, color: "#64748b", textAlign: "center" },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 20,
    marginBottom: 8,
  },
  roomRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  roomRowActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  roomName: { fontSize: 15, fontWeight: "500", color: "#1e293b" },
  roomNameActive: { color: "#2563eb" },
  roomRight: { alignItems: "flex-end" },
  roomTemp: { fontSize: 14, fontWeight: "600", fontFamily: "monospace", color: "#1e293b" },
  roomStatus: { fontSize: 11, color: "#64748b", marginTop: 2, textTransform: "capitalize" },
  deviceCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  deviceName: { fontSize: 14, fontWeight: "500", color: "#1e293b" },
  deviceType: { fontSize: 12, color: "#64748b", textTransform: "capitalize" },
  deviceRight: { alignItems: "flex-end" },
  devicePower: { fontSize: 14, fontWeight: "600", fontFamily: "monospace", color: "#1e293b" },
  deviceStatus: { fontSize: 11, marginTop: 2, textTransform: "capitalize" },
});
