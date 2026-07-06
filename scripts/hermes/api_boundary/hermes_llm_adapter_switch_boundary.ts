import {
  detectHermesBlockedRequest,
  detectHermesRequestedIntent,
  normalizeHermesUserMessage,
  runHermesLlmAdapterMockBoundary,
  type HermesChatIntent,
} from "./hermes_llm_adapter_mock_boundary";
import {
  runHermesLocalLlmRuntimeHealthCheckBoundary,
  type HermesLocalLlmRuntimeHealthCheckStatus,
} from "./hermes_local_llm_runtime_health_check_boundary";
import {
  runHermesLocalLlmRuntimeHealthProbeBoundary,
  type HermesLocalLlmRuntimeHealthProbeStatus,
} from "./hermes_local_llm_runtime_health_probe_boundary";
import {
  runHermesLocalLlmPromptSmokeTestBoundary,
  type HermesLocalLlmPromptSmokeStatus,
} from "./hermes_local_llm_prompt_smoke_test_boundary";

export type HermesLlmProvider =
  | "mock"
  | "local_llm_disabled"
  | "external_llm_disabled";

type HermesRequestedProvider =
  | HermesLlmProvider
  | "local_llm"
  | "external_llm"
  | "local_llm_probe"
  | "local_llm_prompt_smoke"
  | "unknown";

type ProviderCapability = {
  available: boolean;
  executable: boolean;
  runtime_call_allowed: false;
};

type HermesLlmAdapterSwitchInput = {
  userMessage?: unknown;
  normalizedUserMessage?: string;
  requestedIntent?: HermesChatIntent;
  safeContext?: Record<string, unknown>;
  provider?: unknown;
  dryRun?: boolean;
};

type HermesLlmAdapterSwitchBoundary = {
  writes_performed: false;
  chat_history_write_allowed: false;
  app_schema_write_allowed: false;
  ai_proposal_write_allowed: false;
  audit_apply_event_write_allowed: false;
  proposal_apply_allowed: false;
  hermes_runtime_executed: false;
  llm_runtime_executed: false;
  external_api_called: false;
  local_model_called: false;
  local_runtime_health_http_called: false;
  local_runtime_generate_http_called: false;
  prompt_sent_to_model: false;
  request_body_sent: false;
  response_body_exposed: false;
  embeddings_executed: false;
  vector_search_executed: false;
  restricted_domain_data_exposed: false;
  endpoint_value_exposed: false;
  credentials_exposed: false;
  user_prompt_sent_to_model: false;
  business_context_sent_to_model: false;
  fixed_smoke_prompt_sent_to_model: false;
  tokens_used: 0;
};

type HermesLlmAdapterSwitchAdapterResult = {
  adapter: "hermes_llm_adapter_mock_boundary";
  response_kind: "deterministic_mock_response";
  content: string;
  requested_intent: HermesChatIntent;
  runtime: {
    llm_runtime_executed: false;
    external_api_called: false;
    local_model_called: false;
    tokens_used: 0;
  };
};

export type HermesLlmAdapterSwitchResult = {
  result: "ok" | "bad_request" | "blocked" | "error";
  switch: {
    mode: "hermes_llm_adapter_switch_boundary";
    requested_provider: HermesRequestedProvider;
    selected_provider: "mock";
    fallback_provider: "mock";
    provider_execution_mode: "dry_run_only";
    provider_capabilities: {
      mock: ProviderCapability;
      local_llm_disabled: ProviderCapability;
      external_llm_disabled: ProviderCapability;
    };
    adapter_result?: HermesLlmAdapterSwitchAdapterResult;
    health_check_status?: HermesLocalLlmRuntimeHealthCheckStatus;
    health_probe_status?: HermesLocalLlmRuntimeHealthProbeStatus;
    prompt_smoke_status?: HermesLocalLlmPromptSmokeStatus;
    blocked_reason?: string;
    matched_policy?: string;
  };
  boundary: HermesLlmAdapterSwitchBoundary;
  error?: string;
};

const providerCapabilities = {
  mock: {
    available: true,
    executable: true,
    runtime_call_allowed: false,
  },
  local_llm_disabled: {
    available: false,
    executable: false,
    runtime_call_allowed: false,
  },
  external_llm_disabled: {
    available: false,
    executable: false,
    runtime_call_allowed: false,
  },
} satisfies HermesLlmAdapterSwitchResult["switch"]["provider_capabilities"];

const boundary: HermesLlmAdapterSwitchBoundary = {
  writes_performed: false,
  chat_history_write_allowed: false,
  app_schema_write_allowed: false,
  ai_proposal_write_allowed: false,
  audit_apply_event_write_allowed: false,
  proposal_apply_allowed: false,
  hermes_runtime_executed: false,
  llm_runtime_executed: false,
  external_api_called: false,
  local_model_called: false,
  local_runtime_health_http_called: false,
  local_runtime_generate_http_called: false,
  prompt_sent_to_model: false,
  request_body_sent: false,
  response_body_exposed: false,
  embeddings_executed: false,
  vector_search_executed: false,
  restricted_domain_data_exposed: false,
  endpoint_value_exposed: false,
  credentials_exposed: false,
  user_prompt_sent_to_model: false,
  business_context_sent_to_model: false,
  fixed_smoke_prompt_sent_to_model: false,
  tokens_used: 0,
};

function makeBaseSwitch(input: {
  requestedProvider: HermesRequestedProvider;
}): HermesLlmAdapterSwitchResult["switch"] {
  return {
    mode: "hermes_llm_adapter_switch_boundary",
    requested_provider: input.requestedProvider,
    selected_provider: "mock",
    fallback_provider: "mock",
    provider_execution_mode: "dry_run_only",
    provider_capabilities: providerCapabilities,
  };
}

function normalizeRequestedProvider(provider: unknown): {
  requestedProvider: HermesRequestedProvider;
  normalizedProvider: HermesLlmProvider | null;
  blockedReason?: string;
  matchedPolicy?: string;
} {
  if (provider === undefined || provider === null || provider === "") {
    return {
      requestedProvider: "mock",
      normalizedProvider: "mock",
    };
  }

  if (typeof provider !== "string") {
    return {
      requestedProvider: "unknown",
      normalizedProvider: null,
      blockedReason: "provider_must_be_string",
      matchedPolicy: "provider_input_validation",
    };
  }

  const raw = provider.trim().toLowerCase();

  if (raw === "mock") {
    return {
      requestedProvider: "mock",
      normalizedProvider: "mock",
    };
  }

  if (raw === "local_llm_prompt_smoke") {
    return {
      requestedProvider: "local_llm_prompt_smoke",
      normalizedProvider: "local_llm_disabled",
      blockedReason: "local_llm_provider_disabled_by_day47_prompt_smoke_boundary",
      matchedPolicy: "local_llm_fixed_prompt_smoke_only",
    };
  }

  if (raw === "local_llm_probe") {
    return {
      requestedProvider: "local_llm_probe",
      normalizedProvider: "local_llm_disabled",
      blockedReason: "local_llm_provider_disabled_by_day46_probe_boundary",
      matchedPolicy: "local_llm_runtime_health_probe_only",
    };
  }

  if (raw === "local_llm" || raw === "local_llm_disabled") {
    return {
      requestedProvider:
        raw === "local_llm" ? "local_llm" : "local_llm_disabled",
      normalizedProvider: "local_llm_disabled",
      blockedReason: "local_llm_provider_disabled_by_day45_health_check_boundary",
      matchedPolicy: "local_llm_runtime_health_check_dry_run_only",
    };
  }

  if (raw === "external_llm" || raw === "external_llm_disabled") {
    return {
      requestedProvider:
        raw === "external_llm" ? "external_llm" : "external_llm_disabled",
      normalizedProvider: "external_llm_disabled",
      blockedReason: "external_llm_provider_disabled_by_day44_boundary",
      matchedPolicy: "external_llm_runtime_disabled",
    };
  }

  return {
    requestedProvider: "unknown",
    normalizedProvider: null,
    blockedReason: "unknown_provider_rejected_by_day44_boundary",
    matchedPolicy: "unknown_provider",
  };
}

export async function runHermesLlmAdapterSwitchBoundary(
  input: HermesLlmAdapterSwitchInput,
): Promise<HermesLlmAdapterSwitchResult> {
  const provider = normalizeRequestedProvider(input.provider);
  const baseSwitch = makeBaseSwitch({
    requestedProvider: provider.requestedProvider,
  });

  if (input.dryRun === false) {
    return {
      result: "blocked",
      switch: {
        ...baseSwitch,
        blocked_reason: "day44_adapter_switch_requires_dry_run",
        matched_policy: "non_dry_run_request",
      },
      boundary,
    };
  }

  if (provider.normalizedProvider === "local_llm_disabled") {
    const healthCheck = runHermesLocalLlmRuntimeHealthCheckBoundary({
      provider: provider.requestedProvider,
      dryRun: true,
    });

    const healthProbe = await runHermesLocalLlmRuntimeHealthProbeBoundary({
      provider: "local_llm_probe",
      dryRun: true,
      probe: false,
    });

    const promptSmoke = await runHermesLocalLlmPromptSmokeTestBoundary({
      provider: "local_llm_prompt_smoke",
      dryRun: true,
      smoke: false,
    });

    return {
      result: "blocked",
      switch: {
        ...baseSwitch,
        health_check_status: healthCheck.health_check,
        health_probe_status: healthProbe.health_probe,
        prompt_smoke_status: promptSmoke.prompt_smoke,
        blocked_reason: provider.blockedReason,
        matched_policy: provider.matchedPolicy,
      },
      boundary,
    };
  }

  if (provider.normalizedProvider !== "mock") {
    return {
      result: provider.normalizedProvider === null ? "bad_request" : "blocked",
      switch: {
        ...baseSwitch,
        blocked_reason: provider.blockedReason,
        matched_policy: provider.matchedPolicy,
      },
      boundary,
    };
  }

  const rawMessage =
    typeof input.normalizedUserMessage === "string"
      ? input.normalizedUserMessage
      : typeof input.userMessage === "string"
        ? input.userMessage
        : "";

  const normalizedUserMessage = normalizeHermesUserMessage(rawMessage);

  if (normalizedUserMessage.length === 0) {
    return {
      result: "bad_request",
      switch: {
        ...baseSwitch,
        blocked_reason: "empty_message",
        matched_policy: "input_validation",
      },
      boundary,
    };
  }

  const blocked = detectHermesBlockedRequest(normalizedUserMessage);

  if (blocked.blocked) {
    return {
      result: "blocked",
      switch: {
        ...baseSwitch,
        blocked_reason: blocked.reason ?? "blocked",
        matched_policy: blocked.matched_policy ?? "unknown",
      },
      boundary,
    };
  }

  const requestedIntent =
    input.requestedIntent ?? detectHermesRequestedIntent(normalizedUserMessage);

  const adapterResult = await runHermesLlmAdapterMockBoundary({
    userMessage: input.userMessage,
    normalizedUserMessage,
    requestedIntent,
    safeContext: input.safeContext,
  });

  if (adapterResult.result !== "ok") {
    return {
      result: adapterResult.result,
      switch: {
        ...baseSwitch,
        adapter_result: {
          adapter: adapterResult.adapter.mode,
          response_kind: "deterministic_mock_response",
          content: adapterResult.adapter.output.content,
          requested_intent: adapterResult.adapter.requested_intent,
          runtime: adapterResult.adapter.runtime,
        },
        blocked_reason: adapterResult.blocked_reason,
        matched_policy: adapterResult.matched_policy,
      },
      boundary,
    };
  }

  return {
    result: "ok",
    switch: {
      ...baseSwitch,
      adapter_result: {
        adapter: adapterResult.adapter.mode,
        response_kind: "deterministic_mock_response",
        content: adapterResult.adapter.output.content,
        requested_intent: adapterResult.adapter.requested_intent,
        runtime: adapterResult.adapter.runtime,
      },
    },
    boundary,
  };
}
