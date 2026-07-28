import {
  readHermesOperationalReadonlyFields,
  type HermesOperationalReadonlySourceResult,
  type HermesOperationalFieldRecord,
} from "./hermes_operational_readonly_client";
import {
  getHermesReadonlyToolDefinition,
  HERMES_FIELDS_TOOL_CONTRACT_VERSION,
  HERMES_FIELDS_TOOL_ID,
  HERMES_FIELDS_TOOL_SCOPE_POLICY,
  HERMES_FIELDS_TOOL_SOURCE_CONTRACT,
  parseHermesFieldsToolInput,
  parseHermesFieldsToolRows,
  type HermesFieldsToolRow,
} from "./hermes_fields_readonly_tool_registry";

export const HERMES_FIELDS_TOOL_REGISTRY_ENABLED_ENV =
  "HERMES_FIELDS_TOOL_REGISTRY_ENABLED" as const;

export type HermesFieldsToolErrorCode =
  | "authentication_required"
  | "permission_denied"
  | "configuration_unavailable"
  | "core_dependency_unavailable"
  | "farming_app_unavailable"
  | "invalid_tool_input"
  | "invalid_tool_output"
  | "stale_data"
  | "safety_rejected"
  | "unexpected_error";

type HermesFieldsToolSecurity = {
  untrusted_data: true;
  instructions_from_data_allowed: false;
  tool_chaining_allowed: false;
  write_authority: "none";
  proposal_creation_allowed: false;
  approval_allowed: false;
  execution_allowed: false;
};

export type HermesFieldsToolResult =
  | {
      result: "ok";
      tool_id: typeof HERMES_FIELDS_TOOL_ID;
      contract_version: typeof HERMES_FIELDS_TOOL_CONTRACT_VERSION;
      mode: "read_only";
      data: { rows: HermesFieldsToolRow[] };
      provenance: {
        source_system: "farming_app";
        source_contract: typeof HERMES_FIELDS_TOOL_SOURCE_CONTRACT;
        retrieved_at: string;
        source_updated_at: null;
        maximum_staleness: null;
        data_status: "freshness_unknown";
        scope_policy: typeof HERMES_FIELDS_TOOL_SCOPE_POLICY;
      };
      security: HermesFieldsToolSecurity;
    }
  | {
      result: "error";
      tool_id: typeof HERMES_FIELDS_TOOL_ID;
      error_code: HermesFieldsToolErrorCode;
      user_message: string;
      retryable: boolean;
      security: HermesFieldsToolSecurity;
    };

const SECURITY: HermesFieldsToolSecurity = Object.freeze({
  untrusted_data: true,
  instructions_from_data_allowed: false,
  tool_chaining_allowed: false,
  write_authority: "none",
  proposal_creation_allowed: false,
  approval_allowed: false,
  execution_allowed: false,
});

type FieldsReader = (input: {
  limit: number;
}) => Promise<
  HermesOperationalReadonlySourceResult<HermesOperationalFieldRecord>
>;

function errorResult(
  errorCode: HermesFieldsToolErrorCode,
): HermesFieldsToolResult {
  const messages: Record<HermesFieldsToolErrorCode, string> = {
    authentication_required: "農場データの認証が必要です。",
    permission_denied: "農場データの参照権限がありません。",
    configuration_unavailable: "農場データの参照設定を確認できません。",
    core_dependency_unavailable: "農場データの参照機能を利用できません。",
    farming_app_unavailable: "営農アプリのデータを取得できません。",
    invalid_tool_input: "fields参照条件が不正です。",
    invalid_tool_output: "fields参照結果の形式が不正です。",
    stale_data: "fieldsデータが許容期間を超えています。",
    safety_rejected: "fields read-only toolは無効です。",
    unexpected_error: "fieldsデータの参照に失敗しました。",
  };
  return {
    result: "error",
    tool_id: HERMES_FIELDS_TOOL_ID,
    error_code: errorCode,
    user_message: messages[errorCode],
    retryable: errorCode === "farming_app_unavailable",
    security: SECURITY,
  };
}

function normalizeSourceError(
  source: HermesOperationalReadonlySourceResult<HermesOperationalFieldRecord>,
): HermesFieldsToolErrorCode {
  if (source.error_code === "configuration_unavailable") {
    return "configuration_unavailable";
  }
  if (source.error_code === "invalid_limit") return "invalid_tool_input";
  if (source.error_code === "invalid_response") return "invalid_tool_output";
  if (source.error_code === "timeout" || source.error_code === "network_unavailable") {
    return "farming_app_unavailable";
  }
  if (source.http_status === 401) return "authentication_required";
  if (source.http_status === 403) return "permission_denied";
  return "farming_app_unavailable";
}

export async function runHermesFieldsReadonlyTool(input: {
  toolId: unknown;
  toolInput?: unknown;
  env?: Record<string, string | undefined>;
  readFields?: FieldsReader;
  now?: () => Date;
}): Promise<HermesFieldsToolResult> {
  const env = input.env ?? process.env;
  if (env[HERMES_FIELDS_TOOL_REGISTRY_ENABLED_ENV] !== "true") {
    return errorResult("safety_rejected");
  }
  if (getHermesReadonlyToolDefinition(input.toolId) === null) {
    return errorResult("safety_rejected");
  }
  const parsedInput = parseHermesFieldsToolInput(input.toolInput);
  if (parsedInput === null) return errorResult("invalid_tool_input");
  const now = input.now?.() ?? new Date();
  if (!Number.isFinite(now.getTime())) return errorResult("unexpected_error");

  let source: Awaited<ReturnType<FieldsReader>>;
  try {
    const readFields =
      input.readFields ??
      ((request) =>
        readHermesOperationalReadonlyFields({
          env,
          limit: request.limit,
        }));
    source = await readFields({ limit: parsedInput.limit });
  } catch {
    return errorResult("core_dependency_unavailable");
  }
  if (source.result !== "ok") {
    return errorResult(normalizeSourceError(source));
  }
  if (
    source.requested_limit !== parsedInput.limit ||
    source.record_count !== source.records.length ||
    source.records.length > parsedInput.limit
  ) {
    return errorResult("invalid_tool_output");
  }
  const rows = parseHermesFieldsToolRows(
    source.records.map((record) => ({
      id: record.reference,
      name: record.display_name,
    })),
  );
  if (rows === null) return errorResult("invalid_tool_output");

  return {
    result: "ok",
    tool_id: HERMES_FIELDS_TOOL_ID,
    contract_version: HERMES_FIELDS_TOOL_CONTRACT_VERSION,
    mode: "read_only",
    data: { rows },
    provenance: {
      source_system: "farming_app",
      source_contract: HERMES_FIELDS_TOOL_SOURCE_CONTRACT,
      retrieved_at: now.toISOString(),
      source_updated_at: null,
      maximum_staleness: null,
      data_status: "freshness_unknown",
      scope_policy: HERMES_FIELDS_TOOL_SCOPE_POLICY,
    },
    security: SECURITY,
  };
}
