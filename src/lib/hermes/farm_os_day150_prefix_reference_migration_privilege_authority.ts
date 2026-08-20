import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY,
  FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
} from "./farm_os_day150_gate17_scope_authority";

import {
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION,
  FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
  FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC,
  FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  compileFarmOsDay150ReferenceInitialCatalogBootstrap,
  compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
} from "./farm_os_day150_prefix_initial_catalog_authority";
import {
  FARM_OS_STABLE_CHANGES_MIGRATION_METADATA,
} from "./farm_os_stable_changes_migration_reconciliation";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_SUCCESS_RECEIPT_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_TERMINAL_OUTCOME_RECEIPT_PATH,
} from "./farm_os_day150_prefix_terminal_outcome_receipt";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_PACKAGE_AUTHORITY_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
  FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_ROOTS_V1,
  FARM_OS_DAY150_PREFIX_REFERENCE_TSX_CONFIG_AUTHORITY_V1,
  deriveFarmOsDay150PrefixReferenceClosureDigest,
  deriveFarmOsDay150PrefixReferenceExecutableSourceClosure,
  deriveFarmOsDay150PrefixReferenceExecutableSourceClosureV2,
  deriveFarmOsDay150PrefixReferenceTsxConfigClosure,
} from "./farm_os_day150_prefix_reference_source_closure_authority";

export const FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_ID =
  "DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_V1" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_ID =
  "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_REVISION = 4 as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY = Object.freeze({
  policy_id: "DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY_V1",
  maximum_observation_window_milliseconds: 60_000,
  minimum_probe_interval_milliseconds: 500,
  maximum_attempts: 120,
  probe: "READ_ONLY_SELECT_1",
  scope: "ONE_RUNNER_INVOCATION_ONE_CONTAINER_STARTUP",
  execution_retry_authority: false,
} as const);

const canonical = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "string" ||
    typeof value === "number") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (typeof value !== "object") throw new Error("NON_JSON");
  const source = value as Record<string, unknown>;
  return `{${Object.keys(source).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(source[key])}`).join(",")}}`;
};
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\n${canonical(value)}`).digest("hex")}`;
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS = Object.freeze({
  V4: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v4",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v4",
    run: "farmos.day150-prefix-reference-v4-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v4-attempt-identity.v1",
  }),
  V5: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v5-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v5-proposal.v1",
    run: "farmos.day150-prefix-reference-v5-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v5-attempt-identity.v1",
  }),
  V6: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v6-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v6-proposal.v1",
    run: "farmos.day150-prefix-reference-v6-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v6-attempt-identity.v1",
  }),
  V7: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v7-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v7-proposal.v1",
    run: "farmos.day150-prefix-reference-v7-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v7-attempt-identity.v1",
  }),
  V8: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v8-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v8-proposal.v1",
    run: "farmos.day150-prefix-reference-v8-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v8-attempt-identity.v1",
  }),
  V9: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v9-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v9-proposal.v1",
    run: "farmos.day150-prefix-reference-v9-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v9-attempt-identity.v1",
  }),
  V10: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v10-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v10-proposal.v1",
    run: "farmos.day150-prefix-reference-v10-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v10-attempt-identity.v1",
  }),
  V11: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v11-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v11-proposal.v1",
    run: "farmos.day150-prefix-reference-v11-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v11-attempt-identity.v1",
  }),
  V12: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v12-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v12-proposal.v1",
    run: "farmos.day150-prefix-reference-v12-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v12-attempt-identity.v1",
  }),
  V13: Object.freeze({
    authorization: "farmos.day150-prefix-reference-execution-authorization.v13-proposal.v1",
    plan: "farmos.day150-prefix-reference-external-execution-plan.v13-proposal.v1",
    run: "farmos.day150-prefix-reference-v13-run-identity.v1",
    attempt: "farmos.day150-prefix-reference-v13-attempt-identity.v1",
  }),
  durable: Object.freeze({
    claim: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
    consumption_marker: "farmos.day150-prefix-reference-consumption-marker.v1",
    terminal_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA,
    success_receipt: "farmos.day150-reference-catalog-run-receipt-candidate.v1",
    candidate_provenance: "farmos.day150-prefix-reference-run-provenance.v1",
    run_nonce: "farmos.day150-prefix-reference-run-nonce.v1",
  }),
} as const);
const MIGRATIONS = Object.freeze(FARM_OS_STABLE_CHANGES_MIGRATION_METADATA.map((entry) =>
  Object.freeze({ migration_id: entry[0], artifact_sha256: entry[1],
    apply_path: `db/migrations/${entry[0]}.sql`,
    output_path: `artifacts/day150/prefix-expected-catalog/candidates/v1/${entry[0]}.json` })));
const DERIVATION_AUTHORITY = "farmos.day150-prefix-expected-catalog-derivation.v1" as const;
const REFERENCE_IMAGE =
  "docker.io/library/postgres@sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317" as const;
const REFERENCE_PLATFORM = "linux/arm64/v8" as const;

export const FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-migration-privilege-envelope.v1",
  authority_id: FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_ID,
  authority_revision: 1,
  owner: Object.freeze({
    semantic_principal: "REFERENCE_MIGRATION_OWNER",
    concrete_role: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
    login: false, createrole: false, superuser: false, createdb: false,
    replication: false, bypassrls: false,
  }),
  executor: Object.freeze({
    semantic_principal: FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC,
    concrete_role: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
    login: true, ephemeral_password: true, createrole: true, superuser: false,
    createdb: false, replication: false, bypassrls: false,
  }),
  membership: Object.freeze({
    granted_role: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
    member_role: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
    inherit: true, set: true, admin: false,
  }),
  database_privileges: Object.freeze({
    database: "farmos_day150_prefix_reference_v1",
    executor: Object.freeze(["CONNECT", "CREATE"] as const),
    public: Object.freeze([] as const),
    unrelated_database_connect: false,
    temporary: false,
  }),
  schema_privilege_source: "OWNER_MEMBERSHIP_OR_EXECUTOR_CREATED_SCHEMA",
  required_statement_classes: Object.freeze([
    "CREATE_SCHEMA", "CREATE_ROLE_NOSUPERUSER", "GRANT_ROLE_MEMBERSHIP",
    "ALTER_OWNER_OWNED_OBJECT", "CREATE_ALTER_DROP_OWNED_OBJECT",
    "GRANT_REVOKE_OWNED_OBJECT_PRIVILEGES", "CREATE_SECURITY_DEFINER_FUNCTION",
  ] as const),
  prohibited_statement_classes: Object.freeze([
    "CREATE_DATABASE", "ALTER_DATABASE", "CREATE_EXTENSION", "SUPERUSER",
    "CREATEDB", "REPLICATION", "BYPASSRLS", "ALTER_SYSTEM", "EXTERNAL_IO",
  ] as const),
  bootstrap_supervisor_operations: Object.freeze([
    "VERIFY_POSTGRES_MAJOR_17", "CREATE_EXACT_REFERENCE_PRINCIPALS",
    "GRANT_EXACT_OWNER_TO_EXECUTOR_MEMBERSHIP", "REVOKE_PUBLIC_DATABASE_ACCESS",
    "GRANT_EXECUTOR_CONNECT_CREATE_ON_REFERENCE_DATABASE",
    "EXECUTE_QUALIFIED_MINIMAL_BOOTSTRAP", "VERIFY_EXACT_INITIAL_READBACK",
  ] as const),
  target_migrations: Object.freeze(MIGRATIONS.map((spec) =>
    Object.freeze({ migration_id: spec.migration_id, artifact_sha256: spec.artifact_sha256,
      apply_path: spec.apply_path }))),
  semantic_normalization_revision:
    FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION,
} as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST = hash(
  "farmos.day150-prefix-reference-migration-privilege-envelope.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE,
);

export type FarmOsDay150MigrationPrivilegeStatement = Readonly<{
  migration_id: string; statement_ordinal: number; statement_class: string;
  target_object: string; required_privilege: string;
  authorized_by_v4: true; semantic_executor: "REFERENCE_MIGRATION_EXECUTOR";
}>;
const APPROVED_PRIVILEGE_STATEMENT_MANIFEST_DIGEST =
  "sha256:e00dcff2a201485cf5a3ed799d80c5562f477979a2619b6971ff20fed7817efc" as const;
const APPROVED_PRIVILEGE_STATEMENT_COUNTS = Object.freeze([
  36, 3, 9, 16, 25,
] as const);
const AUTHORITY_STATEMENT = /\b(?:CREATE|ALTER|DROP|GRANT|REVOKE)\s+(?:(?:OR\s+REPLACE|UNIQUE|CONSTRAINT)\s+)?(?:ROLE|SCHEMA|TABLE|INDEX|FUNCTION|TRIGGER|POLICY|DEFAULT\s+PRIVILEGES|DATABASE|EXTENSION)\b|\bGRANT\s+[a-z0-9_,\s]+\s+TO\s+[a-z0-9_]+|\bREVOKE\s+[a-z0-9_,\s]+\s+FROM\s+[a-z0-9_]+/giu;
const PROHIBITED = /\b(?:CREATE\s+DATABASE|ALTER\s+DATABASE|CREATE\s+EXTENSION|ALTER\s+SYSTEM|ALTER\s+ROLE\s+[^;]+\s+(?:SUPERUSER|CREATEDB|REPLICATION|BYPASSRLS)|COPY\s+[^;]*\s+PROGRAM|CREATE\s+(?:PUBLICATION|SUBSCRIPTION|FOREIGN\s+DATA\s+WRAPPER|SERVER))\b/iu;
const UNSUPPORTED_PRIVILEGE_BEARING = /\b(?:CREATE|ALTER|DROP)\s+(?:(?:OR\s+REPLACE|UNIQUE|CONSTRAINT)\s+)?(?:SEQUENCE|VIEW|MATERIALIZED\s+VIEW|TYPE|DOMAIN|COLLATION|LANGUAGE|CAST|OPERATOR|AGGREGATE|TABLESPACE|PUBLICATION|SUBSCRIPTION|SERVER|FOREIGN\s+DATA\s+WRAPPER)\b|\b(?:COMMENT|SECURITY\s+LABEL)\s+ON\b/iu;
function statementClass(fragment: string): Readonly<{
  statement_class: string; target_object: string; required_privilege: string;
}> | null {
  const normalized = fragment.trim().replace(/\s+/gu, " ");
  const patterns: readonly [RegExp, string, string][] = [
    [/^CREATE ROLE\s+([^\s;]+)/iu, "CREATE_ROLE", "CREATEROLE"],
    [/^ALTER ROLE\s+([^\s;]+)/iu, "ALTER_ROLE", "CREATEROLE_AND_ADMIN_OPTION"],
    [/^GRANT\s+([^\s,;]+(?:\s*,\s*[^\s,;]+)*)\s+TO\s+([^\s;]+)/iu,
      "GRANT_ROLE_MEMBERSHIP", "CREATEROLE_AND_ADMIN_OPTION"],
    [/^REVOKE\s+([^\s,;]+(?:\s*,\s*[^\s,;]+)*)\s+FROM\s+([^\s;]+)/iu,
      "REVOKE_ROLE_MEMBERSHIP", "CREATEROLE_AND_ADMIN_OPTION"],
    [/^CREATE SCHEMA(?: IF NOT EXISTS)?\s+([^\s;]+)/iu, "CREATE_SCHEMA", "DATABASE_CREATE"],
    [/^ALTER SCHEMA\s+([^\s;]+)/iu, "ALTER_SCHEMA", "SCHEMA_OWNER"],
    [/^CREATE TABLE(?: IF NOT EXISTS)?\s+([^\s(;]+)/iu, "CREATE_TABLE", "SCHEMA_CREATE"],
    [/^ALTER TABLE\s+([^\s;]+)/iu, "ALTER_TABLE", "TABLE_OWNER"],
    [/^CREATE(?: UNIQUE)? INDEX(?: IF NOT EXISTS)?\s+([^\s;]+)/iu, "CREATE_INDEX", "TABLE_OWNER"],
    [/^CREATE(?: OR REPLACE)? FUNCTION\s+([^\s(;]+)/iu, "CREATE_FUNCTION", "SCHEMA_CREATE"],
    [/^ALTER FUNCTION\s+([^\s;]+)/iu, "ALTER_FUNCTION", "FUNCTION_OWNER_OR_ROLE_MEMBERSHIP"],
    [/^CREATE(?: CONSTRAINT)? TRIGGER\s+([^\s;]+)/iu, "CREATE_TRIGGER", "TABLE_TRIGGER_AND_FUNCTION_EXECUTE"],
    [/^DROP TRIGGER(?: IF EXISTS)?\s+([^\s;]+)/iu, "DROP_TRIGGER", "TABLE_OWNER"],
    [/^CREATE POLICY\s+([^\s;]+)/iu, "CREATE_POLICY", "TABLE_OWNER"],
    [/^DROP POLICY(?: IF EXISTS)?\s+([^\s;]+)/iu, "DROP_POLICY", "TABLE_OWNER"],
    [/^ALTER DEFAULT PRIVILEGES\b/iu, "ALTER_DEFAULT_PRIVILEGES", "CURRENT_ROLE_DEFAULT_PRIVILEGES"],
    [/^GRANT\s+(.+?)\s+ON\s+([^\s;]+)/iu, "GRANT_OBJECT_PRIVILEGE", "OBJECT_OWNER"],
    [/^REVOKE\s+(.+?)\s+ON\s+([^\s;]+)/iu, "REVOKE_OBJECT_PRIVILEGE", "OBJECT_OWNER"],
    [/^DROP\s+(TABLE|FUNCTION|INDEX|SCHEMA)(?: IF EXISTS)?\s+([^\s;]+)/iu,
      "DROP_OWNED_OBJECT", "OBJECT_OWNER"],
  ];
  for (const [pattern, classification, privilege] of patterns) {
    const match = normalized.match(pattern);
    if (match) return Object.freeze({ statement_class: classification,
      target_object: String(match[2] ?? match[1] ?? "BOUNDED_DYNAMIC_TARGET"),
      required_privilege: privilege });
  }
  if (/\bOWNER TO\b/iu.test(normalized)) return Object.freeze({
    statement_class: "ALTER_OWNER", target_object: "BOUNDED_DYNAMIC_TARGET",
    required_privilege: "OBJECT_OWNER_AND_SET_ROLE_TARGET",
  });
  return null;
}
function authorityFragments(sql: string): readonly string[] {
  const fragments: string[] = [];
  for (const match of sql.matchAll(AUTHORITY_STATEMENT)) {
    const start = match.index ?? 0;
    const end = sql.indexOf(";", start);
    fragments.push(sql.slice(start, end < 0 ? sql.length : end));
  }
  return Object.freeze(fragments);
}
export function analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(input: readonly Readonly<{
  migration_id: string; sql: string;
}>[]): Readonly<{ status: "EXACT" | "MISMATCH";
  statements: readonly FarmOsDay150MigrationPrivilegeStatement[];
  requires_superuser: false; requires_createdb: false; requires_createrole: true;
  requires_database_create_privilege: true;
}> {
  const base = { requires_superuser: false as const, requires_createdb: false as const,
    requires_createrole: true as const, requires_database_create_privilege: true as const };
  if (input.length !== MIGRATIONS.length || input.some((entry, index) =>
    entry.migration_id !== MIGRATIONS[index]?.migration_id ||
    `sha256:${createHash("sha256").update(entry.sql).digest("hex")}` !==
      MIGRATIONS[index]?.artifact_sha256 || PROHIBITED.test(entry.sql) ||
    UNSUPPORTED_PRIVILEGE_BEARING.test(entry.sql))) {
    return Object.freeze({ ...base, status: "MISMATCH", statements: Object.freeze([]) });
  }
  const inventory: Array<Omit<FarmOsDay150MigrationPrivilegeStatement, "authorized_by_v4">> = [];
  for (const migration of input) {
    const fragments = authorityFragments(migration.sql);
    let ordinal = 0;
    for (const fragment of fragments) {
      const classified = statementClass(fragment);
      if (!classified) return Object.freeze({ ...base, status: "MISMATCH",
        statements: Object.freeze([]) });
      ordinal += 1;
      inventory.push(Object.freeze({ migration_id: migration.migration_id,
        statement_ordinal: ordinal, ...classified,
        semantic_executor: "REFERENCE_MIGRATION_EXECUTOR" as const }));
    }
  }
  const exactCounts = MIGRATIONS.every((migration, index) => inventory.filter((entry) =>
    entry.migration_id === migration.migration_id).length ===
      APPROVED_PRIVILEGE_STATEMENT_COUNTS[index]);
  const manifestDigest = hash(
    "farmos.day150-prefix-reference-approved-privilege-statement-manifest.v1", inventory);
  if (!exactCounts || manifestDigest !== APPROVED_PRIVILEGE_STATEMENT_MANIFEST_DIGEST) {
    return Object.freeze({ ...base, status: "MISMATCH", statements: Object.freeze([]) });
  }
  const statements = inventory.map((entry) => Object.freeze({
    ...entry, authorized_by_v4: true as const,
  }));
  return Object.freeze({ ...base, status: "EXACT", statements: Object.freeze(statements) });
}

const bootstrap = compileFarmOsDay150ReferenceInitialCatalogBootstrap();
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3 = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v3",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3",
  authorization_revision: 3,
  authorization_state: "SUPERSEDED_UNCONSUMED",
  supersedes: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V2:SUPERSEDED_UNCONSUMED",
  product_owner_approval_reference:
    "product-owner/2026-08-13/203f88cd-546c-4e34-a0c3-3ba40a9efb8c",
  derivation_authority_id: DERIVATION_AUTHORITY,
  derivation_authority_revision: 1,
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
  initial_catalog_authority_revision: 1,
  bootstrap_plan_digest: bootstrap.plan_digest,
  migration_privilege_envelope_id:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_ID,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  postgres_major: 17,
  pull_policy: "NEVER", restart_policy: "NO",
  resources: Object.freeze({ container: "farmos-day150-prefix-reference-pg17-v1",
    network: "farmos-day150-prefix-reference-network-v1",
    volume: "farmos-day150-prefix-reference-volume-v1" }),
  exposure: "127.0.0.1:EPHEMERAL",
  database: "farmos_day150_prefix_reference_v1",
  credentials: "EPHEMERAL_REFERENCE_ONLY_NEVER_PERSIST",
  owner_profile: FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.owner,
  executor_profile: FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.executor,
  membership: FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.membership,
  database_privileges:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.database_privileges,
  bootstrap_supervisor_operations:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.bootstrap_supervisor_operations,
  migration_history: FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE.target_migrations,
  snapshot_points: Object.freeze(MIGRATIONS.map((spec) => spec.migration_id)),
  candidate_output_paths: Object.freeze(MIGRATIONS.map((spec) =>
    spec.output_path)),
  receipt_output_path:
    "artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json",
  cleanup: "REMOVE_EXACT_OWNED_CONTAINER_VOLUME_NETWORK_VERIFY_ZERO_RESIDUAL",
  destination_assertion: "NO_PRODUCTION_NO_CANONICAL_DESTINATION",
  production_operations: 0, canonical_operations: 0,
} as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3_DIGEST = hash(
  "farmos.day150-prefix-reference-execution-authorization.v3",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3,
);

export const FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json.authorization-attempt-claim" as const;
const V4_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_ID,
  authorization_revision: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_REVISION,
  supersedes: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3:SUPERSEDED_UNCONSUMED",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH,
  image: REFERENCE_IMAGE, platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  bootstrap_plan_digest: bootstrap.plan_digest,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V4_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V4.run, V4_STABLE_RUN_BASIS);

export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4 = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v4",
  authorization_id: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_ID,
  authorization_revision: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_REVISION,
  authorization_state: "AUTHORIZED_BUT_NOT_CONSUMED",
  supersedes: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V3:SUPERSEDED_UNCONSUMED",
  product_owner_approval_reference:
    "product-owner/2026-08-15/day150-v4-durable-attempt-claim-amendment",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V4_RUN_ID,
  attempt_claim: Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
    claim_revision: 1,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
  }),
} as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V4.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4,
);

export const FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v5/reference-catalog-run-receipt-candidate.json.authorization-attempt-claim" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v5/reference-catalog-run-receipt-candidate.json.authorization-consumed" as const;
const V5_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5",
  authorization_revision: 5,
  previous_authorization: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4:CONSUMED_TERMINAL",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE, platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  bootstrap_plan_digest: bootstrap.plan_digest,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.run,
  V5_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v5",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5",
  authorization_revision: 5,
  authorization_state: "PROPOSED_NOT_AUTHORIZED",
  supersedes: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4:CONSUMED_TERMINAL",
  product_owner_approval_reference: null,
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
    claim_revision: 1,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
  }),
  consumption_marker: Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-consumption-marker.v1",
    marker_revision: 3,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
  }),
  readiness_liveness_policy:
    FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST =
  "sha256:c470bf3042e9f6f94cab73c0ba33a0c38274b4431ceb1e270b0244cf3cb2108d" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID =
  "sha256:488f06a42fd070ab158ec7e228527e220104a0d213b6829550e9c66c32566fb6" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_ACTIVATION = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL,
  authorization_state: "AUTHORIZED_BUT_NOT_CONSUMED",
  product_owner_approval_reference:
    "product-owner/2026-08-16/day150-v5-exact-one-invocation-approval",
  approved_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST,
  approved_external_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST,
  approved_run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  approved_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID,
  invocation_limit: 1,
  automatic_retry_allowed: false,
} as const);
const V6_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6",
  authorization_revision: 6,
  previous_authorization:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5:CONSUMED_OUTCOME_UNKNOWN_COMPENSATED",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  bootstrap_plan_digest: bootstrap.plan_digest,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6.run,
  V6_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v6",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6",
  authorization_revision: 6,
  authorization_state: "PROPOSED_NOT_AUTHORIZED",
  supersedes:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5:CONSUMED_OUTCOME_UNKNOWN_COMPENSATED",
  product_owner_approval_reference: null,
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
    claim_revision: 1,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
  }),
  consumption_marker: Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-consumption-marker.v1",
    marker_revision: 3,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
  }),
  receipt_output_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt: Object.freeze({
    schema_version: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA,
    authority_id: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
    authority_revision: 1,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
    success_receipt_mutual_exclusion: "AT_MOST_ONE_AUTHORITATIVE_TERMINAL_RECEIPT_CLASS",
  }),
  invocation_limit: 1,
  automatic_retry_allowed: false,
  proposal_only: true,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v6-proposal.v1",
  execution_authorized: false,
  authorization_consumption_allowed: false,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6",
  execution_authorization_revision: 6,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST,
  previous_authorization:
    "V5_CONSUMED_EXACTLY_ONCE_OUTCOME_UNKNOWN_EXTERNAL_RESOURCES_COMPENSATED_RETRY_FORBIDDEN",
  authorization_state: "PROPOSED_NOT_AUTHORIZED",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  pull_policy: "NEVER",
  restart_policy: "NO",
  exposure: "127.0.0.1:EPHEMERAL",
  resources: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.resources,
  database: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.database,
  owner_profile: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.owner_profile,
  executor_profile:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.executor_profile,
  membership: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.membership,
  database_privileges:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.database_privileges,
  bootstrap_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.bootstrap_plan_digest,
  bootstrap_supervisor_operations:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.bootstrap_supervisor_operations,
  migration_history:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.migration_history,
  candidate_output_paths:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL.candidate_output_paths,
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  terminal_receipt_mutual_exclusion: "SUCCESS_XOR_TERMINAL_OUTCOME",
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  cleanup: "REMOVE_EXACT_OWNED_CONTAINER_VOLUME_NETWORK_VERIFY_ZERO_RESIDUAL",
  pinned_migration_bundle_digest:
    "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
  production_operations: 0,
  canonical_operations: 0,
  b2_operations: 0,
  gate2_operations: 0,
  proposal_only: true,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6.attempt, Object.freeze({
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
  }));
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1 = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-executable-source-closure.v1",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1",
  runtime_roots: FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_ROOTS_V1,
  runtime_data_dependencies: FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V1,
  package_authority: FARM_OS_DAY150_PREFIX_REFERENCE_PACKAGE_AUTHORITY_V1,
  tsx_config_authority: FARM_OS_DAY150_PREFIX_REFERENCE_TSX_CONFIG_AUTHORITY_V1,
  tsx_config_closure: deriveFarmOsDay150PrefixReferenceTsxConfigClosure(),
  files: deriveFarmOsDay150PrefixReferenceExecutableSourceClosure(),
  approval_data_path:
    "artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-execution-approval-registry.json",
  approval_data_excluded_from_digest: true,
  closure_semantics:
    "EXECUTABLE_AND_CONTRACT_BYTES_ONLY_APPROVAL_DATA_EXCLUDED",
} as const);
export type FarmOsDay150PrefixReferenceSourceReader =
  (path: string) => Uint8Array | string;
export function deriveFarmOsDay150PrefixReferenceExecutableSourceDigest(
  readSource?: FarmOsDay150PrefixReferenceSourceReader,
): `sha256:${string}` {
  return deriveFarmOsDay150PrefixReferenceClosureDigest({
    files: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.files,
    read_source: readSource ?? ((path) => readFileSync(path)),
  });
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2 = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1,
  schema_version: "farmos.day150-prefix-reference-executable-source-closure.v2",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2",
  runtime_data_dependencies:
    FARM_OS_DAY150_PREFIX_REFERENCE_RUNTIME_DATA_DEPENDENCIES_V2,
  files: deriveFarmOsDay150PrefixReferenceExecutableSourceClosureV2(),
  closure_semantics:
    "V12_EXECUTABLE_CONTRACT_AND_PROVEN_PREPREFIX_BYTES_APPROVAL_DATA_EXCLUDED",
} as const);
export function deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2(
  readSource?: FarmOsDay150PrefixReferenceSourceReader,
): `sha256:${string}` {
  return deriveFarmOsDay150PrefixReferenceClosureDigest({
    files: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files,
    read_source: readSource ?? ((path) => readFileSync(path)),
  });
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_RUN_ID =
  "sha256:efcbd422c7a8099142bc77a1d9bc1b55eae960d8e81831a7a7134e9cd5783b91" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_PROPOSAL_DIGEST =
  "sha256:97649ce7fa5ceaf31099aee83a818f60c370737afdc9828c3f84603d6ba61cf2" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V7_PROPOSAL_DIGEST =
  "sha256:dfa2d46ab611c6bf54362880566a80fc71327614dd41683087880a840486a453" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_ATTEMPT_ID =
  "sha256:779b5670a0e4e0372adb7b185f9d6db18262c3af9d2454addf9b1c008476d8e6" as const;

export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_BODY_RECOVERY_RESULT = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-historical-body-recovery-result.v1",
  scope: "BOUNDED_REPOSITORY_OWNED_READ_ONLY",
  searched: Object.freeze([
    "EXACT_APPROVAL_REGISTRY", "DAY150_REFERENCE_RUN_ARTIFACTS",
    "ARCHITECTURE_AND_QUALIFICATION_EVIDENCE", "SEALED_RUNTIME_BUNDLE_AND_MANIFEST",
    "REPOSITORY_OWNED_GIT_CHECKPOINT_TREES_CONTAINING_V7_SOURCE",
  ]),
  sealed_bundle_sha256:
    "sha256:a6bcd13f4b6adb6b3acb7eb115828d4d8d4dd35417b1f580039c8701670aa3ab",
  inspected_v7_git_tree: "f4aa85949f1a65a2eb6871bd62fc0188fc7f57ae",
  inspected_tree_recomputed_source_digest:
    "sha256:3b5427c75a25e8354c9f998cb9aaa39d1fc9c2d4ea1cd3da9e11ce67c044d82f",
  inspected_tree_recomputed_authorization_digest:
    "sha256:535d82d114d915c1e014c1a05dd71818f0d58f5804e2111769568891eb02a9d8",
  inspected_tree_recomputed_plan_digest:
    "sha256:b2f797960fbbc4e6536602e0383e607d71455298faa267d8e36081dfbc652cfa",
  exact_historical_body_found: false,
  classification: "V7_HISTORICAL_BODY_NOT_DURABLY_PRESERVED",
  executable_authority: false,
} as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1 = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-retired-execution-history.v1",
  authority_id: "DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7",
  revision: 7,
  state: "RETIRED",
  selectable: false,
  runnable: false,
  invocation_count: 1,
  retry: "FORBIDDEN",
  historical_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_PROPOSAL_DIGEST,
  historical_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V7_PROPOSAL_DIGEST,
  historical_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_RUN_ID,
  historical_attempt_id: FARM_OS_DAY150_PREFIX_REFERENCE_V7_PROPOSED_ATTEMPT_ID,
  historical_source_digest:
    "sha256:efc9ae9f354973eb48ea0abee41a16343c02cf84f532d94aeaec725ca22448f5",
  historical_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  historical_proposal_identity:
    "sha256:c4f8e85256aba37eeaf780c9669d93c21ff8f6cfcfb20f3259bc9c3b595c647b",
  historical_approval_record_digest:
    "sha256:503ec591b5e55aca220575a300a51cf22a20d3a4d713340f79cb063ef279d1b8",
  historical_body_status: "BODY_NOT_DURABLY_PRESERVED",
  authorization_body: null,
  plan_body: null,
  closure_manifest: null,
  recovery_result:
    FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_BODY_RECOVERY_RESULT.classification,
} as const);
export function loadFarmOsDay150PrefixReferenceHistoricalV7ExecutableBody(): null {
  return null;
}

const V8_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v8/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_ATTEMPT_CLAIM_PATH =
  `${V8_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_CONSUMPTION_MARKER_PATH =
  `${V8_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_SUCCESS_RECEIPT_PATH =
  V8_SUCCESS_RECEIPT_PATH;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v8/reference-catalog-terminal-outcome-receipt.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-executable-source-binding.v1",
  authority_id: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.authority_id,
  file_count: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.files.length,
  source_candidate_digest: deriveFarmOsDay150PrefixReferenceExecutableSourceDigest(),
  files: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.files,
  approval_data_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1.approval_data_path,
  approval_data_excluded_from_digest: true,
  binding_mechanism:
    "PLAN_DIGEST_PLUS_EXECUTABLE_SOURCE_CLOSURE_AND_PINNED_EXTERNAL_BYTES_PREFLIGHT",
  capture_state: "DERIVED_FROM_CURRENT_POST_V8_SOT_REPAIR_EXECUTABLE_SOURCE_BYTES",
} as const);
const V8_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
  authorization_revision: 8,
  previous_authorization:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7:ISSUED_REJECTED_RETIRED_RETRY_FORBIDDEN",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  bootstrap_plan_digest: bootstrap.plan_digest,
  gate17_scope_authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V8.run,
  V8_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v8",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
  authorization_revision: 8,
  authorization_state: "PROPOSED_NOT_AUTHORIZED",
  supersedes:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7:ISSUED_REJECTED_RETIRED_RETRY_FORBIDDEN",
  product_owner_approval_reference: null,
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
    claim_revision: 1,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_ATTEMPT_CLAIM_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
  }),
  consumption_marker: Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-consumption-marker.v1",
    marker_revision: 3,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_CONSUMPTION_MARKER_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
  }),
  receipt_output_path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt: Object.freeze({
    schema_version: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_SCHEMA,
    authority_id: FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
    authority_revision: 1,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_TERMINAL_OUTCOME_RECEIPT_PATH,
    publication: "CANONICAL_EXCLUSIVE_DURABLE_NO_REPLACE_TRUSTED_READBACK",
    success_receipt_mutual_exclusion: "AT_MOST_ONE_AUTHORITATIVE_TERMINAL_RECEIPT_CLASS",
  }),
  invocation_limit: 1,
  automatic_retry_allowed: false,
  proposal_only: true,
  gate17_scope_authority: Object.freeze({
    authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
    authority_revision: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_revision,
    authority_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  }),
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V8.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V8_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v8-proposal.v1",
  execution_authorized: false,
  authorization_consumption_allowed: false,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
  execution_authorization_revision: 8,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL_DIGEST,
  previous_authorization:
    "V7_ISSUED_REJECTED_RETIRED_RETRY_FORBIDDEN_NO_EXTERNAL_MUTATION",
  authorization_state: "PROPOSED_NOT_AUTHORIZED",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_RUN_ID,
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V8_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_TERMINAL_OUTCOME_RECEIPT_PATH,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING,
  invocation_limit: 1,
  automatic_retries: 0,
  proposal_only: true,
  gate17_scope_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL.gate17_scope_authority,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V8_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V8.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V8_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V8.attempt, Object.freeze({
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V8_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_RUN_ID,
  }));
const V9_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v9/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_ATTEMPT_CLAIM_PATH =
  `${V9_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_CONSUMPTION_MARKER_PATH =
  `${V9_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_SUCCESS_RECEIPT_PATH =
  V9_SUCCESS_RECEIPT_PATH;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v9/reference-catalog-terminal-outcome-receipt.json" as const;
// V9 was issued exactly once and ended terminal. Later Day150 source repairs must not
// rebind its historical authorization/run/attempt/descriptor identity to repaired bytes.
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING,
  source_candidate_digest:
    "sha256:ded08100a145a22bf2aaa1c45c28ee9b0c474ff86c0d9a3d707d5a806a11f074",
  capture_state: "DERIVED_FROM_CURRENT_V9_CAPABLE_EXECUTABLE_SOURCE_BYTES",
} as const);
const V9_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9",
  authorization_revision: 9,
  previous_authorization:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8:INVOCATION_ALLOWANCE_EXHAUSTED_RETRY_FORBIDDEN",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  bootstrap_plan_digest: bootstrap.plan_digest,
  gate17_scope_authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V9.run,
  V9_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v9",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9",
  authorization_revision: 9,
  supersedes:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8:INVOCATION_ALLOWANCE_EXHAUSTED_RETRY_FORBIDDEN",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL.attempt_claim,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_ATTEMPT_CLAIM_PATH,
  }),
  consumption_marker: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL.consumption_marker,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_CONSUMPTION_MARKER_PATH,
  }),
  receipt_output_path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL
      .terminal_outcome_receipt,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_OUTCOME_RECEIPT_PATH,
  }),
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V9.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V8_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v9-proposal.v1",
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9",
  execution_authorization_revision: 9,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL_DIGEST,
  previous_authorization:
    "V8_INVOCATION_ALLOWANCE_EXHAUSTED_RETRY_FORBIDDEN_NO_EXTERNAL_MUTATION",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_RUN_ID,
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V9_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_OUTCOME_RECEIPT_PATH,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING,
  gate17_scope_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL.gate17_scope_authority,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V9.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V9.attempt, Object.freeze({
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_RUN_ID,
  }));
const V10_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v10/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_ATTEMPT_CLAIM_PATH =
  `${V10_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_CONSUMPTION_MARKER_PATH =
  `${V10_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_SUCCESS_RECEIPT_PATH =
  V10_SUCCESS_RECEIPT_PATH;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v10/reference-catalog-terminal-outcome-receipt.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_SOURCE_CANDIDATE_BINDING = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING,
  source_candidate_digest:
    "sha256:786c8810f8c994eb5334d76310bf9bf500f5ee53384bf3c75d2af6eb50438278",
  capture_state: "STALE_PRE_INVOCATION_V10_SOURCE_BYTES",
} as const);
const V10_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10",
  authorization_revision: 10,
  previous_authorization:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9:TERMINAL_CONSUMED_RETRY_FORBIDDEN",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V10_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  bootstrap_plan_digest: bootstrap.plan_digest,
  gate17_scope_authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V10_SOURCE_CANDIDATE_BINDING,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V10.run,
  V10_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v10",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10",
  authorization_revision: 10,
  supersedes:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9:TERMINAL_CONSUMED_RETRY_FORBIDDEN",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL.attempt_claim,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_ATTEMPT_CLAIM_PATH,
  }),
  consumption_marker: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL.consumption_marker,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_CONSUMPTION_MARKER_PATH,
  }),
  receipt_output_path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL
      .terminal_outcome_receipt,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_TERMINAL_OUTCOME_RECEIPT_PATH,
  }),
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V10_SOURCE_CANDIDATE_BINDING,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V10.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v10-proposal.v1",
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10",
  execution_authorization_revision: 10,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL_DIGEST,
  previous_authorization:
    "V9_TERMINAL_CONSUMED_RETRY_FORBIDDEN_NO_EXTERNAL_MUTATION",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_RUN_ID,
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V10_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V10_TERMINAL_OUTCOME_RECEIPT_PATH,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V10_SOURCE_CANDIDATE_BINDING,
  gate17_scope_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL.gate17_scope_authority,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V10.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V10.attempt, Object.freeze({
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_RUN_ID,
  }));
const V11_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v11/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_ATTEMPT_CLAIM_PATH =
  `${V11_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMPTION_MARKER_PATH =
  `${V11_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_SUCCESS_RECEIPT_PATH =
  V11_SUCCESS_RECEIPT_PATH;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v11/reference-catalog-terminal-outcome-receipt.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_SOURCE_CANDIDATE_BINDING = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING,
  source_candidate_digest: deriveFarmOsDay150PrefixReferenceExecutableSourceDigest(),
  capture_state: "DERIVED_FROM_CURRENT_V11_CAPABLE_EXECUTABLE_SOURCE_BYTES",
} as const);
const V11_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11",
  authorization_revision: 11,
  previous_authorization:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10:STALE_PRE_INVOCATION_NON_RUNNABLE",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V11_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  bootstrap_plan_digest: bootstrap.plan_digest,
  gate17_scope_authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V11_SOURCE_CANDIDATE_BINDING,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V11.run,
  V11_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v11",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11",
  authorization_revision: 11,
  supersedes:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10:STALE_PRE_INVOCATION_NON_RUNNABLE",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V11_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL.attempt_claim,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_ATTEMPT_CLAIM_PATH,
  }),
  consumption_marker: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL.consumption_marker,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMPTION_MARKER_PATH,
  }),
  receipt_output_path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL
      .terminal_outcome_receipt,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_TERMINAL_OUTCOME_RECEIPT_PATH,
  }),
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V11_SOURCE_CANDIDATE_BINDING,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V11.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V11_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v11-proposal.v1",
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11",
  execution_authorization_revision: 11,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL_DIGEST,
  previous_authorization:
    "V10_STALE_PRE_INVOCATION_NON_RUNNABLE_NO_EXTERNAL_MUTATION",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V11_PROPOSED_RUN_ID,
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V11_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V11_TERMINAL_OUTCOME_RECEIPT_PATH,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V11_SOURCE_CANDIDATE_BINDING,
  gate17_scope_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL.gate17_scope_authority,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V11_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V11.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V11_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V11.attempt, Object.freeze({
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V11_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V11_PROPOSED_RUN_ID,
  }));
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_AUTHORIZATION_DIGEST =
  "sha256:6edfeed19c5a313d972758922fbdba482bd3960396c1b35f8be7dfe9f8c2c574" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_PLAN_DIGEST =
  "sha256:ee7dca486d86b74c3d6d388d57905eed9676e40bdd41f74683a353ecb2e48049" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_RUN_ID =
  "sha256:7448b6fa03cb21bb77003efe6a2f1c53037f8ac26f8c9e60d5ba764ad1194324" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_ATTEMPT_ID =
  "sha256:64b57e7d43b311fa4c06f6f07bcbd86a57e0459263e6670efa3fa961dfac53ce" as const;
const bootstrapV2 = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap();
const V12_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v12/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_ATTEMPT_CLAIM_PATH =
  `${V12_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_CONSUMPTION_MARKER_PATH =
  `${V12_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_SUCCESS_RECEIPT_PATH =
  V12_SUCCESS_RECEIPT_PATH;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v12/reference-catalog-terminal-outcome-receipt.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_SOURCE_CANDIDATE_BINDING = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_V11_SOURCE_CANDIDATE_BINDING,
  authority_id: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.authority_id,
  file_count: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files.length,
  source_candidate_digest:
    "sha256:354fc80ad1eeed033f4bd9b58520c4cc2a50efef78459bffcbed4001c51b75d1",
  files: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files,
  capture_state: "DERIVED_FROM_FINAL_REPAIRED_V12_CAPABLE_EXECUTABLE_SOURCE_BYTES",
} as const);
const V12_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12",
  authorization_revision: 12,
  previous_authorization:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11:TERMINAL_CONSUMED_OUTCOME_UNKNOWN_RETRY_FORBIDDEN",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V12_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  bootstrap_plan_digest: bootstrapV2.plan_digest,
  gate17_scope_authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V12_SOURCE_CANDIDATE_BINDING,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V12.run,
  V12_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v12",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12",
  authorization_revision: 12,
  supersedes:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11:TERMINAL_CONSUMED_OUTCOME_UNKNOWN_RETRY_FORBIDDEN",
  product_owner_approval_reference: null,
  authorization_state: "PROPOSED_NOT_AUTHORIZED",
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  initial_catalog_authority_revision: 2,
  bootstrap_plan_digest: bootstrapV2.plan_digest,
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL.attempt_claim,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_ATTEMPT_CLAIM_PATH,
  }),
  consumption_marker: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL.consumption_marker,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_CONSUMPTION_MARKER_PATH,
  }),
  receipt_output_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL.terminal_outcome_receipt,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_TERMINAL_OUTCOME_RECEIPT_PATH,
  }),
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V12_SOURCE_CANDIDATE_BINDING,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V12.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V11_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v12-proposal.v1",
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12",
  execution_authorization_revision: 12,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL_DIGEST,
  previous_authorization:
    "V11_TERMINAL_CONSUMED_OUTCOME_UNKNOWN_RETRY_FORBIDDEN_ZERO_RESIDUAL",
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  initial_catalog_authority_revision: 2,
  bootstrap_plan_digest: bootstrapV2.plan_digest,
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_RUN_ID,
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V12_TERMINAL_OUTCOME_RECEIPT_PATH,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V12_SOURCE_CANDIDATE_BINDING,
  gate17_scope_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL.gate17_scope_authority,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V12.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V12.attempt, Object.freeze({
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_RUN_ID,
  }));
const V13_SUCCESS_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v13/reference-catalog-run-receipt-candidate.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_ATTEMPT_CLAIM_PATH =
  `${V13_SUCCESS_RECEIPT_PATH}.authorization-attempt-claim` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_CONSUMPTION_MARKER_PATH =
  `${V13_SUCCESS_RECEIPT_PATH}.authorization-consumed` as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESS_RECEIPT_PATH =
  V13_SUCCESS_RECEIPT_PATH;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_TERMINAL_OUTCOME_RECEIPT_PATH =
  "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v13/reference-catalog-terminal-outcome-receipt.json" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_V12_SOURCE_CANDIDATE_BINDING,
  source_candidate_digest:
    "sha256:b8a95697a2439a31d180706878ceb1c66171ba563e82037bf18518f382bccfa6",
} as const);
const V13_PROPOSED_STABLE_RUN_BASIS = Object.freeze({
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13",
  authorization_revision: 13,
  previous_authorization:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12:INVOCATION_ISSUED_HUMAN_ALLOWANCE_EXHAUSTED_DURABLE_CONSUMPTION_NOT_REACHED_RETRY_FORBIDDEN",
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_TERMINAL_OUTCOME_RECEIPT_PATH,
  terminal_outcome_receipt_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_OUTCOME_RECEIPT_AUTHORITY_ID,
  readiness_liveness_policy: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  image: REFERENCE_IMAGE,
  platform: REFERENCE_PLATFORM,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  bootstrap_plan_digest: bootstrapV2.plan_digest,
  gate17_scope_authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V13.run,
  V13_PROPOSED_STABLE_RUN_BASIS);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-execution-authorization.v13",
  authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13",
  authorization_revision: 13,
  supersedes:
    "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12:INVOCATION_ISSUED_HUMAN_ALLOWANCE_EXHAUSTED_DURABLE_CONSUMPTION_NOT_REACHED_RETRY_FORBIDDEN",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID,
  attempt_claim: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL.attempt_claim,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_ATTEMPT_CLAIM_PATH,
  }),
  consumption_marker: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL.consumption_marker,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_CONSUMPTION_MARKER_PATH,
  }),
  receipt_output_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt: Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL.terminal_outcome_receipt,
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_TERMINAL_OUTCOME_RECEIPT_PATH,
  }),
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V13.authorization,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL,
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v13-proposal.v1",
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13",
  execution_authorization_revision: 13,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST,
  previous_authorization:
    "V12_INVOCATION_ISSUED_HUMAN_ALLOWANCE_EXHAUSTED_DURABLE_CONSUMPTION_NOT_REACHED_RETRY_FORBIDDEN_ZERO_RESIDUAL",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID,
  attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_ATTEMPT_CLAIM_PATH,
  consumption_marker_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_CONSUMPTION_MARKER_PATH,
  success_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESS_RECEIPT_PATH,
  terminal_outcome_receipt_path: FARM_OS_DAY150_PREFIX_REFERENCE_V13_TERMINAL_OUTCOME_RECEIPT_PATH,
  source_candidate_binding: FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING,
  gate17_scope_authority:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL.gate17_scope_authority,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V13.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V13.attempt, Object.freeze({
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID,
  }));
export type FarmOsDay150PrefixReferenceExecutionDescriptor = Readonly<{
  descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1";
  authorization_id: string;
  authorization_revision: 4 | 5 | 6 | 8 | 9 | 10 | 11 | 12 | 13;
  executable_source_closure_authority_id?:
    "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V1" |
    "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2";
  authorization_digest: `sha256:${string}`;
  execution_plan_digest: `sha256:${string}`;
  run_identity: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
  pinned_migration_bundle_digest: `sha256:${string}`;
  digest_domains: Readonly<{
    authorization: string; plan: string; run: string; attempt: string;
    claim: string; consumption_marker: string; terminal_receipt: string;
    success_receipt: string; candidate_provenance: string; run_nonce: string;
  }>;
  durable_paths: Readonly<{
    attempt_claim: string; consumption_marker: string;
    success_receipt: string; terminal_outcome_receipt: string | null;
    candidate_outputs: readonly string[];
  }>;
  schema_revisions: Readonly<{
    attempt_claim: 1; consumption_marker: 3;
    success_receipt: 1; terminal_outcome_receipt: 1 | null;
  }>;
  postgres_application_name: string;
}>;
const descriptor = (value: FarmOsDay150PrefixReferenceExecutionDescriptor) =>
  Object.freeze({ ...value, digest_domains: Object.freeze({ ...value.digest_domains }),
    durable_paths: Object.freeze({ ...value.durable_paths }),
    schema_revisions: Object.freeze({ ...value.schema_revisions }) });
const durableDomains = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.durable;
const candidateOutputPaths = Object.freeze(MIGRATIONS.map((entry) => entry.output_path));
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS = Object.freeze({
  V4: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4",
    authorization_revision: 4,
    authorization_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4_DIGEST,
    execution_plan_digest:
      "sha256:3873b1a6defc898a742ee14cf95a5d34bcf215dc3559ee090285686a87a896c0",
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V4_RUN_ID,
    attempt_identity:
      "sha256:93ce91fa84fc02a17274fcac777828dc2ba7f2f5b5c3aae5fd9804bed7b3fe2e",
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V4, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH,
      consumption_marker:
        "artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json.authorization-consumed",
      success_receipt:
        "artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json",
      terminal_outcome_receipt: null,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: null }),
    postgres_application_name: "farmos-day150-prefix-reference-v4",
  }),
  V5: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5",
    authorization_revision: 5,
    authorization_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST,
    execution_plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH,
      success_receipt:
        "artifacts/day150/prefix-expected-catalog/reference-runs/v1/v5/reference-catalog-run-receipt-candidate.json",
      terminal_outcome_receipt: null,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: null }),
    postgres_application_name: "farmos-day150-prefix-reference-v5",
  }),
  V6: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6",
    authorization_revision: 6,
    authorization_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST,
    execution_plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V6_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V6_CONSUMPTION_MARKER_PATH,
      success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V6_SUCCESS_RECEIPT_PATH,
      terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V6_TERMINAL_OUTCOME_RECEIPT_PATH,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: 1 }),
    postgres_application_name: "farmos-day150-prefix-reference-v6",
  }),
  V8: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
    authorization_revision: 8,
    authorization_digest:
      "sha256:f66daebcdd7decd653d5ae9fc324ad746317dacca028a101fde93f5c177734ae",
    execution_plan_digest:
      "sha256:97a95827aaa92483023d3d7a3e7972735c6fef147dea7ed7cea87c3a32d40feb",
    run_identity:
      "sha256:d065ba3999aa13d839bb82c5341eb283b095854eb91e9fcd86bedbfa325f3547",
    attempt_identity:
      "sha256:32db8bf71e3194a1414a0d04c13ee0466969dd4c6196cac79440c98bb8897d32",
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V8, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V8_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V8_CONSUMPTION_MARKER_PATH,
      success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V8_SUCCESS_RECEIPT_PATH,
      terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V8_TERMINAL_OUTCOME_RECEIPT_PATH,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: 1 }),
    postgres_application_name: "farmos-day150-prefix-reference-v8",
  }),
  V9: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9",
    authorization_revision: 9,
    authorization_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL_DIGEST,
    execution_plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_ATTEMPT_ID,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V9, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V9_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V9_CONSUMPTION_MARKER_PATH,
      success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V9_SUCCESS_RECEIPT_PATH,
      terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_OUTCOME_RECEIPT_PATH,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: 1 }),
    postgres_application_name: "farmos-day150-prefix-reference-v9",
  }),
  V10: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10",
    authorization_revision: 10,
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_ATTEMPT_ID,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V10, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V10_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V10_CONSUMPTION_MARKER_PATH,
      success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V10_SUCCESS_RECEIPT_PATH,
      terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V10_TERMINAL_OUTCOME_RECEIPT_PATH,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: 1 }),
    postgres_application_name: "farmos-day150-prefix-reference-v10",
  }),
  V11: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11",
    authorization_revision: 11,
    authorization_digest: FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_AUTHORIZATION_DIGEST,
    execution_plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_PLAN_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTED_ATTEMPT_ID,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V11, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V11_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMPTION_MARKER_PATH,
      success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V11_SUCCESS_RECEIPT_PATH,
      terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V11_TERMINAL_OUTCOME_RECEIPT_PATH,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: 1 }),
    postgres_application_name: "farmos-day150-prefix-reference-v11",
  }),
  V12: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12",
    authorization_revision: 12,
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_ATTEMPT_ID,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V12, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V12_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V12_CONSUMPTION_MARKER_PATH,
      success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V12_SUCCESS_RECEIPT_PATH,
      terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V12_TERMINAL_OUTCOME_RECEIPT_PATH,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: 1 }),
    postgres_application_name: "farmos-day150-prefix-reference-v12",
  }),
  V13: descriptor({
    descriptor_schema: "farmos.day150-prefix-reference-execution-descriptor.v1",
    authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13",
    authorization_revision: 13,
    executable_source_closure_authority_id:
      "DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2",
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID,
    attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID,
    pinned_migration_bundle_digest:
      "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36",
    digest_domains: Object.freeze({
      ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V13, ...durableDomains,
    }),
    durable_paths: Object.freeze({
      attempt_claim: FARM_OS_DAY150_PREFIX_REFERENCE_V13_ATTEMPT_CLAIM_PATH,
      consumption_marker: FARM_OS_DAY150_PREFIX_REFERENCE_V13_CONSUMPTION_MARKER_PATH,
      success_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESS_RECEIPT_PATH,
      terminal_outcome_receipt: FARM_OS_DAY150_PREFIX_REFERENCE_V13_TERMINAL_OUTCOME_RECEIPT_PATH,
      candidate_outputs: candidateOutputPaths,
    }),
    schema_revisions: Object.freeze({ attempt_claim: 1, consumption_marker: 3,
      success_receipt: 1, terminal_outcome_receipt: 1 }),
    postgres_application_name: "farmos-day150-prefix-reference-v13",
  }),
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR =
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V13;
export function deriveFarmOsDay150PrefixReferenceAttemptIdentityFromDescriptor(
  value: FarmOsDay150PrefixReferenceExecutionDescriptor,
): `sha256:${string}` {
  return hash(value.digest_domains.attempt, Object.freeze({
    authorization_digest: value.authorization_digest,
    execution_plan_digest: value.execution_plan_digest,
    pinned_migration_bundle_digest: value.pinned_migration_bundle_digest,
    run_identity: value.run_identity,
  }));
}
export function validateFarmOsDay150PrefixReferenceExecutionDescriptor(
  input: unknown,
): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as FarmOsDay150PrefixReferenceExecutionDescriptor;
  const revision: number = value.authorization_revision;
  const revisionAuthority = (() => {
    switch (revision) {
      case 4: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V4,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V4,
      });
      case 5: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V5,
      });
      case 6: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V6,
      });
      case 8: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V8,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
      });
      case 9: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V9,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V9,
      });
      case 10: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V10,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V10,
      });
      case 11: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V11,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V11,
      });
      case 12: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V12,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V12,
      });
      case 13: return Object.freeze({
        domains: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V13,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V13,
      });
      default: return null;
    }
  })();
  if (revisionAuthority === null) return false;
  const revisionDomains = revisionAuthority.domains;
  const registered = revisionAuthority.descriptor;
  return value.descriptor_schema === "farmos.day150-prefix-reference-execution-descriptor.v1" &&
    value.authorization_id === registered.authorization_id &&
    value.executable_source_closure_authority_id ===
      registered.executable_source_closure_authority_id &&
    value.authorization_digest === registered.authorization_digest &&
    value.execution_plan_digest === registered.execution_plan_digest &&
    value.run_identity === registered.run_identity &&
    value.attempt_identity === registered.attempt_identity &&
    value.pinned_migration_bundle_digest === registered.pinned_migration_bundle_digest &&
    value.digest_domains.authorization === revisionDomains.authorization &&
    value.digest_domains.plan === revisionDomains.plan &&
    value.digest_domains.run === revisionDomains.run &&
    value.digest_domains.attempt === revisionDomains.attempt &&
    value.digest_domains.claim === durableDomains.claim &&
    value.digest_domains.consumption_marker === durableDomains.consumption_marker &&
    value.digest_domains.terminal_receipt === durableDomains.terminal_receipt &&
    value.digest_domains.success_receipt === durableDomains.success_receipt &&
    value.digest_domains.candidate_provenance === durableDomains.candidate_provenance &&
    value.digest_domains.run_nonce === durableDomains.run_nonce &&
    value.durable_paths.attempt_claim === registered.durable_paths.attempt_claim &&
    value.durable_paths.consumption_marker === registered.durable_paths.consumption_marker &&
    value.durable_paths.success_receipt === registered.durable_paths.success_receipt &&
    value.durable_paths.terminal_outcome_receipt ===
      registered.durable_paths.terminal_outcome_receipt &&
    value.durable_paths.candidate_outputs.length === candidateOutputPaths.length &&
    value.durable_paths.candidate_outputs.every((path, index) =>
      path === candidateOutputPaths[index]) &&
    value.durable_paths.attempt_claim.endsWith(".authorization-attempt-claim") &&
    value.durable_paths.consumption_marker.endsWith(".authorization-consumed") &&
    value.durable_paths.success_receipt !== value.durable_paths.terminal_outcome_receipt &&
    value.schema_revisions.attempt_claim === registered.schema_revisions.attempt_claim &&
    value.schema_revisions.consumption_marker ===
      registered.schema_revisions.consumption_marker &&
    value.schema_revisions.success_receipt === registered.schema_revisions.success_receipt &&
    value.schema_revisions.terminal_outcome_receipt ===
      registered.schema_revisions.terminal_outcome_receipt &&
    value.postgres_application_name === registered.postgres_application_name &&
    deriveFarmOsDay150PrefixReferenceAttemptIdentityFromDescriptor(value) ===
      value.attempt_identity;
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXECUTION_DESCRIPTOR_DIGEST =
  "sha256:71bb5994f10ef3693cf2d47b4f270fba0451ef8a3e3162ca33febaf4a20df7e4" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_EXTERNAL_PLAN_IDENTITY_DIGEST =
  "sha256:3bbb920533fa64fbd03ba892310205045ff0e5b520a0ab9197788828688bf0f3" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST = hash(
  "farmos.day150-prefix-reference-execution-descriptor-digest.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXTERNAL_PLAN_IDENTITY_DIGEST =
  "sha256:3e6cb18ebd532cb8fbc567ea3c2efda047c4f0c81352f3e5263b02f78ccbb33a" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST = hash(
  "farmos.day150-prefix-reference-execution-descriptor-digest.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V9,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXTERNAL_PLAN_IDENTITY_DIGEST = hash(
  "farmos.day150-prefix-reference-bounded-external-plan-identity.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXECUTION_DESCRIPTOR_DIGEST = hash(
  "farmos.day150-prefix-reference-execution-descriptor-digest.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V10,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXTERNAL_PLAN_IDENTITY_DIGEST = hash(
  "farmos.day150-prefix-reference-bounded-external-plan-identity.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST = hash(
  "farmos.day150-prefix-reference-execution-descriptor-digest.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V11,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXTERNAL_PLAN_IDENTITY_DIGEST =
  "sha256:81ecaad201a1d7588e1cbdaee4d3565404bdcfc531053258fafe606fdb838c03" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXECUTION_DESCRIPTOR_DIGEST = hash(
  "farmos.day150-prefix-reference-execution-descriptor-digest.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V12,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXTERNAL_PLAN_IDENTITY_DIGEST = hash(
  "farmos.day150-prefix-reference-bounded-external-plan-identity.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXECUTION_DESCRIPTOR_DIGEST = hash(
  "farmos.day150-prefix-reference-execution-descriptor-digest.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V13,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXTERNAL_PLAN_IDENTITY_DIGEST = hash(
  "farmos.day150-prefix-reference-bounded-external-plan-identity.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_APPROVAL_RECORD_CANDIDATE_IDENTITY =
  "sha256:6dba6416413db6b982b59d5b6ea2979d5253084dea038c9c7aa2340c33003d28" as const;

export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-record.v1",
  approval_record_revision: 1,
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
  authority_revision: 1,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7",
  authorization_revision: 7,
  executable_source_digest:
    "sha256:efc9ae9f354973eb48ea0abee41a16343c02cf84f532d94aeaec725ca22448f5",
  authorization_digest:
    "sha256:97649ce7fa5ceaf31099aee83a818f60c370737afdc9828c3f84603d6ba61cf2",
  plan_digest:
    "sha256:dfa2d46ab611c6bf54362880566a80fc71327614dd41683087880a840486a453",
  run_identity:
    "sha256:efcbd422c7a8099142bc77a1d9bc1b55eae960d8e81831a7a7134e9cd5783b91",
  attempt_identity:
    "sha256:779b5670a0e4e0372adb7b185f9d6db18262c3af9d2454addf9b1c008476d8e6",
  execution_descriptor_revision: 1,
  execution_descriptor_digest:
    "sha256:71bb5994f10ef3693cf2d47b4f270fba0451ef8a3e3162ca33febaf4a20df7e4",
  external_plan_identity_digest:
    "sha256:3bbb920533fa64fbd03ba892310205045ff0e5b520a0ab9197788828688bf0f3",
  approval_candidate_identity:
    "sha256:6dba6416413db6b982b59d5b6ea2979d5253084dea038c9c7aa2340c33003d28",
  proposal_identity:
    "sha256:c4f8e85256aba37eeaf780c9669d93c21ff8f6cfcfb20f3259bc9c3b595c647b",
  proposal_created_at: "2026-08-16T09:39:36.000Z",
  approval_reference:
    "product-owner/day150/v7/c4f8e85256aba37eeaf780c9669d93c21ff8f6cfcfb20f3259bc9c3b595c647b",
  approved_at: "2026-08-16T09:39:36.000Z",
  approval_record_digest:
    "sha256:503ec591b5e55aca220575a300a51cf22a20d3a4d713340f79cb063ef279d1b8",
} as const);
export type FarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_GATE17_SCOPE_DIGEST =
  FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST;

export function parseFarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord(
  value: unknown,
): FarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const { approval_record_digest: digest, ...body } = source;
  return typeof digest === "string" &&
    hash("farmos.day150-prefix-reference-execution-approval-record.v1", body) === digest &&
    canonical(source) === canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD)
    ? Object.freeze(source) as FarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord
    : null;
}
export function validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History(
  history: unknown,
  approval: unknown,
): boolean {
  try {
    const parsedApproval = parseFarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord(approval);
    return parsedApproval !== null && canonical(history) ===
      canonical(FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1) &&
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.authorization_body === null &&
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.plan_body === null &&
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.closure_manifest === null &&
    parsedApproval.authorization_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1
        .historical_authorization_digest &&
    parsedApproval.plan_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_plan_digest &&
    parsedApproval.run_identity ===
      FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_run_id &&
    parsedApproval.attempt_identity ===
      FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_attempt_id &&
    parsedApproval.executable_source_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_source_digest &&
    parsedApproval.proposal_identity ===
      FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_proposal_identity &&
      parsedApproval.approval_record_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1
        .historical_approval_record_digest;
  } catch { return false; }
}

const V8_APPROVAL_BINDINGS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
  authorization_revision: 8,
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8_PROPOSAL_DIGEST,
  plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V8_PROPOSAL_DIGEST,
  run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_RUN_ID,
  attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V8_PROPOSED_ATTEMPT_ID,
  execution_descriptor_revision: 1,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXTERNAL_PLAN_IDENTITY_DIGEST,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE_IDENTITY = hash(
  "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  V8_APPROVAL_BINDINGS,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
  authority_revision: 1,
  ...V8_APPROVAL_BINDINGS,
  approval_candidate_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE_IDENTITY,
} as const);

const V9_APPROVAL_BINDINGS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9",
  authorization_revision: 9,
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_PROPOSAL_DIGEST,
  plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V9_PROPOSAL_DIGEST,
  run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_RUN_ID,
  attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V9_PROPOSED_ATTEMPT_ID,
  execution_descriptor_revision: 1,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_EXTERNAL_PLAN_IDENTITY_DIGEST,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE_IDENTITY = hash(
  "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  V9_APPROVAL_BINDINGS,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
  authority_revision: 1,
  ...V9_APPROVAL_BINDINGS,
  approval_candidate_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE_IDENTITY,
} as const);

const V10_APPROVAL_BINDINGS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10",
  authorization_revision: 10,
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V10_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_PROPOSAL_DIGEST,
  plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V10_PROPOSAL_DIGEST,
  run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_RUN_ID,
  attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V10_PROPOSED_ATTEMPT_ID,
  execution_descriptor_revision: 1,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V10_EXTERNAL_PLAN_IDENTITY_DIGEST,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_APPROVAL_RECORD_CANDIDATE_IDENTITY = hash(
  "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  V10_APPROVAL_BINDINGS,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V10_APPROVAL_RECORD_CANDIDATE = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
  authority_revision: 1,
  ...V10_APPROVAL_BINDINGS,
  approval_candidate_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_V10_APPROVAL_RECORD_CANDIDATE_IDENTITY,
} as const);

const V11_APPROVAL_BINDINGS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11",
  authorization_revision: 11,
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V11_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_PROPOSAL_DIGEST,
  plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V11_PROPOSAL_DIGEST,
  run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V11_PROPOSED_RUN_ID,
  attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V11_PROPOSED_ATTEMPT_ID,
  execution_descriptor_revision: 1,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V11_EXTERNAL_PLAN_IDENTITY_DIGEST,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_APPROVAL_RECORD_CANDIDATE_IDENTITY = hash(
  "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  V11_APPROVAL_BINDINGS,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_APPROVAL_RECORD_CANDIDATE = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
  authority_revision: 1,
  ...V11_APPROVAL_BINDINGS,
  approval_candidate_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_V11_APPROVAL_RECORD_CANDIDATE_IDENTITY,
} as const);

const V12_APPROVAL_BINDINGS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12",
  authorization_revision: 12,
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V12_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_PROPOSAL_DIGEST,
  plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V12_PROPOSAL_DIGEST,
  run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_RUN_ID,
  attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V12_PROPOSED_ATTEMPT_ID,
  execution_descriptor_revision: 1,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXTERNAL_PLAN_IDENTITY_DIGEST,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_CANDIDATE_IDENTITY = hash(
  "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  V12_APPROVAL_BINDINGS,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_CANDIDATE = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
  authority_revision: 1,
  ...V12_APPROVAL_BINDINGS,
  approval_candidate_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_CANDIDATE_IDENTITY,
} as const);

const V13_APPROVAL_BINDINGS = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13",
  authorization_revision: 13,
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST,
  plan_digest: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST,
  run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID,
  attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID,
  execution_descriptor_revision: 1,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXTERNAL_PLAN_IDENTITY_DIGEST,
});
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE_IDENTITY = hash(
  "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  V13_APPROVAL_BINDINGS,
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-execution-approval-candidate.v2",
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
  authority_revision: 1,
  ...V13_APPROVAL_BINDINGS,
  approval_candidate_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE_IDENTITY,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESSFUL_HISTORICAL_APPROVAL_CANDIDATE =
  Object.freeze({
    ...FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
    authorization_digest:
      "sha256:922edad1f5ff4e807eeaa5dda84dbf1ced72785ce9e0d84fe40f56f9cb33cd27",
    plan_digest:
      "sha256:3c1bfb7c037a48d6521d05727a65b178d10cb6a5f3d095bd5672297254d3214c",
    run_identity:
      "sha256:a150ad2a8a61f0da1e8ee100e4cc7b2cd56eadb595882ab6e09340aa872078ff",
    attempt_identity:
      "sha256:9ad8aed862a2605b512d66aa50dd9976ef70d8b03bb582d70cea94dbc55e0346",
    execution_descriptor_digest:
      "sha256:7172932ad3c611affdc5173208374b368411b7102e9bb0efd13db94f8331931a",
    external_plan_identity_digest:
      "sha256:d1c20aa7df3e2a38369650222ce6d2f88aaa2c5d498127d21eff668a3afe9c47",
    approval_candidate_identity:
      "sha256:a5c9ce72554c469bebfa3594dfec6c35cef34a516939624028baebe3e5104ca5",
  } as const);

export type FarmOsDay150PrefixReferenceExecutionApprovalCandidate =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE |
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE |
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V10_APPROVAL_RECORD_CANDIDATE |
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V11_APPROVAL_RECORD_CANDIDATE |
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_CANDIDATE |
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE |
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESSFUL_HISTORICAL_APPROVAL_CANDIDATE;

export type FarmOsDay150PrefixReferenceExecutionProposal = Readonly<
  FarmOsDay150PrefixReferenceExecutionApprovalCandidate & {
    proposal_created_at: string;
    proposal_identity: `sha256:${string}`;
    approval_reference: string;
  }>;
export function materializeFarmOsDay150PrefixReferenceExecutionProposal(input: Readonly<{
  candidate: FarmOsDay150PrefixReferenceExecutionApprovalCandidate;
  proposal_created_at: string;
}>): FarmOsDay150PrefixReferenceExecutionProposal | null {
  if (!Number.isFinite(Date.parse(input.proposal_created_at)) ||
    new Date(Date.parse(input.proposal_created_at)).toISOString() !== input.proposal_created_at ||
    ![FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE,
      FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE,
      FARM_OS_DAY150_PREFIX_REFERENCE_V10_APPROVAL_RECORD_CANDIDATE,
      FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_CANDIDATE,
      FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
      FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESSFUL_HISTORICAL_APPROVAL_CANDIDATE]
      .some((candidate) =>
      canonical(input.candidate) === canonical(candidate))) return null;
  const proposalBody = Object.freeze({ ...input.candidate,
    proposal_created_at: input.proposal_created_at });
  const proposalIdentity = hash(
    "farmos.day150-prefix-reference-execution-proposal.v1", proposalBody);
  return Object.freeze({ ...proposalBody, proposal_identity: proposalIdentity,
    approval_reference: `product-owner/day150/v${input.candidate.authorization_revision}/${
      proposalIdentity.slice("sha256:".length)}` });
}

export type FarmOsDay150PrefixReferenceExecutionApprovalRecord = Readonly<{
  schema_version: "farmos.day150-prefix-reference-execution-approval-record.v2";
  approval_record_revision: 2;
  authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1";
  authority_revision: 1;
  execution_authorization_id: string;
  authorization_revision: number;
  executable_source_digest: `sha256:${string}`;
  gate17_scope_digest: `sha256:${string}`;
  authorization_digest: `sha256:${string}`;
  plan_digest: `sha256:${string}`;
  run_identity: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
  execution_descriptor_revision: number;
  execution_descriptor_digest: `sha256:${string}`;
  external_plan_identity_digest: `sha256:${string}`;
  approval_candidate_identity: `sha256:${string}`;
  proposal_identity: `sha256:${string}`;
  proposal_created_at: string;
  approval_reference: string;
  approved_at: string;
  approval_record_digest: `sha256:${string}`;
}>;
export function createFarmOsDay150PrefixReferenceExecutionApprovalRecord(input: Readonly<{
  proposal: FarmOsDay150PrefixReferenceExecutionProposal;
  approved_at: string;
}>): FarmOsDay150PrefixReferenceExecutionApprovalRecord | null {
  if (!Number.isFinite(Date.parse(input.approved_at)) ||
    new Date(Date.parse(input.approved_at)).toISOString() !== input.approved_at ||
    Date.parse(input.approved_at) < Date.parse(input.proposal.proposal_created_at)) return null;
  const candidate = [FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE,
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_APPROVAL_RECORD_CANDIDATE,
    FARM_OS_DAY150_PREFIX_REFERENCE_V10_APPROVAL_RECORD_CANDIDATE,
    FARM_OS_DAY150_PREFIX_REFERENCE_V12_APPROVAL_RECORD_CANDIDATE,
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESSFUL_HISTORICAL_APPROVAL_CANDIDATE].find((value) =>
    value.approval_candidate_identity === input.proposal.approval_candidate_identity);
  const expectedProposal = candidate ? materializeFarmOsDay150PrefixReferenceExecutionProposal({
    candidate, proposal_created_at: input.proposal.proposal_created_at,
  }) : null;
  if (!expectedProposal || canonical(expectedProposal) !== canonical(input.proposal)) return null;
  const { schema_version: _candidateSchema, proposal_identity, proposal_created_at,
    approval_reference, ...candidateBindings } = input.proposal;
  void _candidateSchema;
  const body = Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-approval-record.v2" as const,
    approval_record_revision: 2 as const,
    ...candidateBindings,
    proposal_identity,
    proposal_created_at,
    approval_reference,
    approved_at: input.approved_at,
  });
  return Object.freeze({ ...body, approval_record_digest: hash(
    "farmos.day150-prefix-reference-execution-approval-record.v2", body) });
}
export function parseFarmOsDay150PrefixReferenceExecutionApprovalRecord(
  value: unknown,
): FarmOsDay150PrefixReferenceExecutionApprovalRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const expectedKeys = ["schema_version", "approval_record_revision", "authority_id",
    "authority_revision", "execution_authorization_id", "authorization_revision",
    "executable_source_digest", "gate17_scope_digest", "authorization_digest", "plan_digest", "run_identity",
    "attempt_identity", "execution_descriptor_revision", "execution_descriptor_digest",
    "external_plan_identity_digest", "approval_candidate_identity", "proposal_identity",
    "proposal_created_at", "approval_reference", "approved_at",
    "approval_record_digest"].sort();
  const actualKeys = Object.keys(source).sort();
  if (actualKeys.length !== expectedKeys.length ||
    !actualKeys.every((key, index) => key === expectedKeys[index])) return null;
  const { approval_record_digest: digest, ...body } = source;
  if (typeof digest !== "string" || !/^sha256:[a-f0-9]{64}$/u.test(digest) ||
    hash("farmos.day150-prefix-reference-execution-approval-record.v2", body) !== digest ||
    source.schema_version !== "farmos.day150-prefix-reference-execution-approval-record.v2" ||
    source.approval_record_revision !== 2 ||
    source.gate17_scope_digest !== FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST ||
    typeof source.approved_at !== "string" || typeof source.proposal_created_at !== "string" ||
    !Number.isFinite(Date.parse(source.approved_at)) ||
    !Number.isFinite(Date.parse(source.proposal_created_at)) ||
    new Date(Date.parse(source.approved_at)).toISOString() !== source.approved_at ||
    new Date(Date.parse(source.proposal_created_at)).toISOString() !== source.proposal_created_at ||
    Date.parse(source.approved_at) < Date.parse(source.proposal_created_at)) return null;
  return Object.freeze(source) as FarmOsDay150PrefixReferenceExecutionApprovalRecord;
}
export function validateFarmOsDay150PrefixReferenceExecutionApprovalForCandidate(
  value: unknown,
  candidate: FarmOsDay150PrefixReferenceExecutionApprovalCandidate,
): FarmOsDay150PrefixReferenceExecutionApprovalRecord | null {
  const parsed = parseFarmOsDay150PrefixReferenceExecutionApprovalRecord(value);
  if (!parsed) return null;
  const expectedProposal = materializeFarmOsDay150PrefixReferenceExecutionProposal({
    candidate, proposal_created_at: parsed.proposal_created_at,
  });
  const bindingKeys = ["execution_authorization_id", "authorization_revision",
    "executable_source_digest", "gate17_scope_digest", "authorization_digest", "plan_digest",
    "run_identity", "attempt_identity", "execution_descriptor_revision",
    "execution_descriptor_digest", "external_plan_identity_digest"] as const;
  return expectedProposal !== null &&
    candidate.approval_candidate_identity === parsed.approval_candidate_identity &&
    parsed.proposal_identity === expectedProposal.proposal_identity &&
    parsed.approval_reference === expectedProposal.approval_reference &&
    bindingKeys.every((key) => canonical(parsed[key]) === canonical(candidate[key]))
    ? parsed : null;
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_REQUEST = Object.freeze({
  request: "PRODUCT_OWNER_REVIEW_AND_EXPLICIT_AUTHORIZATION_REQUIRED",
  authorization: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST,
  external_execution_plan: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL,
  external_execution_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST,
  proposed_run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
  proposed_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
  current_state: "PROPOSED_NOT_AUTHORIZED",
  invocation_allowed: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_ACTIVATION = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL,
  authorization_state: "AUTHORIZED_BUT_NOT_CONSUMED",
  product_owner_approval_reference:
    "product-owner/2026-08-16/day150-v6-exact-one-invocation-approval",
  approved_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V6_PROPOSAL_DIGEST,
  approved_external_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST,
  approved_run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_RUN_ID,
  approved_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V6_PROPOSED_ATTEMPT_ID,
  invocation_limit: 1,
  automatic_retry_allowed: false,
  proposal_only: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7_REQUEST = Object.freeze({
  request: "RETIRED_HISTORICAL_EXECUTION_BODY_UNAVAILABLE",
  historical: FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
  authorization: null,
  external_execution_plan: null,
  approval_record_candidate: null,
  current_state: "RETIRED_NON_RUNNABLE",
  invocation_allowed: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_HISTORICAL_EXHAUSTED_EVIDENCE = Object.freeze({
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
  authorization_revision: 8,
  historical_state: "EXHAUSTED_NON_RUNNABLE",
  invocation_allowance: "EXHAUSTED",
  invocation_allowed: false,
  retry_allowed: false,
  approval_materialization_allowed: false,
  execution_descriptor_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXECUTION_DESCRIPTOR_DIGEST,
  external_plan_identity_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXTERNAL_PLAN_IDENTITY_DIGEST,
  historical_approval_record_digest:
    "sha256:4fd1e6033083234bb78b6588a51db49d3124f385608195f3cabbdb3c5637d982",
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9_REQUEST = Object.freeze({
  request: "TERMINAL_CONSUMED_HISTORICAL_EXECUTION",
  authorization: null,
  external_execution_plan: null,
  approval_record_candidate: null,
  current_state: "TERMINAL_CONSUMED_NON_RUNNABLE",
  invocation_allowed: false,
  retry_allowed: false,
  approval_materialization_allowed: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V10_REQUEST = Object.freeze({
  request: "STALE_PRE_INVOCATION_PROPOSAL",
  authorization: null,
  external_execution_plan: null,
  approval_record_candidate: null,
  current_state: "STALE_PRE_INVOCATION_NON_RUNNABLE",
  invocation_allowed: false,
  retry_allowed: false,
  approval_materialization_allowed: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11_REQUEST = Object.freeze({
  request: "HISTORICAL_TERMINAL_CONSUMED_OUTCOME_UNKNOWN",
  authorization: null,
  external_execution_plan: null,
  approval_record_candidate: null,
  current_state: "TERMINAL_CONSUMED_NON_RUNNABLE",
  invocation_allowed: false,
  retry_allowed: false,
  approval_materialization_allowed: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12_REQUEST = Object.freeze({
  request: "HISTORICAL_INVOCATION_ISSUED_HUMAN_ALLOWANCE_EXHAUSTED",
  authorization: null,
  external_execution_plan: null,
  approval_record_candidate: null,
  historical_approval_record_digest:
    "sha256:1745f4892c2846a6753ef36c94b404be88fc7e596d4b88e7cc7df9e8fdf8799c",
  current_state: "HUMAN_INVOCATION_ALLOWANCE_EXHAUSTED_DURABLE_CONSUMPTION_NOT_REACHED",
  invocation_allowed: false,
  retry_allowed: false,
  approval_materialization_allowed: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_REQUEST = Object.freeze({
  request: "PRODUCT_OWNER_REVIEW_AND_EXPLICIT_AUTHORIZATION_REQUIRED",
  authorization: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL_DIGEST,
  external_execution_plan: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL,
  external_execution_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL_DIGEST,
  proposed_run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_RUN_ID,
  proposed_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V13_PROPOSED_ATTEMPT_ID,
  executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.source_candidate_digest,
  gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
  approval_record_candidate:
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  current_state: "PROPOSED_NOT_AUTHORIZED",
  invocation_allowed: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING = Object.freeze({
  descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  authorization: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13_PROPOSAL,
  external_execution_plan: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V13_PROPOSAL,
  approval_candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
});
export function validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
  input: unknown,
): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const value = input as typeof FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING;
  if (typeof value.descriptor !== "object" || value.descriptor === null ||
    typeof value.authorization !== "object" || value.authorization === null ||
    typeof value.external_execution_plan !== "object" || value.external_execution_plan === null ||
    typeof value.approval_candidate !== "object" || value.approval_candidate === null) return false;
  const { descriptor: selected, authorization, external_execution_plan: plan,
    approval_candidate: candidate } = value;
  return validateFarmOsDay150PrefixReferenceExecutionDescriptor(selected) &&
    authorization.authorization_id === selected.authorization_id &&
    authorization.authorization_revision === selected.authorization_revision &&
    authorization.authorization_state === "PROPOSED_NOT_AUTHORIZED" &&
    authorization.product_owner_approval_reference === null &&
    authorization.proposal_only === true &&
    authorization.invocation_limit === 1 &&
    authorization.automatic_retry_allowed === false &&
    authorization.stable_run_id === selected.run_identity &&
    canonical(authorization.gate17_scope_authority) === canonical({
      authority_id: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_id,
      authority_revision: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY.authority_revision,
      authority_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
    }) &&
    canonical(authorization.source_candidate_binding) ===
      canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING) &&
    hash(selected.digest_domains.authorization, authorization) === selected.authorization_digest &&
    authorization.attempt_claim.path === selected.durable_paths.attempt_claim &&
    authorization.consumption_marker.path === selected.durable_paths.consumption_marker &&
    authorization.receipt_output_path === selected.durable_paths.success_receipt &&
    authorization.terminal_outcome_receipt.path ===
      selected.durable_paths.terminal_outcome_receipt &&
    authorization.candidate_output_paths.length === selected.durable_paths.candidate_outputs.length &&
    authorization.candidate_output_paths.every((path, index) =>
      path === selected.durable_paths.candidate_outputs[index]) &&
    plan.execution_authorization_id === selected.authorization_id &&
    plan.execution_authorization_revision === selected.authorization_revision &&
    plan.execution_authorization_digest === selected.authorization_digest &&
    plan.execution_authorized === false &&
    plan.authorization_consumption_allowed === false &&
    plan.authorization_state === "PROPOSED_NOT_AUTHORIZED" &&
    plan.proposal_only === true &&
    plan.invocation_limit === 1 &&
    plan.automatic_retries === 0 &&
    plan.production_operations === 0 &&
    plan.canonical_operations === 0 &&
    plan.b2_operations === 0 &&
    plan.gate2_operations === 0 &&
    canonical(plan.gate17_scope_authority) ===
      canonical(authorization.gate17_scope_authority) &&
    canonical(plan.source_candidate_binding) ===
      canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING) &&
    plan.stable_run_id === selected.run_identity &&
    plan.attempt_claim_path === selected.durable_paths.attempt_claim &&
    plan.consumption_marker_path === selected.durable_paths.consumption_marker &&
    plan.success_receipt_path === selected.durable_paths.success_receipt &&
    plan.terminal_outcome_receipt_path === selected.durable_paths.terminal_outcome_receipt &&
    plan.candidate_output_paths.length === selected.durable_paths.candidate_outputs.length &&
    plan.candidate_output_paths.every((path, index) =>
      path === selected.durable_paths.candidate_outputs[index]) &&
    plan.pinned_migration_bundle_digest === selected.pinned_migration_bundle_digest &&
    hash(selected.digest_domains.plan, plan) === selected.execution_plan_digest &&
    candidate.execution_authorization_id === selected.authorization_id &&
    candidate.authorization_revision === selected.authorization_revision &&
    candidate.authorization_digest === selected.authorization_digest &&
    candidate.plan_digest === selected.execution_plan_digest &&
    candidate.run_identity === selected.run_identity &&
    candidate.attempt_identity === selected.attempt_identity &&
    candidate.execution_descriptor_revision === 1 &&
    candidate.execution_descriptor_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXECUTION_DESCRIPTOR_DIGEST &&
    candidate.external_plan_identity_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V13_EXTERNAL_PLAN_IDENTITY_DIGEST &&
    candidate.approval_candidate_identity ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE_IDENTITY &&
    candidate.executable_source_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.source_candidate_digest &&
    candidate.gate17_scope_digest === FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST;
}
export function verifyFarmOsDay150PrefixReferenceExecutionPlanV5Proposal(value: unknown): boolean {
  try {
    return hash(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.plan, value) ===
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST;
  } catch { return false; }
}
export function verifyFarmOsDay150PrefixReferenceExecutionPlanV6Proposal(value: unknown): boolean {
  try {
    return hash(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V6.plan, value) ===
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V6_PROPOSAL_DIGEST;
  } catch { return false; }
}
export function verifyFarmOsDay150PrefixReferenceExecutionPlanV7Proposal(value: unknown): boolean {
  void value;
  return false;
}

export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V3_DIGEST =
  "sha256:d3238292c14a5ec9912e7c63095800343269951ee6b8e11f6178b9bf1df5f09a" as const;

export function verifyFarmOsDay150PrefixReferenceExecutionPlanV3(value: unknown): boolean {
  try {
    return hash("farmos.day150-prefix-reference-external-execution-plan.v3", value) ===
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V3_DIGEST;
  } catch {
    return false;
  }
}

export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V4_DIGEST =
  "sha256:3873b1a6defc898a742ee14cf95a5d34bcf215dc3559ee090285686a87a896c0" as const;

export function verifyFarmOsDay150PrefixReferenceExecutionPlanV4(value: unknown): boolean {
  try {
    return hash(FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V4.plan, value) ===
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V4_DIGEST;
  } catch { return false; }
}
