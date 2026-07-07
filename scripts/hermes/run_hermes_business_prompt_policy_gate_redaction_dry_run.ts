import { runHermesBusinessPromptPolicyGateRedactionBoundary } from "./api_boundary/hermes_business_prompt_policy_gate_redaction_boundary";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;

  return process.argv[index + 1];
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

async function main() {
  const provider = readArg("--provider") ?? "business_prompt_policy_gate";
  const sample = readArg("--sample");
  const dryRun = hasFlag("--no-dry-run") ? false : true;

  const result = await runHermesBusinessPromptPolicyGateRedactionBoundary({
    provider,
    dryRun,
    sample,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
