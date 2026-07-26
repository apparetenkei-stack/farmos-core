import {
  createPublicKey,
  verify as verifySignature,
  type KeyObject,
} from "node:crypto";
import {
  FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
  FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
  FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
  type ProposalVerificationAuthenticationPort,
  type WorkloadAuthenticationResult,
} from "./farm_os_proposal_execution_verification_contract";
import type { ProposalCreationAuthenticationPort } from "./farm_os_eligible_proposal_persistence";

export const FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE =
  "farmos-core.proposal-persistence" as const;
export const FARM_OS_PROPOSAL_PERSISTENCE_ISSUER =
  FARM_OS_PROPOSAL_VERIFICATION_ISSUER;
export const FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT =
  "core-proposal-persistence-workload" as const;
export const FARM_OS_WORKLOAD_JWT_MAX_TTL_SECONDS = 60;

export interface WorkloadJwtTokenPort {
  getToken(): Promise<string | null>;
}
export type WorkloadPublicJwk = JsonWebKey & {
  kid: string;
  alg: "ES256" | "EdDSA";
  use: "sig";
};
export interface WorkloadJwksPort {
  getKeys(): Promise<
    | { kind: "available"; keys: readonly WorkloadPublicJwk[] }
    | { kind: "unavailable"; reason: string }
  >;
}
export interface WorkloadJwtClockPort {
  now(): Promise<string>;
}
export type WorkloadJwtServerConfiguration = {
  issuer: string;
  audience:
    | typeof FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE
    | typeof FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE;
  subject: string;
  workloadKind: "hermes_advisory" | "native_runtime" | "human_core_author";
};
type VerifiedWorkloadIdentity = {
  workload_id: string;
  workload_kind: WorkloadJwtServerConfiguration["workloadKind"];
  issuer: string;
  audience: WorkloadJwtServerConfiguration["audience"];
  subject: string;
  token_id: string;
  algorithm: "ES256" | "EdDSA";
  issued_at: string;
  authenticated_at: string;
  expires_at: string;
};
export type WorkloadJwtVerificationResult =
  | { kind: "authenticated"; identity: VerifiedWorkloadIdentity }
  | { kind: "rejected"; reason: string }
  | { kind: "unavailable"; reason: string };

const decodePart = (value: string): Buffer | null => {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return null;
  try {
    const decoded = Buffer.from(value, "base64url");
    return decoded.length > 0 && decoded.toString("base64url") === value ? decoded : null;
  } catch {
    return null;
  }
};
const parseJsonObject = (value: Buffer | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value.toString("utf8"));
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
};
const epochIso = (value: unknown): string | null => {
  if (!Number.isSafeInteger(value) || (value as number) < 0) return null;
  return new Date((value as number) * 1000).toISOString();
};
const keyFor = (key: WorkloadPublicJwk): KeyObject | null => {
  try {
    if (
      key.use !== "sig" ||
      (key.alg === "ES256" && !(key.kty === "EC" && key.crv === "P-256")) ||
      (key.alg === "EdDSA" && !(key.kty === "OKP" && key.crv === "Ed25519"))
    ) return null;
    return createPublicKey({ key, format: "jwk" });
  } catch {
    return null;
  }
};

export class ProductionWorkloadJwtVerifier {
  constructor(
    private readonly tokenPort: WorkloadJwtTokenPort,
    private readonly jwksPort: WorkloadJwksPort,
    private readonly clock: WorkloadJwtClockPort,
    private readonly config: WorkloadJwtServerConfiguration,
  ) {}

  async verify(): Promise<WorkloadJwtVerificationResult> {
    let token: string | null;
    let keysResult: Awaited<ReturnType<WorkloadJwksPort["getKeys"]>>;
    let now: string;
    try {
      [token, keysResult, now] = await Promise.all([
        this.tokenPort.getToken(),
        this.jwksPort.getKeys(),
        this.clock.now(),
      ]);
    } catch {
      return { kind: "unavailable", reason: "workload_auth_dependency_unavailable" };
    }
    if (!token) return { kind: "unavailable", reason: "workload_token_unavailable" };
    if (keysResult.kind === "unavailable") {
      return { kind: "unavailable", reason: "workload_key_set_unavailable" };
    }
    const nowMs = Date.parse(now);
    if (!Number.isFinite(nowMs)) return { kind: "unavailable", reason: "workload_clock_unavailable" };
    const parts = token.split(".");
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      return { kind: "rejected", reason: "workload_token_malformed" };
    }
    const header = parseJsonObject(decodePart(parts[0]!));
    const claims = parseJsonObject(decodePart(parts[1]!));
    const signature = decodePart(parts[2]!);
    if (!header || !claims || !signature) {
      return { kind: "rejected", reason: "workload_token_malformed" };
    }
    if (
      header.typ !== "JWT" ||
      (header.alg !== "ES256" && header.alg !== "EdDSA") ||
      typeof header.kid !== "string"
    ) return { kind: "rejected", reason: "workload_token_header_invalid" };
    const candidates = keysResult.keys.filter(
      (key) => key.kid === header.kid && key.alg === header.alg,
    );
    if (candidates.length !== 1) return { kind: "rejected", reason: "workload_key_unknown" };
    const key = keyFor(candidates[0]!);
    if (!key) return { kind: "rejected", reason: "workload_key_invalid" };
    const signingInput = Buffer.from(`${parts[0]}.${parts[1]}`, "ascii");
    const validSignature =
      header.alg === "ES256"
        ? verifySignature(
            "sha256",
            signingInput,
            { key, dsaEncoding: "ieee-p1363" },
            signature,
          )
        : verifySignature(null, signingInput, key, signature);
    if (!validSignature) return { kind: "rejected", reason: "workload_signature_invalid" };

    const issuedAt = epochIso(claims.iat);
    const notBefore = epochIso(claims.nbf);
    const expiresAt = epochIso(claims.exp);
    if (
      claims.iss !== this.config.issuer ||
      claims.aud !== this.config.audience ||
      claims.sub !== this.config.subject ||
      claims.token_type !== "workload" ||
      typeof claims.jti !== "string" ||
      claims.jti.length < 8 ||
      !issuedAt ||
      !notBefore ||
      !expiresAt
    ) return { kind: "rejected", reason: "workload_claims_invalid" };
    const issuedAtMs = Date.parse(issuedAt);
    const notBeforeMs = Date.parse(notBefore);
    const expiresAtMs = Date.parse(expiresAt);
    if (
      issuedAtMs > nowMs ||
      notBeforeMs > nowMs ||
      expiresAtMs <= nowMs ||
      expiresAtMs - issuedAtMs > FARM_OS_WORKLOAD_JWT_MAX_TTL_SECONDS * 1000 ||
      notBeforeMs < issuedAtMs
    ) return { kind: "rejected", reason: "workload_token_time_invalid" };
    return {
      kind: "authenticated",
      identity: {
        workload_id: this.config.subject,
        workload_kind: this.config.workloadKind,
        issuer: this.config.issuer,
        audience: this.config.audience,
        subject: this.config.subject,
        token_id: claims.jti,
        algorithm: header.alg,
        issued_at: issuedAt,
        authenticated_at: now,
        expires_at: expiresAt,
      },
    };
  }
}

export class ProductionProposalVerificationWorkloadAuthentication
  implements ProposalVerificationAuthenticationPort
{
  readonly productionAdapterKind = "proposal_verification_workload_jwt_v1" as const;
  constructor(private readonly verifier: ProductionWorkloadJwtVerifier) {}
  async authenticate(): Promise<WorkloadAuthenticationResult> {
    const result = await this.verifier.verify();
    if (result.kind !== "authenticated") return result;
    const identity = result.identity;
    if (
      identity.issuer !== FARM_OS_PROPOSAL_VERIFICATION_ISSUER ||
      identity.audience !== FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE ||
      identity.subject !== FARM_OS_PROPOSAL_VERIFICATION_SUBJECT
    ) return { kind: "rejected", reason: "workload_binding_invalid" };
    return {
      kind: "authenticated",
      evidence: {
        issuer: FARM_OS_PROPOSAL_VERIFICATION_ISSUER,
        audience: FARM_OS_PROPOSAL_VERIFICATION_AUDIENCE,
        subject: FARM_OS_PROPOSAL_VERIFICATION_SUBJECT,
        token_kind: "workload",
        signing_algorithm: identity.algorithm,
        issued_at: identity.issued_at,
        expires_at: identity.expires_at,
      },
    };
  }
}

export class ProductionProposalPersistenceWorkloadAuthentication
  implements ProposalCreationAuthenticationPort
{
  readonly productionAdapterKind = "proposal_persistence_workload_jwt_v1" as const;
  constructor(private readonly verifier: ProductionWorkloadJwtVerifier) {}
  async authenticate(): ReturnType<ProposalCreationAuthenticationPort["authenticate"]> {
    const result = await this.verifier.verify();
    if (result.kind !== "authenticated") {
      return result.kind === "rejected" ? { kind: "rejected" } : { kind: "unavailable" };
    }
    const identity = result.identity;
    if (
      identity.issuer !== FARM_OS_PROPOSAL_PERSISTENCE_ISSUER ||
      identity.audience !== FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE ||
      identity.subject !== FARM_OS_PROPOSAL_PERSISTENCE_SUBJECT
    ) {
      return { kind: "rejected" };
    }
    return {
      kind: "authenticated",
      workload_id: identity.workload_id,
      workload_kind: identity.workload_kind,
      issuer: identity.issuer,
      audience: FARM_OS_PROPOSAL_PERSISTENCE_AUDIENCE,
      token_id: identity.token_id,
      authenticated_at: identity.authenticated_at,
      expires_at: identity.expires_at,
    };
  }
}
