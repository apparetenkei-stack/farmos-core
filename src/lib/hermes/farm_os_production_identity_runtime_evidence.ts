import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  validateFarmOsProductionIdentityQueryV2SanitizedResult,
  type FarmOsProductionIdentityQueryV2SanitizedResult,
} from "./farm_os_production_identity_query_v2_contract";
import {
  parseFarmOsProductionTargetIdentity,
  type FarmOsProductionTargetIdentity,
} from "./farm_os_stable_changes_migration_reconciliation";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
  type FarmOsOneShotExecutionApproval,
} from "./farm_os_production_identity_runtime_foundation";
import { createHash } from "node:crypto";

export const FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_SCHEMA_VERSION =
  "farmos.production-identity-runtime-evidence.v1" as const;

export const FARM_OS_PRODUCTION_IDENTITY_PROVENANCE_SOURCE_CLASSES = [
  "QUERY_OBSERVED",
  "TARGET_MANIFEST_EXPECTED",
  "DERIVED_DIGEST",
  "COLLECTOR_METADATA",
  "NOT_AVAILABLE",
  "DERIVED_COMPARISON",
] as const;
export type FarmOsProductionIdentityProvenanceSourceClass =
  typeof FARM_OS_PRODUCTION_IDENTITY_PROVENANCE_SOURCE_CLASSES[number];

export type FarmOsProductionIdentityFieldProvenance = Readonly<{
  field_path: string;
  source_class: FarmOsProductionIdentityProvenanceSourceClass;
  source_reference: string;
}>;

export type FarmOsProductionIdentityExpectedManifest = Readonly<FarmOsProductionTargetIdentity & {
  manifest_digest: `sha256:${string}`;
}>;

type SanitizedSection = FarmOsProductionIdentityQueryV2SanitizedResult["sections"][number];

export type FarmOsProductionIdentityRuntimeEvidenceEnvelope = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_SCHEMA_VERSION;
  binding_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.binding_authority_id;
  query_authority_id: "farmos.production-target-identity-query.v2";
  query_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256;
  result_contract_version: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION;
  collector_authority_id: string;
  connection_authority_id: string;
  execution_approval_lineage: FarmOsOneShotExecutionApproval;
  observed_at: string;
  evaluated_at: string;
  expected_identity: FarmOsProductionIdentityExpectedManifest;
  observed_deployment_identity: Readonly<{
    environment_id: null;
    environment_class: null;
    provider_resource_fingerprint: null;
    installation_id: null;
    farm_scope: null;
  }>;
  database_identity: Readonly<{
    observed_database_logical_name: string;
    expected_database_logical_name: string;
    comparison: "MATCH" | "MISMATCH";
  }>;
  server_identity: Readonly<{
    server_version_num: number;
    operator_role: string;
    transaction_read_only: "on";
    in_recovery: boolean;
  }>;
  cluster_identity_digest: `sha256:${string}`;
  identity_binding_availability_evidence: SanitizedSection;
  identity_comparison: Readonly<{
    environment_id: "NOT_COMPARABLE";
    environment_class: "NOT_COMPARABLE";
    provider_resource_fingerprint: "NOT_COMPARABLE";
    installation_id: "AVAILABILITY_ONLY_NOT_COMPARABLE";
    farm_scope: "AVAILABILITY_ONLY_NOT_COMPARABLE";
    cluster_system_identifier_digest: "MATCH" | "MISMATCH";
    postgres_major: "MATCH" | "MISMATCH";
    operator_class: "NOT_COMPARABLE";
  }>;
  schema_evidence: SanitizedSection;
  operator_evidence: SanitizedSection;
  acl_evidence: SanitizedSection;
  catalog_evidence: SanitizedSection;
  migration_history_evidence: readonly [SanitizedSection, SanitizedSection];
  activity_evidence: SanitizedSection;
  database_size_evidence: SanitizedSection;
  collection_complete: true;
  field_provenance: readonly FarmOsProductionIdentityFieldProvenance[];
  failure_classification: readonly ["IDENTITY_INCOMPLETE"];
}>;

type JsonRecord = Record<string, unknown>;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const FORBIDDEN_KEYS = new Set([
  "business_record_id", "client_addr", "client_ip", "connection_string", "host", "password",
  "query", "raw_cluster_identifier", "raw_definition", "raw_sensitive_texts", "sql", "token",
  "default_expression", "definition", "proconfig", "qual", "with_check",
]);

function record(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exact(value: JsonRecord, keys: readonly string[]): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
}

function canonicalIso(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) &&
    new Date(Date.parse(value)).toISOString() === value;
}

function safeTree(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(safeTree);
  if (!record(value)) return true;
  return Object.entries(value).every(([key, nested]) => {
    const normalized = key.toLowerCase();
    return !FORBIDDEN_KEYS.has(normalized) && !normalized.startsWith("raw_") && safeTree(nested);
  });
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "boolean" || typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error("runtime_evidence_non_finite");
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (!record(value)) throw new Error("runtime_evidence_non_json");
  return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
}

function sha256Canonical(value: unknown): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(canonicalJson(value), "utf8").digest("hex")}`;
}

export function digestFarmOsApprovedProductionTargetManifest(value: unknown): `sha256:${string}` | null {
  const parsed = parseFarmOsProductionTargetIdentity(value);
  return parsed === null ? null : sha256Canonical(parsed);
}

function leaves(value: unknown, prefix: string): string[] {
  if (Array.isArray(value)) return value.flatMap((item, index) => leaves(item, `${prefix}[${index}]`));
  if (record(value)) return Object.keys(value).sort().flatMap((key) => leaves(value[key], prefix ? `${prefix}.${key}` : key));
  return [prefix];
}

function provenanceFor(path: string): FarmOsProductionIdentityFieldProvenance {
  if (path.startsWith("expected_identity.")) {
    return { field_path: path, source_class: "TARGET_MANIFEST_EXPECTED", source_reference: "approved_target_manifest" };
  }
  if (path.startsWith("observed_deployment_identity.")) {
    return { field_path: path, source_class: "NOT_AVAILABLE", source_reference: "v2_query_does_not_observe_value" };
  }
  if (path.startsWith("execution_approval_lineage.")) {
    return { field_path: path, source_class: "COLLECTOR_METADATA", source_reference: "reserved_one_shot_approval" };
  }
  if (path === "cluster_identity_digest" || path.includes("sensitive_digests.") || path.endsWith("_digest")) {
    return { field_path: path, source_class: "DERIVED_DIGEST", source_reference: "v2_sanitizer_sha256" };
  }
  if (path.startsWith("identity_comparison.") || path === "database_identity.comparison") {
    return { field_path: path, source_class: "DERIVED_COMPARISON", source_reference: "query_observed+target_manifest_expected" };
  }
  if (path.startsWith("database_identity.expected_")) {
    return { field_path: path, source_class: "TARGET_MANIFEST_EXPECTED", source_reference: "approved_target_manifest" };
  }
  if (path.startsWith("database_identity.observed_") || path.startsWith("server_identity.") ||
    path.startsWith("schema_evidence.") || path.startsWith("operator_evidence.") ||
    path.startsWith("acl_evidence.") || path.startsWith("catalog_evidence.") ||
    path.startsWith("migration_history_evidence") || path.startsWith("activity_evidence.") ||
    path.startsWith("database_size_evidence.") || path.startsWith("identity_binding_availability_evidence.")) {
    return { field_path: path, source_class: "QUERY_OBSERVED", source_reference: "sanitized_v2_query_result" };
  }
  return { field_path: path, source_class: "COLLECTOR_METADATA", source_reference: "runtime_evidence_assembler" };
}

function expectedProvenance(envelopeWithoutProvenance: JsonRecord): readonly FarmOsProductionIdentityFieldProvenance[] {
  return leaves(envelopeWithoutProvenance, "").sort().map(provenanceFor);
}

function section(
  sanitized: FarmOsProductionIdentityQueryV2SanitizedResult,
  sectionId: SanitizedSection["section_id"],
): SanitizedSection | null {
  return sanitized.sections.find((candidate) => candidate.section_id === sectionId) ?? null;
}

export function assembleFarmOsProductionIdentityRuntimeEvidence(input: Readonly<{
  sanitized_result: FarmOsProductionIdentityQueryV2SanitizedResult;
  approved_manifest: unknown;
  approved_manifest_digest: `sha256:${string}`;
  collector_authority_id: string;
  connection_authority_id: string;
  execution_approval: FarmOsOneShotExecutionApproval;
  observed_at: string;
  evaluated_at: string;
}>): FarmOsProductionIdentityRuntimeEvidenceEnvelope | null {
  const parsedManifest = parseFarmOsProductionTargetIdentity(input.approved_manifest);
  if (!validateFarmOsProductionIdentityQueryV2SanitizedResult(input.sanitized_result) || parsedManifest === null ||
    parsedManifest.environment_class !== "production" ||
    digestFarmOsApprovedProductionTargetManifest(parsedManifest) !== input.approved_manifest_digest ||
    ![16, 17].includes(parsedManifest.expected_postgres_major) ||
    typeof input.collector_authority_id !== "string" || input.collector_authority_id.length === 0 ||
    typeof input.connection_authority_id !== "string" || input.connection_authority_id.length === 0 ||
    input.execution_approval.target_digest !== input.approved_manifest_digest ||
    input.execution_approval.collector_authority_id !== input.collector_authority_id ||
    input.execution_approval.query_authority_id !== "farmos.production-target-identity-query.v2" ||
    input.execution_approval.connection_authority_id !== input.connection_authority_id ||
    input.execution_approval.max_executions !== 1 || input.execution_approval.reservation_state !== "RESERVED" ||
    !input.execution_approval.principal || !input.execution_approval.execution_id ||
    !DIGEST.test(input.execution_approval.nonce_digest) ||
    !canonicalIso(input.execution_approval.issued_at) || !canonicalIso(input.execution_approval.approved_at) ||
    !canonicalIso(input.execution_approval.expires_at) ||
    Date.parse(input.execution_approval.issued_at) > Date.parse(input.execution_approval.approved_at) ||
    Date.parse(input.execution_approval.approved_at) > Date.parse(input.observed_at) ||
    Date.parse(input.execution_approval.expires_at) <= Date.parse(input.evaluated_at) ||
    !canonicalIso(input.observed_at) || !canonicalIso(input.evaluated_at) ||
    Date.parse(input.evaluated_at) < Date.parse(input.observed_at)) return null;
  const expectedManifest: FarmOsProductionIdentityExpectedManifest = {
    ...parsedManifest,
    manifest_digest: input.approved_manifest_digest,
  };
  const a = section(input.sanitized_result, "A_TRANSACTION_SERVER_GATE");
  const b = section(input.sanitized_result, "B_CLUSTER_IDENTITY_SOURCE");
  const c = section(input.sanitized_result, "C_SCHEMA_IDENTITY");
  const d = section(input.sanitized_result, "D_OPERATOR_AUTHORITY");
  const e = section(input.sanitized_result, "E_INSTALLATION_FARM_BINDING_AVAILABILITY");
  const f = section(input.sanitized_result, "F_ACL_PRINCIPAL_INVENTORY");
  const g = section(input.sanitized_result, "G_MIGRATION_CATALOG_INVENTORY");
  const h1 = section(input.sanitized_result, "H1_MIGRATION_HISTORY_EXISTENCE");
  const h2 = section(input.sanitized_result, "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT");
  const i = section(input.sanitized_result, "I_ACTIVITY_LOCK_AGGREGATES");
  const j = section(input.sanitized_result, "J_DATABASE_SIZE");
  if ([a, b, c, d, e, f, g, h1, h2, i, j].some((value) => value === null)) return null;
  const server = a!.rows[0]!.payload;
  const cluster = b!.rows[0]!.payload.cluster_system_identifier_digest;
  if (typeof server.database_logical_name !== "string" || typeof server.server_version_num !== "number" ||
    typeof server.operator_role !== "string" || server.transaction_read_only !== "on" ||
    typeof server.in_recovery !== "boolean" || typeof cluster !== "string" || !DIGEST.test(cluster)) return null;
  const withoutProvenance = {
    schema_version: FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_SCHEMA_VERSION,
    binding_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.binding_authority_id,
    query_authority_id: "farmos.production-target-identity-query.v2" as const,
    query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256,
    result_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
    collector_authority_id: input.collector_authority_id,
    connection_authority_id: input.connection_authority_id,
    execution_approval_lineage: input.execution_approval,
    observed_at: input.observed_at,
    evaluated_at: input.evaluated_at,
    expected_identity: expectedManifest,
    observed_deployment_identity: {
      environment_id: null, environment_class: null, provider_resource_fingerprint: null,
      installation_id: null, farm_scope: null,
    } as const,
    database_identity: {
      observed_database_logical_name: server.database_logical_name,
      expected_database_logical_name: expectedManifest.database_logical_name,
      comparison: server.database_logical_name === expectedManifest.database_logical_name ? "MATCH" as const : "MISMATCH" as const,
    },
    server_identity: {
      server_version_num: server.server_version_num,
      operator_role: server.operator_role,
      transaction_read_only: "on" as const,
      in_recovery: server.in_recovery,
    },
    cluster_identity_digest: cluster as `sha256:${string}`,
    identity_binding_availability_evidence: e!,
    identity_comparison: {
      environment_id: "NOT_COMPARABLE" as const,
      environment_class: "NOT_COMPARABLE" as const,
      provider_resource_fingerprint: "NOT_COMPARABLE" as const,
      installation_id: "AVAILABILITY_ONLY_NOT_COMPARABLE" as const,
      farm_scope: "AVAILABILITY_ONLY_NOT_COMPARABLE" as const,
      cluster_system_identifier_digest: cluster === expectedManifest.cluster_system_identifier_digest ? "MATCH" as const : "MISMATCH" as const,
      postgres_major: Math.floor(server.server_version_num / 10000) === expectedManifest.expected_postgres_major ? "MATCH" as const : "MISMATCH" as const,
      operator_class: "NOT_COMPARABLE" as const,
    },
    schema_evidence: c!, operator_evidence: d!, acl_evidence: f!, catalog_evidence: g!,
    migration_history_evidence: [h1!, h2!] as const,
    activity_evidence: i!, database_size_evidence: j!,
    collection_complete: true as const,
    failure_classification: ["IDENTITY_INCOMPLETE"] as const,
  };
  const fieldProvenance = expectedProvenance(withoutProvenance as unknown as JsonRecord);
  const envelope = { ...withoutProvenance, field_provenance: fieldProvenance };
  return validateFarmOsProductionIdentityRuntimeEvidence(envelope) ? envelope : null;
}

export function validateFarmOsProductionIdentityRuntimeEvidence(
  value: unknown,
): value is FarmOsProductionIdentityRuntimeEvidenceEnvelope {
  const topLevelKeys = [
    "schema_version", "binding_authority_id", "query_authority_id", "query_sha256",
    "result_contract_version", "collector_authority_id", "connection_authority_id",
    "execution_approval_lineage", "observed_at", "evaluated_at",
    "expected_identity", "observed_deployment_identity", "database_identity", "server_identity",
    "cluster_identity_digest", "identity_binding_availability_evidence", "identity_comparison",
    "schema_evidence", "operator_evidence", "acl_evidence", "catalog_evidence",
    "migration_history_evidence", "activity_evidence", "database_size_evidence",
    "collection_complete", "field_provenance", "failure_classification",
  ].sort();
  if (!record(value) || Object.keys(value).sort().join("|") !== topLevelKeys.join("|") ||
    !safeTree(value) || value.schema_version !== FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_SCHEMA_VERSION ||
    value.binding_authority_id !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RUNTIME_BINDING.binding_authority_id ||
    value.query_authority_id !== "farmos.production-target-identity-query.v2" ||
    value.query_sha256 !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_SHA256 ||
    value.result_contract_version !== FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION ||
    value.collection_complete !== true || !Array.isArray(value.failure_classification) ||
    JSON.stringify(value.failure_classification) !== JSON.stringify(["IDENTITY_INCOMPLETE"]) ||
    typeof value.collector_authority_id !== "string" || value.collector_authority_id.length < 1 || value.collector_authority_id.length > 256 ||
    typeof value.connection_authority_id !== "string" || value.connection_authority_id.length < 1 || value.connection_authority_id.length > 256 ||
    !canonicalIso(value.observed_at) || !canonicalIso(value.evaluated_at) ||
    Date.parse(value.evaluated_at) < Date.parse(value.observed_at) ||
    !Array.isArray(value.field_provenance)) return false;
  const { field_provenance: actual, ...withoutProvenance } = value;
  const expected = expectedProvenance(withoutProvenance);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) return false;
  if (!record(value.observed_deployment_identity) ||
    Object.values(value.observed_deployment_identity).some((observed) => observed !== null)) return false;
  if (!record(value.identity_comparison) ||
    !exact(value.identity_comparison, ["environment_id", "environment_class", "provider_resource_fingerprint", "installation_id", "farm_scope", "cluster_system_identifier_digest", "postgres_major", "operator_class"]) ||
    value.identity_comparison.environment_id !== "NOT_COMPARABLE" ||
    value.identity_comparison.environment_class !== "NOT_COMPARABLE" ||
    value.identity_comparison.provider_resource_fingerprint !== "NOT_COMPARABLE" ||
    value.identity_comparison.installation_id !== "AVAILABILITY_ONLY_NOT_COMPARABLE" ||
    value.identity_comparison.farm_scope !== "AVAILABILITY_ONLY_NOT_COMPARABLE" ||
    value.identity_comparison.operator_class !== "NOT_COMPARABLE") return false;
  if (!record(value.database_identity) || !record(value.server_identity) ||
    typeof value.database_identity.observed_database_logical_name !== "string" ||
    typeof value.server_identity.server_version_num !== "number" ||
    typeof value.server_identity.operator_role !== "string" ||
    value.server_identity.transaction_read_only !== "on" ||
    typeof value.server_identity.in_recovery !== "boolean" ||
    typeof value.cluster_identity_digest !== "string" || !DIGEST.test(value.cluster_identity_digest) ||
    !Array.isArray(value.migration_history_evidence) || value.migration_history_evidence.length !== 2) return false;
  if (!record(value.expected_identity)) return false;
  const { manifest_digest: manifestDigest, ...manifestCandidate } = value.expected_identity;
  const parsedManifest = parseFarmOsProductionTargetIdentity(manifestCandidate);
  if (parsedManifest === null || typeof manifestDigest !== "string" || !DIGEST.test(manifestDigest) ||
    digestFarmOsApprovedProductionTargetManifest(parsedManifest) !== manifestDigest || parsedManifest.environment_class !== "production" ||
    value.database_identity.expected_database_logical_name !== parsedManifest.database_logical_name ||
    value.database_identity.comparison !== (value.database_identity.observed_database_logical_name === parsedManifest.database_logical_name ? "MATCH" : "MISMATCH") ||
    value.identity_comparison.cluster_system_identifier_digest !== (value.cluster_identity_digest === parsedManifest.cluster_system_identifier_digest ? "MATCH" : "MISMATCH") ||
    value.identity_comparison.postgres_major !== (Math.floor(value.server_identity.server_version_num / 10000) === parsedManifest.expected_postgres_major ? "MATCH" : "MISMATCH")) return false;
  if (!record(value.execution_approval_lineage) || !exact(value.execution_approval_lineage, [
    "target_digest", "collector_authority_id", "query_authority_id", "connection_authority_id",
    "principal", "execution_id", "nonce_digest", "issued_at", "approved_at", "expires_at",
    "max_executions", "reservation_state",
  ]) ||
    value.execution_approval_lineage.target_digest !== manifestDigest ||
    value.execution_approval_lineage.collector_authority_id !== value.collector_authority_id ||
    value.execution_approval_lineage.query_authority_id !== value.query_authority_id ||
    value.execution_approval_lineage.connection_authority_id !== value.connection_authority_id ||
    typeof value.execution_approval_lineage.collector_authority_id !== "string" || value.execution_approval_lineage.collector_authority_id.length < 1 || value.execution_approval_lineage.collector_authority_id.length > 256 ||
    typeof value.execution_approval_lineage.connection_authority_id !== "string" || value.execution_approval_lineage.connection_authority_id.length < 1 || value.execution_approval_lineage.connection_authority_id.length > 256 ||
    value.execution_approval_lineage.max_executions !== 1 ||
    value.execution_approval_lineage.reservation_state !== "RESERVED" ||
    typeof value.execution_approval_lineage.principal !== "string" || value.execution_approval_lineage.principal.length === 0 ||
    typeof value.execution_approval_lineage.execution_id !== "string" || value.execution_approval_lineage.execution_id.length === 0 ||
    typeof value.execution_approval_lineage.nonce_digest !== "string" || !DIGEST.test(value.execution_approval_lineage.nonce_digest) ||
    !canonicalIso(value.execution_approval_lineage.issued_at) ||
    !canonicalIso(value.execution_approval_lineage.approved_at) ||
    !canonicalIso(value.execution_approval_lineage.expires_at) ||
    Date.parse(value.execution_approval_lineage.issued_at) > Date.parse(value.execution_approval_lineage.approved_at) ||
    Date.parse(value.execution_approval_lineage.approved_at) > Date.parse(String(value.observed_at)) ||
    Date.parse(value.execution_approval_lineage.expires_at) <= Date.parse(String(value.evaluated_at))) return false;
  const sanitized: FarmOsProductionIdentityQueryV2SanitizedResult = {
    schema_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
    sections: [
      {
        section_id: "A_TRANSACTION_SERVER_GATE",
        rows: [{
          row_key: "server",
          payload: {
            collection_status: "complete",
            server_version_num: value.server_identity.server_version_num,
            database_logical_name: value.database_identity.observed_database_logical_name,
            operator_role: value.server_identity.operator_role,
            transaction_read_only: "on",
            in_recovery: value.server_identity.in_recovery,
          },
          sanitization_class: "SAFE_STRUCTURAL",
        }],
      },
      {
        section_id: "B_CLUSTER_IDENTITY_SOURCE",
        rows: [{ row_key: "cluster", payload: {
          collection_status: "complete", cluster_system_identifier_digest: value.cluster_identity_digest,
        }, sanitization_class: "DIGEST_ONLY" }],
      },
      value.schema_evidence as SanitizedSection,
      value.operator_evidence as SanitizedSection,
      value.identity_binding_availability_evidence as SanitizedSection,
      value.acl_evidence as SanitizedSection,
      value.catalog_evidence as SanitizedSection,
      value.migration_history_evidence[0] as SanitizedSection,
      value.migration_history_evidence[1] as SanitizedSection,
      value.activity_evidence as SanitizedSection,
      value.database_size_evidence as SanitizedSection,
    ],
  };
  return validateFarmOsProductionIdentityQueryV2SanitizedResult(sanitized);
}

export const FARM_OS_PRODUCTION_IDENTITY_EVIDENCE_COMPATIBILITY = Object.freeze({
  source_schema: FARM_OS_PRODUCTION_IDENTITY_RUNTIME_EVIDENCE_SCHEMA_VERSION,
  existing_compact_schema: "farmos.production-target-live-evidence.v1",
  semantic_lossless_conversion: false,
  unsafe_cast_allowed: false,
  reason: "v1_compact_shape_cannot_preserve_expected_observed_comparison_provenance_or_A_J_evidence",
  candidate_successor_contract: "farmos.production-target-live-evidence.v2",
} as const);

export const FARM_OS_PRODUCTION_IDENTITY_EVIDENCE_WRITER_POLICY = Object.freeze({
  accepts: "VALIDATED_COMPLETE_SANITIZED_BOUND_ENVELOPE_ONLY",
  rejects: ["PARTIAL", "RAW_SENSITIVE", "UNBOUND_TARGET", "UNBOUND_APPROVAL", "INVALID_PROVENANCE", "IDENTITY_INCOMPLETE"],
  future_format: "CANONICAL_JSON_SHA256",
  future_mode: "0600",
  future_location: "FIXED_EXTERNAL_DIRECTORY",
  future_write: "ATOMIC_WITH_CLEANUP",
  production_implementation: "NONE",
} as const);
