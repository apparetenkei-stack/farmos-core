import {
  runFarmOsDay150CrossProcessQualificationWorker,
  type FarmOsDay150CrossProcessQualificationFault,
  type FarmOsDay150CrossProcessQualificationOperation,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

const [storeRoot, operationRaw, faultRaw, ...rest] = process.argv.slice(2);
const operations = new Set<FarmOsDay150CrossProcessQualificationOperation>([
  "CREATE_PRECLAIM", "CREATE_CLAIM_ONLY", "CREATE_AMBIGUOUS_MARKER_ABSENT",
  "CREATE_CONSUMED", "CREATE_TERMINAL_FAILURE", "CREATE_TERMINAL_ACK_LOST", "INSPECT",
  "PUBLIC_ACTIVE_BECOME_MUTATION_ELIGIBLE", "PUBLIC_ACTIVE_LOSS_BEFORE_CLAIM",
  "PUBLIC_ACTIVE_AMBIGUOUS_CLAIM", "PUBLIC_ACTIVE_LOSS_AFTER_CLAIM",
  "PUBLIC_ACTIVE_LOSS_AFTER_MARKER", "PUBLIC_ACTIVE_RESTART",
  "PUBLIC_ACTIVE_SUCCESS",
]);
const faults = new Set<FarmOsDay150CrossProcessQualificationFault>([
  "NONE", "CLAIM_MISSING", "CLAIM_CORRUPT", "CLAIM_WRONG_AUTHORIZATION",
  "CLAIM_WRONG_PLAN_DIGEST", "CLAIM_WRONG_BUNDLE_DIGEST", "CLAIM_WRONG_RUN_ID",
  "CLAIM_WRONG_ATTEMPT_ID", "MARKER_CORRUPT", "MARKER_WRONG_ATTEMPT_ID",
]);
if (!storeRoot || !operations.has(operationRaw as FarmOsDay150CrossProcessQualificationOperation) ||
  rest.length !== 0 || (faultRaw !== undefined &&
    !faults.has(faultRaw as FarmOsDay150CrossProcessQualificationFault))) {
  throw new Error("CROSS_PROCESS_QUALIFICATION_ARGUMENT_REJECTED");
}
const result = await runFarmOsDay150CrossProcessQualificationWorker({
  store_root: storeRoot,
  operation: operationRaw as FarmOsDay150CrossProcessQualificationOperation,
  fault: (faultRaw ?? "NONE") as FarmOsDay150CrossProcessQualificationFault,
});
process.stdout.write(`${JSON.stringify(result)}\n`);
