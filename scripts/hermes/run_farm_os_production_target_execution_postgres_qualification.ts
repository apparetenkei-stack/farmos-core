import { pathToFileURL } from "node:url";

import {
  FARM_OS_PTE_C2B_SOURCE_STATE,
  parseFarmOsPteC2bImageAuthority,
  validateFarmOsPteC2bExecutionWindow,
  type FarmOsPteC2bAuthorizationEnvelope,
  type FarmOsPteC2bImageAuthority,
} from "./lib/farm_os_production_target_execution_postgres_qualification_contract";
import {
  executeFarmOsPteC2bQualification,
  type FarmOsPteC2bQualificationAdapter,
  type FarmOsPteC2bRunResult,
  type FarmOsPteC2bSourceLineageResolver,
} from "./lib/farm_os_production_target_execution_postgres_qualification_executor";
import type { FarmOsPteC2bRealExecutionCapability } from
  "./lib/farm_os_production_target_execution_postgres_qualification_docker_adapter";

export type FarmOsPteC2bCliInput = Readonly<{
  execution_nonce: string;
  image_authority: FarmOsPteC2bImageAuthority;
  started_at_metadata: string;
  ended_at_metadata: string;
}>;
export type FarmOsPteC2bQualificationCliDependencies = Readonly<{
  adapter: FarmOsPteC2bQualificationAdapter;
  real_execution_capability: FarmOsPteC2bRealExecutionCapability | unknown;
  authorization: FarmOsPteC2bAuthorizationEnvelope | unknown;
  source_lineage_resolver: FarmOsPteC2bSourceLineageResolver;
}>;

export function parseFarmOsPteC2bQualificationCli(
  argv: readonly string[],
): FarmOsPteC2bCliInput | null {
  if (argv.length !== 8) return null;
  const pairs = new Map<string, string>();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (key === undefined || value === undefined || pairs.has(key)) return null;
    pairs.set(key, value);
  }
  if ([...pairs.keys()].sort().join("\0") !== ["--ended-at-metadata",
    "--execution-nonce", "--image", "--started-at-metadata"].sort().join("\0")) return null;
  const executionNonce = pairs.get("--execution-nonce") ?? "";
  const runtimeReference = pairs.get("--image") ?? "";
  const digest = runtimeReference.includes("@") ? runtimeReference.slice(
    runtimeReference.indexOf("@") + 1) : "";
  const image = parseFarmOsPteC2bImageAuthority({
    repository: "docker.io/library/postgres",
    repository_digest: digest,
    runtime_reference: runtimeReference,
  });
  if (!/^[a-f0-9]{24}$/u.test(executionNonce) || image === null ||
    !validateFarmOsPteC2bExecutionWindow(
      pairs.get("--started-at-metadata"), pairs.get("--ended-at-metadata"))) return null;
  return Object.freeze({
    execution_nonce: executionNonce,
    image_authority: image,
    started_at_metadata: pairs.get("--started-at-metadata") ?? "",
    ended_at_metadata: pairs.get("--ended-at-metadata") ?? "",
  });
}

export async function runFarmOsPteC2bQualificationCli(
  argv: readonly string[],
  dependencies: FarmOsPteC2bQualificationCliDependencies,
): Promise<Readonly<{ exit_code: 0 | 1 | 2; result: FarmOsPteC2bRunResult | null }>> {
  const parsed = parseFarmOsPteC2bQualificationCli(argv);
  if (parsed === null) return Object.freeze({ exit_code: 2, result: null });
  const result = await executeFarmOsPteC2bQualification({ ...parsed, ...dependencies });
  return Object.freeze({ exit_code: result.classification === "QUALIFIED" ? 0 : 1, result });
}

// Direct execution remains fail-closed until B2 supplies an explicitly approved real adapter.
if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.stdout.write(`${JSON.stringify({
    schema_version: "farmos.production-target-execution-postgres-qualification-cli.v1",
    source_state: FARM_OS_PTE_C2B_SOURCE_STATE,
    result: "B2_NOT_AUTHORIZED",
    docker_operations: 0,
    postgres_operations: 0,
  })}\n`);
  process.exitCode = 2;
}
