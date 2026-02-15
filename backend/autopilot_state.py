"""
In-memory Autopilot state tracking and helpers.

Keeps lightweight state per-home so we can enforce cooldowns and
daily action limits without extra DB tables.
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from backend.models import Recommendation, UserPreference, Scenario
from backend.config import get_settings

logger = logging.getLogger("horizon.autopilot")

# ─── In-memory state per home ─────────────────────────────
_autopilot_state: dict[int, dict] = {}

AUTOPILOT_COOLDOWN_SECONDS = 120  # 2 min between runs (hackathon-friendly)
AUTOPILOT_MAX_ACTIONS_PER_DAY = 3


def _get_home_state(home_id: int) -> dict:
    if home_id not in _autopilot_state:
        _autopilot_state[home_id] = {
            "last_run_ts": None,
            "actions_today": 0,
            "actions_today_date": None,
        }
    state = _autopilot_state[home_id]
    # Reset daily counter
    today = datetime.utcnow().date()
    if state["actions_today_date"] != today:
        state["actions_today"] = 0
        state["actions_today_date"] = today
    return state


def can_run_autopilot(home_id: int) -> tuple[bool, str]:
    """Check if autopilot is allowed to run for this home."""
    state = _get_home_state(home_id)

    # Check daily limit
    if state["actions_today"] >= AUTOPILOT_MAX_ACTIONS_PER_DAY:
        return False, f"Daily limit reached ({AUTOPILOT_MAX_ACTIONS_PER_DAY} actions)"

    # Check cooldown
    if state["last_run_ts"]:
        elapsed = (datetime.utcnow() - state["last_run_ts"]).total_seconds()
        if elapsed < AUTOPILOT_COOLDOWN_SECONDS:
            remaining = int(AUTOPILOT_COOLDOWN_SECONDS - elapsed)
            return False, f"Cooldown active ({remaining}s remaining)"

    return True, "ok"


def run_autopilot_for_home(home_id: int, db: Session) -> list[dict]:
    """
    Run the optimizer for a home and store results as autopilot actions.
    Returns list of generated action dicts.
    """
    from ml.optimizer import generate_recommendations

    settings = get_settings()
    pref = db.query(UserPreference).filter(
        UserPreference.home_id == home_id
    ).first()
    if not pref:
        logger.warning(f"No preferences for home {home_id}, skipping autopilot")
        return []

    constraints = {
        "comfort_min_c": pref.comfort_min_c,
        "comfort_max_c": pref.comfort_max_c,
        "ev_departure_time": pref.ev_departure_time,
        "ev_target_soc": pref.ev_target_soc,
        "max_shift_minutes": pref.max_shift_minutes,
        "mode": pref.mode,
    }

    scenario = db.query(Scenario).filter(Scenario.name == "normal").first()
    context = json.loads(scenario.payload_json) if scenario else {}

    actions = generate_recommendations(constraints, context, settings)

    # Store with source = "autopilot"
    for a in actions:
        rec = Recommendation(
            ts=datetime.utcnow(),
            title=a["title"],
            reason=a["reason"],
            estimated_kwh_saved=a["estimated_kwh_saved"],
            estimated_aed_saved=a["estimated_aed_saved"],
            estimated_co2_saved=a["estimated_co2_saved"],
            confidence=a["confidence"],
            action_json=json.dumps(a.get("action", {})),
            source="autopilot",
        )
        db.add(rec)
    db.commit()

    # Update in-memory state
    state = _get_home_state(home_id)
    state["last_run_ts"] = datetime.utcnow()
    state["actions_today"] += 1

    logger.info(
        f"Autopilot ran for home {home_id}: {len(actions)} actions generated "
        f"(run #{state['actions_today']} today)"
    )
    return actions


def create_spike_scenario(scenario_name: str = "peak") -> dict:
    """
    Create an artificial high-usage spike for demo purposes.
    Returns a dict with boosted device baselines.
    """
    # Multipliers by scenario
    multipliers = {
        "normal": 1.3,
        "peak": 1.8,
        "heatwave": 2.2,
    }
    mult = multipliers.get(scenario_name, 1.8)

    # Base device loads (kW) for a typical UAE villa
    base_devices = {
        "ac_living": 3.5,
        "ac_bedroom": 2.8,
        "ev_charger": 7.0,
        "water_heater": 4.5,
        "washer_dryer": 2.0,
    }

    spiked = {k: round(v * mult, 2) for k, v in base_devices.items()}
    total_baseline = sum(spiked.values())

    return {
        "scenario": scenario_name,
        "multiplier": mult,
        "spiked_loads": spiked,
        "total_baseline_kw": round(total_baseline, 2),
    }
