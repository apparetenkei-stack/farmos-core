import {
  runHermesLlmProviderAdapter,
  type HermesLlmProviderName,
  type HermesLlmProviderResponse,
  type HermesLlmProviderStatus,
} from "./hermes_llm_provider_adapter";
import {
  buildHermesCliReadonlyContextPrompt,
  createHermesFarmosReadonlyContextSkipped,
  normalizeReadonlyContextRequested,
  readHermesFarmosReadonlyContext,
  type HermesFarmosReadonlyContextEnvelope,
} from "./hermes_farmos_readonly_context";

export const HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS = 500;

export type HermesCliChatRequestEnvelope = {
  provider?: unknown;
  message?: unknown;
  model?: unknown;
  baseUrl?: unknown;
  timeoutMs?: unknown;
  smokeTestEnabled: boolean;
  includeReadonlyContext?: unknown;
  readonlyContextReader?: () => Promise<HermesFarmosReadonlyContextEnvelope>;
  fetchImpl?: typeof fetch;
};

export type HermesCliChatResponseEnvelope = {
  mode: "hermes_cli_chat_minimal_runtime";
  provider: HermesLlmProviderName;
  status: HermesLlmProviderStatus;
  runtime_call_allowed: boolean;
  llm_runtime_executed: boolean;
  runtime_reachable: boolean;
  prompt_sent: boolean;
  input_message_received: boolean;
  input_message_non_empty: boolean;
  input_message_length: number;
  input_message_too_long: boolean;
  input_message_multiline: boolean;
  max_input_message_chars: 500;
  multi_line_message_allowed: false;
  empty_message_allowed: false;
  response_text: string | null;
  response_text_non_empty: boolean;
  tokens_used: number | null;
  base_url: string | null;
  model: string | null;
  timeout_ms: number;
  http_status: number | null;
  error_message: string | null;
  readonly_context_allowed: true;
  readonly_context_requested: boolean;
  readonly_context_read_performed: boolean;
  readonly_context_included: boolean;
  readonly_context_non_empty: boolean;
  readonly_context_length: number;
  readonly_context_truncated: boolean;
  readonly_context_source: "farmos_readonly";
  readonly_context_max_chars: 2000;
  context_write_allowed: false;
  db_read_performed: boolean;
  db_write_performed: false;
  proposal_created: false;
  proposal_saved: false;
  proposal_apply_performed: false;
  chat_history_saved: false;
  audit_record_saved: false;
  app_db_write_performed: false;
  route_added: false;
  server_action_added: false;
  form_action_added: false;
  ui_changed: false;
  credentials_required: false;
  credentials_exposed: false;
  external_api_called: boolean;
  business_context_included: boolean;
  operational_context_requested: boolean;
  operational_context_read_performed: boolean;
  operational_context_included: boolean;
  operational_external_fetch_performed: boolean;
  inventory_source_connected: boolean;
  work_log_source_connected: boolean;
  inventory_record_count: number;
  work_log_record_count: number;
  inventory_connected_empty: boolean;
  work_log_connected_empty: boolean;
  suggestion_preview_created: boolean;
  suggestion_count: number;
  farm_context_included: boolean;
  db_context_included: boolean;
  proposal_context_included: false;
};

type MessageValidation = {
  rawMessage: string | null;
  inputMessageReceived: boolean;
  inputMessageNonEmpty: boolean;
  inputMessageLength: number;
  inputMessageTooLong: boolean;
  inputMessageMultiline: boolean;
  errorMessage: string | null;
};

function normalizeTimeoutMs(value: unknown): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(String(value ?? ""), 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30000;
  }

  return Math.min(Math.max(parsed, 1000), 120000);
}

function displayProvider(provider: unknown): HermesLlmProviderName {
  return provider === "mock" ? "mock" : "ollama";
}

function validateMessage(value: unknown): MessageValidation {
  const rawMessage = typeof value === "string" ? value : null;
  const inputMessageReceived = rawMessage !== null;
  const inputMessageLength = rawMessage?.length ?? 0;
  const inputMessageNonEmpty = rawMessage !== null && rawMessage.trim().length > 0;
  const inputMessageTooLong =
    inputMessageLength > HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS;
  const inputMessageMultiline = rawMessage !== null && /[\r\n]/u.test(rawMessage);

  let errorMessage: string | null = null;
  if (!inputMessageReceived) {
    errorMessage = "cli_chat_message_missing";
  } else if (!inputMessageNonEmpty) {
    errorMessage = "cli_chat_message_empty";
  } else if (inputMessageTooLong) {
    errorMessage = "cli_chat_message_too_long";
  } else if (inputMessageMultiline) {
    errorMessage = "cli_chat_message_multiline_not_allowed";
  }

  return {
    rawMessage,
    inputMessageReceived,
    inputMessageNonEmpty,
    inputMessageLength,
    inputMessageTooLong,
    inputMessageMultiline,
    errorMessage,
  };
}

function makeEnvelope(input: {
  provider: HermesLlmProviderName;
  status: HermesLlmProviderStatus;
  runtimeCallAllowed: boolean;
  runtimeExecuted: boolean;
  runtimeReachable: boolean;
  promptSent: boolean;
  validation: MessageValidation;
  responseText: string | null;
  tokensUsed: number | null;
  baseUrl: string | null;
  model: string | null;
  timeoutMs: number;
  httpStatus: number | null;
  errorMessage: string | null;
  readonlyContext?: HermesFarmosReadonlyContextEnvelope;
}): HermesCliChatResponseEnvelope {
  const readonlyContext =
    input.readonlyContext ?? createHermesFarmosReadonlyContextSkipped(false);

  return {
    mode: "hermes_cli_chat_minimal_runtime",
    provider: input.provider,
    status: input.status,
    runtime_call_allowed: input.runtimeCallAllowed,
    llm_runtime_executed: input.runtimeExecuted,
    runtime_reachable: input.runtimeReachable,
    prompt_sent: input.promptSent,
    input_message_received: input.validation.inputMessageReceived,
    input_message_non_empty: input.validation.inputMessageNonEmpty,
    input_message_length: input.validation.inputMessageLength,
    input_message_too_long: input.validation.inputMessageTooLong,
    input_message_multiline: input.validation.inputMessageMultiline,
    max_input_message_chars: HERMES_CLI_CHAT_MAX_INPUT_MESSAGE_CHARS,
    multi_line_message_allowed: false,
    empty_message_allowed: false,
    response_text: input.responseText,
    response_text_non_empty:
      typeof input.responseText === "string" &&
      input.responseText.trim().length > 0,
    tokens_used: input.tokensUsed,
    base_url: input.baseUrl,
    model: input.model,
    timeout_ms: input.timeoutMs,
    http_status: input.httpStatus,
    error_message: input.errorMessage,
    readonly_context_allowed: readonlyContext.readonly_context_allowed,
    readonly_context_requested: readonlyContext.readonly_context_requested,
    readonly_context_read_performed:
      readonlyContext.readonly_context_read_performed,
    readonly_context_included: readonlyContext.readonly_context_included,
    readonly_context_non_empty: readonlyContext.readonly_context_non_empty,
    readonly_context_length: readonlyContext.readonly_context_length,
    readonly_context_truncated: readonlyContext.readonly_context_truncated,
    readonly_context_source: readonlyContext.readonly_context_source,
    readonly_context_max_chars: readonlyContext.readonly_context_max_chars,
    context_write_allowed: readonlyContext.context_write_allowed,
    db_read_performed: readonlyContext.db_read_performed,
    db_write_performed: false,
    proposal_created: false,
    proposal_saved: false,
    proposal_apply_performed: false,
    chat_history_saved: false,
    audit_record_saved: false,
    app_db_write_performed: false,
    route_added: false,
    server_action_added: false,
    form_action_added: false,
    ui_changed: false,
    credentials_required: false,
    credentials_exposed: false,
    external_api_called:
      readonlyContext.operational_external_fetch_performed ?? false,
    business_context_included:
      readonlyContext.operational_context_included ?? false,
    operational_context_requested:
      readonlyContext.operational_context_requested ?? false,
    operational_context_read_performed:
      readonlyContext.operational_context_read_performed ?? false,
    operational_context_included:
      readonlyContext.operational_context_included ?? false,
    operational_external_fetch_performed:
      readonlyContext.operational_external_fetch_performed ?? false,
    inventory_source_connected:
      readonlyContext.inventory_source_connected ?? false,
    work_log_source_connected:
      readonlyContext.work_log_source_connected ?? false,
    inventory_record_count:
      readonlyContext.inventory_record_count ?? 0,
    work_log_record_count:
      readonlyContext.work_log_record_count ?? 0,
    inventory_connected_empty:
      readonlyContext.inventory_connected_empty ?? false,
    work_log_connected_empty:
      readonlyContext.work_log_connected_empty ?? false,
    suggestion_preview_created:
      readonlyContext.suggestion_preview_created ?? false,
    suggestion_count:
      readonlyContext.suggestion_count ?? 0,
    farm_context_included:
      readonlyContext.readonly_context_included,
    db_context_included:
      readonlyContext.readonly_context_included &&
      readonlyContext.db_read_performed,
    proposal_context_included: false,
  };
}

function fromProviderResult(
  result: HermesLlmProviderResponse,
  validation: MessageValidation,
  readonlyContext: HermesFarmosReadonlyContextEnvelope,
): HermesCliChatResponseEnvelope {
  return makeEnvelope({
    provider: result.provider,
    status: result.status,
    runtimeCallAllowed: result.runtime_call_allowed,
    runtimeExecuted: result.llm_runtime_executed,
    runtimeReachable: result.runtime_reachable,
    promptSent: result.prompt_sent,
    validation,
    responseText: result.response_text,
    tokensUsed: result.tokens_used,
    baseUrl: result.base_url,
    model: result.model,
    timeoutMs: result.timeout_ms,
    httpStatus: result.http_status,
    errorMessage: result.error_message,
    readonlyContext,
  });
}

export async function runHermesCliChatRuntime(
  request: HermesCliChatRequestEnvelope,
): Promise<HermesCliChatResponseEnvelope> {
  const validation = validateMessage(request.message);
  const timeoutMs = normalizeTimeoutMs(request.timeoutMs);
  const readonlyContextRequested = normalizeReadonlyContextRequested(
    request.includeReadonlyContext,
  );

  if (validation.errorMessage !== null || validation.rawMessage === null) {
    return makeEnvelope({
      provider: displayProvider(request.provider),
      status: "bad_request",
      runtimeCallAllowed: false,
      runtimeExecuted: false,
      runtimeReachable: false,
      promptSent: false,
      validation,
      responseText: null,
      tokensUsed: null,
      baseUrl: null,
      model: null,
      timeoutMs,
      httpStatus: null,
      errorMessage: validation.errorMessage,
      readonlyContext: createHermesFarmosReadonlyContextSkipped(
        readonlyContextRequested,
      ),
    });
  }

  let readonlyContext = createHermesFarmosReadonlyContextSkipped(false);
  let prompt = validation.rawMessage;

  if (readonlyContextRequested) {
    readonlyContext = request.readonlyContextReader
      ? await request.readonlyContextReader()
      : await readHermesFarmosReadonlyContext();

    if (
      readonlyContext.error_message !== null &&
      !readonlyContext.readonly_context_included
    ) {
      return makeEnvelope({
        provider: displayProvider(request.provider),
        status: "runtime_error",
        runtimeCallAllowed: false,
        runtimeExecuted: false,
        runtimeReachable: false,
        promptSent: false,
        validation,
        responseText: null,
        tokensUsed: null,
        baseUrl: null,
        model: null,
        timeoutMs,
        httpStatus: null,
        errorMessage: `readonly_context_read_failed:${readonlyContext.error_message}`,
        readonlyContext,
      });
    }

    if (
      readonlyContext.readonly_context_included &&
      readonlyContext.context_text !== null
    ) {
      prompt = buildHermesCliReadonlyContextPrompt({
        userMessage: validation.rawMessage,
        readonlyContextText: readonlyContext.context_text,
      });
    }
  }

  const result = await runHermesLlmProviderAdapter({
    smokeTestEnabled: request.smokeTestEnabled,
    provider: request.provider,
    prompt,
    baseUrl: request.baseUrl,
    model: request.model,
    timeoutMs: request.timeoutMs,
    fetchImpl: request.fetchImpl,
  });

  return fromProviderResult(result, validation, readonlyContext);
}

function readMessageFromArgs(args: string[]): string | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];
    if (current === "--message") {
      return args[index + 1];
    }

    if (current.startsWith("--message=")) {
      return current.slice("--message=".length);
    }
  }

  return undefined;
}

function readBooleanFlagFromArgs(args: string[], name: string): boolean | undefined {
  for (let index = 0; index < args.length; index += 1) {
    const current = args[index];

    if (current === name) {
      return true;
    }

    if (current.startsWith(`${name}=`)) {
      return normalizeReadonlyContextRequested(current.slice(name.length + 1));
    }
  }

  return undefined;
}

export async function runHermesCliChatRuntimeFromEnv(
  args: string[] = process.argv.slice(2),
): Promise<HermesCliChatResponseEnvelope> {
  return runHermesCliChatRuntime({
    smokeTestEnabled: process.env.HERMES_LLM_SMOKE_TEST_ENABLED === "true",
    provider: process.env.HERMES_LLM_PROVIDER ?? "ollama",
    baseUrl: process.env.HERMES_OLLAMA_BASE_URL,
    model: process.env.HERMES_OLLAMA_MODEL,
    timeoutMs: process.env.HERMES_LLM_TIMEOUT_MS,
    message: readMessageFromArgs(args) ?? process.env.HERMES_CLI_CHAT_MESSAGE,
    includeReadonlyContext:
      readBooleanFlagFromArgs(args, "--include-readonly-context") ??
      process.env.HERMES_CLI_CHAT_INCLUDE_READONLY_CONTEXT,
  });
}
