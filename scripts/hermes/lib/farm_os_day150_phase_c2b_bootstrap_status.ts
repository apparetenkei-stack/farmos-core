import type {
  FarmOsDay150C2bBootstrapReplayFailureReason,
} from "./farm_os_day150_phase_c2b_bootstrap_generation_reducer";
import { replayFarmOsDay150C2bBootstrapSourceChainCandidate } from
  "./farm_os_day150_phase_c2b_bootstrap_generation_reducer";
import type { FarmOsDay150C2bBootstrapSourceProjection } from
  "./farm_os_day150_phase_c2b_bootstrap_ledger_contract";

export const FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY =
  "farmos.day150-c2b-bootstrap-source-status.v1" as const;
export const FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_REVISION = 1 as const;

export type FarmOsDay150C2bBootstrapSourceStatus =
  | Readonly<{
    schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY;
    authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY;
    authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_REVISION;
    status: "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE";
    bootstrap_manifest_digest: `sha256:${string}`;
    candidate_generation: number;
    candidate_head_digest: `sha256:${string}`;
    source_projection: FarmOsDay150C2bBootstrapSourceProjection &
      Readonly<{ discriminator: "SOURCE_PROJECTION_ONLY" }>;
  }>
  | Readonly<{
    schema_version: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY;
    authority_id: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY;
    authority_revision: typeof FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_REVISION;
    status: "INVALID_SOURCE_CHAIN_CANDIDATE";
    reason: FarmOsDay150C2bBootstrapReplayFailureReason;
  }>;

export function projectFarmOsDay150C2bBootstrapSourceStatus(
  sourceChainInput: unknown,
): FarmOsDay150C2bBootstrapSourceStatus {
  const replay = replayFarmOsDay150C2bBootstrapSourceChainCandidate(sourceChainInput);
  if (replay.classification === "INVALID_SOURCE_CHAIN_CANDIDATE") {
    return Object.freeze({
      schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY,
      authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY,
      authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_REVISION,
      status: "INVALID_SOURCE_CHAIN_CANDIDATE",
      reason: replay.reason,
    });
  }
  const sourceProjection = Object.freeze({
    schema_version: replay.source_projection.schema_version,
    bootstrap_manifest_digest: replay.source_projection.bootstrap_manifest_digest,
    bootstrap_authority_state: "NOT_ACTIVE" as const,
    quarantine_state: replay.source_projection.quarantine_state,
    discriminator: "SOURCE_PROJECTION_ONLY" as const,
  });
  return Object.freeze({
    schema_version: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY,
    authority_id: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_AUTHORITY,
    authority_revision: FARM_OS_DAY150_C2B_BOOTSTRAP_SOURCE_STATUS_REVISION,
    status: "STRUCTURALLY_VALID_SOURCE_CHAIN_CANDIDATE",
    bootstrap_manifest_digest: replay.source_projection.bootstrap_manifest_digest,
    candidate_generation: replay.candidate_generation,
    candidate_head_digest: replay.candidate_head_digest,
    source_projection: sourceProjection,
  });
}
