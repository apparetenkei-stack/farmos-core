import { createHash } from "node:crypto";

import {
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY as ADOPTED_BOOTSTRAP_AUTHORITY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY,
  parseFarmOsProductionPostgresBootstrapResult,
  type FarmOsProductionPostgresBootstrapResult,
} from "../../../src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
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
  "farmos.production-identity-postgres-qualification-evidence.v1" as const;

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
  v2_query_authority_id: "farmos.production-target-identity-query.v2";
  v2_query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256;
  runtime_contract_version: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION;
  section_count: 11;
  catalog_capability_columns: readonly ("inherit_option" | "set_option")[];
  full_v2_executor_call_count: 0 | 1;
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

const EVIDENCE_KEYS = [
  "schema_version", "qualification_id", "git_commit", "observed_at", "postgres_major",
  "server_version_num", "image_tag", "image_id", "image_repo_digest",
  "bootstrap_authority_candidate_id", "bootstrap_query_sha256", "v2_query_authority_id",
  "v2_query_sha256", "runtime_contract_version", "section_count", "catalog_capability_columns",
  "full_v2_executor_call_count", "executed_section_count", "parser_pass", "sanitizer_pass",
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
    value.v2_query_authority_id !== "farmos.production-target-identity-query.v2" ||
    value.v2_query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256 ||
    value.runtime_contract_version !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION ||
    value.section_count !== 11 ||
    !Array.isArray(value.catalog_capability_columns) ||
    !value.catalog_capability_columns.every((column) => column === "inherit_option" || column === "set_option") ||
    new Set(value.catalog_capability_columns).size !== value.catalog_capability_columns.length ||
    (value.full_v2_executor_call_count !== 0 && value.full_v2_executor_call_count !== 1) ||
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
      value.full_v2_executor_call_count !== 0 || value.executed_section_count !== 0 || value.parser_pass ||
      value.sanitizer_pass || value.h1_h2_case !== "NOT_RUN_INCOMPATIBLE" || value.h2_invocation_count !== 0 ||
      value.h2_row_count !== 0 || value.transaction_mode !== "NOT_STARTED_INCOMPATIBLE" || value.rollback_performed ||
      !value.container_cleanup_performed)) return null;
  if ((value.postgres_major === 16 || value.postgres_major === 17) && value.classification === "QUALIFIED" &&
    (value.catalog_capability_columns.length !== 2 || value.catalog_capability_columns[0] !== "inherit_option" ||
      value.catalog_capability_columns[1] !== "set_option" || value.full_v2_executor_call_count !== 1 ||
      !value.parser_pass || !value.sanitizer_pass || value.h1_h2_case === "NOT_RUN_INCOMPATIBLE" ||
      value.transaction_mode !== "REPEATABLE READ READ ONLY" || !value.rollback_performed ||
      !value.container_cleanup_performed ||
      (value.h1_h2_case === "MIGRATION_HISTORY_ABSENT" &&
        (value.executed_section_count !== 10 || value.h2_invocation_count !== 0 || value.h2_row_count !== 0)) ||
      (value.h1_h2_case === "MIGRATION_HISTORY_PRESENT" &&
        (value.executed_section_count !== 11 || value.h2_invocation_count !== 1 || value.h2_row_count !== 5)))) return null;
  return Object.freeze(value as unknown as FarmOsProductionIdentityPostgresQualificationEvidence);
}

export function sha256FarmOsProductionIdentityQualificationSource(source: string): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(source, "utf8").digest("hex")}`;
}
