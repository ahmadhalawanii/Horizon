import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "../lib/api";
import type { LayoutImport } from "../lib/api";
import clsx from "clsx";

// ─── Built-in sample layout (Villa A) ────────────────────
const SAMPLE_LAYOUT: LayoutImport = {
  home_name: "Villa A",
  rooms: [
    {
      id: "living_room_1",
      name: "Living Room",
      polygon: [[0, 0], [6, 0], [6, 5], [0, 5]],
      height_m: 2.8,
      furniture: [
        { type: "sofa", center: [3, 4], size: [2.4, 1.0] },
        { type: "tv_unit", center: [3, 0.4], size: [1.8, 0.5] },
        { type: "coffee_table", center: [3, 2.5], size: [1.2, 0.6] },
      ],
    },
    {
      id: "bedroom_1",
      name: "Bedroom",
      polygon: [[6.2, 0], [10.2, 0], [10.2, 4], [6.2, 4]],
      height_m: 2.8,
      furniture: [
        { type: "bed", center: [8.2, 2], size: [2.0, 1.6] },
        { type: "wardrobe", center: [6.6, 2], size: [0.6, 2.0] },
      ],
    },
    {
      id: "kitchen_1",
      name: "Kitchen",
      polygon: [[0, 5.2], [4, 5.2], [4, 8.2], [0, 8.2]],
      height_m: 2.8,
      furniture: [
        { type: "counter", center: [2, 5.6], size: [3.5, 0.6] },
        { type: "dining_table", center: [2, 7.2], size: [1.5, 1.0] },
      ],
    },
    {
      id: "garage_1",
      name: "Garage",
      polygon: [[4.2, 5.2], [10.2, 5.2], [10.2, 8.2], [4.2, 8.2]],
      height_m: 3.0,
      furniture: [
        { type: "car_space", center: [7.2, 6.7], size: [4.5, 2.2] },
      ],
    },
  ],
};

type ScanStep = "intro" | "choose" | "edit" | "uploading" | "done";

export default function Scan() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ScanStep>("intro");
  const [layout, setLayout] = useState<LayoutImport | null>(null);
  const [homeName, setHomeName] = useState("Villa A");
  const [result, setResult] = useState<{ rooms_created: number; rooms_updated: number } | null>(null);

  // ─── Upload layout to backend ──────────────────────────
  const handleUpload = async () => {
    if (!layout) return;
    setStep("uploading");
    const toastId = toast.loading("Uploading layout to Horizon...");
    try {
      const res = await api.postLayoutImport({ ...layout, home_name: homeName });
      setResult(res);
      setStep("done");
      // Invalidate layout + twin queries so other pages pick up the new geometry
      await queryClient.invalidateQueries({ queryKey: ["layout-state"] });
      await queryClient.invalidateQueries({ queryKey: ["twin-state"] });
      toast.success(
        `Layout imported! ${res.rooms_created} rooms created, ${res.rooms_updated} updated.`,
        { id: toastId, duration: 4000 }
      );
    } catch (err) {
      toast.error("Upload failed. Is the backend running?", { id: toastId });
      setStep("edit");
    }
  };

  // ─── Load from JSON file ───────────────────────────────
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        // Validate structure
        if (!json.rooms || !Array.isArray(json.rooms)) {
          toast.error("Invalid layout JSON — must have a 'rooms' array");
          return;
        }
        setLayout(json);
        setHomeName(json.home_name || "My Home");
        setStep("edit");
        toast.success(`Loaded ${json.rooms.length} rooms from file`);
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  };

  // ─── Render ────────────────────────────────────────────
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Step: Intro */}
      {step === "intro" && (
        <div className="text-center space-y-6 pt-8">
          <div className="text-6xl">📱</div>
          <div>
            <h2 className="text-2xl font-bold">Scan Your Home</h2>
            <p className="text-sm text-horizon-muted mt-2">
              Import a floor plan layout into Horizon to power the 3D
              digital twin view. You can use a sample layout, upload a
              JSON file, or scan with an iPhone LiDAR app.
            </p>
          </div>
          <button onClick={() => setStep("choose")} className="btn-primary w-full text-base py-3">
            Get Started
          </button>
        </div>
      )}

      {/* Step: Choose method */}
      {step === "choose" && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold">Choose Import Method</h2>

          {/* Option 1: Sample layout */}
          <button
            onClick={() => {
              setLayout(SAMPLE_LAYOUT);
              setHomeName("Villa A");
              setStep("edit");
            }}
            className="card w-full text-left hover:border-horizon-accent/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">🏠</span>
              <div>
                <p className="font-semibold">Use Sample Layout</p>
                <p className="text-xs text-horizon-muted mt-0.5">
                  Villa A — 4 rooms with furniture. Best for demos.
                </p>
              </div>
            </div>
          </button>

          {/* Option 2: Upload JSON */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="card w-full text-left hover:border-horizon-accent/40 transition-colors"
          >
            <div className="flex items-center gap-4">
              <span className="text-3xl">📄</span>
              <div>
                <p className="font-semibold">Upload Layout JSON</p>
                <p className="text-xs text-horizon-muted mt-0.5">
                  Import a layout file from a LiDAR scan or manual design.
                </p>
              </div>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Option 3: LiDAR info */}
          <div className="card opacity-70">
            <div className="flex items-center gap-4">
              <span className="text-3xl">📡</span>
              <div>
                <p className="font-semibold text-horizon-muted">LiDAR Scan (iPhone)</p>
                <p className="text-xs text-horizon-muted mt-0.5">
                  Requires the native Horizon Scanner iOS app on a LiDAR-enabled
                  iPhone. The app scans your room and sends the layout directly
                  to this backend. See docs for setup.
                </p>
              </div>
            </div>
          </div>

          <button onClick={() => setStep("intro")} className="btn-secondary w-full text-sm">
            Back
          </button>
        </div>
      )}

      {/* Step: Edit / Review */}
      {step === "edit" && layout && (
        <div className="space-y-4 pt-4">
          <h2 className="text-xl font-bold">Review Layout</h2>

          {/* Home name */}
          <div className="card">
            <label className="text-xs text-horizon-muted">Home Name</label>
            <input
              type="text"
              value={homeName}
              onChange={(e) => setHomeName(e.target.value)}
              className="w-full mt-1 bg-horizon-surface border border-horizon-border rounded-lg px-3 py-2.5 text-sm"
            />
          </div>

          {/* Room list */}
          <div className="space-y-2">
            {layout.rooms.map((room, i) => (
              <div key={room.id} className="card flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-horizon-accent/10 flex items-center justify-center text-horizon-accent font-bold text-lg">
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{room.name}</p>
                  <p className="text-xs text-horizon-muted">
                    {room.polygon.length} vertices · {room.height_m}m · {room.furniture.length} items
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Floor plan mini preview */}
          <div className="card">
            <p className="text-xs text-horizon-muted mb-2">Floor Plan Preview</p>
            <MiniFloorPlan rooms={layout.rooms} />
          </div>

          {/* Actions */}
          <button onClick={handleUpload} className="btn-primary w-full text-base py-3">
            Send to Horizon
          </button>
          <button onClick={() => setStep("choose")} className="btn-secondary w-full text-sm">
            Back
          </button>
        </div>
      )}

      {/* Step: Uploading */}
      {step === "uploading" && (
        <div className="text-center space-y-4 pt-12">
          <div className="animate-pulse text-5xl">⬆️</div>
          <p className="text-horizon-muted">Uploading layout...</p>
        </div>
      )}

      {/* Step: Done */}
      {step === "done" && result && (
        <div className="text-center space-y-6 pt-8">
          <div className="text-6xl">✅</div>
          <div>
            <h2 className="text-2xl font-bold text-horizon-green">Layout Imported!</h2>
            <p className="text-sm text-horizon-muted mt-2">
              {result.rooms_created} rooms created, {result.rooms_updated} rooms updated.
            </p>
          </div>
          <div className="space-y-3">
            <button
              onClick={() => navigate("/console")}
              className="btn-primary w-full text-base py-3"
            >
              View 3D Digital Twin
            </button>
            <button
              onClick={() => { setStep("intro"); setLayout(null); setResult(null); }}
              className="btn-secondary w-full text-sm"
            >
              Scan Another Home
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Simple 2D floor plan preview (SVG) ──────────────────
function MiniFloorPlan({ rooms }: { rooms: LayoutImport["rooms"] }) {
  // Compute bounds
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  rooms.forEach((r) =>
    r.polygon.forEach(([x, y]) => {
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    })
  );
  const pad = 0.5;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  const ROOM_COLORS = ["#164e63", "#1e1b4b", "#14532d", "#451a03", "#4a1942", "#1a3a2a"];

  return (
    <svg
      viewBox={`${minX - pad} ${minY - pad} ${vbW} ${vbH}`}
      className="w-full h-40"
      style={{ background: "#080c14", borderRadius: 8 }}
    >
      {rooms.map((room, i) => {
        const pts = room.polygon.map(([x, y]) => `${x},${y}`).join(" ");
        const cx = room.polygon.reduce((s, p) => s + p[0], 0) / room.polygon.length;
        const cy = room.polygon.reduce((s, p) => s + p[1], 0) / room.polygon.length;
        return (
          <g key={room.id}>
            <polygon
              points={pts}
              fill={ROOM_COLORS[i % ROOM_COLORS.length]}
              fillOpacity={0.5}
              stroke="#06b6d4"
              strokeWidth={0.06}
            />
            <text
              x={cx}
              y={cy}
              textAnchor="middle"
              dominantBaseline="central"
              fill="#94a3b8"
              fontSize={0.4}
              fontFamily="system-ui"
            >
              {room.name}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
