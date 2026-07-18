import { runDay126ExplicitSaveScenario } from "./test_hermes_daily_farm_brief_proposal_explicit_save_boundary";

console.log(JSON.stringify({
  ...(await runDay126ExplicitSaveScenario()),
  publication_state: "fixture_only_no_http_route",
  database_state: "fake_repository_only",
  day126_second_half: "isolated_ai_proposal_inbox_persistence",
}, null, 2));
