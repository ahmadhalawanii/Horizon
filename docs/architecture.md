# Horizon Architecture

## System Overview

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │◄───►│   Backend    │◄───►│  ML Engine   │
│  React/Vite  │     │   FastAPI    │     │  Python lib  │
│  TypeScript  │     │   SQLAlchemy │     │              │
│  Tailwind    │     │   WebSocket  │     │  Forecasting │
│  Recharts    │     │              │     │  Optimizer   │
│  React Query │     │              │     │  KPI Utils   │
└──────┬───────┘     └──────┬───────┘     └──────────────┘
       │                    │
       │  HTTP/WS           │  SQLite
       │  :5173 ──► :8000   │
       │                    ▼
       │             ┌──────────────┐
       │             │   SQLite DB  │
       └─────────────┤  horizon.db  │
                     └──────────────┘
```

## Data Flow

### Real-time Telemetry
```
Simulator ──POST /twin/update──► Backend ──WS broadcast──► Frontend
                                    │
                                    ▼
                              SQLite (telemetry table)
```

### Optimization Flow
```
User clicks "Dispatch AI Plan"
    │
    ▼
Frontend ──POST /optimize──► Backend
                                │
                                ├── Load user_preferences
                                ├── Load scenario context
                                ├── Call ml.optimizer.generate_recommendations()
                                ├── Save to recommendations table
                                │
                                ▼
                        Return top 3 actions
```

### Simulation Flow
```
Frontend ──GET /simulate?scenario=peak──► Backend
                                            │
                                            ├── Load scenario payload_json
                                            ├── Build baseline from device profiles
                                            ├── Apply optimization rules
                                            ├── Aggregate 15-min → hourly
                                            │
                                            ▼
                                    Return {ts[], baseline_kw[], optimized_kw[], deltas_kw[]}
```

## Database Schema

| Table | Purpose | Key Fields |
|-------|---------|------------|
| homes | Villa/home entities | id, name |
| rooms | Rooms within a home | id, home_id, name |
| devices | Smart devices | id, room_id, type, status, power_kw, setpoint |
| telemetry | Time-series device data | device_id, ts, power_kw, temp_c |
| recommendations | AI-generated actions | title, reason, impacts, confidence |
| scenarios | Simulation profiles | name, payload_json (96 intervals per device) |
| user_preferences | Comfort constraints | comfort_min/max_c, ev settings, mode |

## Optimization Rules

1. **AC Pre-Cool**: Increase cooling before peak hours, coast on thermal mass during peak
2. **EV Charging Shift**: Move from evening peak to overnight off-peak
3. **Water Heater Pre-Heat**: Heat water in cheap morning hours, coast through peak
4. **Washer Delay**: Shift flexible loads to off-peak within max_shift_minutes

### Mode Weights
| Mode | Energy | CO₂ | Peak | Discomfort |
|------|--------|-----|------|------------|
| Comfort | 0.20 | 0.10 | 0.10 | 0.60 |
| Balanced | 0.35 | 0.20 | 0.20 | 0.25 |
| Saver | 0.50 | 0.20 | 0.20 | 0.10 |

## Scenario Profiles

Each scenario provides 96 intervals (24h × 4 per hour) of:
- Per-device baseline power (kW)
- Outside temperature (°C)
- Occupancy factor (0–1)

| Scenario | Base Temp | AC Peak | Description |
|----------|-----------|---------|-------------|
| Normal | 34°C | ~3.2 kW | Typical UAE summer day |
| Peak | 38°C | ~4.3 kW | Hot afternoon, high occupancy |
| Heatwave | 42°C | ~5.5 kW | Extreme sustained heat |
