import { isHermesOperationalOpaqueReference } from "./hermes_operational_reference_contract";

export const HERMES_FIELDS_TOOL_ID =
  "farming_app.fields.read.v1" as const;
export const HERMES_FIELDS_TOOL_CONTRACT_VERSION = 1 as const;
export const HERMES_FIELDS_TOOL_DEFAULT_LIMIT = 100 as const;
export const HERMES_FIELDS_TOOL_MAXIMUM_LIMIT = 100 as const;
export const HERMES_FIELDS_TOOL_SOURCE_CONTRACT =
  "rpc_read_hermes_fields" as const;
export const HERMES_FIELDS_TOOL_SCOPE_POLICY =
  "single-farm deployment scope" as const;

export const HERMES_FIELDS_TOOL_DEFINITION = Object.freeze({
  tool_id: HERMES_FIELDS_TOOL_ID,
  version: HERMES_FIELDS_TOOL_CONTRACT_VERSION,
  mode: "read_only",
  source_system: "farming_app",
  source_contract: HERMES_FIELDS_TOOL_SOURCE_CONTRACT,
  input_schema: {
    exact_keys: ["limit"],
  },
  output_schema: {
    exact_row_keys: ["id", "name"],
  },
  default_limit: HERMES_FIELDS_TOOL_DEFAULT_LIMIT,
  maximum_limit: HERMES_FIELDS_TOOL_MAXIMUM_LIMIT,
  sort_order: "id ASC",
  scope_policy: HERMES_FIELDS_TOOL_SCOPE_POLICY,
  freshness: {
    source_updated_at: "unavailable",
    maximum_staleness: "unavailable",
    allowed_status: ["freshness_unknown"],
  },
  data_classification: {
    allowed: ["field_id", "field_display_name"],
    forbidden: [
      "coordinates",
      "address",
      "personal_data",
      "pricing",
      "cost",
      "internal_notes",
      "credentials",
    ],
  },
  authority: {
    may_read: true,
    may_write: false,
    may_create_proposal: false,
    may_approve: false,
    may_execute: false,
    may_chain_tools: false,
  },
} as const);

export type HermesFieldsToolInput = {
  limit: number;
};

export type HermesFieldsToolRow = {
  id: string;
  name: string;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return (
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isSafeDisplayName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length <= 120 &&
    !/[\u0000-\u001f\u007f]/u.test(value)
  );
}

export function getHermesReadonlyToolDefinition(
  toolId: unknown,
): typeof HERMES_FIELDS_TOOL_DEFINITION | null {
  return toolId === HERMES_FIELDS_TOOL_ID
    ? HERMES_FIELDS_TOOL_DEFINITION
    : null;
}

export function parseHermesFieldsToolInput(
  value: unknown,
): HermesFieldsToolInput | null {
  const candidate = value === undefined ? {} : value;
  if (!isRecord(candidate)) return null;
  const keys = Object.keys(candidate);
  if (
    keys.length > 1 ||
    (keys.length === 1 && keys[0] !== "limit")
  ) {
    return null;
  }
  if (keys.length === 0) {
    return { limit: HERMES_FIELDS_TOOL_DEFAULT_LIMIT };
  }
  if (
    typeof candidate.limit !== "number" ||
    !Number.isSafeInteger(candidate.limit) ||
    candidate.limit < 1 ||
    candidate.limit > HERMES_FIELDS_TOOL_MAXIMUM_LIMIT
  ) {
    return null;
  }
  return { limit: candidate.limit };
}

export function parseHermesFieldsToolRows(
  value: unknown,
): HermesFieldsToolRow[] | null {
  if (
    !Array.isArray(value) ||
    value.length > HERMES_FIELDS_TOOL_MAXIMUM_LIMIT
  ) {
    return null;
  }
  const rows: HermesFieldsToolRow[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (
      !isRecord(candidate) ||
      !hasExactKeys(candidate, ["id", "name"]) ||
      !isHermesOperationalOpaqueReference(candidate.id) ||
      !isSafeDisplayName(candidate.name) ||
      seen.has(candidate.id)
    ) {
      return null;
    }
    seen.add(candidate.id);
    rows.push({ id: candidate.id, name: candidate.name });
  }
  return rows;
}
