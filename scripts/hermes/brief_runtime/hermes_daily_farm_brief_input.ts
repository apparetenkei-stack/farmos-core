export const HERMES_DAILY_FARM_BRIEF_INTEGRATION_TIMEOUT_MS = 10_000;

export type HermesDailyFarmBriefReaderStatus = "returned" | "failed";

export type HermesDailyFarmBriefIntegrationInput = {
  schema_version: "hermes.daily_farm_brief.input.v1";
  operational_result: unknown;
  memory_context_result: unknown;
  generated_at: string;
  timezone: string;
  source_provenance: {
    operational: {
      source_contract: "day92_hermes_operational_readonly_client";
      reader_status: HermesDailyFarmBriefReaderStatus;
      reader_call_count: 1;
    };
    memory: {
      source_contract: "hermes_memory_context_read_boundary";
      reader_status: HermesDailyFarmBriefReaderStatus;
      reader_call_count: 1;
      canonical_timestamp_available: false;
    };
  };
  safety: {
    database_write_performed: false;
    app_db_write_performed: false;
    core_db_write_performed: false;
    proposal_created: false;
    proposal_saved: false;
    proposal_apply_performed: false;
    audit_write_performed: false;
    notification_performed: false;
    queue_operation_performed: false;
    worker_claim_performed: false;
    model_execution_performed: false;
    secret_exposed: false;
    arbitrary_endpoint_allowed: false;
    client_policy_override_allowed: false;
    fail_closed: true;
  };
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, expected: readonly string[]): boolean {
  return (
    Object.keys(value).length === expected.length &&
    expected.every((key) => Object.hasOwn(value, key))
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

export function isSupportedHermesDailyFarmBriefTimezone(
  value: unknown,
): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > 64) {
    return false;
  }

  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value }).format(0);
    return true;
  } catch {
    return false;
  }
}

export function createHermesDailyFarmBriefIntegrationInput(input: {
  operationalResult: unknown;
  operationalReaderStatus: HermesDailyFarmBriefReaderStatus;
  memoryContextResult: unknown;
  memoryReaderStatus: HermesDailyFarmBriefReaderStatus;
  generatedAt: string;
  timezone: string;
}): HermesDailyFarmBriefIntegrationInput {
  if (
    !isCanonicalIso(input.generatedAt) ||
    !isSupportedHermesDailyFarmBriefTimezone(input.timezone)
  ) {
    throw new Error("daily_farm_brief_integration_input_invalid");
  }

  return {
    schema_version: "hermes.daily_farm_brief.input.v1",
    operational_result: input.operationalResult,
    memory_context_result: input.memoryContextResult,
    generated_at: input.generatedAt,
    timezone: input.timezone,
    source_provenance: {
      operational: {
        source_contract: "day92_hermes_operational_readonly_client",
        reader_status: input.operationalReaderStatus,
        reader_call_count: 1,
      },
      memory: {
        source_contract: "hermes_memory_context_read_boundary",
        reader_status: input.memoryReaderStatus,
        reader_call_count: 1,
        canonical_timestamp_available: false,
      },
    },
    safety: {
      database_write_performed: false,
      app_db_write_performed: false,
      core_db_write_performed: false,
      proposal_created: false,
      proposal_saved: false,
      proposal_apply_performed: false,
      audit_write_performed: false,
      notification_performed: false,
      queue_operation_performed: false,
      worker_claim_performed: false,
      model_execution_performed: false,
      secret_exposed: false,
      arbitrary_endpoint_allowed: false,
      client_policy_override_allowed: false,
      fail_closed: true,
    },
  };
}

export function parseHermesDailyFarmBriefIntegrationInput(
  value: unknown,
): HermesDailyFarmBriefIntegrationInput | null {
  try {
    const input = typeof value === "string" ? JSON.parse(value) : value;
    if (
      !isRecord(input) ||
      !hasExactKeys(input, [
        "schema_version",
        "operational_result",
        "memory_context_result",
        "generated_at",
        "timezone",
        "source_provenance",
        "safety",
      ]) ||
      input.schema_version !== "hermes.daily_farm_brief.input.v1" ||
      !isCanonicalIso(input.generated_at) ||
      !isSupportedHermesDailyFarmBriefTimezone(input.timezone) ||
      !isRecord(input.source_provenance) ||
      !hasExactKeys(input.source_provenance, ["operational", "memory"]) ||
      !isRecord(input.source_provenance.operational) ||
      !hasExactKeys(input.source_provenance.operational, [
        "source_contract",
        "reader_status",
        "reader_call_count",
      ]) ||
      input.source_provenance.operational.source_contract !==
        "day92_hermes_operational_readonly_client" ||
      !["returned", "failed"].includes(
        String(input.source_provenance.operational.reader_status),
      ) ||
      input.source_provenance.operational.reader_call_count !== 1 ||
      !isRecord(input.source_provenance.memory) ||
      !hasExactKeys(input.source_provenance.memory, [
        "source_contract",
        "reader_status",
        "reader_call_count",
        "canonical_timestamp_available",
      ]) ||
      input.source_provenance.memory.source_contract !==
        "hermes_memory_context_read_boundary" ||
      !["returned", "failed"].includes(
        String(input.source_provenance.memory.reader_status),
      ) ||
      input.source_provenance.memory.reader_call_count !== 1 ||
      input.source_provenance.memory.canonical_timestamp_available !== false ||
      !isRecord(input.safety) ||
      !hasExactKeys(input.safety, [
        "database_write_performed",
        "app_db_write_performed",
        "core_db_write_performed",
        "proposal_created",
        "proposal_saved",
        "proposal_apply_performed",
        "audit_write_performed",
        "notification_performed",
        "queue_operation_performed",
        "worker_claim_performed",
        "model_execution_performed",
        "secret_exposed",
        "arbitrary_endpoint_allowed",
        "client_policy_override_allowed",
        "fail_closed",
      ]) ||
      input.safety.database_write_performed !== false ||
      input.safety.app_db_write_performed !== false ||
      input.safety.core_db_write_performed !== false ||
      input.safety.proposal_created !== false ||
      input.safety.proposal_saved !== false ||
      input.safety.proposal_apply_performed !== false ||
      input.safety.audit_write_performed !== false ||
      input.safety.notification_performed !== false ||
      input.safety.queue_operation_performed !== false ||
      input.safety.worker_claim_performed !== false ||
      input.safety.model_execution_performed !== false ||
      input.safety.secret_exposed !== false ||
      input.safety.arbitrary_endpoint_allowed !== false ||
      input.safety.client_policy_override_allowed !== false ||
      input.safety.fail_closed !== true
    ) {
      return null;
    }
    return input as HermesDailyFarmBriefIntegrationInput;
  } catch {
    return null;
  }
}
