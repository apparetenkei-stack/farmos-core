import { runHermesChatInputDryRunBoundary } from "./api_boundary/hermes_chat_input_dry_run_boundary";

function readArg(args: string[], name: string): string | null {
  const index = args.indexOf(name);
  if (index === -1) {
    return null;
  }

  return args[index + 1] ?? null;
}

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  const messageFromFlag = readArg(args, "--message");
  const message =
    messageFromFlag ??
    args.filter((arg) => arg !== "--dry-run").join(" ").trim();

  const dryRun = args.includes("--dry-run");

  const result = await runHermesChatInputDryRunBoundary({
    message,
    dryRun,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result === "bad_request" || result.result === "error") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
