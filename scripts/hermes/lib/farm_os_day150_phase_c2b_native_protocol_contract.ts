import {
  canonicalizeFarmOsProductionTargetExecutionContract,
  hashFarmOsProductionTargetExecutionContract,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";
import { snapshotFarmOsDay150C2bBootstrapData,
  type FarmOsDay150C2bBootstrapDataSnapshot } from
  "./farm_os_day150_phase_c2b_bootstrap_ledger_contract";

export const FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY =
  "farmos.day150-c2b-bootstrap-native-protocol.v1" as const;
export const FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_REVISION = 1 as const;
export const FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_DIGEST_DOMAIN =
  "farmos.day150-c2b-bootstrap-native-protocol.v1:message-body" as const;
export const FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_OPERATIONS = Object.freeze([
  "BROKER_VALIDATE_BOOTSTRAP_CEREMONY_CANDIDATE",
  "BROKER_VALIDATE_ACTOR_PROVENANCE_CANDIDATE",
  "BROKER_OBSERVE_CLOCK_PROVENANCE_CANDIDATE",
  "WRITER_PUBLISH_RUNTIME_PROVENANCE_RECORD_CANDIDATE",
  "WRITER_READ_SANITIZED_RUNTIME_STATUS_CANDIDATE",
] as const);
export type FarmOsDay150C2bNativeProtocolOperation =
  typeof FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_OPERATIONS[number];
type Digest = `sha256:${string}`;

type Common = Readonly<{
  schema_version: typeof FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY;
  authority_id: typeof FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY;
  authority_revision: typeof FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_REVISION;
  operation: FarmOsDay150C2bNativeProtocolOperation;
  request_reference_digest_candidate: Digest;
  installation_profile_digest_candidate: Digest;
  native_profile_digest_candidate: Digest;
  protocol_profile_digest_candidate: Digest;
}>;
export type FarmOsDay150C2bNativeProtocolRequestBody = Common & Readonly<{
  message_kind: "BOUNDED_REQUEST_CANDIDATE";
  payload_reference_digest_candidate: Digest;
  runtime_record_candidate_digest: Digest | null;
}>;
export type FarmOsDay150C2bNativeProtocolResponseBody = Common & Readonly<{
  message_kind: "BOUNDED_RESPONSE_CANDIDATE";
  response_state: "ACK_CANDIDATE_NOT_RUNTIME_EVIDENCE" | "REJECTED_CANDIDATE" |
    "OUTCOME_UNKNOWN_CANDIDATE";
  result_reference_digest_candidate: Digest | null;
  sanitized_reason: "INVALID_REQUEST" | "POLICY_REJECTED" | "OUTCOME_UNKNOWN" | null;
}>;
export type FarmOsDay150C2bNativeProtocolMessageBody =
  | FarmOsDay150C2bNativeProtocolRequestBody | FarmOsDay150C2bNativeProtocolResponseBody;
export type FarmOsDay150C2bNativeProtocolMessageSourceCandidate = Readonly<{
  message_body: FarmOsDay150C2bNativeProtocolMessageBody;
  message_digest: Digest;
}>;
export type FarmOsDay150C2bNativeProtocolFailureReason =
  | "UNTRUSTED_NATIVE_PROTOCOL_INPUT" | "INVALID_NATIVE_PROTOCOL_ENVELOPE"
  | "NATIVE_PROTOCOL_AUTHORITY_MISMATCH" | "UNKNOWN_NATIVE_PROTOCOL_MESSAGE_KIND"
  | "UNKNOWN_NATIVE_PROTOCOL_OPERATION" | "INVALID_NATIVE_PROTOCOL_REQUEST"
  | "INVALID_NATIVE_PROTOCOL_RESPONSE" | "MALFORMED_NATIVE_PROTOCOL_DIGEST"
  | "NATIVE_PROTOCOL_DIGEST_MISMATCH";
export type FarmOsDay150C2bNativeProtocolParseResult =
  | Readonly<{ classification: "STRUCTURALLY_VALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE";
    native_authenticity_established: false; peer_authenticity_established: false;
    storage_publication_established: false; message: FarmOsDay150C2bNativeProtocolMessageSourceCandidate }>
  | Readonly<{ classification: "INVALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE";
    reason: FarmOsDay150C2bNativeProtocolFailureReason }>;

const SHA256 = /^sha256:[a-f0-9]{64}$/u;
const MESSAGE_KEYS = Object.freeze({
  BOUNDED_REQUEST_CANDIDATE: ["schema_version", "authority_id", "authority_revision",
    "message_kind", "operation", "request_reference_digest_candidate",
    "installation_profile_digest_candidate", "native_profile_digest_candidate",
    "protocol_profile_digest_candidate", "payload_reference_digest_candidate",
    "runtime_record_candidate_digest"],
  BOUNDED_RESPONSE_CANDIDATE: ["schema_version", "authority_id", "authority_revision",
    "message_kind", "operation", "request_reference_digest_candidate",
    "installation_profile_digest_candidate", "native_profile_digest_candidate",
    "protocol_profile_digest_candidate", "response_state", "result_reference_digest_candidate",
    "sanitized_reason"],
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
function invalid(reason: FarmOsDay150C2bNativeProtocolFailureReason):
FarmOsDay150C2bNativeProtocolParseResult {
  return Object.freeze({ classification: "INVALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE", reason });
}
function snapshotBody(body: FarmOsDay150C2bNativeProtocolMessageBody):
FarmOsDay150C2bNativeProtocolMessageBody {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(body);
  if (!snapshot.accepted || !record(snapshot.snapshot)) {
    throw new TypeError("R4_1_NATIVE_PROTOCOL_BODY_NOT_ORDINARY_DATA");
  }
  return snapshot.snapshot as unknown as FarmOsDay150C2bNativeProtocolMessageBody;
}
export function canonicalizeFarmOsDay150C2bNativeProtocolMessageBody(
  body: FarmOsDay150C2bNativeProtocolMessageBody,
): string { return canonicalizeFarmOsProductionTargetExecutionContract(snapshotBody(body)); }
export function computeFarmOsDay150C2bNativeProtocolMessageDigest(
  body: FarmOsDay150C2bNativeProtocolMessageBody,
): Digest {
  return hashFarmOsProductionTargetExecutionContract(
    FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_DIGEST_DOMAIN, snapshotBody(body));
}
export function createFarmOsDay150C2bNativeProtocolMessageSourceCandidate(
  body: FarmOsDay150C2bNativeProtocolMessageBody,
): FarmOsDay150C2bNativeProtocolMessageSourceCandidate {
  const safe = snapshotBody(body);
  const envelope = Object.freeze({ message_body: safe,
    message_digest: computeFarmOsDay150C2bNativeProtocolMessageDigest(safe) });
  const parsed = parseFarmOsDay150C2bNativeProtocolMessageSourceCandidate(envelope);
  if (parsed.classification !== "STRUCTURALLY_VALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE") {
    throw new TypeError(parsed.reason);
  }
  return parsed.message;
}

export function parseFarmOsDay150C2bNativeProtocolMessageSourceCandidate(
  value: unknown,
): FarmOsDay150C2bNativeProtocolParseResult {
  const snapshot = snapshotFarmOsDay150C2bBootstrapData(value);
  if (!snapshot.accepted) return invalid("UNTRUSTED_NATIVE_PROTOCOL_INPUT");
  const envelope = record(snapshot.snapshot);
  if (!envelope || !exactKeys(envelope, ["message_body", "message_digest"])) {
    return invalid("INVALID_NATIVE_PROTOCOL_ENVELOPE");
  }
  const body = record(envelope.message_body);
  if (!body || typeof body.message_kind !== "string" ||
    !Object.hasOwn(MESSAGE_KEYS, body.message_kind)) {
    return invalid("UNKNOWN_NATIVE_PROTOCOL_MESSAGE_KIND");
  }
  const kind = body.message_kind as keyof typeof MESSAGE_KEYS;
  if (!exactKeys(body, MESSAGE_KEYS[kind]) ||
    body.schema_version !== FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY ||
    body.authority_id !== FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_AUTHORITY ||
    body.authority_revision !== FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_REVISION) {
    return invalid("NATIVE_PROTOCOL_AUTHORITY_MISMATCH");
  }
  if (typeof body.operation !== "string" ||
    !(FARM_OS_DAY150_C2B_NATIVE_PROTOCOL_OPERATIONS as readonly string[]).includes(body.operation)) {
    return invalid("UNKNOWN_NATIVE_PROTOCOL_OPERATION");
  }
  if (!["request_reference_digest_candidate", "installation_profile_digest_candidate",
    "native_profile_digest_candidate", "protocol_profile_digest_candidate"]
    .every((key) => digest(body[key]))) {
    return invalid(kind === "BOUNDED_REQUEST_CANDIDATE" ? "INVALID_NATIVE_PROTOCOL_REQUEST"
      : "INVALID_NATIVE_PROTOCOL_RESPONSE");
  }
  if (kind === "BOUNDED_REQUEST_CANDIDATE") {
    const publish = body.operation === "WRITER_PUBLISH_RUNTIME_PROVENANCE_RECORD_CANDIDATE";
    if (!digest(body.payload_reference_digest_candidate) ||
      (publish ? !digest(body.runtime_record_candidate_digest) :
        body.runtime_record_candidate_digest !== null)) {
      return invalid("INVALID_NATIVE_PROTOCOL_REQUEST");
    }
  } else {
    const ack = body.response_state === "ACK_CANDIDATE_NOT_RUNTIME_EVIDENCE";
    const rejected = body.response_state === "REJECTED_CANDIDATE";
    const unknown = body.response_state === "OUTCOME_UNKNOWN_CANDIDATE";
    if ((!ack && !rejected && !unknown) ||
      (ack && (!digest(body.result_reference_digest_candidate) || body.sanitized_reason !== null)) ||
      (rejected && (body.result_reference_digest_candidate !== null ||
        !(body.sanitized_reason === "INVALID_REQUEST" || body.sanitized_reason === "POLICY_REJECTED"))) ||
      (unknown && (body.result_reference_digest_candidate !== null ||
        body.sanitized_reason !== "OUTCOME_UNKNOWN"))) {
      return invalid("INVALID_NATIVE_PROTOCOL_RESPONSE");
    }
  }
  if (!digest(envelope.message_digest)) return invalid("MALFORMED_NATIVE_PROTOCOL_DIGEST");
  const safe = Object.freeze({ ...body }) as unknown as FarmOsDay150C2bNativeProtocolMessageBody;
  const expected = computeFarmOsDay150C2bNativeProtocolMessageDigest(safe);
  if (envelope.message_digest !== expected) return invalid("NATIVE_PROTOCOL_DIGEST_MISMATCH");
  return Object.freeze({
    classification: "STRUCTURALLY_VALID_NATIVE_PROTOCOL_MESSAGE_CANDIDATE",
    native_authenticity_established: false,
    peer_authenticity_established: false,
    storage_publication_established: false,
    message: Object.freeze({ message_body: safe, message_digest: expected }),
  });
}
