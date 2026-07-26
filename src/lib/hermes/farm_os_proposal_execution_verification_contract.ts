import {
  canonicalFarmOsJson,
  hasExactFarmOsKeys,
  isCanonicalFarmOsIso,
  isFarmOsDigest,
  isFarmOsIdentifier,
  isFarmOsRecord,
} from "./farm_os_approved_proposal_contract";

export const FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION =
  "farmos.proposal-execution-verification.v1" as const;
export const FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE =
  "farming-app.execution-gateway" as const;
export const FARM_OS_PROPOSAL_VERIFICATION_ISSUER =
  "farmos-core-trusted-workloads" as const;
export const FARM_OS_PROPOSAL_VERIFICATION_SUBJECT =
  "farming-app-execution-gateway" as const;
export const FARM_OS_PROPOSAL_VERIFICATION_MAX_TTL_MS = 60_000;
export const FARM_OS_PROPOSAL_AUTHORITY_TIMEOUT_MS = 100;

export type ProposalExecutionVerificationDecision =
  | "allowed"
  | "rejected"
  | "unavailable";

export const FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_REJECTION_CODES = [
  "PROPOSAL_NOT_FOUND",
  "PROPOSAL_NOT_EXECUTABLE",
  "PROPOSAL_REJECTED",
  "PROPOSAL_EXPIRED",
  "PROPOSAL_SUPERSEDED",
  "PROPOSAL_VERSION_MISMATCH",
  "PROPOSAL_SNAPSHOT_MISMATCH",
  "OPERATION_TYPE_MISMATCH",
  "TARGET_SYSTEM_MISMATCH",
  "TARGET_REFERENCE_MISMATCH",
  "CAPABILITY_MISMATCH",
  "SCOPE_MISMATCH",
  "CORRELATION_MISMATCH",
  "CAUSATION_MISMATCH",
  "AUDIENCE_MISMATCH",
  "FINGERPRINT_INVALID",
  "CONTRACT_VERSION_MISMATCH",
  "REQUEST_INVALID",
  "WORKLOAD_AUTHENTICATION_FAILED",
  "WORKLOAD_AUTHORITY_UNAVAILABLE",
  "CLOCK_UNAVAILABLE",
  "PROPOSAL_AUTHORITY_UNAVAILABLE",
  "PROPOSAL_AUTHORITY_UNKNOWN",
] as const;
export type ProposalExecutionVerificationRejectionCode =
  (typeof FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_REJECTION_CODES)[number];

export type ProposalExecutionScope = {
  scope_type: "exact_target";
  scope_id: string;
  target_reference: string;
};

export type ProposalExecutionVerificationRequest = {
  contract_version: typeof FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION;
  verification_id: string;
  operation_id: string;
  proposal_id: string;
  proposal_version: number;
  proposal_snapshot_hash: string;
  operation_type: string;
  target_system: string;
  target_reference: string;
  requested_capability: string;
  requested_scope: ProposalExecutionScope;
  fingerprint: string;
  audience: typeof FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE;
  correlation_id: string;
  causation_id: string;
  requested_at: string;
};

export type ProposalExecutionState = {
  proposal_id: string;
  proposal_version: number;
  proposal_snapshot_hash: string;
  proposal_status:
    | "executable"
    | "draft"
    | "rejected"
    | "expired"
    | "superseded";
  operation_type: string;
  target_system: string;
  target_reference: string;
  required_capability: string;
  scope_constraints: ProposalExecutionScope;
  correlation_id: string;
  causation_id: string;
  proposal_expires_at: string;
  repository_state_version: string | number;
};

export type ProposalExecutionVerificationTrace = {
  authority_source: "proposal_execution_repository";
  authentication_source: "workload_identity_port";
  deterministic_verifier: true;
  human_approval_evaluated: false;
  runtime_advisory_used_as_authority: false;
  repository_result: "found" | "not_found" | "unavailable" | "unknown" | "invalid";
  scope_match: boolean | null;
};

export type ProposalExecutionVerificationResult = {
  contract_version: typeof FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION;
  verification_id: string;
  operation_id: string;
  decision: ProposalExecutionVerificationDecision;
  rejection_code: ProposalExecutionVerificationRejectionCode | null;
  proposal_id: string;
  proposal_version: number;
  proposal_snapshot_hash: string;
  proposal_status: ProposalExecutionState["proposal_status"] | "unknown";
  operation_type: string;
  target_system: string;
  target_reference: string;
  required_capability: string;
  scope_constraints: ProposalExecutionScope | null;
  fingerprint: string;
  audience: typeof FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE;
  correlation_id: string;
  causation_id: string;
  verified_at: string;
  verification_expires_at: string;
  repository_state_version: string | number | null;
  trace: ProposalExecutionVerificationTrace;
};

export type ProposalExecutionVerificationAudit = {
  verification_id: string;
  operation_id: string;
  proposal_id: string;
  proposal_version: number;
  proposal_snapshot_hash: string;
  decision: ProposalExecutionVerificationDecision;
  rejection_code: ProposalExecutionVerificationRejectionCode | null;
  operation_type: string;
  target_system: string;
  target_reference: string;
  requested_capability: string;
  scope_decision: "matched" | "mismatched" | "not_evaluated";
  audience: typeof FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE;
  fingerprint_reference: string;
  correlation_id: string;
  causation_id: string;
  repository_state_version: string | number | null;
  verified_at: string;
  verification_expires_at: string;
  business_write_performed: false;
  external_side_effect_performed: false;
};

export type ProposalExecutionRepositoryResult =
  | { kind: "found"; state: ProposalExecutionState }
  | { kind: "not_found" }
  | { kind: "unavailable"; reason: string }
  | { kind: "unknown"; reason: string };

export interface ProposalExecutionVerificationRepositoryPort {
  getCurrentProposalExecutionState(
    proposalId: string,
  ): Promise<ProposalExecutionRepositoryResult>;
}

export type WorkloadIdentityEvidence = {
  issuer: typeof FARM_OS_PROPOSAL_VERIFICATION_ISSUER;
  audience: typeof FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE;
  subject: typeof FARM_OS_PROPOSAL_VERIFICATION_SUBJECT;
  token_kind: "workload";
  signing_algorithm: "ES256" | "EdDSA";
  issued_at: string;
  expires_at: string;
};

export type WorkloadAuthenticationResult =
  | { kind: "authenticated"; evidence: WorkloadIdentityEvidence }
  | { kind: "rejected"; reason: string }
  | { kind: "unavailable"; reason: string };

export interface ProposalVerificationAuthenticationPort {
  authenticate(): Promise<WorkloadAuthenticationResult>;
}

export interface ProposalVerificationClockPort {
  now(): Promise<string>;
}

export type ProposalExecutionVerificationPorts = {
  repository: ProposalExecutionVerificationRepositoryPort;
  authentication: ProposalVerificationAuthenticationPort;
  clock: ProposalVerificationClockPort;
};

export type ProposalExecutionVerificationEnvelope = {
  result: ProposalExecutionVerificationResult;
  audit: ProposalExecutionVerificationAudit;
};

const REQUEST_KEYS = [
  "contract_version",
  "verification_id",
  "operation_id",
  "proposal_id",
  "proposal_version",
  "proposal_snapshot_hash",
  "operation_type",
  "target_system",
  "target_reference",
  "requested_capability",
  "requested_scope",
  "fingerprint",
  "audience",
  "correlation_id",
  "causation_id",
  "requested_at",
] as const;
const SCOPE_KEYS = ["scope_type", "scope_id", "target_reference"] as const;
const STATE_KEYS = [
  "proposal_id",
  "proposal_version",
  "proposal_snapshot_hash",
  "proposal_status",
  "operation_type",
  "target_system",
  "target_reference",
  "required_capability",
  "scope_constraints",
  "correlation_id",
  "causation_id",
  "proposal_expires_at",
  "repository_state_version",
] as const;
const AUTH_KEYS = [
  "issuer",
  "audience",
  "subject",
  "token_kind",
  "signing_algorithm",
  "issued_at",
  "expires_at",
] as const;

const isToken = (value: unknown): value is string =>
  typeof value === "string" && /^[a-z][a-z0-9_.:-]{2,127}$/u.test(value);
const validVersion = (value: unknown): value is number =>
  Number.isSafeInteger(value) && (value as number) > 0;
const validStateVersion = (value: unknown): value is string | number =>
  (typeof value === "string" && isToken(value)) || validVersion(value);

export function parseProposalExecutionScope(
  value: unknown,
): ProposalExecutionScope | null {
  if (
    !isFarmOsRecord(value) ||
    !hasExactFarmOsKeys(value, SCOPE_KEYS) ||
    value.scope_type !== "exact_target" ||
    !isFarmOsIdentifier(value.scope_id) ||
    !isFarmOsIdentifier(value.target_reference)
  )
    return null;
  return value as unknown as ProposalExecutionScope;
}

export function parseProposalExecutionVerificationRequest(
  value: unknown,
):
  | { valid: true; value: ProposalExecutionVerificationRequest }
  | {
      valid: false;
      rejection_code: ProposalExecutionVerificationRejectionCode;
    } {
  if (!isFarmOsRecord(value) || !hasExactFarmOsKeys(value, REQUEST_KEYS))
    return { valid: false, rejection_code: "REQUEST_INVALID" };
  if (
    value.contract_version !==
    FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION
  )
    return {
      valid: false,
      rejection_code: "CONTRACT_VERSION_MISMATCH",
    };
  if (
    !isFarmOsIdentifier(value.verification_id) ||
    !isFarmOsIdentifier(value.operation_id) ||
    !isFarmOsIdentifier(value.proposal_id) ||
    !validVersion(value.proposal_version) ||
    !isFarmOsDigest(value.proposal_snapshot_hash) ||
    !isToken(value.operation_type) ||
    !isToken(value.target_system) ||
    !isFarmOsIdentifier(value.target_reference) ||
    !isToken(value.requested_capability) ||
    !parseProposalExecutionScope(value.requested_scope) ||
    !isFarmOsIdentifier(value.correlation_id) ||
    !isFarmOsIdentifier(value.causation_id) ||
    !isCanonicalFarmOsIso(value.requested_at)
  )
    return { valid: false, rejection_code: "REQUEST_INVALID" };
  if (!isFarmOsDigest(value.fingerprint))
    return { valid: false, rejection_code: "FINGERPRINT_INVALID" };
  if (value.audience !== FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE)
    return { valid: false, rejection_code: "AUDIENCE_MISMATCH" };
  return {
    valid: true,
    value: value as unknown as ProposalExecutionVerificationRequest,
  };
}

function isProposalExecutionState(value: unknown): value is ProposalExecutionState {
  if (!isFarmOsRecord(value) || !hasExactFarmOsKeys(value, STATE_KEYS))
    return false;
  return (
    isFarmOsIdentifier(value.proposal_id) &&
    validVersion(value.proposal_version) &&
    isFarmOsDigest(value.proposal_snapshot_hash) &&
    ["executable", "draft", "rejected", "expired", "superseded"].includes(
      String(value.proposal_status),
    ) &&
    isToken(value.operation_type) &&
    isToken(value.target_system) &&
    isFarmOsIdentifier(value.target_reference) &&
    isToken(value.required_capability) &&
    parseProposalExecutionScope(value.scope_constraints) !== null &&
    isFarmOsIdentifier(value.correlation_id) &&
    isFarmOsIdentifier(value.causation_id) &&
    isCanonicalFarmOsIso(value.proposal_expires_at) &&
    validStateVersion(value.repository_state_version)
  );
}

function isAuthenticationEvidence(
  value: unknown,
): value is WorkloadIdentityEvidence {
  return (
    isFarmOsRecord(value) &&
    hasExactFarmOsKeys(value, AUTH_KEYS) &&
    value.issuer === FARM_OS_PROPOSAL_VERIFICATION_ISSUER &&
    value.audience === FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE &&
    value.subject === FARM_OS_PROPOSAL_VERIFICATION_SUBJECT &&
    value.token_kind === "workload" &&
    (value.signing_algorithm === "ES256" ||
      value.signing_algorithm === "EdDSA") &&
    isCanonicalFarmOsIso(value.issued_at) &&
    isCanonicalFarmOsIso(value.expires_at)
  );
}

const withTimeout = <T>(promise: Promise<T>) =>
  new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("authority_timeout")),
      FARM_OS_PROPOSAL_AUTHORITY_TIMEOUT_MS,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });

const emptyTrace = (
  repositoryResult: ProposalExecutionVerificationTrace["repository_result"],
  scopeMatch: boolean | null = null,
): ProposalExecutionVerificationTrace => ({
  authority_source: "proposal_execution_repository",
  authentication_source: "workload_identity_port",
  deterministic_verifier: true,
  human_approval_evaluated: false,
  runtime_advisory_used_as_authority: false,
  repository_result: repositoryResult,
  scope_match: scopeMatch,
});

const safeRequestFields = (value: unknown) => {
  const raw = isFarmOsRecord(value) ? value : {};
  return {
    verification_id: isFarmOsIdentifier(raw.verification_id)
      ? raw.verification_id
      : "verification_rejected",
    operation_id: isFarmOsIdentifier(raw.operation_id)
      ? raw.operation_id
      : "operation_rejected",
    proposal_id: isFarmOsIdentifier(raw.proposal_id)
      ? raw.proposal_id
      : "proposal_rejected",
    proposal_version: validVersion(raw.proposal_version)
      ? raw.proposal_version
      : 1,
    proposal_snapshot_hash: isFarmOsDigest(raw.proposal_snapshot_hash)
      ? raw.proposal_snapshot_hash
      : `sha256:${"0".repeat(64)}`,
    operation_type: isToken(raw.operation_type)
      ? raw.operation_type
      : "operation.invalid",
    target_system: isToken(raw.target_system)
      ? raw.target_system
      : "target.invalid",
    target_reference: isFarmOsIdentifier(raw.target_reference)
      ? raw.target_reference
      : "target_rejected",
    requested_capability: isToken(raw.requested_capability)
      ? raw.requested_capability
      : "capability.invalid",
    fingerprint: isFarmOsDigest(raw.fingerprint)
      ? raw.fingerprint
      : `sha256:${"0".repeat(64)}`,
    correlation_id: isFarmOsIdentifier(raw.correlation_id)
      ? raw.correlation_id
      : "correlation_rejected",
    causation_id: isFarmOsIdentifier(raw.causation_id)
      ? raw.causation_id
      : "causation_rejected",
  };
};

function makeEnvelope(input: {
  request: unknown;
  decision: ProposalExecutionVerificationDecision;
  rejectionCode: ProposalExecutionVerificationRejectionCode | null;
  now: string;
  expiresAt?: string;
  state?: ProposalExecutionState;
  trace: ProposalExecutionVerificationTrace;
}): ProposalExecutionVerificationEnvelope {
  const fields = safeRequestFields(input.request);
  const request = isFarmOsRecord(input.request) ? input.request : {};
  const scope = input.state?.scope_constraints ?? null;
  const result: ProposalExecutionVerificationResult = {
    contract_version:
      FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
    ...fields,
    decision: input.decision,
    rejection_code: input.rejectionCode,
    proposal_status: input.state?.proposal_status ?? "unknown",
    required_capability:
      input.state?.required_capability ?? fields.requested_capability,
    scope_constraints: scope,
    audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    verified_at: input.now,
    verification_expires_at: input.expiresAt ?? input.now,
    repository_state_version:
      input.state?.repository_state_version ?? null,
    trace: input.trace,
  };
  const audit: ProposalExecutionVerificationAudit = {
    verification_id: result.verification_id,
    operation_id: result.operation_id,
    proposal_id: result.proposal_id,
    proposal_version: result.proposal_version,
    proposal_snapshot_hash: result.proposal_snapshot_hash,
    decision: result.decision,
    rejection_code: result.rejection_code,
    operation_type: result.operation_type,
    target_system: result.target_system,
    target_reference: result.target_reference,
    requested_capability: fields.requested_capability,
    scope_decision:
      input.trace.scope_match === null
        ? "not_evaluated"
        : input.trace.scope_match
          ? "matched"
          : "mismatched",
    audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
    fingerprint_reference: result.fingerprint,
    correlation_id: result.correlation_id,
    causation_id: result.causation_id,
    repository_state_version: result.repository_state_version,
    verified_at: result.verified_at,
    verification_expires_at: result.verification_expires_at,
    business_write_performed: false,
    external_side_effect_performed: false,
  };
  void request;
  return { result, audit };
}

export async function verifyProposalExecution(input: {
  request: unknown;
  ports: ProposalExecutionVerificationPorts;
}): Promise<ProposalExecutionVerificationEnvelope> {
  let now: string;
  try {
    now = await withTimeout(input.ports.clock.now());
  } catch {
    return makeEnvelope({
      request: input.request,
      decision: "unavailable",
      rejectionCode: "CLOCK_UNAVAILABLE",
      now: new Date(0).toISOString(),
      trace: emptyTrace("unavailable"),
    });
  }
  if (!isCanonicalFarmOsIso(now))
    return makeEnvelope({
      request: input.request,
      decision: "unavailable",
      rejectionCode: "CLOCK_UNAVAILABLE",
      now: new Date(0).toISOString(),
      trace: emptyTrace("unavailable"),
    });

  const parsed = parseProposalExecutionVerificationRequest(input.request);
  if ("rejection_code" in parsed)
    return makeEnvelope({
      request: input.request,
      decision: "rejected",
      rejectionCode: parsed.rejection_code,
      now,
      trace: emptyTrace("invalid"),
    });
  const request = parsed.value;
  if (Date.parse(request.requested_at) > Date.parse(now))
    return makeEnvelope({
      request,
      decision: "rejected",
      rejectionCode: "REQUEST_INVALID",
      now,
      trace: emptyTrace("invalid"),
    });

  let authentication: WorkloadAuthenticationResult;
  try {
    authentication = await withTimeout(input.ports.authentication.authenticate());
  } catch {
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "WORKLOAD_AUTHORITY_UNAVAILABLE",
      now,
      trace: emptyTrace("unavailable"),
    });
  }
  if (!isFarmOsRecord(authentication) || typeof authentication.kind !== "string")
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "WORKLOAD_AUTHORITY_UNAVAILABLE",
      now,
      trace: emptyTrace("invalid"),
    });
  if (authentication.kind === "unavailable")
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "WORKLOAD_AUTHORITY_UNAVAILABLE",
      now,
      trace: emptyTrace("unavailable"),
    });
  if (
    authentication.kind !== "authenticated" ||
    !isAuthenticationEvidence(authentication.evidence) ||
    Date.parse(authentication.evidence.issued_at) > Date.parse(now) ||
    Date.parse(authentication.evidence.expires_at) <= Date.parse(now) ||
    Date.parse(authentication.evidence.expires_at) -
      Date.parse(authentication.evidence.issued_at) >
      FARM_OS_PROPOSAL_VERIFICATION_MAX_TTL_MS
  )
    return makeEnvelope({
      request,
      decision: "rejected",
      rejectionCode: "WORKLOAD_AUTHENTICATION_FAILED",
      now,
      trace: emptyTrace("invalid"),
    });

  let repositoryResult: ProposalExecutionRepositoryResult;
  try {
    repositoryResult = await withTimeout(
      input.ports.repository.getCurrentProposalExecutionState(
        request.proposal_id,
      ),
    );
  } catch {
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "PROPOSAL_AUTHORITY_UNAVAILABLE",
      now,
      trace: emptyTrace("unavailable"),
    });
  }
  if (!isFarmOsRecord(repositoryResult) || typeof repositoryResult.kind !== "string")
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "PROPOSAL_AUTHORITY_UNKNOWN",
      now,
      trace: emptyTrace("invalid"),
    });
  if (repositoryResult.kind === "unavailable")
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "PROPOSAL_AUTHORITY_UNAVAILABLE",
      now,
      trace: emptyTrace("unavailable"),
    });
  if (repositoryResult.kind === "unknown")
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "PROPOSAL_AUTHORITY_UNKNOWN",
      now,
      trace: emptyTrace("unknown"),
    });
  if (repositoryResult.kind === "not_found")
    return makeEnvelope({
      request,
      decision: "rejected",
      rejectionCode: "PROPOSAL_NOT_FOUND",
      now,
      trace: emptyTrace("not_found"),
    });
  if (repositoryResult.kind !== "found" || !isProposalExecutionState(repositoryResult.state))
    return makeEnvelope({
      request,
      decision: "unavailable",
      rejectionCode: "PROPOSAL_AUTHORITY_UNKNOWN",
      now,
      trace: emptyTrace("invalid"),
    });

  const state = repositoryResult.state;
  const reject = (
    code: ProposalExecutionVerificationRejectionCode,
    scopeMatch: boolean | null = null,
  ) =>
    makeEnvelope({
      request,
      decision: "rejected",
      rejectionCode: code,
      now,
      state,
      trace: emptyTrace("found", scopeMatch),
    });
  if (state.proposal_id !== request.proposal_id)
    return reject("PROPOSAL_AUTHORITY_UNKNOWN");
  if (state.proposal_status === "rejected") return reject("PROPOSAL_REJECTED");
  if (state.proposal_status === "expired") return reject("PROPOSAL_EXPIRED");
  if (state.proposal_status === "superseded")
    return reject("PROPOSAL_SUPERSEDED");
  if (state.proposal_status !== "executable")
    return reject("PROPOSAL_NOT_EXECUTABLE");
  if (Date.parse(state.proposal_expires_at) <= Date.parse(now))
    return reject("PROPOSAL_EXPIRED");
  if (state.proposal_version !== request.proposal_version)
    return reject("PROPOSAL_VERSION_MISMATCH");
  if (state.proposal_snapshot_hash !== request.proposal_snapshot_hash)
    return reject("PROPOSAL_SNAPSHOT_MISMATCH");
  if (state.operation_type !== request.operation_type)
    return reject("OPERATION_TYPE_MISMATCH");
  if (state.target_system !== request.target_system)
    return reject("TARGET_SYSTEM_MISMATCH");
  if (state.target_reference !== request.target_reference)
    return reject("TARGET_REFERENCE_MISMATCH");
  if (state.required_capability !== request.requested_capability)
    return reject("CAPABILITY_MISMATCH");
  const scopeMatch =
    canonicalFarmOsJson(state.scope_constraints) ===
    canonicalFarmOsJson(request.requested_scope);
  if (!scopeMatch) return reject("SCOPE_MISMATCH", false);
  if (state.correlation_id !== request.correlation_id)
    return reject("CORRELATION_MISMATCH", true);
  if (state.causation_id !== request.causation_id)
    return reject("CAUSATION_MISMATCH", true);

  const verificationExpiresAt = new Date(
    Math.min(
      Date.parse(now) + FARM_OS_PROPOSAL_VERIFICATION_MAX_TTL_MS,
      Date.parse(state.proposal_expires_at),
    ),
  ).toISOString();
  return makeEnvelope({
    request,
    decision: "allowed",
    rejectionCode: null,
    now,
    expiresAt: verificationExpiresAt,
    state,
    trace: emptyTrace("found", true),
  });
}

export const FARM_OS_PROPOSAL_VERIFICATION_AUTHORITY_BOUNDARY = {
  human_approval_sot: "farming_app",
  proposal_state_authority: "proposal_execution_repository",
  allowed_issuers: ["deterministic_proposal_verification_service"],
  hermes_can_issue_verification: false,
  observer_can_issue_verification: false,
  native_runtime_can_self_authorize: false,
  runtime_advisory_is_authority: false,
  production_adapter_available: false,
  business_write_allowed: false,
  external_side_effect_allowed: false,
} as const;
