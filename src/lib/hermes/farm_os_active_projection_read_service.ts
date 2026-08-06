import {
  createFarmOsActiveProjectionReadResponse,
  FarmOsActiveProjectionReadContractError,
  type FarmOsActiveProjectionReadResponse,
} from "./farm_os_active_projection_read_contract";
import {
  deriveFarmOsBusinessDate,
  isFarmOsBusinessDate,
} from "./farm_os_business_date";
import {
  materializeFarmOsProjectionStateHistory,
} from "./farm_os_projection_state_contract";
import {
  isFarmOsProjectionFirstExactDateScopedBundle,
  selectFarmOsProjectionFirstProjection,
  type FarmOsProjectionFirstScopedBundle,
} from "./farm_os_projection_first_selector";

export type FarmOsActiveProjectionReadInstallationScope = Readonly<{
  installation_id: string;
  farm_scope: string;
}>;

export type FarmOsActiveProjectionReadRepository = {
  readProjectionBundle(input: {
    installation_scope: FarmOsActiveProjectionReadInstallationScope;
    business_date: string;
  }): Promise<unknown>;
};

export type FarmOsActiveProjectionReadValidationFailureCode =
  | "invalid_requested_at"
  | "invalid_installation_scope"
  | "malformed_repository_result";

export class FarmOsActiveProjectionReadValidationError extends Error {
  constructor(readonly code: FarmOsActiveProjectionReadValidationFailureCode) {
    super(code);
    this.name = "FarmOsActiveProjectionReadValidationError";
  }
}

export class FarmOsActiveProjectionReadRepositoryError extends Error {
  readonly code = "bounded_repository_failure" as const;

  constructor() {
    super("bounded_repository_failure");
    this.name = "FarmOsActiveProjectionReadRepositoryError";
  }
}

const SCOPE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

function validScope(value: unknown): value is FarmOsActiveProjectionReadInstallationScope {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return Object.keys(record).length === 2 &&
    Object.hasOwn(record, "installation_id") &&
    Object.hasOwn(record, "farm_scope") &&
    typeof record.installation_id === "string" &&
    SCOPE_REFERENCE_PATTERN.test(record.installation_id) &&
    typeof record.farm_scope === "string" &&
    SCOPE_REFERENCE_PATTERN.test(record.farm_scope);
}

function isBoundedRepositoryFailure(error: unknown): boolean {
  return error instanceof FarmOsActiveProjectionReadRepositoryError;
}

function malformedRepositoryResult(): never {
  throw new FarmOsActiveProjectionReadValidationError(
    "malformed_repository_result",
  );
}

function availableResponse(input: {
  status: "current" | "stale";
  projection: NonNullable<ReturnType<
    typeof selectFarmOsProjectionFirstProjection
  >["projection"]>;
}): FarmOsActiveProjectionReadResponse {
  try {
    return createFarmOsActiveProjectionReadResponse({
      status: input.status,
      payload: input.projection.content,
      generated_at: input.projection.generated_at,
    });
  } catch (error) {
    if (error instanceof FarmOsActiveProjectionReadContractError) {
      return malformedRepositoryResult();
    }
    throw error;
  }
}

export class FarmOsActiveProjectionReadService {
  private readonly businessDateProvider: (timestamp: string) => string | null;

  constructor(private readonly dependencies: {
    repository: FarmOsActiveProjectionReadRepository;
    business_date_provider?: (timestamp: string) => string | null;
  }) {
    this.businessDateProvider = dependencies.business_date_provider ??
      deriveFarmOsBusinessDate;
  }

  async read(input: {
    installation_scope: unknown;
    requested_at: unknown;
  }): Promise<FarmOsActiveProjectionReadResponse> {
    if (!validScope(input.installation_scope)) {
      throw new FarmOsActiveProjectionReadValidationError(
        "invalid_installation_scope",
      );
    }
    if (typeof input.requested_at !== "string") {
      throw new FarmOsActiveProjectionReadValidationError(
        "invalid_requested_at",
      );
    }
    const businessDate = this.businessDateProvider(input.requested_at);
    if (businessDate === null || !isFarmOsBusinessDate(businessDate)) {
      throw new FarmOsActiveProjectionReadValidationError(
        "invalid_requested_at",
      );
    }

    let repositoryResult: unknown;
    try {
      repositoryResult = await this.dependencies.repository.readProjectionBundle({
        installation_scope: input.installation_scope,
        business_date: businessDate,
      });
    } catch (error) {
      if (isBoundedRepositoryFailure(error)) {
        return createFarmOsActiveProjectionReadResponse({
          status: "failed",
          payload: null,
          generated_at: null,
        });
      }
      throw error;
    }

    if (!isFarmOsProjectionFirstExactDateScopedBundle(repositoryResult, {
      farm_scope: input.installation_scope.farm_scope,
      business_date: businessDate,
    })) {
      return malformedRepositoryResult();
    }
    const bundle = repositoryResult;
    let activeCount = 0;
    for (const projection of bundle.projections) {
      const materialization = materializeFarmOsProjectionStateHistory(
        bundle.projection_state_events
          .filter((event) => event.projection_id === projection.projection_id)
          .map((event) => ({
            event_id: event.event_id,
            status: event.status,
            sequence: event.sequence,
          })),
      );
      if (materialization.result === "invalid_state_history") {
        return createFarmOsActiveProjectionReadResponse({
          status: "failed",
          payload: null,
          generated_at: null,
        });
      }
      if (materialization.persisted_state === "active") activeCount += 1;
    }
    if (activeCount > 1) {
      return createFarmOsActiveProjectionReadResponse({
        status: "failed",
        payload: null,
        generated_at: null,
      });
    }
    if (activeCount === 0) {
      return createFarmOsActiveProjectionReadResponse({
        status: "missing",
        payload: null,
        generated_at: null,
      });
    }

    const selected = selectFarmOsProjectionFirstProjection({
      authorized_farm_scope: input.installation_scope.farm_scope,
      business_date: businessDate,
      bundle,
    });
    if (selected.result === "selected") {
      return availableResponse({
        status: "current",
        projection: selected.projection,
      });
    }
    if (selected.result === "projection_stale" && selected.projection !== null) {
      return availableResponse({
        status: "stale",
        projection: selected.projection,
      });
    }
    if (selected.result === "projection_missing") {
      return createFarmOsActiveProjectionReadResponse({
        status: "missing",
        payload: null,
        generated_at: null,
      });
    }
    return createFarmOsActiveProjectionReadResponse({
      status: "failed",
      payload: null,
      generated_at: null,
    });
  }
}
