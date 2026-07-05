export type HermesChatIntent =
  | "ask_context"
  | "ask_review_queue"
  | "ask_next_action"
  | "unknown";

type BlockedRequest = {
  blocked: boolean;
  reason: string | null;
  matched_policy: string | null;
};

type HermesMockAdapterInput = {
  userMessage?: unknown;
  normalizedUserMessage?: string;
  requestedIntent?: HermesChatIntent;
  safeContext?: Record<string, unknown>;
};

type HermesMockAdapterBoundary = {
  writes_performed: false;
  chat_history_write_allowed: false;
  ai_proposal_write_allowed: false;
  proposal_apply_allowed: false;
  restricted_domain_data_exposed: false;
};

export type HermesMockAdapterResult = {
  result: "ok" | "bad_request" | "blocked" | "error";
  adapter: {
    mode: "hermes_llm_adapter_mock_boundary";
    provider: "mock";
    model: "deterministic_day43_mock";
    input_accepted: boolean;
    requested_intent: HermesChatIntent;
    output: {
      role: "assistant";
      content: string;
      safety_notes: string[];
    };
    runtime: {
      llm_runtime_executed: false;
      external_api_called: false;
      local_model_called: false;
      tokens_used: 0;
    };
  };
  boundary: HermesMockAdapterBoundary;
  blocked_reason?: string;
  matched_policy?: string;
};

const MAX_MESSAGE_LENGTH = 1000;

const boundary: HermesMockAdapterBoundary = {
  writes_performed: false,
  chat_history_write_allowed: false,
  ai_proposal_write_allowed: false,
  proposal_apply_allowed: false,
  restricted_domain_data_exposed: false,
};

const restrictedPatterns: Array<{
  policy: string;
  pattern: RegExp;
}> = [
  {
    policy: "proposal_apply_or_auto_approval",
    pattern: /(apply|approve|auto[_ -]?apply|承認|適用|反映|自動承認|自動適用)/i,
  },
  {
    policy: "llm_or_agent_runtime_execution",
    pattern: /(run\s*(llm|hermes|openclaw)|LLMを実行|Hermesを実行|OpenClawを実行|実LLM|local\s*llm|Ollamaを呼|LM Studioを呼)/i,
  },
  {
    policy: "restricted_business_domain",
    pattern: /(受発注|出荷配分|取引先|金額|売上|支払|請求|給与|労務機微|個人評価|customer|order|shipping|payment|payroll)/i,
  },
  {
    policy: "credential_or_private_runtime_config",
    pattern: /(api\s*key|apikey|credential|private config|runtime config|env実値|環境変数の実値|認証情報|サービスロール)/i,
  },
];

export function normalizeHermesUserMessage(message: string): string {
  return message.replace(/\s+/g, " ").trim();
}

export function detectHermesRequestedIntent(
  normalizedUserMessage: string,
): HermesChatIntent {
  const text = normalizedUserMessage.toLowerCase();

  if (
    /レビュー|review|pending|提案|queue|キュー|hermes note|hermes提案/.test(text)
  ) {
    return "ask_review_queue";
  }

  if (/次|next|next action|何をすれば|進め方|次の作業|優先/.test(text)) {
    return "ask_next_action";
  }

  if (/context|memory|文脈|状態|概要|今の状況|安全条件/.test(text)) {
    return "ask_context";
  }

  return "unknown";
}

export function detectHermesBlockedRequest(
  normalizedUserMessage: string,
): BlockedRequest {
  for (const item of restrictedPatterns) {
    if (item.pattern.test(normalizedUserMessage)) {
      return {
        blocked: true,
        reason: "request_matches_day43_disallowed_policy",
        matched_policy: item.policy,
      };
    }
  }

  return {
    blocked: false,
    reason: null,
    matched_policy: null,
  };
}

function buildDeterministicContent(input: {
  intent: HermesChatIntent;
  safeContext: Record<string, unknown>;
}): string {
  const pendingHermesNoteCount =
    typeof input.safeContext.pending_hermes_note_count === "number"
      ? input.safeContext.pending_hermes_note_count
      : null;

  const hermesNoteCount =
    typeof input.safeContext.hermes_note_count === "number"
      ? input.safeContext.hermes_note_count
      : null;

  const protectedProposalStatus =
    typeof input.safeContext.protected_proposal_status === "string"
      ? input.safeContext.protected_proposal_status
      : "unknown";

  if (input.intent === "ask_review_queue") {
    return [
      "Hermes dry-run mock response:",
      `現在のHermes review queueは安全な集計値だけを参照しています。`,
      `Hermes note count: ${hermesNoteCount ?? "unknown"}`,
      `Pending Hermes note count: ${pendingHermesNoteCount ?? "unknown"}`,
      `Protected proposal status: ${protectedProposalStatus}`,
      "Day43では提案の承認・適用・自動生成は行いません。",
    ].join("\n");
  }

  if (input.intent === "ask_next_action") {
    return [
      "Hermes dry-run mock response:",
      "次の作業は、pendingのHermes noteを人間が確認し、必要なら追加文脈を要求することです。",
      "Day43ではchat入力契約のdry-run確認だけを行い、業務DBへの反映は行いません。",
    ].join("\n");
  }

  if (input.intent === "ask_context") {
    return [
      "Hermes dry-run mock response:",
      "Day43で参照できる文脈は、Day41 memory context minimumとDay42 proposal review loop minimum相当の安全な集計情報だけです。",
      "受発注・出荷配分・取引先・金額・労務機微情報は出力しません。",
    ].join("\n");
  }

  return [
    "Hermes dry-run mock response:",
    "この入力はDay43のmock adapterで受理されました。",
    "まだ実LLMは呼ばず、chat履歴も保存しません。",
  ].join("\n");
}

export async function runHermesLlmAdapterMockBoundary(
  input: HermesMockAdapterInput,
): Promise<HermesMockAdapterResult> {
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
      adapter: {
        mode: "hermes_llm_adapter_mock_boundary",
        provider: "mock",
        model: "deterministic_day43_mock",
        input_accepted: false,
        requested_intent: "unknown",
        output: {
          role: "assistant",
          content: "",
          safety_notes: ["empty_message_rejected"],
        },
        runtime: {
          llm_runtime_executed: false,
          external_api_called: false,
          local_model_called: false,
          tokens_used: 0,
        },
      },
      boundary,
    };
  }

  if (normalizedUserMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      result: "bad_request",
      adapter: {
        mode: "hermes_llm_adapter_mock_boundary",
        provider: "mock",
        model: "deterministic_day43_mock",
        input_accepted: false,
        requested_intent: "unknown",
        output: {
          role: "assistant",
          content: "",
          safety_notes: ["message_too_long_rejected"],
        },
        runtime: {
          llm_runtime_executed: false,
          external_api_called: false,
          local_model_called: false,
          tokens_used: 0,
        },
      },
      boundary,
    };
  }

  const blocked = detectHermesBlockedRequest(normalizedUserMessage);

  if (blocked.blocked) {
    return {
      result: "blocked",
      adapter: {
        mode: "hermes_llm_adapter_mock_boundary",
        provider: "mock",
        model: "deterministic_day43_mock",
        input_accepted: false,
        requested_intent: "unknown",
        output: {
          role: "assistant",
          content: "",
          safety_notes: ["blocked_by_day43_safety_policy"],
        },
        runtime: {
          llm_runtime_executed: false,
          external_api_called: false,
          local_model_called: false,
          tokens_used: 0,
        },
      },
      boundary,
      blocked_reason: blocked.reason ?? undefined,
      matched_policy: blocked.matched_policy ?? undefined,
    };
  }

  const requestedIntent =
    input.requestedIntent ?? detectHermesRequestedIntent(normalizedUserMessage);

  const safeContext = input.safeContext ?? {};

  return {
    result: "ok",
    adapter: {
      mode: "hermes_llm_adapter_mock_boundary",
      provider: "mock",
      model: "deterministic_day43_mock",
      input_accepted: true,
      requested_intent: requestedIntent,
      output: {
        role: "assistant",
        content: buildDeterministicContent({
          intent: requestedIntent,
          safeContext,
        }),
        safety_notes: [
          "deterministic_mock_response_only",
          "no_llm_runtime",
          "no_external_api",
          "no_local_model",
          "no_chat_history_write",
          "no_proposal_write",
          "no_proposal_apply",
          "restricted_domain_data_redacted",
        ],
      },
      runtime: {
        llm_runtime_executed: false,
        external_api_called: false,
        local_model_called: false,
        tokens_used: 0,
      },
    },
    boundary,
  };
}
