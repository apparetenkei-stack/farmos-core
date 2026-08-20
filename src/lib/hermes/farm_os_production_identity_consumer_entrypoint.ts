import {
  readTrustedFarmOsProductionTargetLiveEvidenceV2,
  type FarmOsProductionTargetLiveEvidenceCapability,
} from "./farm_os_production_identity_runtime_evidence_v2";
import {
  FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX,
  evaluateFarmOsProductionPrefixFingerprint,
} from "./farm_os_production_prefix_fingerprint_matrix_authority";
import type { FarmOsDay150ApprovedExpectedCatalogCapability } from
  "./farm_os_day150_prefix_expected_catalog_derivation";
import type { FarmOsDay150ObservedSemanticFingerprintCapability,
  FarmOsDay150TrustedEvaluationClockCapability } from
  "./farm_os_day150_prefix_initial_catalog_authority";
import { readFarmOsDay150ObservedSemanticFingerprintEvidence } from
  "./farm_os_day150_prefix_initial_catalog_authority";

export const FARM_OS_PRODUCTION_IDENTITY_CONSUMER_ENTRYPOINT =
  "farmos.production-identity-consumer-entrypoint.v1" as const;
export type FarmOsProductionIdentityConsumerProposal = Readonly<{
  proposal_type: "STABLE_CHANGES_RECONCILIATION_CANDIDATE";
  live_evidence_digest: `sha256:${string}`;
  target_identity_digest: `sha256:${string}`;
  prefix_result: "EXACT";
  requires_human_approval: true;
  business_write_performed: false;
  migration_apply_performed: false;
  production_activation_performed: false;
}>;

export function createFarmOsProductionIdentityConsumerProposal(input: Readonly<{
  live_evidence: FarmOsProductionTargetLiveEvidenceCapability;
  trusted_clock_capability: FarmOsDay150TrustedEvaluationClockCapability | unknown;
  prefix_observations: readonly Readonly<{ migration_id: string;
    approved_expected: FarmOsDay150ApprovedExpectedCatalogCapability | unknown;
    observed_authority_id: "farmos.production-readonly-catalog-collector.v1";
    observed_semantic_evidence: FarmOsDay150ObservedSemanticFingerprintCapability | unknown }>[];
}>): FarmOsProductionIdentityConsumerProposal | null {
  const evidence = readTrustedFarmOsProductionTargetLiveEvidenceV2(input.live_evidence);
  if (!evidence || input.prefix_observations.length !==
    FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX.length) return null;
  const ids = new Set(input.prefix_observations.map((entry) => entry.migration_id));
  if (ids.size !== FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX.length ||
    FARM_OS_PRODUCTION_PREFIX_FINGERPRINT_MATRIX.some((entry) => !ids.has(entry.migration_id)) ||
    input.prefix_observations.some((entry) =>
      evaluateFarmOsProductionPrefixFingerprint({ ...entry,
        observed_fingerprint: readFarmOsDay150ObservedSemanticFingerprintEvidence(
          entry.observed_semantic_evidence)?.fingerprint ?? null,
        observed_target_identity_digest: evidence.target_identity_digest,
        trusted_clock_capability: input.trusted_clock_capability }).result !== "EXACT")) return null;
  return Object.freeze({ proposal_type: "STABLE_CHANGES_RECONCILIATION_CANDIDATE",
    live_evidence_digest: evidence.live_evidence_digest,
    target_identity_digest: evidence.target_identity_digest, prefix_result: "EXACT",
    requires_human_approval: true, business_write_performed: false,
    migration_apply_performed: false, production_activation_performed: false });
}

export const FARM_OS_PRODUCTION_IDENTITY_CONSUMER_BOUNDARY = Object.freeze({
  implementation_status: "SOURCE_IMPLEMENTED_DEFAULT_DISABLED",
  runtime_bound: false, production_callable: false, proposal_first: true,
  direct_business_write: false, migration_apply: false, external_operations: 0,
} as const);
