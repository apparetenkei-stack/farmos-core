import { dryRunProposalReviewDecisionCommand } from "./api_boundary/proposal_review_decision_command_dry_run_boundary";

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

  if (args.includes("--commit")) {
    console.log(
      JSON.stringify(
        {
          result: "commit_not_supported_in_day29",
          dry_run: true,
          commands_executed: false,
          writes_performed: false,
          reason:
            "Day29 only validates review decision command payloads and constructs dry-run event candidates.",
        },
        null,
        2,
      ),
    );
    process.exit(2);
  }

  const result = await dryRunProposalReviewDecisionCommand({
    input: {
      proposalId: readOption(args, "--proposal-id") ?? "",
      decisionType: readOption(args, "--decision-type") ?? "",
      decisionNote: readOption(args, "--decision-note"),
      decidedBy: readOption(args, "--decided-by") ?? "",
      decidedByRole: readOption(args, "--decided-by-role") ?? "",
      decisionSource: readOption(args, "--decision-source") ?? "",
    },
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result === "ok") {
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
