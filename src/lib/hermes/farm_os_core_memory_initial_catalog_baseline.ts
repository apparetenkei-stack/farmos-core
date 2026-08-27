import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import {
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2,
  FARM_OS_DAY150_PROPOSAL_INBOX_BASE_RELATION_DDL,
  compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
} from "./farm_os_day150_prefix_initial_catalog_authority";
import {
  parseFarmOsCoreMigrationManifest,
  type FarmOsCoreMigrationManifest,
} from "./farm_os_core_db_migration_manifest";

export const FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SCHEMA =
  "farmos.core-memory-initial-catalog-baseline-authority.v1" as const;
export const FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_ID =
  "farmos.core-memory-initial-catalog-baseline.v1" as const;
export const FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH =
  "db/provisioning/core-memory-initial-catalog-baseline.v1.sql" as const;
export const FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_AUTHORITY_PATH =
  "db/provisioning/core-memory-initial-catalog-baseline.v1.json" as const;
export const FARM_OS_CORE_MEMORY_POSTGRES_MAJOR = 17 as const;

const MANIFEST_PATH = "db/provisioning/manifest.json" as const;
const AUTHORITY_SOURCE_PATH =
  "src/lib/hermes/farm_os_day150_prefix_initial_catalog_authority.ts" as const;
const DAY3_SOURCE_PATH = "scripts/sql/day3_roles_and_proposal_inbox.sql" as const;
const DAY146_SOURCE_PATH =
  "scripts/sql/day146_operational_memory_snapshot_persistence.sql" as const;
const SHA256 = /^sha256:[0-9a-f]{64}$/u;

const digest = (bytes: string | Buffer): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean =>
  Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key));
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export type FarmOsCoreMemoryInitialCatalogBaselineAuthority = Readonly<{
  schema_version: typeof FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SCHEMA;
  baseline_id: typeof FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_ID;
  baseline_sql_path: typeof FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH;
  baseline_sha256: `sha256:${string}`;
  postgres_major: typeof FARM_OS_CORE_MEMORY_POSTGRES_MAJOR;
  product_owner_authority: "LONG_LIVED_CORE_MEMORY_FRESH_BASELINE";
  source_artifacts: readonly Readonly<{ path: string; sha256: `sha256:${string}` }>[];
  expected_prerequisite_objects: readonly string[];
  forbidden_business_data: true;
  migration_manifest_path: typeof MANIFEST_PATH;
  migration_manifest_sha256: `sha256:${string}`;
  migrations: readonly Readonly<{
    migration_id: string;
    sequence: number;
    checksum: string;
    apply_script: string;
    verification_script: string;
  }>[];
  final_migration_head: string;
}>;

function loadManifest(): { manifest: FarmOsCoreMigrationManifest; bytes: Buffer } {
  const bytes = readFileSync(MANIFEST_PATH);
  const parsed = parseFarmOsCoreMigrationManifest(JSON.parse(bytes.toString("utf8")));
  if (parsed === null || parsed.migrations.length !== 6) {
    throw new Error("CORE_MEMORY_BASELINE_MIGRATION_MANIFEST_INVALID");
  }
  return { manifest: parsed, bytes };
}

function loadOperationalMemoryStructuralSlice(): string {
  const plan = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap();
  const operation = plan.operations.find((candidate) =>
    candidate.kind === "CREATE_PREPREFIX_STRUCTURE");
  if (operation === undefined) {
    throw new Error("CORE_MEMORY_BASELINE_SOURCE_INCOMPLETE");
  }
  const structural = operation.sql.replace(/^SET LOCAL ROLE [a-z0-9_]+;\n/u, "");
  if (structural === operation.sql || /\b(?:CREATE ROLE|GRANT|PASSWORD)\b/iu.test(structural)) {
    throw new Error("CORE_MEMORY_BASELINE_SOURCE_UNSAFE");
  }
  return structural.trim();
}

export function compileFarmOsCoreMemoryInitialCatalogBaselineSql(): string {
  const operationalMemory = loadOperationalMemoryStructuralSlice();
  return `-- FarmOS Core Memory long-lived fresh initial catalog baseline v1.
-- Product Owner authority: LONG_LIVED_CORE_MEMORY_FRESH_BASELINE.
-- This ends immediately before migration #1 and creates no migration-history rows.
\\set ON_ERROR_STOP on
begin;

create schema ai;
revoke all on schema ai from public;

${FARM_OS_DAY150_PROPOSAL_INBOX_BASE_RELATION_DDL}
revoke all on table ai.proposal_inbox from public;

${operationalMemory}

revoke all on table
  ai.operational_memory_source_snapshots,
  ai.operational_memory_snapshot_state_events,
  ai.operational_memory_daily_projections,
  ai.operational_memory_projection_state_events,
  ai.operational_memory_projection_lineage,
  ai.operational_memory_ingestion_rejections
from public;
revoke all on function
  ai.reject_operational_memory_immutable_mutation(),
  ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)
from public;

commit;
`;
}

export function compileFarmOsCoreMemoryInitialCatalogBaselineAuthority(
  baselineSql = compileFarmOsCoreMemoryInitialCatalogBaselineSql(),
): FarmOsCoreMemoryInitialCatalogBaselineAuthority {
  const { manifest, bytes: manifestBytes } = loadManifest();
  const sourcePaths = [AUTHORITY_SOURCE_PATH, DAY3_SOURCE_PATH, DAY146_SOURCE_PATH] as const;
  return Object.freeze({
    schema_version: FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SCHEMA,
    baseline_id: FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_ID,
    baseline_sql_path: FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH,
    baseline_sha256: digest(baselineSql),
    postgres_major: FARM_OS_CORE_MEMORY_POSTGRES_MAJOR,
    product_owner_authority: "LONG_LIVED_CORE_MEMORY_FRESH_BASELINE",
    source_artifacts: Object.freeze(sourcePaths.map((path) => Object.freeze({
      path,
      sha256: digest(readFileSync(path)),
    }))),
    expected_prerequisite_objects: Object.freeze([
      "schema:ai",
      "table:ai.proposal_inbox",
      ...FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.initial_objects
        .filter((object) => object.identity !== "ai" && object.identity !== "ai.proposal_inbox")
        .map((object) => `${object.object_type}:${object.identity}`),
      "trigger:ai.operational_memory_source_snapshots_append_only",
      "trigger:ai.operational_memory_snapshot_state_events_append_only",
      "trigger:ai.operational_memory_daily_projections_append_only",
      "trigger:ai.operational_memory_projection_state_events_append_only",
      "trigger:ai.operational_memory_projection_lineage_append_only",
      "trigger:ai.operational_memory_ingestion_rejections_append_only",
    ]),
    forbidden_business_data: true,
    migration_manifest_path: MANIFEST_PATH,
    migration_manifest_sha256: digest(manifestBytes),
    migrations: Object.freeze(manifest.migrations.map((migration) => Object.freeze({
      migration_id: migration.migration_id,
      sequence: migration.sequence,
      checksum: migration.checksum,
      apply_script: migration.apply_script,
      verification_script: migration.verification_script,
    }))),
    final_migration_head: manifest.migrations.at(-1)!.migration_id,
  });
}

export function serializeFarmOsCoreMemoryInitialCatalogBaselineAuthority(
  authority = compileFarmOsCoreMemoryInitialCatalogBaselineAuthority(),
): string {
  return `${JSON.stringify(authority, null, 2)}\n`;
}

export function parseFarmOsCoreMemoryInitialCatalogBaselineAuthority(
  value: unknown,
): FarmOsCoreMemoryInitialCatalogBaselineAuthority | null {
  if (!record(value) || !exactKeys(value, [
    "schema_version", "baseline_id", "baseline_sql_path", "baseline_sha256",
    "postgres_major", "product_owner_authority", "source_artifacts",
    "expected_prerequisite_objects", "forbidden_business_data",
    "migration_manifest_path", "migration_manifest_sha256", "migrations",
    "final_migration_head",
  ]) || value.schema_version !== FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SCHEMA ||
    value.baseline_id !== FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_ID ||
    value.baseline_sql_path !== FARM_OS_CORE_MEMORY_INITIAL_CATALOG_BASELINE_SQL_PATH ||
    typeof value.baseline_sha256 !== "string" || !SHA256.test(value.baseline_sha256) ||
    value.postgres_major !== 17 ||
    value.product_owner_authority !== "LONG_LIVED_CORE_MEMORY_FRESH_BASELINE" ||
    value.forbidden_business_data !== true || value.migration_manifest_path !== MANIFEST_PATH ||
    typeof value.migration_manifest_sha256 !== "string" ||
    !SHA256.test(value.migration_manifest_sha256) || !Array.isArray(value.source_artifacts) ||
    !Array.isArray(value.expected_prerequisite_objects) || !Array.isArray(value.migrations) ||
    typeof value.final_migration_head !== "string") return null;
  return value as FarmOsCoreMemoryInitialCatalogBaselineAuthority;
}
