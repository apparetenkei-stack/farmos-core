import { applyProposalReviewApplyPlanCommand } from "./api_boundary/proposal_review_apply_command_boundary";

type CliArgs = {
  proposalId: string | null;
  commit: boolean;
  appliedBy: string;
  appliedByRole: string;
};

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2).filter((arg) => arg !== "--");

  const parsed: CliArgs = {
    proposalId: null,
    commit: false,
    appliedBy: "hayate",
    appliedByRole: "owner",
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === "--proposal-id") {
      parsed.proposalId = args[i + 1] ?? null;
      i += 1;
      continue;
    }

    if (arg === "--commit") {
      parsed.commit = true;
      continue;
    }

    if (arg === "--applied-by") {
      parsed.appliedBy = args[i + 1] ?? "";
      i += 1;
      continue;
    }

    if (arg === "--applied-by-role") {
      parsed.appliedByRole = args[i + 1] ?? "";
      i += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return parsed;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args.proposalId) {
    console.error("Missing required argument: --proposal-id");
    process.exitCode = 1;
    return;
  }

  const result = await applyProposalReviewApplyPlanCommand({
    proposalId: args.proposalId,
    commit: args.commit,
    appliedBy: args.appliedBy,
    appliedByRole: args.appliedByRole,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result === "bad_request" || result.result === "error") {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
