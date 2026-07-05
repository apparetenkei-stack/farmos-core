import { createHermesProposal } from "./api_boundary/hermes_proposal_writer_boundary";

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index < 0) {
    return undefined;
  }

  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    return undefined;
  }

  return value;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");

  const sourceProposalId = readOption(args, "--proposal-id");
  const commit = args.includes("--commit");

  const result = await createHermesProposal({
    sourceProposalId: sourceProposalId ?? "",
    dryRun: !commit,
    title: readOption(args, "--title"),
    body: readOption(args, "--body"),
    reason: readOption(args, "--reason"),
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
