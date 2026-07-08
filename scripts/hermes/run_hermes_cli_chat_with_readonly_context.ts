import { runHermesCliChatRuntimeFromEnv } from "./llm_runtime/hermes_cli_chat_runtime";

async function main(): Promise<void> {
  const result = await runHermesCliChatRuntimeFromEnv();

  console.log(JSON.stringify(result, null, 2));

  if (
    result.status === "runtime_error" ||
    result.status === "timeout" ||
    result.status === "bad_request" ||
    result.status === "blocked"
  ) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
