"""
Horizon optimization & recommendation engine.

Comfort-first philosophy:
- Comfort bounds are HARD constraints.
- No lifestyle nagging.
- At most 3 actions per 24h horizon.
- Pre-cool, shift flexible loads, optimize EV charging schedule.
"""
import math
from datetime import datetime, timedelta
from typing import Any


# ─── Mode weights ─────────────────────────────────────────
MODE_WEIGHTS = {
    "comfort": {"energy": 0.2, "co2": 0.1, "peak": 0.1, "discomfort": 0.6},
    "balanced": {"energy": 0.35, "co2": 0.2, "peak": 0.2, "discomfort": 0.25},
    "saver": {"energy": 0.5, "co2": 0.2, "peak": 0.2, "discomfort": 0.1},
}

DEVICE_ACTIONS = {
    "ac": {
        "title": "Smart Pre-Cool Schedule",
        "reason": "Pre-cool rooms before peak tariff hours (14:00-17:00) then coast on thermal mass, staying within your comfort band.",
        "base_kwh_saved": 2.8,
        "confidence": 0.88,
        "action": {"type": "ac_precool", "precool_to_c": None, "peak_setpoint_c": None, "start": "11:00", "end": "14:00"},
    },
    "ev_charger": {
        "title": "Shift EV Charging to Off-Peak",
        "reason": "Move EV charging from evening peak to overnight low-tariff window while ensuring target SOC by departure.",
        "base_kwh_saved": 3.5,
        "confidence": 0.92,
        "action": {"type": "ev_shift", "new_start": "23:00", "new_end": None, "target_soc": None},
    },
    "water_heater": {
        "title": "Pre-Heat Water Before Peak",
        "reason": "Heat water during cheaper morning hours, coast on tank insulation through peak period.",
        "base_kwh_saved": 1.5,
        "confidence": 0.85,
        "action": {"type": "water_preheat", "heat_start": "05:00", "heat_end": "07:00"},
    },
    "washer_dryer": {
        "title": "Delay Laundry Cycle",
        "reason": "Shift washer/dryer to off-peak window within your allowed flexibility to reduce peak demand.",
        "base_kwh_saved": 1.0,
        "confidence": 0.90,
        "action": {"type": "washer_shift", "new_start": "22:00"},
    },
}


def generate_recommendations(
    constraints: dict,
    scenario_context: dict,
    settings: Any,
) -> list[dict]:
    """Generate up to 3 comfort-safe optimization recommendations."""
    mode = constraints.get("mode", "balanced")
    weights = MODE_WEIGHTS.get(mode, MODE_WEIGHTS["balanced"])
    comfort_min = constraints.get("comfort_min_c", 22.0)
    comfort_max = constraints.get("comfort_max_c", 26.0)
    ev_departure = constraints.get("ev_departure_time", "07:30")
    ev_soc = constraints.get("ev_target_soc", 80.0)
    max_shift = constraints.get("max_shift_minutes", 120)
    tariff = settings.TARIFF_AED_PER_KWH
    emission = settings.EMISSION_FACTOR_KG_PER_KWH

    actions = []

    # 1) AC Pre-Cool action
    ac = DEVICE_ACTIONS["ac"].copy()
    ac["action"] = ac["action"].copy()
    # Precool to comfort_min, coast up to comfort_max
    ac["action"]["precool_to_c"] = comfort_min
    ac["action"]["peak_setpoint_c"] = comfort_max
    # Mode affects savings aggressiveness
    multiplier = 0.7 if mode == "comfort" else (1.0 if mode == "balanced" else 1.3)
    kwh = round(ac["base_kwh_saved"] * multiplier, 2)
    ac["estimated_kwh_saved"] = kwh
    ac["estimated_aed_saved"] = round(kwh * tariff, 2)
    ac["estimated_co2_saved"] = round(kwh * emission, 2)
    ac["confidence"] = min(0.95, ac["confidence"] + (0.05 if mode == "saver" else 0))
    actions.append(ac)

    # 2) EV Charging Shift
    ev = DEVICE_ACTIONS["ev_charger"].copy()
    ev["action"] = ev["action"].copy()
    ev["action"]["target_soc"] = ev_soc
    ev["action"]["new_end"] = ev_departure
    kwh_ev = round(ev["base_kwh_saved"] * multiplier, 2)
    ev["estimated_kwh_saved"] = kwh_ev
    ev["estimated_aed_saved"] = round(kwh_ev * tariff, 2)
    ev["estimated_co2_saved"] = round(kwh_ev * emission, 2)
    actions.append(ev)

    # 3) Choose water heater or washer shift based on mode
    if mode == "saver":
        # Both
        wh = DEVICE_ACTIONS["water_heater"].copy()
        wh["action"] = wh["action"].copy()
        kwh_wh = round(wh["base_kwh_saved"] * multiplier, 2)
        wh["estimated_kwh_saved"] = kwh_wh
        wh["estimated_aed_saved"] = round(kwh_wh * tariff, 2)
        wh["estimated_co2_saved"] = round(kwh_wh * emission, 2)
        actions.append(wh)
    else:
        # Water heater pre-heat (less intrusive)
        wh = DEVICE_ACTIONS["water_heater"].copy()
        wh["action"] = wh["action"].copy()
        kwh_wh = round(wh["base_kwh_saved"] * multiplier, 2)
        wh["estimated_kwh_saved"] = kwh_wh
        wh["estimated_aed_saved"] = round(kwh_wh * tariff, 2)
        wh["estimated_co2_saved"] = round(kwh_wh * emission, 2)
        actions.append(wh)

    # Sort by estimated impact, take top 3
    actions.sort(key=lambda a: a["estimated_kwh_saved"], reverse=True)
    return actions[:3]


def simulate_scenario(
    payload: dict,
    constraints: dict,
    settings: Any,
) -> dict:
    """
    Simulate baseline vs optimized load for a scenario.

    Returns 24h hourly data: ts[], baseline_kw[], optimized_kw[], deltas_kw[].
    """
    n_intervals = 96  # 24h at 15-min resolution
    mode = constraints.get("mode", "balanced")
    comfort_min = constraints.get("comfort_min_c", 22.0)
    comfort_max = constraints.get("comfort_max_c", 26.0)

    # Build baseline from scenario
    baseline_15m = [0.0] * n_intervals
    devices = payload.get("devices", {})
    for dev_name, dev_data in devices.items():
        bl = dev_data.get("baseline_kw", [])
        for i in range(min(len(bl), n_intervals)):
            baseline_15m[i] += bl[i]

    # If no device data, generate heuristic baseline
    if all(v == 0 for v in baseline_15m):
        for i in range(n_intervals):
            hour = (i * 15) / 60.0
            baseline_15m[i] = 3.0 + 5.0 * _tod_factor(hour)

    # Generate optimized profile
    optimized_15m = _optimize_profile(baseline_15m, devices, constraints, settings)

    # Aggregate to hourly
    now = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
    ts_list = []
    baseline_hourly = []
    optimized_hourly = []
    deltas_hourly = []

    for h in range(24):
        t = now + timedelta(hours=h)
        ts_list.append(t.isoformat())
        chunk_b = baseline_15m[h * 4: (h + 1) * 4]
        chunk_o = optimized_15m[h * 4: (h + 1) * 4]
        avg_b = sum(chunk_b) / max(len(chunk_b), 1)
        avg_o = sum(chunk_o) / max(len(chunk_o), 1)
        baseline_hourly.append(round(avg_b, 3))
        optimized_hourly.append(round(avg_o, 3))
        deltas_hourly.append(round(avg_b - avg_o, 3))

    return {
        "ts": ts_list,
        "baseline_kw": baseline_hourly,
        "optimized_kw": optimized_hourly,
        "deltas_kw": deltas_hourly,
    }


def _tod_factor(hour: float) -> float:
    """Time-of-day load factor for UAE villa."""
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


def _optimize_profile(
    baseline: list[float],
    devices: dict,
    constraints: dict,
    settings: Any,
) -> list[float]:
    """
    Apply optimization rules to baseline profile.

    Rules applied:
    1) AC pre-cool: increase load slightly before peak, reduce during peak
    2) EV shift: move evening EV load to overnight
    3) Water heater: shift to early morning
    """
    n = len(baseline)
    optimized = baseline.copy()
    mode = constraints.get("mode", "balanced")

    # Reduction factors by mode
    peak_reduction = {"comfort": 0.08, "balanced": 0.15, "saver": 0.22}
    red = peak_reduction.get(mode, 0.15)

    # Pre-cool effect: increase load at intervals 44-51 (11:00-12:45), reduce 56-71 (14:00-17:45)
    precool_increase = red * 0.4
    for i in range(44, min(52, n)):
        optimized[i] = baseline[i] * (1 + precool_increase)
    for i in range(56, min(72, n)):
        optimized[i] = baseline[i] * (1 - red)

    # EV shift: move load from intervals 72-83 (18:00-20:45) to 92-96+0-3 (23:00-00:45)
    if "ev_charger" in devices:
        ev_bl = devices["ev_charger"].get("baseline_kw", [])
        for i in range(72, min(84, n)):
            if i < len(ev_bl):
                removed = ev_bl[i] * 0.9
                optimized[i] -= removed
                # Add to overnight
                target = (i - 72 + 92) % n
                if target < n:
                    optimized[target] += removed * 0.85  # charging efficiency

    # Water heater: shift from peak to early morning
    if "water_heater" in devices:
        wh_bl = devices["water_heater"].get("baseline_kw", [])
        for i in range(56, min(68, n)):
            if i < len(wh_bl):
                removed = wh_bl[i] * 0.7
                optimized[i] -= removed
                target = (i - 56 + 20)  # 05:00 start
                if target < n:
                    optimized[target] += removed * 0.9

    # Ensure no negative values
    optimized = [max(0.1, v) for v in optimized]

    return optimized
