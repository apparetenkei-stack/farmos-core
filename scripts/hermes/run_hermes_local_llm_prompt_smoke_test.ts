import { runHermesLocalLlmPromptSmokeTestBoundary } from "./api_boundary/hermes_local_llm_prompt_smoke_test_boundary";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);

  if (index < 0) {
    return undefined;
  }

  const value = process.argv[index + 1];

  if (!value || value.startsWith("--")) {
    return undefined;
  }

  return value;
}

async function main() {
  const smoke = process.argv.includes("--smoke");
  const dryRun = process.argv.includes("--dry-run") || !smoke;

  const result = await runHermesLocalLlmPromptSmokeTestBoundary({
    provider: readArg("--provider"),
    endpoint: readArg("--endpoint"),
    model: readArg("--model"),
    dryRun,
    smoke,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
