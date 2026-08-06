import { parseHermesDailyFarmBriefAllowedScopeKeys } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_scope_contract";
import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  type HermesDailyFarmBriefAuthenticatedActorContext,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import {
  parseHermesDailyFarmBriefServerAuthenticationProviderResult,
  type HermesDailyFarmBriefActorDirectory,
  type HermesDailyFarmBriefServerAuthenticationProvider,
  type HermesDailyFarmBriefServerAuthenticationProviderResult,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_production_readiness_contract";
import {
  createFarmOsServerBearerIdentity,
  isFarmOsServerBearerToken,
  type FarmOsServerBearerActorDirectory,
  type FarmOsServerBearerAuthenticationProvider,
} from "./farm_os_server_bearer_identity";

export const HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS = {
  token: "HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN",
  principalRef: "HERMES_DAILY_FARM_BRIEF_PILOT_PRINCIPAL_REF",
  role: "HERMES_DAILY_FARM_BRIEF_PILOT_ROLE",
  allowedScopeKeys: "HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS",
} as const;

type PilotConfiguration = {
  token: string;
  actor: HermesDailyFarmBriefAuthenticatedActorContext;
};

function unavailable(): HermesDailyFarmBriefServerAuthenticationProviderResult {
  return { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1", status: "unavailable", principal_ref: null };
}

function unauthenticated(): HermesDailyFarmBriefServerAuthenticationProviderResult {
  return { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1", status: "unauthenticated", principal_ref: null };
}

function invalid(): HermesDailyFarmBriefServerAuthenticationProviderResult {
  return { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1", status: "invalid", principal_ref: null };
}

function parseHermesDailyFarmBriefPilotConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): PilotConfiguration | null {
  const token = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.token];
  const principalRef = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.principalRef];
  const role = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.role];
  const encodedAllowedScopeKeys = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.allowedScopeKeys];
  if (!isFarmOsServerBearerToken(token) ||
    typeof encodedAllowedScopeKeys !== "string") return null;

  let rawAllowedScopeKeys: unknown;
  try { rawAllowedScopeKeys = JSON.parse(encodedAllowedScopeKeys); } catch { return null; }
  const allowedScopeKeys = parseHermesDailyFarmBriefAllowedScopeKeys(rawAllowedScopeKeys);
  if (allowedScopeKeys === null || JSON.stringify(allowedScopeKeys) !== JSON.stringify(rawAllowedScopeKeys)) return null;

  const actor = parseHermesDailyFarmBriefAuthenticatedActorContext({
    schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1",
    principal_ref: principalRef,
    role,
    allowed_scope_keys: allowedScopeKeys,
    authorization_verified: true,
  });
  return actor === null ? null : { token, actor };
}

export class HermesDailyFarmBriefPilotAuthenticationProvider implements HermesDailyFarmBriefServerAuthenticationProvider {
  private readonly provider: FarmOsServerBearerAuthenticationProvider;

  constructor(configuration: PilotConfiguration | null) {
    this.provider = createFarmOsServerBearerIdentity({
      token: configuration?.token,
      principal_ref: configuration?.actor.principal_ref,
      actor: configuration?.actor ?? null,
    }).authenticationProvider;
  }

  async authenticateServerRequest(request: Request): Promise<unknown> {
    const result = await this.provider.authenticateServerRequest(request);
    if (result.status === "unavailable") return unavailable();
    if (result.status === "unauthenticated") return unauthenticated();
    if (result.status === "invalid") return invalid();
    return parseHermesDailyFarmBriefServerAuthenticationProviderResult({
      schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1",
      status: "authenticated",
      principal_ref: result.principal_ref,
    }) ?? invalid();
  }
}

export class HermesDailyFarmBriefPilotActorDirectory implements HermesDailyFarmBriefActorDirectory {
  private readonly directory: FarmOsServerBearerActorDirectory<
    HermesDailyFarmBriefAuthenticatedActorContext
  >;

  constructor(configuration: PilotConfiguration | null) {
    this.directory = createFarmOsServerBearerIdentity({
      token: configuration?.token,
      principal_ref: configuration?.actor.principal_ref,
      actor: configuration?.actor ?? null,
    }).actorDirectory;
  }

  async resolvePrincipal(principalRef: string): Promise<unknown> {
    return this.directory.resolvePrincipal(principalRef);
  }
}

export function createHermesDailyFarmBriefPilotIdentityBoundary(
  environment: Readonly<Record<string, string | undefined>>,
): {
  state: "ready" | "denied";
  authenticationProvider: HermesDailyFarmBriefServerAuthenticationProvider;
  actorDirectory: HermesDailyFarmBriefActorDirectory;
} {
  const configuration = parseHermesDailyFarmBriefPilotConfiguration(environment);
  return {
    state: configuration === null ? "denied" : "ready",
    authenticationProvider: new HermesDailyFarmBriefPilotAuthenticationProvider(configuration),
    actorDirectory: new HermesDailyFarmBriefPilotActorDirectory(configuration),
  };
}
