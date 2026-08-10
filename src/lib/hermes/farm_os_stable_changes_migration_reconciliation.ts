import { createHash, verify as verifySignature } from "node:crypto";

import {
  parseFarmOsCoreMigrationManifest,
  type FarmOsCoreMigrationManifest,
  type FarmOsStoredMigration,
} from "./farm_os_core_db_migration_manifest";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION,
} from "./farm_os_production_identity_query_v5_adoption";

export const FARM_OS_PRODUCTION_TARGET_IDENTITY_SCHEMA_VERSION =
  "farmos.production-target-identity.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION =
  "farmos.production-target-live-evidence.v1" as const;
export const FARM_OS_MIGRATION_CATALOG_SNAPSHOT_SCHEMA_VERSION =
  "farmos.migration-catalog-snapshot.v1" as const;
export const FARM_OS_MIGRATION_RECONCILIATION_PROVENANCE_SCHEMA_VERSION =
  "farmos.migration-reconciliation-provenance.v1" as const;

export const FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY = {
  schema_version: "farmos.production-identity-query-authority.v1",
  collector_id: "farmos.production-readonly-identity-collector",
  collector_version: "v1",
  collector_authority: "farmos.production-readonly-identity-collector.v1",
  query_authority_id: "farmos.production-target-identity-query.v1",
  purpose: "production_target_identity_collection",
  target_identity_contract_version: FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION,
  status: "active",
  expected_query_sha256:
    "sha256:dbfb404355fd7c09f6d712d5e143d4fa53f53b3bcfd040c063733ef134a14ce8",
} as const;

const productionIdentityQueryAuthorityV1 = Object.freeze({
  authority_id: FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.query_authority_id,
  version: "v1",
  purpose: FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.purpose,
  contract_version:
    FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.target_identity_contract_version,
  adoption_status: "ADOPTED",
  runtime_binding_status: "ACTIVE_RUNTIME_BINDING",
  historical_status: "LEGACY_UNMATERIALIZED_AUTHORITY",
  query_artifact_path: null,
  query_sha256:
    FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.expected_query_sha256,
  tracked_preimage_available: false,
  review_status: "HISTORICAL_AUTHORITY",
  approval_review_reference: "repository-authority/production-target-identity-query/v1",
  supersedes: null,
  superseded_by: "farmos.production-target-identity-query.v2",
} as const);

const productionIdentityQueryAuthorityV2 = Object.freeze({
  authority_id: "farmos.production-target-identity-query.v2",
  version: "v2",
  purpose: "production_target_identity_collection",
  contract_version: FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION,
  adoption_status: "ADOPTED",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  historical_status: "HISTORICAL_SUPERSEDED_REPOSITORY_AUTHORITY",
  query_artifact_path: "scripts/sql/farm_os_production_identity_readonly_v2.sql",
  query_sha256:
    "sha256:202053dadf34063c3ccfc69ede01197a217b968916936f33b7185090659faf95",
  tracked_preimage_available: true,
  review_status: "APPROVED",
  approval_review_reference: "review/production-identity-query-authority-v2/sol-go",
  supersedes: "farmos.production-target-identity-query.v1",
  superseded_by: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.authority_id,
} as const);

const productionIdentityQueryAuthorityV3Candidate = Object.freeze({
  authority_id: "farmos.production-target-identity-query.v3",
  version: "v3",
  purpose: "production_target_identity_collection",
  contract_version: FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION,
  adoption_status: "NOT_ADOPTED",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  historical_status: "HISTORICAL_SUPERSEDED_CANDIDATE",
  query_artifact_path: "scripts/sql/farm_os_production_identity_readonly_v3.sql",
  query_sha256:
    "sha256:59255333ad77cc58b043cdecd8df49f92fe184a2120b109663fefa0514ddce81",
  tracked_preimage_available: true,
  review_status: "CANDIDATE_FOR_APPROVAL",
  approval_review_reference: null,
  supersedes: "farmos.production-target-identity-query.v2",
  superseded_by: "farmos.production-target-identity-query.v4",
  execution_enabled: false,
  automatic_latest_selection: false,
} as const);

const productionIdentityQueryAuthorityV4Candidate = Object.freeze({
  authority_id: "farmos.production-target-identity-query.v4",
  version: "v4",
  purpose: "production_target_identity_collection",
  contract_version: FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION,
  adoption_status: "NOT_ADOPTED",
  runtime_binding_status: "NOT_RUNTIME_BOUND",
  historical_status: "HISTORICAL_SUPERSEDED_CANDIDATE",
  query_artifact_path: "scripts/sql/farm_os_production_identity_readonly_v4.sql",
  query_sha256:
    "sha256:e83987c840cc941cf5e6dcff93d46345464db0019ea5beb5143b0222316e05ca",
  tracked_preimage_available: true,
  review_status: "CANDIDATE_FOR_APPROVAL",
  approval_review_reference: null,
  supersedes: "farmos.production-target-identity-query.v3",
  superseded_by: "farmos.production-target-identity-query.v5",
  execution_enabled: false,
  automatic_latest_selection: false,
} as const);

const productionIdentityQueryAuthorityV5 = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.authority_id,
  version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.version,
  purpose: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.purpose,
  contract_version: FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION,
  adoption_status: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.adoption_status,
  runtime_binding_status:
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.runtime_binding_status,
  historical_status: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.repository_status,
  query_artifact_path: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.query_artifact_path,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.artifact_sha256,
  tracked_preimage_available: true,
  review_status: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.review_status,
  approval_review_reference: null,
  supersedes:
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.repository_authority_supersession
      .predecessor_authority_id,
  superseded_by: null,
  execution_enabled: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.execution_enabled,
  automatic_latest_selection:
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.automatic_latest_selection,
} as const);

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES = Object.freeze([
  productionIdentityQueryAuthorityV1,
  productionIdentityQueryAuthorityV2,
  productionIdentityQueryAuthorityV3Candidate,
  productionIdentityQueryAuthorityV4Candidate,
  productionIdentityQueryAuthorityV5,
] as const);

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_SUPERSESSION = Object.freeze({
  predecessor_authority_id:
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.repository_authority_supersession
      .predecessor_authority_id,
  successor_authority_id:
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ADOPTION.repository_authority_supersession
      .successor_authority_id,
  relationship: "REPOSITORY_AUTHORITY_SUPERSESSION",
  runtime_binding_effect: "NONE",
} as const);

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE_SUPERSESSION =
  Object.freeze({
    predecessor_authority_id: "farmos.production-target-identity-query.v2",
    successor_candidate_id: "farmos.production-target-identity-query.v3",
    relationship: "CANDIDATE_SUPERSESSION_PROPOSAL",
    runtime_binding_effect: "NONE",
    authority_transition_effect: "NONE",
  } as const);

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V4_CANDIDATE_SUPERSESSION =
  Object.freeze({
    predecessor_candidate_id: "farmos.production-target-identity-query.v3",
    successor_candidate_id: "farmos.production-target-identity-query.v4",
    relationship: "CANDIDATE_SUPERSESSION_PROPOSAL",
    runtime_binding_effect: "NONE",
    authority_transition_effect: "NONE",
  } as const);

export const FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE_SUPERSESSION =
  Object.freeze({
    predecessor_candidate_id: "farmos.production-target-identity-query.v4",
    successor_candidate_id: "farmos.production-target-identity-query.v5",
    relationship: "CANDIDATE_SUPERSESSION_PROPOSAL",
    runtime_binding_effect: "NONE",
    authority_transition_effect: "NONE",
  } as const);

export type FarmOsProductionIdentityQueryAuthority =
  typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES[number];

export function resolveFarmOsProductionIdentityQueryAuthority(
  authorityId: string,
): FarmOsProductionIdentityQueryAuthority | null {
  return FARM_OS_PRODUCTION_IDENTITY_QUERY_AUTHORITIES.find(
    (authority) => authority.authority_id === authorityId,
  ) ?? null;
}

type JsonRecord = Record<string, unknown>;
const IDENTIFIER = /^[a-z][a-z0-9._-]{0,127}$/u;
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:@/-]{0,255}$/u;
const MIGRATION_ID = /^\d{12}_[a-z0-9_]+$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function canonicalIso(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value;
}

function digest(value: unknown): value is `sha256:${string}` {
  return typeof value === "string" && DIGEST.test(value);
}

function boundedReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE.test(value);
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

export type FarmOsProductionTargetIdentity = {
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_SCHEMA_VERSION;
  environment_id: string;
  environment_class: "production" | "staging" | "development";
  database_logical_name: string;
  provider_class: "managed_postgres" | "self_hosted_postgres" | "other";
  provider_resource_fingerprint: `sha256:${string}`;
  cluster_system_identifier_digest: `sha256:${string}`;
  expected_postgres_major: number;
  installation_id: string;
  farm_scope: string;
  expected_operator_class: string;
  manifest_version: "farmos.core-db-provisioning-manifest.v1";
  created_at: string;
  approved_by_reference: string;
};

const TARGET_IDENTITY_KEYS = [
  "schema_version", "environment_id", "environment_class",
  "database_logical_name", "provider_class",
  "provider_resource_fingerprint", "cluster_system_identifier_digest",
  "expected_postgres_major", "installation_id", "farm_scope",
  "expected_operator_class", "manifest_version", "created_at",
  "approved_by_reference",
] as const;

export function parseFarmOsProductionTargetIdentity(
  value: unknown,
): FarmOsProductionTargetIdentity | null {
  if (!record(value) || !exact(value, TARGET_IDENTITY_KEYS)) return null;
  if (
    value.schema_version !== FARM_OS_PRODUCTION_TARGET_IDENTITY_SCHEMA_VERSION ||
    typeof value.environment_id !== "string" || !IDENTIFIER.test(value.environment_id) ||
    typeof value.environment_class !== "string" || !["production", "staging", "development"].includes(value.environment_class) ||
    typeof value.database_logical_name !== "string" || !IDENTIFIER.test(value.database_logical_name) ||
    typeof value.provider_class !== "string" || !["managed_postgres", "self_hosted_postgres", "other"].includes(value.provider_class) ||
    !digest(value.provider_resource_fingerprint) ||
    !digest(value.cluster_system_identifier_digest) ||
    !Number.isInteger(value.expected_postgres_major) ||
    Number(value.expected_postgres_major) < 14 ||
    Number(value.expected_postgres_major) > 99 ||
    typeof value.installation_id !== "string" || !IDENTIFIER.test(value.installation_id) ||
    typeof value.farm_scope !== "string" || !IDENTIFIER.test(value.farm_scope) ||
    typeof value.expected_operator_class !== "string" || !IDENTIFIER.test(value.expected_operator_class) ||
    value.manifest_version !== "farmos.core-db-provisioning-manifest.v1" ||
    !canonicalIso(value.created_at) ||
    !boundedReference(value.approved_by_reference)
  ) return null;
  return value as FarmOsProductionTargetIdentity;
}

export type FarmOsProductionTargetLiveEvidence = {
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION;
  environment_id: string | null;
  environment_class: "production" | "staging" | "development" | null;
  database_name: string | null;
  provider_resource_fingerprint: `sha256:${string}` | null;
  cluster_identifier_digest: `sha256:${string}` | null;
  server_version_num: number | null;
  installation_id: string | null;
  farm_scope: string | null;
  operator_class: string | null;
  manifest_version: "farmos.core-db-provisioning-manifest.v1" | null;
  schema_existence: { ai: boolean; core_schema: boolean } | null;
  transaction_read_only: true;
  collector_authority: "farmos.production-readonly-identity-collector.v1";
  query_authority_id: "farmos.production-target-identity-query.v1";
  collector_query_sha256: `sha256:${string}`;
  observed_at: string;
  secret_exposed: false;
};

const LIVE_EVIDENCE_KEYS = [
  "schema_version", "environment_id", "environment_class", "database_name",
  "provider_resource_fingerprint", "cluster_identifier_digest",
  "server_version_num", "installation_id", "farm_scope", "operator_class",
  "manifest_version", "schema_existence", "transaction_read_only",
  "collector_authority", "query_authority_id", "collector_query_sha256",
  "observed_at", "secret_exposed",
] as const;

export function parseFarmOsProductionTargetLiveEvidence(
  value: unknown,
): FarmOsProductionTargetLiveEvidence | null {
  if (!record(value) || !exact(value, LIVE_EVIDENCE_KEYS) ||
    value.schema_version !== FARM_OS_PRODUCTION_TARGET_LIVE_EVIDENCE_SCHEMA_VERSION ||
    value.transaction_read_only !== true || value.secret_exposed !== false ||
    value.collector_authority !== FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.collector_authority ||
    value.query_authority_id !== FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.query_authority_id ||
    value.collector_query_sha256 !== FARM_OS_STABLE_CHANGES_PRODUCTION_IDENTITY_QUERY_AUTHORITY.expected_query_sha256 ||
    !canonicalIso(value.observed_at)) return null;
  const optionalIdentifier = (item: unknown): boolean =>
    item === null || (typeof item === "string" && IDENTIFIER.test(item));
  if (!optionalIdentifier(value.environment_id) ||
    !(value.environment_class === null || ["production", "staging", "development"].includes(value.environment_class as string)) ||
    !optionalIdentifier(value.database_name) ||
    !optionalIdentifier(value.installation_id) ||
    !optionalIdentifier(value.farm_scope) ||
    !optionalIdentifier(value.operator_class) ||
    !(value.provider_resource_fingerprint === null || digest(value.provider_resource_fingerprint)) ||
    !(value.cluster_identifier_digest === null || digest(value.cluster_identifier_digest)) ||
    !(value.server_version_num === null ||
      (Number.isInteger(value.server_version_num) && Number(value.server_version_num) >= 140000)) ||
    !(value.manifest_version === null ||
      value.manifest_version === "farmos.core-db-provisioning-manifest.v1") ||
    !(value.schema_existence === null ||
      (record(value.schema_existence) && exact(value.schema_existence, ["ai", "core_schema"]) &&
        typeof value.schema_existence.ai === "boolean" &&
        typeof value.schema_existence.core_schema === "boolean"))) return null;
  return value as FarmOsProductionTargetLiveEvidence;
}

export type FarmOsTargetIdentityComparison =
  | { result: "MATCH"; mismatch_fields: readonly [] }
  | { result: "MISMATCH"; mismatch_fields: readonly string[] }
  | { result: "INSUFFICIENT_EVIDENCE"; missing_fields: readonly string[] }
  | { result: "INVALID_MANIFEST"; invalid_fields: readonly string[] };

export function compareFarmOsProductionTargetIdentity(input: {
  manifest: unknown;
  evidence: unknown;
  evaluated_at: string;
  maximum_age_ms: number;
}): FarmOsTargetIdentityComparison {
  const manifest = parseFarmOsProductionTargetIdentity(input.manifest);
  if (manifest === null) {
    return { result: "INVALID_MANIFEST", invalid_fields: ["target_identity"] };
  }
  if (manifest.environment_class !== "production") {
    return { result: "INVALID_MANIFEST", invalid_fields: ["environment_class"] };
  }
  const evidence = parseFarmOsProductionTargetLiveEvidence(input.evidence);
  if (evidence === null) {
    return { result: "INSUFFICIENT_EVIDENCE", missing_fields: ["valid_live_evidence"] };
  }
  if (!canonicalIso(input.evaluated_at) || !Number.isSafeInteger(input.maximum_age_ms) ||
    input.maximum_age_ms < 1 || Date.parse(input.evaluated_at) < Date.parse(evidence.observed_at) ||
    Date.parse(input.evaluated_at) - Date.parse(evidence.observed_at) > input.maximum_age_ms) {
    return { result: "INSUFFICIENT_EVIDENCE", missing_fields: ["fresh_live_evidence"] };
  }
  const required = {
    environment_id: evidence.environment_id,
    environment_class: evidence.environment_class,
    database_name: evidence.database_name,
    provider_resource_fingerprint: evidence.provider_resource_fingerprint,
    cluster_identifier_digest: evidence.cluster_identifier_digest,
    server_version_num: evidence.server_version_num,
    installation_id: evidence.installation_id,
    farm_scope: evidence.farm_scope,
    operator_class: evidence.operator_class,
    manifest_version: evidence.manifest_version,
  };
  const missing = Object.entries(required).filter(([, value]) => value === null)
    .map(([key]) => key);
  if (missing.length > 0) {
    return { result: "INSUFFICIENT_EVIDENCE", missing_fields: missing };
  }
  const mismatches: string[] = [];
  if (evidence.environment_id !== manifest.environment_id) mismatches.push("environment_id");
  if (evidence.environment_class !== manifest.environment_class) mismatches.push("environment_class");
  if (evidence.database_name !== manifest.database_logical_name) mismatches.push("database_name");
  if (evidence.provider_resource_fingerprint !== manifest.provider_resource_fingerprint) mismatches.push("provider_resource_fingerprint");
  if (evidence.cluster_identifier_digest !== manifest.cluster_system_identifier_digest) mismatches.push("cluster_identifier_digest");
  if (Math.floor(Number(evidence.server_version_num) / 10_000) !== manifest.expected_postgres_major) mismatches.push("postgres_major");
  if (evidence.installation_id !== manifest.installation_id) mismatches.push("installation_id");
  if (evidence.farm_scope !== manifest.farm_scope) mismatches.push("farm_scope");
  if (evidence.operator_class !== manifest.expected_operator_class) mismatches.push("operator_class");
  if (evidence.manifest_version !== manifest.manifest_version) mismatches.push("manifest_version");
  return mismatches.length === 0
    ? { result: "MATCH", mismatch_fields: [] }
    : { result: "MISMATCH", mismatch_fields: mismatches };
}

export function createFarmOsProductionTargetIdentityDigest(
  value: unknown,
): `sha256:${string}` | null {
  const parsed = parseFarmOsProductionTargetIdentity(value);
  return parsed === null
    ? null
    : `sha256:${createHash("sha256").update(canonicalJson(parsed)).digest("hex")}`;
}

export type FarmOsMigrationRegistryEntry = {
  migration_id: string;
  sequence: number;
  apply_sha256: `sha256:${string}`;
  verify_sha256: `sha256:${string}`;
  git_authority: string;
  apply_path: string;
  verify_path: string;
  expected_object_fingerprint_version: "farmos.pg-catalog-fingerprint.v1";
  historical_production_evidence_state: "unproven";
  role: "prefix" | "target";
};

const MIGRATION_METADATA = [
  ["202607260001_eligible_proposal_persistence", "sha256:41fbbfb931f03ad42c0c52159749fa8529c84321d6fcc643930c2b03c5c2ee4b", "sha256:b4f4bbad446a975210aa7e7ab18ef56e96a5bfe903c05819f695bdd3734acbe1", "5b6a1a635f3dd4835546ddd3d9e6ebe5b8211c3e", "prefix"],
  ["202607300001_daily_operational_projection_candidate_foundation", "sha256:350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf", "sha256:183a3fff47bce5d9cbbf9675c21fd57e398f87fc7628e87ec93127d78c0c9edf", "d92a3a9fbeed33346f99dc6ca5b72a9137dfc41a", "prefix"],
  ["202607310001_daily_operational_projection_candidate_activation", "sha256:e55b7b2c33d432b37d9733d599f8ed4dd7de99a82fb64c5f90158dae7addbbc2", "sha256:2b7108045ab34e5790b6d6381f9e6d2ca2399380a5dc05a9b80d7cf8af337b89", "6b53b1c5b35590518bf73526f89cc7e5cf4f7f90", "prefix"],
  ["202608030001_daily_operational_projection_command_ledger", "sha256:98504d23be1922d339acf0c7384ad1a5f9b6257e44a07a9073200b21bd79ef0a", "sha256:daddee61d384bb5f93662152bb52a760f2733ccc11dec026c5911ffd66524093", "a99ba6f063bb086f68c2aa2645d473b4db85fcd1", "prefix"],
  ["202608070001_stable_changes_consumer_persistence", "sha256:835b76ba23380d388c3532136564a5c83d04a2e9decf473726ef971ced8c6de0", "sha256:cc335aaf952fd4bbd57febe24eb19a6866d6e06a144428574f5bc0e9530474ee", "1437eb3f7aed210bb12d2f59fab9a39effe2a6c6", "target"],
] as const;

export function deriveFarmOsStableChangesMigrationRegistry(
  value: unknown,
): readonly FarmOsMigrationRegistryEntry[] | null {
  const manifest = parseFarmOsCoreMigrationManifest(value);
  if (manifest === null || manifest.migrations.length !== MIGRATION_METADATA.length) return null;
  const registry: FarmOsMigrationRegistryEntry[] = [];
  for (let index = 0; index < MIGRATION_METADATA.length; index += 1) {
    const metadata = MIGRATION_METADATA[index];
    const entry = manifest.migrations[index];
    if (!entry || entry.migration_id !== metadata[0] || entry.checksum !== metadata[1]) return null;
    registry.push({
      migration_id: entry.migration_id,
      sequence: entry.sequence,
      apply_sha256: entry.checksum as `sha256:${string}`,
      verify_sha256: metadata[2],
      git_authority: metadata[3],
      apply_path: entry.apply_script,
      verify_path: entry.verification_script,
      expected_object_fingerprint_version: "farmos.pg-catalog-fingerprint.v1",
      historical_production_evidence_state: "unproven",
      role: metadata[4],
    });
  }
  return registry;
}

export const FARM_OS_CATALOG_OBJECT_KINDS = [
  "schema", "table", "column", "constraint", "index", "function",
  "trigger", "role", "role_membership", "schema_acl", "table_acl",
  "function_acl", "rls",
] as const;
export type FarmOsCatalogObjectKind = typeof FARM_OS_CATALOG_OBJECT_KINDS[number];

export type FarmOsCatalogAcl = {
  principal: string;
  privilege: string;
  grant_option: boolean;
};

export type FarmOsMigrationCatalogObject = {
  kind: FarmOsCatalogObjectKind;
  identity: string;
  definition: string;
  attributes: Readonly<Record<string, string | number | boolean | null>>;
  owner: string | null;
  security_definer: boolean | null;
  proconfig: readonly string[] | null;
  body_sha256: `sha256:${string}` | null;
  role_flags: Readonly<Record<string, boolean>> | null;
  memberships: readonly string[];
  acl: readonly FarmOsCatalogAcl[];
  rls_enabled: boolean | null;
  rls_forced: boolean | null;
};

export type FarmOsMigrationCatalogSnapshot = {
  schema_version: typeof FARM_OS_MIGRATION_CATALOG_SNAPSHOT_SCHEMA_VERSION;
  migration_id: string;
  fingerprint_version: "farmos.pg-catalog-fingerprint.v1";
  target_identity_digest: `sha256:${string}` | null;
  observed_at: string | null;
  transaction_read_only: true | null;
  collector_authority: string | null;
  catalog_query_sha256: `sha256:${string}`;
  object_universe_digest: `sha256:${string}`;
  collection_complete: boolean;
  objects: readonly FarmOsMigrationCatalogObject[];
};

function normalizeCatalogObject(object: FarmOsMigrationCatalogObject): FarmOsMigrationCatalogObject {
  return {
    ...object,
    attributes: Object.fromEntries(Object.entries(object.attributes).sort(([left], [right]) => codePointCompare(left, right))),
    proconfig: object.proconfig === null ? null : [...object.proconfig].sort(codePointCompare),
    memberships: [...object.memberships].sort(codePointCompare),
    acl: [...object.acl].sort((left, right) =>
      codePointCompare(`${left.principal}\u0000${left.privilege}\u0000${left.grant_option}`,
        `${right.principal}\u0000${right.privilege}\u0000${right.grant_option}`,
      )),
    role_flags: object.role_flags === null
      ? null
      : Object.fromEntries(Object.entries(object.role_flags).sort(([left], [right]) => codePointCompare(left, right))),
  };
}

function validCatalogObject(value: unknown): value is FarmOsMigrationCatalogObject {
  if (!record(value) || !exact(value, [
    "kind", "identity", "definition", "attributes", "owner", "security_definer",
    "proconfig", "body_sha256", "role_flags", "memberships", "acl",
    "rls_enabled", "rls_forced",
  ]) || !FARM_OS_CATALOG_OBJECT_KINDS.includes(value.kind as FarmOsCatalogObjectKind) ||
    typeof value.identity !== "string" || value.identity.length < 1 || value.identity.length > 500 ||
    typeof value.definition !== "string" || value.definition.length > 100_000 ||
    !record(value.attributes) || !Object.values(value.attributes).every((attribute) =>
      attribute === null || typeof attribute === "string" ||
      (typeof attribute === "number" && Number.isFinite(attribute)) ||
      typeof attribute === "boolean") ||
    !(value.owner === null || boundedReference(value.owner)) ||
    !(value.security_definer === null || typeof value.security_definer === "boolean") ||
    !(value.proconfig === null ||
      (Array.isArray(value.proconfig) && value.proconfig.every((item) => typeof item === "string" && item.length <= 500))) ||
    !(value.body_sha256 === null || digest(value.body_sha256)) ||
    !(value.role_flags === null ||
      (record(value.role_flags) && Object.values(value.role_flags).every((item) => typeof item === "boolean"))) ||
    !Array.isArray(value.memberships) || !value.memberships.every(boundedReference) ||
    !Array.isArray(value.acl) || !value.acl.every((acl) =>
      record(acl) && exact(acl, ["principal", "privilege", "grant_option"]) &&
      boundedReference(acl.principal) && boundedReference(acl.privilege) &&
      typeof acl.grant_option === "boolean") ||
    !(value.rls_enabled === null || typeof value.rls_enabled === "boolean") ||
    !(value.rls_forced === null || typeof value.rls_forced === "boolean")) return false;
  if (value.kind === "column" && (!exact(value.attributes, ["data_type", "not_null", "default_expression"]) ||
    typeof value.attributes.data_type !== "string" || value.attributes.data_type.length === 0 ||
    typeof value.attributes.not_null !== "boolean" ||
    !(value.attributes.default_expression === null || typeof value.attributes.default_expression === "string"))) return false;
  if (value.kind === "function" && (value.owner === null || typeof value.security_definer !== "boolean" ||
    value.proconfig === null || !digest(value.body_sha256))) return false;
  if (value.kind === "table" &&
    (typeof value.rls_enabled !== "boolean" || typeof value.rls_forced !== "boolean")) return false;
  if (value.kind === "role" && value.role_flags === null) return false;
  if (["schema_acl", "table_acl", "function_acl"].includes(value.kind as string) && value.acl.length === 0) return false;
  return true;
}

export function parseFarmOsMigrationCatalogSnapshot(
  value: unknown,
): FarmOsMigrationCatalogSnapshot | null {
  if (!record(value) || !exact(value, [
    "schema_version", "migration_id", "fingerprint_version", "target_identity_digest",
    "observed_at", "transaction_read_only", "collector_authority", "catalog_query_sha256",
    "object_universe_digest", "collection_complete", "objects",
  ]) ||
    value.schema_version !== FARM_OS_MIGRATION_CATALOG_SNAPSHOT_SCHEMA_VERSION ||
    typeof value.migration_id !== "string" || !MIGRATION_ID.test(value.migration_id) ||
    value.fingerprint_version !== "farmos.pg-catalog-fingerprint.v1" ||
    !(value.target_identity_digest === null || digest(value.target_identity_digest)) ||
    !(value.observed_at === null || canonicalIso(value.observed_at)) ||
    !(value.transaction_read_only === null || value.transaction_read_only === true) ||
    !(value.collector_authority === null || boundedReference(value.collector_authority)) ||
    !digest(value.catalog_query_sha256) || !digest(value.object_universe_digest) ||
    typeof value.collection_complete !== "boolean" ||
    !Array.isArray(value.objects) || !value.objects.every(validCatalogObject)) return null;
  const identities = value.objects.map((object) => `${object.kind}:${object.identity}`);
  if (new Set(identities).size !== identities.length) return null;
  return value as FarmOsMigrationCatalogSnapshot;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (record(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function createFarmOsMigrationObjectFingerprint(
  value: unknown,
): `sha256:${string}` | null {
  const snapshot = parseFarmOsMigrationCatalogSnapshot(value);
  if (snapshot === null) return null;
  const normalized = {
    schema_version: snapshot.schema_version,
    migration_id: snapshot.migration_id,
    fingerprint_version: snapshot.fingerprint_version,
    catalog_query_sha256: snapshot.catalog_query_sha256,
    object_universe_digest: snapshot.object_universe_digest,
    objects: snapshot.objects.map(normalizeCatalogObject).sort((left, right) =>
      codePointCompare(`${left.kind}:${left.identity}`, `${right.kind}:${right.identity}`)),
  };
  return `sha256:${createHash("sha256").update(canonicalJson(normalized)).digest("hex")}`;
}

export type FarmOsObjectValidationResult = {
  result: "EXACT" | "ABSENT" | "PARTIAL" | "CONFLICT" | "UNKNOWN";
  expected_fingerprint: `sha256:${string}` | null;
  observed_fingerprint: `sha256:${string}` | null;
  history_dependency_used: false;
  read_only_catalog_required: true;
  expected_authority_validated: boolean;
  observed_evidence_validated: boolean;
};

export type FarmOsExpectedCatalogFingerprintAuthority = {
  schema_version: "farmos.expected-catalog-fingerprint-authority.v1";
  migration_id: string;
  fingerprint_version: "farmos.pg-catalog-fingerprint.v1";
  expected_fingerprint: `sha256:${string}`;
  artifact_sha256: `sha256:${string}`;
  catalog_query_sha256: `sha256:${string}`;
  object_universe_digest: `sha256:${string}`;
  expected_object_count: number;
  git_authority: string;
  approval_reference: string;
  approved_at: string;
};

function validExpectedCatalogAuthority(value: unknown): value is FarmOsExpectedCatalogFingerprintAuthority {
  return record(value) && exact(value, [
    "schema_version", "migration_id", "fingerprint_version",
    "expected_fingerprint", "artifact_sha256", "catalog_query_sha256",
    "object_universe_digest", "expected_object_count", "git_authority",
    "approval_reference", "approved_at",
  ]) && value.schema_version === "farmos.expected-catalog-fingerprint-authority.v1" &&
    typeof value.migration_id === "string" && MIGRATION_ID.test(value.migration_id) &&
    value.fingerprint_version === "farmos.pg-catalog-fingerprint.v1" &&
    digest(value.expected_fingerprint) && digest(value.artifact_sha256) &&
    digest(value.catalog_query_sha256) && digest(value.object_universe_digest) &&
    Number.isSafeInteger(value.expected_object_count) && Number(value.expected_object_count) > 0 &&
    typeof value.git_authority === "string" && /^[a-f0-9]{40}$/u.test(value.git_authority) &&
    boundedReference(value.approval_reference) && canonicalIso(value.approved_at);
}

export function validateFarmOsMigrationObjectsHistoryIndependently(input: {
  expected: unknown;
  observed: unknown | null;
  registry_entry: FarmOsMigrationRegistryEntry;
  expected_authority: unknown;
  target_identity_digest: `sha256:${string}`;
  evaluated_at: string;
  maximum_age_ms: number;
}): FarmOsObjectValidationResult {
  const expected = parseFarmOsMigrationCatalogSnapshot(input.expected);
  const expectedFingerprint = createFarmOsMigrationObjectFingerprint(expected);
  const authority = validExpectedCatalogAuthority(input.expected_authority)
    ? input.expected_authority
    : null;
  const authorityValid = expected !== null && expectedFingerprint !== null && authority !== null &&
    authority.migration_id === expected.migration_id &&
    authority.migration_id === input.registry_entry.migration_id &&
    authority.fingerprint_version === input.registry_entry.expected_object_fingerprint_version &&
    authority.expected_fingerprint === expectedFingerprint &&
    authority.git_authority === input.registry_entry.git_authority &&
    authority.artifact_sha256 === input.registry_entry.apply_sha256 &&
    authority.catalog_query_sha256 === expected.catalog_query_sha256 &&
    authority.object_universe_digest === expected.object_universe_digest &&
    authority.expected_object_count === expected.objects.length && expected.collection_complete &&
    expected.target_identity_digest === null && expected.observed_at === null &&
    expected.transaction_read_only === null && expected.collector_authority === null;
  if (expected === null || expected.objects.length === 0 || expectedFingerprint === null || !authorityValid || input.observed === null) {
    return { result: "UNKNOWN", expected_fingerprint: expectedFingerprint, observed_fingerprint: null, history_dependency_used: false, read_only_catalog_required: true, expected_authority_validated: authorityValid, observed_evidence_validated: false };
  }
  const observed = parseFarmOsMigrationCatalogSnapshot(input.observed);
  const observedFingerprint = createFarmOsMigrationObjectFingerprint(observed);
  const observedValid = observed !== null && observedFingerprint !== null &&
    observed.migration_id === expected.migration_id && observed.target_identity_digest === input.target_identity_digest &&
    observed.transaction_read_only === true && observed.collection_complete &&
    observed.collector_authority === "farmos.production-readonly-catalog-collector.v1" && observed.observed_at !== null &&
    observed.catalog_query_sha256 === authority!.catalog_query_sha256 &&
    observed.object_universe_digest === authority!.object_universe_digest &&
    canonicalIso(input.evaluated_at) && Number.isSafeInteger(input.maximum_age_ms) && input.maximum_age_ms > 0 &&
    Date.parse(input.evaluated_at) >= Date.parse(observed.observed_at) &&
    Date.parse(input.evaluated_at) - Date.parse(observed.observed_at) <= input.maximum_age_ms;
  if (!observedValid) {
    return { result: "UNKNOWN", expected_fingerprint: expectedFingerprint, observed_fingerprint: observedFingerprint, history_dependency_used: false, read_only_catalog_required: true, expected_authority_validated: true, observed_evidence_validated: false };
  }
  if (observed.objects.length === 0) {
    return { result: "ABSENT", expected_fingerprint: expectedFingerprint, observed_fingerprint: observedFingerprint, history_dependency_used: false, read_only_catalog_required: true, expected_authority_validated: true, observed_evidence_validated: true };
  }
  if (observedFingerprint === expectedFingerprint) {
    return { result: "EXACT", expected_fingerprint: expectedFingerprint, observed_fingerprint: observedFingerprint, history_dependency_used: false, read_only_catalog_required: true, expected_authority_validated: true, observed_evidence_validated: true };
  }
  const expectedByIdentity = new Map(expected.objects.map((object) => [`${object.kind}:${object.identity}`, canonicalJson(normalizeCatalogObject(object))]));
  const observedEntries = observed.objects.map((object) => [`${object.kind}:${object.identity}`, canonicalJson(normalizeCatalogObject(object))] as const);
  const subset = observedEntries.every(([identity, definition]) => expectedByIdentity.get(identity) === definition);
  return { result: subset ? "PARTIAL" : "CONFLICT", expected_fingerprint: expectedFingerprint, observed_fingerprint: observedFingerprint, history_dependency_used: false, read_only_catalog_required: true, expected_authority_validated: true, observed_evidence_validated: true };
}

export type FarmOsReconciliationClassification =
  | "NOT_APPLIED" | "VERIFIED_EXISTING_STATE" | "APPLIED_HISTORY_MISSING"
  | "APPLIED_AND_RECORDED" | "INCONSISTENT" | "UNKNOWN";

export const FARM_OS_MIGRATION_COMMIT_RECEIPT_AUTHORITY_POLICY = {
  schema_version: "farmos.migration-commit-receipt-authority-policy.v1",
  purpose: "migration_apply_commit_receipt",
  trusted_issuers: [{
    issuer_authority: "farmos.production-migration-executor-receipt-issuer.v1",
    issuer_id: "farmos.production-migration-executor-receipt-issuer",
    issuer_version: "v1",
    purpose: "migration_apply_commit_receipt",
    status: "active",
    signature_algorithm: "Ed25519",
    public_key_pem: "-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEASA5ODIaolAg2QR381q95gX4D9jKCjoE5v0BYfWxTC1E=\n-----END PUBLIC KEY-----\n",
  }],
  maximum_commit_observation_delay_ms: 60_000,
  maximum_catalog_observation_delay_ms: 60_000,
  maximum_evidence_age_ms: 60_000,
} as const;

export type FarmOsMigrationCommitReceipt = {
  receipt_schema_version: "farmos.migration-commit-receipt.v1";
  receipt_id: string;
  issuer_authority: "farmos.production-migration-executor-receipt-issuer.v1";
  target_identity_digest: `sha256:${string}`;
  migration_id: string;
  artifact_sha256: `sha256:${string}`;
  commit_outcome: "committed";
  committed_at: string;
  observed_at: string;
  executor_run_id: string;
  transaction_identity_digest: `sha256:${string}`;
  issuer_signature: string;
  receipt_digest: `sha256:${string}`;
};

export function createFarmOsMigrationCommitReceiptDigest(
  payload: Omit<FarmOsMigrationCommitReceipt, "receipt_digest">,
): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(payload)).digest("hex")}`;
}

export function validateFarmOsMigrationCommitReceipt(input: {
  receipt: unknown | null;
  target_identity_digest: `sha256:${string}`;
  migration_id: string;
  artifact_sha256: `sha256:${string}`;
  catalog_observed_at: string;
  evaluated_at: string;
}): { result: "VALID" | "ABSENT" | "INVALID"; receipt: FarmOsMigrationCommitReceipt | null } {
  if (input.receipt === null) return { result: "ABSENT", receipt: null };
  const value = input.receipt;
  if (!record(value) || !exact(value, [
    "receipt_schema_version", "receipt_id", "issuer_authority", "target_identity_digest",
    "migration_id", "artifact_sha256", "commit_outcome", "committed_at", "observed_at",
    "executor_run_id", "transaction_identity_digest", "issuer_signature", "receipt_digest",
  ]) || value.receipt_schema_version !== "farmos.migration-commit-receipt.v1" ||
    !boundedReference(value.receipt_id) || !boundedReference(value.issuer_authority) ||
    !digest(value.target_identity_digest) || typeof value.migration_id !== "string" || !MIGRATION_ID.test(value.migration_id) ||
    !digest(value.artifact_sha256) || value.commit_outcome !== "committed" ||
    !canonicalIso(value.committed_at) || !canonicalIso(value.observed_at) ||
    !boundedReference(value.executor_run_id) || !digest(value.transaction_identity_digest) ||
    typeof value.issuer_signature !== "string" || !/^[A-Za-z0-9+/]{86}==$/u.test(value.issuer_signature) ||
    !digest(value.receipt_digest) || !canonicalIso(input.catalog_observed_at) || !canonicalIso(input.evaluated_at)) {
    return { result: "INVALID", receipt: null };
  }
  const issuer = FARM_OS_MIGRATION_COMMIT_RECEIPT_AUTHORITY_POLICY.trusted_issuers.find((candidate) =>
    candidate.issuer_authority === value.issuer_authority &&
    candidate.purpose === FARM_OS_MIGRATION_COMMIT_RECEIPT_AUTHORITY_POLICY.purpose &&
    candidate.status === "active");
  const payload = Object.fromEntries(Object.entries(value).filter(([key]) => key !== "receipt_digest")) as
    Omit<FarmOsMigrationCommitReceipt, "receipt_digest">;
  const signedPayload = Object.fromEntries(Object.entries(value).filter(([key]) =>
    key !== "receipt_digest" && key !== "issuer_signature"));
  const committedAt = Date.parse(value.committed_at);
  const observedAt = Date.parse(value.observed_at);
  const catalogObservedAt = Date.parse(input.catalog_observed_at);
  const evaluatedAt = Date.parse(input.evaluated_at);
  const signatureValid = issuer !== undefined && verifySignature(
    null,
    Buffer.from(canonicalJson(signedPayload)),
    issuer.public_key_pem,
    Buffer.from(value.issuer_signature, "base64"),
  );
  const valid = issuer !== undefined && signatureValid && value.target_identity_digest === input.target_identity_digest &&
    value.migration_id === input.migration_id && value.artifact_sha256 === input.artifact_sha256 &&
    value.receipt_digest === createFarmOsMigrationCommitReceiptDigest(payload) &&
    committedAt <= observedAt && observedAt <= catalogObservedAt && catalogObservedAt <= evaluatedAt &&
    observedAt - committedAt <= FARM_OS_MIGRATION_COMMIT_RECEIPT_AUTHORITY_POLICY.maximum_commit_observation_delay_ms &&
    catalogObservedAt - observedAt <= FARM_OS_MIGRATION_COMMIT_RECEIPT_AUTHORITY_POLICY.maximum_catalog_observation_delay_ms &&
    evaluatedAt - catalogObservedAt <= FARM_OS_MIGRATION_COMMIT_RECEIPT_AUTHORITY_POLICY.maximum_evidence_age_ms;
  return valid
    ? { result: "VALID", receipt: value as FarmOsMigrationCommitReceipt }
    : { result: "INVALID", receipt: null };
}

export function classifyFarmOsMigrationReconciliation(input: {
  object_result: FarmOsObjectValidationResult["result"];
  history: FarmOsStoredMigration | null;
  expected_history: FarmOsStoredMigration;
  apply_commit_receipt: unknown | null;
  target_identity_digest: `sha256:${string}`;
  object_observed_at: string;
  evaluated_at: string;
}): { classification: FarmOsReconciliationClassification; reason: string } {
  if (input.object_result === "UNKNOWN") return { classification: "UNKNOWN", reason: "EVIDENCE_INSUFFICIENT" };
  const historyExact = input.history !== null &&
    input.history.migration_id === input.expected_history.migration_id &&
    input.history.sequence === input.expected_history.sequence &&
    input.history.checksum === input.expected_history.checksum;
  if (input.history !== null && !historyExact) return { classification: "INCONSISTENT", reason: "HISTORY_CONFLICT" };
  const receipt = validateFarmOsMigrationCommitReceipt({
    receipt: input.apply_commit_receipt,
    target_identity_digest: input.target_identity_digest,
    migration_id: input.expected_history.migration_id,
    artifact_sha256: input.expected_history.checksum as `sha256:${string}`,
    catalog_observed_at: input.object_observed_at,
    evaluated_at: input.evaluated_at,
  });
  if (input.object_result === "ABSENT") {
    if (receipt.result === "VALID") {
      return { classification: "INCONSISTENT", reason: "COMMIT_RECEIPT_OBJECTS_ABSENT" };
    }
    return input.history === null
      ? { classification: "NOT_APPLIED", reason: "OBJECT_AND_HISTORY_ABSENT" }
      : { classification: "INCONSISTENT", reason: "HISTORY_ONLY" };
  }
  if (input.object_result === "PARTIAL" || input.object_result === "CONFLICT") {
    return { classification: "INCONSISTENT", reason: input.object_result === "PARTIAL" ? "PARTIAL_OBJECT_STATE" : "OBJECT_CONFLICT" };
  }
  if (historyExact) return { classification: "APPLIED_AND_RECORDED", reason: "OBJECT_AND_HISTORY_EXACT" };
  return receipt.result === "VALID"
    ? { classification: "APPLIED_HISTORY_MISSING", reason: "COMMIT_PROVEN_HISTORY_ABSENT" }
    : { classification: "VERIFIED_EXISTING_STATE", reason: "HISTORICAL_APPLY_UNPROVEN" };
}

export type FarmOsMigrationReconciliationProvenance = {
  schema_version: typeof FARM_OS_MIGRATION_RECONCILIATION_PROVENANCE_SCHEMA_VERSION;
  reconciliation_id: string;
  migration_id: string;
  target_identity_digest: `sha256:${string}`;
  artifact_sha256: `sha256:${string}`;
  object_fingerprint: `sha256:${string}`;
  classification: FarmOsReconciliationClassification;
  evidence_sources: readonly string[];
  observed_at: string;
  historical_apply_provenance: "known" | "unknown";
  historical_applied_at: string | null;
  historical_applied_by: string | null;
  historical_commit_receipt: FarmOsMigrationCommitReceipt | null;
  adopted_at: string;
  adopted_by_reference: string;
  approval_reference: string;
  approved_at: string;
};

export function parseFarmOsMigrationReconciliationProvenance(
  value: unknown,
): FarmOsMigrationReconciliationProvenance | null {
  if (!record(value) || !exact(value, [
    "schema_version", "reconciliation_id", "migration_id", "target_identity_digest",
    "artifact_sha256", "object_fingerprint", "classification", "evidence_sources",
    "observed_at", "historical_apply_provenance", "historical_applied_at",
    "historical_applied_by", "historical_commit_receipt", "adopted_at", "adopted_by_reference",
    "approval_reference", "approved_at",
  ]) || value.schema_version !== FARM_OS_MIGRATION_RECONCILIATION_PROVENANCE_SCHEMA_VERSION ||
    !boundedReference(value.reconciliation_id) || typeof value.migration_id !== "string" || !MIGRATION_ID.test(value.migration_id) ||
    !digest(value.target_identity_digest) || !digest(value.artifact_sha256) || !digest(value.object_fingerprint) ||
    typeof value.classification !== "string" || !["NOT_APPLIED", "VERIFIED_EXISTING_STATE", "APPLIED_HISTORY_MISSING", "APPLIED_AND_RECORDED", "INCONSISTENT", "UNKNOWN"].includes(value.classification) ||
    !Array.isArray(value.evidence_sources) || value.evidence_sources.length === 0 || !value.evidence_sources.every(boundedReference) ||
    !canonicalIso(value.observed_at) || typeof value.historical_apply_provenance !== "string" || !["known", "unknown"].includes(value.historical_apply_provenance) ||
    !(value.historical_applied_at === null || canonicalIso(value.historical_applied_at)) ||
    !(value.historical_applied_by === null || boundedReference(value.historical_applied_by)) ||
    !(value.historical_commit_receipt === null || record(value.historical_commit_receipt)) ||
    !canonicalIso(value.adopted_at) || !boundedReference(value.adopted_by_reference) ||
    !boundedReference(value.approval_reference) || !canonicalIso(value.approved_at)) return null;
  if (value.historical_apply_provenance === "unknown" &&
    (value.historical_applied_at !== null || value.historical_applied_by !== null ||
      value.historical_commit_receipt !== null || value.classification !== "VERIFIED_EXISTING_STATE")) return null;
  if (value.historical_apply_provenance === "known" &&
    (value.historical_applied_at === null || value.historical_applied_by === null ||
      value.historical_commit_receipt === null ||
      !["APPLIED_HISTORY_MISSING", "APPLIED_AND_RECORDED"].includes(value.classification as string))) return null;
  if (Date.parse(value.observed_at as string) > Date.parse(value.approved_at as string) ||
    Date.parse(value.approved_at as string) > Date.parse(value.adopted_at as string) ||
    (value.historical_applied_at !== null &&
      Date.parse(value.historical_applied_at as string) > Date.parse(value.observed_at as string))) return null;
  if (value.historical_apply_provenance === "known") {
    const receipt = validateFarmOsMigrationCommitReceipt({
      receipt: value.historical_commit_receipt,
      target_identity_digest: value.target_identity_digest as `sha256:${string}`,
      migration_id: value.migration_id as string,
      artifact_sha256: value.artifact_sha256 as `sha256:${string}`,
      catalog_observed_at: value.observed_at as string,
      evaluated_at: value.adopted_at as string,
    });
    if (receipt.result !== "VALID" || receipt.receipt?.committed_at !== value.historical_applied_at ||
      receipt.receipt.executor_run_id !== value.historical_applied_by) return null;
  }
  return value as FarmOsMigrationReconciliationProvenance;
}

export const FARM_OS_HISTORY_BRIDGE_POLICY = {
  model: "migration_history_plus_separate_reconciliation_provenance_ledger",
  migration_history_semantics: "known_apply_only",
  verified_existing_state_requires_provenance: true,
  fabricated_applied_at_forbidden: true,
  fabricated_applied_by_forbidden: true,
  update_allowed: false,
  delete_allowed: false,
  blind_repair_allowed: false,
} as const;

export function planFarmOsMigrationHistoryCas(input: {
  existing: FarmOsStoredMigration | null;
  proposed: FarmOsStoredMigration;
}): { result: "INSERT_REQUIRED" | "IDEMPOTENT" | "INCONSISTENT"; update_allowed: false; delete_allowed: false } {
  if (input.existing === null) return { result: "INSERT_REQUIRED", update_allowed: false, delete_allowed: false };
  return input.existing.migration_id === input.proposed.migration_id &&
      input.existing.sequence === input.proposed.sequence &&
      input.existing.checksum === input.proposed.checksum
    ? { result: "IDEMPOTENT", update_allowed: false, delete_allowed: false }
    : { result: "INCONSISTENT", update_allowed: false, delete_allowed: false };
}

export const FARM_OS_MIGRATION_TRANSACTION_OWNERSHIP = {
  apply: "artifact_owned_begin_commit",
  verify: "artifact_owned_read_only_begin_rollback",
  outer_single_transaction_allowed: false,
  psql_single_transaction_allowed: false,
  strip_artifact_boundaries_allowed: false,
  history_atomic_with_current_apply_artifact: false,
  automatic_retry: 0,
} as const;

export const FARM_OS_MIGRATION_TIMEOUT_POLICY = {
  schema_version: "farmos.migration-timeout-policy.v1",
  statement_timeout_ms: 30_000,
  lock_timeout_ms: 2_000,
  client_watchdog_ms: 60_000,
  automatic_retry: 0,
  approval_time_reconfirmation_required: true,
} as const;

export const FARM_OS_MIGRATION_AUTHORITY_MODEL = {
  broad_superuser_allowed: false,
  capabilities: ["ROLE_ADMIN", "SCHEMA_OWNER_APPLY", "HISTORY_WRITER", "VERIFY_READER", "POSTCONDITION_READER"],
  steps: [
    { step: "ROLE_ADMIN", purpose: "prepare exact NOLOGIN runtime role", human_approval_required: true },
    { step: "SCHEMA_OWNER_APPLY", purpose: "bounded approved SET ROLE to schema owner", human_approval_required: true },
  ],
  expected_runtime_role_flags: {
    rolcanlogin: false,
    rolsuper: false,
    rolcreatedb: false,
    rolcreaterole: false,
    rolinherit: false,
    rolreplication: false,
    rolbypassrls: false,
  },
  role_create_performed_offline: false,
  membership_change_performed_offline: false,
  set_role_performed_offline: false,
} as const;

export type FarmOsAclAllowlistEntry = {
  principal: string;
  privilege: "CREATE" | "USAGE";
  grant_option: boolean;
  authority_source: string;
  status: "expected" | "legacy" | "unknown" | "forbidden";
};
export type FarmOsAclObservedGrant = {
  principal: string | null;
  privilege: "CREATE" | "USAGE";
  grant_option: boolean;
};

export const FARM_OS_AI_SCHEMA_ACL_ALLOWLIST_CANDIDATES: readonly FarmOsAclAllowlistEntry[] = [
  { principal: "farmos_app_local", privilege: "USAGE", grant_option: false, authority_source: "scripts/sql/day3_roles_and_proposal_inbox.sql", status: "legacy" },
  { principal: "farmos_ai_proposal_local", privilege: "USAGE", grant_option: false, authority_source: "scripts/sql/day3_roles_and_proposal_inbox.sql", status: "legacy" },
  { principal: "farmos_core_proposal_writer", privilege: "USAGE", grant_option: false, authority_source: "db/migrations/202607260001_eligible_proposal_persistence.sql", status: "expected" },
  { principal: "farmos_core_projection_reader", privilege: "USAGE", grant_option: false, authority_source: "db/migrations/202607260001_eligible_proposal_persistence.sql", status: "expected" },
  { principal: "farmos_core_projection_writer", privilege: "USAGE", grant_option: false, authority_source: "db/migrations/202607260001_eligible_proposal_persistence.sql", status: "expected" },
  { principal: "farmos_core_projection_command_transaction", privilege: "USAGE", grant_option: false, authority_source: "db/migrations/202608030001_daily_operational_projection_command_ledger.sql", status: "expected" },
  { principal: "public", privilege: "CREATE", grant_option: false, authority_source: "stable-changes-production-policy", status: "forbidden" },
] as const;

export const FARM_OS_AI_SCHEMA_ACL_POLICY = {
  schema_version: "farmos.ai-schema-acl-policy.v1",
  authority_reference: "policy/stable-changes-ai-schema-acl/v1",
  allowlist: FARM_OS_AI_SCHEMA_ACL_ALLOWLIST_CANDIDATES,
  automatic_revoke: false,
} as const;
export const FARM_OS_AI_SCHEMA_ACL_QUERY_SHA256 =
  `sha256:${createHash("sha256").update("farmos.ai-schema-acl-query.v1:all-ai-schema-grantees").digest("hex")}` as const;
export const FARM_OS_AI_SCHEMA_ACL_UNIVERSE_SHA256 =
  `sha256:${createHash("sha256").update("farmos.ai-schema-acl-universe.v1:all-principals-all-grants").digest("hex")}` as const;

export type FarmOsAiSchemaAclEvidence = {
  schema_version: "farmos.ai-schema-acl-evidence.v1";
  target_identity_digest: `sha256:${string}`;
  policy_digest: `sha256:${string}`;
  grants: readonly FarmOsAclObservedGrant[];
  collection_complete: true;
  catalog_query_sha256: `sha256:${string}`;
  grant_universe_sha256: `sha256:${string}`;
  transaction_read_only: true;
  collector_authority: "farmos.production-readonly-acl-collector.v1";
  observed_at: string;
};

export function createFarmOsAiSchemaAclPolicyDigest(): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(FARM_OS_AI_SCHEMA_ACL_POLICY)).digest("hex")}`;
}

export function evaluateFarmOsAiSchemaAcl(input: {
  target_manifest: unknown;
  evidence: unknown;
  evaluated_at: string;
  maximum_age_ms: number;
}): { result: "MATCH" | "UNKNOWN_GRANT" | "FORBIDDEN_GRANT" | "MISSING_REQUIRED_GRANT"; details: readonly string[]; automatic_revoke: false } {
  const targetDigest = createFarmOsProductionTargetIdentityDigest(input.target_manifest);
  if (targetDigest === null) return { result: "UNKNOWN_GRANT", details: ["invalid-target-authority"], automatic_revoke: false };
  const evidence = input.evidence;
  if (!record(evidence) || !exact(evidence, [
    "schema_version", "target_identity_digest", "policy_digest", "grants", "collection_complete",
    "catalog_query_sha256", "grant_universe_sha256",
    "transaction_read_only", "collector_authority", "observed_at",
  ]) || evidence.schema_version !== "farmos.ai-schema-acl-evidence.v1" ||
    evidence.target_identity_digest !== targetDigest || evidence.policy_digest !== createFarmOsAiSchemaAclPolicyDigest() ||
    evidence.collection_complete !== true || evidence.catalog_query_sha256 !== FARM_OS_AI_SCHEMA_ACL_QUERY_SHA256 ||
    evidence.grant_universe_sha256 !== FARM_OS_AI_SCHEMA_ACL_UNIVERSE_SHA256 ||
    evidence.transaction_read_only !== true || evidence.collector_authority !== "farmos.production-readonly-acl-collector.v1" ||
    !Array.isArray(evidence.grants) || !evidence.grants.every((grant) => record(grant) && exact(grant, ["principal", "privilege", "grant_option"]) &&
      (grant.principal === null || boundedReference(grant.principal)) && ["CREATE", "USAGE"].includes(String(grant.privilege)) && typeof grant.grant_option === "boolean") ||
    !canonicalIso(evidence.observed_at) || !canonicalIso(input.evaluated_at) || !Number.isSafeInteger(input.maximum_age_ms) || input.maximum_age_ms < 1 ||
    Date.parse(input.evaluated_at) < Date.parse(evidence.observed_at) || Date.parse(input.evaluated_at) - Date.parse(evidence.observed_at) > input.maximum_age_ms) {
    return { result: "UNKNOWN_GRANT", details: ["invalid-acl-evidence"], automatic_revoke: false };
  }
  const observedGrants = evidence.grants as unknown as readonly FarmOsAclObservedGrant[];
  const allowlist = FARM_OS_AI_SCHEMA_ACL_POLICY.allowlist;
  const details: string[] = [];
  for (const observed of observedGrants) {
    if (observed.principal === null) {
      details.push(`unattributed:${observed.privilege}:${observed.grant_option}`);
      continue;
    }
    const entry = allowlist.find((candidate) =>
      candidate.principal === observed.principal && candidate.privilege === observed.privilege &&
      candidate.grant_option === observed.grant_option);
    if (!entry) details.push(`unknown:${observed.principal}:${observed.privilege}`);
    else if (entry.status === "forbidden") details.push(`forbidden:${observed.principal}:${observed.privilege}`);
    else if (entry.status !== "expected") details.push(`${entry.status}:${observed.principal}:${observed.privilege}`);
  }
  if (details.some((detail) => detail.startsWith("forbidden:"))) return { result: "FORBIDDEN_GRANT", details, automatic_revoke: false };
  if (details.length > 0) return { result: "UNKNOWN_GRANT", details, automatic_revoke: false };
  const missing = allowlist.filter((entry) => entry.status === "expected" &&
    !observedGrants.some((observed) => observed.principal === entry.principal && observed.privilege === entry.privilege && observed.grant_option === entry.grant_option));
  return missing.length > 0
    ? { result: "MISSING_REQUIRED_GRANT", details: missing.map((entry) => `${entry.principal}:${entry.privilege}`), automatic_revoke: false }
    : { result: "MATCH", details: [], automatic_revoke: false };
}

export type FarmOsProviderCapacityEvidence = {
  environment_id: string;
  target_identity_digest: `sha256:${string}`;
  provider_class: FarmOsProductionTargetIdentity["provider_class"];
  provider_resource_fingerprint: `sha256:${string}`;
  storage_quota_bytes: number;
  available_storage_bytes: number;
  database_bytes: number;
  wal_bytes_or_headroom: number;
  observed_at: string;
  source_authority: string;
  status: "available" | "unavailable";
};

export const FARM_OS_PROVIDER_CAPACITY_POLICY = {
  schema_version: "farmos.provider-capacity-policy.v1",
  minimum_available_storage_bytes: 1_000_000_000,
  minimum_wal_headroom_bytes: 100_000_000,
  alert_threshold_bytes: 1_000_000_000,
  maximum_age_ms: 300_000,
  approved_source_authorities: ["provider/read-only-capacity/1"],
  authority_reference: "policy/stable-changes-capacity/v1",
} as const;

export function evaluateFarmOsProviderCapacity(
  input: { evidence: unknown; target_manifest: unknown; evaluated_at: string },
): { result: "MATCH" | "MISSING_CAPACITY" | "INSUFFICIENT_CAPACITY" } {
  const value = input.evidence;
  if (!record(value) || !exact(value, [
    "environment_id", "target_identity_digest", "provider_class", "provider_resource_fingerprint", "storage_quota_bytes",
    "available_storage_bytes", "database_bytes", "wal_bytes_or_headroom",
    "observed_at", "source_authority", "status",
  ])) return { result: "MISSING_CAPACITY" };
  const target = parseFarmOsProductionTargetIdentity(input.target_manifest);
  const targetDigest = createFarmOsProductionTargetIdentityDigest(input.target_manifest);
  if (target === null || targetDigest === null || typeof value.environment_id !== "string" || !IDENTIFIER.test(value.environment_id) ||
    !digest(value.target_identity_digest) || typeof value.provider_class !== "string" ||
    !["managed_postgres", "self_hosted_postgres", "other"].includes(value.provider_class) ||
    !digest(value.provider_resource_fingerprint) ||
    !["storage_quota_bytes", "available_storage_bytes", "database_bytes", "wal_bytes_or_headroom"].every((key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0) ||
    !canonicalIso(value.observed_at) || !boundedReference(value.source_authority) ||
    !FARM_OS_PROVIDER_CAPACITY_POLICY.approved_source_authorities.includes(value.source_authority as "provider/read-only-capacity/1") || value.status !== "available" ||
    !canonicalIso(input.evaluated_at) || value.environment_id !== target.environment_id ||
    value.target_identity_digest !== targetDigest || value.provider_class !== target.provider_class ||
    value.provider_resource_fingerprint !== target.provider_resource_fingerprint ||
    Date.parse(input.evaluated_at) < Date.parse(value.observed_at) ||
    Date.parse(input.evaluated_at) - Date.parse(value.observed_at) > FARM_OS_PROVIDER_CAPACITY_POLICY.maximum_age_ms) {
    return { result: "MISSING_CAPACITY" };
  }
  return Number(value.database_bytes) + Number(value.available_storage_bytes) <= Number(value.storage_quota_bytes) &&
      Number(value.available_storage_bytes) <= Number(value.storage_quota_bytes) &&
      Number(value.available_storage_bytes) > FARM_OS_PROVIDER_CAPACITY_POLICY.minimum_available_storage_bytes &&
      Number(value.available_storage_bytes) > FARM_OS_PROVIDER_CAPACITY_POLICY.alert_threshold_bytes &&
      Number(value.wal_bytes_or_headroom) >= FARM_OS_PROVIDER_CAPACITY_POLICY.minimum_wal_headroom_bytes
    ? { result: "MATCH" }
    : { result: "INSUFFICIENT_CAPACITY" };
}

export type FarmOsMaintenanceEvidence = {
  environment_id: string;
  target_identity_digest: `sha256:${string}`;
  change_window_id: string;
  backup_receipt_digest: `sha256:${string}`;
  monitoring_receipt_digest: `sha256:${string}`;
  source_authority: string;
  waiting_locks: number;
  long_transactions: number;
  idle_in_transaction: number;
  active_connections: number;
  monitoring_ready: boolean;
  backup_ready: boolean;
  poller_disabled: boolean;
  feature_disabled: boolean;
  observed_at: string;
};

export const FARM_OS_MAINTENANCE_EVIDENCE_POLICY = {
  schema_version: "farmos.migration-maintenance-evidence-policy.v1",
  approved_source_authorities: ["operations/maintenance-readiness/1"],
  maximum_active_connections: 10,
  authority_reference: "policy/stable-changes-maintenance/v1",
} as const;

export function evaluateFarmOsMaintenanceEvidence(
  input: { evidence: unknown; target_manifest: unknown; expected_change_window_id: string; evaluated_at: string; maximum_age_ms: number },
): { result: "MATCH" | "BLOCKED" } {
  const value = input.evidence;
  if (!record(value) || !exact(value, [
    "environment_id", "target_identity_digest", "change_window_id", "backup_receipt_digest",
    "monitoring_receipt_digest", "source_authority", "waiting_locks", "long_transactions", "idle_in_transaction",
    "active_connections", "monitoring_ready", "backup_ready",
    "poller_disabled", "feature_disabled", "observed_at",
  ])) return { result: "BLOCKED" };
  const target = parseFarmOsProductionTargetIdentity(input.target_manifest);
  const targetDigest = createFarmOsProductionTargetIdentityDigest(input.target_manifest);
  if (target === null || targetDigest === null || value.environment_id !== target.environment_id ||
    value.target_identity_digest !== targetDigest || !digest(value.target_identity_digest) ||
    !boundedReference(value.change_window_id) || value.change_window_id !== input.expected_change_window_id ||
    !digest(value.backup_receipt_digest) || !digest(value.monitoring_receipt_digest) || !boundedReference(value.source_authority) ||
    !FARM_OS_MAINTENANCE_EVIDENCE_POLICY.approved_source_authorities.includes(value.source_authority as "operations/maintenance-readiness/1") ||
    !["waiting_locks", "long_transactions", "idle_in_transaction", "active_connections"].every((key) => Number.isSafeInteger(value[key]) && Number(value[key]) >= 0) ||
    !canonicalIso(value.observed_at) || !canonicalIso(input.evaluated_at) ||
    !Number.isSafeInteger(input.maximum_age_ms) || input.maximum_age_ms < 1 ||
    Date.parse(input.evaluated_at) < Date.parse(value.observed_at) ||
    Date.parse(input.evaluated_at) - Date.parse(value.observed_at) > input.maximum_age_ms) return { result: "BLOCKED" };
  return value.waiting_locks === 0 && value.long_transactions === 0 &&
      value.idle_in_transaction === 0 && value.monitoring_ready === true &&
      value.backup_ready === true && value.poller_disabled === true &&
      value.feature_disabled === true && Number(value.active_connections) <= FARM_OS_MAINTENANCE_EVIDENCE_POLICY.maximum_active_connections
    ? { result: "MATCH" }
    : { result: "BLOCKED" };
}

export const FARM_OS_APPLY_STATES = [
  "PRECHECK", "IDENTITY_CONFIRMED", "HISTORY_RECONCILED",
  "AUTHORITY_CONFIRMED", "ACL_CONFIRMED", "CAPACITY_CONFIRMED",
  "MAINTENANCE_CONFIRMED", "APPLY_AUTHORIZED", "APPLY_RUNNING",
  "APPLY_COMMITTED", "VERIFY_COMPLETE", "HISTORY_RECORDED",
  "POSTCONDITION_COMPLETE", "FAILED", "OUTCOME_UNKNOWN",
] as const;
export type FarmOsApplyState = typeof FARM_OS_APPLY_STATES[number];

export type FarmOsApplyApprovalEvidence = {
  schema_version: "farmos.migration-apply-approval.v1";
  status: "authenticated_human_approved";
  approval_reference: string;
  target_identity_digest: `sha256:${string}`;
  migration_id: string;
  artifact_sha256: `sha256:${string}`;
  precheck_receipt_digest: `sha256:${string}`;
  migration_plan_digest: `sha256:${string}`;
  execution_id: string;
  change_window_id: string;
  approved_at: string;
  expires_at: string;
};

function validApplyApproval(value: unknown): value is FarmOsApplyApprovalEvidence {
  return record(value) && exact(value, [
    "schema_version", "status", "approval_reference", "target_identity_digest",
    "migration_id", "artifact_sha256", "precheck_receipt_digest",
    "migration_plan_digest", "execution_id", "change_window_id", "approved_at", "expires_at",
  ]) && value.schema_version === "farmos.migration-apply-approval.v1" &&
    value.status === "authenticated_human_approved" &&
    boundedReference(value.approval_reference) && digest(value.target_identity_digest) &&
    typeof value.migration_id === "string" && MIGRATION_ID.test(value.migration_id) &&
    digest(value.artifact_sha256) && digest(value.precheck_receipt_digest) &&
    digest(value.migration_plan_digest) && boundedReference(value.execution_id) &&
    boundedReference(value.change_window_id) && canonicalIso(value.approved_at) && canonicalIso(value.expires_at) &&
    Date.parse(value.approved_at) < Date.parse(value.expires_at);
}

const APPLY_SEQUENCE: readonly FarmOsApplyState[] = FARM_OS_APPLY_STATES.slice(0, 13);
export function transitionFarmOsApplyState(input: {
  current: FarmOsApplyState;
  next: FarmOsApplyState;
}): { result: "ACCEPTED" | "REJECTED"; state: FarmOsApplyState } {
  if (input.next === "FAILED" || input.next === "OUTCOME_UNKNOWN") return { result: "ACCEPTED", state: input.next };
  const currentIndex = APPLY_SEQUENCE.indexOf(input.current);
  const nextIndex = APPLY_SEQUENCE.indexOf(input.next);
  if (currentIndex < 0 || nextIndex !== currentIndex + 1 || input.next === "APPLY_AUTHORIZED") {
    return { result: "REJECTED", state: input.current };
  }
  return { result: "ACCEPTED", state: input.next };
}

export function reconcileFarmOsUnknownApplyOutcome(input: {
  identity_result: FarmOsTargetIdentityComparison["result"];
  object_validation: FarmOsObjectValidationResult;
  history_state: "ABSENT" | "EXACT" | "CONFLICT" | "UNKNOWN";
  artifact_sha_exact: boolean;
  verify_result: "PASS" | "FAIL" | "UNAVAILABLE";
  apply_commit_receipt: unknown | null;
  target_identity_digest: `sha256:${string}`;
  migration_id: string;
  artifact_sha256: `sha256:${string}`;
  catalog_observed_at: string;
  evaluated_at: string;
}): { result: "NOT_APPLIED" | "VERIFIED_EXISTING_STATE" | "APPLIED_HISTORY_MISSING" | "APPLIED_AND_RECORDED" | "INCONSISTENT" | "UNKNOWN"; replay_allowed: boolean } {
  const objects = input.object_validation;
  if (input.identity_result !== "MATCH" || !input.artifact_sha_exact || input.verify_result === "UNAVAILABLE" ||
    objects.result === "UNKNOWN" || !objects.expected_authority_validated || !objects.observed_evidence_validated ||
    input.history_state === "UNKNOWN") return { result: "UNKNOWN", replay_allowed: false };
  const receipt = validateFarmOsMigrationCommitReceipt({
    receipt: input.apply_commit_receipt,
    target_identity_digest: input.target_identity_digest,
    migration_id: input.migration_id,
    artifact_sha256: input.artifact_sha256,
    catalog_observed_at: input.catalog_observed_at,
    evaluated_at: input.evaluated_at,
  });
  if (objects.result === "ABSENT" && input.history_state === "ABSENT") {
    return receipt.result === "VALID"
      ? { result: "INCONSISTENT", replay_allowed: false }
      : { result: "NOT_APPLIED", replay_allowed: true };
  }
  if (objects.result === "EXACT" && input.verify_result === "PASS" && input.history_state === "ABSENT") {
    return receipt.result === "VALID"
      ? { result: "APPLIED_HISTORY_MISSING", replay_allowed: false }
      : { result: "VERIFIED_EXISTING_STATE", replay_allowed: false };
  }
  if (objects.result === "EXACT" && input.verify_result === "PASS" && input.history_state === "EXACT") return { result: "APPLIED_AND_RECORDED", replay_allowed: false };
  return { result: "INCONSISTENT", replay_allowed: false };
}

export type FarmOsOperatorAuthorityEvidence = {
  schema_version: "farmos.migration-operator-authority-evidence.v1";
  capability: "ROLE_ADMIN" | "SCHEMA_OWNER_APPLY" | "HISTORY_WRITER" | "VERIFY_READER" | "POSTCONDITION_READER";
  principal_class: string;
  target_identity_digest: `sha256:${string}`;
  transaction_read_only: true;
  collector_authority: "farmos.production-readonly-authority-collector.v1";
  principal_is_superuser: false;
  capability_confirmed: true;
  capability_evidence_digest: `sha256:${string}`;
  runtime_role_state: "EXACT" | null;
  runtime_role_flags: Readonly<Record<keyof typeof FARM_OS_MIGRATION_AUTHORITY_MODEL.expected_runtime_role_flags, boolean>> | null;
  observed_at: string;
  expires_at: string;
};

export const FARM_OS_MIGRATION_CAPABILITY_PRINCIPAL_POLICY = {
  ROLE_ADMIN: "role-administration-operator",
  SCHEMA_OWNER_APPLY: "schema-owner-apply-operator",
  HISTORY_WRITER: "migration-history-writer",
  VERIFY_READER: "migration-verification-reader",
  POSTCONDITION_READER: "migration-verification-reader",
} as const;

export type FarmOsRawReconciliationEvidence = {
  migration_id: string;
  expected_catalog: unknown;
  observed_catalog: unknown;
  expected_catalog_authority: unknown;
  history_evidence: unknown;
  apply_commit_receipt: unknown | null;
};

export const FARM_OS_MIGRATION_HISTORY_QUERY_SHA256 =
  `sha256:${createHash("sha256").update("farmos.migration-history-query.v1:exact-migration-row").digest("hex")}` as const;

export type FarmOsMigrationHistoryEvidence = {
  schema_version: "farmos.migration-history-evidence.v1";
  target_identity_digest: `sha256:${string}`;
  migration_id: string;
  status: "AVAILABLE" | "UNAVAILABLE";
  row: FarmOsStoredMigration | null;
  collection_complete: boolean;
  transaction_read_only: true;
  collector_authority: "farmos.production-readonly-history-collector.v1";
  catalog_query_sha256: `sha256:${string}`;
  observed_at: string;
};

export const FARM_OS_APPLY_PRECHECK_POLICY = {
  schema_version: "farmos.migration-apply-precheck-policy.v1",
  identity_maximum_age_ms: 60_000,
  catalog_maximum_age_ms: 60_000,
  history_maximum_age_ms: 60_000,
  acl_maximum_age_ms: 60_000,
  authority_maximum_age_ms: 60_000,
  maintenance_maximum_age_ms: 60_000,
  receipt_maximum_ttl_ms: 30_000,
  authority_reference: "policy/stable-changes-apply-precheck/v1",
} as const;

export type FarmOsApplyPrecheckReceipt = {
  schema_version: "farmos.migration-apply-precheck-receipt.v1";
  state: "MAINTENANCE_CONFIRMED";
  target_identity_digest: `sha256:${string}`;
  migration_id: string;
  artifact_sha256: `sha256:${string}`;
  migration_plan_digest: `sha256:${string}`;
  evidence_bundle_digest: `sha256:${string}`;
  execution_id: string;
  change_window_id: string;
  created_at: string;
  expires_at: string;
  apply_authorized: false;
};

export type FarmOsApplyDryRunInput = {
  target_manifest: unknown;
  live_identity_evidence: unknown;
  evaluated_at: string;
  execution_id: string;
  change_window_id: string;
  registry: readonly FarmOsMigrationRegistryEntry[];
  target_migration_id: string;
  observed_apply_sha256: `sha256:${string}`;
  observed_verify_sha256: `sha256:${string}`;
  reconciliation_evidence: readonly FarmOsRawReconciliationEvidence[];
  authority_evidence: unknown;
  acl_evidence: unknown;
  capacity_evidence: unknown;
  maintenance_evidence: unknown;
};

function registryMatchesRepositoryAuthority(registry: readonly FarmOsMigrationRegistryEntry[]): boolean {
  return registry.length === MIGRATION_METADATA.length && registry.every((entry, index) => {
    const expected = MIGRATION_METADATA[index];
    return expected !== undefined && entry.migration_id === expected[0] &&
      entry.sequence === Number(expected[0].slice(0, 12)) && entry.apply_sha256 === expected[1] &&
      entry.verify_sha256 === expected[2] && entry.git_authority === expected[3] && entry.role === expected[4] &&
      entry.expected_object_fingerprint_version === "farmos.pg-catalog-fingerprint.v1" &&
      entry.historical_production_evidence_state === "unproven" &&
      entry.apply_path === `db/migrations/${entry.migration_id}.sql` &&
      entry.verify_path === `db/migrations/${entry.migration_id}.verify.sql`;
  });
}

function validateOperatorAuthorityEvidence(input: {
  evidence: unknown;
  target_digest: `sha256:${string}` | null;
  evaluated_at: string;
}): { valid: boolean; expires_at: string | null } {
  if (!Array.isArray(input.evidence) || input.target_digest === null || !canonicalIso(input.evaluated_at)) return { valid: false, expires_at: null };
  const expiries: string[] = [];
  for (const capability of FARM_OS_MIGRATION_AUTHORITY_MODEL.capabilities) {
    const matches = input.evidence.filter((candidate) => record(candidate) && candidate.capability === capability);
    if (matches.length !== 1) return { valid: false, expires_at: null };
    const value = matches[0]!;
    if (!record(value) || !exact(value, [
      "schema_version", "capability", "principal_class", "target_identity_digest", "transaction_read_only",
      "collector_authority", "principal_is_superuser", "capability_confirmed", "capability_evidence_digest",
      "runtime_role_state", "runtime_role_flags", "observed_at", "expires_at",
    ]) || value.schema_version !== "farmos.migration-operator-authority-evidence.v1" ||
      value.principal_class !== FARM_OS_MIGRATION_CAPABILITY_PRINCIPAL_POLICY[capability] ||
      value.target_identity_digest !== input.target_digest || value.transaction_read_only !== true ||
      value.collector_authority !== "farmos.production-readonly-authority-collector.v1" ||
      value.principal_is_superuser !== false || value.capability_confirmed !== true || !digest(value.capability_evidence_digest) ||
      !canonicalIso(value.observed_at) || !canonicalIso(value.expires_at) ||
      Date.parse(value.observed_at) > Date.parse(input.evaluated_at) ||
      Date.parse(input.evaluated_at) - Date.parse(value.observed_at) > FARM_OS_APPLY_PRECHECK_POLICY.authority_maximum_age_ms ||
      Date.parse(input.evaluated_at) >= Date.parse(value.expires_at)) return { valid: false, expires_at: null };
    const flags = value.runtime_role_flags;
    const flagsExact = record(flags) && exact(flags, Object.keys(FARM_OS_MIGRATION_AUTHORITY_MODEL.expected_runtime_role_flags)) &&
      Object.entries(FARM_OS_MIGRATION_AUTHORITY_MODEL.expected_runtime_role_flags).every(([key, expected]) => flags[key] === expected);
    if (capability === "ROLE_ADMIN" ? value.runtime_role_state !== "EXACT" || !flagsExact : value.runtime_role_state !== null || flags !== null) {
      return { valid: false, expires_at: null };
    }
    expiries.push(value.expires_at as string);
  }
  if (input.evidence.length !== FARM_OS_MIGRATION_AUTHORITY_MODEL.capabilities.length) return { valid: false, expires_at: null };
  return { valid: true, expires_at: expiries.sort(codePointCompare)[0] ?? null };
}

function parseMigrationHistoryEvidence(input: {
  value: unknown;
  migration_id: string;
  target_identity_digest: `sha256:${string}`;
  evaluated_at: string;
}): { valid: boolean; row: FarmOsStoredMigration | null; expires_at: number } {
  const value = input.value;
  if (!record(value) || !exact(value, [
    "schema_version", "target_identity_digest", "migration_id", "status", "row",
    "collection_complete", "transaction_read_only", "collector_authority",
    "catalog_query_sha256", "observed_at",
  ]) || value.schema_version !== "farmos.migration-history-evidence.v1" ||
    value.target_identity_digest !== input.target_identity_digest || value.migration_id !== input.migration_id ||
    value.status !== "AVAILABLE" || value.collection_complete !== true || value.transaction_read_only !== true ||
    value.collector_authority !== "farmos.production-readonly-history-collector.v1" ||
    value.catalog_query_sha256 !== FARM_OS_MIGRATION_HISTORY_QUERY_SHA256 || !canonicalIso(value.observed_at) ||
    !canonicalIso(input.evaluated_at) || Date.parse(value.observed_at) > Date.parse(input.evaluated_at) ||
    Date.parse(input.evaluated_at) - Date.parse(value.observed_at) > FARM_OS_APPLY_PRECHECK_POLICY.history_maximum_age_ms) {
    return { valid: false, row: null, expires_at: 0 };
  }
  const row = value.row;
  if (!(row === null || (record(row) && exact(row, ["migration_id", "sequence", "checksum"]) &&
    row.migration_id === input.migration_id && Number.isSafeInteger(row.sequence) && digest(row.checksum)))) {
    return { valid: false, row: null, expires_at: 0 };
  }
  return {
    valid: true,
    row: row as FarmOsStoredMigration | null,
    expires_at: Date.parse(value.observed_at) + FARM_OS_APPLY_PRECHECK_POLICY.history_maximum_age_ms,
  };
}

export function planFarmOsMigrationApplyDryRun(
  input: FarmOsApplyDryRunInput,
): {
  result: "READY_TO_PROPOSE_APPLY" | "BLOCKED";
  block_codes: readonly string[];
  maximum_state: "MAINTENANCE_CONFIRMED" | "PRECHECK";
  apply_authorized: false;
  sql_execution_count: 0;
  automatic_retry: 0;
  precheck_receipt: FarmOsApplyPrecheckReceipt | null;
} {
  const blocks: string[] = [];
  const targetDigest = createFarmOsProductionTargetIdentityDigest(input.target_manifest);
  const identity = compareFarmOsProductionTargetIdentity({ manifest: input.target_manifest, evidence: input.live_identity_evidence, evaluated_at: input.evaluated_at, maximum_age_ms: FARM_OS_APPLY_PRECHECK_POLICY.identity_maximum_age_ms });
  if (targetDigest === null || identity.result !== "MATCH") blocks.push("TARGET_IDENTITY_NOT_CONFIRMED");
  const target = input.registry.find((entry) => entry.migration_id === input.target_migration_id);
  if (!registryMatchesRepositoryAuthority(input.registry) || !target || input.registry.filter((entry) => entry.migration_id === input.target_migration_id).length !== 1 ||
    target.apply_sha256 !== input.observed_apply_sha256 || target.verify_sha256 !== input.observed_verify_sha256) blocks.push("ARTIFACT_HASH_MISMATCH");
  const classifications: FarmOsReconciliationClassification[] = [];
  const catalogExpiries: number[] = [];
  const historyExpiries: number[] = [];
  let reconciliationExact = targetDigest !== null && input.reconciliation_evidence.length === input.registry.length;
  for (const registryEntry of input.registry) {
    const matches = input.reconciliation_evidence.filter((evidence) => evidence.migration_id === registryEntry.migration_id);
    if (matches.length !== 1 || targetDigest === null) { reconciliationExact = false; continue; }
    const evidence = matches[0]!;
    const objects = validateFarmOsMigrationObjectsHistoryIndependently({
      expected: evidence.expected_catalog, observed: evidence.observed_catalog,
      registry_entry: registryEntry, expected_authority: evidence.expected_catalog_authority,
      target_identity_digest: targetDigest, evaluated_at: input.evaluated_at,
      maximum_age_ms: FARM_OS_APPLY_PRECHECK_POLICY.catalog_maximum_age_ms,
    });
    const expectedHistory = { migration_id: registryEntry.migration_id, sequence: registryEntry.sequence, checksum: registryEntry.apply_sha256 };
    const historyEvidence = parseMigrationHistoryEvidence({
      value: evidence.history_evidence, migration_id: registryEntry.migration_id,
      target_identity_digest: targetDigest, evaluated_at: input.evaluated_at,
    });
    const observedSnapshot = parseFarmOsMigrationCatalogSnapshot(evidence.observed_catalog);
    const classified = classifyFarmOsMigrationReconciliation({
      object_result: objects.result, history: historyEvidence.row, expected_history: expectedHistory,
      apply_commit_receipt: evidence.apply_commit_receipt,
      target_identity_digest: targetDigest,
      object_observed_at: observedSnapshot?.observed_at ?? "",
      evaluated_at: input.evaluated_at,
    });
    classifications.push(classified.classification);
    if (!historyEvidence.valid || !objects.expected_authority_validated || !objects.observed_evidence_validated || observedSnapshot?.observed_at === null || observedSnapshot?.observed_at === undefined) reconciliationExact = false;
    else {
      catalogExpiries.push(Date.parse(observedSnapshot.observed_at) + FARM_OS_APPLY_PRECHECK_POLICY.catalog_maximum_age_ms);
      historyExpiries.push(historyEvidence.expires_at);
    }
  }
  const targetIndex = input.registry.findIndex((registryEntry) => registryEntry.migration_id === input.target_migration_id);
  const orderedStatesExact = targetIndex >= 0 && classifications.length === input.registry.length &&
    classifications.every((classification, index) => index < targetIndex ? classification === "APPLIED_AND_RECORDED" : classification === "NOT_APPLIED") &&
    classifications[targetIndex] === "NOT_APPLIED";
  if (!reconciliationExact || !orderedStatesExact) blocks.push("MIGRATION_HISTORY_NOT_RECONCILED");
  const authority = validateOperatorAuthorityEvidence({ evidence: input.authority_evidence, target_digest: targetDigest, evaluated_at: input.evaluated_at });
  if (!authority.valid) blocks.push("AUTHORITY_MISSING");
  if (evaluateFarmOsAiSchemaAcl({ target_manifest: input.target_manifest, evidence: input.acl_evidence, evaluated_at: input.evaluated_at, maximum_age_ms: FARM_OS_APPLY_PRECHECK_POLICY.acl_maximum_age_ms }).result !== "MATCH") blocks.push("ACL_NOT_CONFIRMED");
  if (evaluateFarmOsProviderCapacity({ evidence: input.capacity_evidence, target_manifest: input.target_manifest, evaluated_at: input.evaluated_at }).result !== "MATCH") blocks.push("CAPACITY_NOT_CONFIRMED");
  if (evaluateFarmOsMaintenanceEvidence({ evidence: input.maintenance_evidence, target_manifest: input.target_manifest, expected_change_window_id: input.change_window_id, evaluated_at: input.evaluated_at, maximum_age_ms: FARM_OS_APPLY_PRECHECK_POLICY.maintenance_maximum_age_ms }).result !== "MATCH") blocks.push("MAINTENANCE_NOT_CONFIRMED");
  if (!boundedReference(input.execution_id) || !boundedReference(input.change_window_id) || !canonicalIso(input.evaluated_at)) blocks.push("PLANNER_INPUT_INVALID");
  const uniqueBlocks = [...new Set(blocks)];
  const evidenceBundle = { identity: input.live_identity_evidence, reconciliation: input.reconciliation_evidence, authority: input.authority_evidence, acl: input.acl_evidence, capacity: input.capacity_evidence, maintenance: input.maintenance_evidence };
  const migrationPlanDigest = `sha256:${createHash("sha256").update(canonicalJson(input.registry)).digest("hex")}` as const;
  const liveIdentity = parseFarmOsProductionTargetLiveEvidence(input.live_identity_evidence);
  const aclObservedAt = record(input.acl_evidence) && canonicalIso(input.acl_evidence.observed_at) ? Date.parse(input.acl_evidence.observed_at) : 0;
  const capacityObservedAt = record(input.capacity_evidence) && canonicalIso(input.capacity_evidence.observed_at) ? Date.parse(input.capacity_evidence.observed_at) : 0;
  const maintenanceObservedAt = record(input.maintenance_evidence) && canonicalIso(input.maintenance_evidence.observed_at) ? Date.parse(input.maintenance_evidence.observed_at) : 0;
  const evidenceExpiry = Math.min(
    Date.parse(input.evaluated_at) + FARM_OS_APPLY_PRECHECK_POLICY.receipt_maximum_ttl_ms,
    liveIdentity === null ? 0 : Date.parse(liveIdentity.observed_at) + FARM_OS_APPLY_PRECHECK_POLICY.identity_maximum_age_ms,
    aclObservedAt + FARM_OS_APPLY_PRECHECK_POLICY.acl_maximum_age_ms,
    capacityObservedAt + FARM_OS_PROVIDER_CAPACITY_POLICY.maximum_age_ms,
    maintenanceObservedAt + FARM_OS_APPLY_PRECHECK_POLICY.maintenance_maximum_age_ms,
    authority.expires_at === null ? 0 : Date.parse(authority.expires_at),
    ...catalogExpiries,
    ...historyExpiries,
  );
  if (evidenceExpiry <= Date.parse(input.evaluated_at)) uniqueBlocks.push("EVIDENCE_EXPIRES_TOO_SOON");
  const receipt = uniqueBlocks.length === 0 && target && targetDigest !== null ? {
    schema_version: "farmos.migration-apply-precheck-receipt.v1" as const,
    state: "MAINTENANCE_CONFIRMED" as const,
    target_identity_digest: targetDigest,
    migration_id: target.migration_id,
    artifact_sha256: target.apply_sha256,
    migration_plan_digest: migrationPlanDigest,
    evidence_bundle_digest: `sha256:${createHash("sha256").update(canonicalJson(evidenceBundle)).digest("hex")}` as `sha256:${string}`,
    execution_id: input.execution_id,
    change_window_id: input.change_window_id,
    created_at: input.evaluated_at,
    expires_at: new Date(evidenceExpiry).toISOString(),
    apply_authorized: false as const,
  } : null;
  return uniqueBlocks.length === 0
    ? { result: "READY_TO_PROPOSE_APPLY", block_codes: [], maximum_state: "MAINTENANCE_CONFIRMED", apply_authorized: false, sql_execution_count: 0, automatic_retry: 0, precheck_receipt: receipt }
    : { result: "BLOCKED", block_codes: uniqueBlocks, maximum_state: "PRECHECK", apply_authorized: false, sql_execution_count: 0, automatic_retry: 0, precheck_receipt: null };
}

export function authorizeFarmOsMigrationApply(input: {
  receipt: FarmOsApplyPrecheckReceipt;
  dry_run_input: FarmOsApplyDryRunInput;
  approval: unknown;
  evaluated_at: string;
}): { result: "ACCEPTED" | "REJECTED"; state: "APPLY_AUTHORIZED" | "MAINTENANCE_CONFIRMED" } {
  const approval = validApplyApproval(input.approval) ? input.approval : null;
  const derived = planFarmOsMigrationApplyDryRun(input.dry_run_input).precheck_receipt;
  const receiptDerivedFromEvidence = derived !== null && canonicalJson(derived) === canonicalJson(input.receipt);
  const receiptDigest = `sha256:${createHash("sha256").update(canonicalJson(input.receipt)).digest("hex")}`;
  const valid = receiptDerivedFromEvidence && approval !== null && canonicalIso(input.evaluated_at) && input.receipt.apply_authorized === false &&
    input.receipt.state === "MAINTENANCE_CONFIRMED" && Date.parse(input.evaluated_at) >= Date.parse(input.receipt.created_at) &&
    Date.parse(input.evaluated_at) < Date.parse(input.receipt.expires_at) && Date.parse(input.evaluated_at) >= Date.parse(approval.approved_at) &&
    Date.parse(input.evaluated_at) < Date.parse(approval.expires_at) && approval.precheck_receipt_digest === receiptDigest &&
    approval.target_identity_digest === input.receipt.target_identity_digest && approval.migration_id === input.receipt.migration_id &&
    approval.artifact_sha256 === input.receipt.artifact_sha256 && approval.migration_plan_digest === input.receipt.migration_plan_digest &&
    approval.execution_id === input.receipt.execution_id && approval.change_window_id === input.receipt.change_window_id;
  // Offline planning has no trusted approval issuer/verifier. Even a
  // self-consistent approval shape must remain below APPLY_AUTHORIZED.
  void valid;
  return { result: "REJECTED", state: "MAINTENANCE_CONFIRMED" };
}

export const FARM_OS_RECONCILIATION_SAFETY_BOUNDARY = {
  production_connection: 0,
  production_http: 0,
  credential_lookup: 0,
  ddl: 0,
  dml: 0,
  history_write: 0,
  role_or_grant_change: 0,
  migration_apply: 0,
  automatic_retry: 0,
  blind_replay: false,
  consumer_entrypoint_status: "PRODUCTION_CONSUMER_ENTRYPOINT_REQUIRED",
} as const;
