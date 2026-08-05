import { generateFarmOsDailyOperationalProjection } from
  "./farm_os_daily_operational_projection_generator";
import {
  canonicalJson,
  sha256Prefixed,
  type FarmOsProjectionCommandFailureCode,
  type FarmOsProjectionCommandLineageRecord,
  type FarmOsProjectionCommandProjectionRecord,
  type FarmOsProjectionRebuildCommand,
} from "./farm_os_projection_review_command_contract";

export type FarmOsProjectionRebuildPlan = Readonly<{
  projection: FarmOsProjectionCommandProjectionRecord;
  lineage: readonly FarmOsProjectionCommandLineageRecord[];
  initial_event: Readonly<{
    event_id: string;
    projection_id: string;
    status: "candidate";
    occurred_at: string;
  }>;
}>;

export type FarmOsProjectionRebuildResult =
  | Readonly<{ ok: true; plan: FarmOsProjectionRebuildPlan; failure_code: null }>
  | Readonly<{
    ok: false;
    plan: null;
    failure_code: Extract<
      FarmOsProjectionCommandFailureCode,
      | "projection_key_mismatch"
      | "rebuild_input_unavailable"
      | "rebuild_input_stale"
      | "rebuild_input_ambiguous"
      | "rebuild_input_invalid"
    >;
  }>;

const failureMap = Object.freeze({
  source_not_fetched: "rebuild_input_unavailable",
  source_unavailable: "rebuild_input_unavailable",
  source_stale: "rebuild_input_stale",
  source_ambiguous: "rebuild_input_ambiguous",
  source_missing: "rebuild_input_invalid",
  source_invalid: "rebuild_input_invalid",
  source_hash_mismatch: "rebuild_input_invalid",
  unsupported_source_schema: "rebuild_input_invalid",
  business_date_mismatch: "rebuild_input_invalid",
  duplicate_source_conflict: "rebuild_input_invalid",
  contract_invalid: "rebuild_input_invalid",
} as const);

function invalid(
  failureCode: FarmOsProjectionRebuildResult extends infer _ ?
    Extract<
      FarmOsProjectionCommandFailureCode,
      | "projection_key_mismatch"
      | "rebuild_input_unavailable"
      | "rebuild_input_stale"
      | "rebuild_input_ambiguous"
      | "rebuild_input_invalid"
    > : never,
): FarmOsProjectionRebuildResult {
  return { ok: false, plan: null, failure_code: failureCode };
}

export function createFarmOsProjectionRebuildPlan(input: Readonly<{
  command: FarmOsProjectionRebuildCommand;
  authorized_farm_scope: string;
  reviewed_projection_key: Readonly<{
    projection_type: "daily_work_records";
    business_date: string;
  }>;
  projection_version: number;
}>): FarmOsProjectionRebuildResult {
  let sourceHash: string;
  try {
    sourceHash = sha256Prefixed(canonicalJson(input.command.source_input)).slice(7);
  } catch {
    return invalid("rebuild_input_invalid");
  }
  if (sourceHash !== input.command.source_input_hash) {
    return invalid("rebuild_input_invalid");
  }
  const generated = generateFarmOsDailyOperationalProjection(
    input.command.source_input,
    input.authorized_farm_scope,
  );
  if (!generated.ok) {
    return invalid(failureMap[generated.failure.result]);
  }
  const bundle = generated.candidate_bundle;
  if (bundle.projection.projection_type !== input.reviewed_projection_key.projection_type ||
    bundle.projection.business_date !== input.reviewed_projection_key.business_date) {
    return invalid("projection_key_mismatch");
  }
  const initialEvent = bundle.state_events[0];
  return {
    ok: true,
    failure_code: null,
    plan: {
      projection: {
        projection_id: bundle.projection.projection_id,
        projection_type: bundle.projection.projection_type,
        projection_version: input.projection_version,
        business_date: bundle.projection.business_date,
        compiler_id: bundle.projection.compiler_id,
        compiler_version: bundle.projection.compiler_version,
        content_hash: bundle.projection.content_hash,
        projection_content: bundle.projection.content,
        generated_at: bundle.projection.generated_at,
        supersedes_projection_id: null,
      },
      lineage: bundle.lineage.map((entry) => ({
        projection_id: entry.projection_id,
        snapshot_id: entry.snapshot_id,
        source_record_id: entry.source_record_id,
        source_content_hash: entry.source_content_hash,
        relation: entry.relation,
      })),
      initial_event: {
        event_id: initialEvent.event_id,
        projection_id: initialEvent.projection_id,
        status: initialEvent.status,
        occurred_at: initialEvent.occurred_at,
      },
    },
  };
}
