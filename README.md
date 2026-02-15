# Horizon — AI-Powered Home Energy Digital Twin

> Comfort-first energy optimization for UAE smart villas.
> Now with **AI Autopilot**, **Expo mobile app**, **LiDAR scanning**, and a **calm, minimal UI**.

```
  ┌─────────────┐    ┌─────────────┐    ┌──────────────────────────────────────────┐
  │  iOS App     │    │  Expo App   │    │              HORIZON STACK                │
  │  LiDAR Scan  │    │  iOS + Droid│    │  ┌──────────┬──────────┬──────────────┐  │
  │  RoomPlan    │───►│  Autopilot  │───►│  │ Frontend │ Backend  │  ML Engine   │  │
  └─────────────┘    │  Twin View  │    │  │ React+TS │ FastAPI  │  Digital Twin │  │
                     └─────────────┘    │  │ Tailwind │ SQLite   │  Forecasting │  │
                                        │  │ SVG Map  │ WebSocket│  Optimizer   │  │
                                        │  └────┬─────┴────┬─────┴──────┬───────┘  │
                                        │       │          │            │           │
                                        │  ┌────▼──────────▼────────────▼────────┐  │
                                        │  │          SQLite Database              │  │
                                        │  │  homes · rooms · devices · telemetry  │  │
                                        │  │  scenarios · preferences · actions    │  │
                                        │  └──────────────────────────────────────┘  │
                                        └──────────────────────────────────────────┘
```

## What Horizon Does

1. **Digital Twin** — Live/simulated energy state (Home → Rooms → Devices)
2. **AI Autopilot** — Auto-optimizes usage when enabled, reacts to spikes
3. **Forecasting** — Predicts next 24h electricity consumption
4. **Optimization** — Comfort-safe recommendations (pre-cool, shift loads, EV scheduling)
5. **Mobile App** — Expo-powered iOS/Android app with LiDAR scanning + Autopilot controls

### Core Philosophy
- Comfort & convenience first (hard comfort bounds)
- No lifestyle nagging — set preferences once, Horizon optimizes quietly
- AI Autopilot: set it and forget it
- Simple, calm, demo-friendly

---

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 20+
- pip, npm
- (Optional) Expo CLI for mobile: `npm install -g expo-cli`

### 1. Clone & install

```bash
git clone <repo-url> && cd Horizon

# Backend
make install-backend

# Frontend
make install-frontend

# Mobile (optional)
cd mobile/horizon-app && npm install && cd ../..
```

### 2. Create env files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

### 3. Seed the database

```bash
make seed
```

### 4. Run everything

```bash
# Terminal 1: Backend (http://localhost:8000)
make backend

# Terminal 2: Simulator (streams telemetry every 2s)
make simulator

# Terminal 3: Frontend (http://localhost:5173)
make frontend

# Terminal 4 (optional): Mobile app
cd mobile/horizon-app && npx expo start
```

---

## Project Structure

```
Horizon/
├── backend/               FastAPI + SQLAlchemy + WebSocket
│   ├── main.py            App entry point
│   ├── models.py          ORM models (7 tables + autopilot_enabled)
│   ├── routes.py          All API endpoints (incl. /autopilot/toggle, /simulate/spike)
│   ├── schemas.py         Pydantic validation
│   ├── autopilot_state.py Autopilot controller (cooldown, limits, run logic)
│   ├── config.py          Environment config
│   ├── database.py        SQLAlchemy setup
│   ├── ws_manager.py      WebSocket broadcast
│   └── tests/             pytest suite
├── frontend/              React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/         Overview, Twin, Simulator, Actions
│       ├── components/    TopDownMap, AutopilotToggle, KPI cards, charts
│       ├── hooks/         WebSocket hook
│       └── lib/           API client + types
├── mobile/
│   ├── horizon-app/       Expo React Native app (iOS + Android)
│   │   └── src/
│   │       ├── screens/   HomeScreen, TwinScreen, ScanScreen, ActionsScreen
│   │       ├── components/ TopDownMap (react-native-svg)
│   │       ├── services/  API client, LiDAR scan stub
│   │       └── data/      Sample layouts (studio, 1BR, villa)
│   └── ios/               Native iOS LiDAR scanner (Swift/RoomPlan)
├── shared/                Shared TypeScript types
│   └── layoutTypes.ts     LayoutRoom, LayoutHome interfaces
├── ml/                    Forecasting + Optimization + KPIs
├── scripts/               Seed data + telemetry simulator
├── docs/                  Architecture + demo script
├── Makefile               Build targets
└── README.md              This file
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/twin/state` | Current home → rooms → devices snapshot |
| POST | `/twin/update` | Update telemetry + trigger Autopilot if enabled |
| GET | `/forecast?horizon=24` | 24h hourly load forecast |
| POST | `/optimize` | Generate up to 3 comfort-safe actions |
| GET | `/simulate?scenario=normal\|peak\|heatwave` | Baseline vs optimized simulation |
| **POST** | **`/autopilot/toggle`** | **Toggle AI Autopilot on/off for a home** |
| **POST** | **`/simulate/spike`** | **Simulate high usage spike (demo)** |
| GET | `/kpis` | Aggregated savings KPIs |
| GET | `/actions?source=autopilot\|manual` | Action log with source filter |
| GET/PUT | `/preferences` | User preferences (incl. autopilot_enabled) |
| POST | `/layout/import` | Import floor plan from LiDAR/sample |
| GET | `/layout/state` | Layout geometry for map view |
| WS | `/ws/live` | Real-time telemetry broadcast |

---

## AI Autopilot

When enabled, Autopilot:
- Monitors telemetry via `/twin/update`
- Automatically runs the optimizer when conditions are met
- Stores actions with `source: "autopilot"` for clear attribution
- Respects guardrails: max 3 actions/day, 2-minute cooldown between runs
- Always stays within user-defined comfort bounds

Toggle via API: `POST /autopilot/toggle { home_id: 1, enabled: true }`

---

## Mobile App (Expo)

The Expo app provides:
- **Home screen**: Current usage, KPIs, Autopilot toggle, "Simulate high usage"
- **Twin screen**: Top-down 2D map, room selection, device details
- **Scan screen**: LiDAR scan (stub) + 3 predefined sample layouts
- **Actions screen**: Grouped by Autopilot vs Manual source

Run with: `cd mobile/horizon-app && npx expo start`

---

## Limitations (Hackathon Scope)

- Forecasting uses deterministic heuristic (not ML model)
- Single home only (Villa A)
- SQLite (not production-grade)
- No authentication
- LiDAR requires native dev client (falls back to sample layouts in Expo Go)
- Optimization is rule-based

---

## Roadmap

- [x] AI Autopilot mode
- [x] Expo mobile app (iOS + Android)
- [x] LiDAR scan stub + sample layout flow
- [x] Shared 2D top-down map (web + mobile)
- [x] Calm, minimal UI redesign
- [x] Mobile companion app (iOS LiDAR scanner)
- [ ] XGBoost / LSTM forecasting with real data
- [ ] Multi-home support
- [ ] DEWA tariff API integration
- [ ] Real smart home integration (Home Assistant, Matter)
- [ ] Battery storage optimization
