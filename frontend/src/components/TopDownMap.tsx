import type { RoomGeometry } from "../lib/api";

interface TopDownMapProps {
  rooms: RoomGeometry[];
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

export default function TopDownMap({
  rooms,
  selectedRoomId,
  onRoomSelect,
}: TopDownMapProps) {
  // Compute bounds
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  rooms.forEach((r) =>
    r.polygon.forEach(([x, y]) => {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    })
  );
  const pad = 0.8;
  const vbX = minX - pad;
  const vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  return (
    <div className="card">
      <h3 className="text-sm font-semibold text-horizon-muted mb-3">
        Home Layout
      </h3>
      <svg
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="w-full h-48 md:h-64"
        style={{ borderRadius: 8, background: "#f1f5f9" }}
      >
        {rooms.map((room, i) => {
          const pts = room.polygon.map(([x, y]) => `${x},${y}`).join(" ");
          const cx =
            room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
          const cy =
            room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
          const isSelected = room.room_id === selectedRoomId;

          return (
            <g
              key={room.room_id}
              onClick={() => onRoomSelect(room.room_id)}
              style={{ cursor: "pointer" }}
            >
              <polygon
                points={pts}
                fill={isSelected ? "#bfdbfe" : ROOM_COLORS[i % ROOM_COLORS.length]}
                stroke={isSelected ? "#2563eb" : "#94a3b8"}
                strokeWidth={isSelected ? 0.08 : 0.04}
              />
              <text
                x={cx}
                y={cy - 0.3}
                textAnchor="middle"
                dominantBaseline="central"
                fill="#334155"
                fontSize={0.35}
                fontFamily="system-ui"
                fontWeight={isSelected ? "bold" : "normal"}
              >
                {room.room_name}
              </text>
              {/* Device icons */}
              {room.devices.slice(0, 3).map((dev, di) => (
                <text
                  key={dev.device_id}
                  x={cx - 0.5 + di * 0.5}
                  y={cy + 0.4}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={0.35}
                >
                  {DEVICE_ICONS[dev.type] || "·"}
                </text>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
