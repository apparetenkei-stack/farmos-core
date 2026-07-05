import { runHermesLlmAdapterSwitchBoundary } from "./api_boundary/hermes_llm_adapter_switch_boundary";

function readArg(args: string[], name: string, fallback: string): string {
  const index = args.indexOf(name);

  if (index === -1) {
    return fallback;
  }

  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    return fallback;
  }

  return value;
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  const message = readArg(
    args,
    "--message",
    "今のHermes提案レビュー状況を教えて",
  );

  const provider = readArg(args, "--provider", "mock");
  const dryRun = args.includes("--dry-run");

  const result = await runHermesLlmAdapterSwitchBoundary({
    userMessage: message,
    provider,
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result === "error") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
