import { createHash } from "node:crypto";

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID =
  "farmos.production-target-evidence-command-id.v1" as const;
export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION =
  "ACQUIRE_PRODUCTION_TARGET_IDENTITY_FORMAL_EVIDENCE" as const;

export const FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY = Object.freeze({
  authority_id: FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID,
  purpose: "BOUNDED_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY",
  preimage_fields: Object.freeze([
    "approval_id",
    "approval_receipt_id",
    "authority_id",
    "nonce_digest",
    "operation",
    "proposal_id",
    "query_artifact_sha256",
    "target_binding_digest",
  ] as const),
  canonical_serialization: "SORTED_KEY_CANONICAL_JSON_UTF8_NO_WHITESPACE_NO_LF",
  digest: "SHA-256_FULL_256_BITS",
  output_grammar: "^g2cmd_[a-f0-9]{64}$",
  output_length_ascii_bytes: 70,
  truncation: 0,
  implicit_trim: false,
  implicit_unicode_normalization: false,
  coercion: false,
  unknown_keys: "REJECT",
  missing_keys: "REJECT",
  legacy_command_approval_id_form: "REJECT_FOR_PRODUCTION_GATE_2",
  exact_once_semantics_claim: false,
} as const);

export type FarmOsProductionTargetEvidenceCommandIdentityPreimage = Readonly<{
  approval_id: string;
  approval_receipt_id: string;
  authority_id: typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID;
  nonce_digest: `sha256:${string}`;
  operation: typeof FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION;
  proposal_id: string;
  query_artifact_sha256: `sha256:${string}`;
  target_binding_digest: `sha256:${string}`;
}>;

export type FarmOsProductionTargetEvidenceCommandIdentityResult =
  | Readonly<{
    accepted: true;
    command_id: `g2cmd_${string}`;
    canonical_preimage: string;
  }>
  | Readonly<{
    accepted: false;
    reason:
      | "PREIMAGE_SCHEMA_INVALID"
      | "APPROVAL_ID_INVALID"
      | "APPROVAL_RECEIPT_ID_INVALID"
      | "AUTHORITY_ID_MISMATCH"
      | "NONCE_DIGEST_INVALID"
      | "OPERATION_MISMATCH"
      | "PROPOSAL_ID_INVALID"
      | "QUERY_ARTIFACT_SHA256_INVALID"
      | "TARGET_BINDING_DIGEST_INVALID";
  }>;

const PREIMAGE_KEYS = FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY.preimage_fields;
const BOUNDED_ID = /^[a-z0-9][a-z0-9._:-]{0,127}$/u;
const BOUNDED_RECEIPT_ID = /^[a-z0-9][a-z0-9._:/-]{0,199}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const COMMAND_ID = /^g2cmd_[a-f0-9]{64}$/u;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function exactKeys(value: Record<string, unknown>): boolean {
  const actual = Object.keys(value).sort();
  return actual.length === PREIMAGE_KEYS.length &&
    actual.every((key, index) => key === PREIMAGE_KEYS[index]);
}

export function canonicalizeFarmOsProductionTargetEvidenceCommandIdentity(
  input: unknown,
): FarmOsProductionTargetEvidenceCommandIdentityResult {
  if (!record(input) || !exactKeys(input)) {
    return Object.freeze({ accepted: false, reason: "PREIMAGE_SCHEMA_INVALID" });
  }
  if (typeof input.approval_id !== "string" || !BOUNDED_ID.test(input.approval_id)) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_ID_INVALID" });
  }
  if (typeof input.approval_receipt_id !== "string" ||
    !BOUNDED_RECEIPT_ID.test(input.approval_receipt_id)) {
    return Object.freeze({ accepted: false, reason: "APPROVAL_RECEIPT_ID_INVALID" });
  }
  if (input.authority_id !== FARM_OS_PRODUCTION_TARGET_EVIDENCE_COMMAND_IDENTITY_AUTHORITY_ID) {
    return Object.freeze({ accepted: false, reason: "AUTHORITY_ID_MISMATCH" });
  }
  if (typeof input.nonce_digest !== "string" || !DIGEST.test(input.nonce_digest)) {
    return Object.freeze({ accepted: false, reason: "NONCE_DIGEST_INVALID" });
  }
  if (input.operation !== FARM_OS_PRODUCTION_TARGET_EVIDENCE_OPERATION) {
    return Object.freeze({ accepted: false, reason: "OPERATION_MISMATCH" });
  }
  if (typeof input.proposal_id !== "string" || !BOUNDED_ID.test(input.proposal_id)) {
    return Object.freeze({ accepted: false, reason: "PROPOSAL_ID_INVALID" });
  }
  if (typeof input.query_artifact_sha256 !== "string" ||
    !DIGEST.test(input.query_artifact_sha256)) {
    return Object.freeze({ accepted: false, reason: "QUERY_ARTIFACT_SHA256_INVALID" });
  }
  if (typeof input.target_binding_digest !== "string" ||
    !DIGEST.test(input.target_binding_digest)) {
    return Object.freeze({ accepted: false, reason: "TARGET_BINDING_DIGEST_INVALID" });
  }

  const canonical = JSON.stringify({
    approval_id: input.approval_id,
    approval_receipt_id: input.approval_receipt_id,
    authority_id: input.authority_id,
    nonce_digest: input.nonce_digest,
    operation: input.operation,
    proposal_id: input.proposal_id,
    query_artifact_sha256: input.query_artifact_sha256,
    target_binding_digest: input.target_binding_digest,
  });
  return Object.freeze({
    accepted: true,
    command_id: `g2cmd_${createHash("sha256").update(canonical, "utf8").digest("hex")}`,
    canonical_preimage: canonical,
  });
}

export function isFarmOsProductionTargetEvidenceCommandId(
  value: unknown,
): value is `g2cmd_${string}` {
  return typeof value === "string" && Buffer.byteLength(value, "ascii") === 70 &&
    COMMAND_ID.test(value);
}

export function deriveFarmOsProductionTargetEvidenceCommandId(
  input: unknown,
): FarmOsProductionTargetEvidenceCommandIdentityResult {
  return canonicalizeFarmOsProductionTargetEvidenceCommandIdentity(input);
}
