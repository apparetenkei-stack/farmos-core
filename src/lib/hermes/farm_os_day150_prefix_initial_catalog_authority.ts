import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import type {
  FarmOsMigrationCatalogObject,
  FarmOsMigrationCatalogSnapshot,
} from "./farm_os_stable_changes_migration_reconciliation";

export const FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_SCHEMA =
  "farmos.day150-prefix-reference-initial-catalog-authority.v1" as const;
export const FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID =
  "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V1" as const;
export const FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID =
  "DAY150_PREFIX_REFERENCE_INITIAL_CATALOG_AUTHORITY_V2" as const;
export const FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC =
  "REFERENCE_MIGRATION_OWNER" as const;
export const FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION =
  "farmos.reference-migration-owner-normalization.v1" as const;
export const FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION =
  "farmos.pg-catalog-semantic-principal-fingerprint.v2" as const;
export const FARM_OS_DAY150_DUAL_PRINCIPAL_SEMANTIC_FINGERPRINT_VERSION =
  "farmos.pg-catalog-semantic-principal-fingerprint.v3" as const;
export const FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME =
  "farmos_day150_reference_migration_owner_v1" as const;
export const FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME =
  "farmos_day150_reference_migration_executor_v1" as const;
export const FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC =
  "REFERENCE_MIGRATION_EXECUTOR" as const;
export const FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION =
  "farmos.reference-migration-owner-executor-normalization.v2" as const;

const HISTORICAL_SOURCE_PATH = "scripts/sql/day3_roles_and_proposal_inbox.sql" as const;
const HISTORICAL_SOURCE_BLOB = "06629c7fade0b78c129e5f4db578a2a5a1137556" as const;
const HISTORICAL_SOURCE_SHA256 =
  "sha256:645921b4a710450bc2f48aba9908727a5c888fa1125731800399df2d35b7e2c2" as const;
const HISTORICAL_SOURCE_COMMIT = "a07ce58c7437305da3d3936a1c47bc4a1e16f2e1" as const;

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const canonical = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_FINITE");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!record(value)) throw new Error("NON_JSON");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\n${canonical(value)}`, "utf8").digest("hex")}`;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};
const owned = <T>(value: T): T => deepFreeze(structuredClone(value));

// Exact structural slice adopted from the historical Day3 artifact. Day3 security state is excluded.
export const FARM_OS_DAY150_PROPOSAL_INBOX_BASE_RELATION_DDL = `CREATE TABLE IF NOT EXISTS ai.proposal_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  proposal_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,

  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_refs_json jsonb NOT NULL DEFAULT '[]'::jsonb,

  model_name text,
  agent_name text,
  confidence numeric(4,3),

  reason text,
  risk_level text NOT NULL DEFAULT 'low',

  status text NOT NULL DEFAULT 'pending',

  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,

  applied_at timestamptz,
  applied_by text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proposal_inbox_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision', 'applied', 'expired')),

  CONSTRAINT proposal_inbox_risk_level_check
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  CONSTRAINT proposal_inbox_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);` as const;

const INITIAL_OBJECTS = Object.freeze([
  Object.freeze({ object_type: "schema", identity: "ai", definition: "CREATE SCHEMA ai" }),
  Object.freeze({ object_type: "table", identity: "ai.proposal_inbox",
    definition: FARM_OS_DAY150_PROPOSAL_INBOX_BASE_RELATION_DDL,
    base_column_count: 19, constraints: Object.freeze([
      "proposal_inbox_pkey", "proposal_inbox_status_check",
      "proposal_inbox_risk_level_check", "proposal_inbox_confidence_check",
    ]), indexes: Object.freeze(["proposal_inbox_pkey"]) }),
] as const);

const AUTHORITY_BODY = Object.freeze({
  schema_version: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_SCHEMA,
  authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
  authority_revision: 1 as const,
  authority_state: "PRODUCT_OWNER_ADOPTED_SOURCE_IMPLEMENTATION_REQUIRED" as const,
  structural_source_lineage: Object.freeze({
    historical_source_path: HISTORICAL_SOURCE_PATH,
    historical_git_blob: HISTORICAL_SOURCE_BLOB,
    historical_source_sha256: HISTORICAL_SOURCE_SHA256,
    historical_introducing_commit: HISTORICAL_SOURCE_COMMIT,
    complete_day3_artifact_adopted: false,
  }),
  initial_objects: INITIAL_OBJECTS,
  owner_semantic: FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC,
  security_baseline: Object.freeze({
    policy: "OWNER_ONLY" as const,
    explicit_application_or_user_grants: Object.freeze([]),
    explicit_public_privileges: Object.freeze([]),
    development_default_privileges: Object.freeze([]),
  }),
  principal_normalization_revision: FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION,
  fingerprint_version: FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION,
  canonicalization_revision: "farmos.day150-semantic-principal-canonicalization.v2" as const,
  object_universe_revision: "farmos.day150-prefix-object-universe.v1" as const,
  catalog_query_revision: "farmos.production-target-identity-query.v5" as const,
  product_owner_adoption_reference:
    "product-owner/day150-prefix-reference-initial-catalog-authority-v1" as const,
  adopted_at: "2026-08-13T00:00:00.000Z" as const,
  git_authority: Object.freeze({
    historical_structural_authority: HISTORICAL_SOURCE_COMMIT,
    implementation_state: "WORKING_TREE_SOURCE_QUALIFIED_NOT_COMMITTED" as const,
  }),
  privacy_policy: "INTERNAL_RAW_NEVER_PERSIST" as const,
  credentials_allowed: false as const,
});

export const FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY = deepFreeze({
  ...AUTHORITY_BODY,
  canonical_initial_state_digest:
    hash("farmos.day150-prefix-reference-initial-catalog-authority.v1", AUTHORITY_BODY),
});

const DAY146_PREPREFIX_SOURCE_PATH =
  "scripts/sql/day146_operational_memory_snapshot_persistence.sql" as const;
const DAY146_PREPREFIX_CURRENT_BLOB = "ca8f3c8954560f3e8abd7c7d5fcf8a44ed6d428f" as const;
const DAY146_PREPREFIX_SOURCE_SHA256 =
  "sha256:017c69c6cbfcf8efbe2cd042c32cfb88a848b6f48d65f23189f47dc22e6cefdc" as const;
const DAY146_PREPREFIX_INTRODUCING_COMMIT =
  "e586de8ab00512ba806447c32dd1217f424e78d7" as const;
const DAY146_PREPREFIX_CURRENT_COMMIT =
  "251fc90de7deb11ada214d0d195af295fb63b60a" as const;
const DAY146_PREPREFIX_URL = new URL(
  `../../../${DAY146_PREPREFIX_SOURCE_PATH}`, import.meta.url);

function loadDay146PreprefixStructuralSlice(): string {
  const bytes = readFileSync(fileURLToPath(DAY146_PREPREFIX_URL));
  const actual = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
  if (actual !== DAY146_PREPREFIX_SOURCE_SHA256) throw new Error(
    "DAY150_PREPREFIX_PROVENANCE_SOURCE_MISMATCH");
  const source = bytes.toString("utf8");
  const start = source.indexOf(
    "create table if not exists ai.operational_memory_source_snapshots");
  const end = source.lastIndexOf("\ncommit;");
  if (start < 0 || end <= start) throw new Error("DAY150_PREPREFIX_STRUCTURAL_SLICE_MISSING");
  const slice = source.slice(start, end).trim();
  if (!slice.includes("create table if not exists ai.operational_memory_daily_projections") ||
    !slice.includes("create table if not exists ai.operational_memory_projection_state_events") ||
    !slice.includes("create or replace function ai.reject_operational_memory_immutable_mutation()") ||
    !slice.includes("create or replace function ai.persist_operational_memory_bundle(")) {
    throw new Error("DAY150_PREPREFIX_STRUCTURAL_SLICE_INCOMPLETE");
  }
  return slice;
}

const DAY146_PREPREFIX_OBJECTS = Object.freeze([
  "ai.operational_memory_source_snapshots",
  "ai.operational_memory_snapshot_state_events",
  "ai.operational_memory_daily_projections",
  "ai.operational_memory_projection_state_events",
  "ai.operational_memory_projection_lineage",
  "ai.operational_memory_ingestion_rejections",
] as const);

const INITIAL_AUTHORITY_V2_BODY = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-initial-catalog-authority.v2" as const,
  authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  authority_revision: 2 as const,
  authority_state: "PRODUCT_OWNER_AUTHORIZED_DAY150_PREREQUISITE_REPAIR" as const,
  supersedes_for_future_execution: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
  historical_v11_authority_unchanged: true as const,
  structural_source_lineage: Object.freeze({
    proposal_inbox: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.structural_source_lineage,
    operational_memory_preprefix: Object.freeze({
      source_path: DAY146_PREPREFIX_SOURCE_PATH,
      current_git_blob: DAY146_PREPREFIX_CURRENT_BLOB,
      source_sha256: DAY146_PREPREFIX_SOURCE_SHA256,
      introducing_commit: DAY146_PREPREFIX_INTRODUCING_COMMIT,
      current_canonical_commit: DAY146_PREPREFIX_CURRENT_COMMIT,
      predates_gate17_prefix: true as const,
      full_structural_dependency_closure_adopted: true as const,
      roles_passwords_grants_and_data_adopted: false as const,
    }),
  }),
  initial_objects: Object.freeze([
    ...INITIAL_OBJECTS,
    ...DAY146_PREPREFIX_OBJECTS.map((identity) => Object.freeze({
      object_type: "table" as const, identity,
      source: DAY146_PREPREFIX_SOURCE_PATH,
    })),
    Object.freeze({ object_type: "function" as const,
      identity: "ai.reject_operational_memory_immutable_mutation()",
      source: DAY146_PREPREFIX_SOURCE_PATH }),
    Object.freeze({ object_type: "function" as const,
      identity: "ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb)",
      source: DAY146_PREPREFIX_SOURCE_PATH }),
  ]),
  owner_semantics: Object.freeze({
    proposal_inbox: FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC,
    operational_memory_preprefix: FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC,
  }),
  security_baseline: Object.freeze({
    policy: "OWNER_ONLY_NO_ADDITIONAL_GRANTS" as const,
    explicit_application_or_user_grants: Object.freeze([]),
    explicit_public_privileges: Object.freeze([]),
    development_default_privileges: Object.freeze([]),
  }),
  structural_counts: Object.freeze({ tables: 7 as const, preprefix_tables: 6 as const,
    preprefix_functions: 2 as const, preprefix_append_only_triggers: 6 as const }),
  product_owner_adoption_reference:
    "product-owner/day150-v11-compensation-and-prerequisite-repair" as const,
  credentials_allowed: false as const,
  application_data_allowed: false as const,
});

export const FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2 = deepFreeze({
  ...INITIAL_AUTHORITY_V2_BODY,
  canonical_initial_state_digest: hash(
    "farmos.day150-prefix-reference-initial-catalog-authority.v2",
    INITIAL_AUTHORITY_V2_BODY),
});

export type FarmOsDay150ReferenceBootstrapOperation = Readonly<{
  sequence: number;
  kind: "TRANSACTION_CONTROL" | "CREATE_REFERENCE_ROLE" | "CREATE_SCHEMA" |
    "REVOKE_PUBLIC" | "CREATE_BASE_RELATION" | "CREATE_PREPREFIX_STRUCTURE";
  sql: string;
}>;
export type FarmOsDay150ReferenceBootstrapPlan = Readonly<{
  schema_version: "farmos.day150-prefix-reference-bootstrap-plan.v1";
  authority_id: typeof FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID |
    typeof FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID;
  initial_catalog_digest: `sha256:${string}`;
  reference_role_profile: Readonly<{
    role_name: typeof FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME;
    semantic_identity: typeof FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC;
    login: false; password: false; superuser: false; createdb: false; createrole: false;
    replication: false; bypassrls: false; reference_run_only: true;
    database_scope: "EPHEMERAL_DAY150_PREFIX_REFERENCE_DATABASE_ONLY";
  }>;
  operations: readonly FarmOsDay150ReferenceBootstrapOperation[];
  forbidden_source_paths: readonly [typeof HISTORICAL_SOURCE_PATH,
    "scripts/sql/day126_daily_farm_brief_proposal_explicit_save_fixture.sql"];
  plan_digest: `sha256:${string}`;
}>;

const REFERENCE_ROLE_PROFILE = Object.freeze({
  role_name: FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME,
  semantic_identity: FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC,
  login: false as const, password: false as const, superuser: false as const,
  createdb: false as const, createrole: false as const, replication: false as const,
  bypassrls: false as const, reference_run_only: true as const,
  database_scope: "EPHEMERAL_DAY150_PREFIX_REFERENCE_DATABASE_ONLY" as const,
});
const BOOTSTRAP_OPERATIONS: readonly FarmOsDay150ReferenceBootstrapOperation[] = Object.freeze([
  Object.freeze({ sequence: 1, kind: "TRANSACTION_CONTROL", sql: "BEGIN;" }),
  Object.freeze({ sequence: 2, kind: "CREATE_REFERENCE_ROLE",
    sql: `CREATE ROLE ${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;` }),
  Object.freeze({ sequence: 3, kind: "CREATE_SCHEMA",
    sql: `CREATE SCHEMA ai AUTHORIZATION ${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME};` }),
  Object.freeze({ sequence: 4, kind: "REVOKE_PUBLIC", sql: "REVOKE ALL ON SCHEMA ai FROM PUBLIC;" }),
  Object.freeze({ sequence: 5, kind: "CREATE_BASE_RELATION",
    sql: `SET LOCAL ROLE ${FARM_OS_DAY150_REFERENCE_OWNER_ROLE_NAME};\n${FARM_OS_DAY150_PROPOSAL_INBOX_BASE_RELATION_DDL}` }),
  Object.freeze({ sequence: 6, kind: "REVOKE_PUBLIC",
    sql: "REVOKE ALL ON TABLE ai.proposal_inbox FROM PUBLIC;" }),
  Object.freeze({ sequence: 7, kind: "TRANSACTION_CONTROL", sql: "COMMIT;" }),
]);

export function compileFarmOsDay150ReferenceInitialCatalogBootstrap():
  FarmOsDay150ReferenceBootstrapPlan {
  const body = Object.freeze({
    schema_version: "farmos.day150-prefix-reference-bootstrap-plan.v1" as const,
    authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
    initial_catalog_digest: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.canonical_initial_state_digest,
    reference_role_profile: REFERENCE_ROLE_PROFILE,
    operations: BOOTSTRAP_OPERATIONS,
    forbidden_source_paths: Object.freeze([HISTORICAL_SOURCE_PATH,
      "scripts/sql/day126_daily_farm_brief_proposal_explicit_save_fixture.sql"] as const),
  });
  return owned({ ...body,
    plan_digest: hash("farmos.day150-prefix-reference-bootstrap-plan.v1", body) });
}

export function compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap():
  FarmOsDay150ReferenceBootstrapPlan & Readonly<{
    authority_id: typeof FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID;
    initial_catalog_digest: `sha256:${string}`;
  }> {
  const operations = Object.freeze([
    ...BOOTSTRAP_OPERATIONS.slice(0, -1),
    Object.freeze({ sequence: 7, kind: "CREATE_PREPREFIX_STRUCTURE" as const,
      sql: `SET LOCAL ROLE ${FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME};\n${
        loadDay146PreprefixStructuralSlice()}` }),
    Object.freeze({ sequence: 8, kind: "REVOKE_PUBLIC" as const,
      sql: `REVOKE ALL ON TABLE ${DAY146_PREPREFIX_OBJECTS.join(", ")} FROM PUBLIC;\n` +
        "REVOKE ALL ON FUNCTION ai.reject_operational_memory_immutable_mutation(), " +
        "ai.persist_operational_memory_bundle(jsonb,jsonb,jsonb,jsonb,jsonb,jsonb) FROM PUBLIC;" }),
    Object.freeze({ sequence: 9, kind: "TRANSACTION_CONTROL" as const, sql: "COMMIT;" }),
  ]);
  const body = Object.freeze({
    schema_version: "farmos.day150-prefix-reference-bootstrap-plan.v1" as const,
    authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
    initial_catalog_digest:
      FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.canonical_initial_state_digest,
    reference_role_profile: REFERENCE_ROLE_PROFILE,
    operations,
    forbidden_source_paths: Object.freeze([HISTORICAL_SOURCE_PATH,
      "scripts/sql/day126_daily_farm_brief_proposal_explicit_save_fixture.sql"] as const),
  });
  return owned({ ...body,
    plan_digest: hash("farmos.day150-prefix-reference-bootstrap-plan.v1", body) });
}

export function validateFarmOsDay150ReferenceInitialCatalogV2Bootstrap(value: unknown): boolean {
  const expected = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap();
  if (!record(value) || canonical(value) !== canonical(expected)) return false;
  const sql = expected.operations.map((operation) => operation.sql).join("\n");
  return !/\bPASSWORD\b/iu.test(sql) && !sql.includes("farmos_app_local") &&
    !sql.includes("farmos_ai_proposal_local") && !sql.includes("CREATE SCHEMA app") &&
    !sql.includes("CREATE SCHEMA knowledge") &&
    DAY146_PREPREFIX_OBJECTS.every((identity) => sql.includes(identity));
}

export function validateFarmOsDay150ReferenceInitialCatalogBootstrap(value: unknown):
  value is FarmOsDay150ReferenceBootstrapPlan {
  const expected = compileFarmOsDay150ReferenceInitialCatalogBootstrap();
  if (!record(value) || canonical(value) !== canonical(expected)) return false;
  const sql = expected.operations.map((operation) => operation.sql).join("\n");
  return !/\bPASSWORD\b/iu.test(sql) && !sql.includes("farmos_app_local") &&
    !sql.includes("farmos_ai_proposal_local") && !sql.includes("CREATE SCHEMA app") &&
    !sql.includes("CREATE SCHEMA knowledge");
}

// Review-only digest helper. A digest is not an authority or a trusted principal binding.
export function computeFarmOsDay150InitialCatalogReviewDigest(value: unknown): `sha256:${string}` {
  return hash("farmos.day150-prefix-reference-initial-catalog-authority.v1", value);
}

declare const PRINCIPAL_BINDING: unique symbol;
export type FarmOsDay150TrustedPrincipalBinding = Readonly<{ [PRINCIPAL_BINDING]: true }>;
const trustedBindings = new WeakMap<object, Readonly<{ raw_principal: string;
  semantic_principal: typeof FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC;
  source: "REPOSITORY_APPROVED_TARGET_OWNER"; target_authority_id: string;
  target_identity_digest: `sha256:${string}` }>>();

function issueBinding(rawPrincipal: string, targetAuthorityId: string,
  targetIdentityDigest: `sha256:${string}`):
  FarmOsDay150TrustedPrincipalBinding {
  const capability = Object.freeze(Object.create(null)) as FarmOsDay150TrustedPrincipalBinding;
  trustedBindings.set(capability, Object.freeze({ raw_principal: rawPrincipal,
    semantic_principal: FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC,
    source: "REPOSITORY_APPROVED_TARGET_OWNER", target_authority_id: targetAuthorityId,
    target_identity_digest: targetIdentityDigest }));
  return capability;
}

// Empty until a separately approved target-owner authority is checked into the repository.
const OBSERVED_TARGET_OWNER_BINDINGS: readonly Readonly<{
  target_authority_id: string; target_identity_digest: `sha256:${string}`; raw_principal: string;
}>[] = Object.freeze([]);
export function loadFarmOsDay150ObservedTargetPrincipalBinding(input: Readonly<{
  target_authority_id: string; target_identity_digest: `sha256:${string}`; raw_principal: string;
}>): FarmOsDay150TrustedPrincipalBinding | null {
  const approved = OBSERVED_TARGET_OWNER_BINDINGS.find((entry) =>
    entry.target_authority_id === input.target_authority_id &&
    entry.target_identity_digest === input.target_identity_digest &&
    entry.raw_principal === input.raw_principal);
  return approved ? issueBinding(approved.raw_principal, approved.target_authority_id,
    approved.target_identity_digest) : null;
}

export function normalizeFarmOsDay150ReferencePrincipal(input: Readonly<{
  raw_principal: string; binding: FarmOsDay150TrustedPrincipalBinding | unknown;
}>): typeof FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC | null {
  if (typeof input.binding !== "object" || input.binding === null) return null;
  const binding = trustedBindings.get(input.binding);
  return binding?.raw_principal === input.raw_principal
    ? binding.semantic_principal : null;
}

export type FarmOsDay150SemanticAclEvidence = Readonly<{
  object_identity: string; principal: string; privilege: string;
  grant_option: boolean; grantor: string;
}>;

function normalizedObject(object: FarmOsMigrationCatalogObject, rawPrincipal: string):
  FarmOsMigrationCatalogObject | null {
  const replacePrincipal = (value: unknown): unknown => {
    if (value === rawPrincipal) return FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC;
    if (Array.isArray(value)) return value.map(replacePrincipal);
    if (record(value)) return Object.fromEntries(Object.entries(value).map(([key, nested]) =>
      [key, replacePrincipal(nested)]));
    return value;
  };
  const owner = object.owner === null ? null : object.owner === rawPrincipal
    ? FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC : null;
  if (object.owner !== null && owner === null) return null;
  const fixedAclPrincipals = new Set([
    "public", "PUBLIC", "farmos_core_projection_command_transaction",
    "farmos_core_projection_reader", "farmos_core_projection_writer",
    "farmos_core_proposal_audit_writer", "farmos_core_proposal_reviewer",
    "farmos_core_proposal_transaction", "farmos_core_proposal_writer",
    "farmos_core_stable_changes_runtime",
  ]);
  const acl: Array<{ principal: string; privilege: string; grant_option: boolean }> = [];
  for (const entry of object.acl) {
    const semantic = entry.principal === rawPrincipal
      ? FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC : null;
    if (semantic !== null) acl.push({ ...entry, principal: semantic });
    else if (fixedAclPrincipals.has(entry.principal)) acl.push({ ...entry });
    else return null;
  }
  let definition = object.definition;
  try { definition = canonical(replacePrincipal(JSON.parse(object.definition))); } catch {
    if (definition.includes(rawPrincipal)) return null;
  }
  return owned({ ...object, definition,
    attributes: replacePrincipal(object.attributes) as FarmOsMigrationCatalogObject["attributes"],
    owner, acl });
}

export function createFarmOsDay150SemanticPrincipalFingerprint(input: Readonly<{
  snapshot: FarmOsMigrationCatalogSnapshot;
  authenticated_raw_principal: string;
  acl_evidence: readonly FarmOsDay150SemanticAclEvidence[];
  object_universe_revision: string;
  catalog_query_revision: string;
}>): `sha256:${string}` | null {
  if (input.authenticated_raw_principal.length < 1 ||
    input.object_universe_revision !== "farmos.day150-prefix-object-universe.v1" ||
    input.catalog_query_revision !== "farmos.production-target-identity-query.v5") return null;
  const objects = input.snapshot.objects.map((object) =>
    normalizedObject(object, input.authenticated_raw_principal));
  if (objects.some((object) => object === null)) return null;
  const aclEvidence = input.acl_evidence.map((entry) => {
    const normalize = (principal: string) => principal === input.authenticated_raw_principal
      ? FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC : principal;
    const principal = normalize(entry.principal);
    const grantor = normalize(entry.grantor);
    const fixed = new Set(["public", "PUBLIC", "farmos_core_projection_command_transaction",
      "farmos_core_projection_reader", "farmos_core_projection_writer",
      "farmos_core_proposal_audit_writer", "farmos_core_proposal_reviewer",
      "farmos_core_proposal_transaction", "farmos_core_proposal_writer",
      "farmos_core_stable_changes_runtime"]);
    if (principal !== FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC && !fixed.has(principal)) return null;
    if (grantor !== FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC && !fixed.has(grantor)) return null;
    return { ...entry, principal, grantor };
  });
  if (aclEvidence.some((entry) => entry === null)) return null;
  const aclKeys = aclEvidence.map((entry) => canonical(entry));
  if (new Set(aclKeys).size !== aclKeys.length) return null;
  const normalized = Object.freeze({
    source_snapshot_schema_version: input.snapshot.schema_version,
    migration_id: input.snapshot.migration_id,
    fingerprint_version: FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION,
    semantic_principal_normalization_policy:
      FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION,
    initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
    initial_catalog_digest:
      FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.canonical_initial_state_digest,
    object_universe_revision: input.object_universe_revision,
    object_universe_digest: input.snapshot.object_universe_digest,
    catalog_query_revision: input.catalog_query_revision,
    catalog_query_sha256: input.snapshot.catalog_query_sha256,
    canonicalization_revision: "farmos.day150-semantic-principal-canonicalization.v2",
    objects: objects.sort((left, right) =>
      Buffer.compare(Buffer.from(`${left!.kind}:${left!.identity}`),
        Buffer.from(`${right!.kind}:${right!.identity}`))),
    acl_grantor_evidence: aclEvidence.sort((left, right) => Buffer.compare(
      Buffer.from(canonical(left)), Buffer.from(canonical(right)))),
  });
  return hash(FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION, normalized);
}

export function createFarmOsDay150DualPrincipalSemanticFingerprint(input: Readonly<{
  snapshot: FarmOsMigrationCatalogSnapshot;
  authenticated_raw_owner_principal: string;
  authenticated_raw_executor_principal: string;
  acl_evidence: readonly FarmOsDay150SemanticAclEvidence[];
  object_universe_revision: string;
  catalog_query_revision: string;
}>): `sha256:${string}` | null {
  const owner = input.authenticated_raw_owner_principal;
  const executor = input.authenticated_raw_executor_principal;
  if (owner.length < 1 || executor.length < 1 || owner === executor ||
    input.object_universe_revision !== "farmos.day150-prefix-object-universe.v1" ||
    input.catalog_query_revision !== "farmos.production-target-identity-query.v5") return null;
  const fixed = new Set(["public", "PUBLIC", "farmos_core_projection_command_transaction",
    "farmos_core_projection_reader", "farmos_core_projection_writer",
    "farmos_core_proposal_audit_writer", "farmos_core_proposal_reviewer",
    "farmos_core_proposal_transaction", "farmos_core_proposal_writer",
    "farmos_core_stable_changes_runtime"]);
  const semantic = (value: string): string | null => value === owner ||
    value === FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC
    ? FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC : value === executor ||
      value === FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC
      ? FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC : fixed.has(value) ? value : null;
  const replace = (value: unknown): unknown => {
    if (value === owner) return FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC;
    if (value === executor) return FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC;
    if (Array.isArray(value)) return value.map(replace);
    if (record(value)) return Object.fromEntries(Object.entries(value).map(([key, nested]) =>
      [key, replace(nested)]));
    return value;
  };
  const objects: FarmOsMigrationCatalogObject[] = [];
  for (const object of input.snapshot.objects) {
    const objectOwner = object.owner === null ? null : semantic(object.owner);
    if (object.owner !== null && objectOwner === null) return null;
    const acl = object.acl.map((entry) => {
      const principal = semantic(entry.principal);
      return principal === null ? null : { ...entry, principal };
    });
    if (acl.some((entry) => entry === null)) return null;
    let definition = object.definition;
    try { definition = canonical(replace(JSON.parse(object.definition))); } catch {
      if (definition.includes(owner) || definition.includes(executor)) return null;
    }
    const identity = object.identity.split(owner).join(FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC)
      .split(executor).join(FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC);
    objects.push(owned({ ...object, identity, definition,
      attributes: replace(object.attributes) as FarmOsMigrationCatalogObject["attributes"],
      owner: objectOwner, acl: acl as FarmOsMigrationCatalogObject["acl"] }));
  }
  const aclEvidence = input.acl_evidence.map((entry) => {
    const principal = semantic(entry.principal);
    const grantor = semantic(entry.grantor);
    return principal === null || grantor === null ? null : { ...entry, principal, grantor };
  });
  if (aclEvidence.some((entry) => entry === null)) return null;
  const aclKeys = aclEvidence.map((entry) => canonical(entry));
  if (new Set(aclKeys).size !== aclKeys.length) return null;
  const normalized = Object.freeze({
    source_snapshot_schema_version: input.snapshot.schema_version,
    migration_id: input.snapshot.migration_id,
    fingerprint_version: FARM_OS_DAY150_DUAL_PRINCIPAL_SEMANTIC_FINGERPRINT_VERSION,
    semantic_principal_normalization_policy:
      FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION,
    initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_ID,
    initial_catalog_digest:
      FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY.canonical_initial_state_digest,
    object_universe_revision: input.object_universe_revision,
    object_universe_digest: input.snapshot.object_universe_digest,
    catalog_query_revision: input.catalog_query_revision,
    catalog_query_sha256: input.snapshot.catalog_query_sha256,
    canonicalization_revision: "farmos.day150-semantic-principal-canonicalization.v3",
    objects: objects.sort((left, right) => Buffer.compare(
      Buffer.from(`${left.kind}:${left.identity}`), Buffer.from(`${right.kind}:${right.identity}`))),
    acl_grantor_evidence: (aclEvidence as Array<NonNullable<typeof aclEvidence[number]>>)
      .sort((left, right) => Buffer.compare(Buffer.from(canonical(left)), Buffer.from(canonical(right)))),
  });
  return hash(FARM_OS_DAY150_DUAL_PRINCIPAL_SEMANTIC_FINGERPRINT_VERSION, normalized);
}

declare const OBSERVED_SEMANTIC_EVIDENCE: unique symbol;
export type FarmOsDay150ObservedSemanticFingerprintCapability =
  Readonly<{ [OBSERVED_SEMANTIC_EVIDENCE]: true }>;
export type FarmOsDay150ObservedSemanticFingerprintEvidence = Readonly<{
  migration_id: string;
  fingerprint_version: typeof FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION;
  fingerprint: `sha256:${string}`;
  target_owner_authority_id: string;
  collector_authority_id: "farmos.production-readonly-catalog-collector.v1";
  target_identity_digest: `sha256:${string}`;
  observed_at: string;
  expires_at: string;
  principal_normalization_revision:
    typeof FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION;
}>;
const observedSemanticEvidence = new WeakMap<object,
  FarmOsDay150ObservedSemanticFingerprintEvidence>();

// Module-private trusted collector issuer. No generic row/caller entrypoint is exported.
function issueFarmOsDay150ObservedSemanticFingerprintEvidence(input: Readonly<{
  snapshot: FarmOsMigrationCatalogSnapshot;
  principal_binding: FarmOsDay150TrustedPrincipalBinding | unknown;
  acl_evidence: readonly FarmOsDay150SemanticAclEvidence[];
  target_authority_id: string;
  evaluated_at: string;
}>): FarmOsDay150ObservedSemanticFingerprintCapability | null {
  if (typeof input.principal_binding !== "object" || input.principal_binding === null) return null;
  const binding = trustedBindings.get(input.principal_binding);
  if (!binding || binding.source !== "REPOSITORY_APPROVED_TARGET_OWNER" ||
    binding.target_authority_id !== input.target_authority_id ||
    input.snapshot.target_identity_digest !== binding.target_identity_digest ||
    input.snapshot.observed_at === null ||
    input.snapshot.transaction_read_only !== true ||
    input.snapshot.collector_authority !== "farmos.production-readonly-catalog-collector.v1" ||
    new Date(Date.parse(input.evaluated_at)).toISOString() !== input.evaluated_at ||
    Date.parse(input.evaluated_at) < Date.parse(input.snapshot.observed_at) ||
    Date.parse(input.evaluated_at) - Date.parse(input.snapshot.observed_at) > 60_000) return null;
  const fingerprint = createFarmOsDay150SemanticPrincipalFingerprint({
    snapshot: input.snapshot, authenticated_raw_principal: binding.raw_principal,
    acl_evidence: input.acl_evidence,
    object_universe_revision: "farmos.day150-prefix-object-universe.v1",
    catalog_query_revision: "farmos.production-target-identity-query.v5",
  });
  if (!fingerprint) return null;
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150ObservedSemanticFingerprintCapability;
  observedSemanticEvidence.set(capability, Object.freeze({
    migration_id: input.snapshot.migration_id,
    fingerprint_version: FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION,
    fingerprint, target_owner_authority_id: input.target_authority_id,
    collector_authority_id: "farmos.production-readonly-catalog-collector.v1",
    target_identity_digest: input.snapshot.target_identity_digest,
    observed_at: input.snapshot.observed_at,
    expires_at: new Date(Date.parse(input.snapshot.observed_at) + 60_000).toISOString(),
    principal_normalization_revision:
      FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION,
  }));
  return capability;
}
void issueFarmOsDay150ObservedSemanticFingerprintEvidence;

export function readFarmOsDay150ObservedSemanticFingerprintEvidence(
  capability: FarmOsDay150ObservedSemanticFingerprintCapability | unknown,
): FarmOsDay150ObservedSemanticFingerprintEvidence | null {
  return typeof capability === "object" && capability !== null
    ? observedSemanticEvidence.get(capability) ?? null : null;
}

declare const TRUSTED_EVALUATION_CLOCK: unique symbol;
export type FarmOsDay150TrustedEvaluationClockCapability =
  Readonly<{ [TRUSTED_EVALUATION_CLOCK]: true }>;
const trustedEvaluationClocks = new WeakMap<object, Readonly<{
  observed_at: string; authority: "FARMOS_SERVER_OWNED_REFERENCE_RECONCILIATION_CLOCK";
}>>();
// Module-private server-owned clock issuer. No structural/self-hashed clock is accepted.
function issueFarmOsDay150TrustedEvaluationClock(observedAt: string):
  FarmOsDay150TrustedEvaluationClockCapability | null {
  if (new Date(Date.parse(observedAt)).toISOString() !== observedAt) return null;
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150TrustedEvaluationClockCapability;
  trustedEvaluationClocks.set(capability, Object.freeze({ observed_at: observedAt,
    authority: "FARMOS_SERVER_OWNED_REFERENCE_RECONCILIATION_CLOCK" }));
  return capability;
}
void issueFarmOsDay150TrustedEvaluationClock;
export function readFarmOsDay150TrustedEvaluationClock(
  capability: FarmOsDay150TrustedEvaluationClockCapability | unknown,
): string | null {
  return typeof capability === "object" && capability !== null
    ? trustedEvaluationClocks.get(capability)?.observed_at ?? null : null;
}

export const FARM_OS_DAY150_INITIAL_CATALOG_AUTHORITY_SAFETY = Object.freeze({
  previous_execution_authorization: "SUPERSEDED_UNCONSUMED",
  initial_catalog_authority: "SOURCE_QUALIFIED",
  reference_bootstrap: "IMPLEMENTED_NOT_EXECUTED",
  approved_five_prefix_expected_catalog: "NOT_ESTABLISHED",
  gate_17: "FAIL_WAITING_FOR_REVISED_REFERENCE_RUN_AND_EXACT_FIVE_HUMAN_APPROVAL",
  docker_operations: 0, postgres_operations: 0, sql_executions: 0,
  migration_operations: 0, production_operations: 0, canonical_runtime_operations: 0,
} as const);
