import type {
  HermesDailyFarmBriefLatestReadDependencies,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { deriveHermesDailyFarmBusinessDate } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_generation_contract";
import {
  readHermesDailyFarmBriefPersistedLatestSource,
  HermesDailyFarmBriefDenyByDefaultReadRepository,
  type HermesDailyFarmBriefPersistedReadRepository,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import {
  authenticateHermesDailyFarmBriefServerRequest,
  HermesDailyFarmBriefDenyByDefaultActorDirectory,
  HermesDailyFarmBriefDenyByDefaultAuthenticationProvider,
  resolveHermesDailyFarmBriefActorContext,
  type HermesDailyFarmBriefActorDirectory,
  type HermesDailyFarmBriefServerAuthenticationProvider,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import {
  createHermesDailyFarmBriefProductionReadRepository,
  type HermesDailyFarmBriefProductionReadExecutor,
} from "./hermes_daily_farm_brief_production_read_repository";

export function createHermesDailyFarmBriefLatestServerDependencies(input: {
  authenticationProvider: HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory: HermesDailyFarmBriefActorDirectory;
  readRepository: HermesDailyFarmBriefPersistedReadRepository;
  clock: () => string;
}): HermesDailyFarmBriefLatestReadDependencies {
  return {
    authenticate: (request) => authenticateHermesDailyFarmBriefServerRequest(input.authenticationProvider, request),
    resolveActorContext: (authentication) => resolveHermesDailyFarmBriefActorContext(input.actorDirectory, authentication),
    readLatestSource: async () => {
      const now = input.clock();
      const requestedBusinessDate = deriveHermesDailyFarmBusinessDate(now);
      if (requestedBusinessDate === null) return null;
      const selected = await readHermesDailyFarmBriefPersistedLatestSource({ repository: input.readRepository, requestedBusinessDate, now });
      return selected.status === "selected" ? selected.source : null;
    },
    clock: input.clock,
  };
}

export function createHermesDailyFarmBriefProductionLatestServerBoundary(input: {
  environment: Readonly<Record<string, string | undefined>>;
  authenticationProvider: HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory: HermesDailyFarmBriefActorDirectory;
  clock: () => string;
  executor?: HermesDailyFarmBriefProductionReadExecutor;
}) {
  const productionRepository = createHermesDailyFarmBriefProductionReadRepository(input.environment, input.executor);
  return {
    repository_state: productionRepository.state,
    safe_config: productionRepository.config,
    dependencies: createHermesDailyFarmBriefLatestServerDependencies({
      authenticationProvider: input.authenticationProvider,
      actorDirectory: input.actorDirectory,
      readRepository: productionRepository.repository,
      clock: input.clock,
    }),
  } as const;
}

// No repository-wide authentication provider or persisted Brief reader exists yet.
// The production adapter therefore denies anonymous access and cannot reach the source reader.
export const hermesDailyFarmBriefLatestServerDependencies = createHermesDailyFarmBriefLatestServerDependencies({
  authenticationProvider: new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider(),
  actorDirectory: new HermesDailyFarmBriefDenyByDefaultActorDirectory(),
  readRepository: new HermesDailyFarmBriefDenyByDefaultReadRepository(),
  clock: () => new Date().toISOString(),
});
