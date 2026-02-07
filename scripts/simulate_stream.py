"""
Telemetry simulator: streams realistic device data via POST /twin/update.

Usage:
    python -m scripts.simulate_stream --scenario normal --interval 2
"""
import argparse
import json
import math
import random
import sys
import os
import time
from datetime import datetime, timedelta

import httpx

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


API_BASE = os.environ.get("API_BASE", "http://localhost:8000")

DEVICE_IDS = {
    "ac_living": 1,
    "ac_bedroom": 2,
    "water_heater": 3,
    "washer_dryer": 4,
    "ev_charger": 5,
}


def load_scenario(scenario_name: str) -> dict:
    """Load scenario from the backend API."""
    try:
        resp = httpx.get(f"{API_BASE}/simulate?scenario={scenario_name}", timeout=10)
        if resp.status_code == 200:
            return resp.json()
    except Exception:
        pass

    # Fallback: load from DB directly
    from backend.database import SessionLocal
    from backend.models import Scenario
    db = SessionLocal()
    sc = db.query(Scenario).filter(Scenario.name == scenario_name).first()
    if sc:
        return json.loads(sc.payload_json)
    db.close()
    return {}


def stream_telemetry(scenario_name: str, interval: float, demo_mode: bool = False):
    """Stream simulated telemetry to the backend."""
    if demo_mode:
        random.seed(42)

    print(f"Horizon Telemetry Simulator")
    print(f"  Scenario : {scenario_name}")
    print(f"  Interval : {interval}s")
    print(f"  API      : {API_BASE}")
    print(f"  Press Ctrl+C to stop\n")

    # Load scenario payload from DB
    from backend.database import SessionLocal
    from backend.models import Scenario
    db = SessionLocal()
    sc = db.query(Scenario).filter(Scenario.name == scenario_name).first()
    if not sc:
        print(f"ERROR: Scenario '{scenario_name}' not found. Run `make seed` first.")
        sys.exit(1)

    payload = json.loads(sc.payload_json)
    db.close()

    devices = payload.get("devices", {})
    outside_temps = payload.get("outside_temp_c", [])

    step = 0
    n_intervals = 96  # 24h at 15-min

    client = httpx.Client(timeout=5)

    try:
        while True:
            idx = step % n_intervals
            now = datetime.utcnow()

            for dev_name, dev_data in devices.items():
                device_id = dev_data.get("device_id")
                if not device_id:
                    continue

                baseline = dev_data.get("baseline_kw", [])
                if idx >= len(baseline):
                    continue

                # Base value + random noise (±5%)
                base_kw = baseline[idx]
                noise = random.uniform(-0.05, 0.05) * base_kw
                power_kw = round(max(0, base_kw + noise), 3)

                # Status based on power
                status = "on" if power_kw > 0.05 else "off"

                # Temperature for ACs
                temp_c = None
                if "ac" in dev_name and outside_temps and idx < len(outside_temps):
                    temp_c = round(outside_temps[idx] + random.uniform(-1, 1), 1)

                body = {
                    "device_id": device_id,
                    "ts": now.isoformat(),
                    "power_kw": power_kw,
                    "temp_c": temp_c,
                    "status": status,
                }

                try:
                    resp = client.post(f"{API_BASE}/twin/update", json=body)
                    symbol = "." if resp.status_code == 200 else "!"
                except Exception as e:
                    symbol = "x"

                print(f"  [{now.strftime('%H:%M:%S')}] {dev_name:15s} → {power_kw:6.3f} kW  {status:6s} {symbol}")

            step += 1
            print(f"  --- step {step}, interval idx {idx}/{n_intervals} ---")
            time.sleep(interval)

    except KeyboardInterrupt:
        print("\nSimulator stopped.")
    finally:
        client.close()


def main():
    parser = argparse.ArgumentParser(description="Horizon Telemetry Simulator")
    parser.add_argument("--scenario", default="normal", choices=["normal", "peak", "heatwave"])
    parser.add_argument("--interval", type=float, default=2.0, help="Seconds between updates")
    parser.add_argument("--demo", action="store_true", help="Use fixed random seed")
    args = parser.parse_args()

    stream_telemetry(args.scenario, args.interval, args.demo)


if __name__ == "__main__":
    main()
