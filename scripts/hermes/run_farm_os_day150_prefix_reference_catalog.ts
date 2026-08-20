import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

import {
  deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor,
  runFarmOsDay150PrefixReferenceVerifiedRuntimeChild,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_source_closure_authority";
import {
  gateFarmOsDay150PrefixReferenceRepositoryInvocation,
  issueFarmOsDay150PrefixReferenceInvocationContinuationCapability,
  loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord,
  publishFarmOsDay150PrefixReferenceHumanInvocationIssuance,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";
import {
  FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING,
  validateFarmOsDay150PrefixReferenceActiveExecutionBinding,
} from "../../src/lib/hermes/farm_os_day150_prefix_reference_migration_privilege_authority";

export function resolveFarmOsDay150PrefixReferencePublicBootstrapApproval(
  repositoryRoot: string,
  observedAt = new Date().toISOString(),
) {
  const active = FARM_OS_DAY150_PREFIX_REFERENCE_ACTIVE_EXECUTION_BINDING;
  if (!validateFarmOsDay150PrefixReferenceActiveExecutionBinding(active)) return null;
  const approval = loadFarmOsDay150PrefixReferenceRepositoryApprovalRecord({
    repository_root: repositoryRoot,
    clock: Object.freeze({ nowCanonicalUtc: () => observedAt }),
    candidate: active.approval_candidate,
  });
  if (!approval || approval.execution_authorization_id !== active.descriptor.authorization_id ||
    approval.authorization_revision !== active.descriptor.authorization_revision ||
    approval.authorization_digest !== active.descriptor.authorization_digest ||
    approval.plan_digest !== active.descriptor.execution_plan_digest ||
    approval.run_identity !== active.descriptor.run_identity ||
    approval.attempt_identity !== active.descriptor.attempt_identity ||
    approval.execution_descriptor_digest !==
      active.approval_candidate.execution_descriptor_digest) return null;
  const invocationGate = gateFarmOsDay150PrefixReferenceRepositoryInvocation({
    repository_root: repositoryRoot,
    clock: Object.freeze({ nowCanonicalUtc: () => observedAt }),
    requested_revision: active.descriptor.authorization_revision,
  });
  if (!invocationGate.new_invocation_permitted) return null;
  return Object.freeze({ approval, descriptor: active.descriptor,
    invocation_gate: invocationGate });
}

export function parseFarmOsDay150PrefixReferenceCatalogCli(argv: readonly string[]): boolean {
  return argv.length === 0;
}

export async function runFarmOsDay150PrefixReferencePublicBootstrapVerifiedRuntimeChild(
  repositoryRoot: string,
  observedAt: string,
  entryPath = "scripts/hermes/run_farm_os_day150_prefix_reference_catalog.ts",
  options?: Readonly<{ after_invocation_issuance?: () => void }>,
) {
  const bootstrapApproval = resolveFarmOsDay150PrefixReferencePublicBootstrapApproval(
    repositoryRoot, observedAt);
  if (bootstrapApproval === null) return null;
  const continuationCapability =
    issueFarmOsDay150PrefixReferenceInvocationContinuationCapability();
  await publishFarmOsDay150PrefixReferenceHumanInvocationIssuance({
    repository_root: repositoryRoot,
    approval: bootstrapApproval.approval,
    descriptor: bootstrapApproval.descriptor,
    continuation_capability: continuationCapability,
    issued_at: observedAt,
  });
  options?.after_invocation_issuance?.();
  return runFarmOsDay150PrefixReferenceVerifiedRuntimeChild({
    repository_root: repositoryRoot,
    files: deriveFarmOsDay150PrefixReferenceExecutableSourceClosureForDescriptor(
      bootstrapApproval.descriptor, repositoryRoot),
    expected_executable_source_digest: bootstrapApproval.approval.executable_source_digest,
    entry_path: entryPath,
    invocation_continuation_capability: continuationCapability,
  });
}

export async function runFarmOsDay150PrefixReferenceCatalogCli(argv: readonly string[]):
  Promise<number> {
  if (!parseFarmOsDay150PrefixReferenceCatalogCli(argv)) return 2;
  const verifiedRuntimeRoot = process.env.FARM_OS_DAY150_VERIFIED_RUNTIME_ROOT;
  if (verifiedRuntimeRoot === undefined || resolve(verifiedRuntimeRoot) !== process.cwd() ||
    process.env.TSX_TSCONFIG_PATH !== resolve(verifiedRuntimeRoot, "tsconfig.json")) {
    const repositoryRoot = process.cwd();
    if (process.env.FARM_OS_DAY150_BOOTSTRAP_CONFIG_PATH !==
      resolve(repositoryRoot, "tsconfig.json") || process.env.TSX_TSCONFIG_PATH !==
      resolve(repositoryRoot, "tsconfig.json")) return 1;
    const observedAt = new Date().toISOString();
    const child = await runFarmOsDay150PrefixReferencePublicBootstrapVerifiedRuntimeChild(
      repositoryRoot, observedAt);
    if (child === null) {
      process.stdout.write(`${JSON.stringify({ status: "EXECUTION_AUTHORIZATION_REJECTED",
        authorization_state: "NOT_AUTHORIZED", docker_mutations: 0,
        postgres_operations: 0, migration_operations: 0 })}\n`);
      return 1;
    }
    process.stdout.write(child.stdout);
    process.stderr.write(child.stderr);
    return child.exit_code;
  }
  if (process.env.FARM_OS_DAY150_VERIFIED_RUNTIME_SOURCE_DIGEST === undefined) return 1;
  const { executeFarmOsDay150PrefixReferenceCatalogOnce } = await import(
    "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation"
  );
  const result = await executeFarmOsDay150PrefixReferenceCatalogOnce();
  if (result.status !== "DAY150_PREFIX_REFERENCE_CATALOG_CANDIDATES_GENERATED") {
    process.stdout.write(`${JSON.stringify({ status: result.status,
      failed_boundary: result.failed_boundary, failure_code: result.failure_code,
      authorization_state: result.authorization_state,
      reconciliation_handoff: result.reconciliation_handoff,
      compensation_authority: result.compensation_authority,
      automatic_retry_count: result.automatic_retry_count,
      credentials_persisted: false })}\n`);
    return 1;
  }
  process.stdout.write(`${JSON.stringify({ status: result.status,
    authorization_id: result.authorization_id,
    authorization_revision: result.authorization_revision,
    authorization_consumed_once: result.authorization_consumed_once,
    candidates: result.candidates.map((candidate) => ({ migration_id: candidate.migration_id,
      candidate_identity_digest: candidate.candidate_identity_digest,
      candidate_expected_fingerprint: candidate.candidate_expected_fingerprint,
      snapshot_digest: candidate.snapshot_digest })),
    receipt_digest: result.receipt.receipt_digest, cleanup: result.cleanup,
    readiness: result.readiness,
    production_operations: 0, canonical_operations: 0 })}\n`);
  return 0;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFarmOsDay150PrefixReferenceCatalogCli(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  }).catch((error: unknown) => {
    const code = error instanceof Error && /^[A-Z0-9_]+$/u.test(error.message)
      ? error.message : "OUTCOME_UNKNOWN";
    process.stdout.write(`${JSON.stringify({ status: code,
      reconciliation_handoff: "DURABLE_ACTUAL_SCHEMA_READBACK_MANUAL_RECONCILIATION_REQUIRED",
      compensation_authority: "NOT_GRANTED_NO_AUTOMATIC_COMPENSATION",
      automatic_retry_count: 0, credentials_persisted: false })}\n`);
    process.exitCode = 1;
  });
}
