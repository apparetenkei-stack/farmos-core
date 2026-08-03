import {
  createFarmOsDailyProjectionCandidateBundle,
  parseFarmOsDailyProjectionCandidateBundle,
  type FarmOsDailyProjectionCandidateBundle,
  type FarmOsDailyProjectionContractResult,
} from "./farm_os_daily_operational_projection_contract";

export type FarmOsDailyOperationalProjectionFailure = Extract<
  FarmOsDailyProjectionContractResult,
  { candidate_bundle: null }
>;

export type FarmOsDailyOperationalProjectionGeneratorResult =
  | {
    ok: true;
    candidate_bundle: FarmOsDailyProjectionCandidateBundle;
    failure: null;
    persistence: false;
    active_write: false;
    automatic_promotion: false;
    production_operation: false;
  }
  | {
    ok: false;
    candidate_bundle: null;
    failure: FarmOsDailyOperationalProjectionFailure;
    persistence: false;
    active_write: false;
    automatic_promotion: false;
    production_operation: false;
  };

function contractInvalidFailure(): FarmOsDailyOperationalProjectionFailure {
  return {
    result: "contract_invalid",
    candidate_bundle: null,
    failure: {
      active_write: false,
      persistence: false,
      retry: false,
      production_operation: false,
      raw_secret_exposure: false,
    },
  };
}

function failed(
  failure: FarmOsDailyOperationalProjectionFailure,
): FarmOsDailyOperationalProjectionGeneratorResult {
  return {
    ok: false,
    candidate_bundle: null,
    failure,
    persistence: false,
    active_write: false,
    automatic_promotion: false,
    production_operation: false,
  };
}

export function generateFarmOsDailyOperationalProjection(
  input: unknown,
  authorizedFarmScope: string,
): FarmOsDailyOperationalProjectionGeneratorResult {
  try {
    const generated = createFarmOsDailyProjectionCandidateBundle(
      input,
      authorizedFarmScope,
    );
    if (generated.result !== "valid_candidate_bundle") {
      return failed(generated);
    }

    const exact = parseFarmOsDailyProjectionCandidateBundle(
      generated.candidate_bundle,
      input,
      authorizedFarmScope,
    );
    if (exact.result !== "valid_candidate_bundle") return failed(exact);

    return {
      ok: true,
      candidate_bundle: generated.candidate_bundle,
      failure: null,
      persistence: false,
      active_write: false,
      automatic_promotion: false,
      production_operation: false,
    };
  } catch {
    return failed(contractInvalidFailure());
  }
}
