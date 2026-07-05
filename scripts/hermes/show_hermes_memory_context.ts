import { readHermesMemoryContext } from "./api_boundary/hermes_memory_context_read_boundary";

function readArgValue(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const proposalId = readArgValue("--proposal-id");

  const result = await readHermesMemoryContext({
    proposalId,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result !== "ok") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
