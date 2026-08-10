import { createHash } from "node:crypto";

export const FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY_ID =
  "farmos.postgres-cluster-system-identifier-digest.v1" as const;

export const FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY = Object.freeze({
  authority_id: FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY_ID,
  decimal_grammar: "[1-9][0-9]{0,19}",
  minimum: "1",
  maximum: "18446744073709551615",
  leading_zeros: "REJECT",
  canonical_serialization: "SORTED_KEY_CANONICAL_JSON_UTF8_NO_WHITESPACE_NO_LF",
  digest: "SHA-256",
  output_grammar: "sha256:<64 lowercase hexadecimal characters>",
  legacy_digest_compatibility: "NONE_REJECT_CONFUSION",
  raw_persistence: "FORBIDDEN",
  primary_security_property: "NON_PERSISTENCE_PLUS_ISOLATED_PROCESS_TERMINATION",
  javascript_string_zeroization_claim: false,
  mutable_buffer_clear: "BEST_EFFORT_ALLOWED",
} as const);

export type FarmOsPostgresClusterDigestResult =
  | Readonly<{ accepted: true; digest: `sha256:${string}` }>
  | Readonly<{
    accepted: false;
    reason: "DECIMAL_GRAMMAR_INVALID" | "DECIMAL_RANGE_INVALID";
  }>;

const DECIMAL = /^[1-9][0-9]{0,19}$/u;
const MAX_UINT64 = 18_446_744_073_709_551_615n;

export function canonicalizeFarmOsPostgresClusterSystemIdentifier(
  rawClusterSystemIdentifier: string,
): string | null {
  if (!DECIMAL.test(rawClusterSystemIdentifier)) return null;
  const parsed = BigInt(rawClusterSystemIdentifier);
  if (parsed < 1n || parsed > MAX_UINT64) return null;
  return JSON.stringify({
    authority_id: FARM_OS_POSTGRES_CLUSTER_SYSTEM_IDENTIFIER_DIGEST_AUTHORITY_ID,
    raw_cluster_system_identifier: rawClusterSystemIdentifier,
  });
}

export function digestFarmOsPostgresClusterSystemIdentifier(
  rawClusterSystemIdentifier: string,
): FarmOsPostgresClusterDigestResult {
  if (!DECIMAL.test(rawClusterSystemIdentifier)) {
    return Object.freeze({ accepted: false, reason: "DECIMAL_GRAMMAR_INVALID" });
  }
  const canonical = canonicalizeFarmOsPostgresClusterSystemIdentifier(
    rawClusterSystemIdentifier,
  );
  if (canonical === null) {
    return Object.freeze({ accepted: false, reason: "DECIMAL_RANGE_INVALID" });
  }
  return Object.freeze({
    accepted: true,
    digest: `sha256:${createHash("sha256").update(canonical, "utf8").digest("hex")}`,
  });
}
