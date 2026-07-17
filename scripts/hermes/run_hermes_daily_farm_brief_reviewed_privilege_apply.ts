import {
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV,
  HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION,
  applyHermesDailyFarmBriefReviewedPrivilegeHardening,
  createHermesDailyFarmBriefProductionRepositoryBundle,
  inspectHermesDailyFarmBriefPrivilegeAdministratorReadiness,
} from "../../src/lib/hermes/hermes_daily_farm_brief_production_repository_bundle";
import { parseHermesDailyFarmBriefProductionEnvironment } from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { HermesDailyFarmBriefPrivilegeAdministratorExecutor, parseHermesDailyFarmBriefPrivilegeAdminEnvironment } from "../../src/lib/hermes/hermes_daily_farm_brief_privilege_administrator_executor";

try { process.loadEnvFile(".env.local"); } catch { /* fail closed */ }

const bundle = createHermesDailyFarmBriefProductionRepositoryBundle(process.env);
const candidates = await bundle.resolvePrivilegeCandidates();
const runtimeConfig = parseHermesDailyFarmBriefProductionEnvironment(process.env);
const adminConfig = parseHermesDailyFarmBriefPrivilegeAdminEnvironment(process.env, runtimeConfig?.database_name ?? null);
const explicitApply = process.argv.includes("--apply");
const administratorExecutor = adminConfig.admin === null ? null : new HermesDailyFarmBriefPrivilegeAdministratorExecutor(adminConfig.admin);
const administratorPreflight = administratorExecutor === null ? null : await inspectHermesDailyFarmBriefPrivilegeAdministratorReadiness({ repositoryBundle: bundle, candidateToken: candidates.token, executor: administratorExecutor });
const administratorReady = administratorPreflight?.admin_connection_target_matches_runtime === true && administratorPreflight.admin_principal_eligible === true && administratorPreflight.catalog_fingerprint_matched === true && administratorPreflight.transaction_rolled_back === true;
const gatedEnvironment = explicitApply && administratorReady ? process.env : { ...process.env, [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.enabled]: undefined, [HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.confirmation]: undefined };
const result = await applyHermesDailyFarmBriefReviewedPrivilegeHardening({
  environment: gatedEnvironment,
  repositoryBundle: bundle,
  candidateToken: candidates.token,
  executor: administratorExecutor === null ? {
    async executeReviewedHardening() {
      throw new Error("privilege_admin_configuration_unavailable");
    },
  } : administratorExecutor,
});
await administratorExecutor?.close();

console.log(JSON.stringify({
  result,
  candidate_preflight: candidates.preflight,
  production_admin_preflight: {
    admin_configuration_available: adminConfig.admin !== null,
    admin_connection_target_matches_runtime: adminConfig.targetMatches,
    admin_principal_eligible: administratorPreflight?.admin_principal_eligible === true,
    candidate_preflight_ready: candidates.preflight.ready_for_manual_apply,
    catalog_fingerprint_ready: administratorPreflight?.catalog_fingerprint_matched === true,
    apply_enabled: explicitApply && administratorReady && process.env[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.enabled] === "true" && process.env[HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_ENV.confirmation] === HERMES_DAILY_FARM_BRIEF_PRIVILEGE_APPLY_CONFIRMATION,
    production_change_performed: false,
  },
  production_apply_adapter: adminConfig.admin === null ? "deny_by_default" : "configured_not_executed_without_apply_gate",
}, null, 2));
