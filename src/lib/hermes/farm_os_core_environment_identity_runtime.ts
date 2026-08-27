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

export const FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT = Object.freeze({
  enabled: "FARMOS_CORE_STAGING_RUNTIME_ENABLED",
  runtime_identity: "FARMOS_CORE_STAGING_RUNTIME_IDENTITY",
  manifest_path: "FARMOS_CORE_STAGING_ENVIRONMENT_MANIFEST_PATH",
  manifest_pin_path: "FARMOS_CORE_STAGING_ENVIRONMENT_MANIFEST_PIN_PATH",
  runtime_identity_path: "FARMOS_CORE_STAGING_RUNTIME_IDENTITY_PATH",
} as const);

const STAGING_FILE_MAXIMUM_BYTES = 128 * 1024;
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
  if (Buffer.byteLength(raw, "utf8") > STAGING_FILE_MAXIMUM_BYTES) {
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

/**
 * Staging activation is explicit and file-backed. A separate external pin is
 * compared with canonical Environment Manifest bytes before the ordinary
 * runtime loader can observe either payload. The E4 reconciliation Evidence
 * digest is lineage only and is explicitly rejected as a manifest pin. No
 * browser value, request header, database URL, credential, Production alias,
 * or fallback participates in this decision.
 */
export function loadFarmOsCoreStagingEnvironmentIdentityRuntime(input: Readonly<{
  environment: ServerEnvironment;
  read_file: (path: string) => string;
}>): FarmOsCoreEnvironmentIdentityRuntime {
  if (input.environment[FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.enabled] !==
      "true" ||
    input.environment[
        FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity
      ] !== FARM_OS_CORE_STAGING_RUNTIME_IDENTITY) {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  const manifestPath = input.environment[
    FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_path
  ];
  const manifestPinPath = input.environment[
    FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.manifest_pin_path
  ];
  const runtimeIdentityPath = input.environment[
    FARM_OS_CORE_STAGING_RUNTIME_ENVIRONMENT.runtime_identity_path
  ];
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
    manifest.environment_id !== FARM_OS_CORE_STAGING_ENVIRONMENT_ID ||
    manifest.environment_class !== "staging" ||
    manifest.installation_id !== FARM_OS_CORE_STAGING_INSTALLATION_ID ||
    manifest.farm_scope !== "apparetenkei-primary-farm" ||
    manifest.business_timezone !== "Asia/Tokyo" ||
    manifest.core_endpoint_alias !== FARM_OS_CORE_STAGING_RUNTIME_IDENTITY ||
    manifest.database_bindings.app_business.migration_head !==
      FARM_OS_APP_BUSINESS_STAGING_MIGRATION_HEAD ||
    manifest.database_bindings.app_business.credential_class !==
      FARM_OS_APP_BUSINESS_STAGING_CREDENTIAL_CLASS ||
    manifest.database_bindings.core_operational_memory.credential_class !==
      FARM_OS_CORE_MEMORY_STAGING_CREDENTIAL_CLASS ||
    manifest.database_bindings.core_operational_memory.migration_head !==
      FARM_OS_CORE_MEMORY_STAGING_MIGRATION_HEAD ||
    !manifest.allowed_endpoint_aliases.includes(
      FARM_OS_CORE_STAGING_RUNTIME_IDENTITY,
    ) ||
    !manifest.allowed_endpoint_aliases.includes(
      "farming-app-staging-primary",
    ) ||
    manifest.allowed_endpoint_aliases.some((alias) =>
      alias.includes("production")
    ) ||
    Object.values(manifest.database_bindings).some((binding) =>
      binding.logical_name.includes("production") ||
      binding.credential_class.includes("production")
    ) || String(manifest.database_bindings.app_business.credential_class) ===
      String(manifest.database_bindings.core_operational_memory
        .credential_class)) {
    return startupBlocked("MANIFEST_MISSING_OR_INVALID");
  }
  return loadFarmOsCoreEnvironmentIdentityRuntime({
    manifest_loader: () => manifest,
    observed_identity_loader: () => observedValue,
  });
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

/**
 * Existing deployments remain blocked because they do not carry the exact
 * Staging activation tuple. The E5 Staging service can activate only from
 * explicit server-owned manifest, external pin, and observed identity files.
 */
export const farmOsCoreEnvironmentIdentityRuntime =
  loadFarmOsCoreStagingEnvironmentIdentityRuntime({
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
