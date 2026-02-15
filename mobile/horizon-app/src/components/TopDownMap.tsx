import React from "react";
import { View, Text, StyleSheet, Pressable, Dimensions } from "react-native";
import Svg, { Polygon, Text as SvgText, G } from "react-native-svg";

interface Room {
  room_id: number;
  room_name: string;
  polygon: number[][];
  devices: { device_id: number; type: string; name: string; status: string; power_kw: number }[];
}

interface TopDownMapProps {
  rooms: Room[];
  selectedRoomId: number | null;
  onRoomSelect: (roomId: number) => void;
}

const ROOM_COLORS = [
  "#dbeafe", "#dcfce7", "#fef3c7", "#fce7f3", "#e0e7ff", "#d1fae5",
];

const DEVICE_ICONS: Record<string, string> = {
  ac: "❄",
  ev_charger: "⚡",
  water_heater: "♨",
  washer_dryer: "◎",
};

export default function TopDownMap({ rooms, selectedRoomId, onRoomSelect }: TopDownMapProps) {
  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rooms.forEach((r) =>
    r.polygon.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    })
  );

  const pad = 1;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  const screenWidth = Dimensions.get("window").width - 32;
  const svgHeight = (screenWidth / vbW) * vbH;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home Layout</Text>
      <Svg
        width={screenWidth}
        height={Math.min(svgHeight, 250)}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      >
        {rooms.map((room, i) => {
          const pts = room.polygon.map(([x, y]) => `${x},${y}`).join(" ");
          const cx = room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
          const cy = room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
          const isSelected = room.room_id === selectedRoomId;

          return (
            <G key={room.room_id} onPress={() => onRoomSelect(room.room_id)}>
              <Polygon
                points={pts}
                fill={isSelected ? "#bfdbfe" : ROOM_COLORS[i % ROOM_COLORS.length]}
                stroke={isSelected ? "#2563eb" : "#94a3b8"}
                strokeWidth={isSelected ? 0.08 : 0.04}
              />
              <SvgText
                x={cx}
                y={cy}
                textAnchor="middle"
                alignmentBaseline="central"
                fill="#334155"
                fontSize={0.4}
                fontWeight={isSelected ? "bold" : "normal"}
              >
                {room.room_name}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    marginBottom: 12,
    alignSelf: "flex-start",
  },
});
