import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
} from "./farm_os_production_identity_query_v5_authority";
import {
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
} from "./farm_os_production_target_identity_minimal_observation_authority";
import {
  evaluateFarmOsProductionTargetAuthorityLifecycle,
  isFarmOsProductionTargetAuthorityRevision,
} from "./farm_os_production_target_authority_lifecycle";

export const FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID =
  "farmos.production-target-collector-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION =
  "BOUNDED_PRODUCTION_TARGET_IDENTITY_OBSERVATION" as const;

const CONNECTION_AUTHORITY_ID = "farmos.production-target-connection-authority.v1" as const;
const PRINCIPAL_AUTHORITY_ID =
  "farmos.production-target-principal-capability-authority.v1" as const;
const POSTGRES_TLS_AUTHORITY_ID =
  "farmos.production-target-postgres-tls-attestation-authority.v1" as const;

export const FARM_OS_PRODUCTION_TARGET_COLLECTOR_POLICY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  revision: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_REVISION,
  allowed_operation_class: FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION,
  v5_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id,
  v5_artifact_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256,
  minimal_observation_authority_id:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID,
  minimal_observation_artifact_sha256:
    FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256,
  required_connection_authority_id: CONNECTION_AUTHORITY_ID,
  required_connection_authority_revision: 1,
  required_principal_authority_id: PRINCIPAL_AUTHORITY_ID,
  required_principal_authority_revision: 1,
  required_postgres_tls_authority_id: POSTGRES_TLS_AUTHORITY_ID,
  required_postgres_tls_authority_revision: 1,
  prohibited_capabilities: Object.freeze([
    "BUSINESS_DATA_READ", "ARBITRARY_SQL", "DML", "DDL", "MIGRATION", "GRANT",
    "REVOKE", "RUNTIME_ACTIVATION", "GENERAL_DATABASE_ACCESS", "GATE2_EXECUTION",
    "PRODUCTION_ACCESS",
  ] as const),
  exact_revision_resolution: true,
  same_revision_mutation: "FORBIDDEN",
  policy_change_semantics: "NEW_REVISION_REQUIRED",
  historical_revoked_revisions: "PRESERVED",
  automatic_latest_selection: false,
  fallback: "PROHIBITED",
  contract_state: "DEFINED",
  review_status: "DAY150_SOURCE_CLOSURE_APPROVED",
  implementation_state: "SOURCE_IMPLEMENTED_TRUSTED_CAPABILITY_ONLY",
  execution_enabled: false,
  production_callable: false,
  probe_use_state: "NOT_AUTHORIZED",
  qualification_state: "QUALIFIED_SOURCE_ONLY_PRODUCTION_CALLS_ZERO",
  adoption_state: "SOURCE_ADOPTED_RUNTIME_NOT_BOUND",
  runtime_binding_state: "NOT_BOUND",
} as const);

export type FarmOsProductionTargetCollectorAuthority = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID;
  revision: number;
  approved_target_resource_digest: `sha256:${string}`;
  allowed_operation_class: typeof FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION;
  v5_authority_id: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id;
  v5_artifact_sha256: typeof FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256;
  minimal_observation_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID;
  minimal_observation_artifact_sha256:
    typeof FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256;
  required_connection_authority_id: typeof CONNECTION_AUTHORITY_ID;
  required_connection_authority_revision: 1;
  required_principal_authority_id: typeof PRINCIPAL_AUTHORITY_ID;
  required_principal_authority_revision: 1;
  required_postgres_tls_authority_id: typeof POSTGRES_TLS_AUTHORITY_ID;
  required_postgres_tls_authority_revision: 1;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  execution_enabled: false;
  runtime_bound: false;
  production_callable: false;
  automatic_latest_selection: false;
  fallback: "PROHIBITED";
}>;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const KEYS = Object.freeze([
  "activates_at", "allowed_operation_class", "approved_target_resource_digest",
  "authority_id", "automatic_latest_selection", "execution_enabled", "expires_at",
  "fallback", "minimal_observation_artifact_sha256", "minimal_observation_authority_id",
  "production_callable", "required_connection_authority_id",
  "required_connection_authority_revision", "required_postgres_tls_authority_id",
  "required_postgres_tls_authority_revision", "required_principal_authority_id",
  "required_principal_authority_revision", "revision", "revoked", "runtime_bound",
  "v5_artifact_sha256", "v5_authority_id",
] as const);

function exactRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === KEYS.length && actual.every((key, index) => key === KEYS[index]);
}

export function validateFarmOsProductionTargetCollectorAuthority(
  input: unknown,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    revision: number;
    now: string;
  }>,
): boolean {
  if (!exactRecord(input) || !isFarmOsProductionTargetAuthorityRevision(input.revision) ||
    expected.revision !== FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_REVISION ||
    input.revision !== expected.revision) return false;
  return input.authority_id === FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID &&
    DIGEST.test(String(input.approved_target_resource_digest)) &&
    input.approved_target_resource_digest === expected.approved_target_resource_digest &&
    input.allowed_operation_class === FARM_OS_PRODUCTION_TARGET_COLLECTOR_OPERATION &&
    input.v5_authority_id === FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_CANDIDATE.authority_id &&
    input.v5_artifact_sha256 === FARM_OS_PRODUCTION_IDENTITY_QUERY_V5_SHA256 &&
    input.minimal_observation_authority_id ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_AUTHORITY_ID &&
    input.minimal_observation_artifact_sha256 ===
      FARM_OS_PRODUCTION_TARGET_IDENTITY_MINIMAL_OBSERVATION_SHA256 &&
    input.required_connection_authority_id === CONNECTION_AUTHORITY_ID &&
    input.required_connection_authority_revision === 1 &&
    input.required_principal_authority_id === PRINCIPAL_AUTHORITY_ID &&
    input.required_principal_authority_revision === 1 &&
    input.required_postgres_tls_authority_id === POSTGRES_TLS_AUTHORITY_ID &&
    input.required_postgres_tls_authority_revision === 1 &&
    input.execution_enabled === false && input.runtime_bound === false &&
    input.production_callable === false && input.automatic_latest_selection === false &&
    input.fallback === "PROHIBITED" &&
    evaluateFarmOsProductionTargetAuthorityLifecycle({
      activates_at: String(input.activates_at),
      expires_at: String(input.expires_at),
      revoked: input.revoked as boolean,
    }, expected.now) === "ACTIVE";
}

export function resolveFarmOsProductionTargetCollectorAuthorityExact(
  authorities: readonly unknown[],
  expected: Parameters<typeof validateFarmOsProductionTargetCollectorAuthority>[1],
): FarmOsProductionTargetCollectorAuthority | null {
  if (!isFarmOsProductionTargetAuthorityRevision(expected.revision) ||
    expected.revision !== FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_REVISION) return null;
  const matches = authorities.filter((authority) =>
    validateFarmOsProductionTargetCollectorAuthority(authority, expected));
  return matches.length === 1 ? matches[0] as FarmOsProductionTargetCollectorAuthority : null;
}
