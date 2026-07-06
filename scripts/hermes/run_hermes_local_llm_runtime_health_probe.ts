import { runHermesLocalLlmRuntimeHealthProbeBoundary } from "./api_boundary/hermes_local_llm_runtime_health_probe_boundary";

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  const provider = getArgValue(args, "--provider") ?? "local_llm_probe";
  const httpMethod = getArgValue(args, "--method");
  const dryRun = args.includes("--dry-run");
  const probe = args.includes("--probe");

  const result = await runHermesLocalLlmRuntimeHealthProbeBoundary({
    provider,
    dryRun,
    probe,
    httpMethod,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
