import { reviewHermesProposalLoopCommand } from "./api_boundary/hermes_proposal_review_loop_command_boundary";

type ParsedArgs = {
  proposal_id?: string;
  action?: string;
  reviewed_by?: string;
  reason?: string;
  dry_run?: boolean;
  confirm_persistent_review_write?: boolean;
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    dry_run: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--proposal-id") {
      parsed.proposal_id = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--action") {
      parsed.action = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--reviewed-by") {
      parsed.reviewed_by = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--reason") {
      parsed.reason = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--dry-run") {
      parsed.dry_run = true;
      continue;
    }

    if (arg === "--no-dry-run") {
      parsed.dry_run = false;
      continue;
    }

    if (arg === "--confirm-persistent-review-write") {
      parsed.confirm_persistent_review_write = true;
      continue;
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const result = await reviewHermesProposalLoopCommand({
    proposal_id: args.proposal_id ?? "",
    action: args.action ?? "",
    reviewed_by: args.reviewed_by,
    reason: args.reason,
    dry_run: args.dry_run,
    confirm_persistent_review_write: args.confirm_persistent_review_write,
  });

  console.log(JSON.stringify(result, null, 2));

  if (result.result !== "ok") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
