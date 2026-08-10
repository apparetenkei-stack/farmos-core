import { createHash } from "node:crypto";
import {
  isFarmOsProductionTargetAuthorityRevision,
  parseFarmOsProductionTargetCanonicalTimestamp,
} from "./farm_os_production_target_authority_lifecycle";

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_ID =
  "farmos.production-target-execution-trusted-clock.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_REVISION = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_CLOCK_EVIDENCE_SCHEMA_VERSION =
  "farmos.production-target-execution-clock-evidence.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EXECUTION_CLOCK_STATUSES = Object.freeze([
  "AVAILABLE", "UNAVAILABLE", "STALE", "REGRESSED", "INVALID",
] as const);
export type FarmOsProductionTargetExecutionClockStatus =
  typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_CLOCK_STATUSES[number];

export const FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_CONTRACT = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_ID,
  authority_revision: FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_REVISION,
  provenance_class: "SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK",
  timestamp_grammar: "YYYY-MM-DDTHH:mm:ss.SSSZ",
  caller_supplied_timestamp_is_authority: false,
  system_clock_read_implemented: false,
  database_clock_read_implemented: false,
  network_clock_read_implemented: false,
  implementation_status: "NOT_ESTABLISHED",
  automatic_latest_selection: false,
} as const);

export type FarmOsProductionTargetExecutionClockEvidence = Readonly<{
  schema_version: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_CLOCK_EVIDENCE_SCHEMA_VERSION;
  clock_authority_id: typeof FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_ID;
  clock_authority_revision: number;
  evidence_id: `clockev_${string}`;
  evidence_digest: `sha256:${string}`;
  provenance_class: "SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK";
  observed_at: string;
  observed_lower_bound: string;
  recorded_at: string;
  status: FarmOsProductionTargetExecutionClockStatus;
  server_owned_record: true;
}>;

export type FarmOsProductionTargetQualifiedClockEvidence = Readonly<{
  accepted: true;
  evidence: FarmOsProductionTargetExecutionClockEvidence;
  observed_at_epoch_ms: number;
}> | Readonly<{
  accepted: false;
  reason:
    | "CLOCK_EVIDENCE_SCHEMA_INVALID"
    | "CLOCK_AUTHORITY_MISMATCH"
    | "CLOCK_EVIDENCE_DIGEST_MISMATCH"
    | "CLOCK_UNAVAILABLE"
    | "CLOCK_STALE"
    | "CLOCK_REGRESSED"
    | "CLOCK_INVALID";
}>;

const CLOCK_KEYS = Object.freeze([
  "clock_authority_id", "clock_authority_revision", "evidence_digest", "evidence_id",
  "observed_at", "observed_lower_bound", "provenance_class", "recorded_at",
  "schema_version", "server_owned_record", "status",
] as const);
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const CLOCK_EVIDENCE_ID = /^clockev_[a-f0-9]{64}$/u;
const IDENTIFIER = /^[a-z][a-z0-9._:-]{0,199}$/u;

export function isFarmOsProductionTargetExecutionRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hasExactFarmOsProductionTargetExecutionKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
): boolean {
  const actual = Object.keys(value).sort();
  const expected = [...keys].sort();
  return actual.length === expected.length &&
    actual.every((key, index) => key === expected[index]);
}

export function isFarmOsProductionTargetExecutionDigest(
  value: unknown,
): value is `sha256:${string}` {
  return typeof value === "string" && DIGEST.test(value);
}

export function isFarmOsProductionTargetExecutionIdentifier(value: unknown): value is string {
  return typeof value === "string" && IDENTIFIER.test(value);
}

export function isCanonicalFarmOsProductionTargetExecutionTimestamp(
  value: unknown,
): value is string {
  return parseFarmOsProductionTargetCanonicalTimestamp(value) !== null;
}

export function canonicalizeFarmOsProductionTargetExecutionContract(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeFarmOsProductionTargetExecutionContract).join(",")}]`;
  }
  if (isFarmOsProductionTargetExecutionRecord(value)) {
    return `{${Object.keys(value).sort().map((key) =>
      `${JSON.stringify(key)}:${canonicalizeFarmOsProductionTargetExecutionContract(value[key])}`
    ).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function hashFarmOsProductionTargetExecutionContract(
  domain: string,
  value: unknown,
): `sha256:${string}` {
  const preimage = `${domain}\n${canonicalizeFarmOsProductionTargetExecutionContract(value)}`;
  return `sha256:${createHash("sha256").update(preimage, "utf8").digest("hex")}`;
}

export function computeFarmOsProductionTargetExecutionClockEvidenceDigest(
  evidence: Omit<FarmOsProductionTargetExecutionClockEvidence, "evidence_digest" | "evidence_id">,
): `sha256:${string}` {
  return hashFarmOsProductionTargetExecutionContract(
    "farmos.production-target-execution-clock-evidence.v1",
    evidence,
  );
}

export function computeFarmOsProductionTargetExecutionClockEvidenceId(
  digest: `sha256:${string}`,
): `clockev_${string}` {
  return `clockev_${digest.slice(7)}`;
}

export function parseFarmOsProductionTargetExecutionClockEvidence(
  value: unknown,
): FarmOsProductionTargetQualifiedClockEvidence {
  if (!isFarmOsProductionTargetExecutionRecord(value) ||
    !hasExactFarmOsProductionTargetExecutionKeys(value, CLOCK_KEYS)) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_SCHEMA_INVALID" });
  }
  if (value.schema_version !== FARM_OS_PRODUCTION_TARGET_EXECUTION_CLOCK_EVIDENCE_SCHEMA_VERSION ||
    value.clock_authority_id !== FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_ID ||
    value.provenance_class !== "SERVER_OWNED_TRUSTED_GOVERNANCE_CLOCK" ||
    value.server_owned_record !== true ||
    !isFarmOsProductionTargetAuthorityRevision(value.clock_authority_revision) ||
    value.clock_authority_revision !==
      FARM_OS_PRODUCTION_TARGET_EXECUTION_TRUSTED_CLOCK_AUTHORITY_REVISION) {
    return Object.freeze({ accepted: false, reason: "CLOCK_AUTHORITY_MISMATCH" });
  }
  if (!FARM_OS_PRODUCTION_TARGET_EXECUTION_CLOCK_STATUSES.includes(
    value.status as FarmOsProductionTargetExecutionClockStatus,
  ) || !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.observed_at) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.observed_lower_bound) ||
    !isCanonicalFarmOsProductionTargetExecutionTimestamp(value.recorded_at) ||
    typeof value.evidence_id !== "string" || !CLOCK_EVIDENCE_ID.test(value.evidence_id) ||
    !isFarmOsProductionTargetExecutionDigest(value.evidence_digest)) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_SCHEMA_INVALID" });
  }
  const observed = Date.parse(value.observed_at);
  const lowerBound = Date.parse(value.observed_lower_bound);
  const recorded = Date.parse(value.recorded_at);
  if (lowerBound > observed || observed > recorded) {
    return Object.freeze({ accepted: false, reason: "CLOCK_INVALID" });
  }
  const material = { ...value };
  delete material.evidence_digest;
  delete material.evidence_id;
  const expectedDigest = computeFarmOsProductionTargetExecutionClockEvidenceDigest(
    material as Omit<FarmOsProductionTargetExecutionClockEvidence, "evidence_digest" | "evidence_id">,
  );
  if (value.evidence_digest !== expectedDigest ||
    value.evidence_id !== computeFarmOsProductionTargetExecutionClockEvidenceId(expectedDigest)) {
    return Object.freeze({ accepted: false, reason: "CLOCK_EVIDENCE_DIGEST_MISMATCH" });
  }
  const statusReason = {
    UNAVAILABLE: "CLOCK_UNAVAILABLE",
    STALE: "CLOCK_STALE",
    REGRESSED: "CLOCK_REGRESSED",
    INVALID: "CLOCK_INVALID",
  } as const;
  const status = value.status as FarmOsProductionTargetExecutionClockStatus;
  if (status !== "AVAILABLE") {
    return Object.freeze({ accepted: false, reason: statusReason[status] });
  }
  return Object.freeze({
    accepted: true,
    evidence: value as unknown as FarmOsProductionTargetExecutionClockEvidence,
    observed_at_epoch_ms: observed,
  });
}

export function qualifyFarmOsProductionTargetExecutionClockEvidence(input: Readonly<{
  evidence: unknown;
  persisted_lower_bound: string | null;
}>): FarmOsProductionTargetQualifiedClockEvidence {
  const parsed = parseFarmOsProductionTargetExecutionClockEvidence(input.evidence);
  if (!parsed.accepted) return parsed;
  if (input.persisted_lower_bound !== null &&
    (!isCanonicalFarmOsProductionTargetExecutionTimestamp(input.persisted_lower_bound) ||
      Date.parse(parsed.evidence.observed_lower_bound) < Date.parse(input.persisted_lower_bound))) {
    return Object.freeze({ accepted: false, reason: "CLOCK_REGRESSED" });
  }
  return parsed;
}
