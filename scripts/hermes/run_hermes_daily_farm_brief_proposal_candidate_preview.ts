import { runDay125ProposalCandidateScenario } from "./test_hermes_daily_farm_brief_proposal_candidate_boundary";

console.log(JSON.stringify({
  ...(await runDay125ProposalCandidateScenario()),
  publication_state: "fixture_only_no_http_route",
  persistence_state: "not_implemented",
  day126_handoff: "explicit_save_eligibility_and_review_gate",
}, null, 2));
