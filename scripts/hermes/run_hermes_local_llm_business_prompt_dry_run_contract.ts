import { runHermesLocalLlmBusinessPromptDryRunContractBoundary } from "./api_boundary/hermes_local_llm_business_prompt_dry_run_contract_boundary";

function getArgValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);

  if (index === -1) {
    return undefined;
  }

  const value = args[index + 1];

  if (value === undefined || value.startsWith("--")) {
    return undefined;
  }

  return value;
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  const provider = getArgValue(args, "--provider");
  const sample = getArgValue(args, "--sample");
  const dryRun = args.includes("--dry-run") ? true : args.includes("--no-dry-run") ? false : true;

  const result = runHermesLocalLlmBusinessPromptDryRunContractBoundary({
    provider,
    sample,
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
