import {
  FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT,
  type FarmOsProjectionFirstGroundingRef,
  type FarmOsProjectionFirstGuardFailureCode,
  type FarmOsProjectionFirstGuardResult,
} from "./farm_os_projection_first_contract";

export type FarmOsProjectionFirstGuardInput = {
  answer: string;
  expected_answer: string;
  requested_business_date: string;
  projection_business_date: string;
  projection_fresh: boolean;
  grounding_refs: FarmOsProjectionFirstGroundingRef[];
  supported_fact: boolean;
  hidden_business_action: boolean;
  write_claim_without_proof: boolean;
  raw_reasoning_present: boolean;
};

function rejected(
  failureCode: FarmOsProjectionFirstGuardFailureCode,
): FarmOsProjectionFirstGuardResult {
  return { status: "rejected", failure_codes: [failureCode] };
}

export function guardFarmOsProjectionFirstResponse(
  input: FarmOsProjectionFirstGuardInput,
): FarmOsProjectionFirstGuardResult {
  if (input.requested_business_date !== input.projection_business_date) {
    return rejected("business_date_mismatch");
  }
  if (!input.projection_fresh) return rejected("projection_stale");
  if (
    input.grounding_refs.length === 0 ||
    input.grounding_refs.length > FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT ||
    input.grounding_refs.some((reference) =>
      reference.business_date !== input.requested_business_date
    )
  ) {
    return rejected("insufficient_grounding");
  }
  if (
    !input.supported_fact ||
    input.answer !== input.expected_answer ||
    input.hidden_business_action ||
    input.write_claim_without_proof
  ) {
    return rejected("unsupported_fact");
  }
  if (
    input.raw_reasoning_present ||
    /<think>|<\/think>|reasoning[_\s-]*(?:content|trace)/iu.test(input.answer)
  ) {
    return rejected("response_contract_invalid");
  }
  return { status: "passed", failure_codes: [] };
}
