"""
Backend API tests for Horizon — tests the digital twin model integration.
"""
import pytest
import json
from datetime import datetime
from fastapi.testclient import TestClient

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app
from backend.database import engine, Base, SessionLocal
from backend.twin_engine import initialize_twin
from scripts.seed import seed

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    Base.metadata.create_all(bind=engine)
    seed()
    # Initialize the digital twin model (lifespan doesn't run in TestClient)
    db = SessionLocal()
    initialize_twin(db)
    db.close()
    yield


class TestHealth:
    def test_health_returns_200_with_twin_status(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "twin_active" in data


class TestTwinState:
    def test_twin_state_has_computed_fields(self):
        resp = client.get("/twin/state")
        assert resp.status_code == 200
        data = resp.json()

        # Must have twin-computed structure, NOT raw DB rows
        assert "timestamp" in data
        assert "home_name" in data
        assert data["home_name"] == "Villa A"

        # Environment (twin-computed)
        assert "environment" in data
        assert "outside_temp_c" in data["environment"]
        assert "solar_irradiance_w_m2" in data["environment"]

        # Rooms with thermal state
        assert "rooms" in data
        assert len(data["rooms"]) == 4
        for room in data["rooms"]:
            assert "current_temp_c" in room
            assert "temp_trend_c_per_hour" in room
            assert "comfort_status" in room
            assert "humidity_pct" in room
            assert room["comfort_status"] in ["comfortable", "warm", "cool", "out_of_band"]

        # Devices with physics-computed fields
        assert "devices" in data
        assert len(data["devices"]) == 5
        for dev in data["devices"]:
            assert "device_id" in dev
            assert "type" in dev
            assert "power_kw" in dev

        # Energy accumulator
        assert "energy" in data
        assert "current_power_kw" in data["energy"]
        assert "total_energy_kwh" in data["energy"]

        # Comfort summary
        assert "comfort_summary" in data
        assert "compliance_pct" in data["comfort_summary"]

        # Twin metadata
        assert "twin_step_count" in data

    def test_twin_state_ac_has_cop_and_thermal(self):
        resp = client.get("/twin/state")
        data = resp.json()
        ac_devices = [d for d in data["devices"] if d["type"] == "ac"]
        assert len(ac_devices) == 2
        for ac in ac_devices:
            assert "cop" in ac
            assert "compressor_load_pct" in ac
            assert "cooling_output_kw" in ac
            assert "setpoint_c" in ac
            assert "room_temp_c" in ac

    def test_twin_state_ev_has_soc(self):
        resp = client.get("/twin/state")
        data = resp.json()
        ev = [d for d in data["devices"] if d["type"] == "ev_charger"]
        assert len(ev) == 1
        assert "soc_pct" in ev[0]
        assert "battery_capacity_kwh" in ev[0]
        assert ev[0]["soc_pct"] >= 0

    def test_twin_state_water_heater_has_temp(self):
        resp = client.get("/twin/state")
        data = resp.json()
        wh = [d for d in data["devices"] if d["type"] == "water_heater"]
        assert len(wh) == 1
        assert "water_temp_c" in wh[0]
        assert "target_temp_c" in wh[0]
        assert wh[0]["water_temp_c"] > 0


class TestTwinUpdate:
    def test_update_advances_twin_model(self):
        # Get initial state
        resp1 = client.get("/twin/state")
        initial_steps = resp1.json()["twin_step_count"]

        # Send telemetry
        update = {
            "device_id": 1,
            "ts": datetime.utcnow().isoformat(),
            "power_kw": 2.5,
            "temp_c": 38.0,
            "status": "on",
        }
        resp = client.post("/twin/update", json=update)
        assert resp.status_code == 200

        # Twin should have stepped
        resp2 = client.get("/twin/state")
        new_steps = resp2.json()["twin_step_count"]
        assert new_steps > initial_steps


class TestForecast:
    def test_forecast_returns_24_points(self):
        resp = client.get("/forecast?horizon=24")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 24
        for point in data:
            assert point["lower_kw"] <= point["predicted_kw"] <= point["upper_kw"]


class TestOptimize:
    def test_optimize_returns_max_3_actions(self):
        resp = client.post("/optimize", json={"mode": "balanced"})
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["actions"]) <= 3
        for action in data["actions"]:
            assert action["estimated_kwh_saved"] >= 0
            assert 0 <= action["confidence"] <= 1

    def test_optimize_respects_comfort_bounds(self):
        resp = client.post("/optimize", json={
            "comfort_min_c": 23.0,
            "comfort_max_c": 25.0,
            "mode": "comfort",
        })
        assert resp.status_code == 200
        for action in resp.json()["actions"]:
            if action.get("action", {}).get("type") == "ac_precool":
                assert action["action"]["precool_to_c"] >= 23.0
                assert action["action"]["peak_setpoint_c"] <= 25.0


class TestSimulate:
    def test_simulate_normal(self):
        resp = client.get("/simulate?scenario=normal")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["ts"]) == 24
        assert len(data["baseline_kw"]) == 24

    def test_simulate_unknown_scenario(self):
        resp = client.get("/simulate?scenario=unknown")
        assert resp.status_code == 404


class TestKpis:
    def test_kpis_structure(self):
        resp = client.get("/kpis")
        assert resp.status_code == 200
        data = resp.json()
        assert 0 <= data["comfort_compliance"] <= 1


class TestWebSocket:
    def test_ws_receives_twin_enriched_update(self):
        with client.websocket_connect("/ws/live") as ws:
            update = {
                "device_id": 1,
                "ts": datetime.utcnow().isoformat(),
                "power_kw": 2.5,
                "temp_c": 37.0,
                "status": "on",
            }
            resp = client.post("/twin/update", json=update)
            assert resp.status_code == 200

            data = ws.receive_json()
            assert data["type"] == "telemetry_update"
            assert data["device_id"] == 1
            # Should include twin-computed fields
            assert "twin_computed" in data


class TestActions:
    def test_actions_after_optimize(self):
        client.post("/optimize", json={"mode": "balanced"})
        resp = client.get("/actions")
        assert resp.status_code == 200
        assert len(resp.json()) > 0
