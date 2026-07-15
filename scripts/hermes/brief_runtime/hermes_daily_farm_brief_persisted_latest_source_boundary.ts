import {
  HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  parseHermesDailyFarmBriefPersistedRecord,
  parseHermesDailyFarmBriefPersistedRepositoryResult,
  type HermesDailyFarmBriefPersistedRecord,
  type HermesDailyFarmBriefPersistedRepositoryResult,
} from "./hermes_daily_farm_brief_persisted_record_contract";
import {
  parseHermesDailyFarmBriefLatestReadSource,
  type HermesDailyFarmBriefLatestReadSource,
} from "./hermes_daily_farm_brief_latest_api_contract";
import { isCanonicalIso, isHermesDailyFarmBusinessDate } from "./hermes_daily_farm_brief_generation_contract";

export type HermesDailyFarmBriefPersistedReadRepository = {
  readRecordCandidates: () => Promise<unknown>;
};

export type HermesDailyFarmBriefPersistedSelectionError =
  | "repository_unavailable"
  | "invalid_repository_result"
  | "invalid_persisted_record"
  | "future_timestamp"
  | "version_conflict"
  | "duplicate_canonical_record"
  | "ambiguous_latest_record"
  | "latest_source_invalid";

export type HermesDailyFarmBriefPersistedLatestSourceResult = {
  schema_version: "hermes.daily_farm_brief.persisted_latest_source_result.v1";
  status: "selected" | "failed_closed";
  source: HermesDailyFarmBriefLatestReadSource | null;
  error_code: HermesDailyFarmBriefPersistedSelectionError | null;
  repository_read_count: 0 | 1;
  persisted_record_parse_count: number;
  retry_count: 0;
  safety: typeof HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function result(input: {
  source?: HermesDailyFarmBriefLatestReadSource;
  error?: HermesDailyFarmBriefPersistedSelectionError;
  parsedCount: number;
  readCount?: 0 | 1;
}): HermesDailyFarmBriefPersistedLatestSourceResult {
  return {
    schema_version: "hermes.daily_farm_brief.persisted_latest_source_result.v1",
    status: input.source ? "selected" : "failed_closed",
    source: input.source ?? null,
    error_code: input.error ?? null,
    repository_read_count: input.readCount ?? 1,
    persisted_record_parse_count: input.parsedCount,
    retry_count: 0,
    safety: HERMES_DAILY_FARM_BRIEF_PERSISTED_SAFETY,
  };
}

function hasFutureTimestamp(value: unknown, now: string): boolean {
  if (!isRecord(value)) return false;
  return [value.generated_at, value.created_at, value.updated_at]
    .filter((timestamp): timestamp is string => typeof timestamp === "string" && isCanonicalIso(timestamp))
    .some((timestamp) => Date.parse(timestamp) > Date.parse(now));
}

function validateVersionChains(records: HermesDailyFarmBriefPersistedRecord[]): {
  canonical: HermesDailyFarmBriefPersistedRecord[];
  error: "version_conflict" | "duplicate_canonical_record" | null;
} {
  const byId = new Map<string, HermesDailyFarmBriefPersistedRecord[]>();
  for (const record of records) byId.set(record.record_id, [...(byId.get(record.record_id) ?? []), record]);
  const canonical: HermesDailyFarmBriefPersistedRecord[] = [];
  for (const chain of byId.values()) {
    const versions = chain.map((record) => record.version);
    if (new Set(versions).size !== versions.length) return { canonical: [], error: "duplicate_canonical_record" };
    const ordered = [...chain].sort((left, right) => left.version - right.version);
    if (ordered.some((record, index) => record.version !== index + 1)) return { canonical: [], error: "version_conflict" };
    if (ordered.some((record) => record.record_kind !== ordered[0].record_kind || record.business_date !== ordered[0].business_date)) return { canonical: [], error: "version_conflict" };
    const canonicalRecords = ordered.filter((record) => record.record_status === "canonical");
    if (canonicalRecords.length !== 1 || canonicalRecords[0].version !== ordered[ordered.length - 1].version || ordered.slice(0, -1).some((record) => record.record_status !== "superseded")) return { canonical: [], error: "version_conflict" };
    canonical.push(canonicalRecords[0]);
  }
  return { canonical, error: null };
}

function uniqueAtPriority(records: HermesDailyFarmBriefPersistedRecord[]): {
  record: HermesDailyFarmBriefPersistedRecord | null;
  ambiguous: boolean;
} {
  return records.length === 1
    ? { record: records[0], ambiguous: false }
    : { record: null, ambiguous: records.length > 1 };
}

function toLatestSource(record: HermesDailyFarmBriefPersistedRecord): HermesDailyFarmBriefLatestReadSource | null {
  if (record.record_kind === "projectable_brief") {
    return parseHermesDailyFarmBriefLatestReadSource({
      schema_version: "hermes.daily_farm_brief.latest_read_source.v1",
      source_kind: "projectable_brief",
      business_date: record.business_date,
      scope_index: record.scope_index,
      snapshot: record.snapshot,
      generation_state: null,
    });
  }
  return parseHermesDailyFarmBriefLatestReadSource({
    schema_version: "hermes.daily_farm_brief.latest_read_source.v1",
    source_kind: "generation_state",
    business_date: record.business_date,
    scope_index: null,
    snapshot: null,
    generation_state: record.generation_state,
  });
}

function unavailableSource(businessDate: string): HermesDailyFarmBriefLatestReadSource | null {
  return parseHermesDailyFarmBriefLatestReadSource({
    schema_version: "hermes.daily_farm_brief.latest_read_source.v1",
    source_kind: "generation_state",
    business_date: businessDate,
    scope_index: null,
    snapshot: null,
    generation_state: "unavailable",
  });
}

export async function readHermesDailyFarmBriefPersistedLatestSource(input: {
  repository: HermesDailyFarmBriefPersistedReadRepository;
  requestedBusinessDate: string;
  now: string;
}): Promise<HermesDailyFarmBriefPersistedLatestSourceResult> {
  if (!isHermesDailyFarmBusinessDate(input.requestedBusinessDate) || !isCanonicalIso(input.now)) return result({ error: "invalid_repository_result", parsedCount: 0, readCount: 0 });
  let rawResult: unknown;
  try {
    rawResult = await input.repository.readRecordCandidates();
  } catch {
    return result({ error: "repository_unavailable", parsedCount: 0 });
  }
  const repositoryResult = parseHermesDailyFarmBriefPersistedRepositoryResult(rawResult);
  if (repositoryResult === null) return result({ error: "invalid_repository_result", parsedCount: 0 });
  if (repositoryResult.status === "unavailable") return result({ error: "repository_unavailable", parsedCount: 0 });

  const records: HermesDailyFarmBriefPersistedRecord[] = [];
  for (const rawRecord of repositoryResult.records) {
    if (hasFutureTimestamp(rawRecord, input.now)) return result({ error: "future_timestamp", parsedCount: records.length });
    const parsed = parseHermesDailyFarmBriefPersistedRecord({ value: rawRecord, now: input.now });
    if (parsed === null) return result({ error: "invalid_persisted_record", parsedCount: records.length });
    if (parsed.business_date > input.requestedBusinessDate) return result({ error: "future_timestamp", parsedCount: records.length + 1 });
    records.push(parsed);
  }

  const versions = validateVersionChains(records);
  if (versions.error !== null) return result({ error: versions.error, parsedCount: records.length });
  const currentProjectable = uniqueAtPriority(versions.canonical.filter((record) => record.record_kind === "projectable_brief" && record.business_date === input.requestedBusinessDate));
  if (currentProjectable.ambiguous) return result({ error: "ambiguous_latest_record", parsedCount: records.length });
  if (currentProjectable.record) {
    const source = toLatestSource(currentProjectable.record);
    return source ? result({ source, parsedCount: records.length }) : result({ error: "latest_source_invalid", parsedCount: records.length });
  }

  for (const state of ["in_progress", "failed"] as const) {
    const atPriority = uniqueAtPriority(versions.canonical.filter((record) => record.record_kind === "generation_state" && record.business_date === input.requestedBusinessDate && record.generation_state === state));
    if (atPriority.ambiguous) return result({ error: "ambiguous_latest_record", parsedCount: records.length });
    if (atPriority.record) {
      const source = toLatestSource(atPriority.record);
      return source ? result({ source, parsedCount: records.length }) : result({ error: "latest_source_invalid", parsedCount: records.length });
    }
  }

  const previousRecords = versions.canonical.filter((record) => record.record_kind === "projectable_brief" && record.business_date < input.requestedBusinessDate);
  if (previousRecords.length > 0) {
    const latestPreviousDate = previousRecords.map((record) => record.business_date).sort().at(-1) as string;
    const atPriority = uniqueAtPriority(previousRecords.filter((record) => record.business_date === latestPreviousDate));
    if (atPriority.ambiguous) return result({ error: "ambiguous_latest_record", parsedCount: records.length });
    const source = atPriority.record ? toLatestSource(atPriority.record) : null;
    return source ? result({ source, parsedCount: records.length }) : result({ error: "latest_source_invalid", parsedCount: records.length });
  }

  const storedUnavailable = uniqueAtPriority(versions.canonical.filter((record) => record.record_kind === "generation_state" && record.business_date === input.requestedBusinessDate && record.generation_state === "unavailable"));
  if (storedUnavailable.ambiguous) return result({ error: "ambiguous_latest_record", parsedCount: records.length });
  const source = storedUnavailable.record ? toLatestSource(storedUnavailable.record) : unavailableSource(input.requestedBusinessDate);
  return source ? result({ source, parsedCount: records.length }) : result({ error: "latest_source_invalid", parsedCount: records.length });
}

export class HermesDailyFarmBriefFixtureReadRepository implements HermesDailyFarmBriefPersistedReadRepository {
  readCount = 0;
  constructor(private readonly repositoryResult: unknown) {}
  async readRecordCandidates(): Promise<unknown> {
    this.readCount += 1;
    return structuredClone(this.repositoryResult);
  }
}

export class HermesDailyFarmBriefDenyByDefaultReadRepository implements HermesDailyFarmBriefPersistedReadRepository {
  readCount = 0;
  async readRecordCandidates(): Promise<HermesDailyFarmBriefPersistedRepositoryResult> {
    this.readCount += 1;
    return {
      schema_version: "hermes.daily_farm_brief.persisted_repository_result.v1",
      status: "unavailable",
      transaction_read_only: true,
      records: [],
    };
  }
}
