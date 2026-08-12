import {
  hashFarmOsProductionTargetExecutionContract,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import { snapshotFarmOsDay150C2bBootstrapData,
  type FarmOsDay150C2bBootstrapDataSnapshot } from
  "./farm_os_day150_phase_c2b_bootstrap_ledger_contract";

export const FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY =
  "farmos.day150-c2b-bootstrap-sanitized-runtime-status.v1" as const;
export const FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-sanitized-runtime-status.v1:status-body" as const;
type Digest = `sha256:${string}`;

export type FarmOsDay150C2bSanitizedRuntimeStatusBody = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY;
  authority_id: typeof FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY;
  authority_revision: typeof FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_REVISION;
  source_semantics: "CALLER_SUPPLIED_STATUS_IS_NOT_AUTHORITY";
  ledger_state: "AVAILABLE_IF_TRUSTEDLY_SUPPLIED" | "UNAVAILABLE_IF_TRUSTEDLY_SUPPLIED" | "UNKNOWN";
  generation_candidate: number | null;
  head_digest_candidate: Digest | null;
  actor_state: "ESTABLISHED_IF_TRUSTEDLY_SUPPLIED" | "NOT_ESTABLISHED_IF_TRUSTEDLY_SUPPLIED" |
    "UNKNOWN";
  challenge_state: "OUTSTANDING_IF_TRUSTEDLY_SUPPLIED" | "NONE_IF_TRUSTEDLY_SUPPLIED" | "UNKNOWN";
  capability_state: "AVAILABLE_IF_TRUSTEDLY_SUPPLIED" | "NOT_AVAILABLE_IF_TRUSTEDLY_SUPPLIED" |
    "UNKNOWN";
  trusted_clock_state: "ESTABLISHED_IF_TRUSTEDLY_SUPPLIED" |
    "NOT_ESTABLISHED_IF_TRUSTEDLY_SUPPLIED" | "UNKNOWN";
  quarantine_state: "REQUIRED_IF_TRUSTEDLY_SUPPLIED" | "NOT_REQUIRED_IF_TRUSTEDLY_SUPPLIED" |
    "UNKNOWN";
  outcome_state: "KNOWN_IF_TRUSTEDLY_SUPPLIED" | "OUTCOME_UNKNOWN_IF_TRUSTEDLY_SUPPLIED" |
    "UNKNOWN";
  provenance_reference_digest_candidate: Digest | null;
}>;
export type FarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate = Readonly<{
  status_body: FarmOsDay150C2bSanitizedRuntimeStatusBody;
  status_digest: Digest;
}>;
export type FarmOsDay150C2bSanitizedRuntimeStatusParseResult =
  | Readonly<{ classification: "STRUCTURALLY_VALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE";
    runtime_authority_established: false; status: FarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate }>
  | Readonly<{ classification: "INVALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE";
    reason: "UNTRUSTED_STATUS_INPUT" | "INVALID_STATUS_ENVELOPE" | "STATUS_AUTHORITY_MISMATCH" |
      "INVALID_STATUS_FIELD" | "STATUS_CROSS_FIELD_INCONSISTENCY" |
      "MALFORMED_STATUS_DIGEST" | "STATUS_DIGEST_MISMATCH" }>;

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const BODY_KEYS = Object.freeze(["schema_version", "authority_id", "authority_revision",
  "source_semantics", "ledger_state", "generation_candidate", "head_digest_candidate",
  "actor_state", "challenge_state", "capability_state", "trusted_clock_state",
  "quarantine_state", "outcome_state", "provenance_reference_digest_candidate"] as const);
const ENUMS = Object.freeze({
  ledger_state: ["AVAILABLE_IF_TRUSTEDLY_SUPPLIED", "UNAVAILABLE_IF_TRUSTEDLY_SUPPLIED", "UNKNOWN"],
  actor_state: ["ESTABLISHED_IF_TRUSTEDLY_SUPPLIED", "NOT_ESTABLISHED_IF_TRUSTEDLY_SUPPLIED", "UNKNOWN"],
  challenge_state: ["OUTSTANDING_IF_TRUSTEDLY_SUPPLIED", "NONE_IF_TRUSTEDLY_SUPPLIED", "UNKNOWN"],
  capability_state: ["AVAILABLE_IF_TRUSTEDLY_SUPPLIED", "NOT_AVAILABLE_IF_TRUSTEDLY_SUPPLIED", "UNKNOWN"],
  trusted_clock_state: ["ESTABLISHED_IF_TRUSTEDLY_SUPPLIED",
    "NOT_ESTABLISHED_IF_TRUSTEDLY_SUPPLIED", "UNKNOWN"],
  quarantine_state: ["REQUIRED_IF_TRUSTEDLY_SUPPLIED", "NOT_REQUIRED_IF_TRUSTEDLY_SUPPLIED", "UNKNOWN"],
  outcome_state: ["KNOWN_IF_TRUSTEDLY_SUPPLIED", "OUTCOME_UNKNOWN_IF_TRUSTEDLY_SUPPLIED", "UNKNOWN"],
} as const);
function record(value: FarmOsDay150C2bBootstrapDataSnapshot):
Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, FarmOsDay150C2bBootstrapDataSnapshot>> : null;
}
function exactKeys(value: Readonly<Record<string, unknown>>, expected: readonly string[]): boolean {
  const actual = Object.keys(value).sort(); const keys = [...expected].sort();
  return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}
function digest(value: unknown): value is Digest {
  return typeof value === "string" && SHA256.test(value);
}
function invalid(reason: "UNTRUSTED_STATUS_INPUT" | "INVALID_STATUS_ENVELOPE" |
"STATUS_AUTHORITY_MISMATCH" | "INVALID_STATUS_FIELD" | "STATUS_CROSS_FIELD_INCONSISTENCY" |
"MALFORMED_STATUS_DIGEST" | "STATUS_DIGEST_MISMATCH"):
FarmOsDay150C2bSanitizedRuntimeStatusParseResult {
  return Object.freeze({ classification: "INVALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE", reason });
}
function snapshotBody(body: FarmOsDay150C2bSanitizedRuntimeStatusBody):
FarmOsDay150C2bSanitizedRuntimeStatusBody {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(body);
  if (!snapshot.accepted || !record(snapshot.snapshot)) {
    throw new TypeError("R4_1_STATUS_BODY_NOT_ORDINARY_DATA");
  }
  return snapshot.snapshot as unknown as FarmOsDay150C2bSanitizedRuntimeStatusBody;
}
export function computeFarmOsDay150C2bSanitizedRuntimeStatusDigest(
  body: FarmOsDay150C2bSanitizedRuntimeStatusBody,
): Digest {
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_DIGEST_DOMAIN, snapshotBody(body));
}
export function createFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate(
  body: FarmOsDay150C2bSanitizedRuntimeStatusBody,
): FarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate {
  const safe = snapshotBody(body);
  const envelope = Object.freeze({ status_body: safe,
    status_digest: computeFarmOsDay150C2bSanitizedRuntimeStatusDigest(safe) });
  const parsed = parseFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate(envelope);
  if (parsed.classification !== "STRUCTURALLY_VALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE") {
    throw new TypeError(parsed.reason);
  }
  return parsed.status;
}
export function parseFarmOsDay150C2bSanitizedRuntimeStatusSourceCandidate(
  value: unknown,
): FarmOsDay150C2bSanitizedRuntimeStatusParseResult {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(value);
  if (!snapshot.accepted) return invalid("UNTRUSTED_STATUS_INPUT");
  const envelope = record(snapshot.snapshot);
  if (!envelope || !exactKeys(envelope, ["status_body", "status_digest"])) {
    return invalid("INVALID_STATUS_ENVELOPE");
  }
  const body = record(envelope.status_body);
  if (!body || !exactKeys(body, BODY_KEYS) ||
    body.schema_version !== FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY ||
    body.authority_id !== FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_AUTHORITY ||
    body.authority_revision !== FARM_OS_DAY150_C2B_SANITIZED_RUNTIME_STATUS_REVISION ||
    body.source_semantics !== "CALLER_SUPPLIED_STATUS_IS_NOT_AUTHORITY") {
    return invalid("STATUS_AUTHORITY_MISMATCH");
  }
  for (const [key, values] of Object.entries(ENUMS)) {
    if (!(values as readonly unknown[]).includes(body[key])) return invalid("INVALID_STATUS_FIELD");
  }
  if (!(body.generation_candidate === null || (typeof body.generation_candidate === "number" &&
    Number.isSafeInteger(body.generation_candidate) && body.generation_candidate >= 0)) ||
    !(body.head_digest_candidate === null || digest(body.head_digest_candidate)) ||
    !(body.provenance_reference_digest_candidate === null ||
      digest(body.provenance_reference_digest_candidate))) return invalid("INVALID_STATUS_FIELD");
  if ((body.ledger_state === "AVAILABLE_IF_TRUSTEDLY_SUPPLIED") !==
      (body.generation_candidate !== null && body.head_digest_candidate !== null &&
        body.provenance_reference_digest_candidate !== null) ||
    (body.ledger_state !== "AVAILABLE_IF_TRUSTEDLY_SUPPLIED" &&
      (body.generation_candidate !== null || body.head_digest_candidate !== null ||
        body.provenance_reference_digest_candidate !== null))) {
    return invalid("STATUS_CROSS_FIELD_INCONSISTENCY");
  }
  if (!digest(envelope.status_digest)) return invalid("MALFORMED_STATUS_DIGEST");
  const safe = Object.freeze({ ...body }) as unknown as FarmOsDay150C2bSanitizedRuntimeStatusBody;
  const expected = computeFarmOsDay150C2bSanitizedRuntimeStatusDigest(safe);
  if (envelope.status_digest !== expected) return invalid("STATUS_DIGEST_MISMATCH");
  return Object.freeze({
    classification: "STRUCTURALLY_VALID_SANITIZED_RUNTIME_STATUS_SOURCE_CANDIDATE",
    runtime_authority_established: false,
    status: Object.freeze({ status_body: safe, status_digest: expected }),
  });
}
