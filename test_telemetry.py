"""
Tests for the TASK_BENCHMARK telemetry backend.

Validates:
  1. telemetry.py pure-math functions (energy, baseline, carbon).
  2. models.py DiscussionStats schema with defaults.
  3. providers.py AgentTurnResult telemetry fields.
  4. engine.py telemetry accumulator wiring (unit-level, no LLM calls).
"""

from __future__ import annotations

import sys
import os

# Allow imports from the backend directory
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))


# ── telemetry.py ─────────────────────────────────────────────────────────

def test_compute_turn_energy_groq():
    import telemetry

    result = telemetry.compute_turn_energy(
        provider="groq",
        prompt_tokens=1000,
        completion_tokens=500,
        searches_count=1,
        duration_sec=2.0,
    )
    assert "e_infer_wh" in result
    assert "e_search_wh" in result
    assert "e_host_wh" in result
    assert "e_total_wh" in result
    assert "e_total_joules" in result

    # Inference: 1000 * 0.00018 + 500 * 0.00045 = 0.18 + 0.225 = 0.405
    assert abs(result["e_infer_wh"] - 0.405) < 1e-6
    # Search: 1 * 0.30 = 0.30
    assert abs(result["e_search_wh"] - 0.30) < 1e-6
    # Host: (2.0 * 15) / 3600 = 0.00833...
    assert abs(result["e_host_wh"] - (2.0 * 15.0 / 3600.0)) < 1e-5
    # Total = sum of above
    expected_total = 0.405 + 0.30 + (2.0 * 15.0 / 3600.0)
    assert abs(result["e_total_wh"] - expected_total) < 1e-4
    # Joules = Wh * 3600
    assert abs(result["e_total_joules"] - expected_total * 3600) < 1e-2
    print("  ✓ test_compute_turn_energy_groq")


def test_compute_turn_energy_openai():
    import telemetry

    result = telemetry.compute_turn_energy(
        provider="openai",
        prompt_tokens=500,
        completion_tokens=200,
        searches_count=0,
        duration_sec=1.5,
    )
    # Inference: 500 * 0.00030 + 200 * 0.00085 = 0.15 + 0.17 = 0.32
    assert abs(result["e_infer_wh"] - 0.32) < 1e-6
    assert result["e_search_wh"] == 0.0
    print("  ✓ test_compute_turn_energy_openai")


def test_compute_turn_energy_unknown_provider():
    """Unknown provider should fall back to groq coefficients."""
    import telemetry

    result = telemetry.compute_turn_energy(
        provider="unknown_provider",
        prompt_tokens=100,
        completion_tokens=100,
        searches_count=0,
        duration_sec=0.0,
    )
    groq_expected = 100 * 0.00018 + 100 * 0.00045
    assert abs(result["e_infer_wh"] - groq_expected) < 1e-8
    print("  ✓ test_compute_turn_energy_unknown_provider")


def test_estimate_single_agent_baseline():
    import telemetry

    baseline = telemetry.estimate_single_agent_baseline(
        task="What is quantum computing?",
        evidence_count=3,
        provider="groq",
        multi_synth_tokens=1500,
    )
    assert "prompt_tokens" in baseline
    assert "completion_tokens" in baseline
    assert "latency_sec" in baseline
    assert "e_total_wh" in baseline
    assert baseline["prompt_tokens"] > 0
    # completion = 40% of 1500 = 600
    assert baseline["completion_tokens"] == 600
    # 3 evidence items → 1 search
    assert baseline["searches"] == 1
    print("  ✓ test_estimate_single_agent_baseline")


def test_estimate_baseline_no_evidence():
    import telemetry

    baseline = telemetry.estimate_single_agent_baseline(
        task="Hello",
        evidence_count=0,
        provider="openai",
        multi_synth_tokens=100,
    )
    assert baseline["searches"] == 0
    assert baseline["completion_tokens"] == 40  # 40% of 100
    print("  ✓ test_estimate_baseline_no_evidence")


def test_calculate_carbon_footprint():
    import telemetry

    # 1 Wh at global (380 gCO2eq/kWh) = 1 * 380/1000 = 0.38 g
    carbon = telemetry.calculate_carbon_footprint(1.0, "global")
    assert abs(carbon - 0.38) < 1e-6

    # 10 Wh at eu_renewable (50 gCO2eq/kWh) = 10 * 50/1000 = 0.50 g
    carbon_eu = telemetry.calculate_carbon_footprint(10.0, "eu_renewable")
    assert abs(carbon_eu - 0.50) < 1e-6

    # Unknown grid falls back to global
    carbon_unk = telemetry.calculate_carbon_footprint(1.0, "mars_grid")
    assert abs(carbon_unk - 0.38) < 1e-6
    print("  ✓ test_calculate_carbon_footprint")


def test_zero_inputs():
    """Zero tokens / zero duration should produce zero energy."""
    import telemetry

    result = telemetry.compute_turn_energy("groq", 0, 0, 0, 0.0)
    assert result["e_total_wh"] == 0.0
    assert result["e_total_joules"] == 0.0
    print("  ✓ test_zero_inputs")


# ── models.py ─────────────────────────────────────────────────────────────

def test_discussion_stats_defaults():
    from models import DiscussionStats

    stats = DiscussionStats()
    assert stats.latency_multi_sec == 0.0
    assert stats.latency_single_sec == 0.0
    assert stats.energy_multi_wh == 0.0
    assert stats.carbon_multi_g == 0.0
    assert stats.carbon_saved_g == 0.0
    assert stats.concurrency_time_saved_sec == 0.0
    # Existing fields still work
    assert stats.messages_sent == 0
    assert stats.tokens_saved == 0
    print("  ✓ test_discussion_stats_defaults")


def test_discussion_stats_serialization():
    from models import DiscussionStats

    stats = DiscussionStats(
        latency_multi_sec=5.2,
        energy_multi_wh=0.72,
        carbon_multi_g=0.27,
        carbon_saved_g=0.05,
    )
    d = stats.model_dump()
    assert d["latency_multi_sec"] == 5.2
    assert d["energy_multi_wh"] == 0.72
    assert d["carbon_multi_g"] == 0.27
    assert d["carbon_saved_g"] == 0.05
    # All keys present
    expected_keys = {
        "confidence_threshold", "uncertainty_threshold",
        "messages_sent", "messages_bypassed",
        "overhead_normal_pct", "overhead_adaptive_pct", "overhead_reduction_pct",
        "tokens_normal_multi", "tokens_adaptive_multi", "tokens_single_agent", "tokens_saved",
        "latency_multi_sec", "latency_adaptive_multi_sec", "latency_normal_multi_sec",
        "latency_single_sec", "latency_delta_pct", "latency_time_saved_sec",
        "energy_multi_wh", "energy_normal_wh", "energy_single_wh", "energy_delta_pct",
        "carbon_multi_g", "carbon_adaptive_multi_g", "carbon_normal_multi_g",
        "carbon_single_g", "carbon_saved_g",
        "concurrency_time_saved_sec",
        "avg_response_latency_sec", "round_timings", "total_rtt_sec",
    }
    assert expected_keys == set(d.keys())
    print("  [PASS] test_discussion_stats_serialization")


def test_estimate_normal_multi_agent_baseline():
    import telemetry

    normal = telemetry.estimate_normal_multi_agent_baseline(
        provider="groq",
        adaptive_prompt_tokens=1000,
        adaptive_completion_tokens=500,
        adaptive_searches=1,
        adaptive_latency_sec=4.5,
        bypassed_messages_count=2,
        tokens_saved_estimate=800,
        concurrency_time_saved_sec=1.5,
        avg_turn_latency_sec=1.4,
    )
    assert normal["prompt_tokens"] == 1800  # 1000 + 800
    assert normal["completion_tokens"] == 500 + int(800 * 0.6)  # 500 + 480 = 980
    assert normal["total_tokens"] == 1800 + 980
    assert normal["latency_sec"] > 4.5
    assert normal["carbon_g"] > 0.0
    print("  [PASS] test_estimate_normal_multi_agent_baseline")


def test_discussion_stats_backward_compat():
    """Old session data with no telemetry fields should still load."""
    from models import DiscussionStats

    old_data = {
        "confidence_threshold": 0.75,
        "uncertainty_threshold": 0.25,
        "messages_sent": 3,
        "messages_bypassed": 1,
        "overhead_reduction_pct": 25,
        "tokens_saved": 400,
    }
    stats = DiscussionStats(**old_data)
    # New fields default to 0
    assert stats.latency_multi_sec == 0.0
    assert stats.carbon_saved_g == 0.0
    assert stats.overhead_normal_pct == 100.0
    print("  [PASS] test_discussion_stats_backward_compat")



# ── providers.py AgentTurnResult ──────────────────────────────────────────

def test_agent_turn_result_telemetry_fields():
    from providers import AgentTurnResult

    r = AgentTurnResult(message="hello", confidence=0.8)
    assert r.prompt_tokens == 0
    assert r.completion_tokens == 0
    assert r.duration_sec == 0.0
    assert r.searches_count == 0

    r2 = AgentTurnResult(
        message="test",
        confidence=0.9,
        prompt_tokens=150,
        completion_tokens=75,
        duration_sec=1.23,
        searches_count=2,
    )
    assert r2.prompt_tokens == 150
    assert r2.completion_tokens == 75
    assert r2.duration_sec == 1.23
    assert r2.searches_count == 2
    print("  ✓ test_agent_turn_result_telemetry_fields")


# ── engine.py telemetry accumulator wiring ────────────────────────────────

def test_engine_telemetry_accumulators_exist():
    """Verify the engine initialises telemetry counters."""
    # We can't fully construct CrossTalkEngine without a provider, but we
    # can check the class attributes by passing a dummy provider.
    from unittest.mock import MagicMock
    from communication import CommunicationManager

    comm = CommunicationManager()
    dummy_provider = MagicMock()
    dummy_provider.provider_name = "groq"

    from engine import CrossTalkEngine
    eng = CrossTalkEngine(comm, provider=dummy_provider)

    assert hasattr(eng, "total_prompt_tokens")
    assert hasattr(eng, "total_completion_tokens")
    assert hasattr(eng, "total_searches")
    assert hasattr(eng, "total_llm_duration_sec")
    assert eng.total_prompt_tokens == 0
    print("  ✓ test_engine_telemetry_accumulators_exist")


# ── runner ────────────────────────────────────────────────────────────────

def main():
    tests = [
        test_compute_turn_energy_groq,
        test_compute_turn_energy_openai,
        test_compute_turn_energy_unknown_provider,
        test_estimate_single_agent_baseline,
        test_estimate_baseline_no_evidence,
        test_calculate_carbon_footprint,
        test_zero_inputs,
        test_discussion_stats_defaults,
        test_discussion_stats_serialization,
        test_estimate_normal_multi_agent_baseline,
        test_discussion_stats_backward_compat,
        test_agent_turn_result_telemetry_fields,
        test_engine_telemetry_accumulators_exist,
    ]
    passed = 0
    failed = 0
    for fn in tests:
        try:
            fn()
            passed += 1
        except Exception as exc:
            print(f"  [FAIL] {fn.__name__}: {exc}")
            failed += 1

    print(f"\n{'=' * 50}")
    print(f"Results: {passed} passed, {failed} failed out of {len(tests)}")
    if failed:
        sys.exit(1)
    print("All tests passed! [OK]")


if __name__ == "__main__":
    main()
