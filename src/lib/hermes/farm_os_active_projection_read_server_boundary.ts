import { Pool } from "pg";

import {
  parseFarmOsActiveProjectionReadResponse,
  type FarmOsActiveProjectionReadResponse,
} from "./farm_os_active_projection_read_contract";
import {
  createFarmOsActiveProjectionReadAuthentication,
  type FarmOsActiveProjectionReadAuthenticationResult,
  type FarmOsActiveProjectionReadAuthorizationResult,
} from "./farm_os_active_projection_read_authentication";
import {
  FarmOsActiveProjectionReadRepositoryError,
  FarmOsActiveProjectionReadService,
  type FarmOsActiveProjectionReadInstallationScope,
  type FarmOsActiveProjectionReadRepository,
} from "./farm_os_active_projection_read_service";
import {
  loadFarmOsProjectionFirstInstallationBinding,
  parseFarmOsProjectionFirstInstallationBinding,
  type FarmOsProjectionFirstInstallationBinding,
} from "./farm_os_projection_first_installation_binding";
import {
  FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR,
  FarmOsProjectionFirstPostgresReadAdapter,
} from "./farm_os_projection_first_postgres_read_adapter";
import {
  loadFarmOsProjectionFirstLocalPostgresConfig,
} from "./farm_os_projection_first_production_service";

export type FarmOsActiveProjectionReadServerDependencies = Readonly<{
  authenticate: (request: Request) => Promise<unknown>;
  authorize: (authentication: FarmOsActiveProjectionReadAuthenticationResult) =>
    Promise<unknown>;
  clock: () => string;
  installation_binding_loader: () => Promise<unknown> | unknown;
  read_service: (input: {
    installation_binding: FarmOsProjectionFirstInstallationBinding;
    installation_scope: FarmOsActiveProjectionReadInstallationScope;
    requested_at: string;
  }) => Promise<unknown>;
}>;

const RESPONSE_HEADERS = Object.freeze({
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
});
const CANONICAL_TIMESTAMP =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function errorResponse(
  error: "unauthorized" | "forbidden" | "invalid_request" |
    "internal_error",
  status: 400 | 401 | 403 | 500,
): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: RESPONSE_HEADERS,
  });
}

function parseAuthentication(
  value: unknown,
): FarmOsActiveProjectionReadAuthenticationResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.result === "unauthorized" && Object.keys(record).length === 1) {
    return { result: "unauthorized" };
  }
  return record.result === "authenticated" &&
      typeof record.principal_ref === "string" &&
      Object.keys(record).length === 2
    ? { result: "authenticated", principal_ref: record.principal_ref }
    : null;
}

function parseAuthorization(
  value: unknown,
): FarmOsActiveProjectionReadAuthorizationResult | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.result === "forbidden" && Object.keys(record).length === 1) {
    return { result: "forbidden" };
  }
  if (record.result !== "authorized" || Object.keys(record).length !== 2 ||
    typeof record.actor !== "object" || record.actor === null ||
    Array.isArray(record.actor)) return null;
  const actor = record.actor as Record<string, unknown>;
  if (Object.keys(actor).length !== 7 ||
    actor.schema_version !== "farmos.active_projection_read.actor_evidence.v1" ||
    typeof actor.principal_ref !== "string" ||
    actor.role !== "administrator" ||
    !Array.isArray(actor.allowed_scope_keys) ||
    JSON.stringify(actor.allowed_scope_keys) !==
      JSON.stringify(["active_projection_read"]) ||
    actor.authorization_verified !== true ||
    actor.authentication_method !== "bearer" ||
    actor.server_owned !== true) return null;
  return value as FarmOsActiveProjectionReadAuthorizationResult;
}

function canonicalRequestedAt(value: unknown): value is string {
  return typeof value === "string" && CANONICAL_TIMESTAMP.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString() === value;
}

export async function serveFarmOsActiveProjectionRead(input: {
  request: Request;
  dependencies: FarmOsActiveProjectionReadServerDependencies;
}): Promise<Response> {
  let authentication: FarmOsActiveProjectionReadAuthenticationResult | null;
  try {
    authentication = parseAuthentication(
      await input.dependencies.authenticate(input.request),
    );
  } catch {
    authentication = null;
  }
  if (authentication === null || authentication.result === "unauthorized") {
    return errorResponse("unauthorized", 401);
  }

  let authorization: FarmOsActiveProjectionReadAuthorizationResult | null;
  try {
    authorization = parseAuthorization(
      await input.dependencies.authorize(authentication),
    );
  } catch {
    authorization = null;
  }
  if (authorization === null || authorization.result === "forbidden" ||
    authorization.actor.principal_ref !== authentication.principal_ref) {
    return errorResponse("forbidden", 403);
  }

  let url: URL;
  try {
    url = new URL(input.request.url);
  } catch {
    return errorResponse("invalid_request", 400);
  }
  if ([...url.searchParams].length !== 0) {
    return errorResponse("invalid_request", 400);
  }

  try {
    const binding = parseFarmOsProjectionFirstInstallationBinding(
      await input.dependencies.installation_binding_loader(),
    );
    if (binding === null) return errorResponse("internal_error", 500);
    const requestedAt = input.dependencies.clock();
    if (!canonicalRequestedAt(requestedAt)) {
      return errorResponse("internal_error", 500);
    }
    const response = parseFarmOsActiveProjectionReadResponse(
      await input.dependencies.read_service({
        installation_binding: binding,
        installation_scope: {
          installation_id: binding.installation_id,
          farm_scope: binding.farm_scope,
        },
        requested_at: requestedAt,
      }),
    );
    if (response === null) return errorResponse("internal_error", 500);
    return new Response(JSON.stringify(response), {
      status: 200,
      headers: RESPONSE_HEADERS,
    });
  } catch {
    return errorResponse("internal_error", 500);
  }
}

function isBoundedReadError(error: unknown): boolean {
  return error instanceof Error &&
    error.message === FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR;
}

export function createFarmOsActiveProjectionReadProductionDependencies(input: {
  environment: Readonly<Record<string, string | undefined>>;
  clock?: () => string;
}): FarmOsActiveProjectionReadServerDependencies {
  const identity = createFarmOsActiveProjectionReadAuthentication({
    environment: input.environment,
  });
  return {
    authenticate: (request) => identity.authenticate(request),
    authorize: (authentication) => identity.authorize(authentication),
    clock: input.clock ?? (() => new Date().toISOString()),
    installation_binding_loader: () =>
      loadFarmOsProjectionFirstInstallationBinding(input.environment),
    read_service: async ({
      installation_binding,
      installation_scope,
      requested_at,
    }): Promise<FarmOsActiveProjectionReadResponse> => {
      const pool = new Pool(
        loadFarmOsProjectionFirstLocalPostgresConfig(input.environment),
      );
      const adapter = new FarmOsProjectionFirstPostgresReadAdapter({
        installation_binding,
        postgres_pool: pool,
        owns_pool: true,
      });
      const repository: FarmOsActiveProjectionReadRepository = {
        readProjectionBundle: async ({
          installation_scope: requestedScope,
          business_date,
        }) => {
          try {
            return await adapter.readProjectionBundle({
              authorized_scope: {
                ...requestedScope,
                authorization_id: "active_projection_read",
              },
              business_date,
            });
          } catch (error) {
            if (isBoundedReadError(error)) {
              throw new FarmOsActiveProjectionReadRepositoryError();
            }
            throw error;
          }
        },
      };
      try {
        return await new FarmOsActiveProjectionReadService({ repository }).read({
          installation_scope,
          requested_at,
        });
      } finally {
        await adapter.close();
      }
    },
  };
}
