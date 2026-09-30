"""
Telemetry & Benchmark Module for CTMARS.

Provides hardware-calibrated energy consumption, carbon footprint, and
single-agent baseline estimation so the engine can compare multi-agent
deliberation against an equivalent single-agent run.

All calculations are pure arithmetic — no I/O, no mocking, no artificial
delays.  Designed to add < 1 ms of overhead to any engine run.

Reference: TASK_BENCHMARK.md §2 (Mathematical Formulation).
"""

from __future__ import annotations


# ---------------------------------------------------------------------------
# Hardware energy profiles (Watt-hours per token)
# ---------------------------------------------------------------------------

ENERGY_COEFFICIENTS: dict[str, dict[str, float]] = {
    "groq": {"prompt_wh": 0.00018, "gen_wh": 0.00045},
    "openai": {"prompt_wh": 0.00030, "gen_wh": 0.00085},
}

# Fixed energy cost of a single web-search request (Wh)
SEARCH_ENERGY_WH: float = 0.30

# Host machine idle-ish power draw used for wall-clock overhead (Watts)
HOST_POWER_WATTS: float = 15.0


# ---------------------------------------------------------------------------
# Regional datacenter grid carbon intensities (gCO2eq per kWh)
# ---------------------------------------------------------------------------

GRID_INTENSITIES: dict[str, float] = {
    "global": 380.0,
    "us_datacenter": 390.0,
    "eu_renewable": 50.0,
}


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def compute_turn_energy(
    provider: str,
    prompt_tokens: int,
    completion_tokens: int,
    searches_count: int,
    duration_sec: float,
) -> dict:
    """Compute energy consumed by a single LLM turn + any web searches.

    Returns a dict with individual components and totals in both Wh and
    Joules so callers never need to do unit conversion themselves.
    """
    coeffs = ENERGY_COEFFICIENTS.get(provider, ENERGY_COEFFICIENTS["groq"])

    e_infer_wh = (prompt_tokens * coeffs["prompt_wh"]) + (
        completion_tokens * coeffs["gen_wh"]
    )
    e_search_wh = searches_count * SEARCH_ENERGY_WH
    e_host_wh = (duration_sec * HOST_POWER_WATTS) / 3600.0
    e_total_wh = e_infer_wh + e_search_wh + e_host_wh

    return {
        "e_infer_wh": round(e_infer_wh, 8),
        "e_search_wh": round(e_search_wh, 8),
        "e_host_wh": round(e_host_wh, 8),
        "e_total_wh": round(e_total_wh, 8),
        "e_total_joules": round(e_total_wh * 3600.0, 6),
    }


def estimate_single_agent_baseline(
    task: str,
    evidence_count: int,
    provider: str,
    multi_synth_tokens: int,
) -> dict:
    """Estimate what a single-agent run would have cost in tokens and energy.

    The "shadow model" described in TASK_BENCHMARK.md §2-C:
      • prompt  = user query tokens + ~350 system prompt + search findings
      • completion ≈ 40% of multi-agent synthesis + transcript length
    """
    query_tokens = max(1, len(task) // 4)
    system_prompt_tokens = 350
    # Each search finding ≈ 80 tokens of context injected
    search_context_tokens = evidence_count * 80

    baseline_prompt = query_tokens + system_prompt_tokens + search_context_tokens
    baseline_completion = max(1, int(multi_synth_tokens * 0.40))

    # Single search call (if any evidence was gathered)
    searches = 1 if evidence_count > 0 else 0

    # Rough latency estimate: inference ≈ completion_tokens * 0.012s + search
    est_infer_sec = baseline_completion * 0.012
    est_search_sec = 1.2 if searches else 0.0
    est_latency = est_infer_sec + est_search_sec

    energy = compute_turn_energy(
        provider=provider,
        prompt_tokens=baseline_prompt,
        completion_tokens=baseline_completion,
        searches_count=searches,
        duration_sec=est_latency,
    )

    return {
        "prompt_tokens": baseline_prompt,
        "completion_tokens": baseline_completion,
        "searches": searches,
        "latency_sec": round(est_latency, 4),
        **energy,
    }


def calculate_carbon_footprint(energy_wh: float, grid_key: str = "global") -> float:
    """Convert energy (Wh) to grams CO2-equivalent using a grid intensity.

    Formula:  gCO2eq = energy_Wh × (I_grid / 1000)
    where I_grid is in gCO2eq/kWh.
    """
    intensity = GRID_INTENSITIES.get(grid_key, GRID_INTENSITIES["global"])
    return round(energy_wh * (intensity / 1000.0), 8)
