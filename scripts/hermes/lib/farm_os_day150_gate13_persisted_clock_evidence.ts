import {
  parseFarmOsProductionTargetExecutionClockEvidence,
  qualifyFarmOsProductionTargetExecutionClockEvidence,
  type FarmOsProductionTargetExecutionClockEvidence,
} from "../../../src/lib/hermes/farm_os_production_target_execution_trusted_clock_contract";

export type FarmOsDay150Gate13PersistedClockEvidenceReadback = Readonly<{
  evidence: FarmOsProductionTargetExecutionClockEvidence;
  persisted_observed_at: string;
  persisted_observed_lower_bound: string;
}>;

const exactKeys = (value: Record<string, unknown>, keys: readonly string[]) =>
  Object.keys(value).sort().join("\0") === [...keys].sort().join("\0");
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export function parseFarmOsDay150Gate13PersistedClockEvidenceReadback(input: Readonly<{
  value: unknown;
  expected_evidence_id: string;
  expected_evidence_digest: string;
  required_lower_bound?: string;
}>): FarmOsDay150Gate13PersistedClockEvidenceReadback | null {
  if (!record(input.value) || !exactKeys(input.value,
    ["evidence", "persisted_observed_at", "persisted_observed_lower_bound"])) return null;
  const parsed = parseFarmOsProductionTargetExecutionClockEvidence(input.value.evidence);
  if (!parsed.accepted || parsed.evidence.evidence_id !== input.expected_evidence_id ||
    parsed.evidence.evidence_digest !== input.expected_evidence_digest ||
    input.value.persisted_observed_at !== parsed.evidence.observed_at ||
    input.value.persisted_observed_lower_bound !== parsed.evidence.observed_lower_bound ||
    (input.required_lower_bound !== undefined &&
      input.required_lower_bound !== parsed.evidence.observed_lower_bound)) return null;
  const qualified = qualifyFarmOsProductionTargetExecutionClockEvidence({
    evidence: parsed.evidence, persisted_lower_bound: parsed.evidence.observed_lower_bound,
  });
  return qualified.accepted ? Object.freeze({ evidence: parsed.evidence,
    persisted_observed_at: parsed.evidence.observed_at,
    persisted_observed_lower_bound: parsed.evidence.observed_lower_bound }) : null;
}

export const FARM_OS_DAY150_GATE13_PERSISTED_CLOCK_EVIDENCE_READBACK_SQL = `
select pg_catalog.jsonb_build_object(
  'evidence', record_json,
  'persisted_observed_at', pg_catalog.to_char(observed_at at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
  'persisted_observed_lower_bound', pg_catalog.to_char(observed_lower_bound at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')
) as result
from ai.production_target_execution_clock_evidence
where evidence_id = $1 and evidence_digest = $2`;
