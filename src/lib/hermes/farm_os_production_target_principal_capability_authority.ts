import {
  FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  validateFarmOsProductionTargetCollectorAuthority,
  type FarmOsProductionTargetCollectorAuthority,
} from "./farm_os_production_target_collector_authority";
import {
  evaluateFarmOsProductionTargetAuthorityLifecycle,
} from "./farm_os_production_target_authority_lifecycle";

export const FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID =
  "farmos.production-target-principal-capability-authority.v1" as const;
const FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID =
  "farmos.production-target-connection-authority.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_APPROVED_NARROW_EXECUTE_ROLE =
  "farmos_production_target_verify_execute" as const;

export const FARM_OS_FUNCTION_EXECUTE_PROVENANCE = Object.freeze([
  "DIRECT_DEDICATED_PRINCIPAL", "APPROVED_NARROW_ROLE", "PUBLIC",
  "UNAPPROVED_BROAD_ROLE", "MIXED_OR_AMBIGUOUS", "NOT_AVAILABLE",
] as const);
export type FarmOsFunctionExecuteProvenance =
  typeof FARM_OS_FUNCTION_EXECUTE_PROVENANCE[number];

export const FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_POLICY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  revision: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_REVISION,
  principal_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  required_attributes: Object.freeze({
    superuser: false, createdb: false, createrole: false,
    replication: false, bypassrls: false,
  }),
  prohibited_broad_roles: Object.freeze([
    "pg_monitor", "pg_read_all_data", "pg_write_all_data",
  ] as const),
  approved_narrow_role_mode: "EXPLICIT_EXACT_ROLE_ONLY",
  approved_narrow_execute_role: FARM_OS_PRODUCTION_TARGET_APPROVED_NARROW_EXECUTE_ROLE,
  acceptable_execute_provenance: Object.freeze([
    "DIRECT_DEDICATED_PRINCIPAL", "APPROVED_NARROW_ROLE",
  ] as const),
  execute_grantable_required: false,
  current_user_session_user_attestation: "BOTH_MUST_MATCH_EXPECTED_DEDICATED_PRINCIPAL",
  connection_authority_id: FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID,
  connection_authority_revision: 1,
  trusted_collector_authority_id: FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID,
  trusted_collector_authority_revision: 1,
  actual_principal_state: "NOT_ESTABLISHED",
  database_inspection_implementation: 0,
  review_status: "CANDIDATE_FOR_APPROVAL",
  probe_use_state: "NOT_AUTHORIZED",
  qualification_state: "NOT_ESTABLISHED",
  adoption_state: "NOT_ADOPTED",
  runtime_binding_state: "NOT_RUNTIME_BOUND",
} as const);

export type FarmOsPrincipalCapabilityAttestation = Readonly<{
  principal_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER";
  attributes: Readonly<{
    superuser: boolean; createdb: boolean; createrole: boolean;
    replication: boolean; bypassrls: boolean;
  }>;
  role_memberships: readonly string[];
  approved_narrow_role: string | null;
  current_user_matches_expected: boolean;
  session_user_matches_expected: boolean;
  current_user_equals_session_user: boolean;
  has_function_privilege: boolean;
  execute_provenance: FarmOsFunctionExecuteProvenance;
  execute_grantable: boolean;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  approved_target_resource_digest: `sha256:${string}`;
  collector_authority_id: typeof FARM_OS_PRODUCTION_TARGET_COLLECTOR_AUTHORITY_ID;
  collector_authority_revision: 1;
  connection_authority_id: typeof FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID;
  connection_authority_revision: number;
}>;

export function evaluateFarmOsProductionTargetPrincipalCapability(
  input: unknown,
  collectorAuthority: FarmOsProductionTargetCollectorAuthority,
  expected: Readonly<{
    approved_target_resource_digest: `sha256:${string}`;
    now: string;
  }>,
): Readonly<{ accepted: boolean; reason: string }> {
  if (!validateFarmOsProductionTargetCollectorAuthority(collectorAuthority, {
    approved_target_resource_digest: expected.approved_target_resource_digest,
    revision: collectorAuthority.revision,
    now: expected.now,
  })) {
    return Object.freeze({ accepted: false, reason: "COLLECTOR_AUTHORITY_INACTIVE_OR_MISMATCH" });
  }
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return Object.freeze({ accepted: false, reason: "ATTESTATION_SCHEMA_INVALID" });
  }
  const value = input as Record<string, unknown>;
  const keys = Object.keys(value).sort();
  const expectedKeys = [
    "activates_at", "approved_narrow_role", "approved_target_resource_digest", "attributes",
    "collector_authority_id", "collector_authority_revision", "connection_authority_id",
    "connection_authority_revision", "current_user_equals_session_user",
    "current_user_matches_expected", "execute_grantable", "execute_provenance",
    "expires_at", "has_function_privilege", "principal_class", "revoked", "role_memberships",
    "session_user_matches_expected",
  ];
  if (keys.length !== expectedKeys.length ||
    !keys.every((key, index) => key === expectedKeys[index]) ||
    typeof value.attributes !== "object" || value.attributes === null ||
    Array.isArray(value.attributes) || !Array.isArray(value.role_memberships)) {
    return Object.freeze({ accepted: false, reason: "ATTESTATION_SCHEMA_INVALID" });
  }
  const attributes = value.attributes as Record<string, unknown>;
  const attributeKeys = Object.keys(attributes).sort();
  const requiredAttributeKeys = ["bypassrls", "createdb", "createrole", "replication", "superuser"];
  if (attributeKeys.length !== requiredAttributeKeys.length ||
    !attributeKeys.every((key, index) => key === requiredAttributeKeys[index]) ||
    Object.values(attributes).some((attribute) => attribute !== false) ||
    !value.role_memberships.every((role) => typeof role === "string")) {
    return Object.freeze({ accepted: false, reason: "BROAD_PRINCIPAL_ATTRIBUTE_REJECTED" });
  }
  if (value.principal_class !== "POSTGRES_PRODUCTION_TARGET_VERIFY_READER" ||
    value.approved_target_resource_digest !== expected.approved_target_resource_digest ||
    value.collector_authority_id !== collectorAuthority.authority_id ||
    value.collector_authority_revision !== collectorAuthority.revision ||
    value.connection_authority_id !== FARM_OS_PRODUCTION_TARGET_CONNECTION_AUTHORITY_ID ||
    value.connection_authority_revision !== 1) {
    return Object.freeze({ accepted: false, reason: "PRINCIPAL_OR_CONNECTION_BINDING_MISMATCH" });
  }
  if (evaluateFarmOsProductionTargetAuthorityLifecycle({
    activates_at: String(value.activates_at),
    expires_at: String(value.expires_at),
    revoked: value.revoked as boolean,
  }, expected.now) !== "ACTIVE") {
    return Object.freeze({ accepted: false, reason: "PRINCIPAL_ATTESTATION_LIFECYCLE_INVALID" });
  }
  if (value.role_memberships.some((role) =>
    FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_POLICY.prohibited_broad_roles
      .includes(role as never))) {
    return Object.freeze({ accepted: false, reason: "BROAD_ROLE_REJECTED" });
  }
  if (!value.current_user_matches_expected || !value.session_user_matches_expected ||
    !value.current_user_equals_session_user) {
    return Object.freeze({ accepted: false, reason: "SESSION_PRINCIPAL_UNATTESTED" });
  }
  if (!value.has_function_privilege) {
    return Object.freeze({ accepted: false, reason: "FUNCTION_EXECUTE_NOT_AVAILABLE" });
  }
  if (value.execute_grantable) {
    return Object.freeze({ accepted: false, reason: "GRANTABLE_EXECUTE_REJECTED" });
  }
  if (value.execute_provenance === "DIRECT_DEDICATED_PRINCIPAL") {
    return value.approved_narrow_role === null && value.role_memberships.length === 0
      ? Object.freeze({ accepted: true, reason: "VALID" })
      : Object.freeze({ accepted: false, reason: "MIXED_OR_AMBIGUOUS_PROVENANCE" });
  }
  if (value.execute_provenance === "APPROVED_NARROW_ROLE") {
    const role = value.approved_narrow_role;
    return role === FARM_OS_PRODUCTION_TARGET_APPROVED_NARROW_EXECUTE_ROLE &&
      value.role_memberships.length === 1 && value.role_memberships[0] === role
      ? Object.freeze({ accepted: true, reason: "VALID" })
      : Object.freeze({ accepted: false, reason: "NARROW_ROLE_PROVENANCE_UNPROVEN" });
  }
  return Object.freeze({ accepted: false, reason: "EXECUTE_PROVENANCE_REJECTED" });
}
