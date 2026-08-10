import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { digestFarmOsPostgresClusterSystemIdentifier } from
  "./farm_os_postgres_cluster_system_identifier_digest";

export const FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID =
  "farmos.production-target-identity-minimal-observation-query.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_ARTIFACT_PATH =
  "scripts/sql/farm_os_production_target_identity_minimal_observation_v1.sql" as const;
export const FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256 =
  "sha256:bed2dafb8bbdd81b8595f6664d440e4c1dd4daea2077bae7232f0e4592580805" as const;

export const FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  version: "v1",
  purpose: "production_target_identity_formal_evidence_acquisition",
  artifact_path: FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_ARTIFACT_PATH,
  artifact_sha256: FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
  statement_plan: Object.freeze([
    Object.freeze({ ordinal: 1, statement_id: "MINIMAL_TARGET_IDENTITY_OBSERVATION", row_count: 1 }),
  ]),
  result_columns: Object.freeze([
    "transaction_read_only",
    "database_logical_name",
    "postgres_major",
    "cluster_system_identifier_internal",
  ] as const),
  execution: Object.freeze({
    connection_maximum: 1,
    transaction_count: 1,
    isolation_level: "REPEATABLE READ",
    transaction_access_mode: "READ ONLY",
    automatic_retry: 0,
    fallback: 0,
    commit: 0,
    rollback: "REQUIRED",
    connection_close: "REQUIRED",
  }),
  forbidden_scope: Object.freeze([
    "BUSINESS_TABLE_DATA", "APPLICATION_ROWS", "MIGRATION_WRITES", "DDL", "GRANT",
    "ROLE_MUTATION", "ARBITRARY_CATALOG_DUMP",
  ] as const),
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  execution_enabled: false,
} as const);

export type FarmOsProductionTargetIdentityMinimalRawRow = Readonly<{
  transaction_read_only: unknown;
  database_logical_name: unknown;
  postgres_major: unknown;
  cluster_system_identifier_internal: unknown;
}>;

export type FarmOsProductionTargetIdentityMinimalObservation = Readonly<{
  transaction_read_only: true;
  database_logical_name: string;
  postgres_major: number;
  cluster_system_identifier_digest: `sha256:${string}`;
}>;

export type FarmOsMinimalObservationParseResult =
  | Readonly<{ accepted: true; observation: FarmOsProductionTargetIdentityMinimalObservation }>
  | Readonly<{
    accepted: false;
    reason:
      | "ROW_CONTRACT_INVALID"
      | "TRANSACTION_NOT_READ_ONLY"
      | "DATABASE_LOGICAL_NAME_MISMATCH"
      | "POSTGRES_MAJOR_MISMATCH"
      | "CLUSTER_IDENTIFIER_INVALID";
  }>;

const EXACT_ROW_KEYS = Object.freeze([
  "cluster_system_identifier_internal", "database_logical_name", "postgres_major",
  "transaction_read_only",
] as const);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

export function parseFarmOsProductionTargetIdentityMinimalObservation(
  row: unknown,
  expected: Readonly<{ database_logical_name: string; expected_postgres_major: number }>,
): FarmOsMinimalObservationParseResult {
  if (!record(row) || !exactKeys(row, EXACT_ROW_KEYS) ||
    typeof row.transaction_read_only !== "string" ||
    typeof row.database_logical_name !== "string" ||
    typeof row.postgres_major !== "number" || !Number.isInteger(row.postgres_major) ||
    typeof row.cluster_system_identifier_internal !== "string") {
    return Object.freeze({ accepted: false, reason: "ROW_CONTRACT_INVALID" });
  }
  if (row.transaction_read_only !== "on") {
    return Object.freeze({ accepted: false, reason: "TRANSACTION_NOT_READ_ONLY" });
  }
  if (row.database_logical_name !== expected.database_logical_name) {
    return Object.freeze({ accepted: false, reason: "DATABASE_LOGICAL_NAME_MISMATCH" });
  }
  if (row.postgres_major !== expected.expected_postgres_major) {
    return Object.freeze({ accepted: false, reason: "POSTGRES_MAJOR_MISMATCH" });
  }
  const digest = digestFarmOsPostgresClusterSystemIdentifier(
    row.cluster_system_identifier_internal,
  );
  if (!digest.accepted) {
    return Object.freeze({ accepted: false, reason: "CLUSTER_IDENTIFIER_INVALID" });
  }
  return Object.freeze({
    accepted: true,
    observation: Object.freeze({
      transaction_read_only: true,
      database_logical_name: row.database_logical_name,
      postgres_major: row.postgres_major,
      cluster_system_identifier_digest: digest.digest,
    }),
  });
}

function sha256(bytes: Uint8Array): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

export function verifyFarmOsProductionTargetIdentityMinimalObservationArtifact(
  bytes: Uint8Array | null,
): Readonly<{ verified: boolean; actual_sha256: `sha256:${string}` | null }> {
  if (bytes === null) return Object.freeze({ verified: false, actual_sha256: null });
  const actual = sha256(bytes);
  return Object.freeze({
    verified: actual === FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
    actual_sha256: actual,
  });
}

const ARTIFACT_URL = new URL(
  `../../../${FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_ARTIFACT_PATH}`,
  import.meta.url,
);

export function loadFarmOsProductionTargetIdentityMinimalObservationArtifact(): Uint8Array | null {
  try {
    return readFileSync(fileURLToPath(ARTIFACT_URL));
  } catch {
    return null;
  }
}
