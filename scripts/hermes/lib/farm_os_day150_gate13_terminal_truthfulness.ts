import type { FarmOsDay150Gate13ThirdAttemptTerminal } from
  "../../../src/lib/hermes/farm_os_day150_gate13_third_attempt_authority";

export type FarmOsDay150Gate13CleanupObservation =
  | "ZERO_RESIDUAL_CONFIRMED"
  | "RESIDUAL_PRESENT_CONFIRMED"
  | "CLEANUP_OUTCOME_UNKNOWN";

export type FarmOsDay150Gate13ResultPublicationObservation =
  | "DURABLE_RESULT_PUBLISHED"
  | "RESULT_NOT_REQUIRED"
  | "RESULT_PUBLICATION_OUTCOME_UNKNOWN";

export type FarmOsDay150Gate13TerminalDecision = Readonly<{
  qualification_result: FarmOsDay150Gate13ThirdAttemptTerminal["qualification_result"];
  failure_boundary: string | null;
  zero_residual: boolean;
  recovery_permitted: boolean;
  qualification_rerun_count: 0;
  history_rewrite_count: 0;
}>;

export function decideFarmOsDay150Gate13Terminal(input: Readonly<{
  semantic_qualification_passed: boolean;
  semantic_failure_boundary: string | null;
  cleanup_observation: FarmOsDay150Gate13CleanupObservation;
  result_publication: FarmOsDay150Gate13ResultPublicationObservation;
}>): FarmOsDay150Gate13TerminalDecision {
  if (input.cleanup_observation === "CLEANUP_OUTCOME_UNKNOWN") {
    return Object.freeze({ qualification_result: "QUALIFICATION_OUTCOME_UNKNOWN",
      failure_boundary: "RECOVERY_CLEANUP_OUTCOME_UNKNOWN", zero_residual: false,
      recovery_permitted: true, qualification_rerun_count: 0, history_rewrite_count: 0 });
  }
  if (input.cleanup_observation === "RESIDUAL_PRESENT_CONFIRMED") {
    return Object.freeze({ qualification_result: "QUALIFICATION_FAILED",
      failure_boundary: "QUALIFICATION_ZERO_RESIDUAL_FALSE", zero_residual: false,
      recovery_permitted: true, qualification_rerun_count: 0, history_rewrite_count: 0 });
  }
  if (input.result_publication === "RESULT_PUBLICATION_OUTCOME_UNKNOWN") {
    return Object.freeze({ qualification_result: "QUALIFICATION_OUTCOME_UNKNOWN",
      failure_boundary: "QUALIFICATION_RESULT_PUBLICATION_OUTCOME_UNKNOWN", zero_residual: true,
      recovery_permitted: false, qualification_rerun_count: 0, history_rewrite_count: 0 });
  }
  if (!input.semantic_qualification_passed) {
    return Object.freeze({ qualification_result: "QUALIFICATION_FAILED",
      failure_boundary: input.semantic_failure_boundary ?? "QUALIFICATION_SEMANTIC_CASE_FAILED",
      zero_residual: true, recovery_permitted: false,
      qualification_rerun_count: 0, history_rewrite_count: 0 });
  }
  if (input.result_publication !== "DURABLE_RESULT_PUBLISHED") {
    return Object.freeze({ qualification_result: "QUALIFICATION_OUTCOME_UNKNOWN",
      failure_boundary: "QUALIFICATION_RESULT_NOT_DURABLE", zero_residual: true,
      recovery_permitted: false, qualification_rerun_count: 0, history_rewrite_count: 0 });
  }
  return Object.freeze({ qualification_result: "QUALIFICATION_SUCCESS", failure_boundary: null,
    zero_residual: true, recovery_permitted: false,
    qualification_rerun_count: 0, history_rewrite_count: 0 });
}

export function isFarmOsDay150Gate13ResidualRecoveryPermitted(
  terminal: FarmOsDay150Gate13ThirdAttemptTerminal,
): boolean {
  return terminal.qualification_result !== "QUALIFICATION_SUCCESS" &&
    terminal.zero_residual === false && terminal.failure_boundary !== null;
}

export async function reconcileFarmOsDay150Gate13ResidualFailure(input: Readonly<{
  terminal: FarmOsDay150Gate13ThirdAttemptTerminal;
  acquire_recovery_ownership: () => Promise<void>;
  reconcile_owned_resources: () => Promise<Readonly<{ zero_residual: boolean }>>;
}>): Promise<Readonly<{
  original_terminal_digest: `sha256:${string}`;
  original_terminal_preserved: true;
  recovery_zero_residual: boolean;
  qualification_rerun_count: 0;
  history_rewrite_count: 0;
}>> {
  if (!isFarmOsDay150Gate13ResidualRecoveryPermitted(input.terminal)) {
    throw new Error("GATE13_RESIDUAL_TERMINAL_NOT_RECOVERABLE");
  }
  await input.acquire_recovery_ownership();
  const recovery = await input.reconcile_owned_resources();
  return Object.freeze({ original_terminal_digest: input.terminal.terminal_digest,
    original_terminal_preserved: true, recovery_zero_residual: recovery.zero_residual,
    qualification_rerun_count: 0, history_rewrite_count: 0 });
}
