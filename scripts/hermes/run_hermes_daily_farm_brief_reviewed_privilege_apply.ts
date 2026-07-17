import {
  applyHermesDailyFarmBriefReviewedPrivilegeHardening,
  createHermesDailyFarmBriefProductionRepositoryBundle,
} from "../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";

try { process.loadEnvFile(".env.local"); } catch { /* fail closed */ }

const bundle = createHermesDailyFarmBriefProductionRepositoryBundle(process.env);
const candidates = await bundle.resolvePrivilegeCandidates();
const result = await applyHermesDailyFarmBriefReviewedPrivilegeHardening({
  environment: process.env,
  repositoryBundle: bundle,
  candidateToken: candidates.token,
  executor: {
    async executeReviewedHardening() {
      // A separately approved administrator executor must replace this deny adapter.
      throw new Error("production_privilege_apply_executor_not_connected");
    },
  },
});

console.log(JSON.stringify({
  result,
  candidate_preflight: candidates.preflight,
  production_apply_adapter: "deny_by_default",
}, null, 2));
