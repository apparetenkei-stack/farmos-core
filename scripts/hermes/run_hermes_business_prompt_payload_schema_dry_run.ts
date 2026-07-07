import { runHermesBusinessPromptPayloadSchemaBoundary } from "./api_boundary/hermes_business_prompt_payload_schema_boundary";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;

  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith("--")) return undefined;

  return value;
}

async function main() {
  const provider = readArg("--provider") ?? "business_prompt_payload_schema";
  const sample = readArg("--sample");
  const prompt = readArg("--prompt");
  const userPrompt = readArg("--user-prompt");
  const userMessage = readArg("--user-message");
  const dryRunArg = readArg("--dry-run");
  const dryRun = dryRunArg === undefined ? true : dryRunArg !== "false";

  const result = await runHermesBusinessPromptPayloadSchemaBoundary({
    provider,
    dryRun,
    sample,
    prompt,
    userPrompt,
    userMessage,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
