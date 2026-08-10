import { createHash } from "node:crypto";

import {
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  type FarmOsProductionTargetDatabaseCredentialAuthority,
  validateFarmOsProductionTargetDatabaseCredentialAuthority,
} from "./farm_os_production_target_database_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID,
  FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  type FarmOsProductionTargetProviderCredentialAuthority,
  validateFarmOsProductionTargetProviderCredentialAuthority,
} from "./farm_os_production_target_provider_credential_authority";
import {
  FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MAXIMUM,
  FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MINIMUM,
  evaluateFarmOsProductionTargetAuthorityLifecycle,
  isFarmOsProductionTargetAuthorityRevision,
} from "./farm_os_production_target_authority_lifecycle";

export const FARM_OS_PRODUCTION_TARGET_BROKER_REVISION_MINIMUM =
  FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MINIMUM;
export const FARM_OS_PRODUCTION_TARGET_BROKER_REVISION_MAXIMUM =
  FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MAXIMUM;

export type FarmOsProviderCredentialBrokerAuthority = Readonly<{
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID;
  revision: number;
  supported_credential_class: "SUPABASE_PROJECT_METADATA_READER";
  supported_operation_class: "GET_SINGLE_PROJECT";
  supported_provider_scope: "projects:read";
  access_mode: "READ_ONLY_PROVIDER_METADATA";
  approved_target_resource_digest: `sha256:${string}`;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  fallback: "PROHIBITED";
}>;

export type FarmOsDatabaseCredentialBrokerAuthority = Readonly<{
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID;
  revision: number;
  supported_credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER";
  supported_operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY";
  database_logical_name: "farmos_core_prod";
  expected_principal_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID;
  expected_principal_authority_revision: 1;
  approved_target_resource_digest: `sha256:${string}`;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  fallback: "PROHIBITED";
}>;

declare const PROVIDER_OPAQUE_HANDLE: unique symbol;
declare const DATABASE_OPAQUE_HANDLE: unique symbol;

export type FarmOsProviderOpaqueCredentialHandle = Readonly<{
  handle_class: "PROVIDER_CREDENTIAL_HANDLE";
  handle_reference_digest: `sha256:${string}`;
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID;
  broker_authority_revision: number;
  credential_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID;
  credential_authority_revision: number;
  credential_class: "SUPABASE_PROJECT_METADATA_READER";
  approved_target_resource_digest: `sha256:${string}`;
  operation_class: "GET_SINGLE_PROJECT";
  provider_scope: "projects:read";
  request_binding_digest: `sha256:${string}`;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  [PROVIDER_OPAQUE_HANDLE]: "PROVIDER_NON_MATERIAL_CAPABILITY_REFERENCE";
}>;

export type FarmOsDatabaseOpaqueCredentialHandle = Readonly<{
  handle_class: "DATABASE_CREDENTIAL_HANDLE";
  handle_reference_digest: `sha256:${string}`;
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID;
  broker_authority_revision: number;
  credential_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID;
  credential_authority_revision: number;
  credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER";
  approved_target_resource_digest: `sha256:${string}`;
  operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY";
  database_logical_name: "farmos_core_prod";
  expected_principal_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID;
  expected_principal_authority_revision: 1;
  request_binding_digest: `sha256:${string}`;
  activates_at: string;
  expires_at: string;
  revoked: boolean;
  [DATABASE_OPAQUE_HANDLE]: "DATABASE_NON_MATERIAL_CAPABILITY_REFERENCE";
}>;

export type FarmOsOpaqueCredentialHandle =
  | FarmOsProviderOpaqueCredentialHandle
  | FarmOsDatabaseOpaqueCredentialHandle;

export type FarmOsProviderCredentialBrokerRequest = Readonly<{
  request_domain: "PROVIDER_CREDENTIAL_BROKER_REQUEST";
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID;
  broker_authority_revision: number;
  credential_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID;
  credential_authority_revision: number;
  credential_class: "SUPABASE_PROJECT_METADATA_READER";
  approved_target_resource_digest: `sha256:${string}`;
  access_mode: "READ_ONLY_PROVIDER_METADATA";
  operation_class: "GET_SINGLE_PROJECT";
  provider_scope: "projects:read";
  opaque_request_context_digest: `sha256:${string}`;
}>;

export type FarmOsDatabaseCredentialBrokerRequest = Readonly<{
  request_domain: "DATABASE_CREDENTIAL_BROKER_REQUEST";
  broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID;
  broker_authority_revision: number;
  credential_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID;
  credential_authority_revision: number;
  credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER";
  approved_target_resource_digest: `sha256:${string}`;
  operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY";
  database_logical_name: "farmos_core_prod";
  expected_principal_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID;
  expected_principal_authority_revision: 1;
  opaque_request_context_digest: `sha256:${string}`;
}>;

export interface FarmOsProviderCredentialBrokerPort {
  acquireOpaqueCredentialHandle(
    request: FarmOsProviderCredentialBrokerRequest,
  ): Promise<FarmOsProviderOpaqueCredentialHandle | null>;
}

export interface FarmOsDatabaseCredentialBrokerPort {
  acquireOpaqueCredentialHandle(
    request: FarmOsDatabaseCredentialBrokerRequest,
  ): Promise<FarmOsDatabaseOpaqueCredentialHandle | null>;
}

export const FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_POLICY = Object.freeze({
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
  revision: 1,
  supported_credential_class: "SUPABASE_PROJECT_METADATA_READER",
  supported_operation_class: "GET_SINGLE_PROJECT",
  supported_provider_scope: "projects:read",
  access_mode: "READ_ONLY_PROVIDER_METADATA",
  target_scope: "EXACT_APPROVED_TARGET_RESOURCE_DIGEST",
  revocation_expiry_policy: "CREDENTIAL_HANDLE_AND_BROKER_EXACT_REVISIONS_MUST_ALL_BE_ACTIVE",
  fallback_broker: "PROHIBITED",
  fallback_revision: "PROHIBITED",
  automatic_latest_selection: false,
  missing_broker_result: "FAIL_CLOSED",
  same_revision_mutation: "FORBIDDEN",
  policy_change_semantics: "NEW_REVISION_REQUIRED",
  historical_revoked_revisions: "PRESERVED",
  implementation_count: 0,
  handle_request_correlation: "ESTABLISHED_BY_CONTRACT",
  handle_durable_single_use: "NOT_ESTABLISHED",
} as const);

export const FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_POLICY = Object.freeze({
  broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
  revision: 1,
  supported_credential_class: "POSTGRES_PRODUCTION_TARGET_VERIFY_READER",
  supported_operation_class: "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY",
  database_logical_name: "farmos_core_prod",
  expected_principal_authority_id: FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID,
  expected_principal_authority_revision: 1,
  target_scope: "EXACT_APPROVED_TARGET_RESOURCE_DIGEST",
  revocation_expiry_policy: "CREDENTIAL_HANDLE_AND_BROKER_EXACT_REVISIONS_MUST_ALL_BE_ACTIVE",
  fallback_broker: "PROHIBITED",
  fallback_revision: "PROHIBITED",
  automatic_latest_selection: false,
  missing_broker_result: "FAIL_CLOSED",
  same_revision_mutation: "FORBIDDEN",
  policy_change_semantics: "NEW_REVISION_REQUIRED",
  historical_revoked_revisions: "PRESERVED",
  implementation_count: 0,
  handle_request_correlation: "ESTABLISHED_BY_CONTRACT",
  handle_durable_single_use: "NOT_ESTABLISHED",
} as const);

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const PROVIDER_AUTHORITY_KEYS = Object.freeze([
  "access_mode", "activates_at", "approved_target_resource_digest", "broker_authority_id", "expires_at",
  "fallback", "revision", "revoked", "supported_credential_class",
  "supported_operation_class", "supported_provider_scope",
] as const);
const DATABASE_AUTHORITY_KEYS = Object.freeze([
  "activates_at", "approved_target_resource_digest", "broker_authority_id", "database_logical_name",
  "expected_principal_authority_id", "expected_principal_authority_revision", "expires_at",
  "fallback", "revision", "revoked", "supported_credential_class",
  "supported_operation_class",
] as const);
const PROVIDER_HANDLE_KEYS = Object.freeze([
  "activates_at", "approved_target_resource_digest", "broker_authority_id", "broker_authority_revision",
  "credential_authority_id", "credential_authority_revision", "credential_class",
  "expires_at", "handle_class", "handle_reference_digest", "operation_class",
  "provider_scope", "request_binding_digest", "revoked",
] as const);
const DATABASE_HANDLE_KEYS = Object.freeze([
  "activates_at", "approved_target_resource_digest", "broker_authority_id", "broker_authority_revision",
  "credential_authority_id", "credential_authority_revision", "credential_class",
  "database_logical_name", "expected_principal_authority_id",
  "expected_principal_authority_revision", "expires_at", "handle_class",
  "handle_reference_digest", "operation_class", "request_binding_digest", "revoked",
] as const);
const PROVIDER_REQUEST_KEYS = Object.freeze([
  "access_mode", "approved_target_resource_digest", "broker_authority_id",
  "broker_authority_revision", "credential_authority_id", "credential_authority_revision",
  "credential_class", "opaque_request_context_digest", "operation_class", "provider_scope",
  "request_domain",
] as const);
const DATABASE_REQUEST_KEYS = Object.freeze([
  "approved_target_resource_digest", "broker_authority_id", "broker_authority_revision",
  "credential_authority_id", "credential_authority_revision", "credential_class",
  "database_logical_name", "expected_principal_authority_id",
  "expected_principal_authority_revision", "opaque_request_context_digest", "operation_class",
  "request_domain",
] as const);

function exactRecord(value: unknown, keys: readonly string[]): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const actual = Object.keys(value).sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function validRevision(value: unknown): value is number {
  return isFarmOsProductionTargetAuthorityRevision(value);
}

function active(
  activatesAt: unknown,
  expiresAt: unknown,
  revoked: unknown,
  now: string,
): boolean {
  return evaluateFarmOsProductionTargetAuthorityLifecycle({
    activates_at: String(activatesAt),
    expires_at: String(expiresAt),
    revoked: revoked as boolean,
  }, now) === "ACTIVE";
}

function sha256Canonical(fields: readonly unknown[]): `sha256:${string}` {
  return `sha256:${createHash("sha256").update(JSON.stringify(fields), "utf8").digest("hex")}`;
}

export function deriveFarmOsProviderCredentialBrokerRequestBinding(
  input: unknown,
): `sha256:${string}` | null {
  if (!exactRecord(input, PROVIDER_REQUEST_KEYS) ||
    input.request_domain !== "PROVIDER_CREDENTIAL_BROKER_REQUEST" ||
    input.broker_authority_id !== FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID ||
    input.broker_authority_revision !== 1 ||
    input.credential_authority_id !== FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_AUTHORITY_ID ||
    input.credential_authority_revision !== 1 ||
    input.credential_class !== "SUPABASE_PROJECT_METADATA_READER" ||
    !DIGEST.test(String(input.approved_target_resource_digest)) ||
    input.access_mode !== "READ_ONLY_PROVIDER_METADATA" ||
    input.operation_class !== "GET_SINGLE_PROJECT" || input.provider_scope !== "projects:read" ||
    !DIGEST.test(String(input.opaque_request_context_digest))) return null;
  return sha256Canonical([
    "farmos.production-target-provider-credential-broker-request-binding.v1",
    input.request_domain, input.broker_authority_id, input.broker_authority_revision,
    input.credential_authority_id, input.credential_authority_revision, input.credential_class,
    input.approved_target_resource_digest, input.access_mode, input.operation_class,
    input.provider_scope, input.opaque_request_context_digest,
  ]);
}

export function deriveFarmOsDatabaseCredentialBrokerRequestBinding(
  input: unknown,
): `sha256:${string}` | null {
  if (!exactRecord(input, DATABASE_REQUEST_KEYS) ||
    input.request_domain !== "DATABASE_CREDENTIAL_BROKER_REQUEST" ||
    input.broker_authority_id !== FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID ||
    input.broker_authority_revision !== 1 ||
    input.credential_authority_id !== FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_AUTHORITY_ID ||
    input.credential_authority_revision !== 1 ||
    input.credential_class !== "POSTGRES_PRODUCTION_TARGET_VERIFY_READER" ||
    !DIGEST.test(String(input.approved_target_resource_digest)) ||
    input.operation_class !== "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY" ||
    input.database_logical_name !== "farmos_core_prod" ||
    input.expected_principal_authority_id !== FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID ||
    input.expected_principal_authority_revision !== 1 ||
    !DIGEST.test(String(input.opaque_request_context_digest))) return null;
  return sha256Canonical([
    "farmos.production-target-database-credential-broker-request-binding.v1",
    input.request_domain, input.broker_authority_id, input.broker_authority_revision,
    input.credential_authority_id, input.credential_authority_revision, input.credential_class,
    input.approved_target_resource_digest, input.operation_class, input.database_logical_name,
    input.expected_principal_authority_id, input.expected_principal_authority_revision,
    input.opaque_request_context_digest,
  ]);
}

export function validateFarmOsProviderCredentialBrokerAuthority(
  input: unknown,
  expected: Readonly<{
    broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID;
    revision: number;
    approved_target_resource_digest: `sha256:${string}`;
    now: string;
  }>,
): boolean {
  if (!exactRecord(input, PROVIDER_AUTHORITY_KEYS) || !validRevision(input.revision) ||
    expected.revision !== 1 || input.revision !== expected.revision) return false;
  return input.broker_authority_id === expected.broker_authority_id &&
    input.broker_authority_id === FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID &&
    input.supported_credential_class === "SUPABASE_PROJECT_METADATA_READER" &&
    input.supported_operation_class === "GET_SINGLE_PROJECT" &&
    input.supported_provider_scope === "projects:read" &&
    input.access_mode === "READ_ONLY_PROVIDER_METADATA" &&
    DIGEST.test(String(input.approved_target_resource_digest)) &&
    input.approved_target_resource_digest === expected.approved_target_resource_digest &&
    input.fallback === "PROHIBITED" &&
    active(input.activates_at, input.expires_at, input.revoked, expected.now);
}

export function validateFarmOsDatabaseCredentialBrokerAuthority(
  input: unknown,
  expected: Readonly<{
    broker_authority_id: typeof FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID;
    revision: number;
    approved_target_resource_digest: `sha256:${string}`;
    now: string;
  }>,
): boolean {
  if (!exactRecord(input, DATABASE_AUTHORITY_KEYS) || !validRevision(input.revision) ||
    expected.revision !== 1 || input.revision !== expected.revision) return false;
  return input.broker_authority_id === expected.broker_authority_id &&
    input.broker_authority_id === FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID &&
    input.supported_credential_class === "POSTGRES_PRODUCTION_TARGET_VERIFY_READER" &&
    input.supported_operation_class === "BOUNDED_CAPABILITY_IDENTITY_READ_ONLY" &&
    input.database_logical_name === "farmos_core_prod" &&
    input.expected_principal_authority_id === FARM_OS_PRODUCTION_TARGET_PRINCIPAL_CAPABILITY_AUTHORITY_ID &&
    input.expected_principal_authority_revision === 1 &&
    DIGEST.test(String(input.approved_target_resource_digest)) &&
    input.approved_target_resource_digest === expected.approved_target_resource_digest &&
    input.fallback === "PROHIBITED" &&
    active(input.activates_at, input.expires_at, input.revoked, expected.now);
}

export function resolveFarmOsProviderCredentialBrokerAuthorityExact(
  authorities: readonly unknown[],
  expected: Parameters<typeof validateFarmOsProviderCredentialBrokerAuthority>[1],
): FarmOsProviderCredentialBrokerAuthority | null {
  if (!validRevision(expected.revision) || expected.revision !== 1) return null;
  const matches = authorities.filter((authority) =>
    validateFarmOsProviderCredentialBrokerAuthority(authority, expected));
  return matches.length === 1 ? matches[0] as FarmOsProviderCredentialBrokerAuthority : null;
}

export function resolveFarmOsDatabaseCredentialBrokerAuthorityExact(
  authorities: readonly unknown[],
  expected: Parameters<typeof validateFarmOsDatabaseCredentialBrokerAuthority>[1],
): FarmOsDatabaseCredentialBrokerAuthority | null {
  if (!validRevision(expected.revision) || expected.revision !== 1) return null;
  const matches = authorities.filter((authority) =>
    validateFarmOsDatabaseCredentialBrokerAuthority(authority, expected));
  return matches.length === 1 ? matches[0] as FarmOsDatabaseCredentialBrokerAuthority : null;
}

export function validateFarmOsProviderOpaqueCredentialHandle(
  input: unknown,
  request: FarmOsProviderCredentialBrokerRequest,
  brokerAuthority: FarmOsProviderCredentialBrokerAuthority,
  credentialAuthority: FarmOsProductionTargetProviderCredentialAuthority,
  now: string,
): boolean {
  const requestBinding = deriveFarmOsProviderCredentialBrokerRequestBinding(request);
  const expectedBroker = {
    broker_authority_id: FARM_OS_PRODUCTION_TARGET_PROVIDER_CREDENTIAL_BROKER_AUTHORITY_ID,
    revision: brokerAuthority.revision,
    approved_target_resource_digest: brokerAuthority.approved_target_resource_digest,
    now,
  } as const;
  if (!validateFarmOsProviderCredentialBrokerAuthority(brokerAuthority, expectedBroker) ||
    !validateFarmOsProductionTargetProviderCredentialAuthority(credentialAuthority, {
      approved_target_resource_digest: brokerAuthority.approved_target_resource_digest,
      revision: credentialAuthority.revision,
      now,
    }).accepted || requestBinding === null || !exactRecord(input, PROVIDER_HANDLE_KEYS)) return false;
  return input.handle_class === "PROVIDER_CREDENTIAL_HANDLE" &&
    DIGEST.test(String(input.handle_reference_digest)) &&
    request.broker_authority_id === brokerAuthority.broker_authority_id &&
    request.broker_authority_revision === brokerAuthority.revision &&
    request.credential_authority_id === credentialAuthority.authority_id &&
    request.credential_authority_revision === credentialAuthority.revision &&
    request.approved_target_resource_digest === brokerAuthority.approved_target_resource_digest &&
    request.credential_class === brokerAuthority.supported_credential_class &&
    request.operation_class === brokerAuthority.supported_operation_class &&
    request.provider_scope === brokerAuthority.supported_provider_scope &&
    input.broker_authority_id === brokerAuthority.broker_authority_id &&
    input.broker_authority_revision === brokerAuthority.revision &&
    input.credential_authority_id === credentialAuthority.authority_id &&
    input.credential_authority_revision === credentialAuthority.revision &&
    input.credential_class === brokerAuthority.supported_credential_class &&
    input.credential_class === credentialAuthority.credential_class &&
    input.approved_target_resource_digest === brokerAuthority.approved_target_resource_digest &&
    input.approved_target_resource_digest === credentialAuthority.approved_target_resource_digest &&
    input.operation_class === brokerAuthority.supported_operation_class &&
    input.operation_class === credentialAuthority.allowed_endpoint_class &&
    input.provider_scope === brokerAuthority.supported_provider_scope &&
    input.provider_scope === credentialAuthority.allowed_provider_scope &&
    input.request_binding_digest === requestBinding &&
    credentialAuthority.maximum_calls === 1 && credentialAuthority.fallback === "PROHIBITED" &&
    active(input.activates_at, input.expires_at, input.revoked, now);
}

export function validateFarmOsDatabaseOpaqueCredentialHandle(
  input: unknown,
  request: FarmOsDatabaseCredentialBrokerRequest,
  brokerAuthority: FarmOsDatabaseCredentialBrokerAuthority,
  credentialAuthority: FarmOsProductionTargetDatabaseCredentialAuthority,
  now: string,
): boolean {
  const requestBinding = deriveFarmOsDatabaseCredentialBrokerRequestBinding(request);
  const expectedBroker = {
    broker_authority_id: FARM_OS_PRODUCTION_TARGET_DATABASE_CREDENTIAL_BROKER_AUTHORITY_ID,
    revision: brokerAuthority.revision,
    approved_target_resource_digest: brokerAuthority.approved_target_resource_digest,
    now,
  } as const;
  if (!validateFarmOsDatabaseCredentialBrokerAuthority(brokerAuthority, expectedBroker) ||
    !validateFarmOsProductionTargetDatabaseCredentialAuthority(credentialAuthority, {
      approved_target_resource_digest: brokerAuthority.approved_target_resource_digest,
      revision: credentialAuthority.revision,
      now,
    }).accepted || requestBinding === null || !exactRecord(input, DATABASE_HANDLE_KEYS)) return false;
  return input.handle_class === "DATABASE_CREDENTIAL_HANDLE" &&
    DIGEST.test(String(input.handle_reference_digest)) &&
    request.broker_authority_id === brokerAuthority.broker_authority_id &&
    request.broker_authority_revision === brokerAuthority.revision &&
    request.credential_authority_id === credentialAuthority.authority_id &&
    request.credential_authority_revision === credentialAuthority.revision &&
    request.approved_target_resource_digest === brokerAuthority.approved_target_resource_digest &&
    request.credential_class === brokerAuthority.supported_credential_class &&
    request.operation_class === brokerAuthority.supported_operation_class &&
    request.database_logical_name === brokerAuthority.database_logical_name &&
    request.expected_principal_authority_id === brokerAuthority.expected_principal_authority_id &&
    request.expected_principal_authority_revision === brokerAuthority.expected_principal_authority_revision &&
    input.broker_authority_id === brokerAuthority.broker_authority_id &&
    input.broker_authority_revision === brokerAuthority.revision &&
    input.credential_authority_id === credentialAuthority.authority_id &&
    input.credential_authority_revision === credentialAuthority.revision &&
    input.credential_class === brokerAuthority.supported_credential_class &&
    input.credential_class === credentialAuthority.credential_class &&
    input.approved_target_resource_digest === brokerAuthority.approved_target_resource_digest &&
    input.approved_target_resource_digest === credentialAuthority.approved_target_resource_digest &&
    input.operation_class === brokerAuthority.supported_operation_class &&
    input.operation_class === credentialAuthority.allowed_operation_class &&
    input.database_logical_name === brokerAuthority.database_logical_name &&
    input.database_logical_name === credentialAuthority.database_logical_name &&
    input.expected_principal_authority_id === brokerAuthority.expected_principal_authority_id &&
    input.expected_principal_authority_id === credentialAuthority.expected_principal_authority_id &&
    input.expected_principal_authority_revision === brokerAuthority.expected_principal_authority_revision &&
    input.expected_principal_authority_revision === credentialAuthority.expected_principal_authority_revision &&
    input.request_binding_digest === requestBinding &&
    credentialAuthority.maximum_connections === 1 && credentialAuthority.fallback === "PROHIBITED" &&
    active(input.activates_at, input.expires_at, input.revoked, now);
}

export const FARM_OS_PRODUCTION_TARGET_ACCESS_AUTHORITY_SOURCE_STATE = Object.freeze({
  contracts: "DEFINED",
  actual_broker_implementation: "NONE",
  actual_credentials: "UNRESOLVED",
  actual_credential_material: "NONE",
  actual_connection: "UNRESOLVED",
  actual_tls: "UNATTESTED",
  actual_principal: "UNATTESTED",
  actual_collector: "NONE",
  collector_production_callable: false,
  handle_request_correlation: "ESTABLISHED_BY_CONTRACT",
  handle_durable_single_use: "NOT_ESTABLISHED",
  handle_atomic_redemption: "NOT_ESTABLISHED",
  handle_restart_replay_prevention: "NOT_ESTABLISHED",
  handle_cross_process_consumption: "NOT_ESTABLISHED",
  actual_provider_feasibility: "NOT_ESTABLISHED",
  actual_database_feasibility: "NOT_ESTABLISHED",
  external_capability_probe: "HOLD_EXTERNAL_CAPABILITY_PROBE",
  probe_use_state: "NOT_AUTHORIZED",
  probe_authorized: false,
  qualification_state: "NOT_ESTABLISHED",
  adoption_state: "NOT_ADOPTED",
  gate2: "NOT_AUTHORIZED",
  runtime: "NOT_BOUND",
  production_access: "NOT_AUTHORIZED",
  external_call_count: 0,
  database_connection_count: 0,
  credential_material_count: 0,
  phase_c_artifact_count: 0,
} as const);
