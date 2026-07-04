import { appendProposalReviewDecisionAuditEventCommand } from "./api_boundary/proposal_review_decision_audit_append_command_boundary";

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

  const result = await appendProposalReviewDecisionAuditEventCommand({
    input: {
      proposalId: readOption(args, "--proposal-id") ?? "",
      decisionType: readOption(args, "--decision-type") ?? "",
      decisionNote: readOption(args, "--decision-note"),
      decidedBy: readOption(args, "--decided-by") ?? "",
      decidedByRole: readOption(args, "--decided-by-role") ?? "",
      decisionSource: readOption(args, "--decision-source") ?? "",
    },
    commit,
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
