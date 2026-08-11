import { pathToFileURL } from "node:url";

import { runFarmOsPteC2bQualificationCli, type FarmOsPteC2bQualificationCliDependencies } from
  "./run_farm_os_production_target_execution_postgres_qualification";

export const FARM_OS_DAY150_PHASE_C2B_ISOLATED_POSTGRES_ENTRY = Object.freeze({
  schema_version:
    "farmos.production-target-execution-postgres-isolated-qualification-entry.v1",
  source_status: "B1_SOURCE_ONLY",
  b2_authorized: false,
  docker_operations: 0,
  postgres_operations: 0,
  migration_apply_operations: 0,
  verify_operations: 0,
  external_operations: 0,
  automatic_retry: 0,
  process_model: "INDEPENDENT_CONNECTIONS_SINGLE_NODE_PROCESS",
  tsx_cli_required: false,
  ipc_socket_required: false,
} as const);

export async function runAuthorizedFarmOsDay150PhaseC2bIsolatedPostgres(
  argv: readonly string[],
  dependencies: FarmOsPteC2bQualificationCliDependencies,
): Promise<number> {
  const result = await runFarmOsPteC2bQualificationCli(argv, dependencies);
  return result.exit_code;
}

// Direct invocation cannot manufacture the B2 human-authorization capability.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify({
    ...FARM_OS_DAY150_PHASE_C2B_ISOLATED_POSTGRES_ENTRY,
    result: "B2_NOT_AUTHORIZED",
  })}\n`);
  process.exitCode = 2;
}
