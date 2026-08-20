import { createHash } from "node:crypto";
import {
  readFarmOsDay150ApprovedExpectedCatalog,
  type FarmOsDay150ApprovedExpectedCatalogCapability,
} from "./farm_os_day150_prefix_expected_catalog_derivation";
import { readFarmOsDay150ObservedSemanticFingerprintEvidence,
  readFarmOsDay150TrustedEvaluationClock } from
  "./farm_os_day150_prefix_initial_catalog_authority";

export const FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX_AUTHORITY =
  "farmos.production-prefix-fingerprint-matrix.v1" as const;
const PREFIXES = Object.freeze([
  ["202607260001_eligible_proposal_persistence",
    "sha256:41fbbfb931f03ad42c0c52159749fa8529c84321d6fcc643930c2b03c5c2ee4b"],
  ["202607300001_daily_operational_projection_candidate_foundation",
    "sha256:350489282b921b879a9c4fab8280cfd38ff7432ed75cc70a905a7dabd45846bf"],
  ["202607310001_daily_operational_projection_candidate_activation",
    "sha256:e55b7b2c33d432b37d9733d599f8ed4dd7de99a82fb64c5f90158dae7addbbc2"],
  ["202608030001_daily_operational_projection_command_ledger",
    "sha256:98504d23be1922d339acf0c7384ad1a5f9b6257e44a07a9073200b21bd79ef0a"],
  ["202608070001_stable_changes_consumer_persistence",
    "sha256:835b76ba23380d388c3532136564a5c83d04a2e9decf473726ef971ced8c6de0"],
] as const);

export type FarmOsProductionPrefixFingerprintMatrixEntry = Readonly<{
  migration_id: typeof PREFIXES[number][0]; sequence: number;
  artifact_sha256: `sha256:${string}`;
  expected_authority_id: `farmos.expected-catalog-fingerprint.${string}.v1`;
  observed_authority_id: "farmos.production-readonly-catalog-collector.v1";
  comparison: "EXACT_ID_AND_FINGERPRINT_ONLY";
  mismatch: "FAIL_CLOSED_CONFLICT";
  expected_source_status: "APPROVED_EXPECTED_CATALOG_AUTHORITY_ESTABLISHED";
  observed_source_status: "SOURCE_IMPLEMENTED_PRODUCTION_NOT_COLLECTED";
  evidence_digest: `sha256:${string}`;
}>;

const hash = (value: string): `sha256:${string}` =>
  `sha256:${createHash("sha256").update(value).digest("hex")}`;
export const FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX = Object.freeze(
  PREFIXES.map(([migrationId, artifact], index) => {
    const base = {
      migration_id: migrationId, sequence: index + 1,
      artifact_sha256: artifact,
      expected_authority_id: `farmos.expected-catalog-fingerprint.${migrationId}.v1` as const,
      observed_authority_id: "farmos.production-readonly-catalog-collector.v1" as const,
      comparison: "EXACT_ID_AND_FINGERPRINT_ONLY" as const,
      mismatch: "FAIL_CLOSED_CONFLICT" as const,
      expected_source_status:
        "APPROVED_EXPECTED_CATALOG_AUTHORITY_ESTABLISHED" as const,
      observed_source_status: "SOURCE_IMPLEMENTED_PRODUCTION_NOT_COLLECTED" as const,
    };
    return Object.freeze({ ...base, evidence_digest: hash(JSON.stringify(base)) });
  }),
);

export function evaluateFarmOsProductionPrefixFingerprint(input: Readonly<{
  migration_id: string;
  approved_expected: FarmOsDay150ApprovedExpectedCatalogCapability | unknown;
  observed_authority_id: string; observed_fingerprint: `sha256:${string}` | null;
  observed_target_identity_digest?: `sha256:${string}`;
  observed_semantic_evidence?: unknown;
  trusted_clock_capability?: unknown;
}>): Readonly<{ result: "EXACT" | "NOT_COLLECTED" | "CONFLICT"; fail_closed: boolean }> {
  const entry = FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX.find(
    (candidate) => candidate.migration_id === input.migration_id);
  const approved = readFarmOsDay150ApprovedExpectedCatalog(input.approved_expected);
  const observed = readFarmOsDay150ObservedSemanticFingerprintEvidence(
    input.observed_semantic_evidence);
  const trustedNow = readFarmOsDay150TrustedEvaluationClock(input.trusted_clock_capability);
  if (!entry || !approved || approved.authority_id !== entry.expected_authority_id ||
    approved.authority_revision !== 1 ||
    approved.expected_authority.migration_id !== entry.migration_id ||
    approved.expected_authority.artifact_sha256 !== entry.artifact_sha256 ||
    entry.observed_authority_id !== input.observed_authority_id || !observed ||
    observed.migration_id !== input.migration_id ||
    observed.collector_authority_id !== input.observed_authority_id ||
    observed.target_identity_digest !== input.observed_target_identity_digest ||
    trustedNow === null || Date.parse(trustedNow) < Date.parse(observed.observed_at) ||
    Date.parse(trustedNow) >= Date.parse(observed.expires_at) ||
    observed.fingerprint_version !== approved.expected_authority.fingerprint_version) {
    return Object.freeze({ result: "CONFLICT", fail_closed: true });
  }
  if (input.observed_fingerprint === null) {
    return Object.freeze({ result: "NOT_COLLECTED", fail_closed: true });
  }
  if (!/^sha256:[a-f0-9]{64}$/u.test(input.observed_fingerprint) ||
    input.observed_fingerprint !== observed.fingerprint ||
    observed.fingerprint !== approved.expected_authority.expected_fingerprint) {
    return Object.freeze({ result: "CONFLICT", fail_closed: true });
  }
  return Object.freeze({ result: "EXACT", fail_closed: false });
}

export const FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX_STATUS = Object.freeze({
  required_prefix_count: 5, matrix_complete: true,
  candidate_generation_path_complete: true, approved_authority_count: 5,
  exact_id_only: true, automatic_selection: false, production_observation_count: 0,
} as const);
