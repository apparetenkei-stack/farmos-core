import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID =
  "farmos.production-postgres-version-bootstrap-query.v1" as const;
export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH =
  "scripts/sql/farm_os_production_postgres_version_bootstrap_query_v1.sql" as const;
export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256 =
  "sha256:18aa8d2617daaf01fee517d453eeb21c611e9365b020b557881edf6828a8862a" as const;
export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_RESULT_CONTRACT_VERSION =
  "farmos.production-postgres-version-bootstrap-result.v1" as const;

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE_HISTORY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID,
  purpose: "postgres_compatibility_preflight",
  status: "CANDIDATE_FOR_APPROVAL",
  authority_status: "REQUIRED_NOT_APPROVED",
  artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
  sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256,
  caller_input_count: 0,
  mutation_count: 0,
  credential_selection_count: 0,
  output_row_count: 1,
  output_column_count: 1,
  output_column: "server_version_num",
  repository_authority_adopted: false,
  runtime_bound: false,
  execution_authorized: false,
  source_foundation_commit: "5713ecfa2cdbcecb2e14fa47946424bca7b353ff",
  source_foundation_sol_review: Object.freeze({
    result: "GO",
    p1: 0,
    p2: 0,
    p3: 1,
    evidence_class: "SESSION_REVIEW_FACT_NOT_ADOPTION_AUTHORITY",
  }),
} as const);

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY = Object.freeze({
  schema_version: "farmos.repository-query-authority.v1",
  authority_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID,
  version: "v1",
  purpose: "postgres_compatibility_preflight",
  query_artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
  query_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256,
  result_contract: Object.freeze({
    contract_version: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_RESULT_CONTRACT_VERSION,
    row_count: 1,
    column_count: 1,
    exact_columns: Object.freeze(["server_version_num"] as const),
    column_type: "SAFE_NON_NEGATIVE_INTEGER",
    coercion_allowed: false,
    unknown_columns_allowed: false,
  }),
  review_status: "APPROVED",
  adoption_status: "ADOPTED",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  execution_authorized: false,
  automatic_latest_selection: false,
  tracked_preimage_available: true,
  approval_review_reference: "review/production-postgres-bootstrap-query-v1/formal-adoption-sol-go",
  candidate_history_reference: "candidate-history/production-postgres-bootstrap-query-v1/source-foundation",
} as const);

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ADOPTION_LINEAGE = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY_ID,
  candidate_status: "CANDIDATE_FOR_APPROVAL",
  candidate_authority_status: "REQUIRED_NOT_APPROVED",
  candidate_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256,
  review_status: "APPROVED",
  adoption_status: "ADOPTED",
  runtime_binding_effect: "NONE",
  execution_authorization_effect: "NONE",
  candidate_history_preserved: true,
} as const);

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_VERSION_POLICY = Object.freeze({
  current_version: "v1",
  same_version_digest_overwrite: "FORBIDDEN",
  changed_bytes_require_authority_version: "v2",
  required_gates: Object.freeze(["REVIEW", "REPOSITORY_ADOPTION", "RUNTIME_BINDING"] as const),
  automatic_latest_selection: false,
} as const);

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_AUTHORITY_BOUNDARY = Object.freeze({
  repository_authority_source_of_truth:
    "src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority.ts",
  runtime_foundation_compatibility_requirement_class: "DEFAULT_DISABLED_RUNTIME_SNAPSHOT",
  runtime_snapshot_may_decide_repository_adoption: false,
  repository_adoption_implies_runtime_binding: false,
  repository_adoption_implies_execution_authorization: false,
  technical_qualification_status: "NOT_RUN",
  blocked_postgres_compatibility: true,
} as const);

export const FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITIES = Object.freeze([
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY,
] as const);

export type FarmOsProductionPostgresBootstrapQueryAuthority =
  typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITIES[number];

export function resolveFarmOsProductionPostgresBootstrapQueryAuthority(
  authorityId: string,
): FarmOsProductionPostgresBootstrapQueryAuthority | null {
  return FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITIES.find(
    (authority) => authority.authority_id === authorityId,
  ) ?? null;
}

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function exactCanonical(value: unknown, expected: unknown): boolean {
  if (Array.isArray(expected)) {
    return Array.isArray(value) && value.length === expected.length &&
      expected.every((item, index) => exactCanonical(value[index], item));
  }
  if (record(expected)) {
    if (!record(value)) return false;
    const keys = Object.keys(expected);
    return Object.keys(value).length === keys.length && keys.every(
      (key) => Object.hasOwn(value, key) && exactCanonical(value[key], expected[key]),
    );
  }
  return value === expected;
}

export function parseFarmOsProductionPostgresBootstrapQueryAuthority(
  value: unknown,
): typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY | null {
  return exactCanonical(value, FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY)
    ? FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY
    : null;
}

export type FarmOsProductionPostgresBootstrapResult = Readonly<{
  server_version_num: number;
  postgres_major: number;
}>;

export function parseFarmOsProductionPostgresBootstrapResult(
  value: unknown,
): FarmOsProductionPostgresBootstrapResult | null {
  if (!record(value) || Object.keys(value).length !== 1 || !Object.hasOwn(value, "server_version_num")) return null;
  const version = value.server_version_num;
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 0) return null;
  const postgresMajor = Math.floor(version / 10_000);
  if (postgresMajor <= 0) return null;
  return Object.freeze({ server_version_num: version, postgres_major: postgresMajor });
}

export function parseFarmOsProductionPostgresBootstrapResultSet(
  value: unknown,
): FarmOsProductionPostgresBootstrapResult | null {
  return Array.isArray(value) && value.length === 1
    ? parseFarmOsProductionPostgresBootstrapResult(value[0])
    : null;
}

export type FarmOsProductionPostgresBootstrapArtifactVerification =
  | Readonly<{
    status: "VERIFIED";
    artifact_path: typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH;
    sha256: typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256;
    byte_count: 77;
    raw_bytes: Uint8Array;
  }>
  | Readonly<{
    status: "BLOCKED";
    reason: "CALLER_INPUT_FORBIDDEN" | "ARTIFACT_MISSING" | "ARTIFACT_SHA_MISMATCH" | "ARTIFACT_BYTE_CONTRACT_INVALID";
    artifact_path: typeof FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH;
    actual_sha256: `sha256:${string}` | null;
  }>;

const sha256Bytes = (bytes: Uint8Array): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export function verifyFarmOsProductionPostgresBootstrapQueryArtifactBytes(
  bytes: Uint8Array | null,
): FarmOsProductionPostgresBootstrapArtifactVerification {
  if (bytes === null) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "ARTIFACT_MISSING",
      artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
      actual_sha256: null,
    });
  }
  const actual = sha256Bytes(bytes);
  if (actual !== FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "ARTIFACT_SHA_MISMATCH",
      artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
      actual_sha256: actual,
    });
  }
  const text = Buffer.from(bytes).toString("utf8");
  if (bytes.byteLength !== 77 || text.includes("\r") || !text.endsWith("\n") ||
    Buffer.from(bytes.subarray(0, 3)).equals(Buffer.from([0xef, 0xbb, 0xbf]))) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "ARTIFACT_BYTE_CONTRACT_INVALID",
      artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
      actual_sha256: actual,
    });
  }
  return Object.freeze({
    status: "VERIFIED",
    artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
    sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_SHA256,
    byte_count: 77,
    raw_bytes: bytes,
  });
}

const FIXED_ARTIFACT_URL = new URL(
  `../../../${FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH}`,
  import.meta.url,
);

export function loadFarmOsProductionPostgresBootstrapQueryArtifact(
  ...callerInput: readonly unknown[]
): FarmOsProductionPostgresBootstrapArtifactVerification {
  if (callerInput.length !== 0) {
    return Object.freeze({
      status: "BLOCKED",
      reason: "CALLER_INPUT_FORBIDDEN",
      artifact_path: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_ARTIFACT_PATH,
      actual_sha256: null,
    });
  }
  try {
    return verifyFarmOsProductionPostgresBootstrapQueryArtifactBytes(
      readFileSync(fileURLToPath(FIXED_ARTIFACT_URL)),
    );
  } catch {
    return verifyFarmOsProductionPostgresBootstrapQueryArtifactBytes(null);
  }
}
