import { readProposalReviewApplyHistory } from "./api_boundary/proposal_review_apply_history_read_api_boundary";

function readArg(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

async function main(): Promise<void> {
  const proposalId = readArg("--proposal-id");
  const limitText = readArg("--limit");

  const result = await readProposalReviewApplyHistory({
    proposalId,
    limit: limitText === undefined ? undefined : Number(limitText),
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
