import { Pool, type PoolConfig } from "pg";

import {
  createFarmOsProjectionFirstAuthorizationAdapter,
  createFarmOsProjectionFirstAuthorizationContext,
  type FarmOsProjectionFirstActorEvidence,
  type FarmOsProjectionFirstAuthorizationEvent,
} from "./farm_os_projection_first_authorization";
import {
  createFarmOsProjectionFirstRequest,
  type FarmOsProjectionFirstResponse,
} from "./farm_os_projection_first_contract";
import {
  FarmOsProjectionFirstInstallationBindingError,
  loadFarmOsProjectionFirstInstallationBinding,
  type FarmOsProjectionFirstInstallationBinding,
} from "./farm_os_projection_first_installation_binding";
import {
  FarmOsProjectionFirstPostgresReadAdapter,
  type FarmOsProjectionFirstScopedReadEvent,
} from "./farm_os_projection_first_postgres_read_adapter";
import {
  loadFarmOsCoreMemorySelectedReadPoolConfig,
} from "./farm_os_core_memory_read_runtime_config";
import {
  FarmOsProjectionFirstRuntime,
  FarmOsProjectionFirstService,
  type FarmOsProjectionFirstEvent,
} from "./farm_os_projection_first_runtime";
import {
  adaptFarmOsProjectionFirstSlackBusinessDate,
  createFarmOsProjectionFirstClarificationResponse,
} from "./farm_os_projection_first_slack_adapter";

export const FARM_OS_PROJECTION_FIRST_DATABASE_CONFIGURATION_ERROR =
  "PROJECTION_FIRST_DATABASE_CONFIGURATION_UNAVAILABLE" as const;
export type FarmOsProjectionFirstProductionEvent =
  | "FARMOS_PROJECTION_FIRST_BINDING_LOADED"
  | "FARMOS_PROJECTION_FIRST_BINDING_REJECTED"
  | "FARMOS_PROJECTION_FIRST_SLACK_RESPONSE_READY"
  | FarmOsProjectionFirstAuthorizationEvent
  | FarmOsProjectionFirstScopedReadEvent
  | FarmOsProjectionFirstEvent;

type Environment = Record<string, string | undefined>;

function emit(
  listener: ((event: FarmOsProjectionFirstProductionEvent) => void) | undefined,
  event: FarmOsProjectionFirstProductionEvent,
): void {
  try {
    listener?.(event);
  } catch {
    // Fixed observability cannot change production service behavior.
  }
}

export function loadFarmOsProjectionFirstLocalPostgresConfig(
  environment: Environment,
): PoolConfig {
  try {
    return loadFarmOsCoreMemorySelectedReadPoolConfig({ environment });
  } catch {
    throw new Error(FARM_OS_PROJECTION_FIRST_DATABASE_CONFIGURATION_ERROR);
  }
}

export class FarmOsProjectionFirstProductionService {
  constructor(private readonly dependencies: {
    binding: FarmOsProjectionFirstInstallationBinding;
    service: FarmOsProjectionFirstService;
    closeRepository: () => Promise<void>;
    clock: () => Date;
    onEvent?: (event: FarmOsProjectionFirstProductionEvent) => void;
  }) {}

  async respondFromSlack(input: {
    query: string;
    actor: FarmOsProjectionFirstActorEvidence;
  }): Promise<FarmOsProjectionFirstResponse> {
    const now = this.dependencies.clock();
    const date = adaptFarmOsProjectionFirstSlackBusinessDate({
      query: input.query,
      now,
    });
    if (date.result === "clarification_required") {
      emit(
        this.dependencies.onEvent,
        "FARMOS_PROJECTION_FIRST_SLACK_RESPONSE_READY",
      );
      return createFarmOsProjectionFirstClarificationResponse(
        date.business_date,
      );
    }
    const authorizationContext =
      createFarmOsProjectionFirstAuthorizationContext({
        binding: this.dependencies.binding,
        actor: input.actor,
      });
    const response = await this.dependencies.service.respond({
      request: createFarmOsProjectionFirstRequest({
        query: input.query,
        business_date: date.business_date,
        response_mode: "fast",
        farm_scope: this.dependencies.binding.farm_scope,
        requested_at: now.toISOString(),
      }),
      authorization_context: authorizationContext,
    });
    emit(
      this.dependencies.onEvent,
      "FARMOS_PROJECTION_FIRST_SLACK_RESPONSE_READY",
    );
    return response;
  }

  close(): Promise<void> {
    return this.dependencies.closeRepository();
  }
}

export function createFarmOsProjectionFirstProductionService(input: {
  environment?: Environment;
  clock?: () => Date;
  onEvent?: (event: FarmOsProjectionFirstProductionEvent) => void;
} = {}): FarmOsProjectionFirstProductionService {
  const environment = input.environment ?? process.env;
  let binding: FarmOsProjectionFirstInstallationBinding;
  try {
    binding = loadFarmOsProjectionFirstInstallationBinding(environment);
    emit(input.onEvent, "FARMOS_PROJECTION_FIRST_BINDING_LOADED");
  } catch (error) {
    emit(input.onEvent, "FARMOS_PROJECTION_FIRST_BINDING_REJECTED");
    if (error instanceof FarmOsProjectionFirstInstallationBindingError) {
      throw error;
    }
    throw new FarmOsProjectionFirstInstallationBindingError();
  }

  const pool = new Pool(
    loadFarmOsProjectionFirstLocalPostgresConfig(environment),
  );
  const repository = new FarmOsProjectionFirstPostgresReadAdapter({
    installation_binding: binding,
    postgres_pool: pool,
    owns_pool: true,
    onEvent: (event) => emit(input.onEvent, event),
  });
  const authorization = createFarmOsProjectionFirstAuthorizationAdapter({
    binding,
    onEvent: (event) => emit(input.onEvent, event),
  });
  const runtime = new FarmOsProjectionFirstRuntime({
    authorization,
    repository,
    onEvent: (event) => emit(input.onEvent, event),
  });
  return new FarmOsProjectionFirstProductionService({
    binding,
    service: new FarmOsProjectionFirstService(runtime),
    closeRepository: () => repository.close(),
    clock: input.clock ?? (() => new Date()),
    onEvent: input.onEvent,
  });
}

export const FARM_OS_PROJECTION_FIRST_WEB_INTEGRATION_STATUS =
  "NOT_WIRED_FAIL_CLOSED" as const;
export const FARM_OS_PROJECTION_FIRST_WEB_INTEGRATION_ERROR =
  "PROJECTION_FIRST_WEB_ACTOR_AUTHORITY_MISSING" as const;
