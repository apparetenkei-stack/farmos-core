import {
  HermesDailyFarmBriefDenyByDefaultReadRepository,
  type HermesDailyFarmBriefPersistedReadRepository,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";

// Day112 defines no database table, credentials, query, or production connection.
// Production remains explicitly unavailable until storage ownership is approved.
export function createHermesDailyFarmBriefProductionReadRepository(): HermesDailyFarmBriefPersistedReadRepository {
  return new HermesDailyFarmBriefDenyByDefaultReadRepository();
}
