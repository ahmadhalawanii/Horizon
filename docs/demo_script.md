# Horizon Demo Script (60–90 seconds)

## Setup (before demo)
```bash
make demo
```
This seeds the DB, starts backend, simulator (peak scenario), and frontend.

Open browser to `http://localhost:5173`

---

## Flow

### 1. Overview Page (15s)
- Point out the **KPI strip**: CO₂ saved, peak shaved, cost saved, comfort compliance
- Show the **24h forecast chart** with confidence band
- Show the **carbon intensity bar** (green/yellow/red periods)
- Click **"Dispatch AI Plan"**
  - Toast shows: "3 actions, est. 7.8 kWh saved"

### 2. Impact Simulator (25s)
- Navigate to **Impact Simulator**
- Click **"Judge Mode"** button
  - Watch it auto-select "Peak" scenario
  - AI optimization runs (balanced mode)
  - Baseline (red) vs Optimized (green) curves animate
  - Delta cards count up: kWh saved, AED saved, CO₂ avoided, peak reduction %
- Point out the gap between curves = "energy that was saved without any comfort sacrifice"

### 3. Digital Twin Console (25s)
- Navigate to **Digital Twin Console**
- Click rooms in the tree: Living Room, Bedroom, Kitchen, Garage
- Show **device cards**: status, power, setpoint, sparklines updating in real-time
- Adjust the **comfort range slider** (e.g., 22°C–25°C)
- Change mode to **"Saver"**
- Click **"Generate Recommendations"**
- Show the 3 recommendation cards with impacts
- Click **"Apply"** on one

### 4. Action Log (15s)
- Navigate to **Action Log**
- Show the timeline of all actions
- Filter by device type (e.g., "AC" only)
- Adjust confidence threshold
- Click **"Export CSV"** — downloaded file

### 5. Closing (10s)
- "Horizon is a comfort-first energy twin"
- "No lifestyle nagging — set once, optimize in the background"
- "Saves X kWh, Y AED, Z kg CO₂ daily — without touching the thermostat"

---

## Key Talking Points
- **Comfort is a HARD constraint** — never goes outside your preferred range
- **3 actions max** — not overwhelming, just smart timing
- **Real-time digital twin** — see every device, every watt, live
- **UAE-specific** — tariff rates, extreme heat scenarios, villa-sized loads
