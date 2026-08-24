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
import {
  createHermesDailyFarmBriefPilotIdentityBoundary,
} from "./hermes_daily_farm_brief_pilot_authentication";
import { createHermesDailyFarmBriefProductionRepositoryBundle } from "./hermes_daily_farm_brief_production_repository_bundle";
import {
  farmOsCoreEnvironmentIdentityRuntime,
  type FarmOsCoreEnvironmentIdentityRuntime,
} from "./farm_os_core_environment_identity_runtime";

export function createHermesDailyFarmBriefLatestServerDependencies(input: {
  authenticationProvider: HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory: HermesDailyFarmBriefActorDirectory;
  readRepository: HermesDailyFarmBriefPersistedReadRepository;
  clock: () => string;
  environmentIdentityRuntime?: FarmOsCoreEnvironmentIdentityRuntime;
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
    environment_identity: input.environmentIdentityRuntime,
  };
}

export function createHermesDailyFarmBriefProductionLatestServerBoundary(input: {
  environment: Readonly<Record<string, string | undefined>>;
  authenticationProvider: HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory: HermesDailyFarmBriefActorDirectory;
  clock: () => string;
  executor?: HermesDailyFarmBriefProductionReadExecutor;
  environmentIdentityRuntime?: FarmOsCoreEnvironmentIdentityRuntime;
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
      environmentIdentityRuntime: input.environmentIdentityRuntime,
    }),
  } as const;
}

export function createHermesDailyFarmBriefPilotLatestServerBoundary(input: {
  environment: Readonly<Record<string, string | undefined>>;
  clock: () => string;
  executor?: HermesDailyFarmBriefProductionReadExecutor;
  environmentIdentityRuntime?: FarmOsCoreEnvironmentIdentityRuntime;
}) {
  const identity = createHermesDailyFarmBriefPilotIdentityBoundary(input.environment);
  const repositoryBundle = identity.state === "ready" && input.executor === undefined
    ? createHermesDailyFarmBriefProductionRepositoryBundle(input.environment)
    : null;
  const repository = repositoryBundle !== null
    ? { state: repositoryBundle.state, repository: repositoryBundle.readRepository }
    : identity.state === "ready"
      ? createHermesDailyFarmBriefProductionReadRepository(input.environment, input.executor)
      : { state: "denied" as const, repository: new HermesDailyFarmBriefDenyByDefaultReadRepository(), config: null };
  const ready = identity.state === "ready" && repository.state === "ready";
  const authenticationProvider = ready ? identity.authenticationProvider : new HermesDailyFarmBriefDenyByDefaultAuthenticationProvider();
  const actorDirectory = ready ? identity.actorDirectory : new HermesDailyFarmBriefDenyByDefaultActorDirectory();
  const readRepository = ready ? repository.repository : new HermesDailyFarmBriefDenyByDefaultReadRepository();
  return {
    authentication_state: ready ? "ready" : "denied",
    actor_directory_state: ready ? "ready" : "denied",
    repository_state: ready ? "ready" : "denied",
    dependencies: createHermesDailyFarmBriefLatestServerDependencies({ authenticationProvider, actorDirectory, readRepository, clock: input.clock, environmentIdentityRuntime: input.environmentIdentityRuntime }),
  } as const;
}

export const hermesDailyFarmBriefLatestServerBoundary = createHermesDailyFarmBriefPilotLatestServerBoundary({
  environment: process.env,
  clock: () => new Date().toISOString(),
  environmentIdentityRuntime: farmOsCoreEnvironmentIdentityRuntime,
});

export const hermesDailyFarmBriefLatestServerDependencies = hermesDailyFarmBriefLatestServerBoundary.dependencies;
