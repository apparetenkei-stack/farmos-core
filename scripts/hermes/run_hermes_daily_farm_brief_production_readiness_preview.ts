import {
  HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY,
  HermesDailyFarmBriefDenyByDefaultActorDirectory,
  HermesDailyFarmBriefDenyByDefaultAuthenticationProvider,
  classifyHermesDailyFarmBriefDatabaseTarget,
} from "./brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import { HermesDailyFarmBriefDenyByDefaultReadRepository } from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { createHermesDailyFarmBriefLatestServerDependencies } from "../../src/lib/hermes/hermes_daily_farm_brief_latest_server_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";

const dependencies = createHermesDailyFarmBriefLatestServerDependencies({
  authenticationProvider: new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider(),
  actorDirectory: new HermesDailyFarmBriefDenyByDefaultActorDirectory(),
  readRepository: new HermesDailyFarmBriefDenyByDefaultReadRepository(),
  clock: () => "2026-07-15T02:00:00.000Z",
});
const response = await serveHermesDailyFarmBriefLatestRead({ request: new Request("http://localhost/api/hermes/daily-farm-brief/latest"), dependencies });
console.log(JSON.stringify({
  production_target_classification: classifyHermesDailyFarmBriefDatabaseTarget("farmos_core_production"),
  production_config_valid: false,
  production_repository_state: "deny_by_default",
  authentication_provider_state: "unavailable",
  actor_context_resolver_state: "deny_by_default",
  latest_route_state: response.status,
  farming_app_proxy_contract_state: "fixture_verified",
  database_connection_performed: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.production_database_connection_performed,
  database_read_performed: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.production_database_read_performed,
  database_write_performed: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.production_database_write_performed,
  migration_applied: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.migration_applied_to_production,
  rls_changed: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.rls_change_applied_to_production,
  role_changed: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.role_change_applied_to_production,
  browser_credential_accepted: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.browser_credential_accepted,
  retry_count: 0,
  secret_exposed: HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY.secret_exposed,
  day116_handoff: "manual_generation_persist_authenticated_read_e2e",
}, null, 2));
