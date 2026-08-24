import {
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
 * No environment manifest is activated implicitly. Deployment wiring must
 * replace this blocked runtime with an explicitly loaded, server-owned one.
 */
export const farmOsCoreEnvironmentIdentityRuntime =
  loadFarmOsCoreEnvironmentIdentityRuntime({
    manifest_loader: () => null,
    observed_identity_loader: () => null,
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
