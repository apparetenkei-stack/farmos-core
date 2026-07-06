import { runHermesLocalLlmRuntimeHealthCheckBoundary } from "./api_boundary/hermes_local_llm_runtime_health_check_boundary";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  return process.argv[index + 1];
}

async function main() {
  const provider = readArg("--provider") ?? "local_llm_disabled";
  const dryRun = process.argv.includes("--dry-run");

  const result = runHermesLocalLlmRuntimeHealthCheckBoundary({
    provider,
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result !== "ok") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
