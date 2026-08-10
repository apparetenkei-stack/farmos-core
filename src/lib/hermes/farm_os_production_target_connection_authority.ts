import {
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
} from "./farm_os_production_target_database_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
} from "./farm_os_production_target_principal_capability_authority";
import {
  FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
} from "./farm_os_production_target_tls_attestation_authority";
import {
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
} from "./farm_os_production_target_collector_authority";
import {
  evaluateFarmOsProductionTargetAuthorityLifecycle,
  isFarmOsProductionTargetAuthorityRevision,
} from "./farm_os_production_target_authority_lifecycle";

export const FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID =
  "farmos.production-target-connection-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_REVISION = 1 as const;

export const FARM_OS_PRODUCTION_TARGET_CONNECTION_POLICY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  revision: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_REVISION,
  approved_target_binding_reference:
    "farmos.production-target-identity-formal-evidence.v1#target_binding",
  environment_id: "apparetenkei-production-primary",
  installation_id: "apparetenkei-farmos-core-mac-01",
  farm_scope: "apparetenkei-primary-farm",
  provider_class: "managed_postgres",
  provider_family: "Supabase Managed PostgreSQL",
  database_logical_name: "farmos_core_prod",
  expected_postgres_major: 17,
  database_credential_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  database_credential_authority_revision: 1,
  database_credential_broker_authority_id:
    FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  database_credential_broker_authority_revision: 1,
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  tls_attestation_authority_id: FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID,
  tls_attestation_authority_revision: 1,
  collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  collector_authority_revision: 1,
  maximum_connections: 1,
  automatic_retry: 0,
  connect_timeout_bounds_ms: Object.freeze({ minimum: 100, maximum: 10_000 }),
  query_timeout_bounds_ms: Object.freeze({ minimum: 100, maximum: 30_000 }),
  transaction_isolation: "REPEATABLE READ",
  transaction_read_only: "REQUIRED",
  expiry_policy: "ABSOLUTE_TIMESTAMP_REQUIRED",
  revocation_semantics: "EXACT_REVISION_FAIL_CLOSED_HISTORICAL_REVISION_RETAINED",
  generic_fallback: "PROHIBITED",
  credential_material_ownership: "FORBIDDEN",
  connection_implementation: 0,
  review_status: "CANDIDATE_FOR_APPROVAL",
  probe_use_state: "NOT_AUTHORIZED",
  qualification_state: "NOT_ESTABLISHED",
  adoption_state: "NOT_ADOPTED",
  runtime_binding_state: "NOT_RUNTIME_BOUND",
  automatic_latest_selection: false,
} as const);

export type FarmOsProductionTargetConnectionAuthority = Readonly<{
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID;
  revision: number;
  approved_target_resource_digest: `sha256:${string}`;
  endpoint_host_binding_digest: `sha256:${string}`;
  database_logical_name: "farmos_core_prod";
  expected_postgres_major: 17;
  database_credential_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID;
  database_credential_authority_revision: number;
  database_credential_broker_authority_id:
    typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID;
  database_credential_broker_authority_revision: number;
  expected_principal_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID;
  expected_principal_authority_revision: number;
  tls_attestation_authority_id: typeof FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID;
  tls_attestation_authority_revision: number;
  collector_authority_id: typeof FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID;
  collector_authority_revision: number;
  maximum_connections: number;
  automatic_retry: number;
  connect_timeout_ms: number;
  query_timeout_ms: number;
  transaction_isolation: "REPEATABLE READ";
  transaction_read_only: "REQUIRED";
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  generic_fallback: "PROHIBITED";
}>;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const KEYS = Object.freeze([
  "activates_at", "approved_target_resource_digest", "authority_id", "automatic_retry",
  "collector_authority_id", "collector_authority_revision",
  "connect_timeout_ms", "database_credential_authority_id",
  "database_credential_authority_revision", "database_credential_broker_authority_id",
  "database_credential_broker_authority_revision", "database_logical_name",
  "endpoint_host_binding_digest", "expected_postgres_major",
  "expected_principal_authority_id", "expected_principal_authority_revision",
  "expires_at", "generic_fallback", "maximum_connections", "query_timeout_ms",
  "revision", "revoked", "tls_attestation_authority_id",
  "tls_attestation_authority_revision", "transaction_isolation",
  "transaction_read_only",
] as const);
const MATERIAL_KEY = /^(?:connection[_-]?string|database[_-]?url|dsn|env(?:ironment)?(?:[_-]?value)?|jwt|password|secret|token)$/iu;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function validateFarmOsProductionTargetConnectionAuthority(
  value: unknown,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    endpoint_host_binding_digest: `sha256:${string}`;
    revision: number;
    now: string;
  }>,
): Readonly<{ accepted: boolean; reason: string }> {
  if (!record(value) || Object.keys(value).some((key) => MATERIAL_KEY.test(key))) {
    return Object.freeze({ accepted: false, reason: "CREDENTIAL_MATERIAL_OR_SCHEMA_REJECTED" });
  }
  const keys = Object.keys(value).sort();
  if (keys.length !== KEYS.length || !keys.every((key, index) => key === KEYS[index])) {
    return Object.freeze({ accepted: false, reason: "AUTHORITY_SCHEMA_INVALID" });
  }
  if (!DIGEST.test(String(value.approved_target_resource_digest)) ||
    value.approved_target_resource_digest !== expected.approved_target_resource_digest ||
    !DIGEST.test(String(value.endpoint_host_binding_digest)) ||
    value.endpoint_host_binding_digest !== expected.endpoint_host_binding_digest) {
    return Object.freeze({ accepted: false, reason: "TARGET_OR_ENDPOINT_BINDING_MISMATCH" });
  }
  if (value.authority_id !== FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID ||
    value.revision !== expected.revision || expected.revision !== 1 ||
    !isFarmOsProductionTargetAuthorityRevision(value.revision)) {
    return Object.freeze({ accepted: false, reason: "UNKNOWN_OR_INVALID_REVISION" });
  }
  if (value.database_logical_name !== "farmos_core_prod" || value.expected_postgres_major !== 17) {
    return Object.freeze({ accepted: false, reason: "DATABASE_OR_POSTGRES_MAJOR_MISMATCH" });
  }
  if (value.database_credential_authority_id !== FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID ||
    value.database_credential_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "DATABASE_CREDENTIAL_AUTHORITY_MISMATCH" });
  }
  if (value.database_credential_broker_authority_id !==
      FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID ||
    value.database_credential_broker_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "DATABASE_CREDENTIAL_BROKER_AUTHORITY_MISMATCH" });
  }
  if (value.expected_principal_authority_id !== FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID ||
    value.expected_principal_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "PRINCIPAL_AUTHORITY_MISMATCH" });
  }
  if (value.tls_attestation_authority_id !== FARM_OS_PRODUCTION_TARGET_POSTGRES_TLS_ATTESTATION_AUTHORITY_ID ||
    value.tls_attestation_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "TLS_AUTHORITY_MISMATCH" });
  }
  if (value.collector_authority_id !== FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID ||
    value.collector_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "COLLECTOR_AUTHORITY_MISMATCH" });
  }
  if (value.maximum_connections !== 1 || value.automatic_retry !== 0) {
    return Object.freeze({ accepted: false, reason: "CONNECTION_OR_RETRY_LIMIT_INVALID" });
  }
  if (!Number.isInteger(value.connect_timeout_ms) || Number(value.connect_timeout_ms) < 100 ||
    Number(value.connect_timeout_ms) > 10_000 || !Number.isInteger(value.query_timeout_ms) ||
    Number(value.query_timeout_ms) < 100 || Number(value.query_timeout_ms) > 30_000) {
    return Object.freeze({ accepted: false, reason: "TIMEOUT_OUT_OF_BOUNDS" });
  }
  if (value.transaction_isolation !== "REPEATABLE READ" ||
    value.transaction_read_only !== "REQUIRED" || value.generic_fallback !== "PROHIBITED") {
    return Object.freeze({ accepted: false, reason: "TRANSACTION_OR_FALLBACK_INVALID" });
  }
  if (evaluateFarmOsProductionTargetAuthorityLifecycle({
    activates_at: String(value.activates_at),
    expires_at: String(value.expires_at),
    revoked: value.revoked as boolean,
  }, expected.now) !== "ACTIVE") {
    return Object.freeze({ accepted: false, reason: "AUTHORITY_REVOKED_OR_EXPIRED" });
  }
  return Object.freeze({ accepted: true, reason: "VALID" });
}

export function resolveFarmOsProductionTargetConnectionAuthorityExact(
  authorities: readonly unknown[],
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    endpoint_host_binding_digest: `sha256:${string}`;
    revision: number;
    now: string;
  }>,
): FarmOsProductionTargetConnectionAuthority | null {
  if (expected.revision !== 1) return null;
  const matches = authorities.filter((candidate) =>
    validateFarmOsProductionTargetConnectionAuthority(candidate, expected).accepted);
  return matches.length === 1 ? matches[0] as FarmOsProductionTargetConnectionAuthority : null;
}
