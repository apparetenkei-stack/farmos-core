import { readHermesProposalReviewLoop } from "./api_boundary/hermes_proposal_review_loop_read_boundary";

function parseLimit(argv: string[]): number | undefined {
  const index = argv.indexOf("--limit");
  if (index === -1) return undefined;
  const value = argv[index + 1];
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

async function main() {
  const limit = parseLimit(process.argv.slice(2));
  const result = await readHermesProposalReviewLoop({ limit });
  console.log(JSON.stringify(result, null, 2));

  if (result.result !== "ok") {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
