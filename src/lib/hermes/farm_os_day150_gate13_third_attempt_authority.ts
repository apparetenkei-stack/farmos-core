import { createHash } from "node:crypto";
import { resolve } from "node:path";

import {
  FarmOsDay150DurablePublicationError,
  canonicalFarmOsDay150Json,
  publishCanonicalFarmOsDay150ArtifactExclusive,
  reconcileCanonicalFarmOsDay150ArtifactDurability,
  reopenCanonicalFarmOsDay150Artifact,
} from "./farm_os_day150_prefix_reference_durable_store";

export const FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_AUTHORITY_SCHEMA =
  "farmos.day150-gate13-third-real-attempt-authority.v1" as const;
export const FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_SCHEMA =
  "farmos.day150-gate13-third-real-attempt-consumption-claim.v2" as const;
export const FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_SCHEMA =
  "farmos.day150-gate13-third-real-attempt-terminal.v2" as const;
export const FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_SCHEMA =
  "farmos.day150-gate13-third-real-attempt-recovery-ownership.v1" as const;
export const FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/third-real-attempt-consumption-claim.json" as const;
export const FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/third-real-attempt-terminal.json" as const;
export const FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/third-real-attempt-recovery-ownership.json" as const;
export const FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_AUTHORITY_SCHEMA =
  "farmos.day150-gate13-fourth-real-attempt-authority.v1" as const;
export const FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_SCHEMA =
  "farmos.day150-gate13-fourth-real-attempt-consumption-claim.v1" as const;
export const FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_SCHEMA =
  "farmos.day150-gate13-fourth-real-attempt-terminal.v1" as const;
export const FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/fourth-real-attempt-consumption-claim.json" as const;
export const FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH =
  "artifacts/day150/gate13-durability/qualification/v1/fourth-real-attempt-terminal.json" as const;

const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;
const hash = (domain: string, value: unknown): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(`${domain}\0${canonicalFarmOsDay150Json(value)}`,
    "utf8").digest("hex")}`;
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactIso = (value: unknown): value is string => typeof value === "string" &&
  ISO.test(value) && new Date(value).toISOString() === value;

export type FarmOsDay150Gate13ThirdAttemptAuthority = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_AUTHORITY_SCHEMA;
  day: "Day150"; gate: "Gate13";
  qualification_scope: "ISOLATED_STORAGE_BACKED_DURABILITY_QUALIFICATION";
  authority_revision: 3; attempt_ordinal: 3;
  product_owner_authority_reference:
    "PRODUCT_OWNER_CURRENT_DAY150_GATE13_PENDING_THIRD_ATTEMPT_AUTHORITY";
  authorization_status: "AUTHORIZED_PENDING_SINGLE_USE";
  automatic_retry_count: 0; fourth_attempt_authorized: false;
  source_set_digest: `sha256:${string}`; attempt_identity: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13ThirdAttemptClaim = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_SCHEMA;
  authority_revision: 3; attempt_identity: `sha256:${string}`;
  source_set_digest: `sha256:${string}`; authorization_status: "CLAIMED_CONSUMED";
  single_use: true; claimed_at: string; normal_execution_not_after: string;
  recovery_not_before: string;
  claim_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13ThirdAttemptTerminal = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_SCHEMA;
  attempt_identity: `sha256:${string}`; claim_digest: `sha256:${string}`;
  source_set_digest: `sha256:${string}`; qualification_result_digest: `sha256:${string}`;
  attempt_consumed: true;
  qualification_result: "QUALIFICATION_SUCCESS" | "QUALIFICATION_FAILED" |
    "QUALIFICATION_OUTCOME_UNKNOWN";
  failure_boundary: string | null; zero_residual: boolean; completed_at: string;
  terminal_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13ThirdAttemptRecoveryOwnership = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_SCHEMA;
  attempt_identity: `sha256:${string}`; claim_digest: `sha256:${string}`;
  source_set_digest: `sha256:${string}`; resource_identity_digest: `sha256:${string}`;
  recovery_mode: "TERMINALIZE_ONLY_NO_QUALIFICATION_RERUN"; acquired_at: string;
  recovery_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13FourthAttemptAuthority = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_AUTHORITY_SCHEMA;
  day: "Day150"; gate: "Gate13"; authority_revision: 4; attempt_ordinal: 4;
  qualification_scope: "ISOLATED_STORAGE_BACKED_DURABILITY_QUALIFICATION";
  product_owner_authority_reference:
    "PRODUCT_OWNER_DAY150_GATE13_SINGLE_FOURTH_ATTEMPT_AUTHORITY";
  authorization_status: "AUTHORIZED_PENDING_SINGLE_USE";
  automatic_retry_count: 0; fifth_attempt_authorized: false;
  supersedes_attempt_identity: null;
  source_set_digest: `sha256:${string}`;
  execution_snapshot_digest: `sha256:${string}`;
  attempt_identity: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13FourthAttemptClaim = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_SCHEMA;
  authority_revision: 4; attempt_identity: `sha256:${string}`;
  source_set_digest: `sha256:${string}`; execution_snapshot_digest: `sha256:${string}`;
  authorization_status: "CLAIMED_CONSUMED"; single_use: true;
  claimed_at: string; normal_execution_not_after: string; claim_digest: `sha256:${string}`;
}>;
export type FarmOsDay150Gate13FourthAttemptTerminal = Readonly<{
  schema_version: typeof FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_SCHEMA;
  attempt_identity: `sha256:${string}`; claim_digest: `sha256:${string}`;
  source_set_digest: `sha256:${string}`; execution_snapshot_digest: `sha256:${string}`;
  qualification_result_digest: `sha256:${string}`; attempt_consumed: true;
  qualification_result: "QUALIFICATION_SUCCESS" | "QUALIFICATION_FAILED" |
    "QUALIFICATION_OUTCOME_UNKNOWN";
  failure_boundary: string | null; zero_residual: boolean; completed_at: string;
  terminal_digest: `sha256:${string}`;
}>;

export type FarmOsDay150Gate13DurableArtifactPort = Readonly<{
  publishExclusive(path: string, value: unknown): Promise<void>;
  reconcileDurability(path: string, expected: unknown): Promise<void>;
  reopen(path: string): Promise<unknown>;
}>;
const DURABLE_STORE: FarmOsDay150Gate13DurableArtifactPort = Object.freeze({
  publishExclusive: publishCanonicalFarmOsDay150ArtifactExclusive,
  reconcileDurability: reconcileCanonicalFarmOsDay150ArtifactDurability,
  reopen: reopenCanonicalFarmOsDay150Artifact,
});

export function createFarmOsDay150Gate13ThirdAttemptAuthority(
  sourceSetDigest: `sha256:${string}`,
): FarmOsDay150Gate13ThirdAttemptAuthority {
  if (!DIGEST.test(sourceSetDigest)) throw new Error("GATE13_SOURCE_SET_DIGEST_INVALID");
  const body = Object.freeze({ schema_version:
    FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_AUTHORITY_SCHEMA, day: "Day150" as const,
    gate: "Gate13" as const,
    qualification_scope: "ISOLATED_STORAGE_BACKED_DURABILITY_QUALIFICATION" as const,
    authority_revision: 3 as const, attempt_ordinal: 3 as const,
    product_owner_authority_reference:
      "PRODUCT_OWNER_CURRENT_DAY150_GATE13_PENDING_THIRD_ATTEMPT_AUTHORITY" as const,
    authorization_status: "AUTHORIZED_PENDING_SINGLE_USE" as const,
    automatic_retry_count: 0 as const, fourth_attempt_authorized: false as const,
    source_set_digest: sourceSetDigest });
  return Object.freeze({ ...body, attempt_identity: hash(
    "farmos.day150-gate13-third-real-attempt-authority.v1:attempt-identity", body) });
}

export function parseFarmOsDay150Gate13ThirdAttemptClaim(
  value: unknown,
): FarmOsDay150Gate13ThirdAttemptClaim | null {
  if (!record(value) || !exactKeys(value, ["schema_version", "authority_revision",
    "attempt_identity", "source_set_digest", "authorization_status", "single_use",
    "claimed_at", "normal_execution_not_after", "recovery_not_before", "claim_digest"])) return null;
  const { claim_digest: supplied, ...body } = value;
  return value.schema_version === FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_SCHEMA &&
    value.authority_revision === 3 && DIGEST.test(String(value.attempt_identity)) &&
    DIGEST.test(String(value.source_set_digest)) && value.authorization_status ===
      "CLAIMED_CONSUMED" && value.single_use === true && exactIso(value.claimed_at) &&
    exactIso(value.recovery_not_before) && Date.parse(value.recovery_not_before) ===
      Date.parse(value.claimed_at) + 60 * 60 * 1000 &&
    exactIso(value.normal_execution_not_after) && Date.parse(value.normal_execution_not_after) ===
      Date.parse(value.claimed_at) + 55 * 60 * 1000 &&
    supplied === hash(`${FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_SCHEMA}:claim`, body)
    ? Object.freeze(value as FarmOsDay150Gate13ThirdAttemptClaim) : null;
}

export function parseFarmOsDay150Gate13ThirdAttemptTerminal(
  value: unknown,
): FarmOsDay150Gate13ThirdAttemptTerminal | null {
  if (!record(value) || !exactKeys(value, ["schema_version", "attempt_identity", "claim_digest",
    "source_set_digest", "qualification_result_digest", "attempt_consumed",
    "qualification_result", "failure_boundary", "zero_residual", "completed_at",
    "terminal_digest"])) return null;
  const { terminal_digest: supplied, ...body } = value;
  return value.schema_version === FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_SCHEMA &&
    DIGEST.test(String(value.attempt_identity)) && DIGEST.test(String(value.claim_digest)) &&
    DIGEST.test(String(value.source_set_digest)) &&
    DIGEST.test(String(value.qualification_result_digest)) && value.attempt_consumed === true &&
    ["QUALIFICATION_SUCCESS", "QUALIFICATION_FAILED",
      "QUALIFICATION_OUTCOME_UNKNOWN"].includes(String(value.qualification_result)) &&
    (value.failure_boundary === null || typeof value.failure_boundary === "string") &&
    typeof value.zero_residual === "boolean" && exactIso(value.completed_at) &&
    (value.qualification_result !== "QUALIFICATION_SUCCESS" ||
      (value.zero_residual === true && value.failure_boundary === null)) &&
    (value.qualification_result === "QUALIFICATION_SUCCESS" || value.failure_boundary !== null) &&
    supplied === hash(`${FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_SCHEMA}:terminal`, body)
    ? Object.freeze(value as FarmOsDay150Gate13ThirdAttemptTerminal) : null;
}

export function parseFarmOsDay150Gate13RecoveryOwnership(
  value: unknown,
): FarmOsDay150Gate13ThirdAttemptRecoveryOwnership | null {
  if (!record(value) || !exactKeys(value, ["schema_version", "attempt_identity", "claim_digest",
    "source_set_digest", "resource_identity_digest", "recovery_mode", "acquired_at",
    "recovery_digest"])) return null;
  const { recovery_digest: supplied, ...body } = value;
  return value.schema_version === FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_SCHEMA &&
    DIGEST.test(String(value.attempt_identity)) && DIGEST.test(String(value.claim_digest)) &&
    DIGEST.test(String(value.source_set_digest)) &&
    DIGEST.test(String(value.resource_identity_digest)) && value.recovery_mode ===
      "TERMINALIZE_ONLY_NO_QUALIFICATION_RERUN" && exactIso(value.acquired_at) &&
    supplied === hash(`${FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_SCHEMA}:recovery`, body)
    ? Object.freeze(value as FarmOsDay150Gate13ThirdAttemptRecoveryOwnership) : null;
}

async function durablyPublishAndReopen<T>(input: Readonly<{ path: string; candidate: T;
  parse(value: unknown): T | null; store: FarmOsDay150Gate13DurableArtifactPort;
  preexistsCode: string; unknownCode: string; readbackCode: string }>): Promise<T> {
  try { await input.store.publishExclusive(input.path, input.candidate); }
  catch (error) {
    if (error instanceof FarmOsDay150DurablePublicationError &&
      error.code === "OUTPUT_PREEXISTS") throw new Error(input.preexistsCode);
    try { await input.store.reconcileDurability(input.path, input.candidate); }
    catch { throw new Error(input.unknownCode); }
  }
  const readback = input.parse(await input.store.reopen(input.path));
  if (!readback || canonicalFarmOsDay150Json(readback) !==
    canonicalFarmOsDay150Json(input.candidate)) throw new Error(input.readbackCode);
  return readback;
}

export async function claimFarmOsDay150Gate13ThirdAttempt(input: Readonly<{
  repository_root: string; authority: FarmOsDay150Gate13ThirdAttemptAuthority;
  claimed_at: string; durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13ThirdAttemptClaim> {
  const body = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_SCHEMA,
    authority_revision: 3 as const, attempt_identity: input.authority.attempt_identity,
    source_set_digest: input.authority.source_set_digest,
    authorization_status: "CLAIMED_CONSUMED" as const, single_use: true as const,
    claimed_at: input.claimed_at,
    normal_execution_not_after:
      new Date(Date.parse(input.claimed_at) + 55 * 60 * 1000).toISOString(),
    recovery_not_before: new Date(Date.parse(input.claimed_at) + 60 * 60 * 1000).toISOString() });
  const candidate = Object.freeze({ ...body, claim_digest: hash(
    `${FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_SCHEMA}:claim`, body) });
  if (!parseFarmOsDay150Gate13ThirdAttemptClaim(candidate)) {
    throw new Error("GATE13_THIRD_ATTEMPT_CLAIM_CANDIDATE_INVALID");
  }
  return durablyPublishAndReopen({ path: resolve(input.repository_root,
    FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH), candidate,
  parse: parseFarmOsDay150Gate13ThirdAttemptClaim, store: input.durable_store ?? DURABLE_STORE,
  preexistsCode: "GATE13_THIRD_ATTEMPT_ALREADY_CONSUMED",
  unknownCode: "GATE13_THIRD_ATTEMPT_CLAIM_DURABILITY_NOT_ESTABLISHED",
  readbackCode: "GATE13_THIRD_ATTEMPT_CLAIM_READBACK_FAILED" });
}

export async function reopenDurableFarmOsDay150Gate13ThirdAttemptClaim(input: Readonly<{
  repository_root: string; authority: FarmOsDay150Gate13ThirdAttemptAuthority;
  durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13ThirdAttemptClaim> {
  const store = input.durable_store ?? DURABLE_STORE;
  const path = resolve(input.repository_root, FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH);
  const value = await store.reopen(path);
  const claim = parseFarmOsDay150Gate13ThirdAttemptClaim(value);
  if (!claim || claim.attempt_identity !== input.authority.attempt_identity ||
    claim.source_set_digest !== input.authority.source_set_digest) {
    throw new Error("GATE13_THIRD_ATTEMPT_CLAIM_LINEAGE_INVALID");
  }
  await store.reconcileDurability(path, claim);
  return claim;
}

export async function reopenDurableFarmOsDay150Gate13ConsumedClaim(input: Readonly<{
  repository_root: string; durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13ThirdAttemptClaim> {
  const store = input.durable_store ?? DURABLE_STORE;
  const path = resolve(input.repository_root, FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH);
  const claim = parseFarmOsDay150Gate13ThirdAttemptClaim(await store.reopen(path));
  if (!claim) throw new Error("GATE13_CONSUMED_CLAIM_INVALID");
  await store.reconcileDurability(path, claim);
  return claim;
}

export async function publishFarmOsDay150Gate13ThirdAttemptTerminal(input: Readonly<{
  repository_root: string; claim: FarmOsDay150Gate13ThirdAttemptClaim;
  qualification_result: FarmOsDay150Gate13ThirdAttemptTerminal["qualification_result"];
  qualification_result_digest: `sha256:${string}`; failure_boundary: string | null;
  zero_residual: boolean; completed_at: string;
  durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13ThirdAttemptTerminal> {
  const body = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_SCHEMA,
    attempt_identity: input.claim.attempt_identity, claim_digest: input.claim.claim_digest,
    source_set_digest: input.claim.source_set_digest,
    qualification_result_digest: input.qualification_result_digest, attempt_consumed: true as const,
    qualification_result: input.qualification_result, failure_boundary: input.failure_boundary,
    zero_residual: input.zero_residual, completed_at: input.completed_at });
  const candidate = Object.freeze({ ...body, terminal_digest: hash(
    `${FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_SCHEMA}:terminal`, body) });
  if (!parseFarmOsDay150Gate13ThirdAttemptTerminal(candidate)) {
    throw new Error("GATE13_THIRD_ATTEMPT_TERMINAL_CANDIDATE_INVALID");
  }
  return durablyPublishAndReopen({ path: resolve(input.repository_root,
    FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH), candidate,
  parse: parseFarmOsDay150Gate13ThirdAttemptTerminal, store: input.durable_store ?? DURABLE_STORE,
  preexistsCode: "GATE13_THIRD_ATTEMPT_TERMINAL_ALREADY_EXISTS",
  unknownCode: "GATE13_THIRD_ATTEMPT_TERMINAL_DURABILITY_NOT_ESTABLISHED",
  readbackCode: "GATE13_THIRD_ATTEMPT_TERMINAL_READBACK_FAILED" });
}

export async function acquireFarmOsDay150Gate13RecoveryOwnership(input: Readonly<{
  repository_root: string; claim: FarmOsDay150Gate13ThirdAttemptClaim;
  resource_identity_digest: `sha256:${string}`; acquired_at: string;
  durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13ThirdAttemptRecoveryOwnership> {
  if (!exactIso(input.acquired_at) || Date.parse(input.acquired_at) <
    Date.parse(input.claim.recovery_not_before)) {
    throw new Error("GATE13_RECOVERY_WINDOW_NOT_OPEN");
  }
  const body = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_SCHEMA,
    attempt_identity: input.claim.attempt_identity, claim_digest: input.claim.claim_digest,
    source_set_digest: input.claim.source_set_digest,
    resource_identity_digest: input.resource_identity_digest,
    recovery_mode: "TERMINALIZE_ONLY_NO_QUALIFICATION_RERUN" as const,
    acquired_at: input.acquired_at });
  const candidate = Object.freeze({ ...body, recovery_digest: hash(
    `${FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_SCHEMA}:recovery`, body) });
  if (!parseFarmOsDay150Gate13RecoveryOwnership(candidate)) {
    throw new Error("GATE13_RECOVERY_OWNERSHIP_CANDIDATE_INVALID");
  }
  return durablyPublishAndReopen({ path: resolve(input.repository_root,
    FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_RECOVERY_PATH), candidate,
  parse: parseFarmOsDay150Gate13RecoveryOwnership, store: input.durable_store ?? DURABLE_STORE,
  preexistsCode: "GATE13_RECOVERY_ALREADY_OWNED",
  unknownCode: "GATE13_RECOVERY_OWNERSHIP_OUTCOME_UNKNOWN",
  readbackCode: "GATE13_RECOVERY_OWNERSHIP_READBACK_FAILED" });
}

export function createFarmOsDay150Gate13FourthAttemptAuthority(input: Readonly<{
  source_set_digest: `sha256:${string}`;
  execution_snapshot_digest: `sha256:${string}`;
}>): FarmOsDay150Gate13FourthAttemptAuthority {
  if (!DIGEST.test(input.source_set_digest) || !DIGEST.test(input.execution_snapshot_digest)) {
    throw new Error("GATE13_FOURTH_ATTEMPT_SOURCE_IDENTITY_INVALID");
  }
  const body = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_AUTHORITY_SCHEMA,
    day: "Day150" as const, gate: "Gate13" as const, authority_revision: 4 as const,
    attempt_ordinal: 4 as const,
    qualification_scope: "ISOLATED_STORAGE_BACKED_DURABILITY_QUALIFICATION" as const,
    product_owner_authority_reference:
      "PRODUCT_OWNER_DAY150_GATE13_SINGLE_FOURTH_ATTEMPT_AUTHORITY" as const,
    authorization_status: "AUTHORIZED_PENDING_SINGLE_USE" as const,
    automatic_retry_count: 0 as const, fifth_attempt_authorized: false as const,
    supersedes_attempt_identity: null,
    source_set_digest: input.source_set_digest,
    execution_snapshot_digest: input.execution_snapshot_digest });
  return Object.freeze({ ...body, attempt_identity: hash(
    `${FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_AUTHORITY_SCHEMA}:attempt-identity`, body) });
}

export function parseFarmOsDay150Gate13FourthAttemptClaim(
  value: unknown,
): FarmOsDay150Gate13FourthAttemptClaim | null {
  if (!record(value) || !exactKeys(value, ["schema_version", "authority_revision",
    "attempt_identity", "source_set_digest", "execution_snapshot_digest",
    "authorization_status", "single_use", "claimed_at", "normal_execution_not_after",
    "claim_digest"])) return null;
  const { claim_digest: supplied, ...body } = value;
  return value.schema_version === FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_SCHEMA &&
    value.authority_revision === 4 && DIGEST.test(String(value.attempt_identity)) &&
    DIGEST.test(String(value.source_set_digest)) &&
    DIGEST.test(String(value.execution_snapshot_digest)) &&
    value.authorization_status === "CLAIMED_CONSUMED" && value.single_use === true &&
    exactIso(value.claimed_at) && exactIso(value.normal_execution_not_after) &&
    Date.parse(value.normal_execution_not_after) === Date.parse(value.claimed_at) + 55 * 60 * 1000 &&
    supplied === hash(`${FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_SCHEMA}:claim`, body)
    ? Object.freeze(value as FarmOsDay150Gate13FourthAttemptClaim) : null;
}

export function parseFarmOsDay150Gate13FourthAttemptTerminal(
  value: unknown,
): FarmOsDay150Gate13FourthAttemptTerminal | null {
  if (!record(value) || !exactKeys(value, ["schema_version", "attempt_identity", "claim_digest",
    "source_set_digest", "execution_snapshot_digest", "qualification_result_digest",
    "attempt_consumed", "qualification_result", "failure_boundary", "zero_residual",
    "completed_at", "terminal_digest"])) return null;
  const { terminal_digest: supplied, ...body } = value;
  return value.schema_version === FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_SCHEMA &&
    DIGEST.test(String(value.attempt_identity)) && DIGEST.test(String(value.claim_digest)) &&
    DIGEST.test(String(value.source_set_digest)) &&
    DIGEST.test(String(value.execution_snapshot_digest)) &&
    DIGEST.test(String(value.qualification_result_digest)) && value.attempt_consumed === true &&
    ["QUALIFICATION_SUCCESS", "QUALIFICATION_FAILED", "QUALIFICATION_OUTCOME_UNKNOWN"]
      .includes(String(value.qualification_result)) &&
    (value.failure_boundary === null || typeof value.failure_boundary === "string") &&
    typeof value.zero_residual === "boolean" && exactIso(value.completed_at) &&
    (value.qualification_result !== "QUALIFICATION_SUCCESS" ||
      (value.zero_residual === true && value.failure_boundary === null)) &&
    (value.qualification_result === "QUALIFICATION_SUCCESS" || value.failure_boundary !== null) &&
    supplied === hash(`${FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_SCHEMA}:terminal`, body)
    ? Object.freeze(value as FarmOsDay150Gate13FourthAttemptTerminal) : null;
}

export async function claimFarmOsDay150Gate13FourthAttempt(input: Readonly<{
  repository_root: string; authority: FarmOsDay150Gate13FourthAttemptAuthority;
  claimed_at: string; durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13FourthAttemptClaim> {
  const body = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_SCHEMA,
    authority_revision: 4 as const, attempt_identity: input.authority.attempt_identity,
    source_set_digest: input.authority.source_set_digest,
    execution_snapshot_digest: input.authority.execution_snapshot_digest,
    authorization_status: "CLAIMED_CONSUMED" as const, single_use: true as const,
    claimed_at: input.claimed_at,
    normal_execution_not_after:
      new Date(Date.parse(input.claimed_at) + 55 * 60 * 1000).toISOString() });
  const candidate = Object.freeze({ ...body, claim_digest: hash(
    `${FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_SCHEMA}:claim`, body) });
  if (!parseFarmOsDay150Gate13FourthAttemptClaim(candidate)) {
    throw new Error("GATE13_FOURTH_ATTEMPT_CLAIM_CANDIDATE_INVALID");
  }
  return durablyPublishAndReopen({ path: resolve(input.repository_root,
    FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_PATH), candidate,
  parse: parseFarmOsDay150Gate13FourthAttemptClaim, store: input.durable_store ?? DURABLE_STORE,
  preexistsCode: "GATE13_FOURTH_ATTEMPT_ALREADY_CONSUMED",
  unknownCode: "GATE13_FOURTH_ATTEMPT_CLAIM_DURABILITY_NOT_ESTABLISHED",
  readbackCode: "GATE13_FOURTH_ATTEMPT_CLAIM_READBACK_FAILED" });
}

export async function reopenDurableFarmOsDay150Gate13FourthAttemptClaim(input: Readonly<{
  repository_root: string; durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13FourthAttemptClaim> {
  const store = input.durable_store ?? DURABLE_STORE;
  const path = resolve(input.repository_root, FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_PATH);
  const claim = parseFarmOsDay150Gate13FourthAttemptClaim(await store.reopen(path));
  if (!claim) throw new Error("GATE13_FOURTH_ATTEMPT_CLAIM_INVALID");
  await store.reconcileDurability(path, claim);
  return claim;
}

export async function publishFarmOsDay150Gate13FourthAttemptTerminal(input: Readonly<{
  repository_root: string; claim: FarmOsDay150Gate13FourthAttemptClaim;
  qualification_result: FarmOsDay150Gate13FourthAttemptTerminal["qualification_result"];
  qualification_result_digest: `sha256:${string}`; failure_boundary: string | null;
  zero_residual: boolean; completed_at: string;
  durable_store?: FarmOsDay150Gate13DurableArtifactPort;
}>): Promise<FarmOsDay150Gate13FourthAttemptTerminal> {
  const body = Object.freeze({ schema_version: FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_SCHEMA,
    attempt_identity: input.claim.attempt_identity, claim_digest: input.claim.claim_digest,
    source_set_digest: input.claim.source_set_digest,
    execution_snapshot_digest: input.claim.execution_snapshot_digest,
    qualification_result_digest: input.qualification_result_digest, attempt_consumed: true as const,
    qualification_result: input.qualification_result, failure_boundary: input.failure_boundary,
    zero_residual: input.zero_residual, completed_at: input.completed_at });
  const candidate = Object.freeze({ ...body, terminal_digest: hash(
    `${FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_SCHEMA}:terminal`, body) });
  if (!parseFarmOsDay150Gate13FourthAttemptTerminal(candidate)) {
    throw new Error("GATE13_FOURTH_ATTEMPT_TERMINAL_CANDIDATE_INVALID");
  }
  return durablyPublishAndReopen({ path: resolve(input.repository_root,
    FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH), candidate,
  parse: parseFarmOsDay150Gate13FourthAttemptTerminal, store: input.durable_store ?? DURABLE_STORE,
  preexistsCode: "GATE13_FOURTH_ATTEMPT_TERMINAL_ALREADY_EXISTS",
  unknownCode: "GATE13_FOURTH_ATTEMPT_TERMINAL_DURABILITY_NOT_ESTABLISHED",
  readbackCode: "GATE13_FOURTH_ATTEMPT_TERMINAL_READBACK_FAILED" });
}
