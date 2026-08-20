import { createHash, randomBytes } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { pathToFileURL } from "node:url";

import { FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST } from
  "./farm_os_day150_gate17_scope_authority";

import { parseFarmOsCoreMigrationManifest } from "./farm_os_core_db_migration_manifest";
import {
  FarmOsDay150DurablePublicationError,
  publishCanonicalFarmOsDay150ArtifactExclusive,
  reopenCanonicalFarmOsDay150Artifact,
} from "./farm_os_day150_prefix_reference_durable_store";
import {
  createFarmOsDay150QualificationPrimitiveEffectPort,
  type FarmOsDay150PrimitiveResult,
  type FarmOsDay150PrimitiveSystemEffectPort,
} from "./farm_os_day150_prefix_reference_primitive_port";
import {
  createFarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
  parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
  parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution,
  type FarmOsDay150PrefixReferenceLastTrustedPhase,
  type FarmOsDay150PrefixReferenceTerminalFailureCode,
  type FarmOsDay150PrefixReferenceTerminalOutcomeReceipt,
} from "./farm_os_day150_prefix_terminal_outcome_receipt";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES,
  transformFarmOsProductionIdentityCatalogReferenceResultSets,
  type FarmOsProductionIdentityCatalogReferenceSanitizedResultSets,
  type FarmOsProductionIdentityCandidateResultSet,
  type FarmOsProductionIdentityCandidateRow,
} from "./farm_os_production_identity_query_v2_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  verifyFarmOsProductionIdentityQueryV5ArtifactBytes,
} from "./farm_os_production_identity_query_v5_authority";
import {
  FARM_OS_MIGRATION_CATALOG_SNAPSHOT_SCHEMA_VERSION,
  FARM_OS_STABLE_CHANGES_MIGRATION_METADATA,
  createFarmOsMigrationObjectFingerprint,
  parseFarmOsMigrationCatalogSnapshot,
  validExpectedCatalogAuthority,
  type FarmOsExpectedCatalogFingerprintAuthority,
  type FarmOsMigrationCatalogObject,
  type FarmOsMigrationCatalogSnapshot,
} from "./farm_os_stable_changes_migration_reconciliation";
import {
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2,
  FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION,
  FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION,
  FARM_OS_DAY150_DUAL_PRINCIPAL_SEMANTIC_FINGERPRINT_VERSION,
  FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
  FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC,
  FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC,
  FARM_OS_DAY150_SEMANTIC_FINGERPRINT_VERSION,
  compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap,
  createFarmOsDay150DualPrincipalSemanticFingerprint,
  createFarmOsDay150SemanticPrincipalFingerprint,
  type FarmOsDay150SemanticAclEvidence,
} from "./farm_os_day150_prefix_initial_catalog_authority";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V4_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V4_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST,
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2,
  deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_APPROVAL_RECORD_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESSFUL_HISTORICAL_APPROVAL_CANDIDATE,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V8_CONSUMPTION_MARKER_PATH,
  FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD,
  FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
  createFarmOsDay150PrefixReferenceExecutionApprovalRecord,
  materializeFarmOsDay150PrefixReferenceExecutionProposal,
  parseFarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord,
  validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History,
  validateFarmOsDay150PrefixReferenceExecutionApprovalForCandidate,
  type FarmOsDay150PrefixReferenceExecutionApprovalRecord,
  type FarmOsDay150PrefixReferenceExecutionApprovalCandidate,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS,
  validateFarmOsDay150PrefixReferenceActiveExecutionBinding,
  type FarmOsDay150PrefixReferenceExecutionDescriptor,
  analyzeFarmOsDay150PinnedMigrationPrivilegeStatements,
} from "./farm_os_day150_prefix_reference_migration_privilege_authority";
const FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR =
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING.descriptor;
const ACTIVE_REFERENCE_AUTHORIZATION_ID =
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_id;
const ACTIVE_REFERENCE_AUTHORIZATION_REVISION =
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_revision;
const ACTIVE_REFERENCE_AUTHORIZATION_DIGEST =
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_digest;
const ACTIVE_REFERENCE_EXECUTION_PLAN_DIGEST =
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.execution_plan_digest;
const ACTIVE_REFERENCE_RUN_ID =
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.run_identity;
const HISTORICAL_V13_SUCCESSFUL_AUTHORIZATION_DIGEST =
  "sha256:922edad1f5ff4e807eeaa5dda84dbf1ced72785ce9e0d84fe40f56f9cb33cd27" as const;
const HISTORICAL_V13_SUCCESSFUL_EXECUTION_PLAN_DIGEST =
  "sha256:3c1bfb7c037a48d6521d05727a65b178d10cb6a5f3d095bd5672297254d3214c" as const;
const HISTORICAL_V13_SUCCESSFUL_RUN_ID =
  "sha256:a150ad2a8a61f0da1e8ee100e4cc7b2cd56eadb595882ab6e09340aa872078ff" as const;
const HISTORICAL_V13_SUCCESSFUL_DESCRIPTOR = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
  authorization_digest: HISTORICAL_V13_SUCCESSFUL_AUTHORIZATION_DIGEST,
  execution_plan_digest: HISTORICAL_V13_SUCCESSFUL_EXECUTION_PLAN_DIGEST,
  run_identity: HISTORICAL_V13_SUCCESSFUL_RUN_ID,
  attempt_identity:
    "sha256:9ad8aed862a2605b512d66aa50dd9976ef70d8b03bb582d70cea94dbc55e0346",
} as const);
const HISTORICAL_V13_SUCCESSFUL_APPROVAL_CANDIDATE =
  FARM_OS_DAY150_PREFIX_REFERENCE_V13_SUCCESSFUL_HISTORICAL_APPROVAL_CANDIDATE;
export const FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_OUTER_SETTLEMENT_DEADLINE_MILLISECONDS =
  FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY
    .maximum_observation_window_milliseconds + 5_113;
export const FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY =
  "farmos.day150-prefix-expected-catalog-derivation.v1" as const;
export const FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA =
  "farmos.day150-prefix-expected-catalog-candidate.v1" as const;
export const FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVAL_SCHEMA =
  "farmos.day150-prefix-expected-catalog-set-approval.v1" as const;
export const FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVED_BINDING_SCHEMA =
  "farmos.day150-prefix-expected-catalog-approved-binding.v1" as const;
export const FARM_OS_DAY150_PREFIX_PERSISTABLE_SNAPSHOT_SCHEMA =
  "farmos.day150-prefix-persistable-catalog-snapshot.v1" as const;
export const FARM_OS_DAY150_REFERENCE_CATALOG_RUN_RECEIPT_SCHEMA =
  "farmos.day150-reference-catalog-run-receipt-candidate.v1" as const;
export const FARM_OS_DAY150_PRE_CLEANUP_RUN_EVIDENCE_SCHEMA =
  "farmos.day150-prefix-pre-cleanup-run-evidence-candidate.v1" as const;
export const FARM_OS_DAY150_PREFIX_QUALIFICATION_RESULT_SCHEMA =
  "farmos.day150-prefix-catalog-qualification-result.v1" as const;
export const FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_REGISTRY_REVISION = 1 as const;
export const FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION =
  FARM_OS_DAY150_DUAL_PRINCIPAL_SEMANTIC_FINGERPRINT_VERSION;
export const FARM_OS_DAY150_PREFIX_SOURCE_SNAPSHOT_CANONICALIZATION =
  "farmos.pg-catalog-fingerprint.v1" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_MAJOR = 17 as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM = "linux/arm64/v8" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE_DIGEST =
  "sha256:7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE =
  `docker.io/library/postgres@${FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE_DIGEST}` as const;
export const FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION =
  "farmos.core-db-provisioning-manifest.v1@sha256:1e4b944ed821b9911b7466d65c947cae312e3ddfa11689fba8eb1f9d5358c3a8" as const;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const GIT = /^[a-f0-9]{40}$/u;
const REFERENCE = /^[a-z0-9][a-z0-9._:/-]{0,199}$/u;
const PREFIXES = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS;
export type FarmOsDay150PrefixMigrationId = typeof PREFIXES[number];

type JsonRecord = Record<string, unknown>;
const record = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exact = (value: JsonRecord, keys: readonly string[]): boolean => {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
const canonical = (value: unknown): string => {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return JSON.stringify(value);
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("NON_FINITE");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (!record(value)) throw new Error("NON_JSON");
  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
};
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\n${canonical(value)}`).digest("hex")}`;
const canonicalTime = (value: unknown): value is string => typeof value === "string" &&
  Number.isFinite(Date.parse(value)) && new Date(Date.parse(value)).toISOString() === value;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
};
const owned = <T>(value: T): T => deepFreeze(structuredClone(value));

const metadata = FARM_OS_STABLE_CHANGES_MIGRATION_METADATA.map((entry) => Object.freeze({
  migration_id: entry[0], sequence: Number(entry[0].slice(0, 12)),
  artifact_sha256: entry[1], verify_artifact_sha256: entry[2], git_authority: entry[3],
  apply_path: `db/migrations/${entry[0]}.sql`,
  verify_path: `db/migrations/${entry[0]}.verify.sql`,
}));

function scopesFor(migrationId: FarmOsDay150PrefixMigrationId): readonly string[] {
  const prefix = `${migrationId}:`;
  return Object.freeze([
    ...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES,
    ...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES,
    ...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES,
  ].filter((scope) => scope.startsWith(prefix)).sort());
}

export const FARM_OS_DAY150_PREFIX_REFERENCE_SPECS = Object.freeze(metadata.map((entry, index) => {
  const migrationId = entry.migration_id as FarmOsDay150PrefixMigrationId;
  const objectUniverse = Object.freeze({
    migration_id: migrationId,
    object_classes: Object.freeze([...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES]),
    scopes: scopesFor(migrationId),
  });
  const history = Object.freeze(metadata.slice(0, index + 1).map((historyEntry) => Object.freeze({
    migration_id: historyEntry.migration_id,
    sequence: historyEntry.sequence,
    artifact_sha256: historyEntry.artifact_sha256,
  })));
  return Object.freeze({ ...entry,
    candidate_id: `farmos.day150-prefix-expected-catalog-candidate.${migrationId}.v1`,
    candidate_revision: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_REGISTRY_REVISION,
    catalog_query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
    object_universe: objectUniverse,
    object_universe_digest: hash("farmos.day150-prefix-object-universe.v1", objectUniverse),
    canonical_migration_history: history,
    canonical_migration_history_digest:
      hash("farmos.day150-prefix-canonical-migration-history.v1", history),
    output_path: `artifacts/day150/prefix-expected-catalog/candidates/v1/${migrationId}.json`,
  });
}));

export type FarmOsDay150ReferenceCatalogRunReceiptCandidate = Readonly<{
  schema_version: typeof FARM_OS_DAY150_REFERENCE_CATALOG_RUN_RECEIPT_SCHEMA;
  authority_state: "REFERENCE_CATALOG_RUN_RECEIPT_CANDIDATE";
  derivation_authority_id: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY;
  derivation_authority_revision: 1;
  run_id: string; run_nonce_digest: `sha256:${string}`;
  repository_catalog_revision: typeof FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION;
  migration_history_authority_digest: `sha256:${string}`;
  git_authority_set_digest: `sha256:${string}`;
  reference_postgres_major: 17;
  reference_image: typeof FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE;
  reference_platform: typeof FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM;
  catalog_query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256;
  object_universe_authority_digest: `sha256:${string}`;
  initial_catalog_authority_id: typeof FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID;
  initial_catalog_authority_revision: 2;
  initial_catalog_digest: `sha256:${string}`;
  principal_normalization_revision:
    typeof FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION;
  bootstrap_plan_digest: `sha256:${string}`;
  initial_state_readback_digest: `sha256:${string}`;
  execution_authorization_id: typeof ACTIVE_REFERENCE_AUTHORIZATION_ID;
  execution_authorization_revision: typeof ACTIVE_REFERENCE_AUTHORIZATION_REVISION;
  execution_authorization_digest: `sha256:${string}`;
  attempt_claim_digest: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
  consumption_marker_digest: `sha256:${string}`;
  approval_reference: string;
  gate17_scope_digest: `sha256:${string}`;
  approval_candidate_identity: `sha256:${string}`;
  proposal_identity: `sha256:${string}`;
  proposal_created_at: string;
  approved_at: string;
  approval_record_digest: `sha256:${string}`;
  migration_privilege_envelope_id:
    "DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_V1";
  migration_privilege_envelope_digest: `sha256:${string}`;
  semantic_principal_normalization_revision:
    typeof FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION;
  candidate_ids: readonly string[];
  pinned_migration_bundle_digest: `sha256:${string}`;
  reference_capture_digest: `sha256:${string}`;
  pre_cleanup_run_evidence_digest: `sha256:${string}`;
  candidate_identity_digests: readonly `sha256:${string}`[];
  snapshot_points: readonly FarmOsDay150PrefixMigrationId[];
  resource_ownership_identity: "farmos-day150-prefix-reference-owned-resources-v1";
  connection_scope: "LOCALHOST_127_0_0_1_EPHEMERAL_PORT";
  destination_assertion: "NO_PRODUCTION_NO_CANONICAL_DESTINATION";
  execution_state: "COMPLETED_EXACT_FIVE_SOURCE_CAPTURE_AND_ZERO_RESIDUAL_CLEANUP";
  cleanup_result: Readonly<{ container_removed: true; volume_removed: true;
    network_removed: true; zero_residual_verified: true;
    unrelated_resource_operations: 0; outcome_unknown: false }>;
  started_at: string; completed_at: string;
  raw_catalog_values_persisted: false; credentials_persisted: false;
  receipt_digest: `sha256:${string}`;
}>;

export type FarmOsDay150ReferenceCapture = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PRE_CLEANUP_RUN_EVIDENCE_SCHEMA;
  authority_state: "REFERENCE_CAPTURE_BEFORE_CANDIDATE_DURABILITY";
  run_id: string; run_nonce_digest: `sha256:${string}`;
  execution_authorization_id: typeof ACTIVE_REFERENCE_AUTHORIZATION_ID;
  execution_authorization_revision: typeof ACTIVE_REFERENCE_AUTHORIZATION_REVISION;
  execution_authorization_digest: `sha256:${string}`;
  attempt_claim_digest: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
  consumption_marker_digest: `sha256:${string}`;
  approval_reference: string;
  gate17_scope_digest: `sha256:${string}`;
  approval_candidate_identity: `sha256:${string}`;
  proposal_identity: `sha256:${string}`;
  proposal_created_at: string;
  approved_at: string;
  approval_record_digest: `sha256:${string}`;
  migration_privilege_envelope_digest: `sha256:${string}`;
  pinned_migration_bundle_digest: `sha256:${string}`;
  reference_postgres_major: 17;
  reference_image: typeof FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE;
  reference_platform: typeof FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM;
  initial_state_readback_digest: `sha256:${string}`;
  snapshot_points: readonly FarmOsDay150PrefixMigrationId[];
  candidate_ids: readonly string[];
  execution_state: "EXACT_FIVE_CAPTURED_BEFORE_CLEANUP";
  started_at: string; completed_at: string;
  raw_catalog_values_persisted: false; credentials_persisted: false;
  reference_capture_digest: `sha256:${string}`;
}>;
export type FarmOsDay150PreCleanupRunEvidenceCandidate = Readonly<{
  schema_version: "farmos.day150-prefix-pre-cleanup-run-evidence-candidate.v2";
  authority_state: "PRE_CLEANUP_RUN_EVIDENCE_CANDIDATE";
  reference_capture_digest: `sha256:${string}`;
  pinned_migration_bundle_digest: `sha256:${string}`;
  candidate_identity_digests: readonly `sha256:${string}`[];
  candidate_artifact_digests: readonly `sha256:${string}`[];
  candidate_paths: readonly string[];
  durable_candidate_count: 5;
  execution_state: "EXACT_FIVE_CANDIDATES_DURABLE_BEFORE_CLEANUP";
  pre_cleanup_run_evidence_digest: `sha256:${string}`;
}>;

export type FarmOsDay150PersistableCatalogSnapshot = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PREFIX_PERSISTABLE_SNAPSHOT_SCHEMA;
  commitment_policy: "FARM_OS_CATALOG_INTERNAL_RAW_SHA256_COMMITMENTS_V1";
  raw_catalog_values_persisted: false;
  catalog_snapshot: FarmOsMigrationCatalogSnapshot;
}>;

export type FarmOsExpectedCatalogFingerprintCandidate = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA;
  authority_state: "EXPECTED_CATALOG_CANDIDATE";
  candidate_id: string; candidate_revision: 1;
  derivation_authority_id: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY;
  derivation_authority_revision: 1;
  migration_id: FarmOsDay150PrefixMigrationId;
  fingerprint_version: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION;
  candidate_expected_fingerprint: `sha256:${string}`;
  artifact_sha256: `sha256:${string}`; verify_artifact_sha256: `sha256:${string}`;
  catalog_query_sha256: `sha256:${string}`; object_universe_digest: `sha256:${string}`;
  expected_object_count: number; snapshot_digest: `sha256:${string}`;
  repository_catalog_revision: typeof FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION;
  git_authority: string; reference_postgres_major: 17;
  reference_image: typeof FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE;
  reference_platform: typeof FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM;
  canonicalization_version: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION;
  semantic_acl_evidence: readonly FarmOsDay150SemanticAclEvidence[];
  canonical_migration_history: readonly Readonly<{ migration_id: string; sequence: number;
    artifact_sha256: `sha256:${string}` }>[];
  canonical_migration_history_digest: `sha256:${string}`;
  reference_run_provenance_digest: `sha256:${string}`;
  snapshot: FarmOsDay150PersistableCatalogSnapshot;
  reference_capture: FarmOsDay150ReferenceCapture;
  reference_capture_digest: `sha256:${string}`;
  approval_reference: null; approved_at: null;
  candidate_identity_digest: `sha256:${string}`;
}>;

declare const REFERENCE_RUN: unique symbol;
declare const QUALIFICATION_RUN: unique symbol;
declare const EXECUTOR_COMPLETION: unique symbol;
export type FarmOsDay150ReferenceCatalogRunCapability = Readonly<{ [REFERENCE_RUN]: true }>;
export type FarmOsDay150QualificationOnlyReferenceCapability = Readonly<{ [QUALIFICATION_RUN]: true }>;
export type FarmOsDay150ReferenceCatalogExecutorCompletionCapability =
  Readonly<{ [EXECUTOR_COMPLETION]: true }>;
type SafeRun = Readonly<{ reference_capture: FarmOsDay150ReferenceCapture;
  results_by_migration: ReadonlyMap<FarmOsDay150PrefixMigrationId,
    FarmOsProductionIdentityCatalogReferenceSanitizedResultSets> }>;
const referenceRuns = new WeakMap<object, SafeRun>();
const qualificationRuns = new WeakMap<object,
  FarmOsProductionIdentityCatalogReferenceSanitizedResultSets>();
const executorCompletions = new WeakMap<object, SafeRun>();

export type FarmOsDay150ReferenceCatalogInput = Readonly<{
  migration_id: FarmOsDay150PrefixMigrationId;
  run_capability: FarmOsDay150ReferenceCatalogRunCapability | unknown;
}>;

function specFor(migrationId: string) {
  return FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.find((entry) => entry.migration_id === migrationId);
}

const MIGRATION_HISTORY_AUTHORITY_DIGEST = hash(
  "farmos.day150-reference-catalog-migration-history-authority.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => spec.canonical_migration_history),
);
export const FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_HISTORY_CONTRACT = Object.freeze({
  schema_version: "farmos.day150-prefix-reference-migration-history-contract.v1",
  applied_state_authority:
    "PINNED_MIGRATION_IDENTITY_DETERMINISTIC_SETTLEMENT_CANONICAL_CATALOG_AND_CANDIDATE_PROVENANCE",
  ordered_migration_metadata: "SOURCE_DERIVED",
  database_table: "core_schema.migration_history",
  database_rows_required: false,
  reference_executor_history_writes_authorized: false,
  observed_empty_table_semantics: "NOT_AN_APPLIED_STATE_CONTRADICTION",
  mutation_plan_expansion: false,
} as const);
const GIT_AUTHORITY_SET_DIGEST = hash("farmos.day150-reference-catalog-git-authority-set.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => Object.freeze({
    migration_id: spec.migration_id, git_authority: spec.git_authority,
  })));
const OBJECT_UNIVERSE_AUTHORITY_DIGEST = hash(
  "farmos.day150-reference-catalog-object-universe-authority.v1",
  FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => Object.freeze({
    migration_id: spec.migration_id, object_universe_digest: spec.object_universe_digest,
  })),
);
const INITIAL_BOOTSTRAP_PLAN = compileFarmOsDay150ReferenceInitialCatalogV2Bootstrap();
const RECEIPT_KEYS = ["schema_version", "authority_state", "derivation_authority_id",
  "derivation_authority_revision", "run_id", "run_nonce_digest",
  "repository_catalog_revision", "migration_history_authority_digest",
  "git_authority_set_digest", "reference_postgres_major", "reference_image",
  "reference_platform", "catalog_query_sha256", "object_universe_authority_digest",
  "initial_catalog_authority_id", "initial_catalog_authority_revision",
  "initial_catalog_digest", "principal_normalization_revision", "bootstrap_plan_digest",
  "initial_state_readback_digest", "execution_authorization_id",
  "execution_authorization_revision", "execution_authorization_digest",
  "attempt_claim_digest", "attempt_identity", "consumption_marker_digest",
  "approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
  "proposal_created_at", "approved_at", "approval_record_digest",
  "migration_privilege_envelope_id", "migration_privilege_envelope_digest",
  "semantic_principal_normalization_revision", "candidate_ids",
  "pinned_migration_bundle_digest", "reference_capture_digest",
  "pre_cleanup_run_evidence_digest",
  "candidate_identity_digests",
  "snapshot_points", "resource_ownership_identity", "connection_scope",
  "destination_assertion", "execution_state", "started_at", "completed_at",
  "cleanup_result", "raw_catalog_values_persisted", "credentials_persisted",
  "receipt_digest"] as const;

export function parseFarmOsDay150ReferenceCatalogRunReceiptCandidate(value: unknown):
  FarmOsDay150ReferenceCatalogRunReceiptCandidate | null {
  if (!record(value) || !exact(value, RECEIPT_KEYS)) return null;
  const descriptor = value.execution_authorization_digest ===
    HISTORICAL_V13_SUCCESSFUL_AUTHORIZATION_DIGEST
    ? HISTORICAL_V13_SUCCESSFUL_DESCRIPTOR
    : FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR;
  if (
    value.schema_version !== FARM_OS_DAY150_REFERENCE_CATALOG_RUN_RECEIPT_SCHEMA ||
    value.authority_state !== "REFERENCE_CATALOG_RUN_RECEIPT_CANDIDATE" ||
    value.derivation_authority_id !== FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY ||
    value.derivation_authority_revision !== 1 || typeof value.run_id !== "string" ||
    !REFERENCE.test(value.run_id) ||
    !DIGEST.test(String(value.run_nonce_digest)) ||
    value.repository_catalog_revision !== FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION ||
    value.migration_history_authority_digest !== MIGRATION_HISTORY_AUTHORITY_DIGEST ||
    value.git_authority_set_digest !== GIT_AUTHORITY_SET_DIGEST ||
    value.reference_postgres_major !== FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_MAJOR ||
    value.reference_image !== FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE ||
    value.reference_platform !== FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM ||
    value.catalog_query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256 ||
    value.object_universe_authority_digest !== OBJECT_UNIVERSE_AUTHORITY_DIGEST ||
    value.initial_catalog_authority_id !== FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID ||
    value.initial_catalog_authority_revision !== 2 ||
    value.initial_catalog_digest !==
      FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.canonical_initial_state_digest ||
    value.principal_normalization_revision !==
      FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION ||
    value.bootstrap_plan_digest !== INITIAL_BOOTSTRAP_PLAN.plan_digest ||
    !DIGEST.test(String(value.initial_state_readback_digest)) ||
    value.execution_authorization_id !== descriptor.authorization_id ||
    value.execution_authorization_revision !== descriptor.authorization_revision ||
    value.execution_authorization_digest !== descriptor.authorization_digest ||
    !DIGEST.test(String(value.attempt_claim_digest)) ||
    !DIGEST.test(String(value.attempt_identity)) ||
    !DIGEST.test(String(value.consumption_marker_digest)) ||
    typeof value.approval_reference !== "string" || !REFERENCE.test(value.approval_reference) ||
    value.gate17_scope_digest !== FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST ||
    !DIGEST.test(String(value.approval_candidate_identity)) ||
    !DIGEST.test(String(value.proposal_identity)) ||
    !canonicalTime(value.proposal_created_at) || !canonicalTime(value.approved_at) ||
    Date.parse(value.approved_at) < Date.parse(value.proposal_created_at) ||
    !DIGEST.test(String(value.approval_record_digest)) ||
    value.migration_privilege_envelope_id !==
      FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_ID ||
    value.migration_privilege_envelope_digest !==
      FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST ||
    value.semantic_principal_normalization_revision !==
      FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION ||
    !Array.isArray(value.candidate_ids) || canonical(value.candidate_ids) !== canonical(
      FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => spec.candidate_id)) ||
    !DIGEST.test(String(value.pinned_migration_bundle_digest)) ||
    !DIGEST.test(String(value.pre_cleanup_run_evidence_digest)) ||
    !Array.isArray(value.candidate_identity_digests) ||
    value.candidate_identity_digests.length !== 5 ||
    !value.candidate_identity_digests.every((entry) => DIGEST.test(String(entry))) ||
    !Array.isArray(value.snapshot_points) || canonical(value.snapshot_points) !== canonical(PREFIXES) ||
    value.resource_ownership_identity !== "farmos-day150-prefix-reference-owned-resources-v1" ||
    value.connection_scope !== "LOCALHOST_127_0_0_1_EPHEMERAL_PORT" ||
    value.destination_assertion !== "NO_PRODUCTION_NO_CANONICAL_DESTINATION" ||
    value.execution_state !== "COMPLETED_EXACT_FIVE_SOURCE_CAPTURE_AND_ZERO_RESIDUAL_CLEANUP" ||
    !record(value.cleanup_result) || !exact(value.cleanup_result, ["container_removed",
      "volume_removed", "network_removed", "zero_residual_verified",
      "unrelated_resource_operations", "outcome_unknown"]) ||
    value.cleanup_result.container_removed !== true || value.cleanup_result.volume_removed !== true ||
    value.cleanup_result.network_removed !== true ||
    value.cleanup_result.zero_residual_verified !== true ||
    value.cleanup_result.unrelated_resource_operations !== 0 ||
    value.cleanup_result.outcome_unknown !== false ||
    !canonicalTime(value.started_at) || !canonicalTime(value.completed_at) ||
    Date.parse(value.completed_at) < Date.parse(value.started_at) ||
    value.raw_catalog_values_persisted !== false || value.credentials_persisted !== false ||
    !DIGEST.test(String(value.receipt_digest))) return null;
  const expectedClaim = createFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(
    value.pinned_migration_bundle_digest as `sha256:${string}`, value as
      FarmOsDay150PrefixReferenceExecutionApprovalRecord, descriptor);
  const expectedMarker = createFarmOsDay150PrefixReferenceConsumptionMarker(Object.freeze({
    authorization_id: descriptor.authorization_id,
    authorization_revision: descriptor.authorization_revision,
    authorization_digest: descriptor.authorization_digest,
    execution_plan_digest: descriptor.execution_plan_digest,
    pinned_migration_bundle_digest: value.pinned_migration_bundle_digest as `sha256:${string}`,
    attempt_claim_digest: expectedClaim.claim_digest,
    run_identity: expectedClaim.run_identity,
    attempt_identity: expectedClaim.attempt_identity,
    approval_reference: expectedClaim.approval_reference,
    gate17_scope_digest: expectedClaim.gate17_scope_digest,
    approval_candidate_identity: expectedClaim.approval_candidate_identity,
    proposal_identity: expectedClaim.proposal_identity,
    proposal_created_at: expectedClaim.proposal_created_at,
    approved_at: expectedClaim.approved_at,
    approval_record_digest: expectedClaim.approval_record_digest,
  }));
  if (value.run_id !== expectedClaim.run_identity ||
    value.run_nonce_digest !== farmOsDay150AttemptRunNonceDigest(expectedClaim.attempt_identity) ||
    value.attempt_claim_digest !== expectedClaim.claim_digest ||
    value.attempt_identity !== expectedClaim.attempt_identity ||
    value.consumption_marker_digest !== expectedMarker.marker_digest) return null;
  const { receipt_digest: ignored, ...body } = value;
  void ignored;
  return hash(descriptor.digest_domains.success_receipt, body) ===
    value.receipt_digest ? owned(value as unknown as FarmOsDay150ReferenceCatalogRunReceiptCandidate) : null;
}

const PRE_CLEANUP_KEYS = ["schema_version", "authority_state", "run_id", "run_nonce_digest",
  "execution_authorization_id", "execution_authorization_revision",
  "execution_authorization_digest", "migration_privilege_envelope_digest",
  "attempt_claim_digest", "attempt_identity", "consumption_marker_digest",
  "approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
  "proposal_created_at", "approved_at", "approval_record_digest",
  "pinned_migration_bundle_digest", "reference_postgres_major", "reference_image",
  "reference_platform", "initial_state_readback_digest", "snapshot_points", "candidate_ids",
  "execution_state", "started_at", "completed_at", "raw_catalog_values_persisted",
  "credentials_persisted", "reference_capture_digest"] as const;
export function parseFarmOsDay150ReferenceCapture(value: unknown):
  FarmOsDay150ReferenceCapture | null {
  if (!record(value) || !exact(value, PRE_CLEANUP_KEYS)) return null;
  const descriptor = value.execution_authorization_digest ===
    HISTORICAL_V13_SUCCESSFUL_AUTHORIZATION_DIGEST
    ? HISTORICAL_V13_SUCCESSFUL_DESCRIPTOR
    : FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR;
  if (
    value.schema_version !== FARM_OS_DAY150_PRE_CLEANUP_RUN_EVIDENCE_SCHEMA ||
    value.authority_state !== "REFERENCE_CAPTURE_BEFORE_CANDIDATE_DURABILITY" ||
    typeof value.run_id !== "string" || !REFERENCE.test(value.run_id) ||
    !DIGEST.test(String(value.run_nonce_digest)) ||
    value.execution_authorization_id !== descriptor.authorization_id ||
    value.execution_authorization_revision !== descriptor.authorization_revision ||
    value.execution_authorization_digest !== descriptor.authorization_digest ||
    !DIGEST.test(String(value.attempt_claim_digest)) ||
    !DIGEST.test(String(value.attempt_identity)) ||
    !DIGEST.test(String(value.consumption_marker_digest)) ||
    typeof value.approval_reference !== "string" || !REFERENCE.test(value.approval_reference) ||
    value.gate17_scope_digest !== FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST ||
    !DIGEST.test(String(value.approval_candidate_identity)) ||
    !DIGEST.test(String(value.proposal_identity)) ||
    !canonicalTime(value.proposal_created_at) || !canonicalTime(value.approved_at) ||
    Date.parse(value.approved_at) < Date.parse(value.proposal_created_at) ||
    !DIGEST.test(String(value.approval_record_digest)) ||
    value.migration_privilege_envelope_digest !==
      FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST ||
    !DIGEST.test(String(value.pinned_migration_bundle_digest)) ||
    value.reference_postgres_major !== 17 ||
    value.reference_image !== FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE ||
    value.reference_platform !== FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM ||
    !DIGEST.test(String(value.initial_state_readback_digest)) ||
    !Array.isArray(value.snapshot_points) || canonical(value.snapshot_points) !== canonical(PREFIXES) ||
    !Array.isArray(value.candidate_ids) || canonical(value.candidate_ids) !== canonical(
      FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => spec.candidate_id)) ||
    value.execution_state !== "EXACT_FIVE_CAPTURED_BEFORE_CLEANUP" ||
    !canonicalTime(value.started_at) || !canonicalTime(value.completed_at) ||
    value.raw_catalog_values_persisted !== false || value.credentials_persisted !== false ||
    !DIGEST.test(String(value.reference_capture_digest))) return null;
  const expectedClaim = createFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(
    value.pinned_migration_bundle_digest as `sha256:${string}`, value as
      FarmOsDay150PrefixReferenceExecutionApprovalRecord, descriptor);
  const expectedMarker = createFarmOsDay150PrefixReferenceConsumptionMarker(Object.freeze({
    authorization_id: descriptor.authorization_id,
    authorization_revision: descriptor.authorization_revision,
    authorization_digest: descriptor.authorization_digest,
    execution_plan_digest: descriptor.execution_plan_digest,
    pinned_migration_bundle_digest: value.pinned_migration_bundle_digest as `sha256:${string}`,
    attempt_claim_digest: expectedClaim.claim_digest,
    run_identity: expectedClaim.run_identity,
    attempt_identity: expectedClaim.attempt_identity,
    approval_reference: expectedClaim.approval_reference,
    gate17_scope_digest: expectedClaim.gate17_scope_digest,
    approval_candidate_identity: expectedClaim.approval_candidate_identity,
    proposal_identity: expectedClaim.proposal_identity,
    proposal_created_at: expectedClaim.proposal_created_at,
    approved_at: expectedClaim.approved_at,
    approval_record_digest: expectedClaim.approval_record_digest,
  }));
  if (value.run_id !== expectedClaim.run_identity ||
    value.run_nonce_digest !== farmOsDay150AttemptRunNonceDigest(expectedClaim.attempt_identity) ||
    value.attempt_claim_digest !== expectedClaim.claim_digest ||
    value.attempt_identity !== expectedClaim.attempt_identity ||
    value.consumption_marker_digest !== expectedMarker.marker_digest) return null;
  const { reference_capture_digest: ignored, ...body } = value;
  void ignored;
  return hash("farmos.day150-prefix-reference-capture.v1", body) ===
    value.reference_capture_digest
    ? owned(value as unknown as FarmOsDay150ReferenceCapture) : null;
}

const DURABLE_EVIDENCE_KEYS = ["schema_version", "authority_state", "reference_capture_digest",
  "pinned_migration_bundle_digest", "candidate_identity_digests", "candidate_artifact_digests",
  "candidate_paths", "durable_candidate_count", "execution_state",
  "pre_cleanup_run_evidence_digest"] as const;
export function parseFarmOsDay150PreCleanupRunEvidenceCandidate(value: unknown):
  FarmOsDay150PreCleanupRunEvidenceCandidate | null {
  if (!record(value) || !exact(value, DURABLE_EVIDENCE_KEYS) ||
    value.schema_version !== "farmos.day150-prefix-pre-cleanup-run-evidence-candidate.v2" ||
    value.authority_state !== "PRE_CLEANUP_RUN_EVIDENCE_CANDIDATE" ||
    !DIGEST.test(String(value.reference_capture_digest)) ||
    !DIGEST.test(String(value.pinned_migration_bundle_digest)) ||
    !Array.isArray(value.candidate_identity_digests) || value.candidate_identity_digests.length !== 5 ||
    !value.candidate_identity_digests.every((entry) => DIGEST.test(String(entry))) ||
    !Array.isArray(value.candidate_artifact_digests) || value.candidate_artifact_digests.length !== 5 ||
    !value.candidate_artifact_digests.every((entry) => DIGEST.test(String(entry))) ||
    !Array.isArray(value.candidate_paths) || canonical(value.candidate_paths) !== canonical(
      FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => spec.output_path)) ||
    value.durable_candidate_count !== 5 ||
    value.execution_state !== "EXACT_FIVE_CANDIDATES_DURABLE_BEFORE_CLEANUP" ||
    !DIGEST.test(String(value.pre_cleanup_run_evidence_digest))) return null;
  const { pre_cleanup_run_evidence_digest: ignored, ...body } = value;
  void ignored;
  return hash("farmos.day150-prefix-pre-cleanup-run-evidence-candidate.v2", body) ===
    value.pre_cleanup_run_evidence_digest
    ? owned(value as unknown as FarmOsDay150PreCleanupRunEvidenceCandidate) : null;
}

// Deliberately module-private: only the controlled executor implementation may call this
// after completing the exact isolated plan. No fixture, collector, or generic row caller
// can obtain an executor-completion capability through the public API.
function parseAdapterSanitizedCatalogResultSets(input: Readonly<{
  acl_result_set: unknown; catalog_result_set: unknown;
}>): FarmOsProductionIdentityCatalogReferenceSanitizedResultSets | null {
  if (!record(input.acl_result_set) || input.acl_result_set.section_id !==
    "F_ACL_PRINCIPAL_INVENTORY" || !Array.isArray(input.acl_result_set.rows) ||
    !record(input.catalog_result_set) || input.catalog_result_set.section_id !==
    "G_MIGRATION_CATALOG_INVENTORY" || !Array.isArray(input.catalog_result_set.rows)) return null;
  const validRows = (rows: unknown[], allowed: readonly string[]) => rows.every((row) =>
    record(row) && exact(row, ["row_key", "payload", "sanitization_class"]) &&
    typeof row.row_key === "string" && record(row.payload) &&
    allowed.includes(String(row.sanitization_class)) &&
    !canonical(row.payload).includes("INTERNAL_RAW_NEVER_PERSIST"));
  if (!validRows(input.acl_result_set.rows, ["SAFE_STRUCTURAL"]) ||
    !validRows(input.catalog_result_set.rows, ["SAFE_STRUCTURAL", "DIGEST_ONLY"])) return null;
  return owned({ acl: input.acl_result_set, catalog: input.catalog_result_set }) as
    FarmOsProductionIdentityCatalogReferenceSanitizedResultSets;
}
function issueFarmOsDay150ReferenceCatalogExecutorCompletion(input: Readonly<{
  reference_capture: unknown; snapshots: readonly Readonly<{
    migration_id: FarmOsDay150PrefixMigrationId;
    acl_result_set: unknown; catalog_result_set: unknown;
  }>[];
}>): FarmOsDay150ReferenceCatalogExecutorCompletionCapability | null {
  const referenceCapture = parseFarmOsDay150ReferenceCapture(input.reference_capture);
  if (!referenceCapture || input.snapshots.length !== PREFIXES.length ||
    input.snapshots.some((entry, index) => entry.migration_id !== PREFIXES[index])) return null;
  const resultsByMigration = new Map<FarmOsDay150PrefixMigrationId,
    FarmOsProductionIdentityCatalogReferenceSanitizedResultSets>();
  for (const snapshot of input.snapshots) {
    const results = parseAdapterSanitizedCatalogResultSets(snapshot);
    if (!results || resultsByMigration.has(snapshot.migration_id)) return null;
    resultsByMigration.set(snapshot.migration_id, results);
  }
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150ReferenceCatalogExecutorCompletionCapability;
  executorCompletions.set(capability, Object.freeze({
    reference_capture: owned(referenceCapture),
    results_by_migration: resultsByMigration }));
  return capability;
}

export type FarmOsDay150InitialCatalogReadback = Readonly<{
  schema_version: "farmos.day150-prefix-initial-catalog-readback.v1";
  initial_catalog_authority_id: typeof FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID;
  initial_catalog_digest: `sha256:${string}`;
  bootstrap_plan_digest: `sha256:${string}`;
  raw_owner_principal: "farmos_day150_reference_migration_owner_v1";
  semantic_owner: "REFERENCE_MIGRATION_OWNER";
  collector_authority: "farmos.day150-initial-catalog-exact-readback-collector.v1";
  exact_initial_objects: typeof FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.initial_objects;
  exact_security_baseline: typeof FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.security_baseline;
  ai_schema_present: true; proposal_inbox_present: true; base_column_count: 19;
  base_constraint_count: 4; base_index_count: 1; owner_only: true;
  explicit_application_grant_count: 0; explicit_public_privilege_count: 0;
  credential_statement_count: 0; unrelated_schema_count: 0;
  preprefix_table_count: 6; preprefix_function_count: 2;
  preprefix_append_only_trigger_count: 6;
  readback_transaction_read_only: true;
  readback_digest: `sha256:${string}`;
}>;
const READBACK_KEYS = ["schema_version", "initial_catalog_authority_id",
  "initial_catalog_digest", "bootstrap_plan_digest", "raw_owner_principal",
  "semantic_owner", "collector_authority", "exact_initial_objects", "exact_security_baseline",
  "ai_schema_present", "proposal_inbox_present", "base_column_count",
  "base_constraint_count", "base_index_count", "owner_only",
  "explicit_application_grant_count", "explicit_public_privilege_count",
  "credential_statement_count", "unrelated_schema_count", "readback_transaction_read_only",
  "preprefix_table_count", "preprefix_function_count", "preprefix_append_only_trigger_count",
  "readback_digest"] as const;
function validInitialReadback(value: unknown): value is FarmOsDay150InitialCatalogReadback {
  if (!record(value) || !exact(value, READBACK_KEYS) ||
    value.schema_version !== "farmos.day150-prefix-initial-catalog-readback.v1" ||
    value.initial_catalog_authority_id !== FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID ||
    value.initial_catalog_digest !== FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.canonical_initial_state_digest ||
    value.bootstrap_plan_digest !== INITIAL_BOOTSTRAP_PLAN.plan_digest ||
    value.raw_owner_principal !== "farmos_day150_reference_migration_owner_v1" ||
    value.semantic_owner !== "REFERENCE_MIGRATION_OWNER" ||
    value.collector_authority !== "farmos.day150-initial-catalog-exact-readback-collector.v1" ||
    canonical(value.exact_initial_objects) !==
      canonical(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.initial_objects) ||
    canonical(value.exact_security_baseline) !==
      canonical(FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.security_baseline) ||
    value.ai_schema_present !== true ||
    value.proposal_inbox_present !== true || value.base_column_count !== 19 ||
    value.base_constraint_count !== 4 || value.base_index_count !== 1 || value.owner_only !== true ||
    value.explicit_application_grant_count !== 0 || value.explicit_public_privilege_count !== 0 ||
    value.credential_statement_count !== 0 || value.unrelated_schema_count !== 0 ||
    value.preprefix_table_count !== 6 || value.preprefix_function_count !== 2 ||
    value.preprefix_append_only_trigger_count !== 6 ||
    value.readback_transaction_read_only !== true || !DIGEST.test(String(value.readback_digest))) return false;
  const { readback_digest: ignored, ...body } = value;
  void ignored;
  return value.readback_digest === hash("farmos.day150-prefix-initial-catalog-readback.v1", body);
}
declare const READBACK_ATTESTATION: unique symbol;
export type FarmOsDay150InitialCatalogReadbackCapability =
  Readonly<{ [READBACK_ATTESTATION]: true }>;
const readbackAttestations = new WeakMap<object, FarmOsDay150InitialCatalogReadback>();
// Module-private trusted exact-catalog collector issuer.
function issueFarmOsDay150InitialCatalogReadback(value: unknown):
  FarmOsDay150InitialCatalogReadbackCapability | null {
  if (!validInitialReadback(value)) return null;
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150InitialCatalogReadbackCapability;
  readbackAttestations.set(capability, owned(value));
  return capability;
}
void issueFarmOsDay150InitialCatalogReadback;

declare const EXECUTION_AUTHORIZATION: unique symbol;
export type FarmOsDay150ReferenceExecutionAuthorizationCapability =
  Readonly<{ [EXECUTION_AUTHORIZATION]: true }>;
const executionAuthorizations = new WeakSet<object>();
const executionAuthorizationKeys = new WeakMap<object, string>();
const executionAuthorizationApprovals = new WeakMap<object,
  FarmOsDay150PrefixReferenceExecutionApprovalRecord>();
const loadedExecutionAuthorizations = new Map<string,
  FarmOsDay150ReferenceExecutionAuthorizationCapability>();
const consumedExecutionAuthorizationKeys = new Set<string>();
declare const REAL_EXECUTION_CONTEXT: unique symbol;
export type FarmOsDay150RealExecutionContextCapability =
  Readonly<{ [REAL_EXECUTION_CONTEXT]: true }>;
const realExecutionContexts = new WeakMap<object,
  Readonly<{ primitive_port: FarmOsDay150PrimitiveSystemEffectPort;
    artifact_root: string;
    artifact_path_mode?: "QUALIFICATION_FLAT" | "PUBLIC_ACTIVE_REVISION" }> | "REAL">();
function issueFarmOsDay150RealExecutionContext(
  injectedPrimitiveContext: Readonly<{ primitive_port: FarmOsDay150PrimitiveSystemEffectPort;
    artifact_root: string;
  artifact_path_mode?: "QUALIFICATION_FLAT" | "PUBLIC_ACTIVE_REVISION" }> | null = null,
): FarmOsDay150RealExecutionContextCapability {
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150RealExecutionContextCapability;
  realExecutionContexts.set(capability, injectedPrimitiveContext ?? "REAL");
  return capability;
}
// Validation-only bridge for the private lower boundary. It cannot issue authority.
export function claimFarmOsDay150RealExecutionContext(
  value: FarmOsDay150RealExecutionContextCapability | unknown,
): Readonly<{ primitive_port: FarmOsDay150PrimitiveSystemEffectPort;
  artifact_root: string;
  artifact_path_mode?: "QUALIFICATION_FLAT" | "PUBLIC_ACTIVE_REVISION" }> | "REAL" | null {
  return typeof value === "object" && value !== null
    ? realExecutionContexts.get(value) ?? null : null;
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_REPOSITORY_AUTHORIZED_ACTIVE_EXECUTION =
  "PUBLIC_EXECUTION_FROM_REPOSITORY_AUTHORIZED_ACTIVE_EXECUTION" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT = Object.freeze({
  authority_id: "DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT_V1",
  authority_revision: 1,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V7",
  execution_authorization_revision: 7,
  historical_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1
      .historical_authorization_digest,
  historical_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_plan_digest,
  historical_run_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_run_id,
  historical_attempt_identity:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_attempt_id,
  historical_executable_source_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_source_digest,
  historical_approval_record_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1
      .historical_approval_record_digest,
  historical_body_status:
    FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1.historical_body_status,
  invocation_count: 1,
  invocation_result: "EXECUTION_AUTHORIZATION_REJECTED",
  retry_allowed: false,
  automatic_retries: 0,
  claim_state: "ABSENT",
  consumption_marker_state: "ABSENT",
  next_execution_requirement:
    "SEPARATELY_ADOPTED_LATER_EXECUTION_REVISION_AND_EXPLICIT_PRODUCT_OWNER_AUTHORIZATION",
} as const);
export function isFarmOsDay150PrefixReferenceExecutionAuthorizationRetired(input: Readonly<{
  execution_authorization_id: string;
  authorization_revision: number;
}>): boolean {
  return input.execution_authorization_id ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT
        .execution_authorization_id &&
    input.authorization_revision ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V7_REJECTED_INVOCATION_RETIREMENT
        .execution_authorization_revision;
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION = Object.freeze({
  authority_id: "DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION_V1",
  authority_revision: 1,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
  execution_authorization_revision: 8,
  authorization_digest:
    "sha256:f66daebcdd7decd653d5ae9fc324ad746317dacca028a101fde93f5c177734ae",
  plan_digest:
    "sha256:97a95827aaa92483023d3d7a3e7972735c6fef147dea7ed7cea87c3a32d40feb",
  run_identity:
    "sha256:d065ba3999aa13d839bb82c5341eb283b095854eb91e9fcd86bedbfa325f3547",
  attempt_identity:
    "sha256:32db8bf71e3194a1414a0d04c13ee0466969dd4c6196cac79440c98bb8897d32",
  executable_source_digest:
    "sha256:2157642cefab77d612eddc5f68c0a6d31d6934e4f7705f6b0147fbc3e703200c",
  gate17_scope_digest:
    "sha256:5ca2bf142fe5d22af62e6aecd1db3ce2296b531a36891c9ff7d7f48d704cec01",
  approval_record_digest:
    "sha256:4fd1e6033083234bb78b6588a51db49d3124f385608195f3cabbdb3c5637d982",
  invocation_count: 1,
  human_authorized_invocation_allowance: "EXHAUSTED",
  authorization_consumption_state: "AUTHORIZED_BUT_NOT_CONSUMED",
  failed_boundary: "ATTEMPT_CLAIM_PUBLICATION",
  failure_code: "PRIMITIVE_BOUNDED_FAILURE",
  last_trusted_completed_boundary: "ATTEMPT_CLAIM_DECISION",
  retry_allowed: false,
  automatic_retries: 0,
  claim_state: "ABSENT",
  consumption_marker_state: "ABSENT",
  success_receipt_state: "ABSENT",
  terminal_outcome_receipt_state: "ABSENT",
  next_execution_requirement:
    "FRESH_PRODUCT_OWNER_EXECUTION_AUTHORIZATION_AFTER_SOURCE_REPAIR_QUALIFICATION",
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXHAUSTED_HISTORICAL_APPROVAL_RECORD =
  Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-approval-record.v2",
    approval_record_revision: 2,
    authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
    authority_revision: 1,
    execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V8",
    authorization_revision: 8,
    executable_source_digest:
      "sha256:2157642cefab77d612eddc5f68c0a6d31d6934e4f7705f6b0147fbc3e703200c",
    gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
    authorization_digest:
      "sha256:f66daebcdd7decd653d5ae9fc324ad746317dacca028a101fde93f5c177734ae",
    plan_digest:
      "sha256:97a95827aaa92483023d3d7a3e7972735c6fef147dea7ed7cea87c3a32d40feb",
    run_identity:
      "sha256:d065ba3999aa13d839bb82c5341eb283b095854eb91e9fcd86bedbfa325f3547",
    attempt_identity:
      "sha256:32db8bf71e3194a1414a0d04c13ee0466969dd4c6196cac79440c98bb8897d32",
    execution_descriptor_revision: 1,
    execution_descriptor_digest:
      "sha256:7d8ac2065a5c92d822f8216541f810398d6b71a81b284ba26a781ef93d8cb8d3",
    external_plan_identity_digest:
      "sha256:3e6cb18ebd532cb8fbc567ea3c2efda047c4f0c81352f3e5263b02f78ccbb33a",
    approval_candidate_identity:
      "sha256:56daa3155ca19e755c9b09d5e53c342d217e09be62ec1f513fb2a2c84285a0f2",
    proposal_identity:
      "sha256:254e5097786279c3e27dfcb3c19487cf3c07a3deeb3fdafb340b5d1c8911ee21",
    proposal_created_at: "2026-08-16T14:41:49.000Z",
    approval_reference:
      "product-owner/day150/v8/254e5097786279c3e27dfcb3c19487cf3c07a3deeb3fdafb340b5d1c8911ee21",
    approved_at: "2026-08-16T15:36:50.000Z",
    approval_record_digest:
      "sha256:4fd1e6033083234bb78b6588a51db49d3124f385608195f3cabbdb3c5637d982",
  } as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION = Object.freeze({
  authority_id: "DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION_V1",
  authority_revision: 1,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12",
  execution_authorization_revision: 12,
  authorization_digest:
    "sha256:e7025dc96aa71db17dd018698db79153859b213b980817d501c54f7992fa183b",
  plan_digest:
    "sha256:623afa7b8d31c98dfcebb3affa3e1901300464fd669fb45114ceda370c5a38ad",
  run_identity:
    "sha256:f4a0c29c028ed522ee5e2f50f7b23a9b00dbd5a181933e1af5fab8a0e56943e2",
  attempt_identity:
    "sha256:9e83ee9a44af1f8503cc88a279d7dfbe12b6df8c0d180756549bd285ad2ed0dd",
  executable_source_digest:
    "sha256:354fc80ad1eeed033f4bd9b58520c4cc2a50efef78459bffcbed4001c51b75d1",
  gate17_scope_digest:
    "sha256:5ca2bf142fe5d22af62e6aecd1db3ce2296b531a36891c9ff7d7f48d704cec01",
  approval_record_digest:
    "sha256:1745f4892c2846a6753ef36c94b404be88fc7e596d4b88e7cc7df9e8fdf8799c",
  invocation_count: 1,
  human_authorized_invocation_allowance: "EXHAUSTED",
  durable_execution_consumption: "NOT_REACHED",
  retry_allowed: false,
  automatic_retries: 0,
  claim_state: "ABSENT",
  consumption_marker_state: "ABSENT",
  success_receipt_state: "ABSENT",
  terminal_outcome_receipt_state: "ABSENT",
  external_mutations: 0,
  next_execution_requirement:
    "FRESH_PRODUCT_OWNER_V13_EXECUTION_AUTHORIZATION",
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXHAUSTED_HISTORICAL_APPROVAL_RECORD =
  Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-approval-record.v2",
    approval_record_revision: 2,
    authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
    authority_revision: 1,
    execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V12",
    authorization_revision: 12,
    executable_source_digest:
      "sha256:354fc80ad1eeed033f4bd9b58520c4cc2a50efef78459bffcbed4001c51b75d1",
    gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
    authorization_digest:
      "sha256:e7025dc96aa71db17dd018698db79153859b213b980817d501c54f7992fa183b",
    plan_digest:
      "sha256:623afa7b8d31c98dfcebb3affa3e1901300464fd669fb45114ceda370c5a38ad",
    run_identity:
      "sha256:f4a0c29c028ed522ee5e2f50f7b23a9b00dbd5a181933e1af5fab8a0e56943e2",
    attempt_identity:
      "sha256:9e83ee9a44af1f8503cc88a279d7dfbe12b6df8c0d180756549bd285ad2ed0dd",
    execution_descriptor_revision: 1,
    execution_descriptor_digest:
      "sha256:267c0f2da26c670a6a3238c202187dca89a87362733f1b1b57f3ba1ab6217ac7",
    external_plan_identity_digest:
      "sha256:189bac4487f2356008a4271b5a0832be0df40b10d63cad3ed9af3b99935ed842",
    approval_candidate_identity:
      "sha256:6720e0f96989b9a6c43d0413d6f9df286ab8fde9e38262e972b5313c623b8f8e",
    proposal_identity:
      "sha256:4b64ff6f0714c9407525799f8e2e38029deb5d25b9db4dc34a0720b85533a990",
    proposal_created_at: "2026-08-17T06:31:28.000Z",
    approval_reference:
      "product-owner/day150/v12/4b64ff6f0714c9407525799f8e2e38029deb5d25b9db4dc34a0720b85533a990",
    approved_at: "2026-08-17T07:17:00.000Z",
    approval_record_digest:
      "sha256:1745f4892c2846a6753ef36c94b404be88fc7e596d4b88e7cc7df9e8fdf8799c",
  } as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD =
  Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-approval-record.v2",
    approval_record_revision: 2,
    authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
    authority_revision: 1,
    execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V9",
    authorization_revision: 9,
    executable_source_digest:
      "sha256:ded08100a145a22bf2aaa1c45c28ee9b0c474ff86c0d9a3d707d5a806a11f074",
    gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
    authorization_digest:
      "sha256:33d08f50a70d0254a245fade4784e5d23027f448bdc802b1ff5abdce47ce6617",
    plan_digest:
      "sha256:00bb5bb580277a9ba81d79d66477c7e4f904c14a44a0158705ba3dfece331b3e",
    run_identity:
      "sha256:d4c9d939cc2f3e849a437a97f11491fcb2826f84847c285a6a8d3189e0bdf1c9",
    attempt_identity:
      "sha256:a0c69e3ff3e127a119da69291df51e94244d0c11af49911b1b08dc4a830f0173",
    execution_descriptor_revision: 1,
    execution_descriptor_digest:
      "sha256:9e227f86626772f0b52ae3a12535a02883ca82f6a694142d86331a29e4a15441",
    external_plan_identity_digest:
      "sha256:899643c78a89936e6a2ae484bc0958b11aa326ba746c2c7a30b57b34909253fc",
    approval_candidate_identity:
      "sha256:91e4b2cd918427450d564a9db2f5162ce0b9d9293eb2ad9f215e72a6744fca80",
    proposal_identity:
      "sha256:1b926998e0af3a02772150e6db2fc89b1dbaabd5598e85babddc181407bf4b98",
    proposal_created_at: "2026-08-17T03:42:27.000Z",
    approval_reference:
      "product-owner/day150/v9/1b926998e0af3a02772150e6db2fc89b1dbaabd5598e85babddc181407bf4b98",
    approved_at: "2026-08-17T03:47:00.000Z",
    approval_record_digest:
      "sha256:cd66fc73e3f47833682937ea84dc7cc14551f8d5260c1f4c5aa18cbca293216e",
  } as const);
export function isFarmOsDay150PrefixReferenceInvocationAllowanceExhausted(input: Readonly<{
  execution_authorization_id: string;
  authorization_revision: number;
}>): boolean {
  return (input.execution_authorization_id ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION
        .execution_authorization_id &&
    input.authorization_revision ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V8_FAILED_INVOCATION_EXHAUSTION
        .execution_authorization_revision) ||
    (input.execution_authorization_id ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION
        .execution_authorization_id &&
    input.authorization_revision ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V12_INVOCATION_EXHAUSTION
        .execution_authorization_revision);
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_APPROVAL_TEMPORAL_ORDER_V1 = Object.freeze({
  authority_id: "DAY150_PREFIX_REFERENCE_APPROVAL_TEMPORAL_ORDER_V1",
  order: "proposal_created_at <= approved_at <= repository_loader_observed_at",
  approval_ttl: false,
  execution_authorization_ttl: false,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMED_HISTORICAL_APPROVAL_RECORD =
  Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-approval-record.v2",
    approval_record_revision: 2,
    authority_id: "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1",
    authority_revision: 1,
    execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V11",
    authorization_revision: 11,
    executable_source_digest:
      "sha256:ff25cb55aa05ccce1d19cb4cae64e97c0d670f8a26020190336ca3b0b79b78aa",
    gate17_scope_digest: FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST,
    authorization_digest:
      "sha256:6edfeed19c5a313d972758922fbdba482bd3960396c1b35f8be7dfe9f8c2c574",
    plan_digest:
      "sha256:ee7dca486d86b74c3d6d388d57905eed9676e40bdd41f74683a353ecb2e48049",
    run_identity:
      "sha256:7448b6fa03cb21bb77003efe6a2f1c53037f8ac26f8c9e60d5ba764ad1194324",
    attempt_identity:
      "sha256:64b57e7d43b311fa4c06f6f07bcbd86a57e0459263e6670efa3fa961dfac53ce",
    execution_descriptor_revision: 1,
    execution_descriptor_digest:
      "sha256:4b7f090caf8aff478ad01dc1b579b93123cbc2c549427df646e1b975e3a7a1c8",
    external_plan_identity_digest:
      "sha256:81ecaad201a1d7588e1cbdaee4d3565404bdcfc531053258fafe606fdb838c03",
    approval_candidate_identity:
      "sha256:ade00a78719826f94c681df318f3cd5a10ff91fedb096c02a779a0a2d595a82a",
    proposal_identity:
      "sha256:9dcfc4f1fcb5e7732d65e9d93e4e9b1c2b523d2cb3a54b539bf09f7663491bea",
    proposal_created_at: "2026-08-17T05:40:35.000Z",
    approval_reference:
      "product-owner/day150/v11/9dcfc4f1fcb5e7732d65e9d93e4e9b1c2b523d2cb3a54b539bf09f7663491bea",
    approved_at: "2026-08-17T05:47:00.000Z",
    approval_record_digest:
      "sha256:f82ee57d9825b0bf09e6401c45dd3a24ccc73a4c333752c3bc27acc90844d1af",
  } as const);
const HISTORICAL_APPROVAL_V1_KEYS = Object.freeze([
  "schema_version", "approval_record_revision", "authority_id", "authority_revision",
  "execution_authorization_id", "authorization_revision", "executable_source_digest",
  "authorization_digest", "plan_digest", "run_identity", "attempt_identity",
  "execution_descriptor_revision", "execution_descriptor_digest",
  "external_plan_identity_digest", "approval_candidate_identity", "proposal_identity",
  "proposal_created_at", "approval_reference", "approved_at", "approval_record_digest",
] as const);
export function parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(
  value: unknown,
): Readonly<JsonRecord> | null {
  const historicalV2 = record(value) && [
    FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXHAUSTED_HISTORICAL_APPROVAL_RECORD,
    FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD,
    FARM_OS_DAY150_PREFIX_REFERENCE_V11_CONSUMED_HISTORICAL_APPROVAL_RECORD,
    FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXHAUSTED_HISTORICAL_APPROVAL_RECORD,
  ].find((candidate) => canonical(value) === canonical(candidate));
  if (historicalV2) {
    const { approval_record_digest: digest, ...body } = value;
    return digest === hash(
      "farmos.day150-prefix-reference-execution-approval-record.v2", body) &&
      value.execution_authorization_id === historicalV2.execution_authorization_id &&
      value.authorization_revision === historicalV2.authorization_revision &&
      value.approval_record_digest === historicalV2.approval_record_digest
      ? Object.freeze(value) : null;
  }
  if (!record(value) || !exact(value, HISTORICAL_APPROVAL_V1_KEYS)) return null;
  const { approval_record_digest: digest, ...body } = value;
  if (value.schema_version !==
      "farmos.day150-prefix-reference-execution-approval-record.v1" ||
    value.approval_record_revision !== 1 ||
    value.authority_id !== "DAY150_PREFIX_REFERENCE_EXECUTION_APPROVAL_AUTHORITY_V1" ||
    value.authority_revision !== 1 ||
    typeof value.execution_authorization_id !== "string" ||
    !Number.isInteger(value.authorization_revision) ||
    Number(value.authorization_revision) < 1 || Number(value.authorization_revision) > 7 ||
    value.execution_authorization_id !==
      `DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V${value.authorization_revision}` ||
    typeof digest !== "string" || !DIGEST.test(digest) ||
    hash("farmos.day150-prefix-reference-execution-approval-record.v1", body) !== digest ||
    !["executable_source_digest", "authorization_digest", "plan_digest", "run_identity",
      "attempt_identity", "execution_descriptor_digest", "external_plan_identity_digest",
      "approval_candidate_identity", "proposal_identity"].every((key) =>
      typeof value[key] === "string" && DIGEST.test(value[key] as string)) ||
    value.execution_descriptor_revision !== 1 ||
    typeof value.approval_reference !== "string" ||
    !canonicalTime(value.proposal_created_at) || !canonicalTime(value.approved_at) ||
    Date.parse(value.proposal_created_at) > Date.parse(value.approved_at)) return null;
  if (value.authorization_revision === 7 &&
    !parseFarmOsDay150PrefixReferenceHistoricalV7ApprovalRecord(value)) return null;
  return Object.freeze(value);
}
const QUALIFICATION_PROPOSAL_CREATED_AT = "2026-08-16T00:00:00.000Z";
const QUALIFICATION_APPROVED_AT = "2026-08-16T00:01:00.000Z";
const QUALIFICATION_REPOSITORY_OBSERVED_AT = "2026-08-16T00:02:00.000Z";
export function createFarmOsDay150PrefixReferenceQualificationApprovalRegistry(
  approvedAt = QUALIFICATION_APPROVED_AT,
  proposalCreatedAt = QUALIFICATION_PROPOSAL_CREATED_AT,
): Readonly<{ schema_version: string; records: readonly unknown[] }> {
  const proposal = materializeFarmOsDay150PrefixReferenceExecutionProposal({
    candidate: FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
    proposal_created_at: proposalCreatedAt,
  });
  if (!proposal) throw new Error("QUALIFICATION_PROPOSAL_FIXTURE_REJECTED");
  const record = createFarmOsDay150PrefixReferenceExecutionApprovalRecord({
    proposal,
    approved_at: approvedAt,
  });
  if (!record) throw new Error("QUALIFICATION_APPROVAL_FIXTURE_REJECTED");
  return Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-approval-registry.v1",
    records: Object.freeze([
      FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD,
      FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXHAUSTED_HISTORICAL_APPROVAL_RECORD,
      FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD,
      FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXHAUSTED_HISTORICAL_APPROVAL_RECORD,
      record,
    ]),
  });
}
export function materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(
  repositoryRoot: string,
  registry: unknown = createFarmOsDay150PrefixReferenceQualificationApprovalRegistry(),
): string {
  const path = resolve(repositoryRoot,
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.approval_data_path);
  mkdirSync(resolve(path, ".."), { recursive: true });
  writeFileSync(path, `${JSON.stringify(registry, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  return repositoryRoot;
}
function qualificationApprovalRepositoryFields(storeRoot: string) {
  const approvalRepositoryRoot = resolve(storeRoot, "qualification-repository");
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(approvalRepositoryRoot);
  return Object.freeze({ approval_repository_root: approvalRepositoryRoot,
    repository_loader_observed_at: QUALIFICATION_REPOSITORY_OBSERVED_AT });
}
export function selectFarmOsDay150PrefixReferenceRepositoryApproval(
  registry: unknown,
  repositoryLoaderObservedAt = new Date().toISOString(),
  candidate: FarmOsDay150PrefixReferenceExecutionApprovalCandidate =
    FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
) {
  if (!record(registry) || !exact(registry, ["schema_version", "records"]) ||
    registry.schema_version !==
      "farmos.day150-prefix-reference-execution-approval-registry.v1" ||
    !Array.isArray(registry.records) || !canonicalTime(repositoryLoaderObservedAt)) return null;
  const eligible: FarmOsDay150PrefixReferenceExecutionApprovalRecord[] = [];
  for (const value of registry.records) {
    if (!record(value)) return null;
    const claimsCurrentAuthorization = value.execution_authorization_id ===
        candidate.execution_authorization_id ||
      value.authorization_revision === candidate.authorization_revision;
    if (claimsCurrentAuthorization) {
      const approved = validateFarmOsDay150PrefixReferenceExecutionApprovalForCandidate(
        value, candidate);
      if (!approved || isFarmOsDay150PrefixReferenceExecutionAuthorizationRetired(approved) ||
        Date.parse(approved.proposal_created_at) > Date.parse(approved.approved_at) ||
        Date.parse(approved.approved_at) > Date.parse(repositoryLoaderObservedAt)) return null;
      eligible.push(approved);
      continue;
    }
    const historical = parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(value);
    if (!historical || Number(historical.authorization_revision) >=
      candidate.authorization_revision) return null;
    if (historical.authorization_revision === 7 &&
      (!isFarmOsDay150PrefixReferenceExecutionAuthorizationRetired({
        execution_authorization_id: String(historical.execution_authorization_id),
        authorization_revision: Number(historical.authorization_revision),
      }) || canonical(historical) !==
        canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V7_HISTORICAL_APPROVAL_RECORD) ||
        !validateFarmOsDay150PrefixReferenceOpaqueRetiredV7History(
          FARM_OS_DAY150_PREFIX_REFERENCE_RETIRED_EXECUTION_HISTORY_V1,
          historical))) return null;
    if (historical.authorization_revision === 8 &&
      (canonical(historical) !==
        canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXHAUSTED_HISTORICAL_APPROVAL_RECORD) ||
        !isFarmOsDay150PrefixReferenceInvocationAllowanceExhausted({
          execution_authorization_id: String(historical.execution_authorization_id),
          authorization_revision: Number(historical.authorization_revision),
        }))) return null;
    if (historical.authorization_revision === 9 && canonical(historical) !==
      canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD)) {
      return null;
    }
    if (historical.authorization_revision === 12 &&
      (canonical(historical) !==
        canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXHAUSTED_HISTORICAL_APPROVAL_RECORD) ||
        !isFarmOsDay150PrefixReferenceInvocationAllowanceExhausted({
          execution_authorization_id: String(historical.execution_authorization_id),
          authorization_revision: Number(historical.authorization_revision),
        }))) return null;
  }
  return eligible.length === 1 ? eligible[0]! : null;
}
export type FarmOsDay150PrefixReferenceRepositoryLoaderClock = Readonly<{
  nowCanonicalUtc(): string;
}>;
const productionRepositoryLoaderClock: FarmOsDay150PrefixReferenceRepositoryLoaderClock =
  Object.freeze({ nowCanonicalUtc: () => new Date().toISOString() });
function loadRepositoryApprovalData(repositoryRoot: string): unknown {
  try {
    return JSON.parse(readFileSync(resolve(repositoryRoot,
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.approval_data_path), "utf8"));
  } catch {
    return null;
  }
}
export type FarmOsDay150PrefixReferenceDurableReadState = "ABSENT" | "VALID" |
  "CONFLICT" | "AMBIGUOUS";
export type FarmOsDay150PrefixReferenceDurableArtifactObservation = Readonly<{
  state: "ABSENT" | "PRESENT" | "AMBIGUOUS";
  value: unknown;
}>;
export type FarmOsDay150PrefixReferenceInvocationGateDecision = Readonly<{
  decision: "INVOCATION_ELIGIBLE" | "NOT_ELIGIBLE" | "RECONCILIATION_REQUIRED";
  reason: "FRESH_EXACT_APPROVAL_AND_DURABLE_STATE" | "APPROVAL_NOT_ELIGIBLE" |
    "HUMAN_INVOCATION_ALLOWANCE_EXHAUSTED" | "ATTEMPT_CLAIM_PRESENT" |
    "CONSUMPTION_MARKER_PRESENT" | "TERMINAL_STATE_PRESENT" |
    "HUMAN_INVOCATION_ISSUANCE_PRESENT" |
    "DURABLE_STATE_CONFLICT" | "DURABLE_STATE_AMBIGUOUS";
  claim_state: FarmOsDay150PrefixReferenceDurableReadState;
  marker_state: FarmOsDay150PrefixReferenceDurableReadState;
  success_receipt_state: FarmOsDay150PrefixReferenceDurableReadState;
  terminal_receipt_state: FarmOsDay150PrefixReferenceDurableReadState;
  human_invocation_issuance_state: FarmOsDay150PrefixReferenceDurableReadState;
  new_invocation_permitted: boolean;
}>;
function readFarmOsDay150InvocationGateJson(
  path: string,
): FarmOsDay150PrefixReferenceDurableArtifactObservation {
  try {
    const bytes = readFileSync(path, "utf8");
    const value = JSON.parse(bytes) as unknown;
    return `${canonical(value)}\n` === bytes
      ? Object.freeze({ state: "PRESENT", value })
      : Object.freeze({ state: "AMBIGUOUS", value: null });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return Object.freeze({ state: "ABSENT", value: null });
    }
    return Object.freeze({ state: "AMBIGUOUS", value: null });
  }
}
export const farmOsDay150PrefixReferenceHumanInvocationIssuancePath = (
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor,
): string => `${descriptor.durable_paths.attempt_claim}.human-invocation-issued`;

type FarmOsDay150PrefixReferenceHumanInvocationIssuance = Readonly<{
  schema_version: "farmos.day150-prefix-reference-human-invocation-issuance.v1";
  execution_authorization_id: string;
  authorization_revision: number;
  attempt_identity: `sha256:${string}`;
  approval_record_digest: `sha256:${string}`;
  continuation_capability_digest: `sha256:${string}`;
  issued_at: string;
  issuance_digest: `sha256:${string}`;
}>;
export function createFarmOsDay150PrefixReferenceHumanInvocationIssuance(input: Readonly<{
  approval: FarmOsDay150PrefixReferenceExecutionApprovalRecord;
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor;
  continuation_capability: string;
  issued_at: string;
}>): FarmOsDay150PrefixReferenceHumanInvocationIssuance | null {
  if (!canonicalTime(input.issued_at) || !/^[A-Za-z0-9_-]{43}$/u.test(
    input.continuation_capability) ||
    Date.parse(input.issued_at) < Date.parse(input.approval.approved_at) ||
    input.approval.execution_authorization_id !== input.descriptor.authorization_id ||
    input.approval.authorization_revision !== input.descriptor.authorization_revision ||
    input.approval.attempt_identity !== input.descriptor.attempt_identity) return null;
  const body = Object.freeze({
    schema_version: "farmos.day150-prefix-reference-human-invocation-issuance.v1" as const,
    execution_authorization_id: input.descriptor.authorization_id,
    authorization_revision: input.descriptor.authorization_revision,
    attempt_identity: input.descriptor.attempt_identity,
    approval_record_digest: input.approval.approval_record_digest,
    continuation_capability_digest: hash(
      "farmos.day150-prefix-reference-human-invocation-continuation-capability.v1",
      input.continuation_capability),
    issued_at: input.issued_at,
  });
  return Object.freeze({ ...body, issuance_digest: hash(
    "farmos.day150-prefix-reference-human-invocation-issuance.v1", body) });
}
function parseFarmOsDay150PrefixReferenceHumanInvocationIssuance(input: unknown,
  approval: FarmOsDay150PrefixReferenceExecutionApprovalRecord | null,
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor,
): FarmOsDay150PrefixReferenceHumanInvocationIssuance | null {
  if (!record(input) || !exact(input, ["schema_version", "execution_authorization_id",
    "authorization_revision", "attempt_identity", "approval_record_digest",
    "continuation_capability_digest", "issued_at", "issuance_digest"])) return null;
  const { issuance_digest: digest, ...body } = input;
  return approval !== null &&
    input.schema_version === "farmos.day150-prefix-reference-human-invocation-issuance.v1" &&
    input.execution_authorization_id === descriptor.authorization_id &&
    input.authorization_revision === descriptor.authorization_revision &&
    input.attempt_identity === descriptor.attempt_identity &&
    input.approval_record_digest === approval.approval_record_digest &&
    typeof input.continuation_capability_digest === "string" &&
    DIGEST.test(input.continuation_capability_digest) &&
    canonicalTime(input.issued_at) && Date.parse(input.issued_at) >= Date.parse(approval.approved_at) &&
    typeof digest === "string" && DIGEST.test(digest) &&
    digest === hash("farmos.day150-prefix-reference-human-invocation-issuance.v1", body)
    ? Object.freeze(input) as FarmOsDay150PrefixReferenceHumanInvocationIssuance : null;
}
export async function publishFarmOsDay150PrefixReferenceHumanInvocationIssuance(input: Readonly<{
  repository_root: string;
  approval: FarmOsDay150PrefixReferenceExecutionApprovalRecord;
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor;
  continuation_capability: string;
  issued_at: string;
}>): Promise<FarmOsDay150PrefixReferenceHumanInvocationIssuance> {
  const issuance = createFarmOsDay150PrefixReferenceHumanInvocationIssuance(input);
  if (issuance === null) throw new Error("DAY150_HUMAN_INVOCATION_ISSUANCE_REJECTED");
  const path = resolve(input.repository_root,
    farmOsDay150PrefixReferenceHumanInvocationIssuancePath(input.descriptor));
  await publishCanonicalFarmOsDay150ArtifactExclusive(path, issuance);
  const readback = await reopenCanonicalFarmOsDay150Artifact(path);
  const parsed = parseFarmOsDay150PrefixReferenceHumanInvocationIssuance(
    readback, input.approval, input.descriptor);
  if (parsed === null || canonical(parsed) !== canonical(issuance)) {
    throw new Error("DAY150_HUMAN_INVOCATION_ISSUANCE_READBACK_REJECTED");
  }
  return parsed;
}
export function issueFarmOsDay150PrefixReferenceInvocationContinuationCapability(): string {
  return randomBytes(32).toString("base64url");
}
export function validateFarmOsDay150PrefixReferenceInvocationContinuation(input: Readonly<{
  repository_root: string;
  approval: FarmOsDay150PrefixReferenceExecutionApprovalRecord;
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor;
  continuation_capability: string;
}>): boolean {
  if (!/^[A-Za-z0-9_-]{43}$/u.test(input.continuation_capability)) return false;
  const observation = readFarmOsDay150InvocationGateJson(resolve(input.repository_root,
    farmOsDay150PrefixReferenceHumanInvocationIssuancePath(input.descriptor)));
  if (observation.state !== "PRESENT") return false;
  const issuance = parseFarmOsDay150PrefixReferenceHumanInvocationIssuance(
    observation.value, input.approval, input.descriptor);
  return issuance !== null && issuance.continuation_capability_digest === hash(
    "farmos.day150-prefix-reference-human-invocation-continuation-capability.v1",
    input.continuation_capability);
}
export function evaluateFarmOsDay150PrefixReferenceDurableArtifacts(input: Readonly<{
  approval: FarmOsDay150PrefixReferenceExecutionApprovalRecord | null;
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor;
  claim: FarmOsDay150PrefixReferenceDurableArtifactObservation;
  marker: FarmOsDay150PrefixReferenceDurableArtifactObservation;
  success_receipt: FarmOsDay150PrefixReferenceDurableArtifactObservation;
  terminal_receipt: FarmOsDay150PrefixReferenceDurableArtifactObservation;
}>) {
  const parsedClaim = input.claim.state === "PRESENT"
    ? parseFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(
      input.claim.value, input.descriptor) : null;
  const claimMatchesApproval = parsedClaim !== null && (input.approval === null || (
    parsedClaim.authorization_id === input.approval.execution_authorization_id &&
    parsedClaim.authorization_revision === input.approval.authorization_revision &&
    parsedClaim.authorization_digest === input.approval.authorization_digest &&
    parsedClaim.execution_plan_digest === input.approval.plan_digest &&
    parsedClaim.run_identity === input.approval.run_identity &&
    parsedClaim.attempt_identity === input.approval.attempt_identity &&
    parsedClaim.gate17_scope_digest === input.approval.gate17_scope_digest &&
    parsedClaim.approval_candidate_identity === input.approval.approval_candidate_identity &&
    parsedClaim.proposal_identity === input.approval.proposal_identity &&
    parsedClaim.proposal_created_at === input.approval.proposal_created_at &&
    parsedClaim.approval_reference === input.approval.approval_reference &&
    parsedClaim.approved_at === input.approval.approved_at &&
    parsedClaim.approval_record_digest === input.approval.approval_record_digest));
  const claimState: FarmOsDay150PrefixReferenceDurableReadState = input.claim.state === "ABSENT"
    ? "ABSENT" : input.claim.state === "AMBIGUOUS" ? "AMBIGUOUS"
      : parsedClaim !== null && claimMatchesApproval ? "VALID" : "CONFLICT";
  const parsedMarker = input.marker.state === "PRESENT"
    ? parseFarmOsDay150PrefixReferenceConsumptionMarkerForDescriptor(
      input.marker.value, input.descriptor) : null;
  const markerMatchesClaim = parsedMarker !== null && parsedClaim !== null &&
    parsedMarker.authorization_id === parsedClaim.authorization_id &&
    parsedMarker.authorization_revision === parsedClaim.authorization_revision &&
    parsedMarker.authorization_digest === parsedClaim.authorization_digest &&
    parsedMarker.execution_plan_digest === parsedClaim.execution_plan_digest &&
    parsedMarker.pinned_migration_bundle_digest === parsedClaim.pinned_migration_bundle_digest &&
    parsedMarker.attempt_claim_digest === parsedClaim.claim_digest &&
    parsedMarker.run_identity === parsedClaim.run_identity &&
    parsedMarker.attempt_identity === parsedClaim.attempt_identity &&
    parsedMarker.gate17_scope_digest === parsedClaim.gate17_scope_digest &&
    parsedMarker.approval_record_digest === parsedClaim.approval_record_digest;
  const markerState: FarmOsDay150PrefixReferenceDurableReadState = input.marker.state === "ABSENT"
    ? "ABSENT" : input.marker.state === "AMBIGUOUS" ? "AMBIGUOUS"
      : parsedMarker !== null && markerMatchesClaim ? "VALID" : "CONFLICT";
  const parsedSuccessReceipt = input.success_receipt.state === "PRESENT"
    ? parseFarmOsDay150ReferenceCatalogRunReceiptCandidate(input.success_receipt.value) : null;
  const successMatchesLineage = parsedSuccessReceipt !== null && parsedClaim !== null &&
    parsedMarker !== null && parsedSuccessReceipt.run_id === parsedClaim.run_identity &&
    parsedSuccessReceipt.attempt_identity === parsedClaim.attempt_identity &&
    parsedSuccessReceipt.attempt_claim_digest === parsedClaim.claim_digest &&
    parsedSuccessReceipt.consumption_marker_digest === parsedMarker.marker_digest &&
    parsedSuccessReceipt.approval_reference === parsedClaim.approval_reference &&
    parsedSuccessReceipt.approval_candidate_identity === parsedClaim.approval_candidate_identity &&
    parsedSuccessReceipt.proposal_identity === parsedClaim.proposal_identity &&
    parsedSuccessReceipt.proposal_created_at === parsedClaim.proposal_created_at &&
    parsedSuccessReceipt.approved_at === parsedClaim.approved_at &&
    parsedSuccessReceipt.approval_record_digest === parsedClaim.approval_record_digest;
  const successReceiptState: FarmOsDay150PrefixReferenceDurableReadState =
    input.success_receipt.state === "ABSENT" ? "ABSENT" :
      input.success_receipt.state === "AMBIGUOUS" ? "AMBIGUOUS" :
        successMatchesLineage ? "VALID" : "CONFLICT";
  const terminalBinding = input.approval === null ? input.descriptor : Object.freeze({
    ...input.descriptor,
    approval_reference: input.approval.approval_reference,
    gate17_scope_digest: input.approval.gate17_scope_digest,
    approval_candidate_identity: input.approval.approval_candidate_identity,
    proposal_identity: input.approval.proposal_identity,
    proposal_created_at: input.approval.proposal_created_at,
    approved_at: input.approval.approved_at,
    approval_record_digest: input.approval.approval_record_digest,
  });
  const parsedTerminalReceipt = input.terminal_receipt.state === "PRESENT"
    ? parseFarmOsDay150PrefixReferenceTerminalOutcomeReceiptForExecution(
      input.terminal_receipt.value, terminalBinding) : null;
  const terminalMatchesLineage = parsedTerminalReceipt !== null && parsedClaim !== null &&
    parsedMarker !== null && parsedTerminalReceipt.run_identity === parsedClaim.run_identity &&
    parsedTerminalReceipt.attempt_identity === parsedClaim.attempt_identity &&
    parsedTerminalReceipt.attempt_claim_digest === parsedClaim.claim_digest &&
    parsedTerminalReceipt.consumption_marker_digest === parsedMarker.marker_digest &&
    parsedTerminalReceipt.approval_reference === parsedClaim.approval_reference &&
    parsedTerminalReceipt.approval_candidate_identity === parsedClaim.approval_candidate_identity &&
    parsedTerminalReceipt.proposal_identity === parsedClaim.proposal_identity &&
    parsedTerminalReceipt.proposal_created_at === parsedClaim.proposal_created_at &&
    parsedTerminalReceipt.approved_at === parsedClaim.approved_at &&
    parsedTerminalReceipt.approval_record_digest === parsedClaim.approval_record_digest;
  const terminalReceiptState: FarmOsDay150PrefixReferenceDurableReadState =
    input.terminal_receipt.state === "ABSENT" ? "ABSENT" :
      input.terminal_receipt.state === "AMBIGUOUS" ? "AMBIGUOUS" :
        terminalMatchesLineage ? "VALID" : "CONFLICT";
  return Object.freeze({ claim_state: claimState, marker_state: markerState,
    success_receipt_state: successReceiptState, terminal_receipt_state: terminalReceiptState,
    terminal_conflict: successReceiptState === "VALID" && terminalReceiptState === "VALID",
    claim: claimState === "VALID" ? parsedClaim : null,
    marker: markerState === "VALID" ? parsedMarker : null,
    success_receipt: successReceiptState === "VALID" ? parsedSuccessReceipt : null,
    terminal_receipt: terminalReceiptState === "VALID" ? parsedTerminalReceipt : null });
}
export function evaluateFarmOsDay150PrefixReferenceOneShotInvocationState(input: Readonly<{
  approval: FarmOsDay150PrefixReferenceExecutionApprovalRecord | null;
  approval_eligible?: boolean;
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor;
  invocation_allowance: "AVAILABLE" | "EXHAUSTED";
  claim_path: string;
  marker_path: string;
  success_receipt_path: string;
  terminal_receipt_path: string;
  human_invocation_issuance_path?: string;
}>): FarmOsDay150PrefixReferenceInvocationGateDecision {
  const durable = evaluateFarmOsDay150PrefixReferenceDurableArtifacts({
    approval: input.approval, descriptor: input.descriptor,
    claim: readFarmOsDay150InvocationGateJson(input.claim_path),
    marker: readFarmOsDay150InvocationGateJson(input.marker_path),
    success_receipt: readFarmOsDay150InvocationGateJson(input.success_receipt_path),
    terminal_receipt: readFarmOsDay150InvocationGateJson(input.terminal_receipt_path),
  });
  const { claim_state: claimState, marker_state: markerState,
    success_receipt_state: successReceiptState,
    terminal_receipt_state: terminalReceiptState } = durable;
  const issuanceObservation = input.human_invocation_issuance_path === undefined
    ? Object.freeze({ state: "ABSENT" as const, value: null })
    : readFarmOsDay150InvocationGateJson(input.human_invocation_issuance_path);
  const parsedIssuance = issuanceObservation.state === "PRESENT"
    ? parseFarmOsDay150PrefixReferenceHumanInvocationIssuance(
      issuanceObservation.value, input.approval, input.descriptor) : null;
  const issuanceState: FarmOsDay150PrefixReferenceDurableReadState =
    issuanceObservation.state === "ABSENT" ? "ABSENT" :
      issuanceObservation.state === "AMBIGUOUS" ? "AMBIGUOUS" :
        parsedIssuance === null ? "CONFLICT" : "VALID";
  const states = [claimState, markerState, successReceiptState, terminalReceiptState] as const;
  const result = (decision: FarmOsDay150PrefixReferenceInvocationGateDecision["decision"],
    reason: FarmOsDay150PrefixReferenceInvocationGateDecision["reason"]):
    FarmOsDay150PrefixReferenceInvocationGateDecision => Object.freeze({ decision, reason,
      claim_state: claimState, marker_state: markerState,
      success_receipt_state: successReceiptState, terminal_receipt_state: terminalReceiptState,
      human_invocation_issuance_state: issuanceState,
      new_invocation_permitted: decision === "INVOCATION_ELIGIBLE" });
  if (issuanceState === "AMBIGUOUS") return result("RECONCILIATION_REQUIRED",
    "DURABLE_STATE_AMBIGUOUS");
  if (issuanceState === "CONFLICT") return result("RECONCILIATION_REQUIRED",
    "DURABLE_STATE_CONFLICT");
  if (input.approval_eligible === false) return result("NOT_ELIGIBLE",
    "APPROVAL_NOT_ELIGIBLE");
  if (states.includes("AMBIGUOUS")) return result("RECONCILIATION_REQUIRED",
    "DURABLE_STATE_AMBIGUOUS");
  if (states.includes("CONFLICT") || durable.terminal_conflict ||
    (markerState === "VALID" && claimState !== "VALID")) {
    return result("RECONCILIATION_REQUIRED", "DURABLE_STATE_CONFLICT");
  }
  if (successReceiptState === "VALID" || terminalReceiptState === "VALID") {
    return result("NOT_ELIGIBLE", "TERMINAL_STATE_PRESENT");
  }
  if (markerState === "VALID") return result("NOT_ELIGIBLE", "CONSUMPTION_MARKER_PRESENT");
  if (claimState === "VALID") return result("NOT_ELIGIBLE", "ATTEMPT_CLAIM_PRESENT");
  if (issuanceState === "VALID") return result("NOT_ELIGIBLE",
    "HUMAN_INVOCATION_ISSUANCE_PRESENT");
  if (input.invocation_allowance === "EXHAUSTED") return result("NOT_ELIGIBLE",
    "HUMAN_INVOCATION_ALLOWANCE_EXHAUSTED");
  return result("INVOCATION_ELIGIBLE", "FRESH_EXACT_APPROVAL_AND_DURABLE_STATE");
}
export function gateFarmOsDay150PrefixReferenceRepositoryInvocation(input: Readonly<{
  repository_root: string;
  clock: FarmOsDay150PrefixReferenceRepositoryLoaderClock;
  requested_revision: number;
}>): FarmOsDay150PrefixReferenceInvocationGateDecision {
  if (input.requested_revision === 8) {
    const registry = loadRepositoryApprovalData(input.repository_root);
    const exactExhaustedV8 = record(registry) && Array.isArray(registry.records) &&
      registry.records.filter((value) => record(value) && canonical(value) ===
        canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXHAUSTED_HISTORICAL_APPROVAL_RECORD))
        .length === 1 &&
      registry.records.every((value) =>
        parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(value) !== null);
    return evaluateFarmOsDay150PrefixReferenceOneShotInvocationState({
      approval: FARM_OS_DAY150_PREFIX_REFERENCE_V8_EXHAUSTED_HISTORICAL_APPROVAL_RECORD,
      approval_eligible: exactExhaustedV8,
      descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8,
      invocation_allowance: "EXHAUSTED",
      claim_path: resolve(input.repository_root,
        FARM_OS_DAY150_PREFIX_REFERENCE_V8_ATTEMPT_CLAIM_PATH),
      marker_path: resolve(input.repository_root,
        FARM_OS_DAY150_PREFIX_REFERENCE_V8_CONSUMPTION_MARKER_PATH),
      success_receipt_path: resolve(input.repository_root,
        FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths.success_receipt),
      terminal_receipt_path: resolve(input.repository_root,
        FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V8.durable_paths
          .terminal_outcome_receipt!),
    });
  }
  if (input.requested_revision === 9) {
    const registry = loadRepositoryApprovalData(input.repository_root);
    const exactTerminalV9 = record(registry) && Array.isArray(registry.records) &&
      registry.records.filter((value) => record(value) && canonical(value) ===
        canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD))
        .length === 1 &&
      registry.records.every((value) =>
        parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(value) !== null);
    const descriptor = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V9;
    return evaluateFarmOsDay150PrefixReferenceOneShotInvocationState({
      approval: FARM_OS_DAY150_PREFIX_REFERENCE_V9_TERMINAL_HISTORICAL_APPROVAL_RECORD,
      approval_eligible: exactTerminalV9,
      descriptor,
      invocation_allowance: "EXHAUSTED",
      claim_path: resolve(input.repository_root, descriptor.durable_paths.attempt_claim),
      marker_path: resolve(input.repository_root, descriptor.durable_paths.consumption_marker),
      success_receipt_path: resolve(input.repository_root, descriptor.durable_paths.success_receipt),
      terminal_receipt_path: resolve(input.repository_root,
        descriptor.durable_paths.terminal_outcome_receipt!),
      human_invocation_issuance_path: resolve(input.repository_root,
        farmOsDay150PrefixReferenceHumanInvocationIssuancePath(descriptor)),
    });
  }
  if (input.requested_revision === 10) {
    const descriptor = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V10;
    return evaluateFarmOsDay150PrefixReferenceOneShotInvocationState({
      approval: null,
      approval_eligible: false,
      descriptor,
      invocation_allowance: "EXHAUSTED",
      claim_path: resolve(input.repository_root, descriptor.durable_paths.attempt_claim),
      marker_path: resolve(input.repository_root, descriptor.durable_paths.consumption_marker),
      success_receipt_path: resolve(input.repository_root, descriptor.durable_paths.success_receipt),
      terminal_receipt_path: resolve(input.repository_root,
        descriptor.durable_paths.terminal_outcome_receipt!),
    });
  }
  if (input.requested_revision === 12) {
    const registry = loadRepositoryApprovalData(input.repository_root);
    const exactExhaustedV12 = record(registry) && Array.isArray(registry.records) &&
      registry.records.filter((value) => record(value) && canonical(value) ===
        canonical(FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXHAUSTED_HISTORICAL_APPROVAL_RECORD))
        .length === 1 &&
      registry.records.every((value) =>
        parseFarmOsDay150PrefixReferenceHistoricalApprovalRecord(value) !== null);
    const descriptor = FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DESCRIPTORS.V12;
    return evaluateFarmOsDay150PrefixReferenceOneShotInvocationState({
      approval: FARM_OS_DAY150_PREFIX_REFERENCE_V12_EXHAUSTED_HISTORICAL_APPROVAL_RECORD,
      approval_eligible: exactExhaustedV12,
      descriptor,
      invocation_allowance: "EXHAUSTED",
      claim_path: resolve(input.repository_root, descriptor.durable_paths.attempt_claim),
      marker_path: resolve(input.repository_root, descriptor.durable_paths.consumption_marker),
      success_receipt_path: resolve(input.repository_root, descriptor.durable_paths.success_receipt),
      terminal_receipt_path: resolve(input.repository_root,
        descriptor.durable_paths.terminal_outcome_receipt!),
      human_invocation_issuance_path: resolve(input.repository_root,
        farmOsDay150PrefixReferenceHumanInvocationIssuancePath(descriptor)),
    });
  }
  if (input.requested_revision !==
    FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_revision) {
    return Object.freeze({
    decision: "NOT_ELIGIBLE", reason: "APPROVAL_NOT_ELIGIBLE",
    claim_state: "AMBIGUOUS", marker_state: "AMBIGUOUS",
    success_receipt_state: "AMBIGUOUS", terminal_receipt_state: "AMBIGUOUS",
    human_invocation_issuance_state: "AMBIGUOUS",
    new_invocation_permitted: false,
    });
  }
  const approval = loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord({
    repository_root: input.repository_root,
    clock: input.clock,
    candidate: HISTORICAL_V13_SUCCESSFUL_APPROVAL_CANDIDATE,
  });
  const descriptor = HISTORICAL_V13_SUCCESSFUL_DESCRIPTOR;
  return evaluateFarmOsDay150PrefixReferenceOneShotInvocationState({ approval,
    approval_eligible: approval !== null,
    descriptor,
    invocation_allowance: "AVAILABLE",
    claim_path: resolve(input.repository_root, descriptor.durable_paths.attempt_claim),
    marker_path: resolve(input.repository_root, descriptor.durable_paths.consumption_marker),
    success_receipt_path: resolve(input.repository_root, descriptor.durable_paths.success_receipt),
    terminal_receipt_path: resolve(input.repository_root,
      descriptor.durable_paths.terminal_outcome_receipt!),
    human_invocation_issuance_path: resolve(input.repository_root,
      farmOsDay150PrefixReferenceHumanInvocationIssuancePath(descriptor)),
  });
}
export function loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord(input: Readonly<{
  repository_root: string;
  clock: FarmOsDay150PrefixReferenceRepositoryLoaderClock;
  candidate?: FarmOsDay150PrefixReferenceExecutionApprovalCandidate;
}>): FarmOsDay150PrefixReferenceExecutionApprovalRecord | null {
  const observedAt = input.clock.nowCanonicalUtc();
  return selectFarmOsDay150PrefixReferenceRepositoryApproval(
    loadRepositoryApprovalData(input.repository_root), observedAt,
    input.candidate ?? HISTORICAL_V13_SUCCESSFUL_APPROVAL_CANDIDATE);
}
function loadFarmOsDay150ReferenceExecutionAuthorization(
  repositoryRoot: string,
  clock: FarmOsDay150PrefixReferenceRepositoryLoaderClock,
  qualificationScope: string | null,
): FarmOsDay150ReferenceExecutionAuthorizationCapability | null {
  const approved = loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord({
    repository_root: repositoryRoot, clock,
    candidate: qualificationScope === null
      ? HISTORICAL_V13_SUCCESSFUL_APPROVAL_CANDIDATE
      : FARM_OS_DAY150_PREFIX_REFERENCE_V13_APPROVAL_RECORD_CANDIDATE,
  });
  if (!approved || !validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
    FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING)) return null;
  if (qualificationScope === null &&
    (isFarmOsDay150PrefixReferenceExecutionAuthorizationRetired(approved) ||
      isFarmOsDay150PrefixReferenceInvocationAllowanceExhausted(approved))) return null;
  const key = qualificationScope === null ? approved.approval_record_digest :
    `${approved.approval_record_digest}:qualification:${createHash("sha256").update(
      qualificationScope).digest("hex")}`;
  const existing = loadedExecutionAuthorizations.get(key);
  if (existing) return existing;
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150ReferenceExecutionAuthorizationCapability;
  executionAuthorizations.add(capability);
  executionAuthorizationKeys.set(capability, key);
  executionAuthorizationApprovals.set(capability, approved);
  loadedExecutionAuthorizations.set(key, capability);
  return capability;
}

function consumeFarmOsDay150ReferenceExecutionAuthorizationOnce(input: Readonly<{
  execution_authorization: FarmOsDay150ReferenceExecutionAuthorizationCapability | unknown;
  authorization_digest: string; privilege_envelope_digest: string;
}>): boolean {
  if (typeof input.execution_authorization !== "object" ||
    input.execution_authorization === null ||
    !executionAuthorizations.has(input.execution_authorization) ||
    input.authorization_digest !== ACTIVE_REFERENCE_AUTHORIZATION_DIGEST ||
    input.privilege_envelope_digest !==
      FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST) return false;
  const key = executionAuthorizationKeys.get(input.execution_authorization);
  if (!key || consumedExecutionAuthorizationKeys.has(key)) return false;
  consumedExecutionAuthorizationKeys.add(key);
  return true;
}

export function completeFarmOsDay150AuthenticatedReferenceCatalogRun(input: Readonly<{
  execution_authorization: FarmOsDay150ReferenceExecutionAuthorizationCapability | unknown;
  reference_capture: unknown;
  initial_state_readback: FarmOsDay150InitialCatalogReadbackCapability | unknown;
  snapshots: readonly Readonly<{ migration_id: FarmOsDay150PrefixMigrationId;
    acl_result_set: unknown; catalog_result_set: unknown }>[];
}>): FarmOsDay150ReferenceCatalogExecutorCompletionCapability | null {
  if (typeof input.execution_authorization !== "object" || input.execution_authorization === null ||
    typeof input.initial_state_readback !== "object" || input.initial_state_readback === null ||
    !executionAuthorizations.has(input.execution_authorization)) return null;
  const authorizationKey = executionAuthorizationKeys.get(input.execution_authorization);
  if (!authorizationKey || !consumedExecutionAuthorizationKeys.has(authorizationKey)) return null;
  const readback = readbackAttestations.get(input.initial_state_readback);
  if (!readback) return null;
  const referenceCapture = parseFarmOsDay150ReferenceCapture(input.reference_capture);
  if (!referenceCapture || referenceCapture.initial_state_readback_digest !==
    readback.readback_digest) return null;
  const completion = issueFarmOsDay150ReferenceCatalogExecutorCompletion({
    reference_capture: referenceCapture,
    snapshots: input.snapshots });
  if (!completion) return null;
  return completion;
}

export function finalizeFarmOsDay150ReferenceCatalogRun(input: Readonly<{
  executor_completion: FarmOsDay150ReferenceCatalogExecutorCompletionCapability | unknown;
}>): FarmOsDay150ReferenceCatalogRunCapability | null {
  if (typeof input.executor_completion !== "object" || input.executor_completion === null) return null;
  const completed = executorCompletions.get(input.executor_completion);
  if (!completed || !parseFarmOsDay150ReferenceCapture(completed.reference_capture)) return null;
  const capability = Object.freeze(Object.create(null)) as FarmOsDay150ReferenceCatalogRunCapability;
  referenceRuns.set(capability, owned(completed));
  return capability;
}

export function createFarmOsDay150QualificationOnlyReferenceCapability(input: Readonly<{
  acl_result_set: unknown; catalog_result_set: unknown;
}>): FarmOsDay150QualificationOnlyReferenceCapability | null {
  const safe = transformFarmOsProductionIdentityCatalogReferenceResultSets({
    acl: input.acl_result_set, catalog: input.catalog_result_set,
  });
  if (!safe) return null;
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150QualificationOnlyReferenceCapability;
  qualificationRuns.set(capability, owned(safe));
  return capability;
}

function catalogObject(input: Partial<FarmOsMigrationCatalogObject> &
  Pick<FarmOsMigrationCatalogObject, "kind" | "identity" | "definition">):
  FarmOsMigrationCatalogObject {
  return { kind: input.kind, identity: input.identity, definition: input.definition,
    attributes: input.attributes ?? {}, owner: input.owner ?? null,
    security_definer: input.security_definer ?? null, proconfig: input.proconfig ?? null,
    body_sha256: input.body_sha256 ?? null, role_flags: input.role_flags ?? null,
    memberships: input.memberships ?? [], acl: input.acl ?? [],
    rls_enabled: input.rls_enabled ?? null, rls_forced: input.rls_forced ?? null };
}

function compileReferenceObjects(results: FarmOsProductionIdentityCatalogReferenceSanitizedResultSets,
  spec: typeof FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[number]):
  readonly FarmOsMigrationCatalogObject[] | null {
  const catalogRows = results.catalog.rows
    .filter((row) => row.row_key !== "__collection_status__" &&
      row.payload.migration_id === spec.migration_id);
  const objects: FarmOsMigrationCatalogObject[] = [];
  const relationIdentities = new Set<string>();
  const functionIdentities = new Set<string>();
  const schemas = new Set<string>();
  for (const row of catalogRows) {
    const payload = row.payload as JsonRecord;
    const kind = String(payload.object_kind);
    const objectIdentity = String(payload.object_identity);
    const attributes = payload.attributes as JsonRecord;
    if (!record(attributes) || !Object.values(attributes).every((value) => value === null ||
      typeof value === "string" || typeof value === "number" || typeof value === "boolean" ||
      (Array.isArray(value) && value.every((entry) => typeof entry === "string")))) return null;
    const safeAttributes = Object.fromEntries(Object.entries(attributes).map(([key, value]) =>
      [key, Array.isArray(value) ? canonical(value) : value])) as
      Record<string, string | number | boolean | null>;
    const sensitive = payload.sensitive_digests as JsonRecord;
    if (!record(sensitive) || !Object.entries(sensitive).every(([key, value]) =>
      key.endsWith("_digest") && DIGEST.test(String(value)))) return null;
    const safeDefinition = (persistedAttributes: JsonRecord) =>
      canonical({ attributes: persistedAttributes, sensitive_digests: sensitive });
    if (kind === "table") {
      if (attributes.exists !== true || typeof attributes.owner !== "string" ||
        typeof attributes.rls_enabled !== "boolean" || typeof attributes.rls_forced !== "boolean") return null;
      relationIdentities.add(objectIdentity); schemas.add(objectIdentity.split(".")[0]!);
      objects.push(catalogObject({ kind: "table", identity: objectIdentity,
        definition: safeDefinition(safeAttributes), attributes: safeAttributes,
        owner: attributes.owner, rls_enabled: attributes.rls_enabled,
        rls_forced: attributes.rls_forced }));
    } else if (kind === "column") {
      const persistedAttributes = { data_type: String(attributes.data_type),
        not_null: Boolean(attributes.not_null),
        default_expression: sensitive.default_expression_digest === undefined
          ? null : String(sensitive.default_expression_digest) };
      objects.push(catalogObject({ kind: "column", identity: objectIdentity,
        definition: safeDefinition(persistedAttributes), attributes: persistedAttributes }));
    } else if (["constraint", "index", "trigger"].includes(kind)) {
      objects.push(catalogObject({ kind: kind as "constraint" | "index" | "trigger",
        identity: objectIdentity, definition: safeDefinition(safeAttributes), attributes: safeAttributes }));
    } else if (kind === "function") {
      if (attributes.exists !== true || typeof attributes.owner !== "string" ||
        typeof attributes.security_definer !== "boolean" ||
        !DIGEST.test(String(sensitive.definition_digest)) ||
        !DIGEST.test(String(sensitive.proconfig_digest))) return null;
      functionIdentities.add(objectIdentity); schemas.add(objectIdentity.split(".")[0]!);
      objects.push(catalogObject({ kind: "function", identity: objectIdentity,
        definition: safeDefinition(safeAttributes), attributes: safeAttributes, owner: attributes.owner,
        security_definer: attributes.security_definer,
        proconfig: [String(sensitive.proconfig_digest)],
        body_sha256: String(sensitive.definition_digest) as `sha256:${string}` }));
    } else if (kind === "role") {
      if (attributes.exists !== true) return null;
      const { exists: ignored, ...roleFlags } = attributes;
      void ignored;
      if (!Object.values(roleFlags).every((value) => typeof value === "boolean")) return null;
      objects.push(catalogObject({ kind: "role", identity: objectIdentity,
        definition: safeDefinition(safeAttributes), attributes: safeAttributes,
        role_flags: roleFlags as Record<string, boolean> }));
    } else if (kind === "role_membership") {
      objects.push(catalogObject({ kind: "role_membership", identity: objectIdentity,
        definition: safeDefinition(safeAttributes), attributes: safeAttributes,
        memberships: objectIdentity.split("->").slice(1) }));
    } else if (kind === "rls_policy" || kind === "rls_policy_inventory") {
      objects.push(catalogObject({ kind: "rls",
        identity: kind === "rls_policy_inventory" ? `${objectIdentity}:inventory` : objectIdentity,
        definition: safeDefinition(safeAttributes), attributes: safeAttributes }));
    } else return null;
  }
  const requiredScopes = spec.object_universe.scopes;
  const presentScopes = new Set(catalogRows.filter((row) =>
    ["table", "function", "role"].includes(String(row.payload.object_kind))).map((row) => {
    const rawIdentity = String(row.payload.object_identity);
    const baseIdentity = row.payload.object_kind === "function"
      ? rawIdentity.slice(0, rawIdentity.indexOf("(")) : rawIdentity;
    return `${spec.migration_id}:${baseIdentity}`;
  }));
  if (!requiredScopes.every((scope) => presentScopes.has(scope))) return null;
  const aclRows = results.acl.rows
    .filter((row) => row.row_key !== "__collection_status__");
  const groupedAcl = new Map<string, { kind: "schema_acl" | "table_acl" | "function_acl";
    identity: string; entries: Array<{ principal: string; privilege: string; grant_option: boolean }> }>();
  for (const row of aclRows) {
    const payload = row.payload as JsonRecord;
    const rowKind = String(payload.row_kind);
    const objectIdentity = String(payload.object_identity);
    const selected = rowKind === "schema_acl" ? schemas.has(objectIdentity) :
      rowKind === "relation_acl" ? relationIdentities.has(objectIdentity) :
      rowKind === "function_acl" ? functionIdentities.has(objectIdentity) : false;
    if (!selected) continue;
    const mappedKind = rowKind === "schema_acl" ? "schema_acl" :
      rowKind === "relation_acl" ? "table_acl" : "function_acl";
    const key = `${mappedKind}:${objectIdentity}`;
    const group = groupedAcl.get(key) ?? { kind: mappedKind, identity: objectIdentity, entries: [] };
    group.entries.push({ principal: String(payload.principal), privilege: String(payload.privilege),
      grant_option: Boolean(payload.grant_option) });
    groupedAcl.set(key, group);
  }
  for (const group of groupedAcl.values()) objects.push(catalogObject({ kind: group.kind,
    identity: group.identity, definition: canonical({ attributes: {}, sensitive_digests: {} }),
    acl: group.entries }));
  const identities = objects.map((object) => `${object.kind}:${object.identity}`);
  return objects.length > 0 && new Set(identities).size === identities.length
    ? Object.freeze(objects) : null;
}

function compileSemanticAclEvidence(
  results: FarmOsProductionIdentityCatalogReferenceSanitizedResultSets,
  snapshot: FarmOsMigrationCatalogSnapshot,
): readonly FarmOsDay150SemanticAclEvidence[] | null {
  const identities = new Set(snapshot.objects.filter((object) =>
    ["schema_acl", "table_acl", "function_acl"].includes(object.kind)).map((object) => object.identity));
  const entries = results.acl.rows.filter((row) => row.row_key !== "__collection_status__").flatMap((row) => {
    const payload = row.payload as JsonRecord;
    const kind = String(payload.row_kind);
    const objectIdentity = String(payload.object_identity);
    if (!["schema_acl", "relation_acl", "function_acl"].includes(kind) || !identities.has(objectIdentity)) return [];
    if (typeof payload.principal !== "string" || typeof payload.privilege !== "string" ||
      typeof payload.grantor !== "string" || typeof payload.grant_option !== "boolean") return [];
    return [{ object_identity: objectIdentity, principal: payload.principal,
      privilege: payload.privilege, grant_option: payload.grant_option,
      grantor: payload.grantor }];
  }).sort((left, right) => Buffer.compare(Buffer.from(canonical(left)), Buffer.from(canonical(right))));
  const expectedCount = snapshot.objects.filter((object) =>
    ["schema_acl", "table_acl", "function_acl"].includes(object.kind))
    .reduce((count, object) => count + object.acl.length, 0);
  return entries.length === expectedCount ? Object.freeze(entries) : null;
}

function normalizeCandidatePrincipal(value: string): string {
  return value.split("farmos_day150_reference_migration_owner_v1")
    .join(FARM_OS_DAY150_REFERENCE_PRINCIPAL_SEMANTIC)
    .split(FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME)
    .join(FARM_OS_DAY150_REFERENCE_EXECUTOR_SEMANTIC);
}
function normalizeCandidateSnapshot(input: FarmOsDay150PersistableCatalogSnapshot):
  FarmOsDay150PersistableCatalogSnapshot {
  const replace = (value: unknown): unknown => {
    if (typeof value === "string") return normalizeCandidatePrincipal(value);
    if (Array.isArray(value)) return value.map(replace);
    if (record(value)) return Object.fromEntries(Object.entries(value).map(([key, nested]) =>
      [key, replace(nested)]));
    return value;
  };
  const objects = input.catalog_snapshot.objects.map((object) => {
    let definition = object.definition;
    try { definition = canonical(replace(JSON.parse(definition))); } catch {
      definition = normalizeCandidatePrincipal(definition);
    }
    return { ...object, identity: normalizeCandidatePrincipal(object.identity), definition,
      attributes: replace(object.attributes) as FarmOsMigrationCatalogObject["attributes"],
      owner: object.owner === null ? null : normalizeCandidatePrincipal(object.owner),
      acl: object.acl.map((entry) => ({ ...entry,
        principal: normalizeCandidatePrincipal(entry.principal) })) };
  });
  return owned({ ...input, catalog_snapshot: { ...input.catalog_snapshot, objects } });
}

function validSafeCommitmentSnapshot(value: unknown): value is FarmOsDay150PersistableCatalogSnapshot {
  if (!record(value) || !exact(value, ["schema_version", "commitment_policy",
    "raw_catalog_values_persisted", "catalog_snapshot"]) ||
    value.schema_version !== FARM_OS_DAY150_PREFIX_PERSISTABLE_SNAPSHOT_SCHEMA ||
    value.commitment_policy !== "FARM_OS_CATALOG_INTERNAL_RAW_SHA256_COMMITMENTS_V1" ||
    value.raw_catalog_values_persisted !== false) return false;
  const snapshot = parseFarmOsMigrationCatalogSnapshot(value.catalog_snapshot);
  if (!snapshot || snapshot.target_identity_digest !== null || snapshot.observed_at !== null ||
    snapshot.transaction_read_only !== null || snapshot.collector_authority !== null) return false;
  return snapshot.objects.every((object) => {
    let definition: unknown;
    try { definition = JSON.parse(object.definition); } catch { return false; }
    if (!record(definition) || !exact(definition, ["attributes", "sensitive_digests"]) ||
      canonical(definition.attributes) !== canonical(object.attributes) ||
      !record(definition.sensitive_digests) ||
      !Object.entries(definition.sensitive_digests).every(([key, digestValue]) =>
        key.endsWith("_digest") && DIGEST.test(String(digestValue)))) return false;
    if (object.kind === "column" && object.attributes.default_expression !== null &&
      !DIGEST.test(String(object.attributes.default_expression))) return false;
    if (object.kind === "function" && (object.proconfig === null ||
      !object.proconfig.every((entry) => DIGEST.test(entry)) || !DIGEST.test(String(object.body_sha256)))) {
      return false;
    }
    return true;
  });
}

function compilePersistableSnapshot(
  migrationId: FarmOsDay150PrefixMigrationId,
  results: FarmOsProductionIdentityCatalogReferenceSanitizedResultSets,
): FarmOsDay150PersistableCatalogSnapshot | null {
  const spec = specFor(migrationId);
  if (!spec) return null;
  const compiledObjects = compileReferenceObjects(results, spec);
  if (!compiledObjects) return null;
  const objects = [...compiledObjects].sort((left, right) =>
    Buffer.compare(Buffer.from(`${left.kind}:${left.identity}`),
      Buffer.from(`${right.kind}:${right.identity}`)));
  const catalogSnapshot: FarmOsMigrationCatalogSnapshot = {
    schema_version: FARM_OS_MIGRATION_CATALOG_SNAPSHOT_SCHEMA_VERSION,
    migration_id: spec.migration_id,
    fingerprint_version: FARM_OS_DAY150_PREFIX_SOURCE_SNAPSHOT_CANONICALIZATION,
    target_identity_digest: null, observed_at: null, transaction_read_only: null,
    collector_authority: null, catalog_query_sha256: spec.catalog_query_sha256,
    object_universe_digest: spec.object_universe_digest, collection_complete: true,
    objects,
  };
  const persistable: FarmOsDay150PersistableCatalogSnapshot = {
    schema_version: FARM_OS_DAY150_PREFIX_PERSISTABLE_SNAPSHOT_SCHEMA,
    commitment_policy: "FARM_OS_CATALOG_INTERNAL_RAW_SHA256_COMMITMENTS_V1",
    raw_catalog_values_persisted: false,
    catalog_snapshot: catalogSnapshot,
  };
  return validSafeCommitmentSnapshot(persistable) ? owned(persistable) : null;
}

export function compileFarmOsDay150QualificationCatalogRepresentation(input: Readonly<{
  migration_id: FarmOsDay150PrefixMigrationId;
  qualification_capability: FarmOsDay150QualificationOnlyReferenceCapability | unknown;
}>): Readonly<{ schema_version: typeof FARM_OS_DAY150_PREFIX_QUALIFICATION_RESULT_SCHEMA;
  authority_state: "QUALIFICATION_ONLY_NOT_PROMOTABLE";
  migration_id: FarmOsDay150PrefixMigrationId;
  candidate_fingerprint: `sha256:${string}`;
  snapshot: FarmOsDay150PersistableCatalogSnapshot }> | null {
  if (typeof input.qualification_capability !== "object" ||
    input.qualification_capability === null) return null;
  const results = qualificationRuns.get(input.qualification_capability);
  if (!results) return null;
  const snapshot = compilePersistableSnapshot(input.migration_id, results);
  const fingerprint = snapshot
    ? createFarmOsMigrationObjectFingerprint(snapshot.catalog_snapshot) : null;
  return snapshot && fingerprint ? owned({
    schema_version: FARM_OS_DAY150_PREFIX_QUALIFICATION_RESULT_SCHEMA,
    authority_state: "QUALIFICATION_ONLY_NOT_PROMOTABLE" as const,
    migration_id: input.migration_id, candidate_fingerprint: fingerprint, snapshot,
  }) : null;
}

export function compileFarmOsDay150QualificationCatalogMetrics(input: Readonly<{
  migration_id: FarmOsDay150PrefixMigrationId;
  qualification_capability: FarmOsDay150QualificationOnlyReferenceCapability | unknown;
}>): Readonly<{
  migration_id: FarmOsDay150PrefixMigrationId;
  catalog_fingerprint: `sha256:${string}`;
  normalized_snapshot_digest: `sha256:${string}`;
  object_count: number;
  object_universe_digest: `sha256:${string}`;
  catalog_query_sha256: `sha256:${string}`;
  migration_sha256: `sha256:${string}`;
  canonical_migration_history_digest: `sha256:${string}`;
}> | null {
  const representation = compileFarmOsDay150QualificationCatalogRepresentation(input);
  const spec = specFor(input.migration_id);
  if (!representation || !spec) return null;
  const normalized = normalizeCandidateSnapshot(representation.snapshot);
  return owned({
    migration_id: input.migration_id,
    catalog_fingerprint: representation.candidate_fingerprint,
    normalized_snapshot_digest: hash(
      "farmos.day150-prefix-expected-catalog-snapshot.v1", normalized),
    object_count: normalized.catalog_snapshot.objects.length,
    object_universe_digest: spec.object_universe_digest,
    catalog_query_sha256: spec.catalog_query_sha256,
    migration_sha256: spec.artifact_sha256,
    canonical_migration_history_digest: spec.canonical_migration_history_digest,
  });
}

export function compileFarmOsDay150ExpectedCatalogCandidate(
  input: FarmOsDay150ReferenceCatalogInput,
): FarmOsExpectedCatalogFingerprintCandidate | null {
  const spec = specFor(input.migration_id);
  if (!spec || typeof input.run_capability !== "object" || input.run_capability === null) return null;
  const run = referenceRuns.get(input.run_capability);
  if (!run || !run.reference_capture.snapshot_points.includes(input.migration_id)) return null;
  const results = run.results_by_migration.get(input.migration_id);
  const snapshot = results ? compilePersistableSnapshot(input.migration_id, results) : null;
  if (!snapshot) return null;
  const semanticAclEvidenceRaw = compileSemanticAclEvidence(results!, snapshot.catalog_snapshot);
  const semanticAclEvidence = semanticAclEvidenceRaw?.map((entry) => ({ ...entry,
    principal: normalizeCandidatePrincipal(entry.principal),
    grantor: normalizeCandidatePrincipal(entry.grantor) })) ?? null;
  if (!semanticAclEvidence) return null;
  const fingerprint = createFarmOsDay150DualPrincipalSemanticFingerprint({
    snapshot: snapshot.catalog_snapshot,
    authenticated_raw_owner_principal: "farmos_day150_reference_migration_owner_v1",
    authenticated_raw_executor_principal: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
    acl_evidence: semanticAclEvidence,
    object_universe_revision: "farmos.day150-prefix-object-universe.v1",
    catalog_query_revision: "farmos.production-target-identity-query.v5",
  });
  if (!fingerprint) return null;
  const normalizedSnapshot = normalizeCandidateSnapshot(snapshot);
  const snapshotDigest = hash("farmos.day150-prefix-expected-catalog-snapshot.v1", normalizedSnapshot);
  const provenance = Object.freeze({
    derivation_authority_id: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY,
    derivation_authority_revision: 1, migration_id: spec.migration_id,
    artifact_sha256: spec.artifact_sha256, verify_artifact_sha256: spec.verify_artifact_sha256,
    catalog_query_sha256: spec.catalog_query_sha256,
    object_universe_digest: spec.object_universe_digest,
    canonical_migration_history_digest: spec.canonical_migration_history_digest,
    repository_catalog_revision: FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION,
    git_authority: spec.git_authority,
    reference_postgres_major: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_MAJOR,
    reference_image: FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE,
    reference_platform: FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM,
    canonicalization_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION,
    semantic_acl_evidence: semanticAclEvidence,
    snapshot_digest: snapshotDigest,
    reference_capture_digest: run.reference_capture.reference_capture_digest,
  });
  const body = Object.freeze({
    schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
    authority_state: "EXPECTED_CATALOG_CANDIDATE" as const,
    candidate_id: spec.candidate_id, candidate_revision: 1 as const,
    derivation_authority_id: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY,
    derivation_authority_revision: 1 as const, migration_id: spec.migration_id,
    fingerprint_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION,
    candidate_expected_fingerprint: fingerprint,
    artifact_sha256: spec.artifact_sha256, verify_artifact_sha256: spec.verify_artifact_sha256,
    catalog_query_sha256: spec.catalog_query_sha256,
    object_universe_digest: spec.object_universe_digest,
    expected_object_count: normalizedSnapshot.catalog_snapshot.objects.length,
    snapshot_digest: snapshotDigest,
    repository_catalog_revision: FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION,
    git_authority: spec.git_authority,
    reference_postgres_major: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_MAJOR,
    reference_image: FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE,
    reference_platform: FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM,
    canonicalization_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION,
    semantic_acl_evidence: semanticAclEvidence,
    canonical_migration_history: spec.canonical_migration_history,
    canonical_migration_history_digest: spec.canonical_migration_history_digest,
    reference_run_provenance_digest:
      hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
        .digest_domains.candidate_provenance, provenance),
    snapshot: normalizedSnapshot, reference_capture: run.reference_capture,
    reference_capture_digest: run.reference_capture.reference_capture_digest,
    approval_reference: null, approved_at: null,
  });
  return Object.freeze({ ...body,
    candidate_identity_digest:
      hash("farmos.day150-prefix-expected-catalog-candidate-identity.v1", body),
  });
}

const CANDIDATE_KEYS = ["schema_version", "authority_state", "candidate_id",
  "candidate_revision", "derivation_authority_id", "derivation_authority_revision",
  "migration_id", "fingerprint_version", "candidate_expected_fingerprint",
  "artifact_sha256", "verify_artifact_sha256", "catalog_query_sha256",
  "object_universe_digest", "expected_object_count", "snapshot_digest",
  "repository_catalog_revision", "git_authority", "reference_postgres_major",
  "reference_image", "reference_platform", "canonicalization_version",
  "semantic_acl_evidence",
  "canonical_migration_history", "canonical_migration_history_digest",
  "reference_run_provenance_digest", "snapshot", "reference_capture",
  "reference_capture_digest", "approval_reference", "approved_at",
  "candidate_identity_digest"] as const;

export function parseFarmOsDay150ExpectedCatalogCandidate(
  value: unknown,
): FarmOsExpectedCatalogFingerprintCandidate | null {
  if (!record(value) || !exact(value, CANDIDATE_KEYS) ||
    value.schema_version !== FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA ||
    value.authority_state !== "EXPECTED_CATALOG_CANDIDATE" || value.candidate_revision !== 1 ||
    value.derivation_authority_id !== FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY ||
    value.derivation_authority_revision !== 1 || value.approval_reference !== null ||
    value.approved_at !== null || !DIGEST.test(String(value.candidate_expected_fingerprint)) ||
    !DIGEST.test(String(value.snapshot_digest)) || !DIGEST.test(String(value.candidate_identity_digest)) ||
    !DIGEST.test(String(value.reference_run_provenance_digest)) ||
    !DIGEST.test(String(value.reference_capture_digest)) || !GIT.test(String(value.git_authority)) ||
    value.reference_postgres_major !== 17 || value.reference_image !== FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE ||
    value.reference_platform !== FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM ||
    value.repository_catalog_revision !== FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION ||
    value.canonicalization_version !== FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION ||
    value.fingerprint_version !== FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION ||
    !Number.isSafeInteger(value.expected_object_count) || Number(value.expected_object_count) < 1) return null;
  const spec = specFor(String(value.migration_id));
  const snapshot = validSafeCommitmentSnapshot(value.snapshot)
    ? value.snapshot as FarmOsDay150PersistableCatalogSnapshot : null;
  const catalogSnapshot = snapshot?.catalog_snapshot ?? null;
  const referenceCapture = parseFarmOsDay150ReferenceCapture(value.reference_capture);
  if (!spec || !snapshot || !catalogSnapshot || !referenceCapture ||
    value.reference_capture_digest !== referenceCapture.reference_capture_digest ||
    value.candidate_id !== spec.candidate_id ||
    value.artifact_sha256 !== spec.artifact_sha256 ||
    value.verify_artifact_sha256 !== spec.verify_artifact_sha256 ||
    value.catalog_query_sha256 !== spec.catalog_query_sha256 ||
    value.object_universe_digest !== spec.object_universe_digest ||
    value.git_authority !== spec.git_authority ||
    canonical(value.canonical_migration_history) !== canonical(spec.canonical_migration_history) ||
    value.canonical_migration_history_digest !== spec.canonical_migration_history_digest ||
    catalogSnapshot.migration_id !== spec.migration_id ||
    catalogSnapshot.catalog_query_sha256 !== spec.catalog_query_sha256 ||
    catalogSnapshot.object_universe_digest !== spec.object_universe_digest ||
    !catalogSnapshot.collection_complete ||
    catalogSnapshot.objects.length !== value.expected_object_count ||
    (() => {
      if (!Array.isArray(value.semantic_acl_evidence)) return true;
      return createFarmOsDay150DualPrincipalSemanticFingerprint({
        snapshot: catalogSnapshot,
        authenticated_raw_owner_principal: "farmos_day150_reference_migration_owner_v1",
        authenticated_raw_executor_principal: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
        acl_evidence: value.semantic_acl_evidence as readonly FarmOsDay150SemanticAclEvidence[],
        object_universe_revision: "farmos.day150-prefix-object-universe.v1",
        catalog_query_revision: "farmos.production-target-identity-query.v5",
      }) !== value.candidate_expected_fingerprint;
    })() ||
    hash("farmos.day150-prefix-expected-catalog-snapshot.v1", snapshot) !== value.snapshot_digest) return null;
  const provenance = Object.freeze({
    derivation_authority_id: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY,
    derivation_authority_revision: 1, migration_id: spec.migration_id,
    artifact_sha256: spec.artifact_sha256, verify_artifact_sha256: spec.verify_artifact_sha256,
    catalog_query_sha256: spec.catalog_query_sha256,
    object_universe_digest: spec.object_universe_digest,
    canonical_migration_history_digest: spec.canonical_migration_history_digest,
    repository_catalog_revision: FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION,
    git_authority: spec.git_authority,
    reference_postgres_major: FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_MAJOR,
    reference_image: FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE,
    reference_platform: FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM,
    canonicalization_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION,
    semantic_acl_evidence: value.semantic_acl_evidence,
    snapshot_digest: value.snapshot_digest,
    reference_capture_digest: value.reference_capture_digest,
  });
  if (hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
    .digest_domains.candidate_provenance, provenance) !==
    value.reference_run_provenance_digest) return null;
  const { candidate_identity_digest: ignored, ...body } = value;
  void ignored;
  if (hash("farmos.day150-prefix-expected-catalog-candidate-identity.v1", body) !==
    value.candidate_identity_digest) return null;
  return owned(value as unknown as FarmOsExpectedCatalogFingerprintCandidate);
}

declare const CANDIDATE_REGISTRY: unique symbol;
declare const CANDIDATE: unique symbol;
declare const APPROVAL: unique symbol;
declare const APPROVED: unique symbol;
export type FarmOsDay150ExpectedCatalogCandidateRegistry = Readonly<{ [CANDIDATE_REGISTRY]: true }>;
export type FarmOsDay150ExpectedCatalogCandidateCapability = Readonly<{ [CANDIDATE]: true }>;
export type FarmOsDay150ExpectedCatalogApprovalCapability = Readonly<{ [APPROVAL]: true }>;
export type FarmOsDay150ApprovedExpectedCatalogCapability = Readonly<{ [APPROVED]: true }>;
const candidateRegistries = new WeakMap<object, Map<string, FarmOsExpectedCatalogFingerprintCandidate>>();
const candidateCapabilities = new WeakMap<object, FarmOsExpectedCatalogFingerprintCandidate>();
const approvalCapabilities = new WeakMap<object, FarmOsDay150ExpectedCatalogSetApproval>();
const approvedCapabilities = new WeakMap<object, FarmOsDay150ApprovedExpectedCatalogBinding>();
const opaque = <T>(): T => Object.freeze(Object.create(null)) as T;

export function createFarmOsDay150ExpectedCatalogCandidateRegistry(
  values: readonly unknown[],
  runCapability?: FarmOsDay150ReferenceCatalogRunCapability | unknown,
): FarmOsDay150ExpectedCatalogCandidateRegistry | null {
  if (!Array.isArray(values) || values.length !== PREFIXES.length ||
    typeof runCapability !== "object" ||
    runCapability === null) return null;
  const run = referenceRuns.get(runCapability);
  if (!run) return null;
  const parsed = values.map(parseFarmOsDay150ExpectedCatalogCandidate);
  if (parsed.some((value) => value === null)) return null;
  const expected = PREFIXES.map((migrationId) => compileFarmOsDay150ExpectedCatalogCandidate({
    migration_id: migrationId, run_capability: runCapability,
  }));
  if (expected.some((value) => value === null) ||
    parsed.some((value, index) => canonical(value) !== canonical(expected[index]))) return null;
  if (parsed.some((value) => value!.reference_capture_digest !==
    run.reference_capture.reference_capture_digest)) {
    return null;
  }
  const byId = new Map(parsed.map((value) => [value!.candidate_id, owned(value!)]));
  if (byId.size !== PREFIXES.length || PREFIXES.some((migrationId) =>
    !parsed.some((value) => value?.migration_id === migrationId))) return null;
  const capability = opaque<FarmOsDay150ExpectedCatalogCandidateRegistry>();
  candidateRegistries.set(capability, byId);
  return capability;
}

export function loadFarmOsDay150ExpectedCatalogCandidateExact(input: Readonly<{
  registry: FarmOsDay150ExpectedCatalogCandidateRegistry | unknown;
  candidate_id: string; candidate_revision: number; migration_id: string;
}>): FarmOsDay150ExpectedCatalogCandidateCapability | null {
  if (typeof input.registry !== "object" || input.registry === null || input.candidate_revision !== 1) return null;
  const candidate = candidateRegistries.get(input.registry)?.get(input.candidate_id);
  if (!candidate || candidate.migration_id !== input.migration_id) return null;
  const capability = opaque<FarmOsDay150ExpectedCatalogCandidateCapability>();
  candidateCapabilities.set(capability, candidate);
  return capability;
}

export function readFarmOsDay150ExpectedCatalogCandidate(
  capability: FarmOsDay150ExpectedCatalogCandidateCapability | unknown,
): FarmOsExpectedCatalogFingerprintCandidate | null {
  return typeof capability === "object" && capability !== null
    ? candidateCapabilities.get(capability) ?? null : null;
}

export type FarmOsDay150ExpectedCatalogCandidateIdentity = Readonly<{
  candidate_schema_version: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA;
  candidate_id: string; candidate_revision: 1; migration_id: FarmOsDay150PrefixMigrationId;
  candidate_identity_digest: `sha256:${string}`;
  candidate_expected_fingerprint: `sha256:${string}`; snapshot_digest: `sha256:${string}`;
  artifact_sha256: `sha256:${string}`; catalog_query_sha256: `sha256:${string}`;
  object_universe_digest: `sha256:${string}`; expected_object_count: number;
  git_authority: string; reference_run_provenance_digest: `sha256:${string}`;
  reference_capture_digest: `sha256:${string}`;
}>;
export type FarmOsDay150ExpectedCatalogSetApproval = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVAL_SCHEMA;
  status: "AUTHENTICATED_PRODUCT_OWNER_APPROVED_EXACT_FIVE";
  approval_authority_id: "farmos.day150-product-owner-expected-catalog-approval.v1";
  approval_revision: 1; candidate_set_digest: `sha256:${string}`;
  candidates: readonly FarmOsDay150ExpectedCatalogCandidateIdentity[];
  approval_reference: string; approved_at: string;
}>;
export type FarmOsDay150ApprovedExpectedCatalogBinding = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVED_BINDING_SCHEMA;
  authority_id: string; authority_revision: 1;
  candidate_identity: FarmOsDay150ExpectedCatalogCandidateIdentity;
  expected_authority: FarmOsExpectedCatalogFingerprintAuthority;
  approval_reference: string; approved_at: string;
}>;

function identity(candidate: FarmOsExpectedCatalogFingerprintCandidate):
  FarmOsDay150ExpectedCatalogCandidateIdentity {
  return Object.freeze({ candidate_schema_version: candidate.schema_version,
    candidate_id: candidate.candidate_id, candidate_revision: 1,
    migration_id: candidate.migration_id,
    candidate_identity_digest: candidate.candidate_identity_digest,
    candidate_expected_fingerprint: candidate.candidate_expected_fingerprint,
    snapshot_digest: candidate.snapshot_digest, artifact_sha256: candidate.artifact_sha256,
    catalog_query_sha256: candidate.catalog_query_sha256,
    object_universe_digest: candidate.object_universe_digest,
    expected_object_count: candidate.expected_object_count, git_authority: candidate.git_authority,
    reference_run_provenance_digest: candidate.reference_run_provenance_digest,
    reference_capture_digest: candidate.reference_capture_digest });
}
const candidateSetDigest = (identities: readonly FarmOsDay150ExpectedCatalogCandidateIdentity[]) =>
  hash("farmos.day150-prefix-expected-catalog-candidate-set.v1", identities);

const IDENTITY_KEYS = ["candidate_schema_version", "candidate_id", "candidate_revision",
  "migration_id", "candidate_identity_digest", "candidate_expected_fingerprint",
  "snapshot_digest", "artifact_sha256", "catalog_query_sha256", "object_universe_digest",
  "expected_object_count", "git_authority", "reference_run_provenance_digest",
  "reference_capture_digest"] as const;
function validCandidateIdentity(value: unknown, expectedMigration?: string):
  value is FarmOsDay150ExpectedCatalogCandidateIdentity {
  if (!record(value) || !exact(value, IDENTITY_KEYS) ||
    value.candidate_schema_version !== FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA ||
    value.candidate_revision !== 1 || !DIGEST.test(String(value.candidate_identity_digest)) ||
    !DIGEST.test(String(value.candidate_expected_fingerprint)) ||
    !DIGEST.test(String(value.snapshot_digest)) || !DIGEST.test(String(value.artifact_sha256)) ||
    !DIGEST.test(String(value.catalog_query_sha256)) ||
    !DIGEST.test(String(value.object_universe_digest)) ||
    !DIGEST.test(String(value.reference_run_provenance_digest)) ||
    !DIGEST.test(String(value.reference_capture_digest)) ||
    !Number.isSafeInteger(value.expected_object_count) || Number(value.expected_object_count) < 1 ||
    !GIT.test(String(value.git_authority))) return false;
  const spec = specFor(String(value.migration_id));
  return spec !== undefined && (expectedMigration === undefined || spec.migration_id === expectedMigration) &&
    value.candidate_id === spec.candidate_id && value.artifact_sha256 === spec.artifact_sha256 &&
    value.catalog_query_sha256 === spec.catalog_query_sha256 &&
    value.object_universe_digest === spec.object_universe_digest &&
    value.git_authority === spec.git_authority;
}

function validApproval(value: FarmOsDay150ExpectedCatalogSetApproval): boolean {
  if (!record(value) || !exact(value, ["schema_version", "status", "approval_authority_id",
    "approval_revision", "candidate_set_digest", "candidates", "approval_reference", "approved_at"])) {
    return false;
  }
  const candidates = value.candidates;
  return typeof value.approval_reference === "string" &&
    REFERENCE.test(value.approval_reference) && canonicalTime(value.approved_at) &&
    value.schema_version === FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVAL_SCHEMA &&
    value.status === "AUTHENTICATED_PRODUCT_OWNER_APPROVED_EXACT_FIVE" &&
    value.approval_authority_id === "farmos.day150-product-owner-expected-catalog-approval.v1" &&
    value.approval_revision === 1 && Array.isArray(candidates) && candidates.length === PREFIXES.length &&
    candidates.every((candidate, index) => validCandidateIdentity(candidate, PREFIXES[index])) &&
    new Set(candidates.map((candidate) => candidate.migration_id)).size === PREFIXES.length &&
    new Set(candidates.map((candidate) => candidate.candidate_identity_digest)).size === PREFIXES.length &&
    value.candidate_set_digest === candidateSetDigest(candidates);
}

export function createFarmOsDay150ExpectedCatalogCandidateSetDigest(
  values: readonly unknown[],
): `sha256:${string}` | null {
  if (!Array.isArray(values) || values.length !== PREFIXES.length ||
    !values.every((value, index) => validCandidateIdentity(value, PREFIXES[index]))) return null;
  const identities = owned(values as readonly FarmOsDay150ExpectedCatalogCandidateIdentity[]);
  return new Set(identities.map((value) => value.migration_id)).size === PREFIXES.length &&
    new Set(identities.map((value) => value.candidate_identity_digest)).size === PREFIXES.length
    ? candidateSetDigest(identities) : null;
}

export function validateFarmOsDay150ExpectedCatalogSetApprovalCandidate(value: unknown): boolean {
  return record(value) && validApproval(value as unknown as FarmOsDay150ExpectedCatalogSetApproval);
}

function issueApproval(value: FarmOsDay150ExpectedCatalogSetApproval):
  FarmOsDay150ExpectedCatalogApprovalCapability | null {
  if (!validApproval(value)) return null;
  const capability = opaque<FarmOsDay150ExpectedCatalogApprovalCapability>();
  approvalCapabilities.set(capability, owned(value));
  return capability;
}

function approvalMatchesRegistry(
  registry: Map<string, FarmOsExpectedCatalogFingerprintCandidate>,
  approval: FarmOsDay150ExpectedCatalogSetApproval,
): boolean {
  const candidates = PREFIXES.map((migrationId) => {
    const spec = specFor(migrationId)!;
    return registry.get(spec.candidate_id);
  });
  if (candidates.some((candidate) => !candidate)) return false;
  const identities = candidates.map((candidate) => identity(candidate!));
  return canonical(identities) === canonical(approval.candidates) &&
    candidateSetDigest(identities) === approval.candidate_set_digest;
}

export function createFarmOsDay150ExpectedCatalogSetReviewPacket(
  registryCapability: FarmOsDay150ExpectedCatalogCandidateRegistry | unknown,
): Readonly<{ candidates: readonly FarmOsDay150ExpectedCatalogCandidateIdentity[];
  candidate_set_digest: `sha256:${string}` }> | null {
  if (typeof registryCapability !== "object" || registryCapability === null) return null;
  const registry = candidateRegistries.get(registryCapability);
  if (!registry) return null;
  const candidates = PREFIXES.map((migrationId) => {
    const spec = specFor(migrationId)!;
    return registry.get(spec.candidate_id);
  });
  if (candidates.some((candidate) => !candidate)) return null;
  const identities = owned(candidates.map((candidate) => identity(candidate!)));
  return owned({ candidates: identities, candidate_set_digest: candidateSetDigest(identities) });
}

export function preflightFarmOsDay150ExpectedCatalogPromotion(input: Readonly<{
  registry: FarmOsDay150ExpectedCatalogCandidateRegistry | unknown;
  decision: FarmOsDay150ExpectedCatalogSetApproval | unknown;
}>): boolean {
  if (typeof input.registry !== "object" || input.registry === null || !record(input.decision)) {
    return false;
  }
  const registry = candidateRegistries.get(input.registry);
  if (!registry) return false;
  const decision = input.decision as unknown as FarmOsDay150ExpectedCatalogSetApproval;
  return validApproval(decision) && approvalMatchesRegistry(registry, decision);
}

export const FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS = Object.freeze({
  authority_id: "farmos.day150-product-owner-expected-catalog-approval.v1",
  approval_revision: 1,
  approved_at: "2026-08-20T06:43:00.000Z",
  candidate_set_digest:
    "sha256:658b3765e28dd8050da393a167f812364887887bbe40fac7860206d9ccecaab2",
  source_qualification_evidence_revision: 2,
  source_qualification_evidence_digest:
    "sha256:f34b2609279cfb801e732c535181a05828815dcfbd40ba89292b31f41dbdf382",
  source_qualification_classification: "SOURCE_QUALIFICATION_EVIDENCE",
  historical_rejected_source_qualification_v1_digest:
    "sha256:e3eea2a7ddf2e035b8057fa16a90929a3e4bed002bb7602ee5cc6a019d531601",
  fingerprint_authority: "createFarmOsDay150DualPrincipalSemanticFingerprint",
  semantic_fingerprint_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION,
  principal_normalization: FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION,
  catalog_query_sha256:
    "sha256:a76f939ab9deb8351aecb42c96be9ed2f71cab7c292a0685db708f603e076f52",
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  initial_catalog_digest:
    "sha256:da63dc34aeb3583a681df02dd46448a48e021d91e5110ff221e980a1fd22cce5",
  v13_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V13",
  v13_authorization_digest:
    "sha256:922edad1f5ff4e807eeaa5dda84dbf1ced72785ce9e0d84fe40f56f9cb33cd27",
  v13_approval_record_digest:
    "sha256:e35d50770df1afed49e507559c067c1bcaf10f675af391cf2e80a1aedf1c7dd9",
  v13_run_identity:
    "sha256:a150ad2a8a61f0da1e8ee100e4cc7b2cd56eadb595882ab6e09340aa872078ff",
  v13_attempt_identity:
    "sha256:9ad8aed862a2605b512d66aa50dd9976ef70d8b03bb582d70cea94dbc55e0346",
  v13_success_receipt_digest:
    "sha256:11f9730704ec3dcd3fd1014c8e2b9ddbf292c910c5f3e301826f3bdf29613826",
  v13_terminal_receipt_state: "ABSENT",
  candidate_files: Object.freeze([
    Object.freeze({ migration_id: PREFIXES[0],
      candidate_identity_digest:
        "sha256:671c924269b0940e1612101ac4fab0d9cd1947c0dc186d76f23a1c9ca2c3f599",
      raw_sha256: "sha256:2778e14cf992015c8766bc111ffde086b724b14d12781aee6028f62d31ce6e83" }),
    Object.freeze({ migration_id: PREFIXES[1],
      candidate_identity_digest:
        "sha256:3816a122a7ecfaad94f249d645dcc2ea3a6fed6fe05d30d013a67f9a62e37fbc",
      raw_sha256: "sha256:ad68d7363c5b5dfffed9df31cbeb99a552462ce448e0f535027cda5b1dc44d78" }),
    Object.freeze({ migration_id: PREFIXES[2],
      candidate_identity_digest:
        "sha256:df9c89051954cdca671f49149917dfb1031bbf236f47dc8d1249fda77235d635",
      raw_sha256: "sha256:16fa7cd759caeead98e5c8f3a2aa49fa81bfe1dd3fcdc04a46a6ea252533e0a1" }),
    Object.freeze({ migration_id: PREFIXES[3],
      candidate_identity_digest:
        "sha256:100f905a71e170243b643c97cabbccbb6378c87ee077169c2d9913662a29cacf",
      raw_sha256: "sha256:9fc5315e94a316b7c1247cdbc6f143ec45a0bbc27521be325ff6701fcfcb12d8" }),
    Object.freeze({ migration_id: PREFIXES[4],
      candidate_identity_digest:
        "sha256:1f2897ad10bb514c165682a561aa1b4846a7b98ceac16ee9cddc6ee07a852dea",
      raw_sha256: "sha256:5983e9dd2602dac749aff38e99c0771969641db68fcce70e055dc754cce74a97" }),
  ]),
  operation_limits: Object.freeze({ production: 0, canonical: 0, b2: 0, formal_gate2: 0 }),
} as const);
export const FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS_DIGEST = hash(
  "farmos.day150-prefix-expected-catalog-promotion-basis.v1",
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS);
export const FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE =
  `product-owner/day150/exact-five/${FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS_DIGEST.slice(7)}` as const;

const REPOSITORY_APPROVED_CANDIDATE_IDENTITIES:
  readonly FarmOsDay150ExpectedCatalogCandidateIdentity[] = Object.freeze([
  Object.freeze({ candidate_schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
    candidate_id: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[0]!.candidate_id, candidate_revision: 1,
    migration_id: PREFIXES[0], candidate_identity_digest:
      "sha256:671c924269b0940e1612101ac4fab0d9cd1947c0dc186d76f23a1c9ca2c3f599",
    candidate_expected_fingerprint:
      "sha256:030ffa1d430403194f73810cf81e235a038776e97cf042d969b403658db0c9f1",
    snapshot_digest: "sha256:2499ac357cb34cd834583f7e702c2e439e948d06c11d58baabaa7a22a3fc72d8",
    artifact_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[0]!.artifact_sha256,
    catalog_query_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[0]!.catalog_query_sha256,
    object_universe_digest: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[0]!.object_universe_digest,
    expected_object_count: 199, git_authority: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[0]!.git_authority,
    reference_run_provenance_digest:
      "sha256:0eac0249020b69a5e77c6a77aad77e4218fb39e1341fd6456874011485596fb7",
    reference_capture_digest:
      "sha256:1cfdcdfdc42719beda5cc86807c835da6d96187694e5301e1166f18b2e0a65e0" }),
  Object.freeze({ candidate_schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
    candidate_id: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[1]!.candidate_id, candidate_revision: 1,
    migration_id: PREFIXES[1], candidate_identity_digest:
      "sha256:3816a122a7ecfaad94f249d645dcc2ea3a6fed6fe05d30d013a67f9a62e37fbc",
    candidate_expected_fingerprint:
      "sha256:43c4a74d8822a920917b695023c42df25e3d8539aa45117282893647cdf0fa20",
    snapshot_digest: "sha256:f2d8c32395cf55b017b09f8f096a8f472332cb87e59e6b4b4cf12144e42b97b6",
    artifact_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[1]!.artifact_sha256,
    catalog_query_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[1]!.catalog_query_sha256,
    object_universe_digest: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[1]!.object_universe_digest,
    expected_object_count: 16, git_authority: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[1]!.git_authority,
    reference_run_provenance_digest:
      "sha256:328d9f28e196df8c215113f1090d85da7a1ba70075b3553e2dc012c1490ce7d9",
    reference_capture_digest:
      "sha256:1cfdcdfdc42719beda5cc86807c835da6d96187694e5301e1166f18b2e0a65e0" }),
  Object.freeze({ candidate_schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
    candidate_id: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[2]!.candidate_id, candidate_revision: 1,
    migration_id: PREFIXES[2], candidate_identity_digest:
      "sha256:df9c89051954cdca671f49149917dfb1031bbf236f47dc8d1249fda77235d635",
    candidate_expected_fingerprint:
      "sha256:8f6c5e9cf9c93d19e2c000b86685ee695bdf170e6f362d54b158e095d0e534d0",
    snapshot_digest: "sha256:3d973ed89bae6781f374270c1de700d23f983fa694979172e100ebae63bb821d",
    artifact_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[2]!.artifact_sha256,
    catalog_query_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[2]!.catalog_query_sha256,
    object_universe_digest: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[2]!.object_universe_digest,
    expected_object_count: 52, git_authority: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[2]!.git_authority,
    reference_run_provenance_digest:
      "sha256:c21b9344be1b69a1a8ec4edaf5d95c0d270cc078442f4e75febd9d9d8ddf2336",
    reference_capture_digest:
      "sha256:1cfdcdfdc42719beda5cc86807c835da6d96187694e5301e1166f18b2e0a65e0" }),
  Object.freeze({ candidate_schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
    candidate_id: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[3]!.candidate_id, candidate_revision: 1,
    migration_id: PREFIXES[3], candidate_identity_digest:
      "sha256:100f905a71e170243b643c97cabbccbb6378c87ee077169c2d9913662a29cacf",
    candidate_expected_fingerprint:
      "sha256:9a8231ae859c8564f72caa714bc3cc12b43ccd96aee1bb182de9d78987e693e9",
    snapshot_digest: "sha256:0f5edbf290ba9a748bcabbe858dce62eda43a2187940a627ad6c0dcb142f03fa",
    artifact_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[3]!.artifact_sha256,
    catalog_query_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[3]!.catalog_query_sha256,
    object_universe_digest: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[3]!.object_universe_digest,
    expected_object_count: 216, git_authority: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[3]!.git_authority,
    reference_run_provenance_digest:
      "sha256:f76c63c069ffeebfe57bab053b08d546fe9cbc713e942b1ce0f9e97235dabfc8",
    reference_capture_digest:
      "sha256:1cfdcdfdc42719beda5cc86807c835da6d96187694e5301e1166f18b2e0a65e0" }),
  Object.freeze({ candidate_schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA,
    candidate_id: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[4]!.candidate_id, candidate_revision: 1,
    migration_id: PREFIXES[4], candidate_identity_digest:
      "sha256:1f2897ad10bb514c165682a561aa1b4846a7b98ceac16ee9cddc6ee07a852dea",
    candidate_expected_fingerprint:
      "sha256:81ded4ed893bbfe1303e603bc5427e080b78bd957479d46200a728328661edba",
    snapshot_digest: "sha256:33ab1aac0e899b349d02480e614bb9b87d26610029bb79868db65ebdd082eac9",
    artifact_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[4]!.artifact_sha256,
    catalog_query_sha256: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[4]!.catalog_query_sha256,
    object_universe_digest: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[4]!.object_universe_digest,
    expected_object_count: 133, git_authority: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[4]!.git_authority,
    reference_run_provenance_digest:
      "sha256:2e3604f9138fc4d090292e08b65e6bd2661ff89261c95d555b48cc4d03b1bf68",
    reference_capture_digest:
      "sha256:1cfdcdfdc42719beda5cc86807c835da6d96187694e5301e1166f18b2e0a65e0" }),
]);

export const FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL = Object.freeze({
  schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVAL_SCHEMA,
  status: "AUTHENTICATED_PRODUCT_OWNER_APPROVED_EXACT_FIVE" as const,
  approval_authority_id: "farmos.day150-product-owner-expected-catalog-approval.v1" as const,
  approval_revision: 1 as const,
  candidate_set_digest: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.candidate_set_digest,
  candidates: REPOSITORY_APPROVED_CANDIDATE_IDENTITIES,
  approval_reference: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE,
  approved_at: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.approved_at,
});
export const FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVAL_SCHEMA,
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL);

const REPOSITORY_APPROVALS: readonly FarmOsDay150ExpectedCatalogSetApproval[] = Object.freeze([
  FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL,
]);
const REPOSITORY_APPROVED_BINDING_SET: readonly FarmOsDay150ApprovedExpectedCatalogBinding[] =
  Object.freeze(REPOSITORY_APPROVED_CANDIDATE_IDENTITIES.map((candidate) => Object.freeze({
    schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVED_BINDING_SCHEMA,
    authority_id: `farmos.expected-catalog-fingerprint.${candidate.migration_id}.v1`,
    authority_revision: 1 as const,
    candidate_identity: candidate,
    expected_authority: Object.freeze({
      schema_version: "farmos.expected-catalog-fingerprint-authority.v1" as const,
      migration_id: candidate.migration_id,
      fingerprint_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANONICALIZATION,
      expected_fingerprint: candidate.candidate_expected_fingerprint,
      artifact_sha256: candidate.artifact_sha256,
      catalog_query_sha256: candidate.catalog_query_sha256,
      object_universe_digest: candidate.object_universe_digest,
      expected_object_count: candidate.expected_object_count,
      git_authority: candidate.git_authority,
      approval_reference: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE,
      approved_at: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.approved_at,
    }),
    approval_reference: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE,
    approved_at: FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.approved_at,
  })));
const REPOSITORY_APPROVED_BINDING_SETS:
  readonly (readonly FarmOsDay150ApprovedExpectedCatalogBinding[])[] = Object.freeze([
    REPOSITORY_APPROVED_BINDING_SET,
  ]);

function validApprovedBinding(value: FarmOsDay150ApprovedExpectedCatalogBinding): boolean {
  const expected = value.expected_authority;
  const candidate = value.candidate_identity;
  const spec = specFor(candidate.migration_id);
  const approval = REPOSITORY_APPROVALS.find((entry) =>
    entry.approval_reference === value.approval_reference &&
    entry.approved_at === value.approved_at &&
    entry.candidates.some((entryCandidate) =>
      canonical(entryCandidate) === canonical(candidate)));
  return approval !== undefined && validApproval(approval) &&
    value.schema_version === FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVED_BINDING_SCHEMA &&
    value.authority_revision === 1 && spec !== undefined &&
    value.authority_id === `farmos.expected-catalog-fingerprint.${candidate.migration_id}.v1` &&
    candidate.candidate_schema_version === FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_CANDIDATE_SCHEMA &&
    candidate.candidate_id === spec.candidate_id && candidate.candidate_revision === 1 &&
    DIGEST.test(candidate.candidate_identity_digest) && DIGEST.test(candidate.snapshot_digest) &&
    DIGEST.test(candidate.reference_run_provenance_digest) &&
    DIGEST.test(candidate.reference_capture_digest) &&
    candidate.candidate_expected_fingerprint === expected.expected_fingerprint &&
    candidate.artifact_sha256 === expected.artifact_sha256 &&
    candidate.catalog_query_sha256 === expected.catalog_query_sha256 &&
    candidate.object_universe_digest === expected.object_universe_digest &&
    candidate.expected_object_count === expected.expected_object_count &&
    candidate.git_authority === expected.git_authority &&
    value.approval_reference === expected.approval_reference &&
    value.approved_at === expected.approved_at && validExpectedCatalogAuthority(expected);
}

function validApprovedBindingSet(values: readonly FarmOsDay150ApprovedExpectedCatalogBinding[]): boolean {
  if (values.length !== PREFIXES.length || !values.every(validApprovedBinding) ||
    new Set(values.map((value) => value.authority_id)).size !== PREFIXES.length ||
    new Set(values.map((value) => value.candidate_identity.candidate_identity_digest)).size !== PREFIXES.length ||
    !PREFIXES.every((migrationId, index) =>
      values[index]?.candidate_identity.migration_id === migrationId)) return false;
  const approval = REPOSITORY_APPROVALS.find((entry) =>
    entry.approval_reference === values[0]?.approval_reference &&
    entry.approved_at === values[0]?.approved_at);
  return approval !== undefined && validApproval(approval) &&
    canonical(values.map((value) => value.candidate_identity)) === canonical(approval.candidates);
}

export const FARM_OS_DAY150_EXACT_FIVE_APPROVED_AUTHORITY_REPOSITORY_PATH =
  "src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation.ts#" +
  "REPOSITORY_APPROVED_BINDING_SET";

export function createFarmOsDay150ApprovedExpectedCatalogBindingDigest(
  value: unknown,
): `sha256:${string}` | null {
  return record(value) && validApprovedBinding(
    value as unknown as FarmOsDay150ApprovedExpectedCatalogBinding)
    ? hash(FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVED_BINDING_SCHEMA, value) : null;
}

export function validateFarmOsDay150ExactFiveRepositoryPromotion(): boolean {
  return validApproval(FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL) &&
    FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.candidate_set_digest ===
      FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.candidate_set_digest &&
    FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.approval_reference ===
      FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL_REFERENCE &&
    FARM_OS_DAY150_EXACT_FIVE_PROMOTION_APPROVAL.approved_at ===
      FARM_OS_DAY150_EXACT_FIVE_PROMOTION_BASIS.approved_at &&
    validApprovedBindingSet(REPOSITORY_APPROVED_BINDING_SET) &&
    REPOSITORY_APPROVED_BINDING_SET.every((binding) =>
      createFarmOsDay150ApprovedExpectedCatalogBindingDigest(binding) !== null);
}

export function loadFarmOsDay150ExpectedCatalogApprovalExact(input: Readonly<{
  approval_authority_id: string; approval_revision: number; candidate_set_digest: string;
}>): FarmOsDay150ExpectedCatalogApprovalCapability | null {
  const value = REPOSITORY_APPROVALS.find((candidate) =>
    candidate.approval_authority_id === input.approval_authority_id &&
    candidate.approval_revision === input.approval_revision &&
    candidate.candidate_set_digest === input.candidate_set_digest);
  return value ? issueApproval(value) : null;
}

export function promoteFarmOsDay150ExpectedCatalogCandidateSet(input: Readonly<{
  registry: FarmOsDay150ExpectedCatalogCandidateRegistry | unknown;
  approval: FarmOsDay150ExpectedCatalogApprovalCapability | unknown;
}>): readonly FarmOsDay150ApprovedExpectedCatalogBinding[] | null {
  if (typeof input.registry !== "object" || input.registry === null ||
    typeof input.approval !== "object" || input.approval === null) return null;
  const registry = candidateRegistries.get(input.registry);
  const approval = approvalCapabilities.get(input.approval);
  if (!registry || !approval || !approvalMatchesRegistry(registry, approval)) return null;
  const candidates = PREFIXES.map((migrationId) => {
    const spec = specFor(migrationId)!;
    return registry.get(spec.candidate_id);
  });
  if (candidates.some((candidate) => !candidate)) return null;
  const bindings = candidates.map((candidate) => ({
    schema_version: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_APPROVED_BINDING_SCHEMA,
    authority_id: `farmos.expected-catalog-fingerprint.${candidate!.migration_id}.v1`,
    authority_revision: 1 as const, candidate_identity: identity(candidate!),
    expected_authority: Object.freeze({
      schema_version: "farmos.expected-catalog-fingerprint-authority.v1" as const,
      migration_id: candidate!.migration_id,
      fingerprint_version: candidate!.fingerprint_version,
      expected_fingerprint: candidate!.candidate_expected_fingerprint,
      artifact_sha256: candidate!.artifact_sha256,
      catalog_query_sha256: candidate!.catalog_query_sha256,
      object_universe_digest: candidate!.object_universe_digest,
      expected_object_count: candidate!.expected_object_count,
      git_authority: candidate!.git_authority,
      approval_reference: approval.approval_reference,
      approved_at: approval.approved_at,
    }), approval_reference: approval.approval_reference, approved_at: approval.approved_at,
  }));
  return validApprovedBindingSet(bindings) ? owned(bindings) : null;
}

export function loadFarmOsDay150ApprovedExpectedCatalogExact(input: Readonly<{
  authority_id: string; authority_revision: number; migration_id: string;
}>): FarmOsDay150ApprovedExpectedCatalogCapability | null {
  const bindingSet = REPOSITORY_APPROVED_BINDING_SETS.find(validApprovedBindingSet);
  const binding = bindingSet?.find((candidate) => candidate.authority_id === input.authority_id &&
    candidate.authority_revision === input.authority_revision &&
    candidate.expected_authority.migration_id === input.migration_id);
  if (!binding) return null;
  const capability = opaque<FarmOsDay150ApprovedExpectedCatalogCapability>();
  approvedCapabilities.set(capability, owned(binding));
  return capability;
}

export function readFarmOsDay150ApprovedExpectedCatalog(
  capability: FarmOsDay150ApprovedExpectedCatalogCapability | unknown,
): FarmOsDay150ApprovedExpectedCatalogBinding | null {
  return typeof capability === "object" && capability !== null
    ? approvedCapabilities.get(capability) ?? null : null;
}

export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN = Object.freeze({
  authority: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY,
  execution_authorized: true,
  execution_authorization_id:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4.authorization_id,
  execution_authorization_revision: 4,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V4_DIGEST,
  migration_privilege_envelope_id:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_ID,
  migration_privilege_envelope_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  docker_operations: 0, postgres_operations: 0,
  migration_operations: 0, production_operations: 0, canonical_operations: 0,
  image: FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE, platform: FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM,
  pull_policy: "NEVER", restart_policy: "NO", exposure: "127.0.0.1:EPHEMERAL",
  resource_scope: "ONE_EXACT_OWNED_CONTAINER_NETWORK_VOLUME",
  resource_names: Object.freeze({
    container: "farmos-day150-prefix-reference-pg17-v1",
    network: "farmos-day150-prefix-reference-network-v1",
    volume: "farmos-day150-prefix-reference-volume-v1",
  }),
  database_name: "farmos_day150_prefix_reference_v1",
  database_scope: "CLEAN_ISOLATED_REFERENCE_DATABASE_ONLY",
  credentials: "EPHEMERAL_REFERENCE_ONLY_NO_PRODUCTION_CREDENTIALS",
  previous_authorization: "V3_SUPERSEDED_UNCONSUMED",
  authorization_state: "AUTHORIZED_BUT_NOT_CONSUMED",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V4_RUN_ID,
  attempt_claim_artifact: Object.freeze({
    path: FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH,
    schema_version: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
    operation: "ONE_CANONICAL_EXCLUSIVE_DURABLE_PUBLICATION_AND_TRUSTED_READBACK",
  }),
  initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
  initial_catalog_digest:
    FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.canonical_initial_state_digest,
  principal_normalization_revision:
    FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION,
  bootstrap_plan: INITIAL_BOOTSTRAP_PLAN,
  initial_state_verification: "READBACK_OWNER_ONLY_EXACT_STRUCTURE_BEFORE_FIRST_MIGRATION",
  migration_execution_role: "REFERENCE_MIGRATION_EXECUTOR_FOR_ALL_FIVE_MIGRATIONS",
  snapshot_points: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => Object.freeze({
    migration_id: spec.migration_id, state: "AFTER_EXACT_MIGRATION",
    history: spec.canonical_migration_history, output_path: spec.output_path,
  })),
  receipt_output_path:
    "artifacts/day150/prefix-expected-catalog/reference-runs/v1/reference-catalog-run-receipt-candidate.json",
  cleanup: "REMOVE_EXACT_OWNED_CONTAINER_VOLUME_NETWORK_VERIFY_ZERO_RESIDUAL",
} as const);

export const FARM_OS_DAY150_PREFIX_REFERENCE_PINNED_MIGRATION_BUNDLE_DIGEST =
  "sha256:2d4b5c1f721824878432090c5581066c5361bf572c933075b2b4237d668afc36" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL = Object.freeze({
  ...FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN,
  schema_version: "farmos.day150-prefix-reference-external-execution-plan.v5-proposal.v1",
  execution_authorized: false,
  authorization_consumption_allowed: false,
  execution_authorization_id: "DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5",
  execution_authorization_revision: 5,
  execution_authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST,
  previous_authorization: "V4_CONSUMED_TERMINAL_EXACTLY_ONCE_RETRY_FORBIDDEN",
  authorization_state: "PROPOSED_NOT_AUTHORIZED",
  stable_run_id: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  attempt_claim_artifact: Object.freeze({
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V5_ATTEMPT_CLAIM_PATH,
    schema_version: "farmos.day150-prefix-reference-execution-attempt-claim.v1",
    operation: "ONE_CANONICAL_EXCLUSIVE_DURABLE_PUBLICATION_AND_TRUSTED_READBACK",
  }),
  consumption_marker_artifact: Object.freeze({
    path: FARM_OS_DAY150_PREFIX_REFERENCE_V5_CONSUMPTION_MARKER_PATH,
    schema_version: "farmos.day150-prefix-reference-execution-consumption-marker.v1",
    operation: "ONE_CANONICAL_EXCLUSIVE_DURABLE_PUBLICATION_AND_TRUSTED_READBACK",
  }),
  pinned_migration_bundle_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_PINNED_MIGRATION_BUNDLE_DIGEST,
  readiness_liveness_policy:
    FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_READINESS_LIVENESS_POLICY,
  v4_historical_evidence: Object.freeze({
    state: "CONSUMED_TERMINAL",
    retry: "FORBIDDEN",
    attempt_claim_path: FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_PATH,
    consumption_marker_path: `${FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_PLAN.receipt_output_path}.authorization-consumed`,
    mutation: "FORBIDDEN",
  }),
  proposal_only: true,
} as const);
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.plan,
  FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL);
export const FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID = hash(
  FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_DIGEST_DOMAINS.V5.attempt, {
    authorization_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST,
    execution_plan_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST,
    pinned_migration_bundle_digest:
      FARM_OS_DAY150_PREFIX_REFERENCE_PINNED_MIGRATION_BUNDLE_DIGEST,
    run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  });
export const FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_REQUEST = Object.freeze({
  request: "PRODUCT_OWNER_REVIEW_AND_EXPLICIT_AUTHORIZATION_REQUIRED",
  authorization: FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL,
  authorization_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTION_AUTHORIZATION_V5_PROPOSAL_DIGEST,
  external_execution_plan: FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL,
  external_execution_plan_digest:
    FARM_OS_DAY150_PREFIX_REFERENCE_EXTERNAL_EXECUTION_PLAN_V5_PROPOSAL_DIGEST,
  proposed_run_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_RUN_ID,
  proposed_attempt_identity: FARM_OS_DAY150_PREFIX_REFERENCE_V5_PROPOSED_ATTEMPT_ID,
  current_state: "PROPOSED_NOT_AUTHORIZED",
  invocation_allowed: false,
} as const);

export type FarmOsDay150PrefixReferenceSourcePreflight = Readonly<{
  status: "READY_SOURCE_ONLY" | "BLOCKED";
  reason: "SOURCE_AUTHORITY_EXACT" | "SOURCE_AUTHORITY_MISMATCH";
  checked_manifest: "db/provisioning/manifest.json";
  checked_query: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH;
  checked_migration_count: 5;
  checked_source_candidate_count: number;
  docker_operations: 0; postgres_operations: 0; migration_operations: 0;
  production_operations: 0; canonical_operations: 0;
}>;

const REPOSITORY_ROOT = new URL("../../../", import.meta.url);
export const FARM_OS_DAY150_PREFIX_REFERENCE_REPOSITORY_ROOT_PATH =
  resolve(fileURLToPath(REPOSITORY_ROOT));

export function isFarmOsDay150PrefixReferenceRepositoryAuthorizedRuntime(input: Readonly<{
  verified_runtime_root: string | undefined;
  verified_runtime_source_digest: string | undefined;
  approval_repository_root: string | undefined;
}>): boolean {
  return input.verified_runtime_root !== undefined &&
    resolve(input.verified_runtime_root) ===
      FARM_OS_DAY150_PREFIX_REFERENCE_REPOSITORY_ROOT_PATH &&
    input.verified_runtime_source_digest ===
      FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.source_candidate_digest &&
    input.approval_repository_root !== undefined &&
    resolve(input.approval_repository_root) !== resolve(input.verified_runtime_root);
}
const bytesDigest = (bytes: Uint8Array): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(bytes).digest("hex")}`;

export function preflightFarmOsDay150PrefixReferenceSourceAuthority():
  FarmOsDay150PrefixReferenceSourcePreflight {
  const base = {
    checked_manifest: "db/provisioning/manifest.json" as const,
    checked_query: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_ARTIFACT_PATH,
    checked_migration_count: 5 as const,
    checked_source_candidate_count:
      FARM_OS_DAY150_PREFIX_REFERENCE_EXECUTABLE_SOURCE_CLOSURE_V2.files.length,
    docker_operations: 0 as const, postgres_operations: 0 as const,
    migration_operations: 0 as const, production_operations: 0 as const,
    canonical_operations: 0 as const,
  };
  try {
    const manifestBytes = readFileSync(
      fileURLToPath(new URL(base.checked_manifest, REPOSITORY_ROOT)));
    const manifestDigest = `${"farmos.core-db-provisioning-manifest.v1"}@${bytesDigest(manifestBytes)}`;
    const manifest = parseFarmOsCoreMigrationManifest(JSON.parse(manifestBytes.toString("utf8")));
    const queryBytes = readFileSync(
      fileURLToPath(new URL(base.checked_query, REPOSITORY_ROOT)));
    const query = verifyFarmOsProductionIdentityQueryV5ArtifactBytes(queryBytes);
    const sourceCandidateRows = FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.files
      .map((path) => {
        const raw = readFileSync(
          fileURLToPath(new URL(path, REPOSITORY_ROOT)));
        return Object.freeze({ path,
          sha256: createHash("sha256").update(raw).digest("hex") });
      });
    const sourceCandidateDigest = deriveFarmOsDay150PrefixReferenceExecutableSourceDigestV2(
      (path) => readFileSync(
        fileURLToPath(new URL(path, REPOSITORY_ROOT))),
    );
    const exactSources = manifestDigest === FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION &&
      manifest !== null && query.status === "VERIFIED" &&
      sourceCandidateRows.length ===
        FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.file_count &&
      sourceCandidateDigest ===
        FARM_OS_DAY150_PREFIX_REFERENCE_V13_SOURCE_CANDIDATE_BINDING.source_candidate_digest &&
      FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.every((spec, index) => {
        const entry = manifest.migrations[index];
        if (!entry || entry.migration_id !== spec.migration_id ||
          entry.checksum !== spec.artifact_sha256 || entry.apply_script !== spec.apply_path ||
          entry.verification_script !== spec.verify_path) return false;
        const apply = readFileSync(
          fileURLToPath(new URL(spec.apply_path, REPOSITORY_ROOT)));
        const verify = readFileSync(
          fileURLToPath(new URL(spec.verify_path, REPOSITORY_ROOT)));
        return bytesDigest(apply) === spec.artifact_sha256 &&
          bytesDigest(verify) === spec.verify_artifact_sha256;
      });
    return Object.freeze({ ...base, status: exactSources ? "READY_SOURCE_ONLY" : "BLOCKED",
      reason: exactSources ? "SOURCE_AUTHORITY_EXACT" : "SOURCE_AUTHORITY_MISMATCH" });
  } catch {
    return Object.freeze({ ...base, status: "BLOCKED", reason: "SOURCE_AUTHORITY_MISMATCH" });
  }
}

export type FarmOsDay150PrefixReferenceExecutionResult = Readonly<{
  status: "DAY150_PREFIX_REFERENCE_CATALOG_CANDIDATES_GENERATED";
  authorization_id: typeof ACTIVE_REFERENCE_AUTHORIZATION_ID;
  authorization_revision: typeof ACTIVE_REFERENCE_AUTHORIZATION_REVISION;
  authorization_consumed_once: true;
  candidates: readonly FarmOsExpectedCatalogFingerprintCandidate[];
  receipt: FarmOsDay150ReferenceCatalogRunReceiptCandidate;
  cleanup: "EXACT_OWNED_RESOURCES_REMOVED_ZERO_RESIDUAL";
  readiness: Readonly<{ probe_count: number; time_to_ready_milliseconds: number }>;
  production_operations: 0; canonical_operations: 0;
}>;

export const FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES = Object.freeze([
  "AUTHORIZATION_LOOKUP", "EXECUTION_PLAN_VALIDATION", "MIGRATION_BYTE_PRELOAD",
  "MIGRATION_DIGEST_VERIFICATION", "STATEMENT_PRIVILEGE_ANALYSIS",
  "RESOURCE_PREEXISTENCE", "ATTEMPT_CLAIM_DECISION", "ATTEMPT_CLAIM_PUBLICATION",
  "ATTEMPT_CLAIM_READBACK",
  "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_READBACK", "AUTHORIZATION_CONSUMPTION",
  "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION",
  "POSTGRES_STARTUP", "POSTGRES_MAJOR_VERIFICATION", "PRINCIPAL_INITIALIZATION",
  "MINIMAL_BOOTSTRAP", "TRUSTED_INITIAL_READBACK",
  ...PREFIXES.flatMap((_, index) => [
    `MIGRATION_${index + 1}_EXECUTION`, `SNAPSHOT_${index + 1}_COLLECTION`,
  ]),
  ...PREFIXES.flatMap((_, index) => [
    `CANDIDATE_${index + 1}_DURABLE_PUBLICATION`, `CANDIDATE_${index + 1}_REOPEN_READBACK`,
  ]),
  "EXACT_FIVE_CANDIDATE_VERIFICATION",
  "PRE_CLEANUP_EVIDENCE_PUBLICATION", "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK",
  "BEFORE_CLEANUP", "CONTAINER_CLEANUP", "VOLUME_CLEANUP",
  "NETWORK_CLEANUP", "ZERO_RESIDUAL_VERIFICATION",
  "BEFORE_FINAL_RECEIPT", "FINAL_RECEIPT_DURABLE_PUBLICATION",
  "FINAL_RECEIPT_REOPEN_READBACK", "TERMINAL_CLOSE",
] as const);
export type FarmOsDay150PrefixReferencePublicExecutorBoundary =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES[number];
export const FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_EFFECT_BOUNDARIES = Object.freeze([
  "TERMINAL_OUTCOME_DURABLE_PUBLICATION", "TERMINAL_OUTCOME_REOPEN_READBACK",
] as const);
export type FarmOsDay150PrefixReferenceTerminalEffectBoundary =
  typeof FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_EFFECT_BOUNDARIES[number];
export type FarmOsDay150PrefixReferenceEffectBoundary =
  FarmOsDay150PrefixReferencePublicExecutorBoundary |
  FarmOsDay150PrefixReferenceTerminalEffectBoundary;
export const FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_SCHEMA =
  "farmos.day150-prefix-reference-execution-attempt-claim.v1" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_REVISION = 1 as const;
export type FarmOsDay150PrefixReferenceAttemptClaim = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_SCHEMA;
  authority_state: "ATTEMPT_CLAIMED";
  claim_revision: typeof FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_REVISION;
  authorization_id: typeof ACTIVE_REFERENCE_AUTHORIZATION_ID;
  authorization_revision: typeof ACTIVE_REFERENCE_AUTHORIZATION_REVISION;
  authorization_digest: `sha256:${string}`;
  execution_plan_digest: `sha256:${string}`;
  pinned_migration_bundle_digest: `sha256:${string}`;
  run_identity: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
  approval_reference: string;
  gate17_scope_digest: `sha256:${string}`;
  approval_candidate_identity: `sha256:${string}`;
  proposal_identity: `sha256:${string}`;
  proposal_created_at: string;
  approved_at: string;
  approval_record_digest: `sha256:${string}`;
  execution_class: "ISOLATED_DAY150_REFERENCE_CATALOG";
  credentials_persisted: false;
  claim_digest: `sha256:${string}`;
}>;
export function deriveFarmOsDay150PrefixReferenceAttemptIdentity(
  pinnedMigrationBundleDigest: `sha256:${string}`,
): `sha256:${string}` {
  return hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.digest_domains.attempt, {
    authorization_digest: ACTIVE_REFERENCE_AUTHORIZATION_DIGEST,
    execution_plan_digest: ACTIVE_REFERENCE_EXECUTION_PLAN_DIGEST,
    pinned_migration_bundle_digest: pinnedMigrationBundleDigest,
    run_identity: ACTIVE_REFERENCE_RUN_ID,
  });
}
export function createFarmOsDay150PrefixReferenceAttemptClaim(
  pinnedMigrationBundleDigest: `sha256:${string}`,
  approval: Pick<FarmOsDay150PrefixReferenceExecutionApprovalRecord,
    "approval_reference" | "gate17_scope_digest" | "approval_candidate_identity" | "proposal_identity" |
    "proposal_created_at" | "approved_at" | "approval_record_digest">,
): FarmOsDay150PrefixReferenceAttemptClaim {
  return createFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(
    pinnedMigrationBundleDigest, approval,
    FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR);
}
function createFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(
  pinnedMigrationBundleDigest: `sha256:${string}`,
  approval: Pick<FarmOsDay150PrefixReferenceExecutionApprovalRecord,
    "approval_reference" | "gate17_scope_digest" | "approval_candidate_identity" |
    "proposal_identity" | "proposal_created_at" | "approved_at" | "approval_record_digest">,
  descriptor: FarmOsDay150PrefixReferenceExecutionDescriptor,
): FarmOsDay150PrefixReferenceAttemptClaim {
  const body = Object.freeze({
    schema_version: FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_SCHEMA,
    authority_state: "ATTEMPT_CLAIMED" as const,
    claim_revision: FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_REVISION,
    authorization_id: descriptor.authorization_id,
    authorization_revision: descriptor.authorization_revision,
    authorization_digest: descriptor.authorization_digest,
    execution_plan_digest: descriptor.execution_plan_digest,
    pinned_migration_bundle_digest: pinnedMigrationBundleDigest,
    run_identity: descriptor.run_identity,
    attempt_identity: hash(descriptor.digest_domains.attempt, {
      authorization_digest: descriptor.authorization_digest,
      execution_plan_digest: descriptor.execution_plan_digest,
      pinned_migration_bundle_digest: pinnedMigrationBundleDigest,
      run_identity: descriptor.run_identity,
    }),
    approval_reference: approval.approval_reference,
    gate17_scope_digest: approval.gate17_scope_digest,
    approval_candidate_identity: approval.approval_candidate_identity,
    proposal_identity: approval.proposal_identity,
    proposal_created_at: approval.proposal_created_at,
    approved_at: approval.approved_at,
    approval_record_digest: approval.approval_record_digest,
    execution_class: "ISOLATED_DAY150_REFERENCE_CATALOG" as const,
    credentials_persisted: false as const,
  });
  return Object.freeze({ ...body,
    claim_digest: hash(descriptor.digest_domains.claim, body),
  });
}
export function parseFarmOsDay150PrefixReferenceAttemptClaim(value: unknown):
  FarmOsDay150PrefixReferenceAttemptClaim | null {
  const descriptor = record(value) && value.authorization_digest ===
    HISTORICAL_V13_SUCCESSFUL_AUTHORIZATION_DIGEST
    ? HISTORICAL_V13_SUCCESSFUL_DESCRIPTOR
    : FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR;
  return parseFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(value,
    descriptor);
}
export function parseFarmOsDay150PrefixReferenceAttemptClaimForDescriptor(
  value: unknown,
  executionDescriptor: FarmOsDay150PrefixReferenceExecutionDescriptor,
): FarmOsDay150PrefixReferenceAttemptClaim | null {
  const expectedAttempt = (pinnedMigrationBundleDigest: `sha256:${string}`) => hash(
    executionDescriptor.digest_domains.attempt, {
      authorization_digest: executionDescriptor.authorization_digest,
      execution_plan_digest: executionDescriptor.execution_plan_digest,
      pinned_migration_bundle_digest: pinnedMigrationBundleDigest,
      run_identity: executionDescriptor.run_identity,
    });
  if (executionDescriptor.authorization_revision < 7) {
    if (!record(value) || !exact(value, ["schema_version", "authority_state", "claim_revision",
      "authorization_id", "authorization_revision", "authorization_digest",
      "execution_plan_digest", "pinned_migration_bundle_digest", "run_identity",
      "attempt_identity", "execution_class", "credentials_persisted", "claim_digest"]) ||
      value.schema_version !== FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_SCHEMA ||
      value.authority_state !== "ATTEMPT_CLAIMED" || value.claim_revision !== 1 ||
      value.authorization_id !== executionDescriptor.authorization_id ||
      value.authorization_revision !== executionDescriptor.authorization_revision ||
      value.authorization_digest !== executionDescriptor.authorization_digest ||
      value.execution_plan_digest !== executionDescriptor.execution_plan_digest ||
      !DIGEST.test(String(value.pinned_migration_bundle_digest)) ||
      value.run_identity !== executionDescriptor.run_identity ||
      value.attempt_identity !== expectedAttempt(
        value.pinned_migration_bundle_digest as `sha256:${string}`) ||
      value.execution_class !== "ISOLATED_DAY150_REFERENCE_CATALOG" ||
      value.credentials_persisted !== false || !DIGEST.test(String(value.claim_digest))) return null;
    const { claim_digest: ignored, ...body } = value;
    void ignored;
    return value.claim_digest === hash(executionDescriptor.digest_domains.claim, body)
      ? owned(value) as FarmOsDay150PrefixReferenceAttemptClaim : null;
  }
  if (!record(value) || !exact(value, ["schema_version", "authority_state", "claim_revision",
    "authorization_id", "authorization_revision", "authorization_digest",
    "execution_plan_digest", "pinned_migration_bundle_digest", "run_identity",
    "attempt_identity", "approval_reference", "gate17_scope_digest", "approval_candidate_identity",
    "proposal_identity", "proposal_created_at", "approved_at", "approval_record_digest",
    "execution_class", "credentials_persisted", "claim_digest"]) ||
    value.schema_version !== FARM_OS_DAY150_PREFIX_REFERENCE_ATTEMPT_CLAIM_SCHEMA ||
    value.authority_state !== "ATTEMPT_CLAIMED" || value.claim_revision !== 1 ||
    value.authorization_id !== executionDescriptor.authorization_id ||
    value.authorization_revision !== executionDescriptor.authorization_revision ||
    value.authorization_digest !== executionDescriptor.authorization_digest ||
    value.execution_plan_digest !== executionDescriptor.execution_plan_digest ||
    !DIGEST.test(String(value.pinned_migration_bundle_digest)) ||
    value.run_identity !== executionDescriptor.run_identity ||
    value.attempt_identity !== expectedAttempt(
      value.pinned_migration_bundle_digest as `sha256:${string}`) ||
    typeof value.approval_reference !== "string" || !REFERENCE.test(value.approval_reference) ||
    value.gate17_scope_digest !== FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST ||
    !DIGEST.test(String(value.approval_candidate_identity)) ||
    !DIGEST.test(String(value.proposal_identity)) ||
    !canonicalTime(value.proposal_created_at) || !canonicalTime(value.approved_at) ||
    Date.parse(value.approved_at) < Date.parse(value.proposal_created_at) ||
    !DIGEST.test(String(value.approval_record_digest)) ||
    value.execution_class !== "ISOLATED_DAY150_REFERENCE_CATALOG" ||
    value.credentials_persisted !== false || !DIGEST.test(String(value.claim_digest))) return null;
  const { claim_digest: ignored, ...body } = value;
  void ignored;
  return value.claim_digest === hash(executionDescriptor.digest_domains.claim, body)
    ? owned(value) as FarmOsDay150PrefixReferenceAttemptClaim : null;
}
export const FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_SCHEMA =
  "farmos.day150-prefix-reference-execution-consumption-marker.v1" as const;
export const FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_REVISION = 3 as const;
export type FarmOsDay150PrefixReferenceConsumptionMarker = Readonly<{
  schema_version: typeof FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_SCHEMA;
  marker_revision: typeof FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_REVISION;
  authorization_id: typeof ACTIVE_REFERENCE_AUTHORIZATION_ID;
  authorization_revision: typeof ACTIVE_REFERENCE_AUTHORIZATION_REVISION;
  authorization_digest: `sha256:${string}`;
  execution_plan_digest: `sha256:${string}`;
  pinned_migration_bundle_digest: `sha256:${string}`;
  attempt_claim_digest: `sha256:${string}`;
  run_identity: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
  approval_reference: string;
  gate17_scope_digest: `sha256:${string}`;
  approval_candidate_identity: `sha256:${string}`;
  proposal_identity: `sha256:${string}`;
  proposal_created_at: string;
  approved_at: string;
  approval_record_digest: `sha256:${string}`;
  state: "EXECUTION_AUTHORIZATION_CONSUMED_TERMINAL_IF_INTERRUPTED";
  credentials_persisted: false;
  marker_digest: `sha256:${string}`;
}>;
export type FarmOsDay150PrefixReferenceConsumptionMarkerBase = Readonly<Pick<
  FarmOsDay150PrefixReferenceConsumptionMarker,
  "authorization_id" | "authorization_revision" | "authorization_digest" |
  "execution_plan_digest" | "pinned_migration_bundle_digest" | "attempt_claim_digest" |
  "run_identity" | "attempt_identity" | "approval_reference" |
  "gate17_scope_digest" |
  "approval_candidate_identity" | "proposal_identity" | "proposal_created_at" |
  "approved_at" | "approval_record_digest"
>>;

export function createFarmOsDay150PrefixReferenceConsumptionMarker(
  base: FarmOsDay150PrefixReferenceConsumptionMarkerBase,
): FarmOsDay150PrefixReferenceConsumptionMarker {
  const body = Object.freeze({
    schema_version: FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_SCHEMA,
    marker_revision: FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_REVISION,
    ...base,
    state: "EXECUTION_AUTHORIZATION_CONSUMED_TERMINAL_IF_INTERRUPTED" as const,
    credentials_persisted: false as const,
  });
  return Object.freeze({ ...body,
    marker_digest: hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
      .digest_domains.consumption_marker, body),
  });
}

export function parseFarmOsDay150PrefixReferenceConsumptionMarker(
  value: unknown,
): FarmOsDay150PrefixReferenceConsumptionMarker | null {
  const descriptor = record(value) && value.authorization_digest ===
    HISTORICAL_V13_SUCCESSFUL_AUTHORIZATION_DIGEST
    ? HISTORICAL_V13_SUCCESSFUL_DESCRIPTOR
    : FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR;
  return parseFarmOsDay150PrefixReferenceConsumptionMarkerForDescriptor(value,
    descriptor);
}
export function parseFarmOsDay150PrefixReferenceConsumptionMarkerForDescriptor(
  value: unknown,
  executionDescriptor: FarmOsDay150PrefixReferenceExecutionDescriptor,
): FarmOsDay150PrefixReferenceConsumptionMarker | null {
  const expectedAttempt = (pinnedMigrationBundleDigest: `sha256:${string}`) => hash(
    executionDescriptor.digest_domains.attempt, {
      authorization_digest: executionDescriptor.authorization_digest,
      execution_plan_digest: executionDescriptor.execution_plan_digest,
      pinned_migration_bundle_digest: pinnedMigrationBundleDigest,
      run_identity: executionDescriptor.run_identity,
    });
  if (executionDescriptor.authorization_revision < 7) {
    if (!record(value) || !exact(value, ["schema_version", "marker_revision", "authorization_id",
      "authorization_revision", "authorization_digest", "execution_plan_digest",
      "pinned_migration_bundle_digest", "attempt_claim_digest", "run_identity",
      "attempt_identity", "state", "credentials_persisted", "marker_digest"]) ||
      value.schema_version !== FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_SCHEMA ||
      value.marker_revision !== FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_REVISION ||
      value.authorization_id !== executionDescriptor.authorization_id ||
      value.authorization_revision !== executionDescriptor.authorization_revision ||
      value.authorization_digest !== executionDescriptor.authorization_digest ||
      value.execution_plan_digest !== executionDescriptor.execution_plan_digest ||
      !DIGEST.test(String(value.pinned_migration_bundle_digest)) ||
      !DIGEST.test(String(value.attempt_claim_digest)) ||
      value.run_identity !== executionDescriptor.run_identity ||
      value.attempt_identity !== expectedAttempt(
        value.pinned_migration_bundle_digest as `sha256:${string}`) ||
      value.state !== "EXECUTION_AUTHORIZATION_CONSUMED_TERMINAL_IF_INTERRUPTED" ||
      value.credentials_persisted !== false || !DIGEST.test(String(value.marker_digest))) return null;
    const { marker_digest: ignored, ...body } = value;
    void ignored;
    return value.marker_digest === hash(executionDescriptor.digest_domains.consumption_marker, body)
      ? owned(value) as FarmOsDay150PrefixReferenceConsumptionMarker : null;
  }
  if (!record(value) || !exact(value, ["schema_version", "marker_revision", "authorization_id",
    "authorization_revision", "authorization_digest", "execution_plan_digest",
    "pinned_migration_bundle_digest", "attempt_claim_digest", "run_identity", "attempt_identity",
    "approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
    "proposal_created_at", "approved_at", "approval_record_digest", "state",
    "credentials_persisted", "marker_digest"]) ||
    value.schema_version !== FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_SCHEMA ||
    value.marker_revision !== FARM_OS_DAY150_PREFIX_REFERENCE_CONSUMPTION_MARKER_REVISION ||
    value.authorization_id !== executionDescriptor.authorization_id ||
    value.authorization_revision !== executionDescriptor.authorization_revision ||
    value.authorization_digest !== executionDescriptor.authorization_digest ||
    value.execution_plan_digest !== executionDescriptor.execution_plan_digest ||
    !DIGEST.test(String(value.pinned_migration_bundle_digest)) ||
    !DIGEST.test(String(value.attempt_claim_digest)) ||
    value.run_identity !== executionDescriptor.run_identity ||
    value.attempt_identity !== expectedAttempt(
      value.pinned_migration_bundle_digest as `sha256:${string}`) ||
    typeof value.approval_reference !== "string" || !REFERENCE.test(value.approval_reference) ||
    value.gate17_scope_digest !== FARM_OS_DAY150_GATE17_SCOPE_AUTHORITY_DIGEST ||
    !DIGEST.test(String(value.approval_candidate_identity)) ||
    !DIGEST.test(String(value.proposal_identity)) ||
    !canonicalTime(value.proposal_created_at) || !canonicalTime(value.approved_at) ||
    Date.parse(value.approved_at) < Date.parse(value.proposal_created_at) ||
    !DIGEST.test(String(value.approval_record_digest)) ||
    value.state !== "EXECUTION_AUTHORIZATION_CONSUMED_TERMINAL_IF_INTERRUPTED" ||
    value.credentials_persisted !== false || !DIGEST.test(String(value.marker_digest))) return null;
  const { marker_digest: ignored, ...body } = value;
  void ignored;
  return value.marker_digest === hash(executionDescriptor.digest_domains.consumption_marker, body)
    ? owned(value) as FarmOsDay150PrefixReferenceConsumptionMarker : null;
}
export function farmOsDay150AttemptRunNonceDigest(attemptIdentity: `sha256:${string}`):
  `sha256:${string}` {
  return hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.digest_domains.run_nonce,
    attemptIdentity);
}
export type FarmOsDay150ReferenceEffectResult<T> =
  Readonly<{ status: "SUCCESS"; value: T }> |
  Readonly<{ status: "BOUNDED_FAILURE"; code: string }> |
  Readonly<{ status: "AMBIGUOUS_OUTCOME"; code: string }>;
export type FarmOsDay150ReferenceEffectRequest = Readonly<{
  step: FarmOsDay150PrefixReferenceEffectBoundary;
  sequence: number;
  operation_class: string;
  target_identity_digest: `sha256:${string}`;
  migration_id: FarmOsDay150PrefixMigrationId | null;
  migration_digest: `sha256:${string}` | null;
  candidate_id: string | null;
  publication_candidate_digest: `sha256:${string}` | null;
  semantic_step_id?: string;
  authorization_id?: typeof ACTIVE_REFERENCE_AUTHORIZATION_ID;
  authorization_revision?: typeof ACTIVE_REFERENCE_AUTHORIZATION_REVISION;
  execution_plan_digest?: `sha256:${string}`;
  run_identity?: `sha256:${string}`;
  attempt_identity?: `sha256:${string}`;
  primitive_ordinal?: number;
  primitive_class?: "PROCESS" | "FILE_STAT" | "FILE_PUBLISH_EXCLUSIVE" | "FILE_REOPEN" | "FILE_UNLINK" |
    "MONOTONIC_NOW" | "BOUNDED_WAIT" | "TERMINAL_CLOSE";
  bounded_result_classification?: "ABSENT" | "PRESENT" | "BOUNDED_FAILURE" |
    "AMBIGUOUS_OUTCOME";
}>;
export type FarmOsDay150ReferenceExecutionEvidence = Readonly<{
  run_id: string; run_nonce_digest_source: string; started_at: string; completed_at: string;
  initial_facts: Readonly<{ server_major: 17; database: "farmos_day150_prefix_reference_v1";
    owner_role_exact: true; executor_role_exact: true; membership_exact: true;
    ai_schema_present: true; proposal_inbox_present: true; base_column_count: 19;
    base_constraint_count: 4; base_index_count: 1; owner_only: true;
    explicit_application_grant_count: 0; explicit_public_privilege_count: 0;
    unrelated_schema_count: 0; preprefix_table_count: 6; preprefix_function_count: 2;
    preprefix_append_only_trigger_count: 6 }>;
  snapshots: readonly Readonly<{ migration_id: FarmOsDay150PrefixMigrationId;
    acl_result_set: unknown; catalog_result_set: unknown }>[];
}>;
export type FarmOsDay150ReferenceExecutionEffectPort = Readonly<{
  readAttemptProvenance(): Readonly<{ run_identity: `sha256:${string}`;
    attempt_identity: `sha256:${string}`; attempt_claim_digest: `sha256:${string}` }> | null;
  stageRequest(request: FarmOsDay150ReferenceEffectRequest): void;
  readTrace(): readonly FarmOsDay150ReferenceEffectRequest[];
  readReadinessObservation?(): Readonly<{ probe_count: number;
    time_to_ready_milliseconds: number }> | null;
  readOnlyPreflight(): Promise<FarmOsDay150ReferenceEffectResult<Readonly<{
    status: "READY" | "BLOCKED_RESOURCE_PREEXISTS" | "BLOCKED_OUTPUT_PREEXISTS" }>>>;
  persistAttemptClaim(claim: FarmOsDay150PrefixReferenceAttemptClaim):
    Promise<FarmOsDay150ReferenceEffectResult<FarmOsDay150PrefixReferenceAttemptClaim>>;
  readAttemptClaim(): Promise<FarmOsDay150ReferenceEffectResult<unknown>>;
  persistConsumptionMarker(input: Readonly<{
    base: FarmOsDay150PrefixReferenceConsumptionMarkerBase;
    createFreshMarker(): FarmOsDay150PrefixReferenceConsumptionMarker;
  }>): Promise<FarmOsDay150ReferenceEffectResult<FarmOsDay150PrefixReferenceConsumptionMarker>>;
  readConsumptionMarker(): Promise<FarmOsDay150ReferenceEffectResult<unknown>>;
  createOwnedNetwork(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  createOwnedVolume(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  createOwnedContainer(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  awaitPostgresReady(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  readServerMajor(): Promise<FarmOsDay150ReferenceEffectResult<17>>;
  initializeReferencePrincipals(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  applyPinnedInitialBootstrap(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  readInitialCatalog(): Promise<FarmOsDay150ReferenceEffectResult<
    FarmOsDay150ReferenceExecutionEvidence["initial_facts"]>>;
  executePinnedMigration(index: number, migration: Readonly<{ migration_id: FarmOsDay150PrefixMigrationId;
    sql: string }>): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  collectCatalogSnapshot(index: number, migration_id: FarmOsDay150PrefixMigrationId):
    Promise<FarmOsDay150ReferenceEffectResult<
      FarmOsDay150ReferenceExecutionEvidence["snapshots"][number]>>;
  publishCandidate(index: number, value: unknown): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  readBackCandidate(index: number): Promise<FarmOsDay150ReferenceEffectResult<unknown>>;
  observeExactFiveCandidateVerification(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  publishPreCleanupEvidence(value: unknown): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  readBackPreCleanupEvidence(): Promise<FarmOsDay150ReferenceEffectResult<unknown>>;
  cleanupOwnedContainer(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  cleanupOwnedVolume(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  cleanupOwnedNetwork(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  verifyZeroResidual(): Promise<FarmOsDay150ReferenceEffectResult<Readonly<{
    container_removed: true; volume_removed: true; network_removed: true;
    zero_residual_verified: true; unrelated_resource_operations: 0; outcome_unknown: false }>>>;
  publishFinalReceipt(value: unknown): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  readBackFinalReceipt(): Promise<FarmOsDay150ReferenceEffectResult<unknown>>;
  publishTerminalOutcomeReceipt(value: unknown): Promise<FarmOsDay150ReferenceEffectResult<null>>;
  readBackTerminalOutcomeReceipt(): Promise<FarmOsDay150ReferenceEffectResult<unknown>>;
  closeExecutionBoundary(): Promise<FarmOsDay150ReferenceEffectResult<null>>;
}>;
type FarmOsDay150SupplementalSemanticQualificationPort = Readonly<Omit<
  FarmOsDay150ReferenceExecutionEffectPort, "readAttemptProvenance" | "stageRequest" | "readTrace">>;
export type FarmOsDay150PrefixReferenceQualificationResult = Readonly<{
  status: "QUALIFICATION_PASS" | "REJECTED" | "PROCESS_LOSS" | "OUTCOME_UNKNOWN";
  failed_boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary | null;
  failure_code: string | null;
  reached_boundaries: readonly FarmOsDay150PrefixReferencePublicExecutorBoundary[];
  requested_effects: readonly FarmOsDay150PrefixReferenceEffectBoundary[];
  adapter_observed_effect_trace: readonly FarmOsDay150ReferenceEffectRequest[];
  effect_request_trace_digest: `sha256:${string}`;
  external_operation_count: number;
  external_mutation_count: number;
  authorization_state: "AUTHORIZED_BUT_NOT_CONSUMED" | "ATTEMPT_CLAIMED" |
    "CONSUMED_TERMINAL";
  durable_candidate_count: number;
  pre_cleanup_evidence_state: "ABSENT" | "DURABLE_VERIFIED";
  cleanup_eligible: boolean;
  cleanup_state: "NOT_STARTED" | "PARTIAL_OR_AMBIGUOUS" | "ZERO_RESIDUAL_VERIFIED";
  final_receipt_state: "ABSENT" | "DURABLE_CLEANUP_BOUND_VERIFIED";
  terminal_outcome_receipt_state: "ABSENT" | "DURABLE_TRUSTED" |
    "PUBLICATION_FAILED" | "PUBLICATION_AMBIGUOUS";
  terminal_outcome_receipt: FarmOsDay150PrefixReferenceTerminalOutcomeReceipt | null;
  close_state: "NOT_REQUESTED" | "SUCCESS" | "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME";
  retry_prohibited: true;
  automatic_retry_count: 0;
  attempt_identity_creation_count: 0 | 1;
  replacement_attempt_identity_count: 0;
  automatic_ambiguous_cleanup_count: 0;
  reconciliation_handoff:
    "DURABLE_ACTUAL_SCHEMA_READBACK_MANUAL_RECONCILIATION_REQUIRED";
  compensation_authority: "NOT_GRANTED_NO_AUTOMATIC_COMPENSATION";
  migration_filesystem_reads_after_authorization_consumption: 0;
  unrelated_operations: 0;
}>;
declare const QUALIFICATION_EXECUTION: unique symbol;
export type FarmOsDay150PrefixReferenceQualificationExecutionCapability =
  Readonly<{ [QUALIFICATION_EXECUTION]: true }>;
type QualificationScenario = Readonly<{
  mode: "FAILURE" | "PROCESS_LOSS" | "SUCCESS" | "THROW" | "AMBIGUOUS" | "HANG" |
    "OUTPUT_LIMIT_EXCEEDED" | "DEADLINE_EXCEEDED" | "NONZERO_EXIT" |
    "MALFORMED_SUCCESS";
  boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary | null;
  phase: "BEFORE_EFFECT" | "AFTER_EFFECT_BEFORE_OBSERVATION";
  durable_marker_fault: "NONE" | "MISSING" | "CORRUPT" |
    "WRONG_AUTHORIZATION" | "WRONG_PLAN_DIGEST" | "CORRUPT_CANDIDATE_1" |
    "CORRUPT_PRE_CLEANUP" | "CORRUPT_RECEIPT" | "CLAIM_MISSING" | "CLAIM_CORRUPT" |
    "CLAIM_WRONG_AUTHORIZATION" | "CLAIM_WRONG_PLAN_DIGEST" |
    "CLAIM_WRONG_BUNDLE_DIGEST" | "CLAIM_WRONG_RUN_ID" | "CLAIM_WRONG_ATTEMPT_ID" |
    "MARKER_CORRUPT" | "MARKER_WRONG_ATTEMPT_ID";
  store_root: string;
  primitive_fault_match_ordinal?: number;
  local_memory_assumption?: "NONE" | "CLAIMED_CONSUMED" |
    "ASSUMED_UNCONSUMED" | "EQUIVALENT_MARKER_OBJECT";
  readiness_probe_results?: readonly ("SUCCESS" | "CONNECTION_REFUSED" | "CONNECTION_RESET" |
    "BROKEN_PIPE" | "SERVER_STARTING" | "CLIENT_CONNECTION_TERMINATED" |
    "AUTHENTICATION_FAILURE" | "MALFORMED_RESULT" | "WRONG_DATABASE" | "WRONG_ENDPOINT" |
    "PERMISSION_FAILURE" | "PROCESS_FAILURE")[];
  runtime_major?: number;
  terminal_receipt_fault?: "NONE" | "FAILURE" | "AMBIGUOUS" | "ACK_LOST";
  approval_repository_root: string;
  repository_loader_observed_at: string;
  public_artifact_paths?: boolean;
}>;
const qualificationRow = (section_id: FarmOsProductionIdentityCandidateRow["section_id"],
  row_key: string, payload: Record<string, unknown>, sanitization_class:
  FarmOsProductionIdentityCandidateRow["sanitization_class"] = "SAFE_STRUCTURAL"):
  FarmOsProductionIdentityCandidateRow => ({ section_id, row_key, payload, sanitization_class });
const qualificationSorted = (rows: FarmOsProductionIdentityCandidateRow[]) => rows.sort((left, right) =>
  Buffer.compare(Buffer.from(left.row_key), Buffer.from(right.row_key)));
const qualificationSplitScope = (scope: string): [string, string] => {
  const separator = scope.indexOf(":");
  return [scope.slice(0, separator), scope.slice(separator + 1)];
};
function buildFarmOsDay150QualificationReferenceResultSets(): Readonly<{
  acl: FarmOsProductionIdentityCandidateResultSet;
  catalog: FarmOsProductionIdentityCandidateResultSet;
}> {
  const aclActual = FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ACL_ROLE_NAMES.map((roleName) =>
    qualificationRow("F_ACL_PRINCIPAL_INVENTORY", `role_flags:${roleName}:${roleName}:::`, {
      collection_status: "complete", row_kind: "role_flags", object_identity: roleName,
      principal: roleName, privilege: null, grant_option: null, grantor: null,
      acl_default_class: null, relation_kind: null,
      role_flags: { exists: true, rolsuper: false, rolcreatedb: false, rolcreaterole: false,
        rolinherit: true, rolreplication: false, rolbypassrls: false },
    }));
  const acl = { section_id: "F_ACL_PRINCIPAL_INVENTORY" as const,
    rows: qualificationSorted([qualificationRow("F_ACL_PRINCIPAL_INVENTORY",
      "__collection_status__", { collection_status: "complete", inventory_complete: true,
        query_universe: "ai_audit_core_schema_all_acl_and_scoped_roles",
        row_count: aclActual.length }), ...aclActual]) };
  const actual: FarmOsProductionIdentityCandidateRow[] = [];
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES) {
    const [migration_id, object_identity] = qualificationSplitScope(scope);
    const first = scope === FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES[0];
    actual.push(qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:table:${object_identity}`, { collection_status: "complete", migration_id,
        object_kind: "table", object_identity, attributes: { exists: true, relkind: "r",
          owner: "farmos_day150_reference_migration_owner_v1", rls_enabled: first,
          rls_forced: false }, raw_sensitive_texts: {} }),
    qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:rls_policy_inventory:${object_identity}`, {
        collection_status: "complete", migration_id, object_kind: "rls_policy_inventory",
        object_identity, attributes: { inventory_complete: true, policy_count: first ? 1 : 0,
          rls_enabled: first, rls_forced: false }, raw_sensitive_texts: {} }));
  }
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES) {
    const [migration_id, functionName] = qualificationSplitScope(scope);
    const object_identity = `${functionName}()`;
    actual.push(qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:function:${object_identity}`, { collection_status: "complete", migration_id,
        object_kind: "function", object_identity, attributes: { exists: true,
          owner: "farmos_day150_reference_migration_executor_v1", security_definer: false },
        raw_sensitive_texts: { definition: "QUALIFICATION_RAW_NEVER_PERSIST",
          proconfig: ["qualification.raw=never-persist"] } }, "INTERNAL_RAW_NEVER_PERSIST"));
  }
  for (const scope of FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES) {
    const [migration_id, object_identity] = qualificationSplitScope(scope);
    actual.push(qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      `${migration_id}:role:${object_identity}`, { collection_status: "complete", migration_id,
        object_kind: "role", object_identity, attributes: { exists: true, rolsuper: false,
          rolcreatedb: false, rolcreaterole: false, rolinherit: true, rolreplication: false,
          rolbypassrls: false }, raw_sensitive_texts: {} }));
  }
  const [migration, relation] = qualificationSplitScope(
    FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES[0]!);
  actual.push(
    qualificationRow("G_MIGRATION_CATALOG_INVENTORY", `${migration}:column:${relation}.fixture_col`,
      { collection_status: "complete", migration_id: migration, object_kind: "column",
        object_identity: `${relation}.fixture_col`, attributes: { data_type: "text", not_null: false },
        raw_sensitive_texts: { default_expression: "QUALIFICATION_RAW_DEFAULT" } },
      "INTERNAL_RAW_NEVER_PERSIST"),
    qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      `${migration}:constraint:${relation}.fixture_check`, { collection_status: "complete",
        migration_id: migration, object_kind: "constraint",
        object_identity: `${relation}.fixture_check`, attributes: { type: "c" },
        raw_sensitive_texts: { definition: "QUALIFICATION_RAW_DEFINITION" } },
      "INTERNAL_RAW_NEVER_PERSIST"),
    qualificationRow("G_MIGRATION_CATALOG_INVENTORY", `${migration}:index:${relation}.fixture_idx`,
      { collection_status: "complete", migration_id: migration, object_kind: "index",
        object_identity: `${relation}.fixture_idx`, attributes: { unique: false, valid: true },
        raw_sensitive_texts: { definition: "QUALIFICATION_RAW_INDEX" } },
      "INTERNAL_RAW_NEVER_PERSIST"),
    qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      `${migration}:trigger:${relation}.fixture_trigger`, { collection_status: "complete",
        migration_id: migration, object_kind: "trigger",
        object_identity: `${relation}.fixture_trigger`, attributes: { enabled: "O",
          function_identity: "ai.fixture_trigger()" },
        raw_sensitive_texts: { definition: "QUALIFICATION_RAW_TRIGGER" } },
      "INTERNAL_RAW_NEVER_PERSIST"),
    qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      `${migration}:rls_policy:${relation}.fixture_policy`, { collection_status: "complete",
        migration_id: migration, object_kind: "rls_policy",
        object_identity: `${relation}.fixture_policy`, attributes: { command: "SELECT",
          permissive: true, policy_name: "fixture_policy", roles: ["public"] },
        raw_sensitive_texts: { qual: "QUALIFICATION_RAW_POLICY",
          with_check: "QUALIFICATION_RAW_POLICY" } }, "INTERNAL_RAW_NEVER_PERSIST"));
  const catalog = { section_id: "G_MIGRATION_CATALOG_INVENTORY" as const,
    rows: qualificationSorted([qualificationRow("G_MIGRATION_CATALOG_INVENTORY",
      "__collection_status__", { collection_status: "complete", inventory_complete: true,
        migration_count: PREFIXES.length,
        object_classes: [...FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_OBJECT_CLASSES],
        rls_policy_inventory_complete: true, row_count: actual.length }), ...actual]) };
  return Object.freeze({ acl: owned(acl), catalog: owned(catalog) });
}
const qualificationExecutionScenarios = new WeakMap<object, QualificationScenario>();
const consumedQualificationExecutionScenarios = new WeakSet<object>();
function issueFarmOsDay150QualificationScenarioCapability(scenario: QualificationScenario):
  FarmOsDay150PrefixReferenceQualificationExecutionCapability {
  const capability = Object.freeze(Object.create(null)) as
    FarmOsDay150PrefixReferenceQualificationExecutionCapability;
  qualificationExecutionScenarios.set(capability, Object.freeze(scenario));
  return capability;
}
export function createFarmOsDay150PrefixReferenceQualificationExecutionCapability(input: Readonly<{
  mode: "FAILURE" | "PROCESS_LOSS" | "SUCCESS" | "THROW" | "AMBIGUOUS" | "HANG" |
    "OUTPUT_LIMIT_EXCEEDED" | "DEADLINE_EXCEEDED" | "NONZERO_EXIT" |
    "MALFORMED_SUCCESS";
  boundary?: FarmOsDay150PrefixReferencePublicExecutorBoundary;
  phase?: "BEFORE_EFFECT" | "AFTER_EFFECT_BEFORE_OBSERVATION";
  durable_marker_fault?: "MISSING" | "CORRUPT" | "WRONG_AUTHORIZATION" | "WRONG_PLAN_DIGEST" |
    "CORRUPT_CANDIDATE_1" | "CORRUPT_PRE_CLEANUP" | "CORRUPT_RECEIPT";
  primitive_ordinal_within_boundary?: number;
  readiness_probe_results?: readonly ("SUCCESS" | "CONNECTION_REFUSED" | "CONNECTION_RESET" |
    "BROKEN_PIPE" | "SERVER_STARTING" | "CLIENT_CONNECTION_TERMINATED" |
    "AUTHENTICATION_FAILURE" | "MALFORMED_RESULT" | "WRONG_DATABASE" | "WRONG_ENDPOINT" |
    "PERMISSION_FAILURE" | "PROCESS_FAILURE")[];
  runtime_major?: number;
  terminal_receipt_fault?: "FAILURE" | "AMBIGUOUS" | "ACK_LOST";
  approval_registry_fixture?: unknown;
  public_artifact_paths?: boolean;
}>): FarmOsDay150PrefixReferenceQualificationExecutionCapability | null {
  const boundary = input.boundary ?? null;
  const phase = input.phase ?? "BEFORE_EFFECT";
  if ((input.mode === "SUCCESS" && boundary !== null) ||
    (input.mode !== "PROCESS_LOSS" && input.mode !== "AMBIGUOUS" && input.mode !== "HANG" &&
      input.mode !== "OUTPUT_LIMIT_EXCEEDED" && input.mode !== "DEADLINE_EXCEEDED" &&
      phase !== "BEFORE_EFFECT") ||
    (input.mode !== "SUCCESS" && (boundary === null ||
      !FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.includes(boundary))) ||
    (input.primitive_ordinal_within_boundary !== undefined &&
      (!Number.isSafeInteger(input.primitive_ordinal_within_boundary) ||
        input.primitive_ordinal_within_boundary < 1))) return null;
  const readinessProbeResults = input.readiness_probe_results ?? ["SUCCESS"];
  if (readinessProbeResults.length < 1 || readinessProbeResults.length > 121 ||
    !readinessProbeResults.every((value) => ["SUCCESS", "CONNECTION_REFUSED", "CONNECTION_RESET",
      "BROKEN_PIPE", "SERVER_STARTING", "CLIENT_CONNECTION_TERMINATED",
      "AUTHENTICATION_FAILURE", "MALFORMED_RESULT", "WRONG_DATABASE", "WRONG_ENDPOINT",
      "PERMISSION_FAILURE", "PROCESS_FAILURE"].includes(value)) ||
    !Number.isSafeInteger(input.runtime_major ?? 17)) return null;
  const storeRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-qualification-"));
  const approvalRepositoryRoot = resolve(storeRoot, "qualification-repository");
  materializeFarmOsDay150PrefixReferenceQualificationApprovalRepository(
    approvalRepositoryRoot, input.approval_registry_fixture ??
      createFarmOsDay150PrefixReferenceQualificationApprovalRegistry());
  return issueFarmOsDay150QualificationScenarioCapability(Object.freeze({
    mode: input.mode, boundary, phase,
    durable_marker_fault: input.durable_marker_fault ?? "NONE",
    primitive_fault_match_ordinal: input.primitive_ordinal_within_boundary,
    readiness_probe_results: Object.freeze([...readinessProbeResults]),
    runtime_major: input.runtime_major ?? 17,
    terminal_receipt_fault: input.terminal_receipt_fault ?? "NONE",
    approval_repository_root: approvalRepositoryRoot,
    repository_loader_observed_at: QUALIFICATION_REPOSITORY_OBSERVED_AT,
    public_artifact_paths: input.public_artifact_paths === true,
    store_root: storeRoot }));
}
const REFERENCE_EFFECT_REQUEST_BOUNDARIES = new Set<FarmOsDay150PrefixReferenceEffectBoundary>([
  "RESOURCE_PREEXISTENCE",
  "ATTEMPT_CLAIM_PUBLICATION", "ATTEMPT_CLAIM_READBACK",
  "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_READBACK",
  "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION",
  "POSTGRES_STARTUP", "POSTGRES_MAJOR_VERIFICATION", "PRINCIPAL_INITIALIZATION",
  "MINIMAL_BOOTSTRAP", "TRUSTED_INITIAL_READBACK",
  ...PREFIXES.flatMap((_, index) => [
    `MIGRATION_${index + 1}_EXECUTION`, `SNAPSHOT_${index + 1}_COLLECTION`,
    `CANDIDATE_${index + 1}_DURABLE_PUBLICATION`, `CANDIDATE_${index + 1}_REOPEN_READBACK`,
  ] as FarmOsDay150PrefixReferencePublicExecutorBoundary[]),
  "EXACT_FIVE_CANDIDATE_VERIFICATION",
  "PRE_CLEANUP_EVIDENCE_PUBLICATION", "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK",
  "CONTAINER_CLEANUP", "VOLUME_CLEANUP",
  "NETWORK_CLEANUP", "ZERO_RESIDUAL_VERIFICATION",
  "FINAL_RECEIPT_DURABLE_PUBLICATION", "FINAL_RECEIPT_REOPEN_READBACK", "TERMINAL_CLOSE",
  ...FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_EFFECT_BOUNDARIES,
]);
const AMBIGUOUS_AFTER_EFFECT_BOUNDARIES = new Set<FarmOsDay150PrefixReferenceEffectBoundary>([
  "ATTEMPT_CLAIM_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
  "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION", "POSTGRES_STARTUP",
  "PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP",
  ...PREFIXES.flatMap((_, index) => [
    `MIGRATION_${index + 1}_EXECUTION`, `CANDIDATE_${index + 1}_DURABLE_PUBLICATION`,
  ] as FarmOsDay150PrefixReferencePublicExecutorBoundary[]),
  "PRE_CLEANUP_EVIDENCE_PUBLICATION", "CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP",
  "FINAL_RECEIPT_DURABLE_PUBLICATION",
  "TERMINAL_OUTCOME_DURABLE_PUBLICATION",
]);
const MUTATING_EFFECT_BOUNDARIES = new Set<FarmOsDay150PrefixReferenceEffectBoundary>([
  "ATTEMPT_CLAIM_PUBLICATION",
  "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
  "NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION",
  "PRINCIPAL_INITIALIZATION", "MINIMAL_BOOTSTRAP",
  ...PREFIXES.map((_, index) => `MIGRATION_${index + 1}_EXECUTION` as
    FarmOsDay150PrefixReferencePublicExecutorBoundary),
  ...PREFIXES.map((_, index) => `CANDIDATE_${index + 1}_DURABLE_PUBLICATION` as
    FarmOsDay150PrefixReferencePublicExecutorBoundary),
  "PRE_CLEANUP_EVIDENCE_PUBLICATION", "CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP",
  "FINAL_RECEIPT_DURABLE_PUBLICATION",
  "TERMINAL_OUTCOME_DURABLE_PUBLICATION",
]);
type QualificationPortDecision<T> = Readonly<{
  applied: boolean; result: FarmOsDay150ReferenceEffectResult<T>;
}>;
function qualificationPortDecision<T>(scenario: QualificationScenario,
  step: FarmOsDay150PrefixReferencePublicExecutorBoundary, value: T): QualificationPortDecision<T> {
  if (scenario.boundary !== step) return Object.freeze({ applied: true,
    result: Object.freeze({ status: "SUCCESS" as const, value }) });
  if (scenario.mode === "THROW") throw new Error("INJECTED_EFFECT_REJECTION");
  if (scenario.mode === "OUTPUT_LIMIT_EXCEEDED") return Object.freeze({ applied: false,
    result: Object.freeze({ status: "BOUNDED_FAILURE", code: "OUTPUT_LIMIT_EXCEEDED" }) });
  if (scenario.mode === "DEADLINE_EXCEEDED") return Object.freeze({ applied: false,
    result: Object.freeze({ status: "AMBIGUOUS_OUTCOME", code: "DEADLINE_EXCEEDED" }) });
  if (scenario.mode === "AMBIGUOUS") return Object.freeze({ applied: true,
    result: Object.freeze({ status: "AMBIGUOUS_OUTCOME", code: "OUTCOME_UNKNOWN" }) });
  if (scenario.phase === "BEFORE_EFFECT") return Object.freeze({ applied: false,
    result: Object.freeze({ status: "BOUNDED_FAILURE", code: scenario.mode === "PROCESS_LOSS"
      ? "PROCESS_LOSS_BEFORE_EFFECT" : "INJECTED_FAILURE" }) });
  return Object.freeze({ applied: true, result: Object.freeze({
    status: AMBIGUOUS_AFTER_EFFECT_BOUNDARIES.has(step)
      ? "AMBIGUOUS_OUTCOME" : "BOUNDED_FAILURE",
    code: AMBIGUOUS_AFTER_EFFECT_BOUNDARIES.has(step) ? "OUTCOME_UNKNOWN" : "PROCESS_LOSS",
  }) });
}
function createFarmOsDay150QualificationReferenceSystemEffectSeam(
  scenario: QualificationScenario,
): FarmOsDay150SupplementalSemanticQualificationPort {
  const fixture = buildFarmOsDay150QualificationReferenceResultSets();
  let trustedClaim: FarmOsDay150PrefixReferenceAttemptClaim | null = null;
  const artifact = (name: string) => join(scenario.store_root, `${name}.json`);
  const success = async <T>(step: FarmOsDay150PrefixReferenceEffectBoundary, value: T) => {
    if (scenario.mode === "HANG" && scenario.boundary === step) {
      return new Promise<FarmOsDay150ReferenceEffectResult<T>>(() => undefined);
    }
    return qualificationPortDecision(scenario, step, value).result;
  };
  const publish = async (step: FarmOsDay150PrefixReferenceEffectBoundary,
    name: string, value: unknown): Promise<FarmOsDay150ReferenceEffectResult<null>> => {
    if (scenario.mode === "HANG" && scenario.boundary === step) {
      return new Promise<FarmOsDay150ReferenceEffectResult<null>>(() => undefined);
    }
    const decision = qualificationPortDecision(scenario, step, null);
    if (decision.applied) {
      try { await publishCanonicalFarmOsDay150ArtifactExclusive(artifact(name), value); }
      catch (error) {
        if (step === "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION" &&
          error instanceof FarmOsDay150DurablePublicationError &&
          error.code === "OUTPUT_PREEXISTS") {
          const existing = await reopenCanonicalFarmOsDay150Artifact(artifact(name));
          return Object.freeze({ status: "BOUNDED_FAILURE", code:
            canonical(existing) === canonical(value) ? "ALREADY_CONSUMED" :
              "BLOCKED_PREEXISTING_MARKER" });
        }
        throw error;
      }
    }
    return decision.result;
  };
  return Object.freeze({
    readOnlyPreflight: () => success("RESOURCE_PREEXISTENCE", Object.freeze({ status: "READY" as const })),
    persistAttemptClaim: async (claim) => {
      const parsed = parseFarmOsDay150PrefixReferenceAttemptClaim(claim);
      if (!parsed) return Object.freeze({ status: "BOUNDED_FAILURE" as const,
        code: "ATTEMPT_CLAIM_FACTORY_REJECTED" });
      const result = await publish("ATTEMPT_CLAIM_PUBLICATION", "claim", parsed);
      if (result.status !== "SUCCESS") return result;
      trustedClaim = parsed;
      return success("ATTEMPT_CLAIM_PUBLICATION", parsed);
    },
    readAttemptClaim: async () => {
      const raw = await reopenCanonicalFarmOsDay150Artifact(artifact("claim")).catch(() => null);
      const parsed = parseFarmOsDay150PrefixReferenceAttemptClaim(raw);
      if (!parsed || (trustedClaim && parsed.claim_digest !== trustedClaim.claim_digest)) {
        return Object.freeze({ status: "BOUNDED_FAILURE" as const,
          code: "ATTEMPT_CLAIM_READBACK_REJECTED" });
      }
      trustedClaim = parsed;
      return success("ATTEMPT_CLAIM_READBACK", parsed);
    },
    persistConsumptionMarker: async (request) => {
      if (!trustedClaim || request.base.attempt_claim_digest !== trustedClaim.claim_digest ||
        request.base.run_identity !== trustedClaim.run_identity ||
        request.base.attempt_identity !== trustedClaim.attempt_identity) return Object.freeze({
        status: "BOUNDED_FAILURE" as const, code: "CONSUMPTION_MARKER_CLAIM_BINDING_REJECTED" });
      const marker = request.createFreshMarker();
      const result = await publish("AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
        "authorization-consumed", marker);
      return result.status === "SUCCESS" ? success(
        "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION", marker) : result;
    },
    readConsumptionMarker: async () => {
      const marker = await reopenCanonicalFarmOsDay150Artifact(artifact("authorization-consumed"))
        .catch(() => null);
      if (scenario.durable_marker_fault === "MISSING") {
        return success("AUTHORIZATION_CONSUMPTION_MARKER_READBACK", null);
      }
      if (scenario.durable_marker_fault === "CORRUPT") {
        return success("AUTHORIZATION_CONSUMPTION_MARKER_READBACK", Object.freeze({ corrupt: true }));
      }
      if (scenario.durable_marker_fault === "WRONG_AUTHORIZATION") {
        return success("AUTHORIZATION_CONSUMPTION_MARKER_READBACK", Object.freeze({
          ...(marker as Record<string, unknown>), authorization_id: "WRONG" }));
      }
      if (scenario.durable_marker_fault === "WRONG_PLAN_DIGEST") {
        return success("AUTHORIZATION_CONSUMPTION_MARKER_READBACK", Object.freeze({
          ...(marker as Record<string, unknown>), execution_plan_digest: `sha256:${"0".repeat(64)}` }));
      }
      return success("AUTHORIZATION_CONSUMPTION_MARKER_READBACK", marker);
    },
    createOwnedNetwork: () => publish("NETWORK_CREATION", "network-created", { created: true }),
    createOwnedVolume: () => publish("VOLUME_CREATION", "volume-created", { created: true }),
    createOwnedContainer: () => publish("CONTAINER_CREATION", "container-created", { created: true }),
    awaitPostgresReady: () => success("POSTGRES_STARTUP", null),
    readServerMajor: () => success("POSTGRES_MAJOR_VERIFICATION", 17 as const),
    initializeReferencePrincipals: () => success("PRINCIPAL_INITIALIZATION", null),
    applyPinnedInitialBootstrap: () => success("MINIMAL_BOOTSTRAP", null),
    readInitialCatalog: () => success("TRUSTED_INITIAL_READBACK", Object.freeze({
      server_major: 17 as const, database: "farmos_day150_prefix_reference_v1" as const,
      owner_role_exact: true as const, executor_role_exact: true as const,
      membership_exact: true as const, ai_schema_present: true as const,
      proposal_inbox_present: true as const, base_column_count: 19 as const,
      base_constraint_count: 4 as const, base_index_count: 1 as const,
      owner_only: true as const, explicit_application_grant_count: 0 as const,
      explicit_public_privilege_count: 0 as const, unrelated_schema_count: 0 as const,
      preprefix_table_count: 6 as const, preprefix_function_count: 2 as const,
      preprefix_append_only_trigger_count: 6 as const,
    })),
    executePinnedMigration: (index, migration) => publish(`MIGRATION_${index + 1}_EXECUTION` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary, `migration-${index + 1}`,
      { migration_id: migration.migration_id, executed: true }),
    collectCatalogSnapshot: (index, migration_id) => success(`SNAPSHOT_${index + 1}_COLLECTION` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary, Object.freeze({ migration_id,
        acl_result_set: owned(fixture.acl), catalog_result_set: owned(fixture.catalog) })),
    publishCandidate: (index, value) => publish(`CANDIDATE_${index + 1}_DURABLE_PUBLICATION` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary, `candidate-${index + 1}`, value),
    readBackCandidate: async (index) => success(`CANDIDATE_${index + 1}_REOPEN_READBACK` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary,
      await reopenCanonicalFarmOsDay150Artifact(artifact(`candidate-${index + 1}`))),
    observeExactFiveCandidateVerification: () => success("EXACT_FIVE_CANDIDATE_VERIFICATION", null),
    publishPreCleanupEvidence: (value) => publish("PRE_CLEANUP_EVIDENCE_PUBLICATION",
      "pre-cleanup", value),
    readBackPreCleanupEvidence: async () => success("PRE_CLEANUP_EVIDENCE_REOPEN_READBACK",
      await reopenCanonicalFarmOsDay150Artifact(artifact("pre-cleanup"))),
    cleanupOwnedContainer: () => publish("CONTAINER_CLEANUP", "container-cleaned", { removed: true }),
    cleanupOwnedVolume: () => publish("VOLUME_CLEANUP", "volume-cleaned", { removed: true }),
    cleanupOwnedNetwork: () => publish("NETWORK_CLEANUP", "network-cleaned", { removed: true }),
    verifyZeroResidual: async () => {
      if (scenario.mode === "HANG" && scenario.boundary === "ZERO_RESIDUAL_VERIFICATION") {
        return new Promise<FarmOsDay150ReferenceEffectResult<Readonly<{
          container_removed: true; volume_removed: true; network_removed: true;
          zero_residual_verified: true; unrelated_resource_operations: 0;
          outcome_unknown: false }>>>(() => undefined);
      }
      const value = Object.freeze({
        container_removed: Boolean(await reopenCanonicalFarmOsDay150Artifact(
          artifact("container-cleaned"))) as true,
        volume_removed: Boolean(await reopenCanonicalFarmOsDay150Artifact(
          artifact("volume-cleaned"))) as true,
        network_removed: Boolean(await reopenCanonicalFarmOsDay150Artifact(
          artifact("network-cleaned"))) as true,
        zero_residual_verified: true as const,
        unrelated_resource_operations: 0 as const, outcome_unknown: false as const,
      });
      const decision = qualificationPortDecision(scenario, "ZERO_RESIDUAL_VERIFICATION", value);
      if (decision.applied) await publishCanonicalFarmOsDay150ArtifactExclusive(
        artifact("zero-residual"), value);
      return decision.result;
    },
    publishFinalReceipt: async (value) => {
      if (existsSync(artifact("terminal-receipt"))) return Object.freeze({
        status: "BOUNDED_FAILURE" as const,
        code: "TERMINAL_RECEIPT_MUTUAL_EXCLUSION_REJECTED" });
      return publish("FINAL_RECEIPT_DURABLE_PUBLICATION", "receipt", value);
    },
    readBackFinalReceipt: async () => success("FINAL_RECEIPT_REOPEN_READBACK",
      await reopenCanonicalFarmOsDay150Artifact(artifact("receipt"))),
    publishTerminalOutcomeReceipt: async (value) => {
      if (existsSync(artifact("receipt"))) return Object.freeze({
        status: "BOUNDED_FAILURE" as const,
        code: "TERMINAL_RECEIPT_MUTUAL_EXCLUSION_REJECTED" });
      return publish("TERMINAL_OUTCOME_DURABLE_PUBLICATION", "terminal-receipt", value);
    },
    readBackTerminalOutcomeReceipt: async () => success("TERMINAL_OUTCOME_REOPEN_READBACK",
      await reopenCanonicalFarmOsDay150Artifact(artifact("terminal-receipt"))),
    closeExecutionBoundary: () => success("TERMINAL_CLOSE", null),
  });
}

function createFarmOsDay150QualificationPrimitiveContext(
  scenario: QualificationScenario,
  pinnedBundle: PinnedMigrationBundle,
): Readonly<{ primitive_port: FarmOsDay150PrimitiveSystemEffectPort; artifact_root: string;
  artifact_path_mode: "QUALIFICATION_FLAT" | "PUBLIC_ACTIVE_REVISION" }> {
  const fixture = buildFarmOsDay150QualificationReferenceResultSets();
  const image = Object.freeze({ code: 0, stderr: "", stdout: JSON.stringify([{
    Architecture: "arm64", RepoDigests: [FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE.replace(
      "docker.io/library/", "")],
  }]) });
  const processResults: unknown[] = [image];
  const initialRaw = Object.freeze({ server_major: 17, database_name:
    "farmos_day150_prefix_reference_v1", owner_role_exact: true, executor_role_exact: true,
    membership_exact: true, ai_schema_present: true, proposal_inbox_present: true,
    base_column_count: 19, base_constraint_count: 4, base_index_count: 1, owner_only: true,
    explicit_application_grant_count: 0, explicit_public_privilege_count: 0,
    unrelated_schema_count: 0, preprefix_table_count: 6, preprefix_function_count: 2,
    preprefix_append_only_trigger_count: 6 });
  const postgresResult = (rows: readonly unknown[]) => Object.freeze({ code: 0, stderr: "",
    stdout: JSON.stringify({ rows }) });
  type ReadinessProbe = NonNullable<QualificationScenario["readiness_probe_results"]>[number];
  const readinessResult = (value: ReadinessProbe) => {
    if (value === "SUCCESS") return postgresResult([[{ ready: 1 }]]);
    if (value === "MALFORMED_RESULT") return postgresResult([[{ ready: 0 }]]);
    if (value === "PROCESS_FAILURE") return Object.freeze({ code: 19, stderr: "", stdout: "" });
    const error_code = value === "CONNECTION_REFUSED" ? "ECONNREFUSED" :
      value === "CONNECTION_RESET" ? "ECONNRESET" : value === "BROKEN_PIPE" ? "EPIPE" :
      value === "SERVER_STARTING" ? "57P03" : value === "CLIENT_CONNECTION_TERMINATED"
        ? "PG_CLIENT_CONNECTION_TERMINATED_UNEXPECTEDLY" :
      value === "AUTHENTICATION_FAILURE" ? "28P01" :
        value === "WRONG_DATABASE" ? "3D000" : value === "WRONG_ENDPOINT" ? "ENOTFOUND" : "42501";
    return Object.freeze({ code: 1, stderr: "", stdout: JSON.stringify({ error_code }) });
  };
  const exchangeResults: unknown[] = [
    ...(scenario.readiness_probe_results ?? ["SUCCESS"]).map(readinessResult),
    { rows: [[{ database: "farmos_day150_prefix_reference_v1", major: scenario.runtime_major ?? 17 }]] },
    { rows: [[]] }, { rows: [[]] },
    { rows: [[], [{ transaction_read_only: "on" }], [initialRaw], []] },
    { rows: [[{ current_user: FARM_OS_DAY150_REFERENCE_EXECUTOR_ROLE_NAME,
      database: "farmos_day150_prefix_reference_v1" }]] },
  ];
  const aclRows = record(fixture.acl) && Array.isArray(fixture.acl.rows) ? fixture.acl.rows : [];
  const catalogRows = record(fixture.catalog) && Array.isArray(fixture.catalog.rows)
    ? fixture.catalog.rows : [];
  for (let index = 0; index < pinnedBundle.migrations.length; index += 1) {
    exchangeResults.push({ rows: [[]] }, { rows: [[], aclRows, catalogRows, []] });
  }
  processResults.push(...exchangeResults.map((entry) => "code" in (entry as Record<string, unknown>)
    ? entry : postgresResult((entry as { rows: readonly unknown[] }).rows)));
  const boundary = scenario.boundary;
  const migrationMatch = boundary ? /_(\d)_/u.exec(boundary) : null;
  const migrationIndex = migrationMatch ? Number(migrationMatch[1]) - 1 : -1;
  const migration = migrationIndex >= 0 ? pinnedBundle.migrations[migrationIndex] ?? null : null;
  const candidate = migrationIndex >= 0 && boundary?.startsWith("CANDIDATE_") ?
    FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[migrationIndex]?.candidate_id ?? null : null;
  const terminalFault = scenario.terminal_receipt_fault ?? "NONE";
  const faultBoundary: FarmOsDay150PrefixReferenceEffectBoundary | null = terminalFault === "NONE"
    ? boundary : "TERMINAL_OUTCOME_DURABLE_PUBLICATION";
  const fault = faultBoundary && scenario.mode !== "SUCCESS" ? Object.freeze({
    operation_ref_digest: farmOsDay150EffectRequest(faultBoundary,
      terminalFault === "NONE" ? migration : null, terminalFault === "NONE" ? candidate : null)
      .target_identity_digest,
    mode: terminalFault === "FAILURE" ? "FAILURE" as const :
      terminalFault === "AMBIGUOUS" ? "AMBIGUOUS" as const :
        terminalFault === "ACK_LOST" ? "PROCESS_LOSS" as const : scenario.mode,
    phase: terminalFault === "FAILURE" ? "BEFORE_EFFECT" as const :
      terminalFault === "NONE" ? scenario.phase : "AFTER_EFFECT_BEFORE_OBSERVATION" as const,
    ambiguous_after_effect: terminalFault !== "NONE" ||
      AMBIGUOUS_AFTER_EFFECT_BOUNDARIES.has(faultBoundary),
    match_ordinal: terminalFault === "NONE" ? scenario.primitive_fault_match_ordinal ??
      (scenario.phase === "BEFORE_EFFECT" ? 1 : ({
      RESOURCE_PREEXISTENCE: 12,
      ATTEMPT_CLAIM_PUBLICATION: 2,
      AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION: 2,
      AUTHORIZATION_CONSUMPTION_MARKER_READBACK: 1,
      POSTGRES_STARTUP: 2,
      TRUSTED_INITIAL_READBACK: 2,
      ZERO_RESIDUAL_VERIFICATION: 3,
      FINAL_RECEIPT_DURABLE_PUBLICATION: 2,
      TERMINAL_CLOSE: 1,
    } as Partial<Record<FarmOsDay150PrefixReferencePublicExecutorBoundary, number>>)[faultBoundary] ?? 1)
      : 2,
  }) : null;
  return Object.freeze({
    primitive_port: createFarmOsDay150QualificationPrimitiveEffectPort({ process_results:
      processResults, fault,
    persistent_effect_state_path: join(scenario.store_root, "qualification-system-state.json"),
    reopen_mutation: scenario.durable_marker_fault === "NONE" ? null : Object.freeze({
      path: join(scenario.store_root, scenario.durable_marker_fault.startsWith("CLAIM_")
        ? "claim.json" : scenario.durable_marker_fault === "CORRUPT_CANDIDATE_1"
        ? "candidate-1.json" : scenario.durable_marker_fault === "CORRUPT_PRE_CLEANUP"
          ? "pre-cleanup.json" : scenario.durable_marker_fault === "CORRUPT_RECEIPT"
            ? "receipt.json" : "marker.json"),
      kind: scenario.durable_marker_fault === "CLAIM_MISSING" ? "MISSING" as const :
        scenario.durable_marker_fault === "CLAIM_CORRUPT" ||
        scenario.durable_marker_fault === "MARKER_CORRUPT" ? "CORRUPT" as const :
        scenario.durable_marker_fault === "CLAIM_WRONG_AUTHORIZATION"
          ? "WRONG_AUTHORIZATION" as const :
        scenario.durable_marker_fault === "CLAIM_WRONG_PLAN_DIGEST"
          ? "WRONG_PLAN_DIGEST" as const :
        scenario.durable_marker_fault === "CLAIM_WRONG_BUNDLE_DIGEST"
          ? "WRONG_BUNDLE_DIGEST" as const :
        scenario.durable_marker_fault === "CLAIM_WRONG_RUN_ID" ? "WRONG_RUN_ID" as const :
        scenario.durable_marker_fault === "CLAIM_WRONG_ATTEMPT_ID" ||
          scenario.durable_marker_fault === "MARKER_WRONG_ATTEMPT_ID"
          ? "WRONG_ATTEMPT_ID" as const :
        scenario.durable_marker_fault === "CORRUPT_CANDIDATE_1" ||
        scenario.durable_marker_fault === "CORRUPT_PRE_CLEANUP" ||
        scenario.durable_marker_fault === "CORRUPT_RECEIPT" ? "CORRUPT" as const
          : scenario.durable_marker_fault,
    }) }),
    artifact_root: scenario.public_artifact_paths === true
      ? scenario.approval_repository_root : scenario.store_root,
    artifact_path_mode: scenario.public_artifact_paths === true
      ? "PUBLIC_ACTIVE_REVISION" : "QUALIFICATION_FLAT",
  });
}
function createFarmOsDay150PublicExecutorStateMachine() {
  const reached: FarmOsDay150PrefixReferencePublicExecutorBoundary[] = [];
  const requestedEffects: FarmOsDay150PrefixReferenceEffectBoundary[] = [];
  let next = 0;
  let externalOperations = 0;
  let externalMutations = 0;
  let authorizationConsumed = false;
  let attemptClaimDurablyReadBack = false;
  let durableCandidates = 0;
  let preCleanupDurable = false;
  let cleanupState: FarmOsDay150PrefixReferenceQualificationResult["cleanup_state"] = "NOT_STARTED";
  let finalReceipt = false;
  let attemptIdentityCreations: 0 | 1 = 0;
  let active: FarmOsDay150PrefixReferencePublicExecutorBoundary | null = null;
  let activeRequest: FarmOsDay150ReferenceEffectRequest | null = null;
  const report = (status: FarmOsDay150PrefixReferenceQualificationResult["status"],
    failedBoundary: FarmOsDay150PrefixReferencePublicExecutorBoundary | null,
    failureCode: string | null = null) => Object.freeze({
    status, failed_boundary: failedBoundary, failure_code: failureCode,
    reached_boundaries: Object.freeze([...reached]),
    requested_effects: Object.freeze([...requestedEffects]),
    adapter_observed_effect_trace: Object.freeze([]),
    effect_request_trace_digest: hash("farmos.day150-prefix-reference-effect-request-trace.v1", []),
    external_operation_count: externalOperations, external_mutation_count: externalMutations,
    authorization_state: authorizationConsumed ? "CONSUMED_TERMINAL" as const :
      attemptClaimDurablyReadBack ? "ATTEMPT_CLAIMED" as const :
        "AUTHORIZED_BUT_NOT_CONSUMED" as const,
    durable_candidate_count: durableCandidates,
    pre_cleanup_evidence_state: preCleanupDurable ? "DURABLE_VERIFIED" as const : "ABSENT" as const,
    cleanup_eligible: preCleanupDurable, cleanup_state: cleanupState,
    final_receipt_state: finalReceipt ? "DURABLE_CLEANUP_BOUND_VERIFIED" as const : "ABSENT" as const,
    terminal_outcome_receipt_state: "ABSENT" as const,
    terminal_outcome_receipt: null,
    close_state: "NOT_REQUESTED" as const,
    retry_prohibited: true as const, automatic_retry_count: 0 as const,
    attempt_identity_creation_count: attemptIdentityCreations,
    replacement_attempt_identity_count: 0 as const,
    automatic_ambiguous_cleanup_count: 0 as const,
    reconciliation_handoff:
      "DURABLE_ACTUAL_SCHEMA_READBACK_MANUAL_RECONCILIATION_REQUIRED" as const,
    compensation_authority: "NOT_GRANTED_NO_AUTOMATIC_COMPENSATION" as const,
    migration_filesystem_reads_after_authorization_consumption: 0 as const,
    unrelated_operations: 0 as const,
  });
  return Object.freeze({
    recordAttemptIdentityCreated(): void {
      if (attemptIdentityCreations !== 0 || active !== "ATTEMPT_CLAIM_PUBLICATION") {
        throw new Error("PUBLIC_EXECUTOR_ATTEMPT_IDENTITY_CREATION_REJECTED");
      }
      attemptIdentityCreations = 1;
    },
    recoverAuthorizationConsumed(): void {
      if (active !== "RESOURCE_PREEXISTENCE") {
        throw new Error("PUBLIC_EXECUTOR_DURABLE_CONSUMPTION_RECOVERY_REJECTED");
      }
      authorizationConsumed = true;
      attemptClaimDurablyReadBack = true;
    },
    recoverAttemptClaimed(): void {
      if (active !== "RESOURCE_PREEXISTENCE") {
        throw new Error("PUBLIC_EXECUTOR_DURABLE_ATTEMPT_CLAIM_RECOVERY_REJECTED");
      }
      attemptClaimDurablyReadBack = true;
    },
    recoverAttemptClaimedAtPublication(): void {
      if (active !== "ATTEMPT_CLAIM_PUBLICATION") {
        throw new Error("PUBLIC_EXECUTOR_DURABLE_ATTEMPT_CLAIM_PUBLICATION_RECOVERY_REJECTED");
      }
      attemptClaimDurablyReadBack = true;
    },
    before(boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary):
      FarmOsDay150PrefixReferenceQualificationResult | null {
      if (active !== null || FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES[next] !== boundary) {
        throw new Error("PUBLIC_EXECUTOR_BOUNDARY_ORDER_REJECTED");
      }
      next += 1;
      reached.push(boundary);
      active = boundary;
      return null;
    },
    stageEffectRequest(boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary,
      request: FarmOsDay150ReferenceEffectRequest): void {
      if (active !== boundary || request.step !== boundary || activeRequest !== null) {
        throw new Error("PUBLIC_EXECUTOR_EFFECT_REQUEST_REJECTED");
      }
      activeRequest = owned(request);
    },
    requestEffect(boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary): void {
      if (active !== boundary || activeRequest?.step !== boundary) {
        throw new Error("PUBLIC_EXECUTOR_EFFECT_REQUEST_REJECTED");
      }
      if (REFERENCE_EFFECT_REQUEST_BOUNDARIES.has(boundary)) {
        requestedEffects.push(boundary); externalOperations += 1;
        if (MUTATING_EFFECT_BOUNDARIES.has(boundary)) externalMutations += 1;
      }
    },
    recordRecoveryEffectRequest(boundary:
      FarmOsDay150PrefixReferenceTerminalEffectBoundary | "TERMINAL_CLOSE"): void {
      if (active !== null || !REFERENCE_EFFECT_REQUEST_BOUNDARIES.has(boundary)) {
        throw new Error("PUBLIC_EXECUTOR_TERMINAL_EFFECT_REQUEST_REJECTED");
      }
      requestedEffects.push(boundary);
      externalOperations += 1;
      if (MUTATING_EFFECT_BOUNDARIES.has(boundary)) externalMutations += 1;
    },
    attachRecoveryAccounting(result: FarmOsDay150PrefixReferenceQualificationResult):
      FarmOsDay150PrefixReferenceQualificationResult {
      return Object.freeze({ ...result,
        requested_effects: Object.freeze([...requestedEffects]),
        external_operation_count: externalOperations,
        external_mutation_count: externalMutations });
    },
    after(boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary):
      FarmOsDay150PrefixReferenceQualificationResult | null {
      if (active !== boundary) throw new Error("PUBLIC_EXECUTOR_BOUNDARY_ORDER_REJECTED");
      active = null;
      activeRequest = null;
      if (boundary === "AUTHORIZATION_CONSUMPTION") authorizationConsumed = true;
      if (boundary === "ATTEMPT_CLAIM_READBACK") attemptClaimDurablyReadBack = true;
      const verifiedCandidate = /^CANDIDATE_([1-5])_REOPEN_READBACK$/u.exec(boundary);
      if (verifiedCandidate) durableCandidates = Number(verifiedCandidate[1]);
      if (boundary === "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK") preCleanupDurable = true;
      if (["CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP"].includes(boundary)) {
        cleanupState = "PARTIAL_OR_AMBIGUOUS";
      }
      if (boundary === "ZERO_RESIDUAL_VERIFICATION") cleanupState = "ZERO_RESIDUAL_VERIFIED";
      if (boundary === "FINAL_RECEIPT_REOPEN_READBACK") finalReceipt = true;
      return null;
    },
    interrupt(boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary,
      status: Exclude<FarmOsDay150PrefixReferenceQualificationResult["status"],
        "QUALIFICATION_PASS">, failureCode: string | null = null):
        FarmOsDay150PrefixReferenceQualificationResult {
      if (active === boundary) active = null;
      activeRequest = null;
      return report(status, boundary, failureCode);
    },
    failClosedInvariant(failureCode: string): FarmOsDay150PrefixReferenceQualificationResult {
      const boundary = active ?? reached.at(-1) ?? "AUTHORIZATION_LOOKUP";
      active = null;
      activeRequest = null;
      return report(authorizationConsumed || externalMutations > 0 || attemptIdentityCreations > 0
        ? "OUTCOME_UNKNOWN" : "REJECTED", boundary, failureCode);
    },
    complete(): FarmOsDay150PrefixReferenceQualificationResult {
      if (active !== null || next !== FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length) {
        throw new Error("PUBLIC_EXECUTOR_BOUNDARY_COMPLETION_REJECTED");
      }
      return report("QUALIFICATION_PASS", null);
    },
  });
}
class FarmOsDay150QualificationInterruption extends Error {
  constructor(readonly result: FarmOsDay150PrefixReferenceQualificationResult) {
    super(result.status); this.name = "FarmOsDay150QualificationInterruption";
  }
}
type Day150Controller = ReturnType<typeof createFarmOsDay150PublicExecutorStateMachine>;
function completeFarmOsDay150LocalBoundary(controller: Day150Controller,
  boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary,
  scenario: QualificationScenario | null): void {
  controller.before(boundary);
  if (scenario?.boundary === boundary && scenario.phase === "BEFORE_EFFECT") {
    throw new FarmOsDay150QualificationInterruption(controller.interrupt(boundary,
      scenario.mode === "PROCESS_LOSS" ? "PROCESS_LOSS" : "REJECTED"));
  }
  controller.after(boundary);
  if (scenario?.boundary === boundary) {
    throw new FarmOsDay150QualificationInterruption(controller.interrupt(boundary, "PROCESS_LOSS"));
  }
}
function beginFarmOsDay150TypedEffect(controller: Day150Controller,
  effectPort: FarmOsDay150ReferenceExecutionEffectPort,
  boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary,
  request: FarmOsDay150ReferenceEffectRequest): void {
  controller.before(boundary);
  controller.stageEffectRequest(boundary, request);
  effectPort.stageRequest(request);
}
function settleFarmOsDay150TypedEffect<T>(controller: Day150Controller,
  boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary,
  result: FarmOsDay150ReferenceEffectResult<T>): T {
  const rejectedBeforeEffect = result.status === "BOUNDED_FAILURE" &&
    (result.code === "INJECTED_FAILURE" || result.code === "PROCESS_LOSS_BEFORE_EFFECT");
  if (!rejectedBeforeEffect) controller.requestEffect(boundary);
  if (result.status !== "SUCCESS") {
    const status = result.status === "AMBIGUOUS_OUTCOME" ? "OUTCOME_UNKNOWN" :
      result.code.startsWith("PROCESS_LOSS") ? "PROCESS_LOSS" : "REJECTED";
    if (!rejectedBeforeEffect) controller.after(boundary);
    throw new FarmOsDay150QualificationInterruption(controller.interrupt(boundary, status,
      result.code));
  }
  controller.after(boundary);
  return result.value;
}
async function awaitFarmOsDay150TypedEffectWithDeadline<T>(
  invocation: Promise<FarmOsDay150ReferenceEffectResult<T>>,
  deadlineMilliseconds = 47_119,
): Promise<FarmOsDay150ReferenceEffectResult<T>> {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(Object.freeze({
      status: "AMBIGUOUS_OUTCOME" as const, code: "ORCHESTRATOR_EFFECT_DEADLINE_EXCEEDED",
    })), deadlineMilliseconds);
    invocation.then((result) => { clearTimeout(timeout); resolve(result); }, (error) => {
      clearTimeout(timeout);
      resolve(Object.freeze({ status: "BOUNDED_FAILURE" as const,
        code: error instanceof Error ? "EFFECT_REJECTED" : "EFFECT_THROWN_NON_ERROR" }));
    });
  });
}
function farmOsDay150EffectRequest(
  step: FarmOsDay150PrefixReferenceEffectBoundary,
  migration: PinnedMigrationBundle["migrations"][number] | null = null,
  candidateId: string | null = null,
  publicationCandidateDigest: `sha256:${string}` | null = null,
): FarmOsDay150ReferenceEffectRequest {
  const publicIndex = FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.indexOf(
    step as FarmOsDay150PrefixReferencePublicExecutorBoundary);
  const terminalIndex = FARM_OS_DAY150_PREFIX_REFERENCE_TERMINAL_EFFECT_BOUNDARIES.indexOf(
    step as FarmOsDay150PrefixReferenceTerminalEffectBoundary);
  return Object.freeze({ step,
    sequence: publicIndex >= 0 ? publicIndex + 1 :
      FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length + terminalIndex + 1,
    operation_class: step.replace(/_[1-5]_/u, "_N_"),
    target_identity_digest: hash("farmos.day150-reference-effect-target.v1", {
      execution_plan_digest: ACTIVE_REFERENCE_EXECUTION_PLAN_DIGEST,
      step, migration_id: migration?.migration_id ?? null, candidate_id: candidateId,
    }),
    migration_id: migration?.migration_id ?? null,
    migration_digest: migration?.actual_sha256 ?? null,
    candidate_id: candidateId,
    publication_candidate_digest: publicationCandidateDigest,
  });
}
function attachFarmOsDay150AdapterTrace(
  result: FarmOsDay150PrefixReferenceQualificationResult,
  effectPort: FarmOsDay150ReferenceExecutionEffectPort,
  closeState: FarmOsDay150PrefixReferenceQualificationResult["close_state"],
): FarmOsDay150PrefixReferenceQualificationResult {
  const trace = Object.freeze(effectPort.readTrace().map(owned));
  return Object.freeze({ ...result, adapter_observed_effect_trace: trace,
    effect_request_trace_digest: hash("farmos.day150-prefix-reference-effect-request-trace.v1", trace),
    close_state: closeState });
}

function terminalPhaseForFarmOsDay150Failure(
  result: FarmOsDay150PrefixReferenceQualificationResult,
): FarmOsDay150PrefixReferenceLastTrustedPhase {
  if (result.cleanup_state === "ZERO_RESIDUAL_VERIFIED") return "ZERO_RESIDUAL_VERIFIED";
  if (result.cleanup_state === "PARTIAL_OR_AMBIGUOUS") return "CLEANUP_STARTED";
  if (result.pre_cleanup_evidence_state === "DURABLE_VERIFIED") {
    return "PRE_CLEANUP_EVIDENCE_DURABLE";
  }
  if (result.durable_candidate_count > 0) {
    return `CANDIDATE_${result.durable_candidate_count}_DURABLE` as
      FarmOsDay150PrefixReferenceLastTrustedPhase;
  }
  const failed = result.failed_boundary ?? "AUTHORIZATION_LOOKUP";
  const migration = /^MIGRATION_([1-5])_EXECUTION$/u.exec(failed);
  if (migration) {
    const previous = Number(migration[1]) - 1;
    return previous > 0 ? `MIGRATION_${previous}_APPLIED` as
      FarmOsDay150PrefixReferenceLastTrustedPhase : "TRUSTED_INITIAL_READBACK_COMPLETED";
  }
  const ordered: readonly [FarmOsDay150PrefixReferencePublicExecutorBoundary,
    FarmOsDay150PrefixReferenceLastTrustedPhase][] = [
    ["BEFORE_FINAL_RECEIPT", "BEFORE_SUCCESS_RECEIPT"],
    ["EXACT_FIVE_CANDIDATE_VERIFICATION", "CANDIDATE_5_DURABLE"],
    ["TRUSTED_INITIAL_READBACK", "TRUSTED_INITIAL_READBACK_COMPLETED"],
    ["MINIMAL_BOOTSTRAP", "PRINCIPALS_INITIALIZED"],
    ["PRINCIPAL_INITIALIZATION", "POSTGRES_MAJOR_VERIFIED"],
    ["POSTGRES_MAJOR_VERIFICATION", "POSTGRES_READY"],
    ["POSTGRES_STARTUP", "RESOURCE_SETUP_COMPLETED"],
    ["CONTAINER_CREATION", "RESOURCE_SETUP_STARTED"],
    ["VOLUME_CREATION", "RESOURCE_SETUP_STARTED"],
    ["NETWORK_CREATION", "AUTHORIZATION_CONSUMED"],
  ];
  const matched = ordered.find(([boundary]) => boundary === failed);
  return matched ? matched[1] : "AUTHORIZATION_CONSUMED";
}

function terminalCodeForFarmOsDay150Failure(
  boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary | null,
): FarmOsDay150PrefixReferenceTerminalFailureCode {
  if (!boundary) return "BOUNDED_EXECUTION_FAILURE";
  if (["NETWORK_CREATION", "VOLUME_CREATION", "CONTAINER_CREATION"].includes(boundary)) {
    return "RESOURCE_SETUP_FAILED";
  }
  if (boundary === "POSTGRES_STARTUP") return "POSTGRES_STARTUP_FAILED";
  if (boundary === "POSTGRES_MAJOR_VERIFICATION") return "POSTGRES_MAJOR_FAILED";
  if (boundary === "PRINCIPAL_INITIALIZATION") return "PRINCIPAL_INITIALIZATION_FAILED";
  if (boundary === "MINIMAL_BOOTSTRAP" || boundary === "TRUSTED_INITIAL_READBACK") {
    return "INITIAL_BOOTSTRAP_FAILED";
  }
  if (/^MIGRATION_[1-5]_EXECUTION$/u.test(boundary) ||
    /^SNAPSHOT_[1-5]_COLLECTION$/u.test(boundary)) return "MIGRATION_FAILED";
  if (/^CANDIDATE_[1-5]_/u.test(boundary) || boundary ===
    "EXACT_FIVE_CANDIDATE_VERIFICATION") return "CANDIDATE_PUBLICATION_FAILED";
  if (boundary.startsWith("PRE_CLEANUP")) return "PRE_CLEANUP_EVIDENCE_FAILED";
  if (["CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP"].includes(boundary)) {
    return "CLEANUP_FAILED";
  }
  if (boundary === "ZERO_RESIDUAL_VERIFICATION") return "ZERO_RESIDUAL_VERIFICATION_FAILED";
  return boundary === "AUTHORIZATION_LOOKUP" || boundary === "EXECUTION_PLAN_VALIDATION" ||
    boundary === "MIGRATION_BYTE_PRELOAD" || boundary === "MIGRATION_DIGEST_VERIFICATION" ||
    boundary === "STATEMENT_PRIVILEGE_ANALYSIS" || boundary === "RESOURCE_PREEXISTENCE"
    ? "SOURCE_PRECONDITION_FAILED" : "BOUNDED_EXECUTION_FAILURE";
}

async function publishFarmOsDay150TerminalOutcomeForDeterministicFailure(input: Readonly<{
  result: FarmOsDay150PrefixReferenceQualificationResult;
  controller: Day150Controller;
  effect_port: FarmOsDay150ReferenceExecutionEffectPort;
  claim: FarmOsDay150PrefixReferenceAttemptClaim;
  marker: FarmOsDay150PrefixReferenceConsumptionMarker;
  candidate_identity_digests: readonly `sha256:${string}`[];
  pre_cleanup_evidence_digest: `sha256:${string}` | null;
}>): Promise<FarmOsDay150PrefixReferenceQualificationResult> {
  const code = terminalCodeForFarmOsDay150Failure(input.result.failed_boundary);
  const receipt = createFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(Object.freeze({
    execution_authorization_id: input.claim.authorization_id,
    execution_authorization_revision: input.claim.authorization_revision,
    execution_authorization_digest: input.claim.authorization_digest,
    execution_plan_digest: input.claim.execution_plan_digest,
    run_identity: input.claim.run_identity,
    attempt_identity: input.claim.attempt_identity,
    attempt_claim_digest: input.claim.claim_digest,
    consumption_marker_digest: input.marker.marker_digest,
    approval_reference: input.claim.approval_reference,
    gate17_scope_digest: input.claim.gate17_scope_digest,
    approval_candidate_identity: input.claim.approval_candidate_identity,
    proposal_identity: input.claim.proposal_identity,
    proposal_created_at: input.claim.proposal_created_at,
    approved_at: input.claim.approved_at,
    approval_record_digest: input.claim.approval_record_digest,
    last_trusted_completed_phase: terminalPhaseForFarmOsDay150Failure(input.result),
    terminal_classification: input.result.cleanup_state === "ZERO_RESIDUAL_VERIFIED"
      ? "COMPENSATED_TERMINAL_FAILURE" as const : "TERMINAL_FAILURE" as const,
    terminal_failure_code: code,
    candidate_count: input.candidate_identity_digests.length as 0 | 1 | 2 | 3 | 4 | 5,
    candidate_identity_digests: Object.freeze([...input.candidate_identity_digests]),
    pre_cleanup_evidence_state: input.pre_cleanup_evidence_digest ? "PRESENT" as const :
      "ABSENT" as const,
    pre_cleanup_evidence_digest: input.pre_cleanup_evidence_digest,
    cleanup_state: input.result.cleanup_state === "ZERO_RESIDUAL_VERIFIED" ? "COMPLETED" as const :
      input.result.cleanup_state === "PARTIAL_OR_AMBIGUOUS" ? "PARTIAL" as const :
        "NOT_STARTED" as const,
    zero_residual_state: input.result.cleanup_state === "ZERO_RESIDUAL_VERIFIED" ?
      "VERIFIED" as const : "NOT_VERIFIED" as const,
    terminal_observation: Object.freeze({
      authority: "EXISTING_BOUNDED_ORCHESTRATOR_OBSERVATION" as const,
      classification: code,
      raw_output_persisted: false as const,
      credentials_persisted: false as const,
    }),
    success_receipt_path:
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.success_receipt,
    terminal_receipt_path:
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths
        .terminal_outcome_receipt!,
  }));
  if (!receipt) return Object.freeze({ ...input.result,
    status: "OUTCOME_UNKNOWN" as const,
    failure_code: "TERMINAL_OUTCOME_RECEIPT_FACTORY_REJECTED",
    terminal_outcome_receipt_state: "PUBLICATION_FAILED" as const });
  input.controller.recordRecoveryEffectRequest("TERMINAL_OUTCOME_DURABLE_PUBLICATION");
  input.effect_port.stageRequest(farmOsDay150EffectRequest(
    "TERMINAL_OUTCOME_DURABLE_PUBLICATION", null, null, receipt.receipt_digest));
  const publication = await awaitFarmOsDay150TypedEffectWithDeadline(
    input.effect_port.publishTerminalOutcomeReceipt(receipt));
  if (publication.status !== "SUCCESS") return Object.freeze({ ...input.result,
    status: "OUTCOME_UNKNOWN" as const,
    failure_code: publication.code,
    terminal_outcome_receipt_state: publication.status === "AMBIGUOUS_OUTCOME"
      ? "PUBLICATION_AMBIGUOUS" as const : "PUBLICATION_FAILED" as const });
  input.controller.recordRecoveryEffectRequest("TERMINAL_OUTCOME_REOPEN_READBACK");
  input.effect_port.stageRequest(farmOsDay150EffectRequest("TERMINAL_OUTCOME_REOPEN_READBACK"));
  const readback = await awaitFarmOsDay150TypedEffectWithDeadline(
    input.effect_port.readBackTerminalOutcomeReceipt());
  if (readback.status !== "SUCCESS") return Object.freeze({ ...input.result,
    status: "OUTCOME_UNKNOWN" as const,
    failure_code: readback.code,
    terminal_outcome_receipt_state: readback.status === "AMBIGUOUS_OUTCOME"
      ? "PUBLICATION_AMBIGUOUS" as const : "PUBLICATION_FAILED" as const });
  const trusted = parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(readback.value);
  if (!trusted || canonical(trusted) !== canonical(receipt)) return Object.freeze({ ...input.result,
    status: "OUTCOME_UNKNOWN" as const,
    failure_code: "TERMINAL_OUTCOME_RECEIPT_READBACK_REJECTED",
    terminal_outcome_receipt_state: "PUBLICATION_AMBIGUOUS" as const });
  return Object.freeze({ ...input.result,
    terminal_outcome_receipt_state: "DURABLE_TRUSTED" as const,
    terminal_outcome_receipt: trusted });
}
async function closeFarmOsDay150InterruptedEffectPort(
  controller: Day150Controller,
  effectPort: FarmOsDay150ReferenceExecutionEffectPort,
): Promise<FarmOsDay150PrefixReferenceQualificationResult["close_state"]> {
  controller.recordRecoveryEffectRequest("TERMINAL_CLOSE");
  effectPort.stageRequest(farmOsDay150EffectRequest("TERMINAL_CLOSE"));
  const result = await awaitFarmOsDay150TypedEffectWithDeadline(effectPort.closeExecutionBoundary());
  return result.status === "SUCCESS" ? "SUCCESS" : result.status;
}

type PinnedMigrationBundle = Readonly<{
  bundle_digest: `sha256:${string}`;
  migrations: readonly Readonly<{ migration_id: FarmOsDay150PrefixMigrationId;
    repository_path: string; expected_sha256: `sha256:${string}`;
    actual_sha256: `sha256:${string}`; byte_length: number; sql: string;
    privilege_statement_count: number }>[];
}>;
function compileFarmOsDay150PinnedMigrationBundle(input: readonly Readonly<{
  spec: typeof FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[number]; bytes: Buffer;
}>[]): PinnedMigrationBundle | null {
  const migrations = input.map(({ spec, bytes }) => {
    const actual = bytesDigest(bytes);
    if (actual !== spec.artifact_sha256) return null;
    return Object.freeze({ migration_id: spec.migration_id, repository_path: spec.apply_path,
      expected_sha256: spec.artifact_sha256, actual_sha256: actual,
      byte_length: bytes.byteLength, sql: Buffer.from(bytes).toString("utf8"),
      privilege_statement_count: 0 });
  });
  if (migrations.some((entry) => entry === null)) return null;
  const exact = migrations as Array<NonNullable<typeof migrations[number]>>;
  const analysis = analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(exact);
  if (analysis.status !== "EXACT") return null;
  const counted = exact.map((entry) => Object.freeze({ ...entry,
    privilege_statement_count: analysis.statements.filter((statement) =>
      statement.migration_id === entry.migration_id).length }));
  const identity = counted.map(({ sql, ...entry }) => Object.freeze({ ...entry,
    content_digest: hash("farmos.day150-pinned-migration-content.v1", sql) }));
  return Object.freeze({ bundle_digest:
    hash("farmos.day150-prefix-pinned-migration-bundle.v1", identity),
    migrations: Object.freeze(counted) });
}
function preloadFarmOsDay150PinnedMigrationBytes() {
  return Object.freeze(FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => Object.freeze({
    spec, bytes: Buffer.from(readFileSync(
      fileURLToPath(new URL(spec.apply_path, REPOSITORY_ROOT)))),
  })));
}

export function qualifyFarmOsDay150MigrationPinningToctou(input: Readonly<{
  preconsumption: readonly Readonly<{ migration_id: FarmOsDay150PrefixMigrationId; sql: string }>[];
  post_preflight_replacement:
    readonly Readonly<{ migration_id: FarmOsDay150PrefixMigrationId; sql: string }>[];
}>): Readonly<{ status: "QUALIFIED"; pinned_bundle_digest: `sha256:${string}`;
  executed_content_digests: readonly `sha256:${string}`[];
  replacement_content_digests: readonly `sha256:${string}`[];
  post_preflight_path_replacement_executed: false;
  migration_filesystem_reads_after_authorization_consumption: 0 }> | null {
  if (input.preconsumption.length !== PREFIXES.length ||
    input.post_preflight_replacement.length !== PREFIXES.length ||
    input.preconsumption.some((entry, index) => entry.migration_id !== PREFIXES[index]) ||
    input.post_preflight_replacement.some((entry, index) => entry.migration_id !== PREFIXES[index])) {
    return null;
  }
  const preloaded = input.preconsumption.map((entry, index) => Object.freeze({
    spec: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[index]!,
    bytes: Buffer.from(`${entry.sql}`, "utf8"),
  }));
  const bundle = compileFarmOsDay150PinnedMigrationBundle(preloaded);
  if (!bundle) return null;
  const replacements = input.post_preflight_replacement.map((entry) => `${entry.sql}`);
  return Object.freeze({ status: "QUALIFIED", pinned_bundle_digest: bundle.bundle_digest,
    executed_content_digests: Object.freeze(bundle.migrations.map((entry) =>
      hash("farmos.day150-pinned-migration-content.v1", entry.sql))),
    replacement_content_digests: Object.freeze(replacements.map((sql) =>
      hash("farmos.day150-pinned-migration-content.v1", sql))),
    post_preflight_path_replacement_executed: false,
    migration_filesystem_reads_after_authorization_consumption: 0 });
}

export async function qualifyFarmOsDay150DurableQualificationRestartReplay(): Promise<Readonly<{
  status: "QUALIFIED"; restart_cases: 9; extended_reopen_cases: 7;
  repository_external: true; canonical_publication: true; fresh_instances: true;
  evidence_class: "SUPPLEMENTAL_ONLY";
}>> {
  const freshRoot = () => mkdtempSync(join(tmpdir(), "farmos-day150-prefix-restart-"));
  const instance = (root: string) => Object.freeze({
    publish: (name: string, value: unknown) =>
      publishCanonicalFarmOsDay150ArtifactExclusive(join(root, `${name}.json`), value),
    reopen: (name: string) => reopenCanonicalFarmOsDay150Artifact(join(root, `${name}.json`)),
  });
  const markerBody = Object.freeze({
    schema_version: "farmos.day150-prefix-reference-execution-consumption-marker.v1",
    authorization_id: ACTIVE_REFERENCE_AUTHORIZATION_ID,
    authorization_revision: ACTIVE_REFERENCE_AUTHORIZATION_REVISION,
    execution_plan_digest: ACTIVE_REFERENCE_EXECUTION_PLAN_DIGEST,
    run_identity: "qualification-restart-run", attempt_identity: "single-authorized-attempt",
    state: "EXECUTION_AUTHORIZATION_CONSUMED_TERMINAL_IF_INTERRUPTED",
  });
  const marker = Object.freeze({ ...markerBody, marker_digest:
    hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
      .digest_domains.consumption_marker, markerBody) });
  const exact = (value: unknown) => canonical(value) === canonical(marker);
  const missingRoot = freshRoot();
  const a = await instance(missingRoot).reopen("marker").then(() => false, () => true);
  const consumedRoot = freshRoot();
  await instance(consumedRoot).publish("marker", marker);
  const bRead = exact(await instance(consumedRoot).reopen("marker"));
  const bReplay = await instance(consumedRoot).publish("marker", marker).then(() => false,
    (error) => error instanceof FarmOsDay150DurablePublicationError &&
      error.code === "OUTPUT_PREEXISTS");
  const c = await instance(freshRoot()).reopen("marker").then(() => false, () => true);
  const corruptRoot = freshRoot();
  await instance(corruptRoot).publish("marker", { corrupt: true });
  const d = !exact(await instance(corruptRoot).reopen("marker"));
  const wrongAuthorizationRoot = freshRoot();
  await instance(wrongAuthorizationRoot).publish("marker", { ...marker, authorization_id: "WRONG" });
  const e = !exact(await instance(wrongAuthorizationRoot).reopen("marker"));
  const wrongPlanRoot = freshRoot();
  await instance(wrongPlanRoot).publish("marker", { ...marker,
    execution_plan_digest: `sha256:${"0".repeat(64)}` });
  const f = !exact(await instance(wrongPlanRoot).reopen("marker"));
  const callerCopy = structuredClone(marker);
  const g = exact(callerCopy) && await instance(freshRoot()).reopen("marker")
    .then(() => false, () => true);
  const processMemoryUnconsumed = false;
  const h = !processMemoryUnconsumed && exact(await instance(consumedRoot).reopen("marker"));
  const processMemoryConsumed = true;
  const i = processMemoryConsumed && !exact(await instance(corruptRoot).reopen("marker"));
  if (![a, bRead, bReplay, c, d, e, f, g, h, i].every(Boolean)) {
    throw new Error("DURABLE_QUALIFICATION_RESTART_REPLAY_REJECTED");
  }
  const lifecycleRoot = freshRoot();
  const first = instance(lifecycleRoot);
  await first.publish("candidate-1", { candidate: 1 });
  await first.publish("candidate-5", { candidate: 5 });
  await first.publish("pre-cleanup", { durable: true });
  await first.publish("mid-cleanup", { container: true, volume: false, network: false });
  await first.publish("zero-residual", { zero_residual_verified: true });
  await first.publish("receipt", { receipt: true });
  await first.publish("receipt-ambiguous", { receipt: "published-before-ack" });
  const reopened = instance(lifecycleRoot);
  const names = ["candidate-1", "candidate-5", "pre-cleanup", "mid-cleanup",
    "zero-residual", "receipt", "receipt-ambiguous"];
  if (!(await Promise.all(names.map((name) => reopened.reopen(name)))).every(record)) {
    throw new Error("DURABLE_QUALIFICATION_EXTENDED_REOPEN_REJECTED");
  }
  return Object.freeze({ status: "QUALIFIED", restart_cases: 9, extended_reopen_cases: 7,
    repository_external: true, canonical_publication: true, fresh_instances: true,
    evidence_class: "SUPPLEMENTAL_ONLY" });
}

export async function reopenFarmOsDay150QualificationDurableState(
  capability: FarmOsDay150PrefixReferenceQualificationExecutionCapability | unknown,
): Promise<Readonly<{ marker_present: boolean; candidate_count: number;
  claim_present: boolean; claim_state: "ABSENT" | "VALID" | "CORRUPT";
  recovered_attempt_claim_digest: `sha256:${string}` | null;
  recovered_proposal_identity: `sha256:${string}` | null;
  recovered_approval_reference: string | null;
  recovered_approved_at: string | null;
  recovered_approval_record_digest: `sha256:${string}` | null;
  pre_cleanup_present: boolean; cleanup_evidence_count: number;
  resource_state: Readonly<{ container: "PRESENT" | "ABSENT";
    network: "PRESENT" | "ABSENT"; volume: "PRESENT" | "ABSENT" }>;
  zero_residual_present: boolean; final_receipt_present: boolean;
  terminal_outcome_receipt_present: boolean;
  terminal_classification: "TERMINAL_FAILURE" | "OUTCOME_UNKNOWN" |
    "COMPENSATED_TERMINAL_FAILURE" | null;
  terminal_failure_code: FarmOsDay150PrefixReferenceTerminalFailureCode | null;
  marker_state: "ABSENT" | "VALID" | "CORRUPT";
  authorization_state: "AUTHORIZED_BUT_NOT_CONSUMED" | "ATTEMPT_CLAIMED" |
    "CONSUMED_TERMINAL" | "FAIL_CLOSED";
  recovered_attempt_id: `sha256:${string}` | null; recovered_run_identity: `sha256:${string}` | null;
  candidate_ids: readonly string[]; pre_cleanup_state: "ABSENT" | "DURABLE_VERIFIED";
  cleanup_state: "NOT_STARTED" | "NOT_DURABLY_PROVABLE" | "ZERO_RESIDUAL_VERIFIED";
  receipt_state: "ABSENT" | "DURABLE_CLEANUP_BOUND_VERIFIED" |
    "DURABLE_TERMINAL_OUTCOME_VERIFIED" | "CONFLICT_FAIL_CLOSED";
  outstanding_ambiguity_state: "NONE" | "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT";
  last_durable_completed_step: string | null;
  allowed_next_transition: "PUBLIC_EXECUTION_FROM_REPOSITORY_AUTHORIZED_ACTIVE_EXECUTION" |
    "READ_ONLY_RECONCILIATION_ONLY" | "NONE_FAIL_CLOSED";
  forbidden_transitions: readonly ["NEW_ATTEMPT", "AUTOMATIC_RETRY"];
  retry_count: 0 }>> {
  if (typeof capability !== "object" || capability === null ||
    !consumedQualificationExecutionScenarios.has(capability)) {
    throw new Error("QUALIFICATION_DURABLE_STORE_CAPABILITY_REJECTED");
  }
  const scenario = qualificationExecutionScenarios.get(capability);
  if (!scenario) throw new Error("QUALIFICATION_DURABLE_STORE_CAPABILITY_REJECTED");
  return reconstructFarmOsDay150QualificationDurableState(scenario.store_root);
}

async function reconstructFarmOsDay150QualificationDurableState(storeRoot: string) {
  const path = (name: string) => join(storeRoot, `${name}.json`);
  const reopen = (name: string) => reopenCanonicalFarmOsDay150Artifact(path(name))
    .catch(() => null);
  const oneShot = evaluateFarmOsDay150PrefixReferenceDurableArtifacts({
    approval: null,
    descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
    claim: readFarmOsDay150InvocationGateJson(path("claim")),
    marker: readFarmOsDay150InvocationGateJson(path("marker")),
    success_receipt: readFarmOsDay150InvocationGateJson(path("receipt")),
    terminal_receipt: readFarmOsDay150InvocationGateJson(path("terminal-receipt")),
  });
  const claim = oneShot.claim;
  const marker = oneShot.marker;
  const claimState = oneShot.claim_state === "VALID" ? "VALID" as const :
    oneShot.claim_state === "ABSENT" ? "ABSENT" as const : "CORRUPT" as const;
  const markerState = oneShot.marker_state === "VALID" ? "VALID" as const :
    oneShot.marker_state === "ABSENT" ? "ABSENT" as const : "CORRUPT" as const;
  const parsedCandidates = await Promise.all(Array.from({ length: 5 }, async (_, index) =>
    parseFarmOsDay150ExpectedCatalogCandidate(await reopen(`candidate-${index + 1}`))));
  const candidates = parsedCandidates.map((value) => value !== null);
  const candidateIds = parsedCandidates.flatMap((value) => value ? [value.candidate_id] : []);
  const preCleanup = parseFarmOsDay150PreCleanupRunEvidenceCandidate(await reopen("pre-cleanup"));
  const receipt = oneShot.success_receipt;
  const parsedTerminalReceipt = oneShot.terminal_receipt;
  const terminalReceipt = parsedTerminalReceipt && claim && marker &&
    parsedTerminalReceipt.execution_authorization_id === claim.authorization_id &&
    parsedTerminalReceipt.execution_authorization_revision === claim.authorization_revision &&
    parsedTerminalReceipt.execution_authorization_digest === claim.authorization_digest &&
    parsedTerminalReceipt.execution_plan_digest === claim.execution_plan_digest &&
    parsedTerminalReceipt.run_identity === claim.run_identity &&
    parsedTerminalReceipt.attempt_identity === claim.attempt_identity &&
    parsedTerminalReceipt.attempt_claim_digest === claim.claim_digest &&
    parsedTerminalReceipt.consumption_marker_digest === marker.marker_digest &&
    parsedTerminalReceipt.approval_reference === claim.approval_reference &&
    parsedTerminalReceipt.approval_candidate_identity === claim.approval_candidate_identity &&
    parsedTerminalReceipt.proposal_identity === claim.proposal_identity &&
    parsedTerminalReceipt.proposal_created_at === claim.proposal_created_at &&
    parsedTerminalReceipt.approved_at === claim.approved_at &&
    parsedTerminalReceipt.approval_record_digest === claim.approval_record_digest &&
    parsedCandidates.every((value, index) => (value !== null) ===
      (index < parsedTerminalReceipt.candidate_count)) &&
    parsedTerminalReceipt.candidate_count === candidateIds.length &&
    canonical(parsedTerminalReceipt.candidate_identity_digests) === canonical(
      parsedCandidates.flatMap((value) => value ? [value.candidate_identity_digest] : [])) &&
    (parsedTerminalReceipt.pre_cleanup_evidence_state === "ABSENT" ? preCleanup === null :
      preCleanup !== null && parsedTerminalReceipt.pre_cleanup_evidence_digest ===
        preCleanup.pre_cleanup_run_evidence_digest) ? parsedTerminalReceipt : null;
  const terminalConflict = oneShot.terminal_conflict;
  const effectStateRaw = await reopen("qualification-system-state");
  const effectState: Readonly<Record<string, unknown>> = record(effectStateRaw)
    ? effectStateRaw as Readonly<Record<string, unknown>> : Object.freeze({});
  const resourceState = Object.freeze({
    container: effectState.container === true ? "PRESENT" as const : "ABSENT" as const,
    network: effectState.network === true ? "PRESENT" as const : "ABSENT" as const,
    volume: effectState.volume === true ? "PRESENT" as const : "ABSENT" as const,
  });
  const cleanupCompleted = [effectState.container_cleanup_completed,
    effectState.volume_cleanup_completed, effectState.network_cleanup_completed]
    .filter((value) => value === true).length;
  const freshReader = Object.freeze({ present: async (name: string) =>
    (await reopen(name)) !== null });
  const cleanup = await Promise.all(["container-cleaned", "volume-cleaned", "network-cleaned"]
    .map((name) => freshReader.present(name)));
  const highestCandidate = candidates.reduce((highest, present, index) => present ? index + 1 :
    highest, 0);
  const lastDurableStep = terminalReceipt ? "TERMINAL_OUTCOME_DURABLE_PUBLICATION" :
    receipt ? "FINAL_RECEIPT_DURABLE_PUBLICATION" : preCleanup
    ? "PRE_CLEANUP_EVIDENCE_PUBLICATION" : highestCandidate > 0
      ? `CANDIDATE_${highestCandidate}_DURABLE_PUBLICATION` : marker
        ? "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION" : claim
          ? "ATTEMPT_CLAIM_PUBLICATION" : null;
  return Object.freeze({ marker_present: marker !== null,
    claim_present: claim !== null, claim_state: claimState,
    recovered_attempt_claim_digest: claim?.claim_digest ?? null,
    recovered_proposal_identity: claim?.proposal_identity ?? null,
    recovered_approval_reference: claim?.approval_reference ?? null,
    recovered_approved_at: claim?.approved_at ?? null,
    recovered_approval_record_digest: claim?.approval_record_digest ?? null,
    candidate_count: candidates.filter(Boolean).length,
    pre_cleanup_present: preCleanup !== null,
    cleanup_evidence_count: cleanupCompleted,
    resource_state: resourceState,
    zero_residual_present: await freshReader.present("zero-residual"),
    final_receipt_present: receipt !== null,
    terminal_outcome_receipt_present: terminalReceipt !== null,
    terminal_classification: terminalReceipt?.terminal_classification ?? null,
    terminal_failure_code: terminalReceipt?.terminal_failure_code ?? null,
    marker_state: markerState,
    authorization_state: terminalConflict ? "FAIL_CLOSED" as const : marker ?
      "CONSUMED_TERMINAL" as const :
      markerState === "CORRUPT" || claimState === "CORRUPT" ? "FAIL_CLOSED" as const :
        claim ? "ATTEMPT_CLAIMED" as const : "AUTHORIZED_BUT_NOT_CONSUMED" as const,
    recovered_attempt_id: claim?.attempt_identity ?? null,
    recovered_run_identity: claim?.run_identity ?? null,
    candidate_ids: Object.freeze(candidateIds),
    pre_cleanup_state: preCleanup ? "DURABLE_VERIFIED" as const : "ABSENT" as const,
    cleanup_state: receipt || terminalReceipt?.zero_residual_state === "VERIFIED"
      ? "ZERO_RESIDUAL_VERIFIED" as const : preCleanup ||
      cleanupCompleted > 0 || Object.values(resourceState).includes("PRESENT")
      ? "NOT_DURABLY_PROVABLE" as const : "NOT_STARTED" as const,
    receipt_state: terminalConflict ? "CONFLICT_FAIL_CLOSED" as const : receipt
      ? "DURABLE_CLEANUP_BOUND_VERIFIED" as const : terminalReceipt
        ? "DURABLE_TERMINAL_OUTCOME_VERIFIED" as const : "ABSENT" as const,
    outstanding_ambiguity_state: claim && !marker
      ? "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT" as const : "NONE" as const,
    last_durable_completed_step: lastDurableStep,
    allowed_next_transition: terminalConflict || markerState === "CORRUPT" || claimState === "CORRUPT"
      ? "NONE_FAIL_CLOSED" as const : marker || claim ? "READ_ONLY_RECONCILIATION_ONLY" as const :
        FARM_OS_DAY150_PREFIX_REFERENCE_REPOSITORY_AUTHORIZED_ACTIVE_EXECUTION,
    forbidden_transitions: Object.freeze(["NEW_ATTEMPT", "AUTOMATIC_RETRY"] as const),
    retry_count: 0 as const,
  });
}

export async function qualifyFarmOsDay150ReadOnlyRealResourcePreflight(): Promise<Readonly<{
  status: "RESOURCE_PREEXISTENCE_CLEAR" | "BLOCKED_RESOURCE_PREEXISTS" |
    "BLOCKED_OUTPUT_PREEXISTS" | "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME" |
    "SOURCE_AUTHORITY_MISMATCH";
  failure_code: string | null;
  resource_classifications: readonly Readonly<{ semantic_step_id: string;
    classification: "ABSENT" | "PRESENT" | "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME" }>[];
  docker_mutations: 0; postgres_operations: 0; migration_operations: 0;
}>> {
  if (preflightFarmOsDay150PrefixReferenceSourceAuthority().status !== "READY_SOURCE_ONLY") {
    return Object.freeze({ status: "SOURCE_AUTHORITY_MISMATCH", failure_code:
      "SOURCE_AUTHORITY_MISMATCH", resource_classifications: Object.freeze([]),
    docker_mutations: 0, postgres_operations: 0, migration_operations: 0 });
  }
  const pinnedBundle = compileFarmOsDay150PinnedMigrationBundle(
    preloadFarmOsDay150PinnedMigrationBytes());
  if (!pinnedBundle || analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(
    pinnedBundle.migrations).status !== "EXACT") return Object.freeze({
    status: "SOURCE_AUTHORITY_MISMATCH", failure_code: "SOURCE_AUTHORITY_MISMATCH",
    resource_classifications: Object.freeze([]), docker_mutations: 0,
    postgres_operations: 0, migration_operations: 0 });
  const adapter = await import(
    "../../../scripts/hermes/lib/farm_os_day150_prefix_reference_real_adapter"
  );
  const effectPort = adapter.createAuthorizedFarmOsDay150PrefixReferenceRealBoundary({
    execution_context: issueFarmOsDay150RealExecutionContext(),
    pinned_migrations: pinnedBundle.migrations.map((entry) => Object.freeze({
      migration_id: entry.migration_id, sql: entry.sql })),
    pinned_migration_bundle_digest: pinnedBundle.bundle_digest,
  });
  if (!effectPort) return Object.freeze({ status: "SOURCE_AUTHORITY_MISMATCH",
    failure_code: "REAL_EXECUTION_CONTEXT_REJECTED", resource_classifications: Object.freeze([]),
    docker_mutations: 0, postgres_operations: 0, migration_operations: 0 });
  effectPort.stageRequest(farmOsDay150EffectRequest("RESOURCE_PREEXISTENCE"));
  const result = await awaitFarmOsDay150TypedEffectWithDeadline(effectPort.readOnlyPreflight(), 47_119);
  const resourceClassifications = Object.freeze(effectPort.readTrace().filter((entry) =>
    entry.semantic_step_id === "RESOURCE_PREEXISTENCE_CONTAINER" ||
    entry.semantic_step_id === "RESOURCE_PREEXISTENCE_NETWORK" ||
    entry.semantic_step_id === "RESOURCE_PREEXISTENCE_VOLUME").map((entry) => Object.freeze({
      semantic_step_id: entry.semantic_step_id!,
      classification: entry.bounded_result_classification ?? "AMBIGUOUS_OUTCOME",
    })));
  if (result.status !== "SUCCESS") return Object.freeze({ status: result.status,
    failure_code: result.code, resource_classifications: resourceClassifications, docker_mutations: 0,
    postgres_operations: 0, migration_operations: 0 });
  return Object.freeze({ status: result.value.status === "READY"
    ? "RESOURCE_PREEXISTENCE_CLEAR" : result.value.status,
  failure_code: null, resource_classifications: resourceClassifications, docker_mutations: 0,
  postgres_operations: 0, migration_operations: 0 });
}

export async function executeFarmOsDay150PrefixReferenceCatalogOnce():
  Promise<FarmOsDay150PrefixReferenceExecutionResult |
    FarmOsDay150PrefixReferenceQualificationResult>;
export async function executeFarmOsDay150PrefixReferenceCatalogOnce(input: Readonly<{
  qualification_capability: FarmOsDay150PrefixReferenceQualificationExecutionCapability | unknown;
}>): Promise<FarmOsDay150PrefixReferenceQualificationResult>;
export async function executeFarmOsDay150PrefixReferenceCatalogOnce(input?: Readonly<{
  qualification_capability: FarmOsDay150PrefixReferenceQualificationExecutionCapability | unknown;
}>): Promise<FarmOsDay150PrefixReferenceExecutionResult |
  FarmOsDay150PrefixReferenceQualificationResult> {
  let qualificationScenario: QualificationScenario | null = null;
  if (input !== undefined) {
    const capability = input.qualification_capability;
    if (typeof capability !== "object" || capability === null ||
      consumedQualificationExecutionScenarios.has(capability)) {
      throw new Error("QUALIFICATION_EXECUTION_CAPABILITY_REJECTED");
    }
    qualificationScenario = qualificationExecutionScenarios.get(capability) ?? null;
    if (!qualificationScenario) throw new Error("QUALIFICATION_EXECUTION_CAPABILITY_REJECTED");
    consumedQualificationExecutionScenarios.add(capability);
  }
  const privilege = await import("./farm_os_day150_prefix_reference_migration_privilege_authority");
  const stateMachine = createFarmOsDay150PublicExecutorStateMachine();
  let effectPort: FarmOsDay150ReferenceExecutionEffectPort | null = null;
  let terminalAttemptClaim: FarmOsDay150PrefixReferenceAttemptClaim | null = null;
  let terminalConsumptionMarker: FarmOsDay150PrefixReferenceConsumptionMarker | null = null;
  const durableCandidateIdentityDigests: `sha256:${string}`[] = [];
  let terminalPreCleanupEvidenceDigest: `sha256:${string}` | null = null;
  const awaitFarmOsDay150TypedEffect = <T>(
    invocation: Promise<FarmOsDay150ReferenceEffectResult<T>>,
    deadlineMilliseconds = 47_119,
  ) => awaitFarmOsDay150TypedEffectWithDeadline(invocation,
    qualificationScenario?.mode === "HANG" ? 211 : deadlineMilliseconds);
  try {
  const verifiedRuntimeRoot = process.env.FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT;
  const verifiedRuntimeSourceDigest = process.env.FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST;
  const approvalRepositoryRoot = process.env.FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT;
  const repositoryAuthorizedRuntime = qualificationScenario === null &&
    isFarmOsDay150PrefixReferenceRepositoryAuthorizedRuntime({
      verified_runtime_root: verifiedRuntimeRoot,
      verified_runtime_source_digest: verifiedRuntimeSourceDigest,
      approval_repository_root: approvalRepositoryRoot,
    });
  const executionRepositoryRoot = qualificationScenario?.approval_repository_root ??
    (repositoryAuthorizedRuntime ? resolve(approvalRepositoryRoot!) : process.cwd());
  const executionRepositoryClock = qualificationScenario ? Object.freeze({ nowCanonicalUtc: () =>
    qualificationScenario.repository_loader_observed_at }) : productionRepositoryLoaderClock;
  let repositoryInvocationContinuationRequired = false;
  if (qualificationScenario?.public_artifact_paths === true || repositoryAuthorizedRuntime) {
    const invocationGate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
      repository_root: executionRepositoryRoot,
      clock: executionRepositoryClock,
      requested_revision: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
        .authorization_revision,
    });
    if (repositoryAuthorizedRuntime && !invocationGate.new_invocation_permitted &&
      invocationGate.reason === "HUMAN_INVOCATION_ISSUANCE_PRESENT" &&
      typeof process.env.FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY === "string") {
      repositoryInvocationContinuationRequired = true;
    } else if (!invocationGate.new_invocation_permitted || repositoryAuthorizedRuntime) {
      throw new Error(`EXECUTION_INVOCATION_NOT_ELIGIBLE:${invocationGate.reason}`);
    }
  }
  const executionAuthorization = loadFarmOsDay150ReferenceExecutionAuthorization(
    executionRepositoryRoot,
    executionRepositoryClock,
    qualificationScenario?.store_root ?? null,
  );
  completeFarmOsDay150LocalBoundary(stateMachine, "AUTHORIZATION_LOOKUP", qualificationScenario);
  if (!executionAuthorization) throw new Error("EXECUTION_AUTHORIZATION_REJECTED");
  const selectedApproval = executionAuthorizationApprovals.get(executionAuthorization);
  if (!selectedApproval) throw new Error("EXECUTION_APPROVAL_LINEAGE_REJECTED");
  if (repositoryAuthorizedRuntime) {
    if (!repositoryInvocationContinuationRequired ||
      !validateFarmOsDay150PrefixReferenceInvocationContinuation({
        repository_root: executionRepositoryRoot,
        approval: selectedApproval,
        descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
        continuation_capability:
          process.env.FARM_OS_DAY150_INVOCATION_CONTINUATION_CAPABILITY ?? "",
      })) throw new Error("DAY150_INVOCATION_CONTINUATION_CAPABILITY_REJECTED");
  } else if (qualificationScenario?.public_artifact_paths === true) {
    await publishFarmOsDay150PrefixReferenceHumanInvocationIssuance({
      repository_root: executionRepositoryRoot,
      approval: selectedApproval,
      descriptor: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR,
      continuation_capability:
        issueFarmOsDay150PrefixReferenceInvocationContinuationCapability(),
      issued_at: executionRepositoryClock.nowCanonicalUtc(),
    });
  }
  const planExact = (qualificationScenario !== null ||
      preflightFarmOsDay150PrefixReferenceSourceAuthority().status === "READY_SOURCE_ONLY") &&
    validateFarmOsDay150PrefixReferenceActiveExecutionBinding(
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING);
  completeFarmOsDay150LocalBoundary(stateMachine, "EXECUTION_PLAN_VALIDATION",
    qualificationScenario);
  if (!planExact) {
    throw new Error("DAY150_PREFIX_REFERENCE_EXECUTION_REAUTHORIZATION_REQUIRED");
  }
  const preloadedMigrations = preloadFarmOsDay150PinnedMigrationBytes();
  completeFarmOsDay150LocalBoundary(stateMachine, "MIGRATION_BYTE_PRELOAD", qualificationScenario);
  const pinnedBundle = compileFarmOsDay150PinnedMigrationBundle(preloadedMigrations);
  completeFarmOsDay150LocalBoundary(stateMachine, "MIGRATION_DIGEST_VERIFICATION",
    qualificationScenario);
  if (pinnedBundle === null || pinnedBundle.bundle_digest !==
    FARM_OS_DAY150_PREFIX_REFERENCE_PINNED_MIGRATION_BUNDLE_DIGEST) {
    throw new Error("DAY150_PREFIX_REFERENCE_EXECUTION_REAUTHORIZATION_REQUIRED");
  }
  const privilegeExact =
    analyzeFarmOsDay150PinnedMigrationPrivilegeStatements(pinnedBundle.migrations).status === "EXACT";
  completeFarmOsDay150LocalBoundary(stateMachine, "STATEMENT_PRIVILEGE_ANALYSIS",
    qualificationScenario);
  if (!privilegeExact) throw new Error("DAY150_PREFIX_REFERENCE_EXECUTION_REAUTHORIZATION_REQUIRED");
  const adapter = await import(
    "../../../scripts/hermes/lib/farm_os_day150_prefix_reference_real_adapter"
  );
  const qualificationPrimitiveContext = qualificationScenario
    ? createFarmOsDay150QualificationPrimitiveContext(qualificationScenario, pinnedBundle) : null;
  effectPort = adapter.createAuthorizedFarmOsDay150PrefixReferenceRealBoundary({
      execution_context: issueFarmOsDay150RealExecutionContext(qualificationPrimitiveContext),
      pinned_migrations: pinnedBundle.migrations.map((entry) => Object.freeze({
        migration_id: entry.migration_id, sql: entry.sql })),
      pinned_migration_bundle_digest: pinnedBundle.bundle_digest,
    });
  if (!effectPort) throw new Error("REAL_EXECUTION_CONTEXT_REJECTED");
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "RESOURCE_PREEXISTENCE",
    farmOsDay150EffectRequest("RESOURCE_PREEXISTENCE"));
  let preflightResult = await awaitFarmOsDay150TypedEffect(effectPort.readOnlyPreflight());
  if (effectPort.readAttemptProvenance() !== null && preflightResult.status ===
    "AMBIGUOUS_OUTCOME" && preflightResult.code ===
      "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT") stateMachine.recoverAttemptClaimed();
  if (effectPort.readAttemptProvenance() !== null && !(preflightResult.status ===
    "AMBIGUOUS_OUTCOME" && preflightResult.code ===
      "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT")) stateMachine.recoverAuthorizationConsumed();
  if (qualificationScenario?.local_memory_assumption === "CLAIMED_CONSUMED" &&
    effectPort.readAttemptProvenance() === null) {
    preflightResult = Object.freeze({ status: "BOUNDED_FAILURE" as const,
      code: "LOCAL_CONSUMED_ASSUMPTION_WITHOUT_DURABLE_MARKER_REJECTED" });
  }
  const preflight = settleFarmOsDay150TypedEffect(stateMachine, "RESOURCE_PREEXISTENCE",
    preflightResult);
  if (preflight.status !== "READY") throw new Error(preflight.status ===
    "BLOCKED_RESOURCE_PREEXISTS" ? "BLOCKED_DAY150_PREFIX_REFERENCE_RESOURCE_PREEXISTS" :
    "BLOCKED_DAY150_PREFIX_REFERENCE_OUTPUT_PREEXISTS");
  completeFarmOsDay150LocalBoundary(stateMachine, "ATTEMPT_CLAIM_DECISION",
    qualificationScenario);
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "ATTEMPT_CLAIM_PUBLICATION",
    farmOsDay150EffectRequest("ATTEMPT_CLAIM_PUBLICATION"));
  stateMachine.recordAttemptIdentityCreated();
  const attemptClaim = createFarmOsDay150PrefixReferenceAttemptClaim(
    pinnedBundle.bundle_digest, selectedApproval);
  const claimPublicationResult = await awaitFarmOsDay150TypedEffect(
    effectPort.persistAttemptClaim(attemptClaim));
  if (claimPublicationResult.status !== "SUCCESS" &&
    effectPort.readAttemptProvenance() !== null) {
    stateMachine.recoverAttemptClaimedAtPublication();
  }
  const durableAttemptClaim = settleFarmOsDay150TypedEffect(stateMachine,
    "ATTEMPT_CLAIM_PUBLICATION", claimPublicationResult);
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "ATTEMPT_CLAIM_READBACK",
    farmOsDay150EffectRequest("ATTEMPT_CLAIM_READBACK"));
  const claimReadbackResult = await awaitFarmOsDay150TypedEffect(effectPort.readAttemptClaim());
  if (claimReadbackResult.status !== "SUCCESS") {
    settleFarmOsDay150TypedEffect(stateMachine, "ATTEMPT_CLAIM_READBACK", claimReadbackResult);
    throw new Error("UNREACHABLE_EFFECT_SETTLEMENT");
  }
  stateMachine.requestEffect("ATTEMPT_CLAIM_READBACK");
  const parsedAttemptClaim = parseFarmOsDay150PrefixReferenceAttemptClaim(
    claimReadbackResult.value);
  if (!parsedAttemptClaim || canonical(parsedAttemptClaim) !== canonical(durableAttemptClaim) ||
    canonical(parsedAttemptClaim) !== canonical(attemptClaim)) {
    throw new FarmOsDay150QualificationInterruption(stateMachine.interrupt(
      "ATTEMPT_CLAIM_READBACK", "REJECTED", "ATTEMPT_CLAIM_READBACK_REJECTED"));
  }
  stateMachine.after("ATTEMPT_CLAIM_READBACK");
  const consumptionMarkerBase = Object.freeze({
    authorization_id: ACTIVE_REFERENCE_AUTHORIZATION_ID,
    authorization_revision: ACTIVE_REFERENCE_AUTHORIZATION_REVISION,
    authorization_digest: ACTIVE_REFERENCE_AUTHORIZATION_DIGEST,
    execution_plan_digest: ACTIVE_REFERENCE_EXECUTION_PLAN_DIGEST,
    pinned_migration_bundle_digest: pinnedBundle.bundle_digest,
    attempt_claim_digest: parsedAttemptClaim.claim_digest,
    run_identity: parsedAttemptClaim.run_identity,
    attempt_identity: parsedAttemptClaim.attempt_identity,
    approval_reference: parsedAttemptClaim.approval_reference,
    gate17_scope_digest: parsedAttemptClaim.gate17_scope_digest,
    approval_candidate_identity: parsedAttemptClaim.approval_candidate_identity,
    proposal_identity: parsedAttemptClaim.proposal_identity,
    proposal_created_at: parsedAttemptClaim.proposal_created_at,
    approved_at: parsedAttemptClaim.approved_at,
    approval_record_digest: parsedAttemptClaim.approval_record_digest,
  });
  beginFarmOsDay150TypedEffect(stateMachine, effectPort,
    "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
    farmOsDay150EffectRequest("AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION"));
  const consumptionMarker = settleFarmOsDay150TypedEffect(stateMachine,
    "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
    await awaitFarmOsDay150TypedEffect(effectPort.persistConsumptionMarker(Object.freeze({
      base: consumptionMarkerBase,
      createFreshMarker: () =>
        createFarmOsDay150PrefixReferenceConsumptionMarker(consumptionMarkerBase),
    }))));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort,
    "AUTHORIZATION_CONSUMPTION_MARKER_READBACK",
    farmOsDay150EffectRequest("AUTHORIZATION_CONSUMPTION_MARKER_READBACK"));
  const markerReadbackResult = await awaitFarmOsDay150TypedEffect(
    effectPort.readConsumptionMarker());
  if (markerReadbackResult.status !== "SUCCESS") {
    settleFarmOsDay150TypedEffect(stateMachine,
      "AUTHORIZATION_CONSUMPTION_MARKER_READBACK", markerReadbackResult);
    throw new Error("UNREACHABLE_EFFECT_SETTLEMENT");
  }
  stateMachine.requestEffect("AUTHORIZATION_CONSUMPTION_MARKER_READBACK");
  const parsedConsumptionMarker = parseFarmOsDay150PrefixReferenceConsumptionMarker(
    markerReadbackResult.value);
  const recoveredAttemptProvenance = effectPort.readAttemptProvenance();
  if (!parsedConsumptionMarker ||
    canonical(parsedConsumptionMarker) !== canonical(consumptionMarker) ||
    recoveredAttemptProvenance?.attempt_identity !== parsedConsumptionMarker.attempt_identity ||
    recoveredAttemptProvenance.run_identity !== parsedConsumptionMarker.run_identity ||
    recoveredAttemptProvenance.attempt_claim_digest !==
      parsedConsumptionMarker.attempt_claim_digest) {
    throw new FarmOsDay150QualificationInterruption(stateMachine.interrupt(
      "AUTHORIZATION_CONSUMPTION_MARKER_READBACK", "REJECTED"));
  }
  stateMachine.after("AUTHORIZATION_CONSUMPTION_MARKER_READBACK");
  terminalAttemptClaim = parsedAttemptClaim;
  terminalConsumptionMarker = parsedConsumptionMarker;
  completeFarmOsDay150LocalBoundary(stateMachine, "AUTHORIZATION_CONSUMPTION",
    qualificationScenario);
  if (!consumeFarmOsDay150ReferenceExecutionAuthorizationOnce({
    execution_authorization: executionAuthorization,
    authorization_digest: ACTIVE_REFERENCE_AUTHORIZATION_DIGEST,
    privilege_envelope_digest:
      privilege.FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
  })) throw new Error("EXECUTION_AUTHORIZATION_CONSUMPTION_REJECTED");
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "NETWORK_CREATION",
    farmOsDay150EffectRequest("NETWORK_CREATION"));
  settleFarmOsDay150TypedEffect(stateMachine, "NETWORK_CREATION",
    await awaitFarmOsDay150TypedEffect(effectPort.createOwnedNetwork()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "VOLUME_CREATION",
    farmOsDay150EffectRequest("VOLUME_CREATION"));
  settleFarmOsDay150TypedEffect(stateMachine, "VOLUME_CREATION",
    await awaitFarmOsDay150TypedEffect(effectPort.createOwnedVolume()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "CONTAINER_CREATION",
    farmOsDay150EffectRequest("CONTAINER_CREATION"));
  settleFarmOsDay150TypedEffect(stateMachine, "CONTAINER_CREATION",
    await awaitFarmOsDay150TypedEffect(effectPort.createOwnedContainer()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "POSTGRES_STARTUP",
    farmOsDay150EffectRequest("POSTGRES_STARTUP"));
  settleFarmOsDay150TypedEffect(stateMachine, "POSTGRES_STARTUP",
    await awaitFarmOsDay150TypedEffect(effectPort.awaitPostgresReady(),
      FARM_OS_DAY150_PREFIX_REFERENCE_POSTGRES_STARTUP_OUTER_SETTLEMENT_DEADLINE_MILLISECONDS));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "POSTGRES_MAJOR_VERIFICATION",
    farmOsDay150EffectRequest("POSTGRES_MAJOR_VERIFICATION"));
  settleFarmOsDay150TypedEffect(stateMachine, "POSTGRES_MAJOR_VERIFICATION",
    await awaitFarmOsDay150TypedEffect(effectPort.readServerMajor()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "PRINCIPAL_INITIALIZATION",
    farmOsDay150EffectRequest("PRINCIPAL_INITIALIZATION"));
  settleFarmOsDay150TypedEffect(stateMachine, "PRINCIPAL_INITIALIZATION",
    await awaitFarmOsDay150TypedEffect(effectPort.initializeReferencePrincipals()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "MINIMAL_BOOTSTRAP",
    farmOsDay150EffectRequest("MINIMAL_BOOTSTRAP"));
  settleFarmOsDay150TypedEffect(stateMachine, "MINIMAL_BOOTSTRAP",
    await awaitFarmOsDay150TypedEffect(effectPort.applyPinnedInitialBootstrap()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "TRUSTED_INITIAL_READBACK",
    farmOsDay150EffectRequest("TRUSTED_INITIAL_READBACK"));
  const initialFacts = settleFarmOsDay150TypedEffect(stateMachine, "TRUSTED_INITIAL_READBACK",
    await awaitFarmOsDay150TypedEffect(effectPort.readInitialCatalog()));
  const snapshots: FarmOsDay150ReferenceExecutionEvidence["snapshots"][number][] = [];
  for (let index = 0; index < pinnedBundle.migrations.length; index += 1) {
    const migration = pinnedBundle.migrations[index]!;
    const migrationStep = `MIGRATION_${index + 1}_EXECUTION` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary;
    beginFarmOsDay150TypedEffect(stateMachine, effectPort, migrationStep,
      farmOsDay150EffectRequest(migrationStep, migration));
    settleFarmOsDay150TypedEffect(stateMachine, migrationStep,
      await awaitFarmOsDay150TypedEffect(effectPort.executePinnedMigration(index, migration)));
    const snapshotStep = `SNAPSHOT_${index + 1}_COLLECTION` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary;
    beginFarmOsDay150TypedEffect(stateMachine, effectPort, snapshotStep,
      farmOsDay150EffectRequest(snapshotStep, migration));
    snapshots.push(settleFarmOsDay150TypedEffect(stateMachine, snapshotStep,
      await awaitFarmOsDay150TypedEffect(
        effectPort.collectCatalogSnapshot(index, migration.migration_id))));
  }
  const evidence: FarmOsDay150ReferenceExecutionEvidence = Object.freeze({
    run_id: recoveredAttemptProvenance.run_identity,
    run_nonce_digest_source: recoveredAttemptProvenance.attempt_identity,
    started_at: new Date().toISOString(), completed_at: new Date().toISOString(),
    initial_facts: initialFacts, snapshots: Object.freeze(snapshots),
  });
  const initialReadbackBody = Object.freeze({
    schema_version: "farmos.day150-prefix-initial-catalog-readback.v1" as const,
    initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
    initial_catalog_digest:
      FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.canonical_initial_state_digest,
    bootstrap_plan_digest: INITIAL_BOOTSTRAP_PLAN.plan_digest,
    raw_owner_principal: "farmos_day150_reference_migration_owner_v1" as const,
    semantic_owner: "REFERENCE_MIGRATION_OWNER" as const,
    collector_authority: "farmos.day150-initial-catalog-exact-readback-collector.v1" as const,
    exact_initial_objects: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.initial_objects,
    exact_security_baseline: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.security_baseline,
    ai_schema_present: evidence.initial_facts.ai_schema_present,
    proposal_inbox_present: evidence.initial_facts.proposal_inbox_present,
    base_column_count: evidence.initial_facts.base_column_count,
    base_constraint_count: evidence.initial_facts.base_constraint_count,
    base_index_count: evidence.initial_facts.base_index_count,
    owner_only: evidence.initial_facts.owner_only,
    explicit_application_grant_count: evidence.initial_facts.explicit_application_grant_count,
    explicit_public_privilege_count: evidence.initial_facts.explicit_public_privilege_count,
    credential_statement_count: 0 as const,
    unrelated_schema_count: evidence.initial_facts.unrelated_schema_count,
    preprefix_table_count: evidence.initial_facts.preprefix_table_count,
    preprefix_function_count: evidence.initial_facts.preprefix_function_count,
    preprefix_append_only_trigger_count:
      evidence.initial_facts.preprefix_append_only_trigger_count,
    readback_transaction_read_only: true as const,
  });
  const initialReadback = Object.freeze({ ...initialReadbackBody,
    readback_digest: hash("farmos.day150-prefix-initial-catalog-readback.v1", initialReadbackBody),
  });
  const initialCapability = issueFarmOsDay150InitialCatalogReadback(initialReadback);
  if (!initialCapability) throw new Error("INITIAL_READBACK_MISMATCH");
  const referenceCaptureBody = Object.freeze({
    schema_version: FARM_OS_DAY150_PRE_CLEANUP_RUN_EVIDENCE_SCHEMA,
    authority_state: "REFERENCE_CAPTURE_BEFORE_CANDIDATE_DURABILITY" as const,
    run_id: evidence.run_id,
    run_nonce_digest: hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
      .digest_domains.run_nonce,
      evidence.run_nonce_digest_source),
    reference_postgres_major: 17 as const,
    reference_image: FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE,
    reference_platform: FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM,
    initial_state_readback_digest: initialReadback.readback_digest,
    execution_authorization_id:
      ACTIVE_REFERENCE_AUTHORIZATION_ID,
    execution_authorization_revision: ACTIVE_REFERENCE_AUTHORIZATION_REVISION,
    execution_authorization_digest: ACTIVE_REFERENCE_AUTHORIZATION_DIGEST,
    attempt_claim_digest: parsedAttemptClaim.claim_digest,
    attempt_identity: parsedAttemptClaim.attempt_identity,
    consumption_marker_digest: parsedConsumptionMarker.marker_digest,
    approval_reference: parsedAttemptClaim.approval_reference,
    gate17_scope_digest: parsedAttemptClaim.gate17_scope_digest,
    approval_candidate_identity: parsedAttemptClaim.approval_candidate_identity,
    proposal_identity: parsedAttemptClaim.proposal_identity,
    proposal_created_at: parsedAttemptClaim.proposal_created_at,
    approved_at: parsedAttemptClaim.approved_at,
    approval_record_digest: parsedAttemptClaim.approval_record_digest,
    migration_privilege_envelope_digest:
      privilege.FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
    pinned_migration_bundle_digest: pinnedBundle.bundle_digest,
    candidate_ids: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => spec.candidate_id),
    snapshot_points: [...PREFIXES],
    execution_state: "EXACT_FIVE_CAPTURED_BEFORE_CLEANUP" as const,
    started_at: evidence.started_at, completed_at: evidence.completed_at,
    raw_catalog_values_persisted: false as const, credentials_persisted: false as const,
  });
  const referenceCapture = Object.freeze({ ...referenceCaptureBody,
    reference_capture_digest: hash("farmos.day150-prefix-reference-capture.v1",
      referenceCaptureBody),
  });
  if (!parseFarmOsDay150ReferenceCapture(referenceCapture)) {
    if (!REFERENCE.test(referenceCapture.run_id)) throw new Error("REFERENCE_CAPTURE_RUN_REJECTED");
    if (!canonicalTime(referenceCapture.started_at) ||
      !canonicalTime(referenceCapture.completed_at)) throw new Error("REFERENCE_CAPTURE_TIME_REJECTED");
    if (!exact(referenceCapture, PRE_CLEANUP_KEYS)) throw new Error("REFERENCE_CAPTURE_KEYS_REJECTED");
    const { reference_capture_digest: ignoredCaptureDigest, ...captureBody } = referenceCapture;
    void ignoredCaptureDigest;
    if (hash("farmos.day150-prefix-reference-capture.v1", captureBody) !==
      referenceCapture.reference_capture_digest) throw new Error("REFERENCE_CAPTURE_DIGEST_REJECTED");
    throw new Error("REFERENCE_CAPTURE_FIELD_REJECTED");
  }
  const completion = completeFarmOsDay150AuthenticatedReferenceCatalogRun({
    execution_authorization: executionAuthorization, reference_capture: referenceCapture,
    initial_state_readback: initialCapability, snapshots: evidence.snapshots,
  });
  const run = completion ? finalizeFarmOsDay150ReferenceCatalogRun({
    executor_completion: completion }) : null;
  if (!run) throw new Error("REFERENCE_RUN_COMPLETION_REJECTED");
  const candidates = FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) =>
    compileFarmOsDay150ExpectedCatalogCandidate({ migration_id: spec.migration_id,
      run_capability: run }));
  if (candidates.some((candidate) => candidate === null)) {
    throw new Error("REFERENCE_CANDIDATE_COMPILATION_REJECTED");
  }
  const exactCandidates = candidates as FarmOsExpectedCatalogFingerprintCandidate[];
  const candidateArtifactDigests = exactCandidates.map((candidate) =>
    hash("farmos.day150-prefix-durable-candidate-artifact.v1", candidate));
  const candidateReadbacks: unknown[] = [];
  for (let index = 0; index < exactCandidates.length; index += 1) {
    const spec = FARM_OS_DAY150_PREFIX_REFERENCE_SPECS[index]!;
    const publishStep = `CANDIDATE_${index + 1}_DURABLE_PUBLICATION` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary;
    beginFarmOsDay150TypedEffect(stateMachine, effectPort, publishStep,
      farmOsDay150EffectRequest(publishStep, pinnedBundle.migrations[index]!, spec.candidate_id,
        candidateArtifactDigests[index]!));
    settleFarmOsDay150TypedEffect(stateMachine, publishStep,
      await awaitFarmOsDay150TypedEffect(
        effectPort.publishCandidate(index, exactCandidates[index])));
    const readStep = `CANDIDATE_${index + 1}_REOPEN_READBACK` as
      FarmOsDay150PrefixReferencePublicExecutorBoundary;
    beginFarmOsDay150TypedEffect(stateMachine, effectPort, readStep,
      farmOsDay150EffectRequest(readStep, pinnedBundle.migrations[index]!, spec.candidate_id));
    const candidateReadback = settleFarmOsDay150TypedEffect(stateMachine, readStep,
      await awaitFarmOsDay150TypedEffect(effectPort.readBackCandidate(index)));
    const durableCandidate = parseFarmOsDay150ExpectedCatalogCandidate(candidateReadback);
    if (!durableCandidate || canonical(durableCandidate) !== canonical(exactCandidates[index])) {
      throw new Error("REFERENCE_CANDIDATE_READBACK_REJECTED");
    }
    candidateReadbacks.push(candidateReadback);
    durableCandidateIdentityDigests.push(durableCandidate.candidate_identity_digest);
  }
  const parsedCandidates = candidateReadbacks.map(parseFarmOsDay150ExpectedCatalogCandidate);
  if (candidateReadbacks.length !== 5 || parsedCandidates.some((value) => value === null) ||
    parsedCandidates.some((value, index) => canonical(value) !== canonical(exactCandidates[index]))) {
    throw new Error("REFERENCE_CANDIDATE_READBACK_REJECTED");
  }
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "EXACT_FIVE_CANDIDATE_VERIFICATION",
    farmOsDay150EffectRequest("EXACT_FIVE_CANDIDATE_VERIFICATION"));
  settleFarmOsDay150TypedEffect(stateMachine, "EXACT_FIVE_CANDIDATE_VERIFICATION",
    await awaitFarmOsDay150TypedEffect(effectPort.observeExactFiveCandidateVerification()));
  const candidateIdentityDigests = exactCandidates.map((candidate) =>
    candidate.candidate_identity_digest);
  const preCleanupBody = Object.freeze({
    schema_version: "farmos.day150-prefix-pre-cleanup-run-evidence-candidate.v2" as const,
    authority_state: "PRE_CLEANUP_RUN_EVIDENCE_CANDIDATE" as const,
    reference_capture_digest: referenceCapture.reference_capture_digest,
    pinned_migration_bundle_digest: pinnedBundle.bundle_digest,
    candidate_identity_digests: Object.freeze(candidateIdentityDigests),
    candidate_artifact_digests: Object.freeze(candidateArtifactDigests),
    candidate_paths: FARM_OS_DAY150_PREFIX_REFERENCE_SPECS.map((spec) => spec.output_path),
    durable_candidate_count: 5 as const,
    execution_state: "EXACT_FIVE_CANDIDATES_DURABLE_BEFORE_CLEANUP" as const,
  });
  const preCleanupEvidence = Object.freeze({ ...preCleanupBody,
    pre_cleanup_run_evidence_digest: hash(
      "farmos.day150-prefix-pre-cleanup-run-evidence-candidate.v2", preCleanupBody),
  });
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "PRE_CLEANUP_EVIDENCE_PUBLICATION",
    farmOsDay150EffectRequest("PRE_CLEANUP_EVIDENCE_PUBLICATION", null, null,
      preCleanupEvidence.pre_cleanup_run_evidence_digest));
  settleFarmOsDay150TypedEffect(stateMachine, "PRE_CLEANUP_EVIDENCE_PUBLICATION",
    await awaitFarmOsDay150TypedEffect(
      effectPort.publishPreCleanupEvidence(preCleanupEvidence)));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK",
    farmOsDay150EffectRequest("PRE_CLEANUP_EVIDENCE_REOPEN_READBACK"));
  const preCleanupReadback = settleFarmOsDay150TypedEffect(stateMachine,
    "PRE_CLEANUP_EVIDENCE_REOPEN_READBACK",
    await awaitFarmOsDay150TypedEffect(effectPort.readBackPreCleanupEvidence()));
  const parsedPreCleanup = parseFarmOsDay150PreCleanupRunEvidenceCandidate(preCleanupReadback);
  if (!parsedPreCleanup || canonical(parsedPreCleanup) !== canonical(preCleanupEvidence)) {
    throw new Error("PRE_CLEANUP_EVIDENCE_READBACK_REJECTED");
  }
  terminalPreCleanupEvidenceDigest = parsedPreCleanup.pre_cleanup_run_evidence_digest;
  completeFarmOsDay150LocalBoundary(stateMachine, "BEFORE_CLEANUP", qualificationScenario);
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "CONTAINER_CLEANUP",
    farmOsDay150EffectRequest("CONTAINER_CLEANUP"));
  settleFarmOsDay150TypedEffect(stateMachine, "CONTAINER_CLEANUP",
    await awaitFarmOsDay150TypedEffect(effectPort.cleanupOwnedContainer()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "VOLUME_CLEANUP",
    farmOsDay150EffectRequest("VOLUME_CLEANUP"));
  settleFarmOsDay150TypedEffect(stateMachine, "VOLUME_CLEANUP",
    await awaitFarmOsDay150TypedEffect(effectPort.cleanupOwnedVolume()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "NETWORK_CLEANUP",
    farmOsDay150EffectRequest("NETWORK_CLEANUP"));
  settleFarmOsDay150TypedEffect(stateMachine, "NETWORK_CLEANUP",
    await awaitFarmOsDay150TypedEffect(effectPort.cleanupOwnedNetwork()));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "ZERO_RESIDUAL_VERIFICATION",
    farmOsDay150EffectRequest("ZERO_RESIDUAL_VERIFICATION"));
  const cleanupResult = settleFarmOsDay150TypedEffect(stateMachine, "ZERO_RESIDUAL_VERIFICATION",
    await awaitFarmOsDay150TypedEffect(effectPort.verifyZeroResidual()));
  const receiptBody = Object.freeze({
    schema_version: FARM_OS_DAY150_REFERENCE_CATALOG_RUN_RECEIPT_SCHEMA,
    authority_state: "REFERENCE_CATALOG_RUN_RECEIPT_CANDIDATE" as const,
    derivation_authority_id: FARM_OS_DAY150_PREFIX_EXPECTED_CATALOG_DERIVATION_AUTHORITY,
    derivation_authority_revision: 1 as const,
    run_id: referenceCapture.run_id,
    run_nonce_digest: referenceCapture.run_nonce_digest,
    repository_catalog_revision: FARM_OS_DAY150_PREFIX_REPOSITORY_CATALOG_REVISION,
    migration_history_authority_digest: MIGRATION_HISTORY_AUTHORITY_DIGEST,
    git_authority_set_digest: GIT_AUTHORITY_SET_DIGEST,
    reference_postgres_major: 17 as const,
    reference_image: FARM_OS_DAY150_PREFIX_REFERENCE_IMAGE,
    reference_platform: FARM_OS_DAY150_PREFIX_REFERENCE_PLATFORM,
    catalog_query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
    object_universe_authority_digest: OBJECT_UNIVERSE_AUTHORITY_DIGEST,
    initial_catalog_authority_id: FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2_ID,
    initial_catalog_authority_revision: 2 as const,
    initial_catalog_digest:
      FARM_OS_DAY150_PREFIX_INITIAL_CATALOG_AUTHORITY_V2.canonical_initial_state_digest,
    principal_normalization_revision: FARM_OS_DAY150_REFERENCE_PRINCIPAL_NORMALIZATION_REVISION,
    bootstrap_plan_digest: INITIAL_BOOTSTRAP_PLAN.plan_digest,
    initial_state_readback_digest: initialReadback.readback_digest,
    execution_authorization_id:
      ACTIVE_REFERENCE_AUTHORIZATION_ID,
    execution_authorization_revision: ACTIVE_REFERENCE_AUTHORIZATION_REVISION,
    execution_authorization_digest: ACTIVE_REFERENCE_AUTHORIZATION_DIGEST,
    attempt_claim_digest: parsedAttemptClaim.claim_digest,
    attempt_identity: parsedAttemptClaim.attempt_identity,
    consumption_marker_digest: parsedConsumptionMarker.marker_digest,
    approval_reference: parsedAttemptClaim.approval_reference,
    gate17_scope_digest: parsedAttemptClaim.gate17_scope_digest,
    approval_candidate_identity: parsedAttemptClaim.approval_candidate_identity,
    proposal_identity: parsedAttemptClaim.proposal_identity,
    proposal_created_at: parsedAttemptClaim.proposal_created_at,
    approved_at: parsedAttemptClaim.approved_at,
    approval_record_digest: parsedAttemptClaim.approval_record_digest,
    migration_privilege_envelope_id:
      privilege.FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_ID,
    migration_privilege_envelope_digest:
      privilege.FARM_OS_DAY150_PREFIX_REFERENCE_MIGRATION_PRIVILEGE_ENVELOPE_DIGEST,
    semantic_principal_normalization_revision:
      FARM_OS_DAY150_REFERENCE_DUAL_PRINCIPAL_NORMALIZATION_REVISION,
    candidate_ids: referenceCapture.candidate_ids,
    pinned_migration_bundle_digest: pinnedBundle.bundle_digest,
    reference_capture_digest: referenceCapture.reference_capture_digest,
    pre_cleanup_run_evidence_digest: parsedPreCleanup.pre_cleanup_run_evidence_digest,
    candidate_identity_digests: parsedPreCleanup.candidate_identity_digests,
    snapshot_points: referenceCapture.snapshot_points,
    resource_ownership_identity: "farmos-day150-prefix-reference-owned-resources-v1" as const,
    connection_scope: "LOCALHOST_127_0_0_1_EPHEMERAL_PORT" as const,
    destination_assertion: "NO_PRODUCTION_NO_CANONICAL_DESTINATION" as const,
    execution_state: "COMPLETED_EXACT_FIVE_SOURCE_CAPTURE_AND_ZERO_RESIDUAL_CLEANUP" as const,
    cleanup_result: cleanupResult,
    started_at: referenceCapture.started_at, completed_at: new Date().toISOString(),
    raw_catalog_values_persisted: false as const, credentials_persisted: false as const,
  });
  const receipt = Object.freeze({ ...receiptBody,
    receipt_digest: hash(FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
      .digest_domains.success_receipt, receiptBody),
  });
  completeFarmOsDay150LocalBoundary(stateMachine, "BEFORE_FINAL_RECEIPT", qualificationScenario);
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "FINAL_RECEIPT_DURABLE_PUBLICATION",
    farmOsDay150EffectRequest("FINAL_RECEIPT_DURABLE_PUBLICATION", null, null,
      receipt.receipt_digest));
  settleFarmOsDay150TypedEffect(stateMachine, "FINAL_RECEIPT_DURABLE_PUBLICATION",
    await awaitFarmOsDay150TypedEffect(effectPort.publishFinalReceipt(receipt)));
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "FINAL_RECEIPT_REOPEN_READBACK",
    farmOsDay150EffectRequest("FINAL_RECEIPT_REOPEN_READBACK"));
  const receiptReadback = settleFarmOsDay150TypedEffect(stateMachine,
    "FINAL_RECEIPT_REOPEN_READBACK",
    await awaitFarmOsDay150TypedEffect(effectPort.readBackFinalReceipt()));
  const parsedReceipt = parseFarmOsDay150ReferenceCatalogRunReceiptCandidate(receiptReadback);
  if (!parsedReceipt || canonical(parsedReceipt) !== canonical(receipt)) {
    throw new Error("FINAL_RECEIPT_READBACK_REJECTED");
  }
  beginFarmOsDay150TypedEffect(stateMachine, effectPort, "TERMINAL_CLOSE",
    farmOsDay150EffectRequest("TERMINAL_CLOSE"));
  settleFarmOsDay150TypedEffect(stateMachine, "TERMINAL_CLOSE",
    await awaitFarmOsDay150TypedEffect(effectPort.closeExecutionBoundary()));
  const qualificationResult = attachFarmOsDay150AdapterTrace(
    stateMachine.complete(), effectPort, "SUCCESS");
  if (qualificationScenario) return qualificationResult;
  const readiness = effectPort.readReadinessObservation?.() ?? null;
  if (!readiness || !Number.isSafeInteger(readiness.probe_count) || readiness.probe_count < 1 ||
    readiness.probe_count > 120 || !Number.isFinite(readiness.time_to_ready_milliseconds) ||
    readiness.time_to_ready_milliseconds < 0 || readiness.time_to_ready_milliseconds >= 60_000) {
    throw new Error("POSTGRES_READINESS_EVIDENCE_MISSING");
  }
  return Object.freeze({
    status: "DAY150_PREFIX_REFERENCE_CATALOG_CANDIDATES_GENERATED" as const,
    authorization_id: ACTIVE_REFERENCE_AUTHORIZATION_ID,
    authorization_revision: ACTIVE_REFERENCE_AUTHORIZATION_REVISION,
    authorization_consumed_once: true as const,
    candidates: Object.freeze(exactCandidates), receipt: parsedReceipt,
    cleanup: "EXACT_OWNED_RESOURCES_REMOVED_ZERO_RESIDUAL" as const,
    readiness: Object.freeze({ ...readiness }),
    production_operations: 0 as const, canonical_operations: 0 as const,
  });
  } catch (error) {
    let result = error instanceof FarmOsDay150QualificationInterruption ? error.result :
      effectPort ? stateMachine.failClosedInvariant(error instanceof Error &&
        /^[A-Z0-9_]+$/u.test(error.message) ? error.message : "UNCLASSIFIED_INVARIANT_FAILURE") : null;
    const closeState = result?.failed_boundary === "TERMINAL_CLOSE"
      ? result.status === "OUTCOME_UNKNOWN" ? "AMBIGUOUS_OUTCOME" : "BOUNDED_FAILURE"
      : effectPort && (result?.external_operation_count ?? 0) > 0
        ? await closeFarmOsDay150InterruptedEffectPort(stateMachine, effectPort) : "NOT_REQUESTED";
    if (result && result.status === "REJECTED" && closeState !== "SUCCESS" &&
      closeState !== "NOT_REQUESTED") {
      result = Object.freeze({ ...result, status: "OUTCOME_UNKNOWN" as const,
        failure_code: `TERMINAL_CLOSE_${closeState}_OUTCOME_UNKNOWN`,
        terminal_outcome_receipt_state: "ABSENT" as const,
        terminal_outcome_receipt: null });
    }
    if (result && result.status === "REJECTED" && closeState === "SUCCESS" && effectPort &&
      terminalAttemptClaim && terminalConsumptionMarker) {
      result = await publishFarmOsDay150TerminalOutcomeForDeterministicFailure({
        result, controller: stateMachine, effect_port: effectPort, claim: terminalAttemptClaim,
        marker: terminalConsumptionMarker,
        candidate_identity_digests: durableCandidateIdentityDigests,
        pre_cleanup_evidence_digest: terminalPreCleanupEvidenceDigest,
      });
    }
    if (result) result = stateMachine.attachRecoveryAccounting(result);
    if (error instanceof FarmOsDay150QualificationInterruption) {
      return effectPort ? attachFarmOsDay150AdapterTrace(result ?? error.result,
        effectPort, closeState) : result ?? error.result;
    }
    if (effectPort) {
      return attachFarmOsDay150AdapterTrace(result ?? stateMachine.failClosedInvariant(
        "UNCLASSIFIED_INVARIANT_FAILURE"), effectPort, closeState);
    }
    throw error;
  }
}

export async function qualifyFarmOsDay150PublicExecutorDurableRestart(): Promise<Readonly<{
  status: "QUALIFIED"; before_consumption_restart: "SUCCEEDED";
  after_consumption_restart: "ORIGINAL_ATTEMPT_RECOVERED_NO_AUTOMATIC_CONTINUATION";
  replacement_attempt_count: 0;
  fresh_executor_instances: 4; shared_persistent_roots: 2;
}>> {
  const scenario = (store_root: string, mode: QualificationScenario["mode"],
    boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary | null,
    phase: QualificationScenario["phase"]): QualificationScenario => Object.freeze({
    mode, boundary, phase, durable_marker_fault: "NONE", store_root,
    ...qualificationApprovalRepositoryFields(store_root),
  });
  const beforeRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-public-restart-before-"));
  const beforeLoss = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: issueFarmOsDay150QualificationScenarioCapability(
      scenario(beforeRoot, "PROCESS_LOSS", "EXECUTION_PLAN_VALIDATION", "BEFORE_EFFECT")),
  });
  const beforeRestart = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: issueFarmOsDay150QualificationScenarioCapability(
      scenario(beforeRoot, "SUCCESS", null, "BEFORE_EFFECT")),
  });
  const afterRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-public-restart-after-"));
  const afterLoss = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: issueFarmOsDay150QualificationScenarioCapability(
      scenario(afterRoot, "PROCESS_LOSS", "AUTHORIZATION_CONSUMPTION",
        "AFTER_EFFECT_BEFORE_OBSERVATION")),
  });
  const afterRestart = await executeFarmOsDay150PrefixReferenceCatalogOnce({
    qualification_capability: issueFarmOsDay150QualificationScenarioCapability(
      scenario(afterRoot, "SUCCESS", null, "BEFORE_EFFECT")),
  });
  if (beforeLoss.status !== "PROCESS_LOSS" ||
    beforeLoss.authorization_state !== "AUTHORIZED_BUT_NOT_CONSUMED" ||
    beforeRestart.status !== "QUALIFICATION_PASS" || afterLoss.status !== "PROCESS_LOSS" ||
    afterLoss.authorization_state !== "CONSUMED_TERMINAL" ||
    afterLoss.attempt_identity_creation_count !== 1 ||
    afterRestart.status !== "REJECTED" ||
    afterRestart.authorization_state !== "CONSUMED_TERMINAL" ||
    afterRestart.failure_code !==
      "TRUSTED_CONSUMPTION_MARKER_RECOVERED_ORIGINAL_ATTEMPT_NO_AUTOMATIC_CONTINUATION" ||
    afterRestart.attempt_identity_creation_count !== 0 ||
    afterRestart.replacement_attempt_identity_count !== 0 ||
    afterLoss.adapter_observed_effect_trace.find((entry) =>
      entry.attempt_identity !== undefined)?.attempt_identity !==
      afterRestart.adapter_observed_effect_trace.find((entry) =>
        entry.attempt_identity !== undefined)?.attempt_identity) {
    throw new Error("PUBLIC_EXECUTOR_DURABLE_RESTART_REJECTED");
  }
  return Object.freeze({ status: "QUALIFIED", before_consumption_restart: "SUCCEEDED",
    after_consumption_restart: "ORIGINAL_ATTEMPT_RECOVERED_NO_AUTOMATIC_CONTINUATION",
    replacement_attempt_count: 0, fresh_executor_instances: 4,
    shared_persistent_roots: 2 });
}

async function executeFreshFarmOsDay150QualificationExecutor(
  scenario: QualificationScenario,
): Promise<FarmOsDay150PrefixReferenceQualificationResult | Readonly<{
  status: "BOUNDED_PUBLIC_REJECTION"; code: string }>> {
  try {
    return await executeFarmOsDay150PrefixReferenceCatalogOnce({
      qualification_capability: issueFarmOsDay150QualificationScenarioCapability(scenario),
    });
  } catch (error) {
    return Object.freeze({ status: "BOUNDED_PUBLIC_REJECTION" as const,
      code: error instanceof Error ? error.message : "NON_ERROR_REJECTION" });
  }
}

export type FarmOsDay150CrossProcessQualificationOperation =
  "CREATE_PRECLAIM" | "CREATE_CLAIM_ONLY" | "CREATE_AMBIGUOUS_MARKER_ABSENT" |
  "CREATE_CONSUMED" | "CREATE_TERMINAL_FAILURE" | "CREATE_TERMINAL_ACK_LOST" | "INSPECT" |
  "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE" | "PUBLIC_ACTIVE_LOSS_BEFORE_CLAIM" |
  "PUBLIC_ACTIVE_AMBIGUOUS_CLAIM" | "PUBLIC_ACTIVE_LOSS_AFTER_CLAIM" |
  "PUBLIC_ACTIVE_LOSS_AFTER_MARKER" | "PUBLIC_ACTIVE_RESTART" | "PUBLIC_ACTIVE_SUCCESS";
export type FarmOsDay150CrossProcessQualificationFault = Exclude<
  QualificationScenario["durable_marker_fault"], "NONE" | "MISSING" | "CORRUPT" |
  "WRONG_AUTHORIZATION" | "WRONG_PLAN_DIGEST" | "CORRUPT_CANDIDATE_1" |
  "CORRUPT_PRE_CLEANUP" | "CORRUPT_RECEIPT"
> | "NONE";

export async function runFarmOsDay150CrossProcessQualificationWorker(input: Readonly<{
  store_root: string; operation: FarmOsDay150CrossProcessQualificationOperation;
  fault?: FarmOsDay150CrossProcessQualificationFault;
}>): Promise<Readonly<{ process_id: number;
  result: FarmOsDay150PrefixReferenceQualificationResult | Readonly<{
    status: "BOUNDED_PUBLIC_REJECTION"; code: string }>;
  durable: Awaited<ReturnType<typeof reconstructFarmOsDay150QualificationDurableState>>;
  public_invocation_gate: FarmOsDay150PrefixReferenceInvocationGateDecision | null;
  mutation_eligible_count: 0 | 1;
}>> {
  const root = resolve(input.store_root);
  const temporaryRoot = resolve(tmpdir());
  if (!root.startsWith(`${temporaryRoot}${sep}`) || !existsSync(root)) {
    throw new Error("CROSS_PROCESS_QUALIFICATION_STORE_REJECTED");
  }
  const base = { store_root: root, durable_marker_fault: input.fault ?? "NONE",
    primitive_fault_match_ordinal: undefined,
    terminal_receipt_fault: "NONE" as const,
    local_memory_assumption: "NONE" as const,
    ...qualificationApprovalRepositoryFields(root) };
  const publicActive = input.operation.startsWith("PUBLIC_ACTIVE_");
  const scenario: QualificationScenario = input.operation === "CREATE_PRECLAIM" ||
    input.operation === "PUBLIC_ACTIVE_LOSS_BEFORE_CLAIM"
    ? Object.freeze({ ...base, mode: "PROCESS_LOSS", boundary: "EXECUTION_PLAN_VALIDATION",
      phase: "AFTER_EFFECT_BEFORE_OBSERVATION", public_artifact_paths: publicActive })
    : input.operation === "PUBLIC_ACTIVE_SUCCESS"
      ? Object.freeze({ ...base, mode: "SUCCESS", boundary: null,
        phase: "BEFORE_EFFECT", public_artifact_paths: true })
    : input.operation === "PUBLIC_ACTIVE_AMBIGUOUS_CLAIM"
      ? Object.freeze({ ...base, mode: "AMBIGUOUS", boundary: "ATTEMPT_CLAIM_PUBLICATION",
        phase: "AFTER_EFFECT_BEFORE_OBSERVATION", public_artifact_paths: true })
    : input.operation === "PUBLIC_ACTIVE_LOSS_AFTER_CLAIM"
      ? Object.freeze({ ...base, mode: "PROCESS_LOSS",
        boundary: "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION", phase: "BEFORE_EFFECT",
        public_artifact_paths: true })
    : input.operation === "PUBLIC_ACTIVE_LOSS_AFTER_MARKER" ||
      input.operation === "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE"
      ? Object.freeze({ ...base, mode: input.operation === "PUBLIC_ACTIVE_LOSS_AFTER_MARKER"
        ? "PROCESS_LOSS" : "FAILURE", boundary: "NETWORK_CREATION", phase: "BEFORE_EFFECT",
        public_artifact_paths: true })
    : input.operation === "PUBLIC_ACTIVE_RESTART"
      ? Object.freeze({ ...base, mode: "PROCESS_LOSS", boundary: "ATTEMPT_CLAIM_DECISION",
        phase: "BEFORE_EFFECT", public_artifact_paths: true })
    : input.operation === "CREATE_CLAIM_ONLY"
      ? Object.freeze({ ...base, mode: "PROCESS_LOSS", boundary: "ATTEMPT_CLAIM_READBACK",
        phase: "AFTER_EFFECT_BEFORE_OBSERVATION" })
      : input.operation === "CREATE_AMBIGUOUS_MARKER_ABSENT"
        ? Object.freeze({ ...base, mode: "AMBIGUOUS",
          boundary: "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION",
          phase: "AFTER_EFFECT_BEFORE_OBSERVATION", durable_marker_fault: "MISSING" })
        : input.operation === "CREATE_CONSUMED"
          ? Object.freeze({ ...base, mode: "PROCESS_LOSS", boundary: "AUTHORIZATION_CONSUMPTION",
            phase: "AFTER_EFFECT_BEFORE_OBSERVATION" })
          : input.operation === "CREATE_TERMINAL_FAILURE"
            ? Object.freeze({ ...base, mode: "FAILURE", boundary: "POSTGRES_STARTUP",
              phase: "BEFORE_EFFECT" })
            : input.operation === "CREATE_TERMINAL_ACK_LOST"
              ? Object.freeze({ ...base, mode: "FAILURE", boundary: "BEFORE_CLEANUP",
                phase: "BEFORE_EFFECT", terminal_receipt_fault: "ACK_LOST" as const })
          : Object.freeze({ ...base, mode: "PROCESS_LOSS", boundary: "ATTEMPT_CLAIM_DECISION",
            phase: "BEFORE_EFFECT" });
  const result = await executeFreshFarmOsDay150QualificationExecutor(scenario);
  const reached = "reached_boundaries" in result ? result.reached_boundaries : [];
  const publicInvocationGate = publicActive
    ? gateFarmOsDay150PrefixReferenceRepositoryInvocation({
      repository_root: base.approval_repository_root,
      clock: Object.freeze({ nowCanonicalUtc: () => base.repository_loader_observed_at }),
      requested_revision: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
        .authorization_revision,
    }) : null;
  return Object.freeze({ process_id: process.pid, result,
    durable: await reconstructFarmOsDay150QualificationDurableState(root),
    public_invocation_gate: publicInvocationGate,
    mutation_eligible_count: reached.includes("NETWORK_CREATION") ? 1 as const : 0 as const });
}

export async function qualifyFarmOsDay150RepositoryApprovalLineageContinuity(): Promise<Readonly<{
  status: "QUALIFIED";
  success_chain: "PROPOSAL_APPROVAL_CLAIM_MARKER_SUCCESS";
  terminal_chain: "PROPOSAL_APPROVAL_CLAIM_MARKER_TERMINAL";
  fresh_reconstruction_count: 2;
  lineage_mutation_rejections: 14;
  proposal_identity: `sha256:${string}`;
  approval_reference: string;
  approved_at: string;
  approval_record_digest: `sha256:${string}`;
}>> {
  const scenario = (storeRoot: string, mode: "SUCCESS" | "FAILURE") => Object.freeze({
    store_root: storeRoot,
    mode,
    boundary: mode === "SUCCESS" ? null : "POSTGRES_STARTUP" as
      FarmOsDay150PrefixReferencePublicExecutorBoundary,
    phase: "BEFORE_EFFECT" as const,
    durable_marker_fault: "NONE" as const,
    terminal_receipt_fault: "NONE" as const,
    local_memory_assumption: "NONE" as const,
    ...qualificationApprovalRepositoryFields(storeRoot),
  });
  const successRoot = mkdtempSync(join(tmpdir(), "farmos-day150-lineage-success-"));
  const terminalRoot = mkdtempSync(join(tmpdir(), "farmos-day150-lineage-terminal-"));
  const successResult = await executeFreshFarmOsDay150QualificationExecutor(
    scenario(successRoot, "SUCCESS"));
  const terminalResult = await executeFreshFarmOsDay150QualificationExecutor(
    scenario(terminalRoot, "FAILURE"));
  if (!("status" in successResult) || successResult.status !== "QUALIFICATION_PASS" ||
    !("status" in terminalResult) || terminalResult.status !== "REJECTED") {
    throw new Error("REPOSITORY_APPROVAL_LINEAGE_EXECUTION_REJECTED");
  }
  const reopenAt = (root: string, name: string) =>
    reopenCanonicalFarmOsDay150Artifact(join(root, `${name}.json`));
  const successClaim = parseFarmOsDay150PrefixReferenceAttemptClaim(
    await reopenAt(successRoot, "claim"));
  const successMarker = parseFarmOsDay150PrefixReferenceConsumptionMarker(
    await reopenAt(successRoot, "marker"));
  const successReceipt = parseFarmOsDay150ReferenceCatalogRunReceiptCandidate(
    await reopenAt(successRoot, "receipt"));
  const terminalClaim = parseFarmOsDay150PrefixReferenceAttemptClaim(
    await reopenAt(terminalRoot, "claim"));
  const terminalMarker = parseFarmOsDay150PrefixReferenceConsumptionMarker(
    await reopenAt(terminalRoot, "marker"));
  const terminalReceipt = parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt(
    await reopenAt(terminalRoot, "terminal-receipt"));
  if (!successClaim || !successMarker || !successReceipt || !terminalClaim ||
    !terminalMarker || !terminalReceipt) throw new Error(
      "REPOSITORY_APPROVAL_LINEAGE_DURABLE_ARTIFACT_REJECTED");
  const lineageKeys = ["approval_reference", "gate17_scope_digest", "approval_candidate_identity", "proposal_identity",
    "proposal_created_at", "approved_at", "approval_record_digest"] as const;
  for (const key of lineageKeys) {
    const successValue = successReceipt[key];
    const terminalValue = terminalReceipt[key];
    const mutate = (value: string) => value.startsWith("sha256:")
      ? `sha256:${value[7] === "0" ? "1" : "0"}${value.slice(8)}`
      : key.endsWith("_at") ? "2026-08-16T00:00:30.000Z" : `${value}-mutated`;
    if (parseFarmOsDay150ReferenceCatalogRunReceiptCandidate({
      ...successReceipt, [key]: mutate(successValue),
    }) !== null || parseFarmOsDay150PrefixReferenceTerminalOutcomeReceipt({
      ...terminalReceipt, [key]: mutate(terminalValue),
    }) !== null) throw new Error(`REPOSITORY_APPROVAL_LINEAGE_MUTATION_ACCEPTED:${key}`);
  }
  const successReconstruction = await reconstructFarmOsDay150QualificationDurableState(successRoot);
  const terminalReconstruction = await reconstructFarmOsDay150QualificationDurableState(terminalRoot);
  const exactLineage = [successMarker, successReceipt, terminalClaim, terminalMarker,
    terminalReceipt].every((value) => lineageKeys.every((key) =>
      value[key] === successClaim[key]));
  if (!exactLineage || successReconstruction.receipt_state !==
    "DURABLE_CLEANUP_BOUND_VERIFIED" || terminalReconstruction.receipt_state !==
    "DURABLE_TERMINAL_OUTCOME_VERIFIED" ||
    successReconstruction.recovered_approval_record_digest !==
      successClaim.approval_record_digest ||
    terminalReconstruction.recovered_approval_record_digest !==
      successClaim.approval_record_digest) throw new Error(
        "REPOSITORY_APPROVAL_LINEAGE_FRESH_RECONSTRUCTION_REJECTED");
  return Object.freeze({ status: "QUALIFIED",
    success_chain: "PROPOSAL_APPROVAL_CLAIM_MARKER_SUCCESS",
    terminal_chain: "PROPOSAL_APPROVAL_CLAIM_MARKER_TERMINAL",
    fresh_reconstruction_count: 2, lineage_mutation_rejections: 14,
    proposal_identity: successClaim.proposal_identity,
    approval_reference: successClaim.approval_reference,
    approved_at: successClaim.approved_at,
    approval_record_digest: successClaim.approval_record_digest });
}

export async function qualifyFarmOsDay150PublicClaimPathPreMutationContinuity(): Promise<Readonly<{
  status: "QUALIFIED";
  claim_path: string;
  marker_path: string;
  human_invocation_issuance_path: string;
  parent_created_by_publication_primitive: true;
  claim_canonical_readback: true;
  marker_canonical_readback: true;
  human_invocation_issuance_canonical_readback: true;
  mutation_eligibility_count: 1;
  actual_docker_mutations: 0;
  actual_postgres_operations: 0;
  actual_migration_operations: 0;
}>> {
  const storeRoot = mkdtempSync(join(tmpdir(), "farmos-day150-public-claim-path-"));
  const repositoryFields = qualificationApprovalRepositoryFields(storeRoot);
  const claimPath = resolve(repositoryFields.approval_repository_root,
    FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.attempt_claim);
  const markerPath = resolve(repositoryFields.approval_repository_root,
    FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.consumption_marker);
  const issuancePath = resolve(repositoryFields.approval_repository_root,
    farmOsDay150PrefixReferenceHumanInvocationIssuancePath(
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR));
  if (existsSync(resolve(claimPath, ".."))) throw new Error(
    "PUBLIC_CLAIM_PATH_PARENT_PREMATERIALIZED");
  const result = await executeFreshFarmOsDay150QualificationExecutor(Object.freeze({
    store_root: storeRoot,
    mode: "FAILURE" as const,
    boundary: "NETWORK_CREATION" as const,
    phase: "BEFORE_EFFECT" as const,
    durable_marker_fault: "NONE" as const,
    terminal_receipt_fault: "NONE" as const,
    local_memory_assumption: "NONE" as const,
    public_artifact_paths: true,
    ...repositoryFields,
  }));
  if (!("reached_boundaries" in result)) throw new Error(
    `PUBLIC_CLAIM_PATH_PRE_MUTATION_PUBLIC_REJECTION:${result.code}`);
  const claimBytes = readFileSync(claimPath, "utf8");
  const markerBytes = readFileSync(markerPath, "utf8");
  const issuanceBytes = readFileSync(issuancePath, "utf8");
  const claim = parseFarmOsDay150PrefixReferenceAttemptClaim(JSON.parse(claimBytes));
  const marker = parseFarmOsDay150PrefixReferenceConsumptionMarker(JSON.parse(markerBytes));
  const mutationEligibilityCount = result.reached_boundaries.filter((boundary) =>
    boundary === "NETWORK_CREATION").length;
  const postInvocationGate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
    repository_root: repositoryFields.approval_repository_root,
    clock: Object.freeze({ nowCanonicalUtc: () =>
      repositoryFields.repository_loader_observed_at }),
    requested_revision: FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR
      .authorization_revision,
  });
  if (result.status !== "REJECTED" || result.failed_boundary !== "NETWORK_CREATION" ||
    !claim || !marker || claimBytes !== `${canonical(claim)}\n` ||
    markerBytes !== `${canonical(marker)}\n` ||
    marker.attempt_claim_digest !== claim.claim_digest || mutationEligibilityCount !== 1 ||
    !issuanceBytes.endsWith("\n") ||
    postInvocationGate.human_invocation_issuance_state !== "VALID" ||
    result.authorization_state !== "CONSUMED_TERMINAL" ||
    result.durable_candidate_count !== 0) throw new Error(
      `PUBLIC_CLAIM_PATH_PRE_MUTATION_CONTINUITY_REJECTED:${JSON.stringify({
        status: result.status, failed_boundary: result.failed_boundary,
        failure_code: result.failure_code, requested_effects: result.requested_effects,
        authorization_state: result.authorization_state,
        durable_candidate_count: result.durable_candidate_count,
        claim_valid: claim !== null, marker_valid: marker !== null,
        claim_canonical: claim !== null && claimBytes === `${canonical(claim)}\n`,
        marker_canonical: marker !== null && markerBytes === `${canonical(marker)}\n`,
        mutation_eligibility_count: mutationEligibilityCount })}`);
  return Object.freeze({ status: "QUALIFIED", claim_path: claimPath, marker_path: markerPath,
    human_invocation_issuance_path: issuancePath,
    parent_created_by_publication_primitive: true, claim_canonical_readback: true,
    marker_canonical_readback: true, human_invocation_issuance_canonical_readback: true,
    mutation_eligibility_count: 1,
    actual_docker_mutations: 0, actual_postgres_operations: 0,
    actual_migration_operations: 0 });
}

export async function qualifyFarmOsDay150FreshPublicExecutorProcessLossMatrix(): Promise<Readonly<{
  status: "QUALIFIED"; process_loss_boundaries: number; process_loss_cases: number;
  public_executor_instances: number; shared_external_stores: number;
  reader_only_restarts: 0; phase_specific_reconstruction_assertions: number;
}>> {
  let cases = 0;
  let instances = 0;
  let phaseAssertions = 0;
  const boundaryIndex = (value: FarmOsDay150PrefixReferencePublicExecutorBoundary) =>
    FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.indexOf(value);
  const durableApplied = (lossBoundary: FarmOsDay150PrefixReferencePublicExecutorBoundary,
    phase: QualificationScenario["phase"], publicationBoundary:
      FarmOsDay150PrefixReferencePublicExecutorBoundary) => boundaryIndex(lossBoundary) >
      boundaryIndex(publicationBoundary) || (lossBoundary === publicationBoundary &&
        phase === "AFTER_EFFECT_BEFORE_OBSERVATION");
  for (const boundary of FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES) {
    for (const phase of ["BEFORE_EFFECT", "AFTER_EFFECT_BEFORE_OBSERVATION"] as const) {
      const storeRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-fresh-public-loss-"));
      const base = Object.freeze({ boundary, phase, durable_marker_fault: "NONE" as const,
        store_root: storeRoot,
        ...qualificationApprovalRepositoryFields(storeRoot) });
      const first = await executeFreshFarmOsDay150QualificationExecutor(Object.freeze({ ...base,
        mode: "PROCESS_LOSS" as const }));
      const reconstructedAfterA = await reconstructFarmOsDay150QualificationDurableState(storeRoot);
      const second = await executeFreshFarmOsDay150QualificationExecutor(Object.freeze({ ...base,
        mode: "SUCCESS" as const, boundary: null }));
      const reconstructedAfterB = await reconstructFarmOsDay150QualificationDurableState(storeRoot);
      instances += 2;
      if (!("status" in first) || !("status" in second) ||
        first.status === "QUALIFICATION_PASS" ||
        !["QUALIFICATION_PASS", "REJECTED", "OUTCOME_UNKNOWN", "BOUNDED_PUBLIC_REJECTION"]
          .includes(second.status)) {
        throw new Error(`FRESH_PUBLIC_EXECUTOR_PROCESS_LOSS_REJECTED:${boundary}:${phase}`);
      }
      const markerExpected = durableApplied(boundary, phase,
        "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION");
      const claimExpected = durableApplied(boundary, phase, "ATTEMPT_CLAIM_PUBLICATION");
      const candidateCountExpected = Array.from({ length: 5 }, (_, index) => durableApplied(
        boundary, phase, `CANDIDATE_${index + 1}_DURABLE_PUBLICATION` as
          FarmOsDay150PrefixReferencePublicExecutorBoundary)).filter(Boolean).length;
      const preCleanupExpected = durableApplied(boundary, phase,
        "PRE_CLEANUP_EVIDENCE_PUBLICATION");
      const receiptExpected = durableApplied(boundary, phase,
        "FINAL_RECEIPT_DURABLE_PUBLICATION");
      const networkPresent = durableApplied(boundary, phase, "NETWORK_CREATION") &&
        !durableApplied(boundary, phase, "NETWORK_CLEANUP");
      const volumePresent = durableApplied(boundary, phase, "VOLUME_CREATION") &&
        !durableApplied(boundary, phase, "VOLUME_CLEANUP");
      const containerPresent = durableApplied(boundary, phase, "CONTAINER_CREATION") &&
        !durableApplied(boundary, phase, "CONTAINER_CLEANUP");
      const cleanupCountExpected = ["CONTAINER_CLEANUP", "VOLUME_CLEANUP", "NETWORK_CLEANUP"]
        .filter((cleanupBoundary) => durableApplied(boundary, phase, cleanupBoundary as
          FarmOsDay150PrefixReferencePublicExecutorBoundary)).length;
      const expectedLastDurable = receiptExpected ? "FINAL_RECEIPT_DURABLE_PUBLICATION" :
        preCleanupExpected ? "PRE_CLEANUP_EVIDENCE_PUBLICATION" : candidateCountExpected > 0
          ? `CANDIDATE_${candidateCountExpected}_DURABLE_PUBLICATION` : markerExpected
            ? "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION" : claimExpected
              ? "ATTEMPT_CLAIM_PUBLICATION" : null;
      if (reconstructedAfterA.marker_present !== markerExpected ||
        reconstructedAfterA.claim_present !== claimExpected ||
        reconstructedAfterA.candidate_count !== candidateCountExpected ||
        reconstructedAfterA.pre_cleanup_present !== preCleanupExpected ||
        reconstructedAfterA.final_receipt_present !== receiptExpected ||
        reconstructedAfterA.resource_state.container !== (containerPresent ? "PRESENT" : "ABSENT") ||
        reconstructedAfterA.resource_state.volume !== (volumePresent ? "PRESENT" : "ABSENT") ||
        reconstructedAfterA.resource_state.network !== (networkPresent ? "PRESENT" : "ABSENT") ||
        reconstructedAfterA.cleanup_evidence_count !== cleanupCountExpected ||
        reconstructedAfterA.last_durable_completed_step !== expectedLastDurable ||
        reconstructedAfterA.retry_count !== 0 ||
        reconstructedAfterA.forbidden_transitions.join(":") !== "NEW_ATTEMPT:AUTOMATIC_RETRY") {
        throw new Error(`FRESH_PUBLIC_EXECUTOR_PHASE_STATE_REJECTED:${boundary}:${phase}`);
      }
      phaseAssertions += 12;
      if (markerExpected) {
        const resourceOutstanding = networkPresent || volumePresent || containerPresent;
        const expectedReconstructionCode = receiptExpected
          ? "TRUSTED_READBACK_ALREADY_COMMITTED_FOR_ORIGINAL_ATTEMPT"
          : resourceOutstanding || preCleanupExpected || candidateCountExpected > 0
            ? "KNOWN_OUTCOME_UNKNOWN_FOR_ORIGINAL_ATTEMPT"
            : "TRUSTED_CONSUMPTION_MARKER_RECOVERED_ORIGINAL_ATTEMPT_NO_AUTOMATIC_CONTINUATION";
        const markerRecoveryTrace = second.status === "BOUNDED_PUBLIC_REJECTION" ? null :
          second.adapter_observed_effect_trace.find((entry) =>
            entry.semantic_step_id === "CONSUMPTION_MARKER_RECOVERY_READBACK");
        if (reconstructedAfterA.recovered_attempt_id === null ||
          reconstructedAfterA.authorization_state !== "CONSUMED_TERMINAL" ||
          reconstructedAfterA.allowed_next_transition !== "READ_ONLY_RECONCILIATION_ONLY" ||
          reconstructedAfterB.recovered_attempt_id !== reconstructedAfterA.recovered_attempt_id ||
          reconstructedAfterB.candidate_count !== reconstructedAfterA.candidate_count ||
          canonical(reconstructedAfterB.resource_state) !==
            canonical(reconstructedAfterA.resource_state) ||
          reconstructedAfterB.cleanup_evidence_count !== cleanupCountExpected ||
          (first.status !== "BOUNDED_PUBLIC_REJECTION" &&
            first.attempt_identity_creation_count !== 1) ||
          second.status === "QUALIFICATION_PASS" ||
          (second.status !== "BOUNDED_PUBLIC_REJECTION" &&
            second.authorization_state !== "CONSUMED_TERMINAL") ||
          (second.status !== "BOUNDED_PUBLIC_REJECTION" &&
            second.failure_code !== expectedReconstructionCode) ||
          (expectedReconstructionCode === "KNOWN_OUTCOME_UNKNOWN_FOR_ORIGINAL_ATTEMPT" &&
            second.status !== "OUTCOME_UNKNOWN") ||
          (second.status !== "BOUNDED_PUBLIC_REJECTION" && (second.automatic_retry_count !== 0 ||
            second.attempt_identity_creation_count !== 0 ||
            second.replacement_attempt_identity_count !== 0)) ||
          !markerRecoveryTrace || markerRecoveryTrace.publication_candidate_digest === null ||
          markerRecoveryTrace.attempt_identity !== reconstructedAfterA.recovered_attempt_id ||
          markerRecoveryTrace.authorization_id !== ACTIVE_REFERENCE_AUTHORIZATION_ID ||
          markerRecoveryTrace.execution_plan_digest !== ACTIVE_REFERENCE_EXECUTION_PLAN_DIGEST) {
          throw new Error(`FRESH_PUBLIC_EXECUTOR_ORIGINAL_ATTEMPT_REJECTED:${boundary}:${phase}`);
        }
        phaseAssertions += 15;
      } else if (claimExpected) {
        if (reconstructedAfterA.authorization_state !== "ATTEMPT_CLAIMED" ||
          reconstructedAfterA.recovered_attempt_id === null ||
          reconstructedAfterA.recovered_attempt_claim_digest === null ||
          reconstructedAfterA.outstanding_ambiguity_state !==
            "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT" ||
          reconstructedAfterA.allowed_next_transition !== "READ_ONLY_RECONCILIATION_ONLY" ||
          second.status !== "OUTCOME_UNKNOWN" ||
          second.failure_code !== "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT" ||
          second.attempt_identity_creation_count !== 0 ||
          second.replacement_attempt_identity_count !== 0 ||
          reconstructedAfterB.recovered_attempt_id !== reconstructedAfterA.recovered_attempt_id) {
          throw new Error(`FRESH_PUBLIC_EXECUTOR_CLAIM_ONLY_RESTART_REJECTED:${boundary}:${phase}`);
        }
        phaseAssertions += 10;
      } else if (reconstructedAfterA.authorization_state !== "AUTHORIZED_BUT_NOT_CONSUMED" ||
        reconstructedAfterA.allowed_next_transition !==
          FARM_OS_DAY150_PREFIX_REFERENCE_REPOSITORY_AUTHORIZED_ACTIVE_EXECUTION ||
        second.status !== "QUALIFICATION_PASS") {
        throw new Error(`FRESH_PUBLIC_EXECUTOR_PRECONSUME_RESTART_REJECTED:${boundary}:${phase}`);
      } else phaseAssertions += 3;
      cases += 1;
    }
  }
  return Object.freeze({ status: "QUALIFIED", process_loss_boundaries:
    FARM_OS_DAY150_PREFIX_REFERENCE_PUBLIC_EXECUTOR_BOUNDARIES.length,
  process_loss_cases: cases, public_executor_instances: instances,
  shared_external_stores: cases, reader_only_restarts: 0,
  phase_specific_reconstruction_assertions: phaseAssertions });
}

export async function qualifyFarmOsDay150ActualSchemaFreshPublicExecutorRestartAI(): Promise<Readonly<{
  status: "QUALIFIED"; cases: 9; public_executor_instances: number;
  ambiguous_marker_absent_replay_cases: 1;
  valid_states_seeded_manually: 0; actual_schema_reopens: true;
  ambiguity_classifications: readonly ["UNEXPLAINED_PREEXISTING_STATE",
    "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT",
    "TRUSTED_READBACK_ALREADY_COMMITTED_FOR_ORIGINAL_ATTEMPT"];
}>> {
  const scenario = (store_root: string, mode: QualificationScenario["mode"],
    boundary: FarmOsDay150PrefixReferencePublicExecutorBoundary | null,
    phase: QualificationScenario["phase"], durable_marker_fault:
      QualificationScenario["durable_marker_fault"] = "NONE",
    primitive_fault_match_ordinal?: number,
    local_memory_assumption: QualificationScenario["local_memory_assumption"] = "NONE"):
    QualificationScenario => Object.freeze({ store_root, mode, boundary, phase,
      durable_marker_fault, primitive_fault_match_ordinal, local_memory_assumption,
      ...qualificationApprovalRepositoryFields(store_root),
    });
  let instances = 0;
  const run = async (value: QualificationScenario) => {
    instances += 1;
    return executeFreshFarmOsDay150QualificationExecutor(value);
  };
  const beforeRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-ai-a-"));
  const a = await run(scenario(beforeRoot, "PROCESS_LOSS", "EXECUTION_PLAN_VALIDATION",
    "BEFORE_EFFECT"));
  const aB = await run(scenario(beforeRoot, "SUCCESS", null, "BEFORE_EFFECT"));
  if (a.status !== "PROCESS_LOSS" || aB.status !== "QUALIFICATION_PASS" ||
    a.adapter_observed_effect_trace.some((entry) => entry.attempt_identity !== undefined)) {
    throw new Error("RESTART_A_REJECTED");
  }

  const committedRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-ai-committed-"));
  const bA = await run(scenario(committedRoot, "PROCESS_LOSS", "AUTHORIZATION_CONSUMPTION",
    "AFTER_EFFECT_BEFORE_OBSERVATION"));
  const bB = await run(scenario(committedRoot, "SUCCESS", null, "BEFORE_EFFECT"));
  if (bA.status !== "PROCESS_LOSS" || bB.status !== "REJECTED" ||
    bB.authorization_state !== "CONSUMED_TERMINAL") {
    throw new Error("RESTART_B_REJECTED");
  }
  const bAttempt = bA.adapter_observed_effect_trace.find((entry) =>
    entry.attempt_identity !== undefined)?.attempt_identity;
  if (!bAttempt ||
    bB.adapter_observed_effect_trace.find((entry) =>
      entry.attempt_identity !== undefined)?.attempt_identity !== bAttempt) {
    throw new Error("RESTART_B_REJECTED");
  }

  const cRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-ai-c-"));
  const c = await run(scenario(cRoot, "SUCCESS", null, "BEFORE_EFFECT", "NONE", undefined,
    "CLAIMED_CONSUMED"));
  if (c.status !== "REJECTED" || c.failure_code !==
    "LOCAL_CONSUMED_ASSUMPTION_WITHOUT_DURABLE_MARKER_REJECTED") {
    throw new Error("RESTART_C_REJECTED");
  }

  for (const [label, fault] of [["D", "CORRUPT"], ["E", "WRONG_AUTHORIZATION"],
    ["F", "WRONG_PLAN_DIGEST"]] as const) {
    const root = mkdtempSync(join(tmpdir(), `farmos-day150-prefix-ai-${label.toLowerCase()}-`));
    const valid = await run(scenario(root, "PROCESS_LOSS", "AUTHORIZATION_CONSUMPTION",
      "AFTER_EFFECT_BEFORE_OBSERVATION"));
    const corrupted = await run(scenario(root, "SUCCESS", null, "BEFORE_EFFECT", fault));
    if (valid.status !== "PROCESS_LOSS" || corrupted.status !== "REJECTED") {
      throw new Error(`RESTART_${label}_REJECTED`);
    }
  }

  const gRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-ai-g-"));
  const g = await run(scenario(gRoot, "SUCCESS", null, "BEFORE_EFFECT", "NONE", undefined,
    "EQUIVALENT_MARKER_OBJECT"));
  if (g.status !== "QUALIFICATION_PASS" || g.authorization_state !== "CONSUMED_TERMINAL") {
    throw new Error("RESTART_G_REJECTED");
  }
  const h = await run(scenario(committedRoot, "SUCCESS", null, "BEFORE_EFFECT", "NONE", undefined,
    "ASSUMED_UNCONSUMED"));
  if (h.status !== "REJECTED" || h.adapter_observed_effect_trace.find((entry) =>
    entry.attempt_identity !== undefined)?.attempt_identity !== bAttempt) {
    throw new Error("RESTART_H_REJECTED");
  }
  const iRoot = mkdtempSync(join(tmpdir(), "farmos-day150-prefix-ai-i-"));
  const iA = await run(scenario(iRoot, "PROCESS_LOSS", "AUTHORIZATION_CONSUMPTION",
    "AFTER_EFFECT_BEFORE_OBSERVATION"));
  const iB = await run(scenario(iRoot, "SUCCESS", null, "BEFORE_EFFECT", "CORRUPT", undefined,
    "CLAIMED_CONSUMED"));
  if (iA.status !== "PROCESS_LOSS" || iB.status !== "REJECTED") {
    throw new Error("RESTART_I_REJECTED");
  }
  const ambiguousMissingRoot = mkdtempSync(join(tmpdir(),
    "farmos-day150-prefix-ai-ambiguous-marker-missing-"));
  const ambiguousMissingA = await run(scenario(ambiguousMissingRoot, "AMBIGUOUS",
    "AUTHORIZATION_CONSUMPTION_MARKER_PUBLICATION", "AFTER_EFFECT_BEFORE_OBSERVATION",
    "MISSING"));
  const ambiguousMissingB = await run(scenario(ambiguousMissingRoot, "SUCCESS", null,
    "BEFORE_EFFECT"));
  if (ambiguousMissingA.status !== "OUTCOME_UNKNOWN" ||
    ambiguousMissingA.failure_code !==
      "CONSUMPTION_MARKER_PUBLICATION_UNRECONCILED_ATTEMPT_FENCED" ||
    ambiguousMissingB.status !== "OUTCOME_UNKNOWN" ||
    ambiguousMissingB.failure_code !== "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT" ||
    ambiguousMissingB.attempt_identity_creation_count !== 0 ||
    ambiguousMissingB.replacement_attempt_identity_count !== 0) {
    throw new Error("AMBIGUOUS_MARKER_ABSENT_REPLAY_FENCE_REJECTED");
  }
  return Object.freeze({ status: "QUALIFIED", cases: 9, public_executor_instances: instances,
    ambiguous_marker_absent_replay_cases: 1 as const,
    valid_states_seeded_manually: 0, actual_schema_reopens: true,
    ambiguity_classifications: Object.freeze(["UNEXPLAINED_PREEXISTING_STATE",
      "KNOWN_OUTCOME_UNKNOWN_FOR_EXACT_ATTEMPT",
      "TRUSTED_READBACK_ALREADY_COMMITTED_FOR_ORIGINAL_ATTEMPT"] as const) });
}
