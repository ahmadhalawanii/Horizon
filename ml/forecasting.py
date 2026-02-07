"""
Horizon forecasting module.

Primary: deterministic heuristic based on time-of-day patterns,
rolling averages, and scenario context adjustments.

Resolution: 15-minute intervals internally, aggregated to hourly for API.
"""
import math
from datetime import datetime, timedelta
from typing import Optional


def _time_of_day_factor(hour: float) -> float:
    """UAE villa load profile: peaks around 14:00-17:00 (AC cooling),
    secondary peak 19:00-21:00 (evening activity), low overnight."""
    if 0 <= hour < 6:
        return 0.35
    elif 6 <= hour < 9:
        return 0.55
    elif 9 <= hour < 12:
        return 0.70
    elif 12 <= hour < 15:
        return 0.95
    elif 15 <= hour < 18:
        return 1.0
    elif 18 <= hour < 21:
        return 0.80
    elif 21 <= hour < 23:
        return 0.60
    else:
        return 0.40


def _temp_factor(outside_temp_c: float) -> float:
    """Higher outside temp => more AC load. Baseline at 35C."""
    return max(0.5, min(1.5, outside_temp_c / 35.0))


def _build_baseline_from_scenario(context: dict, n_intervals: int) -> list[float]:
    """Extract or build a 15-min resolution baseline from scenario payload."""
    # If scenario has per-device baselines, aggregate them
    if "devices" in context:
        total = [0.0] * n_intervals
        for dev_name, dev_data in context["devices"].items():
            baseline = dev_data.get("baseline_kw", [])
            for i in range(min(len(baseline), n_intervals)):
                total[i] += baseline[i]
        if any(v > 0 for v in total):
            return total

    # Fallback: generate from heuristic
    return []


def forecast_next_24h(
    load_history: list[dict],
    scenario_context: dict,
    horizon_hours: int = 24,
) -> list[dict]:
    """
    Generate forecast for next horizon_hours.

    Returns list of hourly ForecastPoints with predicted_kw, lower_kw, upper_kw.
    """
    n_15min = horizon_hours * 4  # 15-min intervals

    # Try to use scenario baseline
    scenario_baseline = _build_baseline_from_scenario(scenario_context, n_15min)

    # Compute rolling average from history if available
    history_avg = 0.0
    if load_history:
        powers = [h.get("power_kw", 0) for h in load_history if h.get("power_kw")]
        if powers:
            # Last 4 intervals avg
            recent_4 = powers[-4:] if len(powers) >= 4 else powers
            # Last 12 intervals avg
            recent_12 = powers[-12:] if len(powers) >= 12 else powers
            history_avg = 0.6 * (sum(recent_4) / len(recent_4)) + 0.4 * (sum(recent_12) / len(recent_12))

    # Outside temperature from context
    outside_temps = scenario_context.get("outside_temp_c", [])

    now = datetime.utcnow()
    points_15min = []

    for i in range(n_15min):
        t = now + timedelta(minutes=15 * i)
        hour_frac = t.hour + t.minute / 60.0

        # Base load from scenario or heuristic
        if scenario_baseline and i < len(scenario_baseline):
            base_kw = scenario_baseline[i]
        else:
            # Heuristic: typical UAE villa 3-8 kW range
            base_kw = 3.0 + 5.0 * _time_of_day_factor(hour_frac)

        # Blend with history if available
        if history_avg > 0:
            base_kw = 0.7 * base_kw + 0.3 * history_avg

        # Apply temperature adjustment
        if outside_temps and i < len(outside_temps):
            base_kw *= _temp_factor(outside_temps[i])

        # Small sinusoidal variation for realism
        variation = 0.15 * math.sin(2 * math.pi * i / n_15min + 0.5)
        predicted = max(0.1, base_kw * (1 + variation))

        points_15min.append({
            "ts": t.isoformat(),
            "predicted_kw": round(predicted, 3),
            "lower_kw": round(predicted * 0.85, 3),
            "upper_kw": round(predicted * 1.15, 3),
        })

    # Aggregate to hourly
    hourly = []
    for h in range(horizon_hours):
        chunk = points_15min[h * 4 : (h + 1) * 4]
        avg_pred = sum(p["predicted_kw"] for p in chunk) / len(chunk)
        avg_lower = sum(p["lower_kw"] for p in chunk) / len(chunk)
        avg_upper = sum(p["upper_kw"] for p in chunk) / len(chunk)
        hourly.append({
            "ts": chunk[0]["ts"],
            "predicted_kw": round(avg_pred, 3),
            "lower_kw": round(avg_lower, 3),
            "upper_kw": round(avg_upper, 3),
        })

    return hourly
