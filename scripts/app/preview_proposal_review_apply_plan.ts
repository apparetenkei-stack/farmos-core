import { previewProposalReviewApplyPlan } from "./api_boundary/proposal_review_apply_plan_preview_read_api_boundary";

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
          result: "bad_request",
          error:
            "--commit is not supported by proposal review apply plan preview.",
        },
        null,
        2,
      ),
    );
    process.exit(1);
  }

  const result = await previewProposalReviewApplyPlan({
    proposalId: readOption(args, "--proposal-id") ?? "",
  });

  console.log(JSON.stringify(result, null, 2));

  if (
    result.result === "preview" ||
    result.result === "blocked" ||
    result.result === "not_found"
  ) {
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
