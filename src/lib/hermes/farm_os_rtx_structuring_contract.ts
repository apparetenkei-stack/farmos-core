export const FARM_OS_RTX_JOB_CONTRACT =
  "farmos.operational_memory.rtx_structuring_job.v1" as const;
export const FARM_OS_RTX_CANDIDATE_CONTRACT =
  "farmos.operational_memory.rtx_structuring_candidate.v1" as const;
export const FARM_OS_RTX_JOB_SCHEMA_VERSION = 1 as const;
export const FARM_OS_RTX_MAXIMUM_ATTEMPTS = 3 as const;
export const FARM_OS_RTX_LEASE_SECONDS = 600 as const;
export const FARM_OS_RTX_MAX_JOBS_PER_CLAIM = 3 as const;
export const FARM_OS_RTX_SUMMARY_MAX_LENGTH = 240 as const;
export const FARM_OS_RTX_ARRAY_MAX_ITEMS = 5 as const;
export const FARM_OS_RTX_ITEM_MAX_LENGTH = 120 as const;

export const FARM_OS_RTX_REQUESTED_TASKS = [
  "semantic_classification",
  "short_summary",
  "ambiguity_detection",
  "missing_information_detection",
] as const;

export const FARM_OS_RTX_WORK_CATEGORIES = [
  "observation",
  "crop_care",
  "soil_management",
  "harvest_related",
  "other",
] as const;
export const FARM_OS_RTX_FIELD_STATES = [
  "state_mentioned",
  "state_not_available",
] as const;
export const FARM_OS_RTX_CROP_STATES = [
  "state_mentioned",
  "state_not_available",
] as const;
export const FARM_OS_RTX_FOLLOW_UPS = [
  "human_review",
  "bounded_source_check",
  "no_follow_up_identified",
] as const;
export const FARM_OS_RTX_MISSING_INFORMATION = [
  "field_state_missing",
  "crop_state_missing",
  "work_context_missing",
  "source_text_missing",
] as const;
export const FARM_OS_RTX_AMBIGUITIES = [
  "meaning_ambiguous",
  "scope_ambiguous",
  "no_ambiguity_identified",
] as const;

type JsonRecord = Record<string, unknown>;

export type FarmOsRtxSemanticFields = {
  work_note: string | null;
  observation: string | null;
};

export type FarmOsRtxStructuringJob = {
  job_id: string;
  contract_version: typeof FARM_OS_RTX_JOB_CONTRACT;
  source_snapshot_id: string;
  source_record_id: string;
  source_content_hash: string;
  business_date: string;
  semantic_source_status: "fixture_only";
  production_job_creation: false;
  allowed_source: { fields: FarmOsRtxSemanticFields };
  requested_tasks: [...typeof FARM_OS_RTX_REQUESTED_TASKS];
  schema_version: typeof FARM_OS_RTX_JOB_SCHEMA_VERSION;
  compiler_target: "candidate_only";
  created_at: string;
  not_before: string;
  attempt: 0;
  maximum_attempts: typeof FARM_OS_RTX_MAXIMUM_ATTEMPTS;
  status: "queued";
};

export type FarmOsRtxModelProvenance = {
  model_id: string;
  model_artifact_id: string;
  quantization: string;
  runtime_id: string;
  prompt_template_version: string;
  structured_output_schema_version: string;
};

export type FarmOsRtxEvidence = {
  source_field: keyof FarmOsRtxSemanticFields;
  excerpt: string;
};

export type FarmOsRtxStructuringCandidate = {
  job_id: string;
  job_contract_version: typeof FARM_OS_RTX_JOB_CONTRACT;
  result_contract_version: typeof FARM_OS_RTX_CANDIDATE_CONTRACT;
  source_snapshot_id: string;
  source_record_id: string;
  source_content_hash: string;
  model_provenance: FarmOsRtxModelProvenance;
  semantic_classification: {
    work_category_candidates: Array<
      typeof FARM_OS_RTX_WORK_CATEGORIES[number]
    >;
    field_state_candidates: Array<typeof FARM_OS_RTX_FIELD_STATES[number]>;
    crop_state_candidates: Array<typeof FARM_OS_RTX_CROP_STATES[number]>;
    follow_up_candidates: Array<typeof FARM_OS_RTX_FOLLOW_UPS[number]>;
  };
  summary: string;
  evidence: FarmOsRtxEvidence[];
  missing_information: Array<
    typeof FARM_OS_RTX_MISSING_INFORMATION[number]
  >;
  ambiguities: Array<typeof FARM_OS_RTX_AMBIGUITIES[number]>;
  confidence: number;
  verification_state: "candidate" | "review_required" | "rejected";
};

export type FarmOsRtxContractParseResult<T> =
  | { valid: true; value: T; errors: [] }
  | { valid: false; value: null; errors: string[] };

const JOB_KEYS = [
  "job_id",
  "contract_version",
  "source_snapshot_id",
  "source_record_id",
  "source_content_hash",
  "business_date",
  "semantic_source_status",
  "production_job_creation",
  "allowed_source",
  "requested_tasks",
  "schema_version",
  "compiler_target",
  "created_at",
  "not_before",
  "attempt",
  "maximum_attempts",
  "status",
] as const;
const CANDIDATE_KEYS = [
  "job_id",
  "job_contract_version",
  "result_contract_version",
  "source_snapshot_id",
  "source_record_id",
  "source_content_hash",
  "model_provenance",
  "semantic_classification",
  "summary",
  "evidence",
  "missing_information",
  "ambiguities",
  "confidence",
  "verification_state",
] as const;
const PROVENANCE_KEYS = [
  "model_id",
  "model_artifact_id",
  "quantization",
  "runtime_id",
  "prompt_template_version",
  "structured_output_schema_version",
] as const;
const CLASSIFICATION_KEYS = [
  "work_category_candidates",
  "field_state_candidates",
  "crop_state_candidates",
  "follow_up_candidates",
] as const;
const EVIDENCE_KEYS = ["source_field", "excerpt"] as const;
const SOURCE_KEYS = ["fields"] as const;
const SOURCE_FIELD_KEYS = ["work_note", "observation"] as const;
const IDENTIFIER = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u;
const HASH = /^[0-9a-f]{64}$/u;
const PROVENANCE = /^[a-zA-Z0-9][a-zA-Z0-9._:/+-]{0,127}$/u;
const SECRET_OR_URL =
  /(?:https?:\/\/|authorization|bearer|service[_ -]*role|password|credential|token)/iu;
const DETERMINISTIC_FACT =
  /(?:\d{4}-\d{2}-\d{2}|\b\d+(?:\.\d+)?\s*(?:kg|g|ml|l|分|時間|個|本)\b)/iu;

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function iso(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u
      .test(value) &&
    Number.isFinite(Date.parse(value));
}

function date(value: unknown): value is string {
  return typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/u.test(value) &&
    new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function text(value: unknown, maximum: number): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= maximum && !SECRET_OR_URL.test(value);
}

function nullableText(value: unknown): value is string | null {
  return value === null || text(value, FARM_OS_RTX_ITEM_MAX_LENGTH);
}

function enumArray<T extends readonly string[]>(
  value: unknown,
  allowed: T,
): value is Array<T[number]> {
  return Array.isArray(value) &&
    value.length <= FARM_OS_RTX_ARRAY_MAX_ITEMS &&
    new Set(value).size === value.length &&
    value.every((item) => typeof item === "string" && allowed.includes(item));
}

function sameArray(value: unknown, expected: readonly string[]): boolean {
  return Array.isArray(value) && value.length === expected.length &&
    expected.every((item, index) => value[index] === item);
}

export function parseFarmOsRtxStructuringJob(
  value: unknown,
): FarmOsRtxContractParseResult<FarmOsRtxStructuringJob> {
  const errors: string[] = [];
  if (!record(value) || !exact(value, JOB_KEYS)) {
    return { valid: false, value: null, errors: ["JOB_SCHEMA_INVALID"] };
  }
  if (
    typeof value.job_id !== "string" ||
    !IDENTIFIER.test(value.job_id) ||
    value.contract_version !== FARM_OS_RTX_JOB_CONTRACT ||
    typeof value.source_snapshot_id !== "string" ||
    !IDENTIFIER.test(value.source_snapshot_id) ||
    typeof value.source_record_id !== "string" ||
    !IDENTIFIER.test(value.source_record_id) ||
    typeof value.source_content_hash !== "string" ||
    !HASH.test(value.source_content_hash) ||
    !date(value.business_date) ||
    value.semantic_source_status !== "fixture_only" ||
    value.production_job_creation !== false ||
    value.schema_version !== FARM_OS_RTX_JOB_SCHEMA_VERSION ||
    value.compiler_target !== "candidate_only" ||
    !iso(value.created_at) ||
    !iso(value.not_before) ||
    Date.parse(value.not_before as string) < Date.parse(value.created_at as string) ||
    value.attempt !== 0 ||
    value.maximum_attempts !== FARM_OS_RTX_MAXIMUM_ATTEMPTS ||
    value.status !== "queued" ||
    !sameArray(value.requested_tasks, FARM_OS_RTX_REQUESTED_TASKS)
  ) errors.push("JOB_SCHEMA_INVALID");
  if (
    !record(value.allowed_source) ||
    !exact(value.allowed_source, SOURCE_KEYS) ||
    !record(value.allowed_source.fields) ||
    !exact(value.allowed_source.fields, SOURCE_FIELD_KEYS) ||
    !nullableText(value.allowed_source.fields.work_note) ||
    !nullableText(value.allowed_source.fields.observation)
  ) errors.push("SOURCE_SCHEMA_INVALID");
  if (
    record(value.allowed_source) &&
    record(value.allowed_source.fields) &&
    value.allowed_source.fields.work_note === null &&
    value.allowed_source.fields.observation === null
  ) errors.push("SEMANTIC_SOURCE_UNAVAILABLE");
  if (errors.length > 0) return { valid: false, value: null, errors };
  return {
    valid: true,
    value: structuredClone(value) as FarmOsRtxStructuringJob,
    errors: [],
  };
}

export function parseFarmOsRtxStructuringCandidate(
  value: unknown,
): FarmOsRtxContractParseResult<FarmOsRtxStructuringCandidate> {
  const errors: string[] = [];
  if (!record(value) || !exact(value, CANDIDATE_KEYS)) {
    return { valid: false, value: null, errors: ["CANDIDATE_SCHEMA_INVALID"] };
  }
  if (
    typeof value.job_id !== "string" ||
    !IDENTIFIER.test(value.job_id) ||
    value.job_contract_version !== FARM_OS_RTX_JOB_CONTRACT ||
    value.result_contract_version !== FARM_OS_RTX_CANDIDATE_CONTRACT ||
    typeof value.source_snapshot_id !== "string" ||
    !IDENTIFIER.test(value.source_snapshot_id) ||
    typeof value.source_record_id !== "string" ||
    !IDENTIFIER.test(value.source_record_id) ||
    typeof value.source_content_hash !== "string" ||
    !HASH.test(value.source_content_hash) ||
    !text(value.summary, FARM_OS_RTX_SUMMARY_MAX_LENGTH) ||
    typeof value.confidence !== "number" ||
    !Number.isFinite(value.confidence) ||
    value.confidence < 0 ||
    value.confidence > 1 ||
    !["candidate", "review_required", "rejected"].includes(
      String(value.verification_state),
    )
  ) errors.push("CANDIDATE_SCHEMA_INVALID");
  const modelProvenance = value.model_provenance;
  if (
    !record(modelProvenance) ||
    !exact(modelProvenance, PROVENANCE_KEYS) ||
    !PROVENANCE_KEYS.every((key) => {
      const item = modelProvenance[key];
      return typeof item === "string" &&
        PROVENANCE.test(item) &&
        !SECRET_OR_URL.test(item);
    })
  ) errors.push("MODEL_PROVENANCE_INVALID");
  if (
    !record(value.semantic_classification) ||
    !exact(value.semantic_classification, CLASSIFICATION_KEYS) ||
    !enumArray(
      value.semantic_classification.work_category_candidates,
      FARM_OS_RTX_WORK_CATEGORIES,
    ) ||
    !enumArray(
      value.semantic_classification.field_state_candidates,
      FARM_OS_RTX_FIELD_STATES,
    ) ||
    !enumArray(
      value.semantic_classification.crop_state_candidates,
      FARM_OS_RTX_CROP_STATES,
    ) ||
    !enumArray(
      value.semantic_classification.follow_up_candidates,
      FARM_OS_RTX_FOLLOW_UPS,
    )
  ) errors.push("CLASSIFICATION_INVALID");
  if (
    !Array.isArray(value.evidence) ||
    value.evidence.length > FARM_OS_RTX_ARRAY_MAX_ITEMS ||
    !value.evidence.every((item) =>
      record(item) && exact(item, EVIDENCE_KEYS) &&
      SOURCE_FIELD_KEYS.includes(
        item.source_field as typeof SOURCE_FIELD_KEYS[number],
      ) &&
      text(item.excerpt, FARM_OS_RTX_ITEM_MAX_LENGTH)
    )
  ) errors.push("EVIDENCE_SCHEMA_INVALID");
  if (
    !enumArray(value.missing_information, FARM_OS_RTX_MISSING_INFORMATION) ||
    !enumArray(value.ambiguities, FARM_OS_RTX_AMBIGUITIES)
  ) errors.push("CANDIDATE_ARRAY_INVALID");
  const serialized = JSON.stringify(value);
  if (DETERMINISTIC_FACT.test(serialized)) {
    errors.push("DETERMINISTIC_FACT_RETURNED");
  }
  if (errors.length > 0) return { valid: false, value: null, errors };
  return {
    valid: true,
    value: structuredClone(value) as FarmOsRtxStructuringCandidate,
    errors: [],
  };
}

export function validateFarmOsRtxCandidateGrounding(input: {
  job: FarmOsRtxStructuringJob;
  candidate: unknown;
}): FarmOsRtxContractParseResult<FarmOsRtxStructuringCandidate> {
  const parsed = parseFarmOsRtxStructuringCandidate(input.candidate);
  if (!parsed.valid) return parsed;
  const candidate = parsed.value;
  const errors: string[] = [];
  if (
    candidate.job_id !== input.job.job_id ||
    candidate.job_contract_version !== input.job.contract_version ||
    candidate.source_snapshot_id !== input.job.source_snapshot_id ||
    candidate.source_record_id !== input.job.source_record_id ||
    candidate.source_content_hash !== input.job.source_content_hash
  ) errors.push("SOURCE_IDENTITY_MISMATCH");
  const sources = input.job.allowed_source.fields;
  for (const evidence of candidate.evidence) {
    const source = sources[evidence.source_field];
    if (source === null || !source.includes(evidence.excerpt)) {
      errors.push("EVIDENCE_NOT_GROUNDED");
    }
  }
  const sourceTexts = Object.values(sources).filter(
    (value): value is string => value !== null,
  );
  if (!sourceTexts.some((source) => source.includes(candidate.summary))) {
    errors.push("SUMMARY_NOT_GROUNDED");
  }
  if (errors.length > 0) return { valid: false, value: null, errors };
  return { valid: true, value: candidate, errors: [] };
}
