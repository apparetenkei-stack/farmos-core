import {
  HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY,
  parseHermesDailyFarmBriefPersistenceCommand,
  type HermesDailyFarmBriefPersistenceCommand,
  type HermesDailyFarmBriefPersistenceCommandType,
} from "./hermes_daily_farm_brief_persistence_command_contract";
import {
  parseHermesDailyFarmBriefPersistedRecord,
  type HermesDailyFarmBriefPersistedRecord,
  type HermesDailyFarmBriefPersistedRepositoryResult,
} from "./hermes_daily_farm_brief_persisted_record_contract";
import { fingerprintHermesDailyFarmBriefPersistenceCommandPayload } from "./hermes_daily_farm_brief_persistence_fingerprint";
import { isCanonicalIso } from "./hermes_daily_farm_brief_generation_contract";

export type HermesDailyFarmBriefPersistenceErrorCode =
  | "invalid_command"
  | "invalid_record"
  | "invalid_existing_chain"
  | "idempotency_conflict"
  | "source_execution_conflict"
  | "version_conflict"
  | "concurrency_conflict"
  | "transaction_failed"
  | "repository_unavailable"
  | "future_timestamp"
  | "invalid_repository_result";

export type HermesDailyFarmBriefPersistenceRepositoryTransactionResult = {
  schema_version: "hermes.daily_farm_brief.persistence_repository_transaction_result.v1";
  status: "committed" | "reused" | "rejected" | "failed_closed";
  error_code: Exclude<HermesDailyFarmBriefPersistenceErrorCode, "invalid_command" | "invalid_repository_result" | "future_timestamp"> | null;
  transaction_committed: boolean;
  fixture_repository_write_performed: boolean;
  brief_persistence_simulated: boolean;
};

export type HermesDailyFarmBriefPersistenceWriteRepository = {
  executeCanonicalTransition: (command: HermesDailyFarmBriefPersistenceCommand) => Promise<unknown>;
};

export type HermesDailyFarmBriefPersistenceSafety = typeof HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY & {
  fixture_repository_write_performed: boolean;
  brief_persistence_simulated: boolean;
  transaction_committed: boolean;
};

export type HermesDailyFarmBriefPersistenceResult = {
  schema_version: "hermes.daily_farm_brief.persistence_result.v1";
  status: "persisted" | "reused" | "rejected" | "failed_closed";
  command_type: HermesDailyFarmBriefPersistenceCommandType | null;
  business_date: string | null;
  error_code: HermesDailyFarmBriefPersistenceErrorCode | null;
  repository_transaction_call_count: 0 | 1;
  retry_count: 0;
  safety: HermesDailyFarmBriefPersistenceSafety;
};

type JsonRecord = Record<string, unknown>;
const REPOSITORY_RESULT_KEYS = ["schema_version", "status", "error_code", "transaction_committed", "fixture_repository_write_performed", "brief_persistence_simulated"] as const;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

export function parseHermesDailyFarmBriefPersistenceRepositoryTransactionResult(
  value: unknown,
): HermesDailyFarmBriefPersistenceRepositoryTransactionResult | null {
  if (!isRecord(value) || !hasExactKeys(value, REPOSITORY_RESULT_KEYS)) return null;
  const statuses = ["committed", "reused", "rejected", "failed_closed"];
  const errors = ["invalid_record", "invalid_existing_chain", "idempotency_conflict", "source_execution_conflict", "version_conflict", "concurrency_conflict", "transaction_failed", "repository_unavailable"];
  if (
    value.schema_version !== "hermes.daily_farm_brief.persistence_repository_transaction_result.v1" ||
    !statuses.includes(String(value.status)) ||
    (value.error_code !== null && !errors.includes(String(value.error_code))) ||
    typeof value.transaction_committed !== "boolean" ||
    typeof value.fixture_repository_write_performed !== "boolean" ||
    typeof value.brief_persistence_simulated !== "boolean"
  ) return null;
  if (value.status === "committed" && (value.error_code !== null || !value.transaction_committed || !value.fixture_repository_write_performed || !value.brief_persistence_simulated)) return null;
  if (value.status === "reused" && (value.error_code !== null || !value.transaction_committed || value.fixture_repository_write_performed || value.brief_persistence_simulated)) return null;
  if ((value.status === "rejected" || value.status === "failed_closed") && (value.error_code === null || value.transaction_committed || value.fixture_repository_write_performed || value.brief_persistence_simulated)) return null;
  return value as HermesDailyFarmBriefPersistenceRepositoryTransactionResult;
}

function safety(transaction: HermesDailyFarmBriefPersistenceRepositoryTransactionResult | null): HermesDailyFarmBriefPersistenceSafety {
  return {
    ...HERMES_DAILY_FARM_BRIEF_PERSISTENCE_COMMAND_SAFETY,
    fixture_repository_write_performed: transaction?.fixture_repository_write_performed ?? false,
    brief_persistence_simulated: transaction?.brief_persistence_simulated ?? false,
    transaction_committed: transaction?.transaction_committed ?? false,
  };
}

function result(input: {
  command: HermesDailyFarmBriefPersistenceCommand | null;
  transaction: HermesDailyFarmBriefPersistenceRepositoryTransactionResult | null;
  status: HermesDailyFarmBriefPersistenceResult["status"];
  error: HermesDailyFarmBriefPersistenceErrorCode | null;
  calls: 0 | 1;
}): HermesDailyFarmBriefPersistenceResult {
  return {
    schema_version: "hermes.daily_farm_brief.persistence_result.v1",
    status: input.status,
    command_type: input.command?.command_type ?? null,
    business_date: input.command?.business_date ?? null,
    error_code: input.error,
    repository_transaction_call_count: input.calls,
    retry_count: 0,
    safety: safety(input.transaction),
  };
}

export async function persistHermesDailyFarmBrief(input: {
  command: unknown;
  repository: HermesDailyFarmBriefPersistenceWriteRepository;
  clock: () => string;
}): Promise<HermesDailyFarmBriefPersistenceResult> {
  const command = parseHermesDailyFarmBriefPersistenceCommand(input.command);
  if (command === null) return result({ command: null, transaction: null, status: "rejected", error: "invalid_command", calls: 0 });
  let now: string;
  try {
    now = input.clock();
  } catch {
    return result({ command: null, transaction: null, status: "rejected", error: "invalid_command", calls: 0 });
  }
  if (!isCanonicalIso(now) || Date.parse(command.requested_at) > Date.parse(now) || parseHermesDailyFarmBriefPersistedRecord({ value: command.record, now }) === null) {
    return result({ command: null, transaction: null, status: "rejected", error: "future_timestamp", calls: 0 });
  }
  let raw: unknown;
  try {
    raw = await input.repository.executeCanonicalTransition(command);
  } catch {
    return result({ command, transaction: null, status: "failed_closed", error: "transaction_failed", calls: 1 });
  }
  const transaction = parseHermesDailyFarmBriefPersistenceRepositoryTransactionResult(raw);
  if (transaction === null) return result({ command, transaction: null, status: "failed_closed", error: "invalid_repository_result", calls: 1 });
  const mappedStatus = transaction.status === "committed"
    ? "persisted"
    : transaction.status === "reused"
      ? "reused"
      : transaction.status;
  return result({ command, transaction, status: mappedStatus, error: transaction.error_code, calls: 1 });
}

function commandFingerprint(command: HermesDailyFarmBriefPersistenceCommand): string {
  const { command_id: _commandId, ...payload } = command;
  return fingerprintHermesDailyFarmBriefPersistenceCommandPayload(payload);
}

function sourceExecutionFingerprint(command: HermesDailyFarmBriefPersistenceCommand): string {
  const { command_id: _commandId, idempotency_key: _idempotencyKey, ...semanticPayload } = command;
  return fingerprintHermesDailyFarmBriefPersistenceCommandPayload(semanticPayload);
}

function sourceExecutionKey(command: HermesDailyFarmBriefPersistenceCommand): string {
  return `${command.command_type}\0${command.business_date}\0${command.source_execution_reference}`;
}

function repositoryResult(input: {
  status: HermesDailyFarmBriefPersistenceRepositoryTransactionResult["status"];
  error?: HermesDailyFarmBriefPersistenceRepositoryTransactionResult["error_code"];
  committed?: boolean;
  wrote?: boolean;
}): HermesDailyFarmBriefPersistenceRepositoryTransactionResult {
  return {
    schema_version: "hermes.daily_farm_brief.persistence_repository_transaction_result.v1",
    status: input.status,
    error_code: input.error ?? null,
    transaction_committed: input.committed ?? false,
    fixture_repository_write_performed: input.wrote ?? false,
    brief_persistence_simulated: input.wrote ?? false,
  };
}

function validateChains(records: HermesDailyFarmBriefPersistedRecord[]): "version_conflict" | "invalid_existing_chain" | null {
  const byId = new Map<string, HermesDailyFarmBriefPersistedRecord[]>();
  for (const record of records) byId.set(record.record_id, [...(byId.get(record.record_id) ?? []), record]);
  for (const chain of byId.values()) {
    const ordered = [...chain].sort((left, right) => left.version - right.version);
    if (new Set(ordered.map((record) => record.version)).size !== ordered.length) return "version_conflict";
    if (ordered.some((record, index) => record.version !== index + 1)) return "version_conflict";
    if (ordered.some((record) => record.business_date !== ordered[0].business_date || record.record_kind !== ordered[0].record_kind)) return "invalid_existing_chain";
    const canonical = ordered.filter((record) => record.record_status === "canonical");
    if (canonical.length !== 1 || canonical[0].version !== ordered.length || ordered.slice(0, -1).some((record) => record.record_status !== "superseded")) return "invalid_existing_chain";
  }
  return null;
}

export class HermesDailyFarmBriefFixturePersistenceRepository implements HermesDailyFarmBriefPersistenceWriteRepository {
  transactionCallCount = 0;
  readCount = 0;
  private records: unknown[];
  private readonly idempotency = new Map<string, string>();
  private readonly sourceExecutions = new Map<string, string>();
  private failNext = false;

  constructor(initialRecords: unknown[] = []) {
    this.records = structuredClone(initialRecords);
  }

  failNextTransaction(): void {
    this.failNext = true;
  }

  inspectRecords(): unknown[] {
    return structuredClone(this.records);
  }

  async readRecordCandidates(): Promise<HermesDailyFarmBriefPersistedRepositoryResult> {
    this.readCount += 1;
    return {
      schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1",
      status: "ok",
      transaction_read_only: true,
      records: structuredClone(this.records),
    };
  }

  async executeCanonicalTransition(commandValue: HermesDailyFarmBriefPersistenceCommand): Promise<unknown> {
    this.transactionCallCount += 1;
    const command = parseHermesDailyFarmBriefPersistenceCommand(commandValue);
    if (command === null) return repositoryResult({ status: "rejected", error: "invalid_record" });
    const fingerprint = commandFingerprint(command);
    const existingFingerprint = this.idempotency.get(command.idempotency_key);
    if (existingFingerprint !== undefined) {
      return existingFingerprint === fingerprint
        ? repositoryResult({ status: "reused", committed: true })
        : repositoryResult({ status: "rejected", error: "idempotency_conflict" });
    }
    const executionKey = sourceExecutionKey(command);
    const executionFingerprint = sourceExecutionFingerprint(command);
    const existingExecutionFingerprint = this.sourceExecutions.get(executionKey);
    if (existingExecutionFingerprint !== undefined) {
      return existingExecutionFingerprint === executionFingerprint
        ? repositoryResult({ status: "reused", committed: true })
        : repositoryResult({ status: "rejected", error: "source_execution_conflict" });
    }
    if (this.failNext) {
      this.failNext = false;
      return repositoryResult({ status: "failed_closed", error: "transaction_failed" });
    }

    const parsed: HermesDailyFarmBriefPersistedRecord[] = [];
    for (const value of this.records) {
      const record = parseHermesDailyFarmBriefPersistedRecord({ value, now: command.requested_at });
      if (record === null) return repositoryResult({ status: "rejected", error: "invalid_existing_chain" });
      parsed.push(record);
    }
    const chainError = validateChains(parsed);
    if (chainError !== null) return repositoryResult({ status: "rejected", error: chainError });
    const sameCanonical = parsed.filter((record) =>
      record.business_date === command.business_date &&
      record.record_kind === command.record.record_kind &&
      record.record_status === "canonical");
    if (sameCanonical.length > 1) return repositoryResult({ status: "rejected", error: "concurrency_conflict" });
    const current = sameCanonical[0] ?? null;
    if (current !== null && current.record_id !== command.record.record_id) return repositoryResult({ status: "rejected", error: "concurrency_conflict" });
    const currentVersion = current?.version ?? null;
    if (currentVersion !== command.expected_current_version) return repositoryResult({ status: "rejected", error: "version_conflict" });

    const staged = parsed.map((record) => current !== null && record.record_id === current.record_id && record.version === current.version
      ? { ...record, record_status: "superseded" as const, updated_at: command.requested_at }
      : record);
    staged.push(structuredClone(command.record));
    const stagedError = validateChains(staged);
    if (stagedError !== null) return repositoryResult({ status: "rejected", error: stagedError });
    this.records = staged;
    this.idempotency.set(command.idempotency_key, fingerprint);
    this.sourceExecutions.set(executionKey, executionFingerprint);
    return repositoryResult({ status: "committed", committed: true, wrote: true });
  }
}

export class HermesDailyFarmBriefDenyByDefaultPersistenceRepository implements HermesDailyFarmBriefPersistenceWriteRepository {
  transactionCallCount = 0;
  async executeCanonicalTransition(): Promise<HermesDailyFarmBriefPersistenceRepositoryTransactionResult> {
    this.transactionCallCount += 1;
    return repositoryResult({ status: "failed_closed", error: "repository_unavailable" });
  }
}
