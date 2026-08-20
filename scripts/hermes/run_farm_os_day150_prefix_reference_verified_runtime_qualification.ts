import { resolve } from "node:path";

import { resolveFarmOsDay150PrefixReferenceArtifactRepositoryRoot } from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority";

const verifiedRuntimeRoot = process.env.FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT;
if (verifiedRuntimeRoot === undefined || resolve(verifiedRuntimeRoot) !== process.cwd() ||
  process.env.TSX_TSCONFIG_PATH !== resolve(verifiedRuntimeRoot, "tsconfig.json")) {
  throw new Error("DAY150_VERIFIED_RUNTIME_QUALIFICATION_ENVIRONMENT_REJECTED");
}

const { qualifyFarmOsDay150RepositoryApprovalLineageContinuity } = await import(
  "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation"
);
const { FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR } = await import(
  "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority"
);
const artifactPathAuthority = resolveFarmOsDay150PrefixReferenceArtifactRepositoryRoot({
  module_repository_root: resolve(import.meta.dirname, "../.."),
});
const result = await qualifyFarmOsDay150RepositoryApprovalLineageContinuity();
process.stdout.write(`${JSON.stringify({ ...result,
  artifact_path_authority: { ...artifactPathAuthority,
    attempt_claim_path: resolve(artifactPathAuthority.repository_root,
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.attempt_claim),
    consumption_marker_path: resolve(artifactPathAuthority.repository_root,
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths
        .consumption_marker),
    success_receipt_path: resolve(artifactPathAuthority.repository_root,
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths.success_receipt),
    terminal_receipt_path: resolve(artifactPathAuthority.repository_root,
      FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.durable_paths
        .terminal_outcome_receipt!) },
  active_execution_revision:
    FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_DESCRIPTOR.authorization_revision,
  verified_runtime_root: verifiedRuntimeRoot,
  verified_tsconfig_path: process.env.TSX_TSCONFIG_PATH,
  executable_source_digest: process.env.FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST,
  load_target: import.meta.url,
})}\n`);
