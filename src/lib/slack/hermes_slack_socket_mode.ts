type EnvMap = Record<string, string | undefined>;
type HermesApplicationBody = Record<string, unknown> & {
  status?: unknown;
  response_text?: unknown;
  error_message?: unknown;
};
export type HermesSlackFreshnessEvidence = {
  inventory_observed_at: string | null;
  work_log_observed_at: string | null;
  inventory_source_updated_at: string | null;
  work_log_source_updated_at: string | null;
};
type HermesApplicationResult = {
  httpStatus: number;
  body: HermesApplicationBody;
  freshness: HermesSlackFreshnessEvidence | null;
};

export type HermesSlackSlashCommand = {
  command: string;
  text: string;
  team_id: string;
  channel_id: string;
  user_id: string;
};

export type HermesSlackLogEvent = {
  level: "info" | "warn" | "error";
  event: string;
  request_id: string | null;
  error_code: string | null;
};

export type HermesSlackStartup =
  | {
      status: "disabled";
      error_code: null;
      missing_env_names: [];
    }
  | {
      status: "blocked";
      error_code:
        | "slack_secret_missing"
        | "slack_allowlist_missing"
        | "hermes_production_provider_required"
        | "slack_freshness_policy_invalid"
        | "farmos_app_url_invalid";
      missing_env_names: string[];
    }
  | {
      status: "ready";
      error_code: null;
      missing_env_names: [];
    };

export type HermesSlackCommandResult = {
  status:
    | "disabled"
    | "blocked"
    | "unauthorized"
    | "invalid_input"
    | "succeeded"
    | "hermes_timeout"
    | "hermes_unavailable"
    | "readonly_context_unavailable"
    | "stale_context_rejected"
    | "write_boundary_violation"
    | "projection_missing"
    | "projection_stale"
    | "projection_unavailable"
    | "clarification_required"
    | "deep_analysis_unavailable"
    | "guard_rejected"
    | "slack_response_failed";
  error_code: string | null;
  request_id: string;
  ack_sent: true;
  hermes_called: boolean;
  ephemeral_response_attempted: boolean;
  normal_channel_post_performed: false;
  db_write_performed: false;
  proposal_write_performed: false;
  approval_created: false;
  apply_performed: false;
};

type ReadyConfig = {
  appToken: string;
  botToken: string;
  allowedWorkspaceIds: ReadonlySet<string>;
  allowedChannelIds: ReadonlySet<string>;
  allowedUserIds: ReadonlySet<string>;
  provider: "ollama";
  farmosAppUrl: string;
  readonlyMaxAgeMs: number;
};

type HermesInvoker = (request: {
  body: {
    message: string;
    includeReadonlyContext: true;
    provider: "ollama";
  };
  requestId: string;
}) => Promise<HermesApplicationResult>;

export type HermesSlackProjectionFirstInvocation = {
  query: string;
  requestId: string;
  workspace_id: string;
  channel_id: string;
  user_id: string;
  actor: {
    subject_id: string;
    channel: "slack";
    actor_authorized: true;
    authorization_evidence_id: string;
    authentication_method: "slack_allowlist";
  };
};

export type HermesSlackProjectionFirstResult = {
  status:
    | "answered"
    | "projection_missing"
    | "projection_stale"
    | "projection_unavailable"
    | "clarification_required"
    | "deep_analysis_unavailable"
    | "guard_rejected";
  text: string;
};

type ProjectionFirstInvoker = (
  request: HermesSlackProjectionFirstInvocation,
) => Promise<HermesSlackProjectionFirstResult>;

type EphemeralResponder = (request: {
  channel: string;
  user: string;
  text: string;
  botToken: string;
}) => Promise<void>;

const REQUIRED_SECRET_NAMES = [
  "SLACK_APP_TOKEN",
  "SLACK_BOT_TOKEN",
] as const;

const REQUIRED_ALLOWLIST_NAMES = [
  "SLACK_ALLOWED_WORKSPACE_IDS",
  "SLACK_ALLOWED_CHANNEL_IDS",
  "SLACK_ALLOWED_USER_IDS",
] as const;
const DEFAULT_READONLY_MAX_AGE_SECONDS = 300;
const MAX_READONLY_MAX_AGE_SECONDS = 3_600;

const WRITE_BOUNDARY_FIELDS = [
  "context_write_allowed",
  "db_write_performed",
  "app_db_write_performed",
  "proposal_created",
  "proposal_saved",
  "proposal_apply_performed",
  "proposal_draft_created",
  "proposal_draft_saved",
  "proposal_draft_persisted",
  "proposal_draft_apply_ready",
  "chat_history_saved",
  "audit_record_saved",
  "credentials_exposed",
] as const;

function parseAllowlist(value: string | undefined): ReadonlySet<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((item) => item.trim())
      .filter((item) => item.length > 0),
  );
}

function parseReadonlyMaxAgeMs(value: string | undefined): number | null {
  if (value === undefined || value.trim().length === 0) {
    return DEFAULT_READONLY_MAX_AGE_SECONDS * 1_000;
  }
  const seconds = Number.parseInt(value, 10);
  if (
    !Number.isSafeInteger(seconds) ||
    String(seconds) !== value.trim() ||
    seconds < 1 ||
    seconds > MAX_READONLY_MAX_AGE_SECONDS
  ) {
    return null;
  }
  return seconds * 1_000;
}

function resolveStartup(env: EnvMap): {
  startup: HermesSlackStartup;
  config: ReadyConfig | null;
} {
  if (
    env.SLACK_INTEGRATION_ENABLED !== "true" ||
    env.SLACK_SOCKET_MODE_ENABLED !== "true"
  ) {
    return {
      startup: {
        status: "disabled",
        error_code: null,
        missing_env_names: [],
      },
      config: null,
    };
  }

  const missingSecrets = REQUIRED_SECRET_NAMES.filter(
    (name) => !env[name]?.trim(),
  );
  if (missingSecrets.length > 0) {
    return {
      startup: {
        status: "blocked",
        error_code: "slack_secret_missing",
        missing_env_names: [...missingSecrets],
      },
      config: null,
    };
  }

  const missingAllowlists = REQUIRED_ALLOWLIST_NAMES.filter(
    (name) => parseAllowlist(env[name]).size === 0,
  );
  if (missingAllowlists.length > 0) {
    return {
      startup: {
        status: "blocked",
        error_code: "slack_allowlist_missing",
        missing_env_names: [...missingAllowlists],
      },
      config: null,
    };
  }

  const provider = env.HERMES_LLM_PROVIDER ?? "ollama";
  if (provider !== "ollama") {
    return {
      startup: {
        status: "blocked",
        error_code: "hermes_production_provider_required",
        missing_env_names: [],
      },
      config: null,
    };
  }

  const readonlyMaxAgeMs = parseReadonlyMaxAgeMs(
    env.SLACK_READONLY_MAX_AGE_SECONDS,
  );
  if (readonlyMaxAgeMs === null) {
    return {
      startup: {
        status: "blocked",
        error_code: "slack_freshness_policy_invalid",
        missing_env_names: [],
      },
      config: null,
    };
  }

  const farmosAppUrl = env.FARMOS_APP_URL ?? "http://127.0.0.1:3000";
  try {
    const parsed = new URL(farmosAppUrl);
    if (
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username.length > 0 ||
      parsed.password.length > 0 ||
      parsed.search.length > 0 ||
      parsed.hash.length > 0
    ) {
      throw new Error("unsafe_farmos_app_url");
    }
  } catch {
    return {
      startup: {
        status: "blocked",
        error_code: "farmos_app_url_invalid",
        missing_env_names: [],
      },
      config: null,
    };
  }

  return {
    startup: {
      status: "ready",
      error_code: null,
      missing_env_names: [],
    },
    config: {
      appToken: env.SLACK_APP_TOKEN as string,
      botToken: env.SLACK_BOT_TOKEN as string,
      allowedWorkspaceIds: parseAllowlist(env.SLACK_ALLOWED_WORKSPACE_IDS),
      allowedChannelIds: parseAllowlist(env.SLACK_ALLOWED_CHANNEL_IDS),
      allowedUserIds: parseAllowlist(env.SLACK_ALLOWED_USER_IDS),
      provider,
      farmosAppUrl,
      readonlyMaxAgeMs,
    },
  };
}

function makeResult(input: {
  status: HermesSlackCommandResult["status"];
  errorCode: string | null;
  requestId: string;
  hermesCalled?: boolean;
  ephemeralResponseAttempted?: boolean;
}): HermesSlackCommandResult {
  return {
    status: input.status,
    error_code: input.errorCode,
    request_id: input.requestId,
    ack_sent: true,
    hermes_called: input.hermesCalled ?? false,
    ephemeral_response_attempted:
      input.ephemeralResponseAttempted ?? false,
    normal_channel_post_performed: false,
    db_write_performed: false,
    proposal_write_performed: false,
    approval_created: false,
    apply_performed: false,
  };
}

function validateCommandText(text: unknown): string | null {
  if (typeof text !== "string" || text.trim().length === 0) {
    return "slack_message_empty";
  }
  if (text.length > 500) return "slack_message_too_long";
  if (/[\r\n]/u.test(text)) return "slack_message_multiline_not_allowed";
  return null;
}

function writeBoundaryVerified(body: HermesApplicationBody): boolean {
  return WRITE_BOUNDARY_FIELDS.every((field) => body[field] === false);
}

function readonlyBoundaryVerified(body: HermesApplicationBody): boolean {
  return (
    body.readonly_context_requested === true &&
    body.readonly_context_read_performed === true &&
    body.readonly_context_included === true &&
    body.readonly_context_truncated === false &&
    body.error_message === null &&
    body.operational_context_requested === true &&
    body.operational_context_included === true &&
    body.inventory_source_connected === true &&
    body.work_log_source_connected === true
  );
}

function isCanonicalIso(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

function freshnessVerified(input: {
  freshness: HermesSlackFreshnessEvidence | null;
  nowMs: number;
  maxAgeMs: number;
}): boolean {
  if (!input.freshness || !Number.isFinite(input.nowMs)) return false;
  return [
    input.freshness.inventory_observed_at,
    input.freshness.work_log_observed_at,
  ].every((value) => {
    if (!isCanonicalIso(value)) return false;
    const timestamp = Date.parse(value);
    const ageMs = input.nowMs - timestamp;
    return ageMs >= 0 && ageMs <= input.maxAgeMs;
  });
}

function staleAndMissingSummary(input: {
  body: HermesApplicationBody;
  freshness: HermesSlackFreshnessEvidence | null;
  nowMs: number;
  maxAgeMs: number;
}): string {
  const body = input.body;
  const items: string[] = [];

  if (body.readonly_context_read_performed !== true) {
    items.push("農場データ: 未取得");
  } else if (typeof body.error_message === "string" && body.error_message) {
    items.push("農場データ: 取得失敗");
  } else if (body.readonly_context_included !== true) {
    items.push("農場データ: 不足");
  }

  if (body.readonly_context_truncated === true) {
    items.push("参照範囲: 上限により一部省略");
  }

  if (body.operational_context_requested === true) {
    if (body.inventory_source_connected !== true) {
      items.push("在庫情報: 未接続");
    } else if (body.inventory_record_count === 0) {
      items.push("在庫情報: 0件");
    }

    if (body.work_log_source_connected !== true) {
      items.push("作業記録: 未接続");
    } else if (body.work_log_record_count === 0) {
      items.push("作業記録: 0件");
    }
  }

  items.push(
    freshnessVerified(input)
      ? `取得鮮度: 検証済み（最大${Math.floor(input.maxAgeMs / 1_000)}秒）`
      : "取得鮮度: 不明または期限超過",
  );
  const sourceUpdateItems = input.freshness
    ? [
        ["在庫", input.freshness.inventory_source_updated_at],
        ["作業記録", input.freshness.work_log_source_updated_at],
      ].map(([label, value]) =>
        isCanonicalIso(value)
          ? `${label} ${value}`
          : `${label} 情報未提供`,
      )
    : [];
  items.push(
    `業務データ更新時刻: ${
      sourceUpdateItems.length > 0
        ? sourceUpdateItems.join("、")
        : "情報未提供"
    }`,
  );
  return items.join("、");
}

function formatEphemeralResponse(input: {
  answer: string;
  referencedAt: string;
  appUrl: string;
  body: HermesApplicationBody;
  freshness: HermesSlackFreshnessEvidence | null;
  nowMs: number;
  maxAgeMs: number;
}): string {
  const localizedAnswer = input.answer
    .replace(/\btomorrow\b/giu, "明日")
    .replace(/\btoday\b/giu, "今日")
    .replace(/\byesterday\b/giu, "昨日");
  return [
    "Interactive Response（Slash Command実行者限定）",
    `Hermes回答:\n${localizedAnswer}`,
    "AIによる参考情報です。確定判断や業務実行ではありません。",
    "農場データはread-only参照です。",
    `参照時刻: ${input.referencedAt}`,
    `staleまたは不足情報: ${staleAndMissingSummary({
      body: input.body,
      freshness: input.freshness,
      nowMs: input.nowMs,
      maxAgeMs: input.maxAgeMs,
    })}`,
    `営農アプリ: ${input.appUrl}`,
  ].join("\n");
}

function formatProjectionFirstEphemeralResponse(input: {
  text: string;
  referencedAt: string;
  appUrl: string;
}): string {
  return [
    "Interactive Response（Slash Command実行者限定）",
    `Hermes回答:\n${input.text}`,
    "AIによる参考情報です。確定判断や業務実行ではありません。",
    "農場データはread-only参照です。",
    `参照時刻: ${input.referencedAt}`,
    `営農アプリ: ${input.appUrl}`,
  ].join("\n");
}

export function createHermesSlackIntegration(input: {
  env?: EnvMap;
  invokeHermes?: HermesInvoker;
  invokeProjectionFirst?: ProjectionFirstInvoker;
  postEphemeralResponse: EphemeralResponder;
  log?: (event: HermesSlackLogEvent) => void;
  requestIdFactory?: () => string;
  nowIso?: () => string;
  nowMs?: () => number;
}): {
  startup: HermesSlackStartup;
  appToken: string | null;
  handleSlashCommand: (
    payload: HermesSlackSlashCommand,
    ack: () => void,
    options?: { requestId?: string },
  ) => Promise<HermesSlackCommandResult>;
} {
  const env = input.env ?? process.env;
  const resolved = resolveStartup(env);
  const log = input.log ?? (() => undefined);
  const requestIdFactory =
    input.requestIdFactory ?? (() => crypto.randomUUID());
  const nowIso = input.nowIso ?? (() => new Date().toISOString());
  const nowMs = input.nowMs ?? Date.now;

  const handleSlashCommand = async (
    payload: HermesSlackSlashCommand,
    ack: () => void,
    options?: { requestId?: string },
  ): Promise<HermesSlackCommandResult> => {
    ack();
    const requestId = options?.requestId ?? requestIdFactory();

    if (resolved.startup.status !== "ready" || !resolved.config) {
      const status =
        resolved.startup.status === "disabled" ? "disabled" : "blocked";
      log({
        level: "warn",
        event: "slack_interactive_response_ignored",
        request_id: requestId,
        error_code: resolved.startup.error_code,
      });
      return makeResult({
        status,
        errorCode: resolved.startup.error_code,
        requestId,
      });
    }

    const config = resolved.config;
    const authorized =
      config.allowedWorkspaceIds.has(payload.team_id) &&
      config.allowedChannelIds.has(payload.channel_id) &&
      config.allowedUserIds.has(payload.user_id);

    if (!authorized) {
      log({
        level: "warn",
        event: "slack_interactive_response_denied",
        request_id: requestId,
        error_code: "slack_actor_not_allowed",
      });
      return makeResult({
        status: "unauthorized",
        errorCode: "slack_actor_not_allowed",
        requestId,
      });
    }

    const inputError = validateCommandText(payload.text);
    if (payload.command !== "/hermes" || inputError) {
      const errorCode =
        payload.command === "/hermes"
          ? (inputError as string)
          : "slack_command_not_supported";
      try {
        await input.postEphemeralResponse({
          channel: payload.channel_id,
          user: payload.user_id,
          botToken: config.botToken,
          text: formatEphemeralResponse({
            answer:
              errorCode === "slack_message_too_long"
                ? "入力は500文字以内にしてください。"
                : "1〜500文字の質問を入力してください。",
            referencedAt: nowIso(),
            appUrl: config.farmosAppUrl,
            body: {},
            freshness: null,
            nowMs: nowMs(),
            maxAgeMs: config.readonlyMaxAgeMs,
          }),
        });
      } catch {
        log({
          level: "error",
          event: "slack_ephemeral_response_failed",
          request_id: requestId,
          error_code: "slack_response_failed",
        });
        return makeResult({
          status: "slack_response_failed",
          errorCode: "slack_response_failed",
          requestId,
          ephemeralResponseAttempted: true,
        });
      }
      return makeResult({
        status: "invalid_input",
        errorCode,
        requestId,
        ephemeralResponseAttempted: true,
      });
    }

    if (input.invokeProjectionFirst !== undefined) {
      let projectionResult: HermesSlackProjectionFirstResult;
      try {
        projectionResult = await input.invokeProjectionFirst({
          query: payload.text,
          requestId,
          workspace_id: payload.team_id,
          channel_id: payload.channel_id,
          user_id: payload.user_id,
          actor: {
            subject_id: payload.user_id,
            channel: "slack",
            actor_authorized: true,
            authorization_evidence_id: requestId,
            authentication_method: "slack_allowlist",
          },
        });
      } catch {
        projectionResult = {
          status: "projection_unavailable",
          text: "農場情報を安全に取得できませんでした。",
        };
      }
      try {
        await input.postEphemeralResponse({
          channel: payload.channel_id,
          user: payload.user_id,
          botToken: config.botToken,
          text: formatProjectionFirstEphemeralResponse({
            text: projectionResult.text,
            referencedAt: nowIso(),
            appUrl: config.farmosAppUrl,
          }),
        });
      } catch {
        log({
          level: "error",
          event: "slack_ephemeral_response_failed",
          request_id: requestId,
          error_code: "slack_response_failed",
        });
        return makeResult({
          status: "slack_response_failed",
          errorCode: "slack_response_failed",
          requestId,
          hermesCalled: true,
          ephemeralResponseAttempted: true,
        });
      }
      log({
        level: "info",
        event: "FARMOS_PROJECTION_FIRST_SLACK_RESPONSE_READY",
        request_id: requestId,
        error_code: null,
      });
      return makeResult({
        status: projectionResult.status === "answered"
          ? "succeeded"
          : projectionResult.status,
        errorCode: projectionResult.status === "answered"
          ? null
          : projectionResult.status,
        requestId,
        hermesCalled: true,
        ephemeralResponseAttempted: true,
      });
    }

    if (input.invokeHermes === undefined) {
      try {
        await input.postEphemeralResponse({
          channel: payload.channel_id,
          user: payload.user_id,
          botToken: config.botToken,
          text: formatProjectionFirstEphemeralResponse({
            text: "農場情報を安全に取得できませんでした。",
            referencedAt: nowIso(),
            appUrl: config.farmosAppUrl,
          }),
        });
      } catch {
        return makeResult({
          status: "slack_response_failed",
          errorCode: "slack_response_failed",
          requestId,
          ephemeralResponseAttempted: true,
        });
      }
      return makeResult({
        status: "projection_unavailable",
        errorCode: "projection_unavailable",
        requestId,
        ephemeralResponseAttempted: true,
      });
    }

    let hermesBody: HermesApplicationBody;
    let freshness: HermesSlackFreshnessEvidence | null = null;
    let resultStatus: HermesSlackCommandResult["status"];
    let errorCode: string | null;

    try {
      const hermesResult = await input.invokeHermes({
        body: {
          message: payload.text,
          includeReadonlyContext: true,
          provider: config.provider,
        },
        requestId,
      });
      hermesBody = hermesResult.body;
      freshness = hermesResult.freshness;

      if (!writeBoundaryVerified(hermesBody)) {
        resultStatus = "write_boundary_violation";
        errorCode = "hermes_write_boundary_violation";
      } else if (hermesBody.status === "timeout") {
        resultStatus = "hermes_timeout";
        errorCode = "hermes_timeout";
      } else if (
        hermesBody.status === "ok" &&
        !readonlyBoundaryVerified(hermesBody)
      ) {
        resultStatus = "readonly_context_unavailable";
        errorCode = "hermes_readonly_context_unavailable";
      } else if (
        hermesBody.status === "ok" &&
        !freshnessVerified({
          freshness,
          nowMs: nowMs(),
          maxAgeMs: config.readonlyMaxAgeMs,
        })
      ) {
        resultStatus = "stale_context_rejected";
        errorCode = "hermes_readonly_context_stale_or_unknown";
      } else if (
        hermesBody.status === "ok" &&
        typeof hermesBody.response_text === "string" &&
        hermesBody.response_text.trim().length > 0
      ) {
        resultStatus = "succeeded";
        errorCode = null;
      } else {
        resultStatus = "hermes_unavailable";
        errorCode = "hermes_unavailable";
      }
    } catch {
      hermesBody = {};
      resultStatus = "hermes_unavailable";
      errorCode = "hermes_unavailable";
    }

    const answer =
      resultStatus === "succeeded"
        ? (hermesBody.response_text as string)
        : resultStatus === "hermes_timeout"
          ? "Hermesの応答がタイムアウトしました。時間をおいて再試行してください。"
          : resultStatus === "write_boundary_violation"
            ? "安全なread-only境界を確認できなかったため、回答を停止しました。"
            : resultStatus === "readonly_context_unavailable"
              ? "read-only農場データを確認できなかったため、回答を停止しました。"
              : resultStatus === "stale_context_rejected"
                ? "農場データの鮮度を確認できなかったため、回答を停止しました。"
              : "Hermesを現在利用できません。時間をおいて再試行してください。";

    try {
      await input.postEphemeralResponse({
        channel: payload.channel_id,
        user: payload.user_id,
        botToken: config.botToken,
        text: formatEphemeralResponse({
          answer,
          referencedAt: nowIso(),
          appUrl: config.farmosAppUrl,
          body: hermesBody,
          freshness,
          nowMs: nowMs(),
          maxAgeMs: config.readonlyMaxAgeMs,
        }),
      });
    } catch {
      log({
        level: "error",
        event: "slack_ephemeral_response_failed",
        request_id: requestId,
        error_code: "slack_response_failed",
      });
      return makeResult({
        status: "slack_response_failed",
        errorCode: "slack_response_failed",
        requestId,
        hermesCalled: true,
        ephemeralResponseAttempted: true,
      });
    }

    log({
      level: resultStatus === "succeeded" ? "info" : "warn",
      event: "slack_interactive_response_completed",
      request_id: requestId,
      error_code: errorCode,
    });
    return makeResult({
      status: resultStatus,
      errorCode,
      requestId,
      hermesCalled: true,
      ephemeralResponseAttempted: true,
    });
  };

  return {
    startup: resolved.startup,
    appToken: resolved.config?.appToken ?? null,
    handleSlashCommand,
  };
}
