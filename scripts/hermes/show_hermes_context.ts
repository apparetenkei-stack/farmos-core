import { readHermesProposalContext } from "./api_boundary/hermes_context_read_api_boundary";

function readOption(args: string[], name: string): string | null {
  const index = args.indexOf(name);

  if (index === -1) {
    return null;
  }

  const value = args[index + 1];

  if (!value || value.startsWith("--")) {
    return null;
  }

  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  if (args.includes("--commit") || args.includes("--apply")) {
    console.log(
      JSON.stringify(
        {
          result: "bad_request",
          error:
            "Day38 Hermes context snapshot is read-only and does not support mutation flags.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const result = await readHermesProposalContext({
    proposalId: readOption(args, "--proposal-id") ?? "",
  });

  console.log(JSON.stringify(result, null, 2));

  if (
    result.result === "ok" ||
    result.result === "not_found"
  ) {
    return;
  }

  process.exit(1);
}

main().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
