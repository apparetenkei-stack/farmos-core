import {
  HermesDailyFarmBriefDenyByDefaultPersistenceRepository,
  type HermesDailyFarmBriefPersistenceWriteRepository,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persistence_write_boundary";

// Day113 has no table, migration, credentials, SQL, or production connection.
export function createHermesDailyFarmBriefProductionPersistenceRepository(): HermesDailyFarmBriefPersistenceWriteRepository {
  return new HermesDailyFarmBriefDenyByDefaultPersistenceRepository();
}
