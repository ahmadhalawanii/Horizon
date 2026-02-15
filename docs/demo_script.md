# Horizon — Judge Demo Sequence

## AI Autopilot Demo (Web) — ~60 seconds

### Setup
1. Backend running: `make backend`
2. Seed data loaded: `make seed`
3. Frontend running: `make frontend`
4. Open browser: `http://localhost:5173`

### Demo Steps

1. **Overview page** (10s)
   - Show current usage (kW) and KPI cards
   - Point out the **Autopilot toggle** in the top-right (currently Off)

2. **Simulate high usage** (10s)
   - Click **"Simulate high usage"** button
   - Toast shows spike confirmation
   - KPIs reflect the simulated load

3. **Turn on AI Autopilot** (10s)
   - Click the **AI Autopilot** toggle in the top bar → turns green
   - Say: "Now Horizon automatically monitors and optimizes"

4. **Simulator page** (15s)
   - Navigate to **Simulator** tab
   - Click **"Run AI Autopilot Simulation"**
   - Watch the baseline (red) vs optimized (green) chart
   - Point out: delta cards show kWh, AED, CO₂ saved

5. **Actions page** (10s)
   - Navigate to **Actions** tab
   - Show actions grouped by **Autopilot** vs **Manual**
   - Point out: each action has kWh/AED/CO₂ impact

6. **Twin page** (5s)
   - Navigate to **Twin** tab
   - Show the top-down room map
   - Tap a room → see device status and power

### Key Talking Points
- "Autopilot runs the optimizer automatically — users set comfort bounds once, then forget"
- "High usage simulated. AI Autopilot reshapes the schedule while staying in your comfort range"
- "Every action is attributed: Autopilot vs Manual"

---

## Mobile Layout + Autopilot Demo (Expo App) — ~45 seconds

### Setup
1. Backend running on your machine
2. `cd mobile/horizon-app && npx expo start`
3. Scan QR code with Expo Go on your phone
4. Update API base URL in `src/services/api.ts` to your machine's IP

### Demo Steps

1. **Home screen** (10s)
   - Show current usage and KPI boxes
   - Toggle Autopilot On → alert confirms

2. **Simulate high usage** (5s)
   - Tap "Simulate high usage" → alert with result

3. **Scan screen** (15s)
   - Tap **"Scan home (LiDAR)"**
   - Show LiDAR info (not available in Expo Go)
   - Tap **"Villa A"** sample layout → uploads to backend
   - Alert: "4 rooms created" → navigate to Twin

4. **Twin screen** (10s)
   - Show the 2D top-down map
   - Tap rooms → see devices with power readings

5. **Actions screen** (5s)
   - Show Autopilot vs Manual grouping

### Key Talking Points
- "Same backend, two frontends: web and mobile"
- "LiDAR scanning ready for custom dev client; sample layouts for demo"
- "2 taps to get a floor plan into Horizon"

---

## One-Liner Pitch

> Horizon is an AI-powered digital twin that automatically optimizes your home's energy use.
> Turn on Autopilot, and it monitors, forecasts, and reshapes your schedule — saving kWh,
> money, and CO₂ while keeping you comfortable. Works on web and mobile, with LiDAR scanning
> to import your real floor plan.
