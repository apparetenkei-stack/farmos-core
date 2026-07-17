import { randomUUID } from "node:crypto";
import {
  HERMES_DAILY_FARM_BRIEF_POLICY,
  HERMES_DAILY_FARM_SOURCE_ORDER,
  type HermesDailyFarmSourceType,
} from "./hermes_daily_farm_brief_policy";
import type {
  HermesDailyFarmBrief,
  HermesDailyFarmBriefBuildResult,
  HermesDailyFarmBriefFact,
  HermesDailyFarmBriefFactCode,
  HermesDailyFarmBriefSafeSummary,
  HermesDailyFarmBriefSourceSummary,
} from "./hermes_daily_farm_brief_contract";
import type {
  HermesDailyFarmSnapshot,
  HermesDailyFarmWorkLogRecord,
} from "./hermes_daily_farm_snapshot_contract";
import { parseHermesDailyFarmSnapshot } from "./hermes_daily_farm_snapshot_adapter";
import {
  createHermesDailyFarmBriefSourceSelectionCoverage,
  parseHermesDailyFarmBriefSourceSelectionCoverage,
} from "./hermes_daily_farm_brief_source_coverage_contract";

type JsonRecord = Record<string, unknown>;
type FactCandidate = Omit<
  HermesDailyFarmBriefFact,
  "schema_version" | "fact_id" | "provenance"
>;

const ID_PATTERN = /^[0-9A-Za-z][0-9A-Za-z._:-]{0,127}$/u;
const FACT_CONTRACT: Record<
  HermesDailyFarmBriefFactCode,
  {
    severity: "warning" | "info";
    category:
      | "source_state"
      | "inventory_observation"
      | "work_log_observation";
    sourceType: HermesDailyFarmSourceType | "any";
  }
> = {
  source_empty: {
    severity: "info",
    category: "source_state",
    sourceType: "any",
  },
  source_stale: {
    severity: "warning",
    category: "source_state",
    sourceType: "any",
  },
  source_unavailable: {
    severity: "warning",
    category: "source_state",
    sourceType: "any",
  },
  source_unknown: {
    severity: "warning",
    category: "source_state",
    sourceType: "any",
  },
  inventory_quantity_zero: {
    severity: "info",
    category: "inventory_observation",
    sourceType: "inventory",
  },
  inventory_quantity_unknown: {
    severity: "warning",
    category: "inventory_observation",
    sourceType: "inventory",
  },
  inventory_unit_unknown: {
    severity: "info",
    category: "inventory_observation",
    sourceType: "inventory",
  },
  work_log_started_at_missing: {
    severity: "warning",
    category: "work_log_observation",
    sourceType: "work_log",
  },
  work_log_started_at_invalid: {
    severity: "warning",
    category: "work_log_observation",
    sourceType: "work_log",
  },
};

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
  if (typeof value !== "string") {
    return false;
  }
  const timestamp = Date.parse(value);
  return (
    Number.isFinite(timestamp) &&
    new Date(timestamp).toISOString() === value
  );
}

export function classifyHermesDailyFarmBriefWorkLogAttention(
  record: Pick<HermesDailyFarmWorkLogRecord, "started_at">,
): "work_log_started_at_missing" | "work_log_started_at_invalid" | null {
  if (record.started_at === null) return "work_log_started_at_missing";
  return isCanonicalIso(record.started_at)
    ? null
    : "work_log_started_at_invalid";
}

function compareFacts(
  left: Pick<
    HermesDailyFarmBriefFact,
    "severity" | "fact_code" | "source_type" | "source_record_id" | "summary"
  >,
  right: Pick<
    HermesDailyFarmBriefFact,
    "severity" | "fact_code" | "source_type" | "source_record_id" | "summary"
  >,
): number {
  const severityRank = new Map(
    HERMES_DAILY_FARM_BRIEF_POLICY.severity_order.map((value, index) => [
      value,
      index,
    ]),
  );
  return (
    (severityRank.get(left.severity) ?? Number.MAX_SAFE_INTEGER) -
      (severityRank.get(right.severity) ?? Number.MAX_SAFE_INTEGER) ||
    left.fact_code.localeCompare(right.fact_code) ||
    left.source_type.localeCompare(right.source_type) ||
    (left.source_record_id ?? "").localeCompare(right.source_record_id ?? "") ||
    left.summary.localeCompare(right.summary)
  );
}

function createFactCandidates(snapshot: HermesDailyFarmSnapshot): FactCandidate[] {
  const facts: FactCandidate[] = [];

  for (const sourceType of HERMES_DAILY_FARM_SOURCE_ORDER) {
    const source = snapshot.sources[sourceType];
    if (source.status === "empty") {
      facts.push({
        severity: "info",
        category: "source_state",
        fact_code: "source_empty",
        source_type: sourceType,
        source_record_id: null,
        summary: `${sourceType} source is connected and contains zero records`,
        observed_at: source.generated_at,
      });
    }
    if (source.status === "unavailable") {
      facts.push({
        severity: "warning",
        category: "source_state",
        fact_code: "source_unavailable",
        source_type: sourceType,
        source_record_id: null,
        summary: `${sourceType} source is unavailable`,
        observed_at: source.generated_at,
      });
    }
    if (source.freshness === "stale") {
      facts.push({
        severity: "warning",
        category: "source_state",
        fact_code: "source_stale",
        source_type: sourceType,
        source_record_id: null,
        summary: `${sourceType} source timestamp is stale`,
        observed_at: source.generated_at,
      });
    }
    if (source.freshness === "unknown") {
      facts.push({
        severity: "warning",
        category: "source_state",
        fact_code: "source_unknown",
        source_type: sourceType,
        source_record_id: null,
        summary: `${sourceType} source freshness is unknown`,
        observed_at: source.generated_at,
      });
    }
  }

  for (const record of snapshot.sources.inventory.records) {
    if (record.current_quantity === 0 || record.current_quantity === "0") {
      facts.push({
        severity: "info",
        category: "inventory_observation",
        fact_code: "inventory_quantity_zero",
        source_type: "inventory",
        source_record_id: record.id,
        summary:
          "Inventory current quantity is explicitly zero; no comparison threshold is configured",
        observed_at: snapshot.sources.inventory.generated_at,
      });
    }
    if (record.current_quantity === null) {
      facts.push({
        severity: "warning",
        category: "inventory_observation",
        fact_code: "inventory_quantity_unknown",
        source_type: "inventory",
        source_record_id: record.id,
        summary: "Inventory current quantity is unavailable",
        observed_at: snapshot.sources.inventory.generated_at,
      });
    }
    if (record.unit === null) {
      facts.push({
        severity: "info",
        category: "inventory_observation",
        fact_code: "inventory_unit_unknown",
        source_type: "inventory",
        source_record_id: record.id,
        summary: "Inventory unit is unavailable",
        observed_at: snapshot.sources.inventory.generated_at,
      });
    }
  }

  for (const record of snapshot.sources.work_log.records) {
    const attentionCode = classifyHermesDailyFarmBriefWorkLogAttention(record);
    if (attentionCode !== null) {
      facts.push({
        severity: "warning",
        category: "work_log_observation",
        fact_code: attentionCode,
        source_type: "work_log",
        source_record_id: record.id,
        summary:
          attentionCode === "work_log_started_at_missing"
            ? "Work log start timestamp is unavailable"
            : "Work log start timestamp is invalid",
        observed_at: null,
      });
    }
  }

  return facts.sort(compareFacts);
}

function selectedRecordCounts(
  facts: HermesDailyFarmBriefFact[],
  sourceType: HermesDailyFarmSourceType,
): { selected: number; attention: number } {
  const recordFacts = facts.filter(
    (fact) =>
      fact.source_type === sourceType &&
      fact.category !== "source_state" &&
      fact.source_record_id !== null,
  );
  return {
    selected: new Set(recordFacts.map((fact) => fact.source_record_id)).size,
    attention: new Set(
      recordFacts
        .filter((fact) => fact.severity === "warning")
        .map((fact) => fact.source_record_id),
    ).size,
  };
}

export function calculateHermesDailyFarmBriefStatus(
  summaries: HermesDailyFarmBriefSourceSummary[],
): HermesDailyFarmBrief["status"] | null {
  if (
    summaries.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length ||
    !HERMES_DAILY_FARM_SOURCE_ORDER.every(
      (sourceType, index) => summaries[index]?.source_type === sourceType,
    )
  ) {
    return null;
  }

  if (summaries.some((summary) => summary.status === "invalid")) {
    return "unavailable";
  }

  const required = HERMES_DAILY_FARM_BRIEF_POLICY.required_sources.map(
    (sourceType) => summaries.find((summary) => summary.source_type === sourceType),
  );
  if (required.some((summary) => summary === undefined)) {
    return null;
  }

  const canonicalRequired = required as HermesDailyFarmBriefSourceSummary[];
  const usable = canonicalRequired.filter(
    (summary) => summary.status === "available" || summary.status === "empty",
  );
  if (usable.length === 0) {
    return "unavailable";
  }

  return canonicalRequired.every(
    (summary) =>
      (summary.status === "available" || summary.status === "empty") &&
      summary.freshness === "fresh",
  )
    ? "ready"
    : "partial";
}

export function buildHermesDailyFarmBrief(input: {
  snapshot: HermesDailyFarmSnapshot;
  generatedAt: string;
  briefIdFactory?: () => string;
  factIdFactory?: (index: number) => string;
}): HermesDailyFarmBriefBuildResult {
  const snapshot = parseHermesDailyFarmSnapshot(input.snapshot);
  if (!snapshot || !isCanonicalIso(input.generatedAt)) {
    throw new Error("daily_farm_brief_invalid");
  }

  const briefId = (input.briefIdFactory ?? randomUUID)();
  if (!ID_PATTERN.test(briefId)) {
    throw new Error("daily_farm_brief_invalid");
  }

  const candidates = createFactCandidates(snapshot).slice(
    0,
    HERMES_DAILY_FARM_BRIEF_POLICY.maximum_facts,
  );
  const facts = candidates.map((candidate, index): HermesDailyFarmBriefFact => {
    const factId = (input.factIdFactory ?? (() => randomUUID()))(index);
    if (!ID_PATTERN.test(factId)) {
      throw new Error("daily_farm_brief_fact_invalid");
    }
    return {
      schema_version: "hermes.daily_farm_brief.fact.v1",
      fact_id: factId,
      ...candidate,
      provenance: {
        snapshot_id: snapshot.snapshot_id,
        source_type: candidate.source_type,
        source_generated_at:
          snapshot.sources[candidate.source_type].generated_at,
        source_record_id: candidate.source_record_id,
      },
    };
  });
  const sourceSummary = HERMES_DAILY_FARM_SOURCE_ORDER.map((sourceType) => {
    const source = snapshot.sources[sourceType];
    const selected = selectedRecordCounts(facts, sourceType);
    const coverage = createHermesDailyFarmBriefSourceSelectionCoverage({
      sourceType,
      status: source.status,
      freshness: source.freshness,
      sourceRecordCount: source.record_count,
      inputRecordCount: source.records.length,
      selectedFactCount: selected.selected,
      attentionCount: selected.attention,
    });
    if (coverage === null) throw new Error("daily_farm_brief_source_coverage_invalid");
    return {
      ...coverage,
      record_count: source.record_count,
    };
  });
  const brief: HermesDailyFarmBrief = {
    schema_version: "hermes.daily_farm_brief.v1",
    brief_id: briefId,
    snapshot_id: snapshot.snapshot_id,
    generated_at: input.generatedAt,
    status: snapshot.status,
    facts,
    source_summary: sourceSummary,
    limitations: snapshot.limitations.slice(
      0,
      HERMES_DAILY_FARM_BRIEF_POLICY.maximum_limitations,
    ),
    requires_human_review: true,
    safety: {
      snapshot_read_only: true,
      external_fetch_performed: false,
      database_write_performed: false,
      proposal_write_performed: false,
      audit_write_performed: false,
      model_execution_performed: false,
      notification_performed: false,
      fail_closed: true,
    },
  };

  return {
    snapshot,
    brief,
    summary: createHermesDailyFarmBriefSafeSummary(brief),
  };
}

export function parseHermesDailyFarmBriefFact(
  value: unknown,
): HermesDailyFarmBriefFact | null {
  try {
    const fact = typeof value === "string" ? JSON.parse(value) : value;
    if (
      !isRecord(fact) ||
      !hasExactKeys(fact, [
        "schema_version",
        "fact_id",
        "severity",
        "category",
        "fact_code",
        "source_type",
        "source_record_id",
        "summary",
        "observed_at",
        "provenance",
      ]) ||
      fact.schema_version !== "hermes.daily_farm_brief.fact.v1" ||
      typeof fact.fact_id !== "string" ||
      !ID_PATTERN.test(fact.fact_id) ||
      !Object.hasOwn(FACT_CONTRACT, String(fact.fact_code)) ||
      !HERMES_DAILY_FARM_SOURCE_ORDER.includes(
        fact.source_type as HermesDailyFarmSourceType,
      ) ||
      (fact.source_record_id !== null &&
        (typeof fact.source_record_id !== "string" ||
          !ID_PATTERN.test(fact.source_record_id))) ||
      typeof fact.summary !== "string" ||
      fact.summary.length > HERMES_DAILY_FARM_BRIEF_POLICY.maximum_text_chars ||
      (fact.observed_at !== null && !isCanonicalIso(fact.observed_at)) ||
      !isRecord(fact.provenance) ||
      !hasExactKeys(fact.provenance, [
        "snapshot_id",
        "source_type",
        "source_generated_at",
        "source_record_id",
      ]) ||
      typeof fact.provenance.snapshot_id !== "string" ||
      !ID_PATTERN.test(fact.provenance.snapshot_id) ||
      fact.provenance.source_type !== fact.source_type ||
      (fact.provenance.source_generated_at !== null &&
        !isCanonicalIso(fact.provenance.source_generated_at)) ||
      fact.provenance.source_record_id !== fact.source_record_id
    ) {
      return null;
    }

    const contract = FACT_CONTRACT[fact.fact_code as HermesDailyFarmBriefFactCode];
    if (
      fact.severity !== contract.severity ||
      fact.category !== contract.category ||
      (contract.sourceType !== "any" && fact.source_type !== contract.sourceType)
    ) {
      return null;
    }
    return fact as HermesDailyFarmBriefFact;
  } catch {
    return null;
  }
}

function parseSourceSummary(value: unknown): HermesDailyFarmBriefSourceSummary | null {
  if (!isRecord(value) || !hasExactKeys(value, [
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
    "record_count",
  ])) return null;
  const { record_count: recordCount, ...selection } = value;
  const coverage = parseHermesDailyFarmBriefSourceSelectionCoverage(selection);
  if (coverage === null || recordCount !== coverage.source_record_count) return null;
  return { ...coverage, record_count: recordCount } as HermesDailyFarmBriefSourceSummary;
}

export function parseHermesDailyFarmBrief(
  value: unknown,
): HermesDailyFarmBrief | null {
  try {
    const brief = typeof value === "string" ? JSON.parse(value) : value;
    if (
      !isRecord(brief) ||
      !hasExactKeys(brief, [
        "schema_version",
        "brief_id",
        "snapshot_id",
        "generated_at",
        "status",
        "facts",
        "source_summary",
        "limitations",
        "requires_human_review",
        "safety",
      ]) ||
      brief.schema_version !== "hermes.daily_farm_brief.v1" ||
      typeof brief.brief_id !== "string" ||
      !ID_PATTERN.test(brief.brief_id) ||
      typeof brief.snapshot_id !== "string" ||
      !ID_PATTERN.test(brief.snapshot_id) ||
      !isCanonicalIso(brief.generated_at) ||
      !["ready", "partial", "unavailable"].includes(String(brief.status)) ||
      !Array.isArray(brief.facts) ||
      brief.facts.length > HERMES_DAILY_FARM_BRIEF_POLICY.maximum_facts ||
      !Array.isArray(brief.source_summary) ||
      brief.source_summary.length !== HERMES_DAILY_FARM_SOURCE_ORDER.length ||
      !Array.isArray(brief.limitations) ||
      brief.limitations.length >
        HERMES_DAILY_FARM_BRIEF_POLICY.maximum_limitations ||
      !brief.limitations.every(
        (item) =>
          typeof item === "string" &&
          item.length <= HERMES_DAILY_FARM_BRIEF_POLICY.maximum_text_chars,
      ) ||
      brief.requires_human_review !== true ||
      !isRecord(brief.safety) ||
      !hasExactKeys(brief.safety, [
        "snapshot_read_only",
        "external_fetch_performed",
        "database_write_performed",
        "proposal_write_performed",
        "audit_write_performed",
        "model_execution_performed",
        "notification_performed",
        "fail_closed",
      ]) ||
      brief.safety.snapshot_read_only !== true ||
      brief.safety.external_fetch_performed !== false ||
      brief.safety.database_write_performed !== false ||
      brief.safety.proposal_write_performed !== false ||
      brief.safety.audit_write_performed !== false ||
      brief.safety.model_execution_performed !== false ||
      brief.safety.notification_performed !== false ||
      brief.safety.fail_closed !== true
    ) {
      return null;
    }

    const facts = brief.facts.map(parseHermesDailyFarmBriefFact);
    if (
      facts.some((fact) => fact === null) ||
      new Set(facts.map((fact) => fact?.fact_id)).size !== facts.length ||
      facts.some(
        (fact) => fact?.provenance.snapshot_id !== brief.snapshot_id,
      )
    ) {
      return null;
    }
    const canonicalFacts = facts as HermesDailyFarmBriefFact[];
    for (let index = 1; index < canonicalFacts.length; index += 1) {
      if (compareFacts(canonicalFacts[index - 1], canonicalFacts[index]) > 0) {
        return null;
      }
    }

    const summaries = brief.source_summary.map(parseSourceSummary);
    if (summaries.some((summary) => summary === null)) {
      return null;
    }
    const canonicalSummaries = summaries as HermesDailyFarmBriefSourceSummary[];
    if (
      !HERMES_DAILY_FARM_SOURCE_ORDER.every(
        (sourceType, index) => {
          const selected = selectedRecordCounts(canonicalFacts, sourceType);
          return canonicalSummaries[index].source_type === sourceType &&
            canonicalSummaries[index].selected_fact_count === selected.selected &&
            canonicalSummaries[index].attention_count === selected.attention;
        },
      ) ||
      calculateHermesDailyFarmBriefStatus(canonicalSummaries) !== brief.status
    ) {
      return null;
    }

    return brief as HermesDailyFarmBrief;
  } catch {
    return null;
  }
}

export function createHermesDailyFarmBriefSafeSummary(
  brief: HermesDailyFarmBrief,
): HermesDailyFarmBriefSafeSummary {
  return {
    brief_id: brief.brief_id,
    snapshot_id: brief.snapshot_id,
    generated_at: brief.generated_at,
    status: brief.status,
    fact_count: brief.facts.length,
    warning_count: brief.facts.filter((fact) => fact.severity === "warning").length,
    info_count: brief.facts.filter((fact) => fact.severity === "info").length,
    source_summary: structuredClone(brief.source_summary),
    limitations: [...brief.limitations],
    requires_human_review: true,
  };
}
