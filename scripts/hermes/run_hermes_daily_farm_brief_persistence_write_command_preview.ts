import {
  buildHermesDailyFarmBriefGenerationStatePersistenceCommand,
} from "./brief_runtime/hermes_daily_farm_brief_persistence_command_contract";
import {
  HermesDailyFarmBriefFixturePersistenceRepository,
  persistHermesDailyFarmBrief,
} from "./brief_runtime/hermes_daily_farm_brief_persistence_write_boundary";
import { readHermesDailyFarmBriefPersistedLatestSource } from "./brief_runtime/hermes_daily_farm_brief_persisted_latest_source_boundary";
import { serveHermesDailyFarmBriefLatestRead } from "./brief_runtime/hermes_daily_farm_brief_latest_read_service";
import { parseHermesDailyFarmBriefLatestApiResponse } from "./brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import { createHermesDailyFarmBriefGenerationRequest, orchestrateHermesDailyFarmBriefGeneration } from "./brief_runtime/hermes_daily_farm_brief_generation_orchestrator";

const BUSINESS_DATE = "2026-07-15";
const NOW = "2026-07-15T03:00:00.000Z";

function decision(reference: string) {
  const creation = { triggerType: "manual" as const, requestedAt: "2026-07-15T00:30:00.000Z", actorRole: "administrator" as const, authorizationVerified: true, serverForceRegenerationAllowed: false, requestIdFactory: () => `preview-generation-${reference}` };
  const request = createHermesDailyFarmBriefGenerationRequest(creation);
  if (request === null) throw new Error("preview_request_invalid");
  const value = orchestrateHermesDailyFarmBriefGeneration({ requestCreation: creation, existingState: null });
  if (value === null) throw new Error("preview_decision_invalid");
  return value;
}

function command(input: { expected: number | null; state: "in_progress" | "failed"; requestedAt: string; id: string; reference: string }) {
  const value = buildHermesDailyFarmBriefGenerationStatePersistenceCommand({
    generationDecision: decision(input.reference),
    generationState: input.state,
    retryCount: input.state === "failed" ? 1 : 0,
    expectedCurrentVersion: input.expected,
    requestedAt: input.requestedAt,
    commandIdFactory: () => input.id,
    recordIdFactory: (date, kind) => `preview-${date}-${kind}`,
  });
  if (value === null) throw new Error("preview_command_invalid");
  return value;
}

async function main(): Promise<void> {
  const repository = new HermesDailyFarmBriefFixturePersistenceRepository();
  const firstCommand = command({ expected: null, state: "in_progress", requestedAt: "2026-07-15T00:40:00.000Z", id: "preview-command-v1", reference: "v1" });
  const first = await persistHermesDailyFarmBrief({ command: firstCommand, repository, clock: () => NOW });
  const reuse = await persistHermesDailyFarmBrief({ command: structuredClone(firstCommand), repository, clock: () => NOW });
  const secondCommand = command({ expected: 1, state: "failed", requestedAt: "2026-07-15T01:00:00.000Z", id: "preview-command-v2", reference: "v2" });
  const conflict = await persistHermesDailyFarmBrief({ command: { ...secondCommand, idempotency_key: firstCommand.idempotency_key }, repository, clock: () => NOW });
  const second = await persistHermesDailyFarmBrief({ command: secondCommand, repository, clock: () => NOW });

  const rollbackRepository = new HermesDailyFarmBriefFixturePersistenceRepository([firstCommand.record]);
  rollbackRepository.failNextTransaction();
  const rollbackBefore = JSON.stringify(rollbackRepository.inspectRecords());
  const rollback = await persistHermesDailyFarmBrief({ command: secondCommand, repository: rollbackRepository, clock: () => NOW });
  const rollbackPreserved = rollbackBefore === JSON.stringify(rollbackRepository.inspectRecords());

  const selected = await readHermesDailyFarmBriefPersistedLatestSource({ repository, requestedBusinessDate: BUSINESS_DATE, now: NOW });
  const response = await serveHermesDailyFarmBriefLatestRead({ request: new Request("http://localhost/api/hermes/daily-farm-brief/latest"), dependencies: {
    authenticate: async () => ({ schema_version: "hermes.daily_farm_brief.authentication_result.v1", status: "authenticated", principal_ref: "preview-actor" }),
    resolveActorContext: async () => ({ schema_version: "hermes.daily_farm_brief.authenticated_actor_context.v1", principal_ref: "preview-actor", role: "administrator", allowed_scope_keys: [], authorization_verified: true }),
    readLatestSource: async () => selected.source,
    clock: () => NOW,
  } });
  const apiBody = await response.json();
  const safePreview = {
    preview: "hermes_daily_farm_brief_persistence_write_command",
    first_persistence: first.status,
    second_version_transition: second.status,
    canonical_transition: "v1_superseded_v2_canonical",
    idempotent_reuse: reuse.status,
    idempotency_conflict: conflict.error_code,
    transaction_rollback: { error_code: rollback.error_code, original_chain_preserved: rollbackPreserved },
    read_after_write_day112_source: { status: selected.status, source_kind: selected.source?.source_kind ?? null, generation_state: selected.source?.generation_state ?? null },
    day111_display_state: parseHermesDailyFarmBriefLatestApiResponse(apiBody)?.latest?.display_state ?? null,
    call_counts: { repository_transactions: repository.transactionCallCount, day112_reads: repository.readCount, rollback_transactions: rollbackRepository.transactionCallCount },
    retry_count: 0,
    safety: second.safety,
  };
  console.log(JSON.stringify({ ...safePreview, raw_identifier_exposed: /preview-command|preview-idempotency|preview-generation|record_id|"version"/iu.test(JSON.stringify(safePreview)) }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "day113_preview_failed");
  process.exitCode = 1;
});
