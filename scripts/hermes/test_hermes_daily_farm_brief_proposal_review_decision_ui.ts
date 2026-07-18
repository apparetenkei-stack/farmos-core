import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const controls=await readFile("src/components/hermes/DailyFarmBriefProposalReviewControls.tsx","utf8");
const detail=await readFile("src/components/hermes/DailyFarmBriefProposalDetail.tsx","utf8");
for(const text of ["判断理由","承認する","却下する","修正を依頼する","営農データへの適用は行いません"])assert(controls.includes(text));
assert.match(controls,/if\(submitting\|\|status!=="pending"\)return/u);assert.match(controls,/disabled=\{submitting\}/u);assert.match(controls,/window\.confirm/u);
assert.match(controls,/expected_status:"pending"/u);assert.match(controls,/expected_updated_at:input\.expectedUpdatedAt/u);assert.match(controls,/parsed\.error==="stale"/u);assert.match(controls,/router\.refresh\(\)/u);assert.match(controls,/判断は再送信していません/u);
assert.doesNotMatch(controls,/applyProposal|proposal_apply|app_database|method:"(?:PUT|PATCH|DELETE)"/u);assert.doesNotMatch(controls,/principal_ref|reviewed_by|payload_json|source_refs_json/u);
assert.match(detail,/proposal\.status==="pending"&&proposal\.expiry_state==="active"/u);assert.match(detail,/expectedUpdatedAt=\{proposal\.updated_at\}/u);
console.log("Daily Brief Proposal review decision UI tests passed");
