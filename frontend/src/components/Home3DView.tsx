import { Canvas } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { useMemo, useCallback } from "react";
import * as THREE from "three";

// ─── Types ───────────────────────────────────────────────
interface RoomGeo {
  room_id: number;
  room_name: string;
  polygon: number[][];
  height_m: number;
  furniture: { type: string; center: number[]; size: number[] }[];
  devices: { device_id: number; type: string; name: string; status: string; power_kw: number }[];
}

interface Home3DViewProps {
  rooms: RoomGeo[];
  selectedRoomId: number | null;
  onRoomClick: (roomId: number) => void;
  className?: string;
}

// ─── Color map ───────────────────────────────────────────
const ROOM_COLORS: Record<string, string> = {
  "Living Room": "#164e63",
  Bedroom: "#1e1b4b",
  Kitchen: "#14532d",
  Garage: "#451a03",
};

const DEVICE_COLORS: Record<string, string> = {
  ac: "#06b6d4",
  ev_charger: "#f59e0b",
  water_heater: "#ef4444",
  washer_dryer: "#a855f7",
};

const DEVICE_LABELS: Record<string, string> = {
  ac: "❄",
  ev_charger: "⚡",
  water_heater: "♨",
  washer_dryer: "◎",
};

// ─── Main Component ──────────────────────────────────────
export default function Home3DView({
  rooms,
  selectedRoomId,
  onRoomClick,
  className = "",
}: Home3DViewProps) {
  // Compute center of all rooms for camera positioning
  const center = useMemo(() => {
    let sumX = 0, sumZ = 0, count = 0;
    rooms.forEach((r) =>
      r.polygon.forEach((p) => {
        sumX += p[0]; sumZ += p[1]; count++;
      })
    );
    return count > 0 ? [sumX / count, sumZ / count] : [5, 4];
  }, [rooms]);

  return (
    <div className={`bg-horizon-bg rounded-xl border border-horizon-border overflow-hidden ${className}`}>
      <Canvas
        orthographic
        camera={{
          position: [center[0], 15, center[1] + 8],
          zoom: 45,
          near: 0.1,
          far: 100,
        }}
        style={{ background: "#0a0e17" }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 20, 10]} intensity={0.8} castShadow />
        <pointLight position={[center[0], 10, center[1]]} intensity={0.3} />

        {/* Ground plane */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[center[0], -0.01, center[1]]} receiveShadow>
          <planeGeometry args={[30, 30]} />
          <meshStandardMaterial color="#080c14" />
        </mesh>

        {/* Rooms */}
        {rooms.map((room) => (
          <RoomMesh
            key={room.room_id}
            room={room}
            isSelected={room.room_id === selectedRoomId}
            onClick={() => onRoomClick(room.room_id)}
          />
        ))}

        <OrbitControls
          enableRotate={true}
          enablePan={true}
          enableZoom={true}
          maxPolarAngle={Math.PI / 2.5}
          minPolarAngle={Math.PI / 6}
          target={[center[0], 0, center[1]]}
          makeDefault
        />
      </Canvas>
    </div>
  );
}

// ─── Room Mesh ───────────────────────────────────────────
function RoomMesh({
  room,
  isSelected,
  onClick,
}: {
  room: RoomGeo;
  isSelected: boolean;
  onClick: () => void;
}) {
  const { floorShape, wallPositions, centerX, centerZ } = useMemo(() => {
    const pts = room.polygon.map((p) => new THREE.Vector2(p[0], p[1]));
    const shape = new THREE.Shape(pts);

    // Wall segments from polygon edges
    const walls: { start: number[]; end: number[]; midX: number; midZ: number; angle: number; length: number }[] = [];
    for (let i = 0; i < room.polygon.length; i++) {
      const a = room.polygon[i];
      const b = room.polygon[(i + 1) % room.polygon.length];
      const dx = b[0] - a[0];
      const dz = b[1] - a[1];
      const len = Math.sqrt(dx * dx + dz * dz);
      const angle = Math.atan2(dz, dx);
      walls.push({
        start: a, end: b,
        midX: (a[0] + b[0]) / 2,
        midZ: (a[1] + b[1]) / 2,
        angle,
        length: len,
      });
    }

    // Center
    const xs = room.polygon.map((p) => p[0]);
    const zs = room.polygon.map((p) => p[1]);
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    const cz = zs.reduce((a, b) => a + b, 0) / zs.length;

    return { floorShape: shape, wallPositions: walls, centerX: cx, centerZ: cz };
  }, [room]);

  const floorColor = ROOM_COLORS[room.room_name] || "#1a1a2e";
  const wallColor = isSelected ? "#06b6d4" : "#2d3748";
  const wallHeight = Math.min(room.height_m * 0.4, 1.2); // Scale down for visibility

  return (
    <group>
      {/* Floor */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      >
        <shapeGeometry args={[floorShape]} />
        <meshStandardMaterial
          color={isSelected ? "#0e7490" : floorColor}
          transparent
          opacity={isSelected ? 0.9 : 0.7}
        />
      </mesh>

      {/* Walls */}
      {wallPositions.map((wall, i) => (
        <mesh
          key={i}
          position={[wall.midX, wallHeight / 2, wall.midZ]}
          rotation={[0, -wall.angle, 0]}
        >
          <boxGeometry args={[wall.length, wallHeight, 0.08]} />
          <meshStandardMaterial
            color={wallColor}
            transparent
            opacity={0.8}
          />
        </mesh>
      ))}

      {/* Room label */}
      <Text
        position={[centerX, 0.02, centerZ]}
        rotation={[-Math.PI / 2, 0, 0]}
        fontSize={0.35}
        color={isSelected ? "#22d3ee" : "#94a3b8"}
        anchorX="center"
        anchorY="middle"
      >
        {room.room_name}
      </Text>

      {/* Furniture */}
      {room.furniture.map((f, i) => (
        <mesh
          key={`f-${i}`}
          position={[f.center[0], 0.1, f.center[1]]}
        >
          <boxGeometry args={[f.size[0], 0.2, f.size[1]]} />
          <meshStandardMaterial color="#334155" transparent opacity={0.5} />
        </mesh>
      ))}

      {/* Device markers */}
      {room.devices.map((dev, i) => {
        // Place devices spaced along the room, offset from center
        const angle = (i / Math.max(room.devices.length, 1)) * Math.PI * 2;
        const radius = 0.8;
        const dx = centerX + Math.cos(angle) * radius;
        const dz = centerZ + Math.sin(angle) * radius;
        const color = DEVICE_COLORS[dev.type] || "#64748b";
        const isDevOn = dev.status === "on" || dev.status === "charging" || dev.status === "heating";

        return (
          <group key={dev.device_id} position={[dx, 0.5, dz]}>
            {/* Device puck */}
            <mesh>
              <cylinderGeometry args={[0.25, 0.25, 0.15, 16]} />
              <meshStandardMaterial
                color={color}
                emissive={isDevOn ? color : "#000000"}
                emissiveIntensity={isDevOn ? 0.5 : 0}
              />
            </mesh>
            {/* Label */}
            <Text
              position={[0, 0.25, 0]}
              fontSize={0.25}
              color="white"
              anchorX="center"
            >
              {DEVICE_LABELS[dev.type] || "•"}
            </Text>
          </group>
        );
      })}
    </group>
  );
}
