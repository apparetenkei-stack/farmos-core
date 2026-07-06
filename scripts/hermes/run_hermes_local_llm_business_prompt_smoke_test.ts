import { runHermesLocalLlmBusinessPromptSmokeTestBoundary } from "./api_boundary/hermes_local_llm_business_prompt_smoke_test_boundary";

type CliArgs = {
  provider?: string;
  endpoint?: string;
  model?: string;
  dryRun?: boolean;
  smoke?: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {};

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--") continue;

    if (arg === "--dry-run") {
      args.dryRun = true;
      continue;
    }

    if (arg === "--no-dry-run") {
      args.dryRun = false;
      continue;
    }

    if (arg === "--smoke") {
      args.smoke = true;
      continue;
    }

    if (arg === "--provider") {
      args.provider = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--endpoint") {
      args.endpoint = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--model") {
      args.model = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const result = await runHermesLocalLlmBusinessPromptSmokeTestBoundary({
    provider: args.provider,
    endpoint: args.endpoint,
    model: args.model,
    dryRun: args.dryRun,
    smoke: args.smoke,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result === "blocked" || result.result === "error") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
