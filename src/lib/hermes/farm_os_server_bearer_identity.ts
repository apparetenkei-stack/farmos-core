import { createHash, timingSafeEqual } from "node:crypto";

export const FARM_OS_SERVER_BEARER_AUTHENTICATION_SCHEMA_VERSION =
  "farmos.server_bearer_authentication.v1" as const;

export type FarmOsServerBearerAuthenticationResult =
  | Readonly<{
    schema_version: typeof FARM_OS_SERVER_BEARER_AUTHENTICATION_SCHEMA_VERSION;
    status: "authenticated";
    principal_ref: string;
  }>
  | Readonly<{
    schema_version: typeof FARM_OS_SERVER_BEARER_AUTHENTICATION_SCHEMA_VERSION;
    status: "unavailable" | "unauthenticated" | "invalid";
    principal_ref: null;
  }>;

export type FarmOsServerBearerActorDirectory<TActor> = {
  resolvePrincipal(principalRef: string): Promise<TActor | null>;
};

export type FarmOsServerBearerSecretComparator = (
  presentedToken: string,
  configuredToken: string,
) => boolean;

const MAXIMUM_TOKEN_LENGTH = 512;
const SAFE_TOKEN = /^[\x21-\x2b\x2d-\x7e]+$/u;
const BOUNDED_PRINCIPAL = /^[A-Za-z0-9][A-Za-z0-9._:@-]{0,127}$/u;

export function isFarmOsServerBearerToken(value: unknown): value is string {
  return typeof value === "string" && value.length > 0 &&
    value.length <= MAXIMUM_TOKEN_LENGTH && SAFE_TOKEN.test(value);
}

export function compareFarmOsServerBearerSecrets(
  presentedToken: string,
  configuredToken: string,
): boolean {
  const presentedDigest = createHash("sha256")
    .update(presentedToken, "utf8").digest();
  const configuredDigest = createHash("sha256")
    .update(configuredToken, "utf8").digest();
  return timingSafeEqual(presentedDigest, configuredDigest);
}

function denied(
  status: "unavailable" | "unauthenticated" | "invalid",
): FarmOsServerBearerAuthenticationResult {
  return {
    schema_version: FARM_OS_SERVER_BEARER_AUTHENTICATION_SCHEMA_VERSION,
    status,
    principal_ref: null,
  };
}

export class FarmOsServerBearerAuthenticationProvider {
  constructor(
    private readonly configuration: Readonly<{
      token: string;
      principal_ref: string;
    }> | null,
    private readonly compareSecrets: FarmOsServerBearerSecretComparator =
      compareFarmOsServerBearerSecrets,
  ) {}

  async authenticateServerRequest(
    request: Request,
  ): Promise<FarmOsServerBearerAuthenticationResult> {
    if (this.configuration === null) return denied("unavailable");
    const authorization = request.headers.get("authorization");
    if (authorization === null) return denied("unauthenticated");
    if (authorization.includes(",") ||
      !authorization.startsWith("Bearer ")) {
      return denied("invalid");
    }
    const token = authorization.slice("Bearer ".length);
    if (!isFarmOsServerBearerToken(token)) {
      return denied("unauthenticated");
    }
    try {
      if (!this.compareSecrets(token, this.configuration.token)) {
        return denied("unauthenticated");
      }
    } catch {
      return denied("unauthenticated");
    }
    return {
      schema_version: FARM_OS_SERVER_BEARER_AUTHENTICATION_SCHEMA_VERSION,
      status: "authenticated",
      principal_ref: this.configuration.principal_ref,
    };
  }
}

export class FarmOsServerBearerExactActorDirectory<TActor>
  implements FarmOsServerBearerActorDirectory<TActor> {
  constructor(
    private readonly principalRef: string | null,
    private readonly actor: TActor | null,
  ) {}

  async resolvePrincipal(principalRef: string): Promise<TActor | null> {
    if (this.principalRef === null || this.actor === null ||
      principalRef !== this.principalRef) return null;
    return structuredClone(this.actor);
  }
}

export function createFarmOsServerBearerIdentity<TActor>(input: {
  token: unknown;
  principal_ref: unknown;
  actor: TActor | null;
  compare_secrets?: FarmOsServerBearerSecretComparator;
}): {
  state: "ready" | "denied";
  authenticationProvider: FarmOsServerBearerAuthenticationProvider;
  actorDirectory: FarmOsServerBearerActorDirectory<TActor>;
} {
  const ready = isFarmOsServerBearerToken(input.token) &&
    typeof input.principal_ref === "string" &&
    BOUNDED_PRINCIPAL.test(input.principal_ref) && input.actor !== null;
  const configuration = ready
    ? { token: input.token as string, principal_ref: input.principal_ref as string }
    : null;
  return {
    state: ready ? "ready" : "denied",
    authenticationProvider: new FarmOsServerBearerAuthenticationProvider(
      configuration,
      input.compare_secrets,
    ),
    actorDirectory: new FarmOsServerBearerExactActorDirectory(
      ready ? configuration!.principal_ref : null,
      ready ? input.actor : null,
    ),
  };
}
