import { readFileSync } from "node:fs";

import {
  digestFarmOsEnvironmentIdentityManifest,
  parseFarmOsEnvironmentIdentityManifest,
  type FarmOsEnvironmentIdentityManifest,
} from "./farm_os_environment_identity_contract";
import {
  compareFarmOsEnvironmentIdentityRuntimeBinding,
  type FarmOsEnvironmentRuntimeIdentityEvidence,
} from "./farm_os_environment_identity_runtime_binding";
import {
  compareFarmOsEnvironmentIdentityHandshake,
  createFarmOsEnvironmentIdentityHandshakeMetadata,
  parseFarmOsEnvironmentIdentityHandshakeHeaders,
  serializeFarmOsEnvironmentIdentityHandshakeHeaders,
} from "./farm_os_environment_identity_handshake";

export type FarmOsCoreEnvironmentIdentityTransportAuthority =
  | "authenticated_server_transport"
  | "browser"
  | "hermes";

export type FarmOsCoreEnvironmentIdentityDecision =
  | Readonly<{
    decision: "ALLOW";
    response_headers: Readonly<Record<string, string>>;
    verified_scope: Readonly<{
      environment_id: string;
      installation_id: string;
      farm_scope: string;
    }>;
  }>
  | Readonly<{
    decision: "DENY";
    reason: "UNTRUSTED_TRANSPORT" | "HANDSHAKE_INVALID" |
      "HANDSHAKE_MISMATCH" | "SCOPE_MISMATCH" | "TARGET_MISMATCH" |
      "RESPONSE_IDENTITY_INVALID";
  }>
  | Readonly<{
    decision: "STARTUP_BLOCK";
    reason: "MANIFEST_MISSING_OR_INVALID" | "RUNTIME_IDENTITY_MISMATCH";
  }>;

export type FarmOsCoreEnvironmentIdentityRuntime = Readonly<{
  state: "READY" | "STARTUP_BLOCK";
  verifyRequest: (input: Readonly<{
    request: Request;
    transport_authority: FarmOsCoreEnvironmentIdentityTransportAuthority;
  }>) => FarmOsCoreEnvironmentIdentityDecision;
  verifyBoundUse: (input: Readonly<{
    use: "database" | "provider" | "integration";
    environment_id: string;
    installation_id: string;
    farm_scope: string;
  }>) => FarmOsCoreEnvironmentIdentityDecision;
  prepareOutboundRequest: (input: Readonly<{
    target_environment_id: string;
    target_installation_id: string;
    target_farm_scope: string;
    target_endpoint_alias: string;
  }>) => FarmOsCoreEnvironmentIdentityDecision;
  verifyOutboundResponse: (headers: Headers) =>
    FarmOsCoreEnvironmentIdentityDecision;
}>;

type RuntimeInput = Readonly<{
  manifest_loader: () => unknown;
  observed_identity_loader: () => unknown;
}>;

export const FARM_OS_CORE_STAGING_RUNTIME_IDENTITY =
  "farmos-core-staging-primary" as const;
export const FARM_OS_CORE_STAGING_ENVIRONMENT_ID =
  "apparetenkei-staging-primary" as const;
export const FARM_OS_CORE_STAGING_INSTALLATION_ID =
  "apparetenkei-farmos-core-staging-01" as const;
export const FARM_OS_CORE_PRODUCTION_RUNTIME_IDENTITY =
  "farmos-core-production-primary" as const;
export const FARM_OS_CORE_PRODUCTION_ENVIRONMENT_ID =
  "apparetenkei-production-primary" as const;
export const FARM_OS_CORE_PRODUCTION_INSTALLATION_ID =
  "apparetenkei-farmos-core-mac-01" as const;
export const FARM_OS_E4_RECONCILIATION_RUN =
  "20260825T230921Z-2cf32bfc-a3c1-419d-bbfd-5862fb8ba4f1" as const;
export const FARM_OS_E4_RECONCILIATION_EVIDENCE_SHA256 =
  "sha256:d3fada060d010033c0cad527e25f8486532c5c821b82145fb2ae8ae86d099275" as const;
export const FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD =
  "20260807000000" as const;
export const FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS =
  "app-business-staging-readonly" as const;
export const FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS =
  "core-memory-staging-readonly" as const;
export const FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD =
  "202608110001_production_target_execution_durability" as const;
export const FARM_OS_CORE_PRODUCTION_MANIFEST_SHA256 =
  "sha256:f8e050e87ed765632640cf987ee6d7ec613947f5ac14d79989f0604d0ba6d7ad" as const;
export const FARM_OS_CORE_STAGING_MANIFEST_SHA256 =
  "sha256:f150cc743e73bbe651068c55e48d5fbd94991c34bc3f4561a40714d920d56fbe" as const;

export const FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR =
  "FARMOS_CORE_RUNTIME_ENVIRONMENT" as const;

export const FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT = Object.freeze({
  enabled: "FARMOS_CORE_STAGING_RUNTIME_ENABLED",
  runtime_identity: "FARMOS_CORE_STAGING_RUNTIME_IDENTITY",
  manifest_path: "FARMOS_CORE_STAGING_ENVIRONMENT_MANIFEST_PATH",
  manifest_pin_path: "FARMOS_CORE_STAGING_ENVIRONMENT_MANIFEST_PIN_PATH",
  runtime_identity_path: "FARMOS_CORE_STAGING_RUNTIME_IDENTITY_PATH",
} as const);

export const FARM_OS_CORE_PRODUCTION_RUNTIME_ENVIRONMENT = Object.freeze({
  runtime_identity: "FARMOS_CORE_PRODUCTION_RUNTIME_IDENTITY",
  manifest_path: "FARMOS_CORE_PRODUCTION_ENVIRONMENT_MANIFEST_PATH",
  manifest_pin_path: "FARMOS_CORE_PRODUCTION_ENVIRONMENT_MANIFEST_PIN_PATH",
  runtime_identity_path: "FARMOS_CORE_PRODUCTION_RUNTIME_IDENTITY_PATH",
} as const);

type RuntimeEnvironmentProfile = Readonly<{
  environment_class: "staging" | "production";
  environment_id: string;
  installation_id: string;
  farm_scope: string;
  business_timezone: string;
  runtime_identity: string;
  manifest_sha256: `sha256:${string}`;
  allowed_endpoint_aliases: readonly string[];
  app_business: Readonly<{
    logical_name: string;
    provider_class: string;
    resource_fingerprint: `sha256:${string}`;
    migration_head: string;
    credential_class: string;
  }>;
  core_operational_memory: Readonly<{
    logical_name: string;
    provider_class: string;
    resource_fingerprint: `sha256:${string}`;
    migration_head: string;
    credential_class: string;
  }>;
}>;

export const FARM_OS_CORE_RUNTIME_PROFILES = Object.freeze({
  staging: Object.freeze({
    environment_class: "staging",
    environment_id: FARM_OS_CORE_STAGING_ENVIRONMENT_ID,
    installation_id: FARM_OS_CORE_STAGING_INSTALLATION_ID,
    farm_scope: "apparetenkei-primary-farm",
    business_timezone: "Asia/Tokyo",
    runtime_identity: FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
    manifest_sha256: FARM_OS_CORE_STAGING_MANIFEST_SHA256,
    allowed_endpoint_aliases: Object.freeze([
      FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
      "farming-app-staging-primary",
    ]),
    app_business: Object.freeze({
      logical_name: "apparetenkei-staging-primary",
      provider_class: "managed_postgres",
      resource_fingerprint:
        "sha256:d24a9c40a082703e8f2a26241e365cc8e2b3b879eae443841bac8d91b12add69",
      migration_head: FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD,
      credential_class: FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS,
    }),
    core_operational_memory: Object.freeze({
      logical_name: "farmos_core_memory_staging",
      provider_class: "containerized_postgres",
      resource_fingerprint:
        "sha256:0e987f1889bd975488e94028ff8842aafbd5c0b672ef00aa5a24ce8b65f2b767",
      migration_head: FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD,
      credential_class: FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS,
    }),
  } satisfies RuntimeEnvironmentProfile),
  production: Object.freeze({
    environment_class: "production",
    environment_id: FARM_OS_CORE_PRODUCTION_ENVIRONMENT_ID,
    installation_id: FARM_OS_CORE_PRODUCTION_INSTALLATION_ID,
    farm_scope: "apparetenkei-primary-farm",
    business_timezone: "Asia/Tokyo",
    runtime_identity: FARM_OS_CORE_PRODUCTION_RUNTIME_IDENTITY,
    manifest_sha256: FARM_OS_CORE_PRODUCTION_MANIFEST_SHA256,
    allowed_endpoint_aliases: Object.freeze([
      "farming-app-production-primary",
      FARM_OS_CORE_PRODUCTION_RUNTIME_IDENTITY,
    ]),
    app_business: Object.freeze({
      logical_name: "apparetenkei-production-primary",
      provider_class: "managed_postgres",
      resource_fingerprint:
        "sha256:26783e0e593e7d714588d4cb2980be33b9ea21db24ae9dee788224769a54e48f",
      migration_head: "20260807000000",
      credential_class: "app-business-production-readonly",
    }),
    core_operational_memory: Object.freeze({
      logical_name: "farmos_core_prod",
      provider_class: "containerized_postgres",
      resource_fingerprint:
        "sha256:4e9ce7978c3341b7cf2172e539be7e5d646b6fd8d30508b9477f541669cf553f",
      migration_head: FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD,
      credential_class: "core-memory-production-readonly",
    }),
  } satisfies RuntimeEnvironmentProfile),
} as const);

const RUNTIME_FILE_MAXIMUM_BYTES = 128 * 1024;
const ABSOLUTE_FILE_PATH = /^\/(?:[^\0\r\n]+)$/u;
const SHA256 = /^sha256:[a-f0-9]{64}$/u;

type ServerEnvironment = Readonly<Record<string, string | undefined>>;

function parseServerOwnedJson(
  path: string,
  readFile: (path: string) => string,
): unknown {
  if (!ABSOLUTE_FILE_PATH.test(path)) {
    throw new Error("environment_identity_server_path_invalid");
  }
  const raw = readFile(path);
  if (Buffer.byteLength(raw, "utf8") > RUNTIME_FILE_MAXIMUM_BYTES) {
    throw new Error("environment_identity_server_file_too_large");
  }
  return JSON.parse(raw) as unknown;
}

function parseManifestExternalPin(value: unknown): `sha256:${string}` | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "manifest_sha256") return null;
  const digest = (value as Readonly<Record<string, unknown>>).manifest_sha256;
  return typeof digest === "string" && SHA256.test(digest) &&
      digest !== FARM_OS_E4_RECONCILIATION_EVIDENCE_SHA256
    ? digest as `sha256:${string}`
    : null;
}

type RuntimeEnvironmentFileKeys = Readonly<{
  runtime_identity: string;
  manifest_path: string;
  manifest_pin_path: string;
  runtime_identity_path: string;
}>;

function exactStringSet(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return actual.length === expected.length &&
    expected.every((value) => actual.includes(value));
}

function loadFarmOsCoreProfileEnvironmentIdentityRuntime(input: Readonly<{
  environment: ServerEnvironment;
  read_file: (path: string) => string;
  profile: RuntimeEnvironmentProfile;
  keys: RuntimeEnvironmentFileKeys;
}>): FarmOsCoreEnvironmentIdentityRuntime {
  const { profile, keys } = input;
  if (input.environment[keys.runtime_identity] !== profile.runtime_identity) {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  const manifestPath = input.environment[keys.manifest_path];
  const manifestPinPath = input.environment[keys.manifest_pin_path];
  const runtimeIdentityPath = input.environment[keys.runtime_identity_path];
  if (manifestPath === undefined || manifestPinPath === undefined ||
    runtimeIdentityPath === undefined) {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }

  let manifestValue: unknown;
  let manifestPinValue: unknown;
  let observedValue: unknown;
  try {
    manifestValue = parseServerOwnedJson(manifestPath, input.read_file);
    manifestPinValue = parseServerOwnedJson(manifestPinPath, input.read_file);
    observedValue = parseServerOwnedJson(runtimeIdentityPath, input.read_file);
  } catch {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  const manifest = parseFarmOsEnvironmentIdentityManifest(manifestValue);
  const digest = digestFarmOsEnvironmentIdentityManifest(manifestValue);
  const externalPin = parseManifestExternalPin(manifestPinValue);
  if (manifest === null || digest === null || externalPin === null ||
    digest !== externalPin ||
    digest !== profile.manifest_sha256 ||
    manifest.environment_id !== profile.environment_id ||
    manifest.environment_class !== profile.environment_class ||
    manifest.installation_id !== profile.installation_id ||
    manifest.farm_scope !== profile.farm_scope ||
    manifest.business_timezone !== profile.business_timezone ||
    manifest.core_endpoint_alias !== profile.runtime_identity ||
    !exactStringSet(
      manifest.allowed_endpoint_aliases,
      profile.allowed_endpoint_aliases,
    ) ||
    manifest.database_bindings.app_business.logical_name !==
      profile.app_business.logical_name ||
    manifest.database_bindings.app_business.provider_class !==
      profile.app_business.provider_class ||
    manifest.database_bindings.app_business.resource_fingerprint !==
      profile.app_business.resource_fingerprint ||
    manifest.database_bindings.app_business.migration_head !==
      profile.app_business.migration_head ||
    manifest.database_bindings.app_business.credential_class !==
      profile.app_business.credential_class ||
    manifest.database_bindings.core_operational_memory.logical_name !==
      profile.core_operational_memory.logical_name ||
    manifest.database_bindings.core_operational_memory.provider_class !==
      profile.core_operational_memory.provider_class ||
    manifest.database_bindings.core_operational_memory.resource_fingerprint !==
      profile.core_operational_memory.resource_fingerprint ||
    manifest.database_bindings.core_operational_memory.migration_head !==
      profile.core_operational_memory.migration_head ||
    manifest.database_bindings.core_operational_memory.credential_class !==
      profile.core_operational_memory.credential_class) {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  return loadFarmOsCoreEnvironmentIdentityRuntime({
    manifest_loader: () => manifest,
    observed_identity_loader: () => observedValue,
  });
}

/**
 * Staging remains explicitly file-backed and preserves its existing
 * environment-specific startup tuple. It never attempts Production.
 */
export function loadFarmOsCoreStagingEnvironmentIdentityRuntime(input: Readonly<{
  environment: ServerEnvironment;
  read_file: (path: string) => string;
}>): FarmOsCoreEnvironmentIdentityRuntime {
  if (input.environment[FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.enabled] !==
      "true") {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  return loadFarmOsCoreProfileEnvironmentIdentityRuntime({
    ...input,
    profile: FARM_OS_CORE_RUNTIME_PROFILES.staging,
    keys: FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT,
  });
}

export function loadFarmOsCoreProductionEnvironmentIdentityRuntime(
  input: Readonly<{
    environment: ServerEnvironment;
    read_file: (path: string) => string;
  }>,
): FarmOsCoreEnvironmentIdentityRuntime {
  if (input.environment[FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR] !==
      "production") {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  return loadFarmOsCoreProfileEnvironmentIdentityRuntime({
    ...input,
    profile: FARM_OS_CORE_RUNTIME_PROFILES.production,
    keys: FARM_OS_CORE_PRODUCTION_RUNTIME_ENVIRONMENT,
  });
}

/**
 * The process-lifetime selector is server-owned and exact. Missing or unknown
 * values block before any manifest file is read; no reciprocal fallback is
 * attempted.
 */
export function loadFarmOsCoreSelectedEnvironmentIdentityRuntime(
  input: Readonly<{
    environment: ServerEnvironment;
    read_file: (path: string) => string;
  }>,
): FarmOsCoreEnvironmentIdentityRuntime {
  const selected = input.environment[FARM_OS_CORE_RUNTIME_ENVIRONMENT_SELECTOR];
  if (selected === "staging") {
    return loadFarmOsCoreStagingEnvironmentIdentityRuntime(input);
  }
  if (selected === "production") {
    return loadFarmOsCoreProductionEnvironmentIdentityRuntime(input);
  }
  return startupBlocked("MANIFEST_MISSING_OR_INVALID");
}

function startupBlocked(
  reason: "MANIFEST_MISSING_OR_INVALID" | "RUNTIME_IDENTITY_MISMATCH",
): FarmOsCoreEnvironmentIdentityRuntime {
  const blocked = (): FarmOsCoreEnvironmentIdentityDecision => Object.freeze({
    decision: "STARTUP_BLOCK",
    reason,
  });
  return Object.freeze({
    state: "STARTUP_BLOCK",
    verifyRequest: blocked,
    verifyBoundUse: blocked,
    prepareOutboundRequest: blocked,
    verifyOutboundResponse: blocked,
  });
}

function responseHeaders(
  manifest: FarmOsEnvironmentIdentityManifest,
): Readonly<Record<string, string>> | null {
  const metadata = createFarmOsEnvironmentIdentityHandshakeMetadata(manifest);
  return metadata === null ? null :
    serializeFarmOsEnvironmentIdentityHandshakeHeaders(metadata);
}

function allow(
  headers: Readonly<Record<string, string>>,
  manifest: FarmOsEnvironmentIdentityManifest,
): FarmOsCoreEnvironmentIdentityDecision {
  return Object.freeze({
    decision: "ALLOW",
    response_headers: headers,
    verified_scope: Object.freeze({
      environment_id: manifest.environment_id,
      installation_id: manifest.installation_id,
      farm_scope: manifest.farm_scope,
    }),
  });
}

function deny(
  reason: Extract<FarmOsCoreEnvironmentIdentityDecision,
    { decision: "DENY" }>["reason"],
): FarmOsCoreEnvironmentIdentityDecision {
  return Object.freeze({ decision: "DENY", reason });
}

export function loadFarmOsCoreEnvironmentIdentityRuntime(
  input: RuntimeInput,
): FarmOsCoreEnvironmentIdentityRuntime {
  let manifestValue: unknown;
  let observedValue: unknown;
  try {
    manifestValue = input.manifest_loader();
    observedValue = input.observed_identity_loader();
  } catch {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  const manifest = parseFarmOsEnvironmentIdentityManifest(manifestValue);
  if (manifest === null) return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  const binding = compareFarmOsEnvironmentIdentityRuntimeBinding({
    expected_manifest: manifest,
    observed_identity: observedValue,
  });
  if (binding.result !== "MATCH") {
    return startupBlocked("RUNTIME_IDENTITY_MISMATCH");
  }
  const verifiedHeaders = responseHeaders(manifest);
  if (verifiedHeaders === null) {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }

  const matchingScope = (input: Readonly<{
    environment_id: string;
    installation_id: string;
    farm_scope: string;
  }>): boolean => input.environment_id === manifest.environment_id &&
    input.installation_id === manifest.installation_id &&
    input.farm_scope === manifest.farm_scope;

  const compareHeaders = (headers: Headers) => {
    const parsed = parseFarmOsEnvironmentIdentityHandshakeHeaders({
      headers,
      source: "trusted_server_transport",
    });
    if (!parsed.accepted) return deny("HANDSHAKE_INVALID");
    const comparison = compareFarmOsEnvironmentIdentityHandshake({
      expected_manifest: manifest,
      metadata: parsed.metadata,
    });
    return comparison.result === "MATCH"
      ? allow(verifiedHeaders, manifest)
      : deny("HANDSHAKE_MISMATCH");
  };

  return Object.freeze({
    state: "READY",
    verifyRequest({ request, transport_authority }) {
      if (transport_authority !== "authenticated_server_transport") {
        return deny("UNTRUSTED_TRANSPORT");
      }
      return compareHeaders(request.headers);
    },
    verifyBoundUse(boundUse) {
      return matchingScope(boundUse)
        ? allow(verifiedHeaders, manifest)
        : deny("SCOPE_MISMATCH");
    },
    prepareOutboundRequest(target) {
      return matchingScope({
          environment_id: target.target_environment_id,
          installation_id: target.target_installation_id,
          farm_scope: target.target_farm_scope,
        }) && manifest.allowed_endpoint_aliases.includes(
          target.target_endpoint_alias,
        )
        ? allow(verifiedHeaders, manifest)
        : deny("TARGET_MISMATCH");
    },
    verifyOutboundResponse(headers) {
      const result = compareHeaders(headers);
      return result.decision === "ALLOW"
        ? result
        : deny("RESPONSE_IDENTITY_INVALID");
    },
  });
}

export const farmOsCoreEnvironmentIdentityRuntime =
  loadFarmOsCoreSelectedEnvironmentIdentityRuntime({
    environment: process.env,
    read_file: (path) => readFileSync(path, "utf8"),
  });

export function appendFarmOsCoreObservedIdentityHeaders(
  response: Response,
  decision: FarmOsCoreEnvironmentIdentityDecision,
): Response {
  if (decision.decision !== "ALLOW") return response;
  const headers = new Headers(response.headers);
  for (const [name, value] of Object.entries(decision.response_headers)) {
    headers.set(name, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function runFarmOsCoreEnvironmentIdentityProtectedHandler<T>(
  input: {
    runtime: FarmOsCoreEnvironmentIdentityRuntime;
    request: Request;
    transport_authority: FarmOsCoreEnvironmentIdentityTransportAuthority;
    use: "database" | "provider" | "integration";
    handler: () => Promise<T>;
  },
): Promise<Readonly<{
  decision: FarmOsCoreEnvironmentIdentityDecision;
  value: T | null;
}>> {
  const requestDecision = input.runtime.verifyRequest({
    request: input.request,
    transport_authority: input.transport_authority,
  });
  if (requestDecision.decision !== "ALLOW") {
    return Object.freeze({ decision: requestDecision, value: null });
  }
  const useDecision = input.runtime.verifyBoundUse({
    use: input.use,
    ...requestDecision.verified_scope,
  });
  if (useDecision.decision !== "ALLOW") {
    return Object.freeze({ decision: useDecision, value: null });
  }
  return Object.freeze({
    decision: requestDecision,
    value: await input.handler(),
  });
}

export function createFarmOsCoreEnvironmentIdentityFixtureRuntime(input: {
  manifest: unknown;
  observed_identity: FarmOsEnvironmentRuntimeIdentityEvidence;
}): FarmOsCoreEnvironmentIdentityRuntime {
  return loadFarmOsCoreEnvironmentIdentityRuntime({
    manifest_loader: () => input.manifest,
    observed_identity_loader: () => input.observed_identity,
  });
}
