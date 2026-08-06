import {
  createFarmOsServerBearerIdentity,
  type FarmOsServerBearerActorDirectory,
  type FarmOsServerBearerAuthenticationResult,
} from "./farm_os_server_bearer_identity";

export const FARM_OS_ACTIVE_PROJECTION_READ_ENV_KEYS = Object.freeze({
  token: "HERMES_ACTIVE_PROJECTION_READ_TOKEN",
  principalRef: "HERMES_ACTIVE_PROJECTION_READ_PRINCIPAL_REF",
  role: "HERMES_ACTIVE_PROJECTION_READ_ROLE",
  allowedScopeKeys: "HERMES_ACTIVE_PROJECTION_READ_ALLOWED_SCOPE_KEYS",
});
export const FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_ROLE =
  "administrator" as const;
export const FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_SCOPE =
  "active_projection_read" as const;

export type FarmOsActiveProjectionReadActorEvidence = Readonly<{
  schema_version: "farmos.active_projection_read.actor_evidence.v1";
  principal_ref: string;
  role: typeof FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_ROLE;
  allowed_scope_keys: readonly [
    typeof FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_SCOPE,
  ];
  authorization_verified: true;
  authentication_method: "bearer";
  server_owned: true;
}>;

export type FarmOsActiveProjectionReadAuthenticationResult =
  | Readonly<{ result: "unauthorized" }>
  | Readonly<{ result: "authenticated"; principal_ref: string }>;

export type FarmOsActiveProjectionReadAuthorizationResult =
  | Readonly<{ result: "forbidden" }>
  | Readonly<{
    result: "authorized";
    actor: FarmOsActiveProjectionReadActorEvidence;
  }>;

type ConfiguredActor = Readonly<{
  principal_ref: string;
  role: string | undefined;
  allowed_scope_keys: unknown;
}>;

function parseAllowedScopeKeys(value: string | undefined): unknown {
  if (typeof value !== "string") return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function exactAuthorizedActor(
  actor: ConfiguredActor,
): FarmOsActiveProjectionReadActorEvidence | null {
  if (actor.role !== FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_ROLE ||
    !Array.isArray(actor.allowed_scope_keys) ||
    JSON.stringify(actor.allowed_scope_keys) !==
      JSON.stringify([FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_SCOPE])) {
    return null;
  }
  return Object.freeze({
    schema_version: "farmos.active_projection_read.actor_evidence.v1",
    principal_ref: actor.principal_ref,
    role: FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_ROLE,
    allowed_scope_keys: Object.freeze([
      FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_SCOPE,
    ]) as readonly [typeof FARM_OS_ACTIVE_PROJECTION_READ_REQUIRED_SCOPE],
    authorization_verified: true,
    authentication_method: "bearer",
    server_owned: true,
  });
}

export function createFarmOsActiveProjectionReadAuthentication(input: {
  environment: Readonly<Record<string, string | undefined>>;
}): {
  state: "ready" | "denied";
  authenticate(request: Request): Promise<FarmOsActiveProjectionReadAuthenticationResult>;
  authorize(
    authentication: FarmOsActiveProjectionReadAuthenticationResult,
  ): Promise<FarmOsActiveProjectionReadAuthorizationResult>;
} {
  const principalRef = input.environment[
    FARM_OS_ACTIVE_PROJECTION_READ_ENV_KEYS.principalRef
  ];
  const configuredActor: ConfiguredActor | null =
    typeof principalRef === "string"
      ? Object.freeze({
        principal_ref: principalRef,
        role: input.environment[FARM_OS_ACTIVE_PROJECTION_READ_ENV_KEYS.role],
        allowed_scope_keys: parseAllowedScopeKeys(input.environment[
          FARM_OS_ACTIVE_PROJECTION_READ_ENV_KEYS.allowedScopeKeys
        ]),
      })
      : null;
  const identity = createFarmOsServerBearerIdentity({
    token: input.environment[FARM_OS_ACTIVE_PROJECTION_READ_ENV_KEYS.token],
    principal_ref: principalRef,
    actor: configuredActor,
  });
  const directory: FarmOsServerBearerActorDirectory<ConfiguredActor> =
    identity.actorDirectory;
  const authorizedActor = configuredActor === null
    ? null
    : exactAuthorizedActor(configuredActor);

  return {
    state: identity.state === "ready" && authorizedActor !== null
      ? "ready"
      : "denied",
    async authenticate(request) {
      const result: FarmOsServerBearerAuthenticationResult =
        await identity.authenticationProvider.authenticateServerRequest(request);
      return result.status === "authenticated"
        ? { result: "authenticated", principal_ref: result.principal_ref }
        : { result: "unauthorized" };
    },
    async authorize(authentication) {
      if (authentication.result !== "authenticated") {
        return { result: "forbidden" };
      }
      const resolved = await directory.resolvePrincipal(
        authentication.principal_ref,
      );
      if (resolved === null ||
        resolved.principal_ref !== authentication.principal_ref) {
        return { result: "forbidden" };
      }
      const actor = exactAuthorizedActor(resolved);
      return actor === null
        ? { result: "forbidden" }
        : { result: "authorized", actor };
    },
  };
}
