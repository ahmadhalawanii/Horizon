import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from "react-native";
import { api } from "../services/api";
import { performLidarScan, getSampleLayout } from "../services/lidarScan";
import { SAMPLE_LAYOUTS } from "../data/sampleLayouts";

interface Props {
  navigation: any;
}

export default function ScanScreen({ navigation }: Props) {
  const [uploading, setUploading] = useState(false);

  const handleLidarScan = async () => {
    const result = await performLidarScan();
    if (result.success && result.layout) {
      await uploadLayout(result.layout);
    } else {
      Alert.alert(
        "LiDAR Not Available",
        result.error || "Use a sample layout instead.",
        [{ text: "OK" }]
      );
    }
  };

  const handleSampleLayout = async (layoutId: string) => {
    const result = getSampleLayout(layoutId);
    if (result.success && result.layout) {
      await uploadLayout(result.layout);
    } else {
      Alert.alert("Error", result.error || "Failed to load sample layout");
    }
  };

  const uploadLayout = async (layout: {
    home_name: string;
    rooms: any[];
  }) => {
    setUploading(true);
    try {
      const res = await api.postLayoutImport(layout);
      Alert.alert(
        "Layout Imported!",
        `${res.rooms_created} rooms created, ${res.rooms_updated} updated.`,
        [
          {
            text: "View Twin",
            onPress: () => navigation.navigate("Twin"),
          },
        ]
      );
    } catch (err: any) {
      Alert.alert("Upload Failed", err.message || "Is the backend running?");
    } finally {
      setUploading(false);
    }
  };

  if (uploading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#2563eb" />
        <Text style={styles.uploadingText}>Uploading layout...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Scan Home (Beta)</Text>
      <Text style={styles.subtitle}>
        Import a floor plan into Horizon to power the digital twin view.
      </Text>

      {/* LiDAR scan card */}
      <Pressable style={styles.card} onPress={handleLidarScan}>
        <Text style={styles.cardTitle}>Scan with camera (LiDAR)</Text>
        <Text style={styles.cardDesc}>
          Requires a LiDAR-enabled iPhone with a custom dev client.
        </Text>
      </Pressable>

      {/* Sample layouts */}
      <Text style={styles.sectionTitle}>Or use a sample layout</Text>

      {SAMPLE_LAYOUTS.map((layout) => (
        <Pressable
          key={layout.id}
          style={styles.card}
          onPress={() => handleSampleLayout(layout.id)}
        >
          <Text style={styles.cardTitle}>{layout.label}</Text>
          <Text style={styles.cardDesc}>{layout.description}</Text>
          <Text style={styles.cardMeta}>
            {layout.data.rooms.length} rooms
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fb" },
  content: { padding: 16, paddingBottom: 40 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#f8f9fb" },
  uploadingText: { fontSize: 14, color: "#64748b", marginTop: 12 },
  title: { fontSize: 22, fontWeight: "700", color: "#1e293b" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 4, marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginTop: 24,
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    marginBottom: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  cardDesc: { fontSize: 13, color: "#64748b", marginTop: 4 },
  cardMeta: { fontSize: 12, color: "#94a3b8", marginTop: 6 },
});
