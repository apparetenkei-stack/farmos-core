import {
  ProposalReviewDecisionType,
  proposalReviewDecisionTypes,
  recordProposalReviewDecisionEvent,
} from "./api_boundary/proposal_review_decision_event_api_boundary";

type CliArgs = {
  proposalId?: string;
  decisionType?: string;
  decidedBy?: string;
  decidedByRole?: string;
  decisionNote?: string;
  decisionSource?: "local_cli" | "test" | "manual";
  commit: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2).filter((arg) => arg !== "--");
  const parsed: CliArgs = {
    commit: false,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--commit") {
      parsed.commit = true;
      continue;
    }

    const next = args[i + 1];

    if (arg === "--proposal-id") {
      parsed.proposalId = next;
      i += 1;
    } else if (arg === "--decision-type") {
      parsed.decisionType = next;
      i += 1;
    } else if (arg === "--decided-by") {
      parsed.decidedBy = next;
      i += 1;
    } else if (arg === "--decided-by-role") {
      parsed.decidedByRole = next;
      i += 1;
    } else if (arg === "--decision-note") {
      parsed.decisionNote = next;
      i += 1;
    } else if (arg === "--decision-source") {
      parsed.decisionSource = next as CliArgs["decisionSource"];
      i += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function assertDecisionType(value: string | undefined): ProposalReviewDecisionType {
  if (!value || !proposalReviewDecisionTypes.includes(value as ProposalReviewDecisionType)) {
    throw new Error(
      `--decision-type must be one of: ${proposalReviewDecisionTypes.join(", ")}`,
    );
  }

  return value as ProposalReviewDecisionType;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!args.proposalId) {
    throw new Error("--proposal-id is required");
  }

  if (!args.decidedBy) {
    throw new Error("--decided-by is required");
  }

  if (!args.decidedByRole) {
    throw new Error("--decided-by-role is required");
  }

  const result = await recordProposalReviewDecisionEvent({
    proposalId: args.proposalId,
    decisionType: assertDecisionType(args.decisionType),
    decidedBy: args.decidedBy,
    decidedByRole: args.decidedByRole,
    decisionNote: args.decisionNote,
    decisionSource: args.decisionSource ?? "local_cli",
    eventMetadata: {
      cli: true,
      day: 24,
      dry_run_default: true,
    },
    commit: args.commit,
  });

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        reason: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
