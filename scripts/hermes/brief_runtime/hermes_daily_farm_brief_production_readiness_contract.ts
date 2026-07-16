import {
  parseHermesDailyFarmBriefAuthenticatedActorContext,
  parseHermesDailyFarmBriefLatestApiResponse,
  type HermesDailyFarmBriefAuthenticatedActorContext,
  type HermesDailyFarmBriefAuthenticationResult,
  type HermesDailyFarmBriefLatestApiResponse,
} from "./hermes_daily_farm_brief_latest_api_contract";

export const HERMES_DAILY_FARM_BRIEF_DAY115_SAFETY = {
  production_database_connection_performed: false,
  production_database_read_performed: false,
  production_database_write_performed: false,
  isolated_database_write_performed: false,
  migration_applied_to_production: false,
  rls_change_applied_to_production: false,
  role_change_applied_to_production: false,
  authentication_provider_connected_to_production: false,
  actor_directory_connected_to_production: false,
  farming_application_changed: false,
  browser_credential_accepted: false,
  client_role_override_allowed: false,
  client_scope_override_allowed: false,
  retry_performed: false,
  secret_exposed: false,
  fail_closed: true,
} as const;

export type HermesDailyFarmBriefProductionTargetClass = "isolated_day114_test" | "production_candidate" | "rejected";
export type HermesDailyFarmBriefProductionReadRepositoryConfig = {
  schema_version: "hermes.daily_farm_brief.production_read_repository_config.v1";
  enabled: true;
  target_class: "production_candidate";
  host_present: true;
  port: number;
  database_name: string;
  user_present: true;
  ssl_mode: "disable" | "require" | "verify-full";
  connect_timeout_ms: number;
  statement_timeout_ms: number;
  lock_timeout_ms: number;
  application_name: "farmos-core-hermes-daily-brief-read";
  read_only_required: true;
  retry_count: 0;
};

type JsonRecord = Record<string, unknown>;
const DB_NAME = /^[a-z][a-z0-9_]{0,62}$/u;
const PRINCIPAL = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/u;
const REQUEST_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
const CONFIG_KEYS = ["schema_version", "enabled", "target_class", "host_present", "port", "database_name", "user_present", "ssl_mode", "connect_timeout_ms", "statement_timeout_ms", "lock_timeout_ms", "application_name", "read_only_required", "retry_count"] as const;

function record(value: unknown): value is JsonRecord { return typeof value === "object" && value !== null && !Array.isArray(value); }
function exact(value: JsonRecord, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && keys.every((key) => Object.hasOwn(value, key)); }
function boundedInt(value: unknown, minimum: number, maximum: number): value is number { return Number.isInteger(value) && Number(value) >= minimum && Number(value) <= maximum; }

export function classifyHermesDailyFarmBriefDatabaseTarget(databaseName: unknown): HermesDailyFarmBriefProductionTargetClass {
  if (databaseName === "farmos_core_day114_test") return "isolated_day114_test";
  if (typeof databaseName !== "string" || !DB_NAME.test(databaseName) || ["postgres", "farmos_core_local", "farmos_core_restore_test"].includes(databaseName)) return "rejected";
  return "production_candidate";
}

export function parseHermesDailyFarmBriefProductionReadRepositoryConfig(value: unknown): HermesDailyFarmBriefProductionReadRepositoryConfig | null {
  if (!record(value) || !exact(value, CONFIG_KEYS) || value.schema_version !== "hermes.daily_farm_brief.production_read_repository_config.v1" || value.enabled !== true || value.target_class !== "production_candidate" || value.host_present !== true || value.user_present !== true || value.application_name !== "farmos-core-hermes-daily-brief-read" || value.read_only_required !== true || value.retry_count !== 0 || !["disable", "require", "verify-full"].includes(String(value.ssl_mode)) || classifyHermesDailyFarmBriefDatabaseTarget(value.database_name) !== "production_candidate" || !boundedInt(value.port, 1, 65535) || !boundedInt(value.connect_timeout_ms, 100, 10_000) || !boundedInt(value.statement_timeout_ms, 100, 30_000) || !boundedInt(value.lock_timeout_ms, 100, 5_000)) return null;
  return value as HermesDailyFarmBriefProductionReadRepositoryConfig;
}

export const HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS = {
  enabled: "HERMES_DAILY_BRIEF_DATABASE_ENABLED", host: "HERMES_DAILY_BRIEF_DATABASE_HOST", port: "HERMES_DAILY_BRIEF_DATABASE_PORT", database: "HERMES_DAILY_BRIEF_DATABASE_NAME", user: "HERMES_DAILY_BRIEF_DATABASE_USER", credential: "HERMES_DAILY_BRIEF_DATABASE_PASSWORD", ssl: "HERMES_DAILY_BRIEF_DATABASE_SSL_MODE", connect: "HERMES_DAILY_BRIEF_DATABASE_CONNECT_TIMEOUT_MS", statement: "HERMES_DAILY_BRIEF_DATABASE_STATEMENT_TIMEOUT_MS", lock: "HERMES_DAILY_BRIEF_DATABASE_LOCK_TIMEOUT_MS",
} as const;

export function parseHermesDailyFarmBriefProductionEnvironment(environment: Readonly<Record<string, string | undefined>>): HermesDailyFarmBriefProductionReadRepositoryConfig | null {
  const integer = (key: string): number => Number(environment[key]);
  const host = environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host];
  const config = parseHermesDailyFarmBriefProductionReadRepositoryConfig({
    schema_version: "hermes.daily_farm_brief.production_read_repository_config.v1", enabled: environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.enabled] === "true", target_class: classifyHermesDailyFarmBriefDatabaseTarget(environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.database]), host_present: Boolean(environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.host]), port: integer(HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.port), database_name: environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.database], user_present: Boolean(environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.user]), ssl_mode: environment[HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.ssl], connect_timeout_ms: integer(HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.connect), statement_timeout_ms: integer(HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.statement), lock_timeout_ms: integer(HERMES_DAILY_BRIEF_DATABASE_ENV_KEYS.lock), application_name: "farmos-core-hermes-daily-brief-read", read_only_required: true, retry_count: 0,
  });
  if (config?.ssl_mode === "disable" && host !== "127.0.0.1" && host !== "localhost") return null;
  return config;
}

export type HermesDailyFarmBriefServerAuthenticationProviderResult =
  | { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1"; status: "authenticated"; principal_ref: string }
  | { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1"; status: "unauthenticated" | "unavailable" | "invalid"; principal_ref: null };

export function parseHermesDailyFarmBriefServerAuthenticationProviderResult(value: unknown): HermesDailyFarmBriefServerAuthenticationProviderResult | null {
  if (!record(value) || !exact(value, ["schema_version", "status", "principal_ref"]) || value.schema_version !== "hermes.daily_farm_brief.server_authentication_provider.v1" || !["authenticated", "unauthenticated", "unavailable", "invalid"].includes(String(value.status))) return null;
  if (value.status === "authenticated") return typeof value.principal_ref === "string" && PRINCIPAL.test(value.principal_ref) ? value as HermesDailyFarmBriefServerAuthenticationProviderResult : null;
  return value.principal_ref === null ? value as HermesDailyFarmBriefServerAuthenticationProviderResult : null;
}

export type HermesDailyFarmBriefServerAuthenticationProvider = { authenticateServerRequest(request: Request): Promise<unknown> };
export class HermesDailyFarmBriefDenyByDefaultAuthenticationProvider implements HermesDailyFarmBriefServerAuthenticationProvider { async authenticateServerRequest(): Promise<unknown> { return { schema_version: "hermes.daily_farm_brief.server_authentication_provider.v1", status: "unavailable", principal_ref: null }; } }
export class HermesDailyFarmBriefFixtureAuthenticationProvider implements HermesDailyFarmBriefServerAuthenticationProvider { constructor(private readonly result: unknown) {} async authenticateServerRequest(): Promise<unknown> { return structuredClone(this.result); } }

export async function authenticateHermesDailyFarmBriefServerRequest(provider: HermesDailyFarmBriefServerAuthenticationProvider, request: Request): Promise<HermesDailyFarmBriefAuthenticationResult> {
  let parsed: HermesDailyFarmBriefServerAuthenticationProviderResult | null = null;
  try { parsed = parseHermesDailyFarmBriefServerAuthenticationProviderResult(await provider.authenticateServerRequest(request)); } catch { /* fail closed */ }
  return parsed?.status === "authenticated" ? { schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: parsed.principal_ref } : { schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "unauthenticated", principal_ref: null };
}

export type HermesDailyFarmBriefActorDirectory = { resolvePrincipal(principalRef: string): Promise<unknown> };
export class HermesDailyFarmBriefDenyByDefaultActorDirectory implements HermesDailyFarmBriefActorDirectory { async resolvePrincipal(): Promise<unknown> { return null; } }
export class HermesDailyFarmBriefFixtureActorDirectory implements HermesDailyFarmBriefActorDirectory {
  constructor(private readonly entries: Readonly<Record<string, unknown>>) {}
  async resolvePrincipal(principalRef: string): Promise<unknown> { return structuredClone(this.entries[principalRef] ?? null); }
}
export async function resolveHermesDailyFarmBriefActorContext(directory: HermesDailyFarmBriefActorDirectory, authentication: Extract<HermesDailyFarmBriefAuthenticationResult, { status: "authenticated" }>): Promise<HermesDailyFarmBriefAuthenticatedActorContext | null> {
  let parsed: HermesDailyFarmBriefAuthenticatedActorContext | null = null;
  try { parsed = parseHermesDailyFarmBriefAuthenticatedActorContext(await directory.resolvePrincipal(authentication.principal_ref)); } catch { /* fail closed */ }
  return parsed?.principal_ref === authentication.principal_ref ? parsed : null;
}

export type HermesDailyFarmBriefFarmingAppProxyRequest = { schema_version: "hermes.daily_farm_brief.farming_app_proxy.v1"; method: "GET"; pathname: "/api/hermes/daily-farm-brief/latest"; body_present: false; query_parameter_count: 0; server_credential_present: true; request_id: string; requested_at: string };
export type HermesDailyFarmBriefFarmingAppProxyResult = { schema_version: "hermes.daily_farm_brief.farming_app_proxy_result.v1"; status: "ok" | "configuration_missing" | "authentication_required" | "access_forbidden" | "upstream_timeout" | "upstream_unavailable" | "invalid_upstream_response"; response: HermesDailyFarmBriefLatestApiResponse | null; cache_control: "no-store"; retry_count: 0; raw_upstream_body_exposed: false; credential_exposed: false };
export function parseHermesDailyFarmBriefFarmingAppProxyRequest(value: unknown): HermesDailyFarmBriefFarmingAppProxyRequest | null {
  if (!record(value) || !exact(value, ["schema_version", "method", "pathname", "body_present", "query_parameter_count", "server_credential_present", "request_id", "requested_at"]) || value.schema_version !== "hermes.daily_farm_brief.farming_app_proxy.v1" || value.method !== "GET" || value.pathname !== "/api/hermes/daily-farm-brief/latest" || value.body_present !== false || value.query_parameter_count !== 0 || value.server_credential_present !== true || typeof value.request_id !== "string" || !REQUEST_ID.test(value.request_id) || typeof value.requested_at !== "string" || Number.isNaN(Date.parse(value.requested_at)) || new Date(value.requested_at).toISOString() !== value.requested_at) return null;
  return value as HermesDailyFarmBriefFarmingAppProxyRequest;
}

type ProxyFetch = (url: string, init: RequestInit) => Promise<Response>;
function proxyResult(status: HermesDailyFarmBriefFarmingAppProxyResult["status"], response: HermesDailyFarmBriefLatestApiResponse | null = null): HermesDailyFarmBriefFarmingAppProxyResult { return { schema_version: "hermes.daily_farm_brief.farming_app_proxy_result.v1", status, response, cache_control: "no-store", retry_count: 0, raw_upstream_body_exposed: false, credential_exposed: false }; }
export async function executeHermesDailyFarmBriefFarmingAppProxy(input: { request: unknown; baseUrl: string | null; serverCredential: string | null; timeoutMs: number; maximumResponseBytes: number; fetch: ProxyFetch }): Promise<HermesDailyFarmBriefFarmingAppProxyResult> {
  const request = parseHermesDailyFarmBriefFarmingAppProxyRequest(input.request);
  if (request === null || !input.baseUrl || !input.serverCredential || !/^https:\/\/[A-Za-z0-9.-]+(?::\d+)?$/u.test(input.baseUrl) || !boundedInt(input.timeoutMs, 100, 10_000) || !boundedInt(input.maximumResponseBytes, 1_024, 1_048_576)) return proxyResult("configuration_missing");
  const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), input.timeoutMs);
  try {
    const response = await input.fetch(`${input.baseUrl}/api/hermes/daily-farm-brief/latest`, { method: "GET", headers: { Authorization: `Bearer ${input.serverCredential}`, "Cache-Control": "no-store", "X-Request-Id": request.request_id }, redirect: "manual", signal: controller.signal });
    if (response.status >= 300 && response.status < 400) return proxyResult("invalid_upstream_response");
    if (response.status === 401) return proxyResult("authentication_required");
    if (response.status === 403) return proxyResult("access_forbidden");
    if (response.status !== 200) return proxyResult("upstream_unavailable");
    if (!response.headers.get("cache-control")?.split(",").some((directive) => directive.trim().toLowerCase() === "no-store")) return proxyResult("invalid_upstream_response");
    const body = await response.text();
    if (new TextEncoder().encode(body).byteLength > input.maximumResponseBytes) return proxyResult("invalid_upstream_response");
    let value: unknown; try { value = JSON.parse(body); } catch { return proxyResult("invalid_upstream_response"); }
    const parsed = parseHermesDailyFarmBriefLatestApiResponse(value);
    return parsed?.result === "ok" ? proxyResult("ok", parsed) : proxyResult("invalid_upstream_response");
  } catch (error) { return proxyResult(error instanceof DOMException && error.name === "AbortError" ? "upstream_timeout" : "upstream_unavailable"); }
  finally { clearTimeout(timeout); }
}
