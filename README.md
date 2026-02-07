# Horizon — AI-Powered Home Energy Digital Twin

> Comfort-first energy optimization for UAE smart villas. Built for hackathon demo.
> Now with **iPhone LiDAR scanning** and **3D digital twin visualization**.

```
  ┌─────────────┐    ┌──────────────────────────────────────────┐
  │  iOS App     │    │              HORIZON STACK                │
  │  LiDAR Scan  │───►│  ┌──────────┬──────────┬──────────────┐  │
  │  RoomPlan    │    │  │ Frontend │ Backend  │  ML Engine   │  │
  └─────────────┘    │  │ React+TS │ FastAPI  │  Digital Twin │  │
                     │  │ Three.js │ SQLite   │  Forecasting │  │
                     │  │ Tailwind │ WebSocket│  Optimizer   │  │
                     │  └────┬─────┴────┬─────┴──────┬───────┘  │
                     │       │          │            │           │
                     │  ┌────▼──────────▼────────────▼────────┐  │
                     │  │          SQLite Database              │  │
                     │  │  homes · rooms (+ geometry) · devices │  │
                     │  │  telemetry · scenarios · preferences  │  │
                     │  └──────────────────────────────────────┘  │
                     └──────────────────────────────────────────┘
```

## What Horizon Does

1. **Digital Twin** — Shows live/simulated energy state (Home → Rooms → Devices)
2. **Forecasting** — Predicts next 24h electricity consumption
3. **Optimization** — Provides comfort-safe recommendations (pre-cool, shift loads, EV scheduling)
4. **Impact Comparison** — Baseline vs optimized in kWh, AED, CO₂, and comfort compliance

### Core Philosophy
- Comfort & convenience first (hard comfort bounds)
- No lifestyle nagging — set preferences once, Horizon optimizes quietly
- Simple, deterministic, easy to demo live

---

## Quickstart

### Prerequisites
- Python 3.11+
- Node.js 20+
- pip, npm

### 1. Clone & install

```bash
git clone <repo-url> && cd Horizon

# Install Python dependencies
make install-backend

# Install Node dependencies
make install-frontend
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
```

Or run all at once:
```bash
make all
```

### 5. Demo mode (recommended for judges)
```bash
make demo
```

---

## Project Structure

```
Horizon/
├── backend/           FastAPI + SQLAlchemy + WebSocket
│   ├── main.py        App entry point
│   ├── models.py      ORM models (7 tables)
│   ├── routes.py      All API endpoints
│   ├── schemas.py     Pydantic validation
│   ├── config.py      Environment config
│   ├── database.py    SQLAlchemy setup
│   ├── ws_manager.py  WebSocket broadcast
│   └── tests/         pytest suite
├── frontend/          React + Vite + TypeScript + Tailwind
│   └── src/
│       ├── pages/     Overview, Console, Simulator, Actions
│       ├── components/ KPI cards, charts, device cards
│       ├── hooks/     WebSocket hook
│       └── lib/       API client + types
├── ml/                Forecasting + Optimization + KPIs
│   ├── forecasting.py Heuristic time-of-day model
│   ├── optimizer.py   Comfort-constrained optimizer
│   └── kpi.py         KPI computation utilities
├── scripts/           Seed data + telemetry simulator
│   ├── seed.py        Database seeding (Villa A + scenarios)
│   └── simulate_stream.py  Live telemetry streamer
├── docs/              Architecture + demo script
├── Makefile           Build targets
└── README.md          This file
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/twin/state` | Current home → rooms → devices snapshot |
| POST | `/twin/update` | Update device telemetry + broadcast via WS |
| GET | `/forecast?horizon=24` | 24h hourly load forecast |
| POST | `/optimize` | Generate up to 3 comfort-safe actions |
| GET | `/simulate?scenario=normal\|peak\|heatwave` | Baseline vs optimized simulation |
| GET | `/kpis` | Aggregated savings KPIs |
| GET | `/actions` | Action/recommendation log |
| GET/PUT | `/preferences` | User comfort preferences |
| WS | `/ws/live` | Real-time telemetry broadcast |

---

## Frontend Pages

1. **Overview** — KPI strip, 24h forecast chart, carbon window, "Dispatch AI Plan" button
2. **Digital Twin Console** — Room tree, device cards with sparklines, preference editor, recommendations
3. **Impact Simulator** — Scenario selector, baseline vs optimized chart, delta cards, Judge Mode
4. **Action Log** — Filterable timeline of AI actions with JSON/CSV export

---

## Running Tests

```bash
# Backend tests (10 tests)
python -m pytest backend/tests/ -v

# Frontend type check
cd frontend && npm run typecheck
```

---

## Judge Mode (60–90s demo flow)

1. Open **Overview** → see KPIs, forecast, carbon window
2. Click **"Dispatch AI Plan"** → see toast with savings summary
3. Navigate to **Impact Simulator** → click **"Judge Mode"**
4. Watch: auto-selects peak, runs optimizer, animates curves, shows delta cards
5. Navigate to **Digital Twin Console** → adjust comfort band, click "Generate Recommendations"
6. Navigate to **Action Log** → filter by device, export CSV

---

## Environment Variables

### Backend (`backend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `DB_URL` | `sqlite:///./horizon.db` | Database connection |
| `TARIFF_AED_PER_KWH` | `0.38` | Electricity tariff |
| `EMISSION_FACTOR_KG_PER_KWH` | `0.45` | Carbon emission factor |
| `DEMO_MODE` | `true` | Fixed random seed for reproducibility |

### Frontend (`frontend/.env`)
| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API URL |
| `VITE_WS_URL` | `ws://localhost:8000/ws/live` | WebSocket URL |

---

## iPhone LiDAR Scanning

Horizon includes a companion iOS app that uses Apple's RoomPlan API to scan your home:

1. Open **Horizon Scanner** on a LiDAR-enabled iPhone (12 Pro+)
2. Tap **Start Scan** and walk around a room
3. Review the detected walls and furniture
4. Tap **Send to Horizon** to upload the layout
5. Open the web app — the **3D digital twin view** appears automatically

No LiDAR? Tap **Use Sample Scan** for a pre-built Villa A layout.

See `/docs/mobile_lidar.md` for full setup instructions.

---

## 3D Digital Twin View

The Console page now includes a **Sims-like 3D top-down view** of the home:
- Floor plans rendered from room polygon geometry
- Walls extruded to room height
- Furniture shown as semi-transparent blocks
- Device markers (AC ❄, EV ⚡, Water ♨, Washer ◎) with status glow
- Click a room to select it and filter the device list
- Pan, zoom, and rotate with mouse/touch controls

Works on both desktop and mobile browsers.

---

## Mobile-Friendly Design

The web app is fully responsive:
- **Desktop**: Left sidebar navigation, 3-column Console layout
- **Mobile (<768px)**: Bottom tab navigation, stacked layout
- Touch-friendly buttons (44px minimum), swipeable charts
- 3D view adapts to screen size

---

## Limitations (Hackathon Scope)

- Forecasting uses deterministic heuristic (not ML model)
- Single home only (Villa A)
- SQLite (not production-grade)
- No authentication
- No real tariff API integration
- Optimization is rule-based, not true mathematical optimization
- iOS app requires LiDAR-enabled iPhone (demo mode available without)

## Roadmap

- [ ] XGBoost / LSTM forecasting model with real training data
- [ ] Multi-home support
- [ ] DEWA tariff API integration
- [ ] Real smart home integration (Home Assistant, Matter)
- [x] Mobile companion app (iOS LiDAR scanner)
- [x] 3D digital twin visualization
- [x] Responsive mobile web design
- [ ] Battery storage optimization
- [ ] Multi-room LiDAR scanning in a single session
