export type HermesDailyFarmSourceType =
  | "inventory"
  | "work_log"
  | "field"
  | "crop_cycle"
  | "hermes_note";

export type HermesDailyFarmFreshness = "fresh" | "stale" | "unknown";

export const HERMES_DAILY_FARM_SOURCE_ORDER = [
  "inventory",
  "work_log",
  "field",
  "crop_cycle",
  "hermes_note",
] as const satisfies readonly HermesDailyFarmSourceType[];

export const HERMES_DAILY_FARM_BRIEF_POLICY = {
  schema_version: "hermes.daily_farm_brief.policy.v1" as const,
  required_sources: ["inventory", "work_log"] as const,
  optional_sources: ["field", "crop_cycle", "hermes_note"] as const,
  source_freshness_ms: {
    inventory: 24 * 60 * 60 * 1_000,
    work_log: 24 * 60 * 60 * 1_000,
    field: 7 * 24 * 60 * 60 * 1_000,
    crop_cycle: 7 * 24 * 60 * 60 * 1_000,
    hermes_note: 7 * 24 * 60 * 60 * 1_000,
  },
  source_record_limits: {
    inventory: 20,
    work_log: 10,
    field: 20,
    crop_cycle: 20,
    hermes_note: 10,
  },
  maximum_facts: 10,
  maximum_limitations: 50,
  maximum_text_chars: 120,
  severity_order: ["warning", "info"] as const,
  source: "server_policy" as const,
  safety: {
    client_policy_override_allowed: false,
    client_limit_override_allowed: false,
    threshold_inference_allowed: false,
    external_fetch_allowed: false,
    database_write_allowed: false,
    business_db_write_allowed: false,
    proposal_write_allowed: false,
    audit_write_allowed: false,
    notification_allowed: false,
    queue_operation_allowed: false,
    worker_claim_allowed: false,
    secret_access_allowed: false,
    model_execution_allowed: false,
    fail_closed: true as const,
  },
};

function isCanonicalIso(value: string): boolean {
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

export function isHermesDailyFarmSourceTimestampInvalid(input: {
  generatedAt: string | null;
  nowIso: string;
}): boolean {
  if (!isCanonicalIso(input.nowIso)) {
    return true;
  }

  if (input.generatedAt === null) {
    return false;
  }

  return (
    !isCanonicalIso(input.generatedAt) ||
    Date.parse(input.generatedAt) > Date.parse(input.nowIso)
  );
}

export function evaluateHermesDailyFarmFreshness(input: {
  sourceType: HermesDailyFarmSourceType;
  generatedAt: string | null;
  nowIso: string;
}): HermesDailyFarmFreshness {
  if (
    input.generatedAt === null ||
    isHermesDailyFarmSourceTimestampInvalid(input)
  ) {
    return "unknown";
  }

  const ageMs = Date.parse(input.nowIso) - Date.parse(input.generatedAt);
  return ageMs <
    HERMES_DAILY_FARM_BRIEF_POLICY.source_freshness_ms[input.sourceType]
    ? "fresh"
    : "stale";
}
