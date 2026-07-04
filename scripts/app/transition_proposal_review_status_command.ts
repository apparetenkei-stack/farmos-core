import { transitionProposalReviewStatusCommand } from "./api_boundary/proposal_review_status_transition_command_boundary";

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

async function main() {
  const args = process.argv.slice(2).filter((arg) => arg !== "--");
  const commit = args.includes("--commit");

  const result = await transitionProposalReviewStatusCommand({
    input: {
      proposalId: readOption(args, "--proposal-id") ?? "",
      decisionEventId: readOption(args, "--decision-event-id") ?? "",
      transitionedBy: readOption(args, "--transitioned-by") ?? "",
      transitionedByRole: readOption(args, "--transitioned-by-role") ?? "",
      transitionSource: readOption(args, "--transition-source") ?? "",
      transitionNote: readOption(args, "--transition-note"),
    },
    commit,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result === "ok" || result.result === "transition_not_required") {
    return;
  }

  process.exit(1);
}

main().catch((error) => {
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
