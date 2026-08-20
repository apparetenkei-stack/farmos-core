import { stdin, stdout } from "node:process";

import { Pool } from "pg";

import {
  validateFarmOsProductionTargetExecutionApprovalLineage,
} from "../../src/lib/hermes/farm_os_production_target_execution_approval_authority";
import {
  validateFarmOsProductionTargetExecutionCommand,
} from "../../src/lib/hermes/farm_os_production_target_execution_command_authority";
import {
  validateFarmOsProductionTargetExecutionReceipt,
} from "../../src/lib/hermes/farm_os_production_target_execution_receipt_authority";
import {
  FarmOsProductionTargetExecutionPostgresRepository,
  type FarmOsProductionTargetExecutionPostgresPool,
} from "../../src/lib/hermes/farm_os_production_target_execution_postgres_repository";
import {
  FARM_OS_DAY150_GATE13_PERSISTED_CLOCK_EVIDENCE_READBACK_SQL,
  parseFarmOsDay150Gate13PersistedClockEvidenceReadback,
} from "./lib/farm_os_day150_gate13_persisted_clock_evidence";

type WorkerInput = Readonly<{
  host: "127.0.0.1";
  port: number;
  database: string;
  approval_id: string;
  approval_receipt_id: string;
  command_id: string | null;
  execution_binding_digest: `sha256:${string}` | null;
  receipt_id: string | null;
  receipt_digest: `sha256:${string}` | null;
  clock_evidence_id: string;
  clock_evidence_digest: `sha256:${string}`;
  required_clock_lower_bound: string;
  revocation: Readonly<{
    approval_digest: `sha256:${string}`;
    approval_receipt_digest: `sha256:${string}`;
    expected_head_version: number;
    expected_head_digest: `sha256:${string}`;
    exact_latest_event_id: string | null;
    exact_latest_event_digest: `sha256:${string}` | null;
  }> | null;
}>;

async function readStdin(): Promise<string> {
  let value = "";
  stdin.setEncoding("utf8");
  for await (const chunk of stdin) value += chunk;
  return value;
}

const input = JSON.parse(await readStdin()) as WorkerInput;
if (input.host !== "127.0.0.1" || !Number.isSafeInteger(input.port) || input.port < 1 ||
  input.port > 65_535 || !/^[a-z0-9_]{3,63}$/u.test(input.database)) {
  throw new Error("DAY150_GATE13_READBACK_INPUT_REJECTED");
}

const pool = new Pool({ host: input.host, port: input.port, database: input.database,
  user: "postgres", max: 2, connectionTimeoutMillis: 5_000 });
try {
  const clockRows = await pool.query<{ result: unknown }>(
    FARM_OS_DAY150_GATE13_PERSISTED_CLOCK_EVIDENCE_READBACK_SQL,
    [input.clock_evidence_id, input.clock_evidence_digest],
  );
  const clock = clockRows.rowCount === 1 ?
    parseFarmOsDay150Gate13PersistedClockEvidenceReadback({ value: clockRows.rows[0]?.result,
      expected_evidence_id: input.clock_evidence_id,
      expected_evidence_digest: input.clock_evidence_digest,
      required_lower_bound: input.required_clock_lower_bound }) : null;
  if (!clock) throw new Error("CLOCK_EVIDENCE_INVALID");
  const repository = new FarmOsProductionTargetExecutionPostgresRepository({
    pool: pool as unknown as FarmOsProductionTargetExecutionPostgresPool,
  });
  const lineage = await repository.readApprovalLineage({ approval_id: input.approval_id,
    approval_receipt_id: input.approval_receipt_id });
  const approvalValidated = lineage !== null &&
    validateFarmOsProductionTargetExecutionApprovalLineage({ ...lineage,
      clock_evidence: clock.evidence,
      persisted_clock_lower_bound: clock.persisted_observed_lower_bound }).accepted;
  const command = input.command_id && input.execution_binding_digest
    ? await repository.readCommand({ command_id: input.command_id,
      execution_binding_digest: input.execution_binding_digest }) : null;
  const commandValidated = command !== null && lineage !== null &&
    validateFarmOsProductionTargetExecutionCommand({ command, ...lineage,
      clock_evidence: clock.evidence,
      persisted_clock_lower_bound: clock.persisted_observed_lower_bound }).accepted;
  const lifecycle = input.command_id && input.execution_binding_digest
    ? await repository.readLifecycle({ command_id: input.command_id,
      execution_binding_digest: input.execution_binding_digest }) : null;
  const receipt = input.receipt_id && input.receipt_digest
    ? await repository.readExecutionReceipt({ receipt_id: input.receipt_id,
      receipt_digest: input.receipt_digest }) : null;
  const receiptValidated = receipt !== null && command !== null &&
    validateFarmOsProductionTargetExecutionReceipt({ receipt, command,
      clock_evidence: clock.evidence,
      persisted_clock_lower_bound: clock.persisted_observed_lower_bound }).accepted;
  const revocation = input.revocation === null ? null :
    await repository.readExactApprovalRevocationState({ approval_id: input.approval_id,
      approval_digest: input.revocation.approval_digest,
      approval_receipt_id: input.approval_receipt_id,
      approval_receipt_digest: input.revocation.approval_receipt_digest,
      expected_head_version: input.revocation.expected_head_version,
      expected_head_digest: input.revocation.expected_head_digest,
      exact_latest_event_id: input.revocation.exact_latest_event_id,
      exact_latest_event_digest: input.revocation.exact_latest_event_digest });
  stdout.write(`${JSON.stringify({ status: "PASS", approval_validated: approvalValidated,
    approval_digest: lineage?.approval.approval_digest ?? null,
    command_validated: commandValidated,
    command_digest: command?.command_record_digest ?? null,
    lifecycle_state: lifecycle?.state ?? null,
    lifecycle_version: lifecycle?.state_version ?? null,
    reservation_id: lifecycle?.reservation_id ?? null,
    reservation_digest: lifecycle?.reservation_digest ?? null,
    attempt_id: lifecycle?.attempt_id ?? null,
    attempt_digest: lifecycle?.attempt_digest ?? null,
    receipt_validated: receiptValidated,
    receipt_digest: receipt?.receipt_digest ?? null,
    revocation_status: revocation?.status ?? null,
    clock_evidence_validated: true,
    persisted_observed_lower_bound: clock.persisted_observed_lower_bound })}\n`);
} finally {
  await pool.end();
}
