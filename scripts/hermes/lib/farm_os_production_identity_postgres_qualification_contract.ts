import { createHash } from "node:crypto";

import {
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY as ADOPTED_BOOTSTRAP_AUTHORITY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY,
  parseFarmOsProductionPostgresBootstrapResult,
  type FarmOsProductionPostgresBootstrapResult,
} from "../../../src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  type FarmOsProductionIdentityQueryV2CandidateSection,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v3_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v4_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v5_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
} from "../../../src/lib/hermes/farm_os_production_identity_runtime_foundation";

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE =
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY;
export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY =
  ADOPTED_BOOTSTRAP_AUTHORITY;
export { parseFarmOsProductionPostgresBootstrapResult };
export type { FarmOsProductionPostgresBootstrapResult };

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION =
  "farmos.production-identity-postgres-qualification-evidence.v4" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EVIDENCE_V3_VERSION =
  "farmos.production-identity-postgres-qualification-evidence.v3" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EVIDENCE_V2_VERSION =
  "farmos.production-identity-postgres-qualification-evidence.v2" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION =
  "farmos.production-identity-postgres-qualification-failure.v5" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_V4_VERSION =
  "farmos.production-identity-postgres-qualification-failure.v4" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_V3_VERSION =
  "farmos.production-identity-postgres-qualification-failure.v3" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_VERSION =
  "farmos.production-identity-postgres-qualification-failure.v2" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_VERSION =
  "farmos.production-identity-postgres-qualification-executor-error.v4" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V3_VERSION =
  "farmos.production-identity-postgres-qualification-executor-error.v3" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V2_VERSION =
  "farmos.production-identity-postgres-qualification-executor-error.v2" as const;
export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_VERSION =
  "farmos.production-identity-postgres-qualification-executor-error.v1" as const;

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_PHASES = [
  "ADAPTER_ALLOWLIST",
  "SECTION_QUERY",
  "SECTION_RESULT_MATERIALIZATION",
  "PARSER_HANDOFF",
  "SANITIZER_HANDOFF",
  "ROLLBACK",
  "SESSION_CLOSE",
  "CLEANUP",
  "OTHER",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_CODES = [
  "DOCKER_UNAVAILABLE",
  "IMAGE_MISSING",
  "IMAGE_PULL_FAILED",
  "IMAGE_METADATA_INVALID",
  "CONTAINER_START_FAILED",
  "CONTAINER_OWNERSHIP_MISMATCH",
  "READINESS_FAILED",
  "FIXTURE_SETUP_FAILED",
  "BOOTSTRAP_MISMATCH",
  "PG_NOT_ELIGIBLE",
  "CAPABILITY_MISMATCH",
  "QUERY_ARTIFACT_DRIFT",
  "TRANSACTION_READ_ONLY_FAILED",
  "SECTION_EXECUTION_FAILED",
  "PARSER_FAILED",
  "SANITIZATION_FAILED",
  "ROLLBACK_FAILED",
  "SESSION_CLOSE_FAILED",
  "CLEANUP_FAILED",
  "EVIDENCE_INVALID",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_CLASSIFICATIONS = [
  "QUALIFIED",
  "NOT_ELIGIBLE",
  "BLOCKED_INCOMPATIBLE",
  "UNREVIEWED",
  "QUALIFICATION_INCOMPLETE",
  "CLEANUP_FAILED",
  "BOOTSTRAP_AUTHORITY_UNAPPROVED",
] as const;

export type FarmOsProductionIdentityPostgresMajor = 14 | 15 | 16 | 17;
export type FarmOsProductionIdentityPostgresQualificationFailureCode =
  typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_CODES[number];
export type FarmOsProductionIdentityPostgresQualificationFailurePhase =
  typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_PHASES[number];
export type FarmOsProductionIdentityQualificationClassification =
  typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_CLASSIFICATIONS[number];
export type FarmOsProductionIdentityPostgresIncompatibilityReason =
  | "CATALOG_COLUMN_MISSING_INHERIT_OPTION"
  | "CATALOG_COLUMN_MISSING_SET_OPTION";

const exactKeys = (value: Record<string, unknown>, expected: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  return actual.length === sortedExpected.length && actual.every((key, index) => key === sortedExpected[index]);
};
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const isDigest = (value: unknown): value is `sha256:${string}` =>
  typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
const isBoundedString = (value: unknown, maximum = 500): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= maximum;
const isCanonicalInstant = (value: unknown): value is string => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) return false;
  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && new Date(epoch).toISOString() === value;
};

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V1_LINEAGE =
  Object.freeze({
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v1",
    query_authority_id: "farmos.production-target-identity-query.v2",
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
  } as const);

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE =
  Object.freeze({
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v2",
    executor_lineage_version:
      "farmos.production-identity-postgres-qualification-executor-lineage.v2",
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
    bootstrap_authority_id:
      FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
    bootstrap_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256,
  } as const);

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE =
  Object.freeze({
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v3",
    executor_lineage_version:
      "farmos.production-identity-postgres-qualification-executor-lineage.v3",
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256,
    bootstrap_authority_id:
      FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
    bootstrap_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256,
  } as const);

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE =
  Object.freeze({
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v4",
    executor_lineage_version:
      "farmos.production-identity-postgres-qualification-executor-lineage.v4",
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
    bootstrap_authority_id:
      FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
    bootstrap_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256,
  } as const);

export type FarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1 = Readonly<{
  schema_version:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_VERSION;
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v1";
  postgres_major: 14;
  case: "NEGATIVE_CAPABILITY_ONLY";
  error_code: "EVIDENCE_INVALID";
  production_operations: 0;
  secret_exposed: false;
  filesystem_persistence: 0;
}>;

export type FarmOsProductionIdentityPostgresQualificationExecutorErrorV2 = Readonly<{
  schema_version:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V2_VERSION;
  executor_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.executor_authority_id;
  executor_lineage_version:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.executor_lineage_version;
  query_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.query_authority_id;
  query_sha256:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.query_sha256;
  bootstrap_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.bootstrap_authority_id;
  bootstrap_sha256:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.bootstrap_sha256;
  postgres_major: 14;
  case: "NEGATIVE_CAPABILITY_ONLY";
  error_code: "EVIDENCE_INVALID";
  production_operations: 0;
  secret_exposed: false;
  filesystem_persistence: 0;
}>;

export type FarmOsProductionIdentityPostgresQualificationExecutorErrorV3 = Readonly<{
  schema_version:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V3_VERSION;
  executor_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.executor_authority_id;
  executor_lineage_version:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.executor_lineage_version;
  query_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.query_authority_id;
  query_sha256:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.query_sha256;
  bootstrap_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.bootstrap_authority_id;
  bootstrap_sha256:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.bootstrap_sha256;
  postgres_major: 14;
  case: "NEGATIVE_CAPABILITY_ONLY";
  error_code: "EVIDENCE_INVALID";
  production_operations: 0;
  secret_exposed: false;
  filesystem_persistence: 0;
}>;

export type FarmOsProductionIdentityPostgresQualificationExecutorErrorV4 = Readonly<{
  schema_version:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_VERSION;
  executor_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.executor_authority_id;
  executor_lineage_version:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.executor_lineage_version;
  query_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.query_authority_id;
  query_sha256:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.query_sha256;
  bootstrap_authority_id:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.bootstrap_authority_id;
  bootstrap_sha256:
    typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.bootstrap_sha256;
  postgres_major: 14;
  case: "NEGATIVE_CAPABILITY_ONLY";
  error_code: "EVIDENCE_INVALID";
  production_operations: 0;
  secret_exposed: false;
  filesystem_persistence: 0;
}>;

const LEGACY_EXECUTOR_ERROR_V1_KEYS = [
  "schema_version", "executor_authority_id", "postgres_major", "case", "error_code",
  "production_operations", "secret_exposed", "filesystem_persistence",
] as const;
const EXECUTOR_ERROR_V2_KEYS = [
  "schema_version", "executor_authority_id", "executor_lineage_version",
  "query_authority_id", "query_sha256", "bootstrap_authority_id", "bootstrap_sha256",
  "postgres_major", "case", "error_code", "production_operations", "secret_exposed",
  "filesystem_persistence",
] as const;

export function parseFarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1 | null {
  if (!isRecord(value) || !exactKeys(value, LEGACY_EXECUTOR_ERROR_V1_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_VERSION ||
    value.executor_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V1_LINEAGE.executor_authority_id ||
    value.postgres_major !== 14 || value.case !== "NEGATIVE_CAPABILITY_ONLY" ||
    value.error_code !== "EVIDENCE_INVALID" || value.production_operations !== 0 ||
    value.secret_exposed !== false || value.filesystem_persistence !== 0) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationLegacyExecutorErrorV1,
  );
}

export function parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV2(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationExecutorErrorV2 | null {
  if (!isRecord(value) || !exactKeys(value, EXECUTOR_ERROR_V2_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V2_VERSION ||
    value.executor_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.executor_authority_id ||
    value.executor_lineage_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.executor_lineage_version ||
    value.query_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.query_authority_id ||
    value.query_sha256 !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.query_sha256 ||
    value.bootstrap_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.bootstrap_authority_id ||
    value.bootstrap_sha256 !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V2_LINEAGE.bootstrap_sha256 ||
    value.postgres_major !== 14 || value.case !== "NEGATIVE_CAPABILITY_ONLY" ||
    value.error_code !== "EVIDENCE_INVALID" || value.production_operations !== 0 ||
    value.secret_exposed !== false || value.filesystem_persistence !== 0) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationExecutorErrorV2,
  );
}

export function parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV3(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationExecutorErrorV3 | null {
  if (!isRecord(value) || !exactKeys(value, EXECUTOR_ERROR_V2_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EXECUTOR_ERROR_V3_VERSION ||
    value.executor_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.executor_authority_id ||
    value.executor_lineage_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.executor_lineage_version ||
    value.query_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.query_authority_id ||
    value.query_sha256 !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.query_sha256 ||
    value.bootstrap_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.bootstrap_authority_id ||
    value.bootstrap_sha256 !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V3_LINEAGE.bootstrap_sha256 ||
    value.postgres_major !== 14 || value.case !== "NEGATIVE_CAPABILITY_ONLY" ||
    value.error_code !== "EVIDENCE_INVALID" || value.production_operations !== 0 ||
    value.secret_exposed !== false || value.filesystem_persistence !== 0) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationExecutorErrorV3,
  );
}

export function parseFarmOsProductionIdentityPostgresQualificationExecutorErrorV4(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationExecutorErrorV4 | null {
  if (!isRecord(value) || !exactKeys(value, EXECUTOR_ERROR_V2_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_VERSION ||
    value.executor_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.executor_authority_id ||
    value.executor_lineage_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.executor_lineage_version ||
    value.query_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.query_authority_id ||
    value.query_sha256 !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.query_sha256 ||
    value.bootstrap_authority_id !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.bootstrap_authority_id ||
    value.bootstrap_sha256 !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE.bootstrap_sha256 ||
    value.postgres_major !== 14 || value.case !== "NEGATIVE_CAPABILITY_ONLY" ||
    value.error_code !== "EVIDENCE_INVALID" || value.production_operations !== 0 ||
    value.secret_exposed !== false || value.filesystem_persistence !== 0) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationExecutorErrorV4,
  );
}

export function createFarmOsProductionIdentityPostgresQualificationExecutorErrorV4():
  FarmOsProductionIdentityPostgresQualificationExecutorErrorV4 {
  return Object.freeze({
    schema_version:
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_VERSION,
    ...FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EXECUTOR_ERROR_V4_LINEAGE,
    postgres_major: 14,
    case: "NEGATIVE_CAPABILITY_ONLY",
    error_code: "EVIDENCE_INVALID",
    production_operations: 0,
    secret_exposed: false,
    filesystem_persistence: 0,
  });
}

export const FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_QUALIFICATION_POLICY = Object.freeze({
  minimum_proposed_postgres_major: 16,
  automatic_latest_acceptance: false,
  qualification_required_before_execution: true,
  pg14: "NOT_ELIGIBLE",
  pg15: "NOT_ELIGIBLE",
  pg16: "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION",
  pg17: "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION",
  pg18_plus: "UNREVIEWED",
} as const);

export type FarmOsProductionIdentityPostgresPolicyDecision =
  | Readonly<{
    classification: "NOT_ELIGIBLE";
    postgres_major: 14 | 15;
    full_v2_executor_eligible: false;
    incompatibility_reasons: readonly FarmOsProductionIdentityPostgresIncompatibilityReason[];
  }>
  | Readonly<{
    classification: "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION";
    postgres_major: 16 | 17;
    full_v2_executor_eligible: false;
    incompatibility_reasons: readonly [];
  }>
  | Readonly<{
    classification: "UNREVIEWED";
    postgres_major: number;
    full_v2_executor_eligible: false;
    incompatibility_reasons: readonly [];
  }>;

export function classifyFarmOsProductionIdentityPostgresCompatibility(
  serverVersionNum: unknown,
): FarmOsProductionIdentityPostgresPolicyDecision | null {
  const parsed = parseFarmOsProductionPostgresBootstrapResult({ server_version_num: serverVersionNum });
  if (parsed === null) return null;
  if (parsed.postgres_major === 14 || parsed.postgres_major === 15) {
    return Object.freeze({
      classification: "NOT_ELIGIBLE",
      postgres_major: parsed.postgres_major,
      full_v2_executor_eligible: false,
      incompatibility_reasons: Object.freeze([
        "CATALOG_COLUMN_MISSING_INHERIT_OPTION",
        "CATALOG_COLUMN_MISSING_SET_OPTION",
      ] as const),
    });
  }
  if (parsed.postgres_major === 16 || parsed.postgres_major === 17) {
    return Object.freeze({
      classification: "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION",
      postgres_major: parsed.postgres_major,
      full_v2_executor_eligible: false,
      incompatibility_reasons: Object.freeze([] as const),
    });
  }
  return Object.freeze({
    classification: "UNREVIEWED",
    postgres_major: parsed.postgres_major,
    full_v2_executor_eligible: false,
    incompatibility_reasons: Object.freeze([] as const),
  });
}

export type FarmOsProductionIdentityPostgresQualificationEvidence = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION;
  qualification_id: string;
  git_commit: string;
  observed_at: string;
  postgres_major: FarmOsProductionIdentityPostgresMajor;
  server_version_num: number;
  image_tag: string;
  image_id: string;
  image_repo_digest: `sha256:${string}`;
  bootstrap_authority_candidate_id: typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id;
  bootstrap_query_sha256: typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256;
  query_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id;
  query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256;
  runtime_contract_version: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION;
  section_count: 11;
  catalog_capability_columns: readonly ("inherit_option" | "set_option")[];
  full_query_executor_call_count: 0 | 1;
  executed_section_count: number;
  parser_pass: boolean;
  sanitizer_pass: boolean;
  sensitive_marker_occurrences: 0;
  cluster_identifier_exposure_count: 0;
  h1_h2_case: "MIGRATION_HISTORY_ABSENT" | "MIGRATION_HISTORY_PRESENT" | "NOT_RUN_INCOMPATIBLE";
  h2_invocation_count: 0 | 1;
  h2_row_count: 0 | 5;
  fixture_digest: `sha256:${string}`;
  assertion_count: number;
  classification: FarmOsProductionIdentityQualificationClassification;
  transaction_mode: "REPEATABLE READ READ ONLY" | "NOT_STARTED_INCOMPATIBLE";
  rollback_performed: boolean;
  container_cleanup_performed: boolean;
  production_operations: 0;
  secret_exposed: false;
}>;

export type FarmOsProductionIdentityPostgresQualificationLegacyEvidenceV2 = Readonly<
  Omit<FarmOsProductionIdentityPostgresQualificationEvidence,
  "schema_version" | "query_authority_id" | "query_sha256"> & {
    schema_version:
      typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EVIDENCE_V2_VERSION;
    query_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE.authority_id;
    query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256;
  }
>;

export type FarmOsProductionIdentityPostgresQualificationLegacyEvidenceV3 = Readonly<
  Omit<FarmOsProductionIdentityPostgresQualificationEvidence,
  "schema_version" | "query_authority_id" | "query_sha256"> & {
    schema_version:
      typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EVIDENCE_V3_VERSION;
    query_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id;
    query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256;
  }
>;

export type FarmOsProductionIdentityPostgresQualificationFailure = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION;
  failure_code: FarmOsProductionIdentityPostgresQualificationFailureCode;
  failure_phase: FarmOsProductionIdentityPostgresQualificationFailurePhase;
  section_id: FarmOsProductionIdentityQueryV2CandidateSection | null;
  statement_ordinal: number | null;
  completed_section_count: number;
  sqlstate: string | null;
  postgres_major: FarmOsProductionIdentityPostgresMajor;
  fixture_case: "MIGRATION_HISTORY_ABSENT" | "MIGRATION_HISTORY_PRESENT" |
    "NEGATIVE_CAPABILITY_ONLY";
  transaction_started: boolean;
  rollback_attempted: boolean;
  rollback_performed: boolean;
  rollback_status: "NOT_REQUIRED" | "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED";
  session_close_performed: boolean;
  container_cleanup_performed: boolean;
  cleanup_status: "NOT_ATTEMPTED" | "SUCCEEDED" | "FAILED";
  primary_failure_code: FarmOsProductionIdentityPostgresQualificationFailureCode;
  terminal_failure_code: FarmOsProductionIdentityPostgresQualificationFailureCode;
  executor_authority_id:
    "farmos.production-identity-postgres-isolated-qualification-executor.v4";
  source_commit: string;
  source_digest: `sha256:${string}`;
  query_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id;
  query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256;
  bootstrap_authority_id: typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id;
  bootstrap_sha256: typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256;
  production_operations: 0;
  secret_exposed: false;
  filesystem_persistence: 0;
}>;

export type FarmOsProductionIdentityPostgresQualificationLegacyFailureV2 = Readonly<
  Omit<FarmOsProductionIdentityPostgresQualificationFailure,
  "schema_version" | "executor_authority_id" | "query_authority_id" | "query_sha256"> & {
    schema_version:
      typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_VERSION;
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v1";
    query_authority_id: "farmos.production-target-identity-query.v2";
    query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256;
  }
>;

export type FarmOsProductionIdentityPostgresQualificationLegacyFailureV3 = Readonly<
  Omit<FarmOsProductionIdentityPostgresQualificationFailure,
  "schema_version" | "executor_authority_id" | "query_authority_id" | "query_sha256"> & {
    schema_version:
      typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_V3_VERSION;
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v2";
    query_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE.authority_id;
    query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256;
  }
>;

export type FarmOsProductionIdentityPostgresQualificationLegacyFailureV4 = Readonly<
  Omit<FarmOsProductionIdentityPostgresQualificationFailure,
  "schema_version" | "executor_authority_id" | "query_authority_id" | "query_sha256"> & {
    schema_version:
      typeof FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_V4_VERSION;
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v3";
    query_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id;
    query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256;
  }
>;

const FAILURE_KEYS = [
  "schema_version", "failure_code", "failure_phase", "section_id", "statement_ordinal",
  "completed_section_count", "sqlstate", "postgres_major", "fixture_case",
  "transaction_started", "rollback_attempted", "rollback_performed", "rollback_status",
  "session_close_performed", "container_cleanup_performed", "cleanup_status", "primary_failure_code",
  "terminal_failure_code", "executor_authority_id", "source_commit", "source_digest",
  "query_authority_id", "query_sha256", "bootstrap_authority_id", "bootstrap_sha256",
  "production_operations", "secret_exposed", "filesystem_persistence",
] as const;

export function parseFarmOsProductionIdentityPostgresQualificationFailure(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationFailure | null {
  if (!isRecord(value) || !exactKeys(value, FAILURE_KEYS)) return null;
  const sectionIndex = typeof value.section_id === "string"
    ? FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS.indexOf(
      value.section_id as FarmOsProductionIdentityQueryV2CandidateSection)
    : -1;
  const sectionPairValid = value.section_id === null
    ? value.statement_ordinal === null
    : sectionIndex >= 0 && value.statement_ordinal === sectionIndex + 1;
  const expectedCompletedSectionCount = sectionIndex < 0 ? null :
    value.fixture_case === "MIGRATION_HISTORY_ABSENT" && sectionIndex > 8
      ? sectionIndex - 1 : sectionIndex;
  if (value.schema_version !== FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION ||
    !FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_CODES.includes(
      value.failure_code as FarmOsProductionIdentityPostgresQualificationFailureCode) ||
    !FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_PHASES.includes(
      value.failure_phase as FarmOsProductionIdentityPostgresQualificationFailurePhase) ||
    !sectionPairValid ||
    typeof value.completed_section_count !== "number" ||
    !Number.isSafeInteger(value.completed_section_count) || value.completed_section_count < 0 ||
    value.completed_section_count > 11 ||
    (sectionIndex >= 0 && value.completed_section_count !== expectedCompletedSectionCount) ||
    !(value.sqlstate === null ||
      (typeof value.sqlstate === "string" && /^[0-9A-Z]{5}$/u.test(value.sqlstate))) ||
    ![14, 15, 16, 17].includes(value.postgres_major as number) ||
    !["MIGRATION_HISTORY_ABSENT", "MIGRATION_HISTORY_PRESENT",
      "NEGATIVE_CAPABILITY_ONLY"].includes(value.fixture_case as string) ||
    typeof value.transaction_started !== "boolean" ||
    typeof value.rollback_attempted !== "boolean" ||
    typeof value.rollback_performed !== "boolean" ||
    !["NOT_REQUIRED", "NOT_ATTEMPTED", "SUCCEEDED", "FAILED"].includes(
      value.rollback_status as string) ||
    typeof value.session_close_performed !== "boolean" ||
    typeof value.container_cleanup_performed !== "boolean" ||
    !["NOT_ATTEMPTED", "SUCCEEDED", "FAILED"].includes(value.cleanup_status as string) ||
    !FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_CODES.includes(
      value.primary_failure_code as FarmOsProductionIdentityPostgresQualificationFailureCode) ||
    !FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_CODES.includes(
      value.terminal_failure_code as FarmOsProductionIdentityPostgresQualificationFailureCode) ||
    value.failure_code !== value.terminal_failure_code ||
    value.executor_authority_id !==
      "farmos.production-identity-postgres-isolated-qualification-executor.v4" ||
    typeof value.source_commit !== "string" || !/^[a-f0-9]{40}$/u.test(value.source_commit) ||
    !isDigest(value.source_digest) ||
    value.query_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256 ||
    value.bootstrap_authority_id !==
      FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id ||
    value.bootstrap_sha256 !== FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256 ||
    value.production_operations !== 0 || value.secret_exposed !== false ||
    value.filesystem_persistence !== 0) return null;
  if ((value.rollback_status === "SUCCEEDED") !== value.rollback_performed ||
    (value.rollback_status === "NOT_REQUIRED" &&
      (value.transaction_started || value.rollback_attempted || value.rollback_performed)) ||
    (value.rollback_status === "NOT_ATTEMPTED" &&
      (!value.transaction_started || value.rollback_attempted || value.rollback_performed)) ||
    (value.rollback_status === "FAILED" &&
      (!value.transaction_started || !value.rollback_attempted || value.rollback_performed)) ||
    (value.rollback_status === "SUCCEEDED" &&
      (!value.transaction_started || !value.rollback_attempted)) ||
    (value.cleanup_status === "SUCCEEDED") !== value.container_cleanup_performed ||
    (value.cleanup_status === "FAILED" && value.container_cleanup_performed)) return null;
  const sectionPhase = ["ADAPTER_ALLOWLIST", "SECTION_QUERY",
    "SECTION_RESULT_MATERIALIZATION"].includes(value.failure_phase as string);
  if (sectionPhase !== (value.section_id !== null) ||
    (sectionPhase && value.fixture_case === "NEGATIVE_CAPABILITY_ONLY") ||
    (value.section_id === "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT" &&
      value.fixture_case !== "MIGRATION_HISTORY_PRESENT") ||
    value.sqlstate !== null && value.failure_phase !== "SECTION_QUERY" ||
    (sectionPhase && value.primary_failure_code !== "SECTION_EXECUTION_FAILED") ||
    (value.failure_phase === "PARSER_HANDOFF" && value.primary_failure_code !== "PARSER_FAILED") ||
    (value.failure_phase === "SANITIZER_HANDOFF" &&
      value.primary_failure_code !== "SANITIZATION_FAILED") ||
    (value.failure_phase === "ROLLBACK" && value.primary_failure_code !== "ROLLBACK_FAILED") ||
    (value.failure_phase === "SESSION_CLOSE" &&
      value.primary_failure_code !== "SESSION_CLOSE_FAILED") ||
    (value.failure_phase === "CLEANUP" && value.primary_failure_code !== "CLEANUP_FAILED") ||
    (value.failure_phase === "CLEANUP" && value.completed_section_count !==
      (value.fixture_case === "NEGATIVE_CAPABILITY_ONLY" ? 0 :
        value.fixture_case === "MIGRATION_HISTORY_PRESENT" ? 11 : 10)) ||
    (value.failure_phase === "PARSER_HANDOFF" &&
      ![8, value.fixture_case === "MIGRATION_HISTORY_PRESENT" ? 11 : 10]
        .includes(value.completed_section_count)) ||
    (value.failure_phase === "SANITIZER_HANDOFF" &&
      value.completed_section_count !==
        (value.fixture_case === "MIGRATION_HISTORY_PRESENT" ? 11 : 10)) ||
    (value.cleanup_status === "FAILED") !== (value.terminal_failure_code === "CLEANUP_FAILED") ||
    (value.terminal_failure_code === "SESSION_CLOSE_FAILED" && value.session_close_performed) ||
    (value.rollback_status === "FAILED" &&
      !["ROLLBACK_FAILED", "CLEANUP_FAILED"].includes(value.terminal_failure_code as string))) {
    return null;
  }
  return Object.freeze(value as unknown as FarmOsProductionIdentityPostgresQualificationFailure);
}

export function parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV2(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationLegacyFailureV2 | null {
  if (!isRecord(value) || !exactKeys(value, FAILURE_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_VERSION ||
    value.executor_authority_id !==
      "farmos.production-identity-postgres-isolated-qualification-executor.v1" ||
    value.query_authority_id !== "farmos.production-target-identity-query.v2" ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256) return null;
  const remapped = {
    ...value,
    schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION,
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v4",
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  };
  if (parseFarmOsProductionIdentityPostgresQualificationFailure(remapped) === null) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationLegacyFailureV2,
  );
}

export function parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV3(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationLegacyFailureV3 | null {
  if (!isRecord(value) || !exactKeys(value, FAILURE_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_V3_VERSION ||
    value.executor_authority_id !==
      "farmos.production-identity-postgres-isolated-qualification-executor.v2" ||
    value.query_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE.authority_id ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256) return null;
  const remapped = {
    ...value,
    schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION,
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v4",
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  };
  if (parseFarmOsProductionIdentityPostgresQualificationFailure(remapped) === null) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationLegacyFailureV3,
  );
}

export function parseFarmOsProductionIdentityPostgresQualificationLegacyFailureV4(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationLegacyFailureV4 | null {
  if (!isRecord(value) || !exactKeys(value, FAILURE_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_FAILURE_V4_VERSION ||
    value.executor_authority_id !==
      "farmos.production-identity-postgres-isolated-qualification-executor.v3" ||
    value.query_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256) return null;
  const remapped = {
    ...value,
    schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_FAILURE_VERSION,
    executor_authority_id:
      "farmos.production-identity-postgres-isolated-qualification-executor.v4",
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  };
  if (parseFarmOsProductionIdentityPostgresQualificationFailure(remapped) === null) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationLegacyFailureV4,
  );
}

const EVIDENCE_KEYS = [
  "schema_version", "qualification_id", "git_commit", "observed_at", "postgres_major",
  "server_version_num", "image_tag", "image_id", "image_repo_digest",
  "bootstrap_authority_candidate_id", "bootstrap_query_sha256", "query_authority_id",
  "query_sha256", "runtime_contract_version", "section_count", "catalog_capability_columns",
  "full_query_executor_call_count", "executed_section_count", "parser_pass", "sanitizer_pass",
  "sensitive_marker_occurrences", "cluster_identifier_exposure_count", "h1_h2_case",
  "h2_invocation_count", "h2_row_count", "fixture_digest", "assertion_count", "classification", "transaction_mode",
  "rollback_performed", "container_cleanup_performed", "production_operations", "secret_exposed",
] as const;

export function parseFarmOsProductionIdentityPostgresQualificationEvidence(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationEvidence | null {
  if (!isRecord(value) || !exactKeys(value, EVIDENCE_KEYS)) return null;
  if (value.schema_version !== FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION ||
    !isBoundedString(value.qualification_id) ||
    typeof value.git_commit !== "string" || !/^[a-f0-9]{40}$/u.test(value.git_commit) ||
    !isCanonicalInstant(value.observed_at) ||
    ![14, 15, 16, 17].includes(value.postgres_major as number) ||
    typeof value.server_version_num !== "number" || !Number.isSafeInteger(value.server_version_num) ||
    Math.floor(value.server_version_num / 10_000) !== value.postgres_major ||
    !isBoundedString(value.image_tag) || value.image_tag !== `postgres:${value.postgres_major}` ||
    !isBoundedString(value.image_id) || !isDigest(value.image_repo_digest) ||
    value.bootstrap_authority_candidate_id !== FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id ||
    value.bootstrap_query_sha256 !== FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256 ||
    value.query_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256 ||
    value.runtime_contract_version !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION ||
    value.section_count !== 11 ||
    !Array.isArray(value.catalog_capability_columns) ||
    !value.catalog_capability_columns.every((column) => column === "inherit_option" || column === "set_option") ||
    new Set(value.catalog_capability_columns).size !== value.catalog_capability_columns.length ||
    (value.full_query_executor_call_count !== 0 && value.full_query_executor_call_count !== 1) ||
    typeof value.executed_section_count !== "number" || !Number.isSafeInteger(value.executed_section_count) ||
    value.executed_section_count < 0 || value.executed_section_count > 11 ||
    typeof value.parser_pass !== "boolean" || typeof value.sanitizer_pass !== "boolean" ||
    value.sensitive_marker_occurrences !== 0 || value.cluster_identifier_exposure_count !== 0 ||
    !["MIGRATION_HISTORY_ABSENT", "MIGRATION_HISTORY_PRESENT", "NOT_RUN_INCOMPATIBLE"].includes(value.h1_h2_case as string) ||
    (value.h2_invocation_count !== 0 && value.h2_invocation_count !== 1) ||
    (value.h2_row_count !== 0 && value.h2_row_count !== 5) ||
    !isDigest(value.fixture_digest) ||
    typeof value.assertion_count !== "number" || !Number.isSafeInteger(value.assertion_count) || value.assertion_count < 1 ||
    !FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_CLASSIFICATIONS.includes(value.classification as FarmOsProductionIdentityQualificationClassification) ||
    !["REPEATABLE READ READ ONLY", "NOT_STARTED_INCOMPATIBLE"].includes(value.transaction_mode as string) ||
    typeof value.rollback_performed !== "boolean" || typeof value.container_cleanup_performed !== "boolean" ||
    value.production_operations !== 0 || value.secret_exposed !== false) return null;
  if ((value.postgres_major === 14 || value.postgres_major === 15) &&
    (value.classification !== "NOT_ELIGIBLE" || value.catalog_capability_columns.length !== 0 ||
      value.full_query_executor_call_count !== 0 || value.executed_section_count !== 0 || value.parser_pass ||
      value.sanitizer_pass || value.h1_h2_case !== "NOT_RUN_INCOMPATIBLE" || value.h2_invocation_count !== 0 ||
      value.h2_row_count !== 0 || value.transaction_mode !== "NOT_STARTED_INCOMPATIBLE" || value.rollback_performed ||
      !value.container_cleanup_performed)) return null;
  if ((value.postgres_major === 16 || value.postgres_major === 17) && value.classification === "QUALIFIED" &&
    (value.catalog_capability_columns.length !== 2 || value.catalog_capability_columns[0] !== "inherit_option" ||
      value.catalog_capability_columns[1] !== "set_option" || value.full_query_executor_call_count !== 1 ||
      !value.parser_pass || !value.sanitizer_pass || value.h1_h2_case === "NOT_RUN_INCOMPATIBLE" ||
      value.transaction_mode !== "REPEATABLE READ READ ONLY" || !value.rollback_performed ||
      !value.container_cleanup_performed ||
      (value.h1_h2_case === "MIGRATION_HISTORY_ABSENT" &&
        (value.executed_section_count !== 10 || value.h2_invocation_count !== 0 || value.h2_row_count !== 0)) ||
      (value.h1_h2_case === "MIGRATION_HISTORY_PRESENT" &&
        (value.executed_section_count !== 11 || value.h2_invocation_count !== 1 || value.h2_row_count !== 5)))) return null;
  return Object.freeze(value as unknown as FarmOsProductionIdentityPostgresQualificationEvidence);
}

export function parseFarmOsProductionIdentityPostgresQualificationLegacyEvidenceV2(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationLegacyEvidenceV2 | null {
  if (!isRecord(value) || !exactKeys(value, EVIDENCE_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EVIDENCE_V2_VERSION ||
    value.query_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE.authority_id ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256) return null;
  const remapped = {
    ...value,
    schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION,
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  };
  if (parseFarmOsProductionIdentityPostgresQualificationEvidence(remapped) === null) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationLegacyEvidenceV2,
  );
}

export function parseFarmOsProductionIdentityPostgresQualificationLegacyEvidenceV3(
  value: unknown,
): FarmOsProductionIdentityPostgresQualificationLegacyEvidenceV3 | null {
  if (!isRecord(value) || !exactKeys(value, EVIDENCE_KEYS) ||
    value.schema_version !==
      FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_LEGACY_EVIDENCE_V3_VERSION ||
    value.query_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE.authority_id ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_SHA256) return null;
  const remapped = {
    ...value,
    schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION,
    query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  };
  if (parseFarmOsProductionIdentityPostgresQualificationEvidence(remapped) === null) return null;
  return Object.freeze(
    value as unknown as FarmOsProductionIdentityPostgresQualificationLegacyEvidenceV3,
  );
}

export function sha256FarmOsProductionIdentityQualificationSource(source: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(source, "utf8").digest("hex")}`;
}
