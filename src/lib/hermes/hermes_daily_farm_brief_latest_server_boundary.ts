import type {
  HermesDailyFarmBriefLatestReadDependencies,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_read_service";

// No repository-wide authentication provider or persisted Brief reader exists yet.
// The production adapter therefore denies anonymous access and cannot reach the source reader.
export const hermesDailyFarmBriefLatestServerDependencies: HermesDailyFarmBriefLatestReadDependencies = {
  authenticate: async () => ({
    schema_version: "hermes.daily_farm_brief.authentication_result.v1",
    status: "unauthenticated",
    principal_ref: null,
  }),
  resolveActorContext: async () => null,
  readLatestSource: async () => null,
  clock: () => new Date().toISOString(),
};
