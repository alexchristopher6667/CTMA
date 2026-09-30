# TASK SPECIFICATION: Multi-Agent vs. Single-Agent Benchmark & Environmental Footprint

## 1. OBJECTIVE
Implement an empirical benchmark and environmental impact engine for CTMARS (Cross-Talking Multi-Agent Research System). Compare the 3-agent deliberation architecture directly against an equivalent Single-Agent baseline across three core dimensions:
1. Time Complexity & Wall-Clock Latency (execution breakdown, concurrency speedup).
2. Energy Consumption (Watt-hours & Joules, hardware-calibrated remote inference + search + host compute).
3. Carbon Footprint (gCO2eq using regional datacenter grid intensities, highlighting emissions avoided via selective gating).

---

## 2. MATHEMATICAL FORMULATION

### A. Latency & Time Complexity
- Single-Agent Baseline Latency:
    T_single = T_search + T_infer(query + unified_system_prompt)
- Multi-Agent Latency:
    T_multi = T_R1 + Sum(T_R2_executed) + Max(T_R3_research, T_R3_analyst, T_R3_critic) + T_synthesis
- Speedup / Overhead Ratio:
    Latency_Ratio = T_multi / max(T_single, 0.001)

### B. Energy Consumption (Watt-hours)
For cloud inference, calculate energy consumption based on hardware energy coefficients:
- Groq LPU (LPUs): ~0.00018 Wh per prompt token, ~0.00045 Wh per generated token.
- OpenAI / NVIDIA H100 GPU clusters: ~0.00030 Wh per prompt token, ~0.00085 Wh per generated token.
- Web Search lookup: Fixed ~0.00030 kWh (0.30 Wh) per executed search request.
- Host overhead: (Execution_Seconds * P_host_watts) / 3600, where P_host_watts ~= 15W.
- Total Energy:
    E_total_Wh = E_infer_Wh + E_search_Wh + E_host_Wh
    E_total_Joules = E_total_Wh * 3600

### C. Single-Agent Baseline Estimation (Shadow Model)
- Baseline Prompt Tokens = User Query tokens + System prompt tokens (~350) + Search findings tokens (if search was used).
- Baseline Completion Tokens = Estimated as ~40% of the total multi-agent synthesis and transcript length (typically 450 - 650 tokens).
- Compute equivalent single-agent energy and latency using the same provider formulas.

### D. Carbon Footprint (gCO2eq)
- Grid Intensity (I_grid): Default to Global Average Data Center Intensity = 380 gCO2eq/kWh (0.380 gCO2eq/Wh). Configurable to US Average (390 gCO2eq/kWh) or Green/Renewable Cloud (50 gCO2eq/kWh).
- CO2eq (grams) = E_total_Wh * (I_grid / 1000.0)
- CO2eq Avoided = E_bypassed_Wh * (I_grid / 1000.0), calculated from turns avoided due to D < 0.25 or C >= threshold.

---

## 3. REQUIRED CODE CHANGES

### File 1: Create `backend/telemetry.py`
Implement a standalone telemetry and benchmark module:
- Constants for hardware energy profiles:
  `ENERGY_COEFFICIENTS = {"groq": {"prompt_wh": 0.00018, "gen_wh": 0.00045}, "openai": {"prompt_wh": 0.00030, "gen_wh": 0.00085}}`
- `GRID_INTENSITIES = {"global": 380.0, "us_datacenter": 390.0, "eu_renewable": 50.0}`
- Functions:
  - `compute_turn_energy(provider: str, prompt_tokens: int, completion_tokens: int, searches_count: int, duration_sec: float) -> dict`
  - `estimate_single_agent_baseline(task: str, evidence_count: int, provider: str, multi_synth_tokens: int) -> dict`
  - `calculate_carbon_footprint(energy_wh: float, grid_key: str = "global") -> float`

### File 2: Update `backend/models.py`
1. Update `Evidence` or `AgentTurnResult` to capture prompt and completion tokens.
2. Extend `DiscussionStats` with telemetry models:
   - `latency_multi_sec`: float
   - `latency_single_sec`: float
   - `latency_delta_pct`: float
   - `energy_multi_wh`: float
   - `energy_single_wh`: float
   - `energy_delta_pct`: float
   - `carbon_multi_g`: float
   - `carbon_single_g`: float
   - `carbon_saved_g`: float
   - `concurrency_time_saved_sec`: float

### File 3: Update `backend/providers.py`
1. In `GroqProvider` and `OpenAIProvider`:
   - Inspect API responses for `response.usage.prompt_tokens` and `response.usage.completion_tokens`.
   - Record token counts on `AgentTurnResult` (defaulting to character heuristics if usage is missing: `len(text) // 4`).
2. Add high-precision timers (`time.perf_counter()`) around each LLM call and synthesis.

### File 4: Update `backend/engine.py`
1. Track per-round and total execution time using `time.perf_counter()`.
2. Compute actual multi-agent tokens (sum of prompt and completion across R1, un-bypassed R2 turns, R3 concurrent turns, and final synthesis).
3. Compute the `single_agent_baseline` using `backend/telemetry.py`.
4. Calculate energy consumed, latency comparison, and carbon emission numbers.
5. Include these metrics in the `discussion_finished` WebSocket broadcast payload under `stats`.

### File 5: Update Frontend Types (`frontend/src/types/index.ts`)
Update `DiscussionStats`, `ChatTurn`, and `ChatSession` interfaces to reflect the new latency, energy (Wh), and carbon footprint (gCO2eq) fields.

### File 6: Update UI Components
1. `frontend/src/components/chat/ChatMessage.tsx`:
   - Add a compact "Eco & Energy Telemetry" accordion or pill beside the overhead metrics bar showing:
     - Multi-Agent vs. Single-Agent latency (e.g., "3.4s vs 1.2s baseline").
     - Energy consumed in Watt-hours (Wh) & carbon in grams (gCO2eq).
     - Net carbon avoided by selective gating bypasses.
2. `frontend/src/components/dashboard/AnalyticsDashboard.tsx`:
   - Add two stat cards: "Total Energy Consumed" and "Net Carbon Footprint".
   - Add a comparative visual card: "Multi-Agent vs. Single-Agent Footprint Trade-off" showing energy and latency overhead versus the factual verification gain.
3. `frontend/src/components/inspector/OverheadDashboard.tsx`:
   - Display energy and carbon savings alongside bypassed token count.

---

## 4. CONSTRAINTS & QUALITY STANDARDS
- Maintain non-breaking backward compatibility: Default any missing stats to 0 or null so past sessions loaded from localStorage don't crash.
- Do not introduce mock or dummy delays; use actual high-resolution wall-clock measurements.
- Keep calculations lightweight so backend execution overhead remains negligible (< 1ms).
- Ensure math is cleanly formatted and units are explicit (Wh, Joules, gCO2eq, seconds).