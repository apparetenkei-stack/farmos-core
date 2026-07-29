# Day146-D2-B FarmOS AI Mode Policy / Night Two-Pass Runtime

実施日: 2026-07-29 (Asia/Tokyo)

```yaml
farmos_ai_mode_policy:
  contract_id: farmos.ai.mode_policy.v1
  night_deep_analysis:
    enabled: true
    thinking: true
    model: Qwen3.6-35B-A3B
    priority: accuracy
    latency_priority: low
    output_authority: none
    reasoning_persisted: false
  night_structured_emit:
    enabled: true
    thinking: false
    model: Qwen3.6-35B-A3B
    priority: strict_structure
    output: untrusted_candidate
    candidate_only: true
    auto_promotion: false
  day_fast_response:
    contract_id: farmos.ai.day_fast_response.v1
    enabled_as_policy: true
    runtime_implemented_in_this_day: false
    implementation_deferred_to: Day146-E/F
    thinking: false
    projection_first: true
    bounded_source_drilldown: optional
    raw_full_history_scan: false
    response_guard_required: true
    business_write: false
    proposal_creation: false
    automatic_deep_analysis: false
  day_deep_analysis:
    contract_id: farmos.ai.day_deep_analysis.v1
    enabled_as_policy: true
    runtime_implemented_in_this_day: false
    implementation_deferred_to: Day146-E/F
    thinking: true
    activation: explicit_request_only
    automatic_activation: false
    business_write: false

night_job_routing:
  semantic_source_unavailable:
    action: reject_or_defer
    thinking_call: false
  deterministic_only:
    action: deterministic_core_processing
    thinking_call: false
  semantic_source_available:
    action: night_two_pass
    thinking_call: true

night_analysis_contract:
  contract_id: farmos.operational_memory.rtx_night_analysis.v1
  exact_schema: true
  additional_properties: false
  source_identity_match_required: true
  source_hash_match_required: true
  source_grounding_required: true
  unsupported_fact_rejection: true
  analysis_summary_max_chars: 600
  array_max_items: 8
  item_max_chars: 160
  evidence_max_items: 8
  total_utf8_bytes: 24576
  business_sot: false
  candidate: false
  projection: false
  approval: false
  execution_authority: false
  automatically_persisted: false

reasoning_policy:
  allowed_during_night_analysis: true
  parsed_as_business_data: false
  parsed_as_candidate: false
  persisted: false
  written_to_report: false
  written_to_log_in_full: false
  forwarded_to_pass_2: false

model_output_compatibility:
  contract_id: farmos.operational_memory.rtx_model_output.v1
  exact_boolean_maps: true
  unique_items_dependency_removed: true
  deterministic_adapter: true
  model_output_persisted_directly: false
  candidate_contract_changed: false
  candidate_parser_changed: false
  automatic_repair_used: false

qwen_35b_profile:
  model: qwen/qwen3.6-35b-a3b
  quantization: Q4_K_M
  context_length: 8192
  parallel: 1
  status: idle

night_two_pass_compatibility_probe:
  result: PASS
  pass_1:
    thinking: true
    http_status: 200
    finish_reason: stop
    latency_ms: 38514.1248
    completion_tokens: 1939
    analysis_json_parse: true
    analysis_exact_parser: true
    source_grounding: true
    reasoning_content_present: true
    reasoning_content_saved: false
    handoff_utf8_bytes: 943
  pass_2:
    thinking: false
    http_status: 200
    finish_reason: stop
    latency_ms: 71966.1492
    completion_tokens: 3851
    model_output_utf8_bytes: 1894
    model_output_json_parse: true
    model_output_exact_parser: true
    deterministic_adapter: true
    candidate_exact_parser: true
    source_grounding: true
    unsupported_fact_count: 0
    reasoning_content_present: true
    reasoning_content_saved: false
  candidate:
    utf8_bytes: 1284
    saved_to_database: false
    active_promoted: false
  fallback_model_used: false

measured_night_benchmark:
  measured_runs: 3
  successful_runs: 3
  same_fixture: true
  same_prompt: true
  same_schema: true
  same_model: true
  pass_1:
    average_latency_ms: 37925.4731
    completion_tokens_per_run: 1939
    handoff_utf8_bytes_per_run: 943
    reasoning_content_present_runs: 3
    reasoning_content_saved: false
  pass_2:
    average_latency_ms: 71688.2252
    completion_tokens_per_run: 3851
    model_output_utf8_bytes_per_run: 1894
    candidate_utf8_bytes_per_run: 1284
    model_output_parser_passes: 3
    candidate_parser_passes: 3
    grounding_passes: 3
    unsupported_fact_count: 0
    reasoning_content_present_runs: 3
    reasoning_content_saved: false
  candidate_auto_promotion: false
  fallback_model_used: false

gpu_profile:
  compatibility_probe:
    pass_1:
      gpu_0: { memory_used_mib: 12212, utilization_percent: 12, temperature_c: 47 }
      gpu_1: { memory_used_mib: 10736, utilization_percent: 28, temperature_c: 55 }
      verification: inference_observed_both_gpus
    pass_2:
      gpu_0: { memory_used_mib: 12212, utilization_percent: 15, temperature_c: 50 }
      gpu_1: { memory_used_mib: 10740, utilization_percent: 39, temperature_c: 59 }
      verification: inference_observed_both_gpus
  measured_runs:
    pass_1:
      gpu_0_utilization_percent_range: [12, 24]
      gpu_1_utilization_percent_range: [19, 24]
      peak_temperature_c: { gpu_0: 52, gpu_1: 60 }
      verification: inference_observed_both_gpus
    pass_2:
      gpu_0_utilization_percent_range: [17, 23]
      gpu_1_utilization_percent_range: [25, 39]
      peak_temperature_c: { gpu_0: 54, gpu_1: 61 }
      verification: inference_observed_both_gpus

model_policy:
  night_analysis_model:
    model: Qwen3.6-35B-A3B
    status: accepted_shadow_candidate
  night_structured_emit_model:
    model: Qwen3.6-35B-A3B
    status: accepted_shadow_candidate
  verifier_model:
    selected: false
    required_for_day146_D2_B: false
  qwen_27b:
    current_status: rejected_for_current_runtime
    retry_required: false
    day146_blocker: false
  production_model_selected: false
  golden_dataset_required: true

qwen_27b:
  previous_profile:
    context_length: 65536
    parallel: 2
    timeout_ms: 120000
    result: RTX_REQUEST_TIMEOUT
  lightweight_profile:
    context_length: 8192
    parallel: 1
    timeout_ms: 300000
  minimal_probe:
    http_status: 200
    finish_reason: length
    content_length: 0
    reasoning_content_present: true
  contract_compatibility: unverified
  operational_suitability_current_runtime: failed
  retry_required: false
  day146_blocker: false

codex_shared_lm_studio:
  windows_user_environment_configured: true
  new_powershell_verified: true
  loopback_base_url: http://127.0.0.1:1234
  token_value_exposed: false
  existing_codex_processes_require_restart: true
  fresh_codex_session_verified: false

targeted_tests: PASS

independent_review:
  status: PASS
  p1: 0
  p2: 0
  p3: 0

secret_gate:
  repository_token_matches: 0
  report_token_matches: 0
  git_tracked_token_matches: 0
  authorization_header_logged: false
  reasoning_content_saved: false

commit_gate: PASS

day146_D2_B_runtime_complete: true
day146_D2_C_ready: true
day146_D2_complete: false
day146_complete: false
day147_ready: false
```

Night Pass 1はthinkingを明示的に有効化するが、`reasoning_content`はmetrics以外へ使用しない。
Pass 2へ渡すのはexact parserとsource groundingを通過したbounded Analysis Handoffだけである。
Pass 2は元sourceを権威とし、handoffをuntrusted hintsとして扱う。

両Passとも、business date、timestamp、duration、quantity、unit、field/crop/work references、
source version/hash、tombstone stateを生成・変更対象にしない。source identity/hashは検証用に限定する。

35BのPass 2は独立Verifierではない。正式な品質評価とproduction model選定は
Golden Datasetを使用する後続工程へ残す。

Daytime Hermes runtime、Projection検索、Response Guard接続、Mac、WOL、Scheduler、
Firewall、Production Queue、営農アプリ接続は実装・実行していない。
