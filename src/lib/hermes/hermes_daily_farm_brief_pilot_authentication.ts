import { createHash, timingSafeEqual } from "node:crypto";

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

export const HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS = {
  token: "HERMES_DAILY_FARM_BRIEF_PILOT_TOKEN",
  principalRef: "HERMES_DAILY_FARM_BRIEF_PILOT_PRINCIPAL_REF",
  role: "HERMES_DAILY_FARM_BRIEF_PILOT_ROLE",
  allowedScopeKeys: "HERMES_DAILY_FARM_BRIEF_PILOT_ALLOWED_SCOPE_KEYS",
} as const;

const MAXIMUM_TOKEN_LENGTH = 512;
const SAFE_TOKEN = /^[\x21-\x2b\x2d-\x7e]+$/u;

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

function isSafeToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= MAXIMUM_TOKEN_LENGTH && SAFE_TOKEN.test(value);
}

function equalSecret(left: string, right: string): boolean {
  const leftDigest = createHash("sha256").update(left, "utf8").digest();
  const rightDigest = createHash("sha256").update(right, "utf8").digest();
  return timingSafeEqual(leftDigest, rightDigest);
}

function parseHermesDailyFarmBriefPilotConfiguration(
  environment: Readonly<Record<string, string | undefined>>,
): PilotConfiguration | null {
  const token = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.token];
  const principalRef = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.principalRef];
  const role = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.role];
  const encodedAllowedScopeKeys = environment[HERMES_DAILY_FARM_BRIEF_PILOT_ENV_KEYS.allowedScopeKeys];
  if (!isSafeToken(token) || typeof encodedAllowedScopeKeys !== "string") return null;

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
  constructor(private readonly configuration: PilotConfiguration | null) {}

  async authenticateServerRequest(request: Request): Promise<unknown> {
    if (this.configuration === null) return unavailable();
    const authorization = request.headers.get("authorization");
    if (authorization === null) return unauthenticated();
    if (authorization.includes(",") || !authorization.startsWith("Bearer ")) return invalid();
    const token = authorization.slice("Bearer ".length);
    if (!isSafeToken(token) || !equalSecret(token, this.configuration.token)) return unauthenticated();
    return parseHermesDailyFarmBriefServerAuthenticationProviderResult({
      schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1",
      status: "authenticated",
      principal_ref: this.configuration.actor.principal_ref,
    }) ?? invalid();
  }
}

export class HermesDailyFarmBriefPilotActorDirectory implements HermesDailyFarmBriefActorDirectory {
  constructor(private readonly configuration: PilotConfiguration | null) {}

  async resolvePrincipal(principalRef: string): Promise<unknown> {
    if (this.configuration === null || principalRef !== this.configuration.actor.principal_ref) return null;
    return structuredClone(this.configuration.actor);
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
