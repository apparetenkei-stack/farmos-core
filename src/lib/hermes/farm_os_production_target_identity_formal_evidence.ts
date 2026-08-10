import {
  FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY_ID,
} from "./farm_os_postgres_cluster_system_identifier_digest";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "./farm_os_production_target_identity_minimal_observation_authority";
import {
  FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
} from "./farm_os_supabase_project_resource_fingerprint";

export const FARM_OS_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE_SCHEMA_VERSION =
  "farmos.production-target-identity-formal-evidence.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_IDENTITY_PRODUCTION_EVIDENCE_AUTHORITY_STATUS =
  "NOT_ESTABLISHED" as const;

export const FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING = Object.freeze({
  installation_id: "apparetenkei-farmos-core-mac-01",
  farm_scope: "apparetenkei-primary-farm",
  environment_class: "production",
  environment_id: "apparetenkei-production-primary",
  database_logical_name: "farmos_core_prod",
  expected_postgres_major: 17,
  provider_class: "managed_postgres",
  provider_implementation_family: "Supabase Managed PostgreSQL",
} as const);

export const FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION = Object.freeze({
  manifest_id:
    "production-target-apparetenkei-farmos-core-mac-01-apparetenkei-primary-farm",
  revision: 1,
  purpose: "production_target_identity_collection",
  access_mode: "READ_ONLY",
  transaction_read_only_required: true,
  approved_target_schema_scope: Object.freeze(["ai", "audit", "core_schema"] as const),
  target_identity_approval_reference:
    "day150-phase-a-production-target-identity-v1-approval",
  manifest_revision_approval_reference:
    "day150-phase-a-production-target-manifest-r1-approval",
  concrete_manifest_revision_exists: false,
  production_target_manifest_required_resolved: false,
  execution_approval_effect: "NONE",
} as const);

export type FarmOsProductionTargetIdentityTargetBinding =
  typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING;

export type FarmOsProductionTargetIdentityFormalEvidence = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE_SCHEMA_VERSION;
  target_binding: FarmOsProductionTargetIdentityTargetBinding;
  provider_resource_fingerprint: `sha256:${string}`;
  provider_resource_fingerprint_authority_id:
    typeof FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID;
  provider_resource_fingerprint_provenance_reference: string;
  cluster_system_identifier_digest: `sha256:${string}`;
  cluster_system_identifier_digest_authority_id:
    typeof FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY_ID;
  cluster_system_identifier_digest_provenance_reference: string;
  observation_query_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID;
  observation_query_artifact_sha256:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256;
  target_identity_approval_reference:
    "day150-phase-a-production-target-identity-v1-approval";
  manifest_revision_approval_reference:
    "day150-phase-a-production-target-manifest-r1-approval";
  secret_exposed: false;
  production_writes: 0;
  evidence_acquisition_boundary_authority_id:
    "farmos.production-target-evidence-acquisition-boundary.v1";
  evidence_acquisition_approval_authority_id: string;
  evidence_acquisition_approval_receipt_id: string;
  evidence_acquisition_command_id: string;
  target_association_digest: `sha256:${string}`;
  evidence_class: "NON_PRODUCTION_FIXTURE" | "PRODUCTION_FORMAL_EVIDENCE";
}>;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const REFERENCE = /^[a-z0-9][a-z0-9._:/-]{0,199}$/u;
const FORBIDDEN_REFERENCE_VALUE = /(?:https?:\/\/|postgres(?:ql)?:\/\/|token|secret|credential|jwt|api[_-]?key|password)/iu;
const FORBIDDEN_KEY = /(?:^raw_|credential|token|secret|jwt|api[_-]?key|url|endpoint|password)/iu;
const EVIDENCE_KEYS = Object.freeze([
  "cluster_system_identifier_digest",
  "cluster_system_identifier_digest_authority_id",
  "cluster_system_identifier_digest_provenance_reference",
  "evidence_acquisition_approval_authority_id",
  "evidence_acquisition_approval_receipt_id",
  "evidence_acquisition_boundary_authority_id",
  "evidence_acquisition_command_id",
  "evidence_class",
  "manifest_revision_approval_reference",
  "observation_query_artifact_sha256",
  "observation_query_authority_id",
  "production_writes",
  "provider_resource_fingerprint",
  "provider_resource_fingerprint_authority_id",
  "provider_resource_fingerprint_provenance_reference",
  "schema_version",
  "secret_exposed",
  "target_association_digest",
  "target_binding",
  "target_identity_approval_reference",
] as const);
const TARGET_KEYS = Object.freeze([
  "database_logical_name", "environment_class", "environment_id", "expected_postgres_major",
  "farm_scope", "installation_id", "provider_class", "provider_implementation_family",
] as const);

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

function containsForbiddenKey(value: unknown, seen = new WeakSet<object>()): boolean {
  if ((typeof value !== "object" && typeof value !== "function") || value === null) return false;
  if (seen.has(value)) return true;
  seen.add(value);
  if (Array.isArray(value)) return value.some((item) => containsForbiddenKey(item, seen));
  if (!record(value)) return false;
  return Object.entries(value).some(([key, nested]) =>
    (key !== "secret_exposed" && FORBIDDEN_KEY.test(key)) || containsForbiddenKey(nested, seen));
}

function safeReference(value: unknown): value is string {
  return typeof value === "string" && REFERENCE.test(value) &&
    !FORBIDDEN_REFERENCE_VALUE.test(value);
}

function boundedText(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= 200;
}

function validateTargetBindingShape(value: unknown): boolean {
  return record(value) && exact(value, TARGET_KEYS) &&
    safeReference(value.installation_id) && safeReference(value.farm_scope) &&
    safeReference(value.environment_class) && safeReference(value.environment_id) &&
    safeReference(value.database_logical_name) &&
    Number.isInteger(value.expected_postgres_major) &&
    typeof value.expected_postgres_major === "number" &&
    value.expected_postgres_major > 0 && value.expected_postgres_major <= 999 &&
    safeReference(value.provider_class) && boundedText(value.provider_implementation_family);
}

export function isFarmOsProductionTargetIdentityApprovedBinding(
  value: unknown,
): value is FarmOsProductionTargetIdentityTargetBinding {
  return record(value) && exact(value, TARGET_KEYS) &&
    value.installation_id === FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.installation_id &&
    value.farm_scope === FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.farm_scope &&
    value.environment_class === FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.environment_class &&
    value.environment_id === FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.environment_id &&
    value.database_logical_name ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.database_logical_name &&
    value.expected_postgres_major ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.expected_postgres_major &&
    value.provider_class === FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.provider_class &&
    value.provider_implementation_family ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING.provider_implementation_family;
}

export function validateFarmOsProductionTargetIdentityStructuralEvidence(
  value: unknown,
): boolean {
  if (!record(value) || containsForbiddenKey(value) || !exact(value, EVIDENCE_KEYS)) return false;
  return value.schema_version === FARM_OS_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE_SCHEMA_VERSION &&
    validateTargetBindingShape(value.target_binding) &&
    typeof value.provider_resource_fingerprint === "string" &&
    DIGEST.test(value.provider_resource_fingerprint) &&
    safeReference(value.provider_resource_fingerprint_authority_id) &&
    safeReference(value.provider_resource_fingerprint_provenance_reference) &&
    typeof value.cluster_system_identifier_digest === "string" &&
    DIGEST.test(value.cluster_system_identifier_digest) &&
    safeReference(value.cluster_system_identifier_digest_authority_id) &&
    safeReference(value.cluster_system_identifier_digest_provenance_reference) &&
    safeReference(value.observation_query_authority_id) &&
    typeof value.observation_query_artifact_sha256 === "string" &&
    DIGEST.test(value.observation_query_artifact_sha256) &&
    safeReference(value.target_identity_approval_reference) &&
    safeReference(value.manifest_revision_approval_reference) &&
    value.secret_exposed === false && value.production_writes === 0 &&
    value.evidence_acquisition_boundary_authority_id ===
      "farmos.production-target-evidence-acquisition-boundary.v1" &&
    safeReference(value.evidence_acquisition_approval_authority_id) &&
    safeReference(value.evidence_acquisition_approval_receipt_id) &&
    safeReference(value.evidence_acquisition_command_id) &&
    typeof value.target_association_digest === "string" &&
    DIGEST.test(value.target_association_digest) &&
    (value.evidence_class === "NON_PRODUCTION_FIXTURE" ||
      value.evidence_class === "PRODUCTION_FORMAL_EVIDENCE");
}

export function createFarmOsProductionTargetIdentityFixtureEvidence(input: Readonly<{
  provider_resource_fingerprint: `sha256:${string}`;
  provider_resource_fingerprint_provenance_reference: string;
  cluster_system_identifier_digest: `sha256:${string}`;
  cluster_system_identifier_digest_provenance_reference: string;
  evidence_acquisition_approval_authority_id: string;
  evidence_acquisition_approval_receipt_id: string;
  evidence_acquisition_command_id: string;
  target_association_digest: `sha256:${string}`;
}>): FarmOsProductionTargetIdentityFormalEvidence | null {
  const evidence = Object.freeze({
    schema_version: FARM_OS_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE_SCHEMA_VERSION,
    target_binding: FARM_OS_PRODUCTION_TARGET_IDENTITY_APPROVED_BINDING,
    provider_resource_fingerprint: input.provider_resource_fingerprint,
    provider_resource_fingerprint_authority_id:
      FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID,
    provider_resource_fingerprint_provenance_reference:
      input.provider_resource_fingerprint_provenance_reference,
    cluster_system_identifier_digest: input.cluster_system_identifier_digest,
    cluster_system_identifier_digest_authority_id:
      FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY_ID,
    cluster_system_identifier_digest_provenance_reference:
      input.cluster_system_identifier_digest_provenance_reference,
    observation_query_authority_id:
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
    observation_query_artifact_sha256:
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
    target_identity_approval_reference:
      FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.target_identity_approval_reference,
    manifest_revision_approval_reference:
      FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.manifest_revision_approval_reference,
    secret_exposed: false,
    production_writes: 0,
    evidence_acquisition_boundary_authority_id:
      "farmos.production-target-evidence-acquisition-boundary.v1",
    evidence_acquisition_approval_authority_id:
      input.evidence_acquisition_approval_authority_id,
    evidence_acquisition_approval_receipt_id:
      input.evidence_acquisition_approval_receipt_id,
    evidence_acquisition_command_id: input.evidence_acquisition_command_id,
    target_association_digest: input.target_association_digest,
    evidence_class: "NON_PRODUCTION_FIXTURE",
  } as const);
  return validateFarmOsProductionTargetIdentityFixtureEvidenceLineage(evidence, {
    approval_authority_id: input.evidence_acquisition_approval_authority_id,
    approval_receipt_id: input.evidence_acquisition_approval_receipt_id,
    command_id: input.evidence_acquisition_command_id,
    target_association_digest: input.target_association_digest,
  }) ? evidence : null;
}

export type FarmOsProductionTargetIdentityExpectedEvidenceLineage = Readonly<{
  approval_authority_id: string;
  approval_receipt_id: string;
  command_id: string;
  target_association_digest: `sha256:${string}`;
}>;

export function validateFarmOsProductionTargetIdentityFixtureEvidenceLineage(
  value: unknown,
  expected: FarmOsProductionTargetIdentityExpectedEvidenceLineage,
): value is FarmOsProductionTargetIdentityFormalEvidence {
  if (!validateFarmOsProductionTargetIdentityStructuralEvidence(value) || !record(value)) {
    return false;
  }
  return value.evidence_class === "NON_PRODUCTION_FIXTURE" &&
    isFarmOsProductionTargetIdentityApprovedBinding(value.target_binding) &&
    value.provider_resource_fingerprint_authority_id ===
      FARM_OS_SUPABASE_PROJECT_RESOURCE_FINGERPRINT_AUTHORITY_ID &&
    value.cluster_system_identifier_digest_authority_id ===
      FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY_ID &&
    value.observation_query_authority_id ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID &&
    value.observation_query_artifact_sha256 ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256 &&
    value.target_identity_approval_reference ===
      FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.target_identity_approval_reference &&
    value.manifest_revision_approval_reference ===
      FARM_OS_PRODUCTION_TARGET_MANIFEST_POLICY_RESERVATION.manifest_revision_approval_reference &&
    value.evidence_acquisition_boundary_authority_id ===
      "farmos.production-target-evidence-acquisition-boundary.v1" &&
    value.evidence_acquisition_approval_authority_id === expected.approval_authority_id &&
    value.evidence_acquisition_approval_receipt_id === expected.approval_receipt_id &&
    value.evidence_acquisition_command_id === expected.command_id &&
    value.target_association_digest === expected.target_association_digest;
}

export function validateFarmOsProductionTargetIdentityProductionEvidenceLineage(
  value: unknown,
  _expected: FarmOsProductionTargetIdentityExpectedEvidenceLineage,
): value is never {
  if (!validateFarmOsProductionTargetIdentityStructuralEvidence(value)) return false;
  return false;
}
