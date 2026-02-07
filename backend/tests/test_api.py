"""
Backend API tests for Horizon.

Covers: health, twin state, forecast, optimize, and WebSocket.
"""
import pytest
import json
from datetime import datetime
from fastapi.testclient import TestClient

# Seed the DB before tests
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.main import app
from backend.database import engine, Base, SessionLocal
from scripts.seed import seed

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Create tables and seed data once for all tests."""
    Base.metadata.create_all(bind=engine)
    seed()
    yield
    # Cleanup if needed


class TestHealth:
    def test_health_returns_200(self):
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "service" in data


class TestTwinState:
    def test_twin_state_structure(self):
        resp = client.get("/twin/state")
        assert resp.status_code == 200
        data = resp.json()
        assert "home" in data
        assert data["home"]["name"] == "Villa A"
        assert "rooms" in data
        assert len(data["rooms"]) == 4
        assert "devices_by_room" in data
        # Should have devices in at least some rooms
        total_devices = sum(len(devs) for devs in data["devices_by_room"].values())
        assert total_devices == 5


class TestForecast:
    def test_forecast_returns_24_points(self):
        resp = client.get("/forecast?horizon=24")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 24
        for point in data:
            assert "ts" in point
            assert "predicted_kw" in point
            assert "lower_kw" in point
            assert "upper_kw" in point
            assert point["lower_kw"] <= point["predicted_kw"] <= point["upper_kw"]


class TestOptimize:
    def test_optimize_returns_max_3_actions(self):
        resp = client.post("/optimize", json={"mode": "balanced"})
        assert resp.status_code == 200
        data = resp.json()
        assert "actions" in data
        assert len(data["actions"]) <= 3
        for action in data["actions"]:
            assert "title" in action
            assert "reason" in action
            assert "estimated_kwh_saved" in action
            assert action["estimated_kwh_saved"] >= 0
            assert 0 <= action["confidence"] <= 1

    def test_optimize_respects_comfort_bounds(self):
        resp = client.post("/optimize", json={
            "comfort_min_c": 23.0,
            "comfort_max_c": 25.0,
            "mode": "comfort"
        })
        assert resp.status_code == 200
        data = resp.json()
        # Check that AC action respects comfort bounds
        for action in data["actions"]:
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
        assert len(data["optimized_kw"]) == 24
        assert len(data["deltas_kw"]) == 24

    def test_simulate_unknown_scenario(self):
        resp = client.get("/simulate?scenario=unknown")
        assert resp.status_code == 404


class TestKpis:
    def test_kpis_structure(self):
        resp = client.get("/kpis")
        assert resp.status_code == 200
        data = resp.json()
        assert "kwh_saved" in data
        assert "aed_saved" in data
        assert "co2_avoided" in data
        assert "comfort_compliance" in data
        assert 0 <= data["comfort_compliance"] <= 1


class TestWebSocket:
    def test_ws_receives_telemetry(self):
        with client.websocket_connect("/ws/live") as ws:
            # Post a telemetry update
            update = {
                "device_id": 1,
                "ts": datetime.utcnow().isoformat(),
                "power_kw": 2.5,
                "temp_c": 35.0,
                "status": "on"
            }
            resp = client.post("/twin/update", json=update)
            assert resp.status_code == 200

            # Should receive the broadcast
            data = ws.receive_json()
            assert data["type"] == "telemetry_update"
            assert data["device_id"] == 1
            assert data["power_kw"] == 2.5


class TestActions:
    def test_actions_after_optimize(self):
        # First run optimize to create some actions
        client.post("/optimize", json={"mode": "balanced"})
        resp = client.get("/actions")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) > 0
        for action in data:
            assert "title" in action
            assert "ts" in action
