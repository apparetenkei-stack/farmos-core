import {
  HERMES_DAILY_FARM_SOURCE_ORDER,
  type HermesDailyFarmFreshness,
  type HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";
import type { HermesDailyFarmSourceStatus } from "./hermes_daily_farm_snapshot_contract";

export type HermesDailyFarmBriefSourceSelectionCoverage = {
  schema_version: "hermes.daily_farm_brief.source_selection_coverage.v1";
  source_type: HermesDailyFarmSourceType;
  status: HermesDailyFarmSourceStatus;
  freshness: HermesDailyFarmFreshness;
  source_record_count: number;
  input_record_count: number;
  selected_fact_count: number;
  attention_count: number;
  available_but_no_selected_facts: boolean;
  available_but_no_attention: boolean;
};

export type HermesDailyFarmBriefSourceAvailability =
  | "available"
  | "empty"
  | "limited"
  | "unavailable";

export type HermesDailyFarmBriefSourceFreshness = HermesDailyFarmFreshness;

export type HermesDailyFarmBriefSourceProvenance =
  | "farming_app_api"
  | "core_memory"
  | "fixture"
  | "none"
  | "unknown";

export type HermesDailyFarmBriefSourceReasonCode =
  | "SOURCE_AVAILABLE"
  | "SOURCE_EMPTY"
  | "SOURCE_LIMITED"
  | "SOURCE_NOT_CONNECTED"
  | "SOURCE_UNAVAILABLE_CONNECTION"
  | "SOURCE_UNAVAILABLE_AUTH"
  | "SOURCE_UNAVAILABLE_CONTRACT"
  | "SOURCE_UNAVAILABLE_TIMEOUT"
  | "SOURCE_UNKNOWN_FRESHNESS"
  | "SOURCE_NOT_REQUESTED"
  | "SOURCE_PROVENANCE_MISMATCH";

export type HermesDailyFarmBriefSourceCoverageReadState =
  | "success"
  | "not_connected"
  | "connection_failed"
  | "authentication_failed"
  | "contract_failed"
  | "timeout"
  | "not_requested";

export type HermesDailyFarmBriefSourceCoverageEvidence = {
  schema_version: "hermes.daily_farm_brief.source_coverage.v1";
  source: Exclude<HermesDailyFarmSourceType, "hermes_note">;
  availability: HermesDailyFarmBriefSourceAvailability;
  freshness: HermesDailyFarmBriefSourceFreshness;
  reason_code: Exclude<
    HermesDailyFarmBriefSourceReasonCode,
    "SOURCE_UNKNOWN_FRESHNESS"
  >;
  freshness_reason_code: "SOURCE_UNKNOWN_FRESHNESS" | null;
  provenance: HermesDailyFarmBriefSourceProvenance;
  actual_record_count: number;
  adapter_record_count: number;
  fact_count: number;
  observed_at: string | null;
  latest_business_at: string | null;
  source_updated_at: string | null;
  notes: string[];
};

export type HermesDailyFarmBriefSourceCoverageInput = {
  source: HermesDailyFarmBriefSourceCoverageEvidence["source"];
  read_state: HermesDailyFarmBriefSourceCoverageReadState;
  provenance: HermesDailyFarmBriefSourceProvenance;
  expected_provenance: HermesDailyFarmBriefSourceProvenance;
  actual_record_count: number;
  adapter_record_count: number;
  fact_count: number;
  observed_at: string | null;
  latest_business_at: string | null;
  source_updated_at: string | null;
  authoritative_freshness: Exclude<HermesDailyFarmBriefSourceFreshness, "unknown"> | null;
  notes: string[];
};

export type HermesDailyFarmBriefOriginClassification =
  | "fixture"
  | "partial_real_data"
  | "full_real_data"
  | "unknown_unverifiable_from_repository";

const SOURCES = ["inventory", "work_log", "field", "crop_cycle"] as const;
const AVAILABILITY = ["available", "empty", "limited", "unavailable"] as const;
const FRESHNESS = ["fresh", "stale", "unknown"] as const;
const PROVENANCE = ["farming_app_api", "core_memory", "fixture", "none", "unknown"] as const;
const REASON_CODES = [
  "SOURCE_AVAILABLE",
  "SOURCE_EMPTY",
  "SOURCE_LIMITED",
  "SOURCE_NOT_CONNECTED",
  "SOURCE_UNAVAILABLE_CONNECTION",
  "SOURCE_UNAVAILABLE_AUTH",
  "SOURCE_UNAVAILABLE_CONTRACT",
  "SOURCE_UNAVAILABLE_TIMEOUT",
  "SOURCE_NOT_REQUESTED",
  "SOURCE_PROVENANCE_MISMATCH",
] as const;
const EVIDENCE_KEYS = [
  "schema_version",
  "source",
  "availability",
  "freshness",
  "reason_code",
  "freshness_reason_code",
  "provenance",
  "actual_record_count",
  "adapter_record_count",
  "fact_count",
  "observed_at",
  "latest_business_at",
  "source_updated_at",
  "notes",
] as const;
const SELECTION_COVERAGE_KEYS = [
  "schema_version",
  "source_type",
  "status",
  "freshness",
  "source_record_count",
  "input_record_count",
  "selected_fact_count",
  "attention_count",
  "available_but_no_selected_facts",
  "available_but_no_attention",
] as const;
const SELECTION_STATUSES = ["available", "empty", "unavailable", "invalid"] as const;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

export function parseHermesDailyFarmBriefSourceSelectionCoverage(
  value: unknown,
): HermesDailyFarmBriefSourceSelectionCoverage | null {
  try {
    const coverage = typeof value === "string" ? JSON.parse(value) : value;
    if (
      !isRecord(coverage) ||
      !hasExactKeys(coverage, SELECTION_COVERAGE_KEYS) ||
      coverage.schema_version !==
        "hermes.daily_farm_brief.source_selection_coverage.v1" ||
      !HERMES_DAILY_FARM_SOURCE_ORDER.includes(
        coverage.source_type as HermesDailyFarmSourceType,
      ) ||
      !SELECTION_STATUSES.includes(
        coverage.status as (typeof SELECTION_STATUSES)[number],
      ) ||
      !FRESHNESS.includes(
        coverage.freshness as (typeof FRESHNESS)[number],
      ) ||
      !isNonNegativeInteger(coverage.source_record_count) ||
      !isNonNegativeInteger(coverage.input_record_count) ||
      !isNonNegativeInteger(coverage.selected_fact_count) ||
      !isNonNegativeInteger(coverage.attention_count) ||
      typeof coverage.available_but_no_selected_facts !== "boolean" ||
      typeof coverage.available_but_no_attention !== "boolean"
    ) {
      return null;
    }
    if (
      coverage.input_record_count > coverage.source_record_count ||
      coverage.selected_fact_count > coverage.input_record_count ||
      coverage.attention_count > coverage.selected_fact_count ||
      coverage.available_but_no_selected_facts !==
        (coverage.status === "available" &&
          coverage.selected_fact_count === 0) ||
      coverage.available_but_no_attention !==
        (coverage.status === "available" && coverage.attention_count === 0) ||
      (coverage.status === "available" && coverage.source_record_count === 0) ||
      (coverage.status === "empty" &&
        (coverage.source_record_count !== 0 ||
          coverage.input_record_count !== 0)) ||
      ((coverage.status === "unavailable" || coverage.status === "invalid") &&
        (coverage.source_record_count !== 0 || coverage.input_record_count !== 0)) ||
      (coverage.status !== "available" &&
        (coverage.selected_fact_count !== 0 || coverage.attention_count !== 0))
    ) {
      return null;
    }
    return coverage as HermesDailyFarmBriefSourceSelectionCoverage;
  } catch {
    return null;
  }
}

export function createHermesDailyFarmBriefSourceSelectionCoverage(input: {
  sourceType: HermesDailyFarmSourceType;
  status: HermesDailyFarmSourceStatus;
  freshness: HermesDailyFarmFreshness;
  sourceRecordCount: number;
  inputRecordCount: number;
  selectedFactCount: number;
  attentionCount: number;
}): HermesDailyFarmBriefSourceSelectionCoverage | null {
  return parseHermesDailyFarmBriefSourceSelectionCoverage({
    schema_version: "hermes.daily_farm_brief.source_selection_coverage.v1",
    source_type: input.sourceType,
    status: input.status,
    freshness: input.freshness,
    source_record_count: input.sourceRecordCount,
    input_record_count: input.inputRecordCount,
    selected_fact_count: input.selectedFactCount,
    attention_count: input.attentionCount,
    available_but_no_selected_facts:
      input.status === "available" && input.selectedFactCount === 0,
    available_but_no_attention:
      input.status === "available" && input.attentionCount === 0,
  });
}

function isCanonicalIsoOrNull(value: unknown): value is string | null {
  if (value === null) return true;
  if (typeof value !== "string") return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

function areNotes(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 20 && value.every(
    (note) => typeof note === "string" && note.length > 0 && note.length <= 300 && !/[\u0000-\u001f\u007f]/u.test(note),
  );
}

function expectedReasonForAvailability(
  availability: HermesDailyFarmBriefSourceAvailability,
): HermesDailyFarmBriefSourceCoverageEvidence["reason_code"] | null {
  if (availability === "available") return "SOURCE_AVAILABLE";
  if (availability === "empty") return "SOURCE_EMPTY";
  if (availability === "limited") return "SOURCE_LIMITED";
  return null;
}

export function parseHermesDailyFarmBriefSourceCoverageEvidence(
  value: unknown,
): HermesDailyFarmBriefSourceCoverageEvidence | null {
  try {
    const evidence = typeof value === "string" ? JSON.parse(value) : value;
    if (!isRecord(evidence) || !hasExactKeys(evidence, EVIDENCE_KEYS)) return null;
    if (
      evidence.schema_version !== "hermes.daily_farm_brief.source_coverage.v1" ||
      !SOURCES.includes(evidence.source as (typeof SOURCES)[number]) ||
      !AVAILABILITY.includes(evidence.availability as (typeof AVAILABILITY)[number]) ||
      !FRESHNESS.includes(evidence.freshness as (typeof FRESHNESS)[number]) ||
      !REASON_CODES.includes(evidence.reason_code as (typeof REASON_CODES)[number]) ||
      !PROVENANCE.includes(evidence.provenance as (typeof PROVENANCE)[number]) ||
      !isNonNegativeInteger(evidence.actual_record_count) ||
      !isNonNegativeInteger(evidence.adapter_record_count) ||
      !isNonNegativeInteger(evidence.fact_count) ||
      !isCanonicalIsoOrNull(evidence.observed_at) ||
      !isCanonicalIsoOrNull(evidence.latest_business_at) ||
      !isCanonicalIsoOrNull(evidence.source_updated_at) ||
      !areNotes(evidence.notes)
    ) return null;

    const availability = evidence.availability as HermesDailyFarmBriefSourceAvailability;
    const reason = evidence.reason_code as HermesDailyFarmBriefSourceCoverageEvidence["reason_code"];
    const expectedReason = expectedReasonForAvailability(availability);
    if (expectedReason !== null ? reason !== expectedReason : ["SOURCE_AVAILABLE", "SOURCE_EMPTY", "SOURCE_LIMITED"].includes(reason)) return null;
    if ((availability === "available" || availability === "limited") && evidence.adapter_record_count === 0) return null;
    if (availability === "empty" && evidence.adapter_record_count !== 0) return null;
    if (evidence.actual_record_count < evidence.adapter_record_count) return null;
    if (evidence.freshness === "unknown") {
      if (evidence.freshness_reason_code !== "SOURCE_UNKNOWN_FRESHNESS") return null;
    } else if (evidence.freshness_reason_code !== null || (evidence.latest_business_at === null && evidence.source_updated_at === null)) {
      return null;
    }

    return {
      ...(evidence as HermesDailyFarmBriefSourceCoverageEvidence),
      notes: [...evidence.notes],
    };
  } catch {
    return null;
  }
}

const FAILURE_REASONS: Record<Exclude<HermesDailyFarmBriefSourceCoverageReadState, "success">, HermesDailyFarmBriefSourceCoverageEvidence["reason_code"]> = {
  not_connected: "SOURCE_NOT_CONNECTED",
  connection_failed: "SOURCE_UNAVAILABLE_CONNECTION",
  authentication_failed: "SOURCE_UNAVAILABLE_AUTH",
  contract_failed: "SOURCE_UNAVAILABLE_CONTRACT",
  timeout: "SOURCE_UNAVAILABLE_TIMEOUT",
  not_requested: "SOURCE_NOT_REQUESTED",
};

export function classifyHermesDailyFarmBriefSourceCoverage(
  input: HermesDailyFarmBriefSourceCoverageInput,
): HermesDailyFarmBriefSourceCoverageEvidence | null {
  const provenanceMismatch = input.provenance !== input.expected_provenance;
  let availability: HermesDailyFarmBriefSourceAvailability;
  let reasonCode: HermesDailyFarmBriefSourceCoverageEvidence["reason_code"];

  if (provenanceMismatch) {
    availability = "unavailable";
    reasonCode = "SOURCE_PROVENANCE_MISMATCH";
  } else if (input.read_state !== "success") {
    availability = "unavailable";
    reasonCode = FAILURE_REASONS[input.read_state];
  } else if (input.adapter_record_count === 0) {
    availability = "empty";
    reasonCode = "SOURCE_EMPTY";
  } else if (input.actual_record_count > input.adapter_record_count) {
    availability = "limited";
    reasonCode = "SOURCE_LIMITED";
  } else {
    availability = "available";
    reasonCode = "SOURCE_AVAILABLE";
  }

  const hasAuthoritativeTimestamp = input.latest_business_at !== null || input.source_updated_at !== null;
  const freshness: HermesDailyFarmBriefSourceFreshness = hasAuthoritativeTimestamp && input.authoritative_freshness !== null
    ? input.authoritative_freshness
    : "unknown";

  return parseHermesDailyFarmBriefSourceCoverageEvidence({
    schema_version: "hermes.daily_farm_brief.source_coverage.v1",
    source: input.source,
    availability,
    freshness,
    reason_code: reasonCode,
    freshness_reason_code: freshness === "unknown" ? "SOURCE_UNKNOWN_FRESHNESS" : null,
    provenance: input.provenance,
    actual_record_count: input.actual_record_count,
    adapter_record_count: input.adapter_record_count,
    fact_count: input.fact_count,
    observed_at: input.observed_at,
    latest_business_at: input.latest_business_at,
    source_updated_at: input.source_updated_at,
    notes: input.notes,
  });
}

export function isHermesDailyFarmBriefFullRealDataOrigin(
  classification: HermesDailyFarmBriefOriginClassification,
): boolean {
  return classification === "full_real_data";
}
