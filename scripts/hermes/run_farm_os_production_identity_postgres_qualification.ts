import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import {
  executeFarmOsProductionIdentityPostgresQualificationMatrix,
  serializeFarmOsProductionIdentityQualificationStdout,
} from "./lib/farm_os_production_identity_postgres_qualification_executor";
import {
  FarmOsProductionIdentityIsolatedPostgresPlatform,
} from "./lib/farm_os_production_identity_postgres_qualification_docker_adapter";
import {
  createFarmOsProductionIdentityPostgresQualificationExecutorErrorV4,
} from "./lib/farm_os_production_identity_postgres_qualification_contract";

const execFileAsync = promisify(execFile);
const REPOSITORY_ROOT_URL = new URL("../../", import.meta.url);
export const FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_SOURCE_FILES = Object.freeze([
  "package.json",
  "scripts/hermes/lib/farm_os_production_identity_postgres_qualification_executor.ts",
  "scripts/hermes/lib/farm_os_production_identity_postgres_qualification_docker_adapter.ts",
  "scripts/hermes/run_farm_os_production_identity_postgres_qualification.ts",
  "scripts/hermes/lib/farm_os_production_identity_postgres_qualification_contract.ts",
  "scripts/hermes/lib/farm_os_production_identity_isolated_postgres_fixture.ts",
  "src/lib/hermes/farm_os_production_postgres_bootstrap_query_authority.ts",
  "src/lib/hermes/farm_os_production_identity_query_v2_contract.ts",
  "src/lib/hermes/farm_os_production_identity_query_v3_authority.ts",
  "src/lib/hermes/farm_os_production_identity_query_v4_authority.ts",
  "src/lib/hermes/farm_os_production_identity_query_v5_authority.ts",
  "src/lib/hermes/farm_os_production_identity_runtime_foundation.ts",
  "scripts/sql/farm_os_production_postgres_version_bootstrap_query_v1.sql",
  "scripts/sql/farm_os_production_identity_readonly_v2.sql",
  "scripts/sql/farm_os_production_identity_readonly_v3.sql",
  "scripts/sql/farm_os_production_identity_readonly_v4.sql",
  "scripts/sql/farm_os_production_identity_readonly_v5.sql",
] as const);

export function parseFarmOsProductionIdentityQualificationCli(
  argv: readonly string[],
): Readonly<{ allow_image_pull: boolean }> | null {
  if (argv.length === 0) return Object.freeze({ allow_image_pull: false });
  if (argv.length === 1 && argv[0] === "--allow-image-pull") {
    return Object.freeze({ allow_image_pull: true });
  }
  return null;
}

async function readFixedRepositoryLineage(): Promise<Readonly<{
  git_commit: string;
  executor_source_sha256: `sha256:${string}`;
}>> {
  const repositoryRoot = fileURLToPath(REPOSITORY_ROOT_URL);
  const options = {
    cwd: repositoryRoot,
    encoding: "utf8",
    timeout: 5_000,
    maxBuffer: 16_384,
  } as const;
  const result = await execFileAsync("git", ["rev-parse", "HEAD"], options);
  const commit = String(result.stdout).trim();
  if (!/^[a-f0-9]{40}$/u.test(commit)) throw new Error("EVIDENCE_INVALID");
  await execFileAsync("git", ["ls-files", "--error-unmatch", "--",
    ...FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_SOURCE_FILES], options);
  await execFileAsync("git", ["diff", "--quiet", "HEAD", "--",
    ...FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_SOURCE_FILES], options);
  const digest = createHash("sha256");
  for (const relativePath of FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_SOURCE_FILES) {
    digest.update(relativePath, "utf8");
    digest.update("\0", "utf8");
    digest.update(await readFile(new URL(relativePath, REPOSITORY_ROOT_URL)));
    digest.update("\0", "utf8");
  }
  return Object.freeze({
    git_commit: commit,
    executor_source_sha256: `sha256:${digest.digest("hex")}`,
  });
}

export async function runFarmOsProductionIdentityPostgresQualificationCli(
  argv: readonly string[],
): Promise<number> {
  const parsed = parseFarmOsProductionIdentityQualificationCli(argv);
  if (parsed === null) {
    process.stdout.write(`${JSON.stringify(
      createFarmOsProductionIdentityPostgresQualificationExecutorErrorV4(),
    )}\n`);
    return 2;
  }
  const lineage = await readFixedRepositoryLineage();
  const result = await executeFarmOsProductionIdentityPostgresQualificationMatrix({
    git_commit: lineage.git_commit,
    executor_source_sha256: lineage.executor_source_sha256,
    allow_image_pull: parsed.allow_image_pull,
    platform: new FarmOsProductionIdentityIsolatedPostgresPlatform(),
  });
  for (const line of serializeFarmOsProductionIdentityQualificationStdout(result)) {
    process.stdout.write(`${line}\n`);
  }
  return result.failures.length === 0 ? 0 : 1;
}

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  runFarmOsProductionIdentityPostgresQualificationCli(process.argv.slice(2))
    .then((exitCode) => {
      process.exitCode = exitCode;
    })
    .catch(() => {
      process.stdout.write(`${JSON.stringify(
        createFarmOsProductionIdentityPostgresQualificationExecutorErrorV4(),
      )}\n`);
      process.exitCode = 1;
    });
}
