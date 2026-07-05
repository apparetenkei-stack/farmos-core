import { Pool } from "pg";
import { readHermesMemoryContext } from "./api_boundary/hermes_memory_context_read_boundary";

const PROTECTED_PROPOSAL_ID = "24fc24ee-8efa-436b-8424-9703edeeb297";

type ProtectedState = {
  proposal_count: number;
  hermes_note_count: number;
  apply_history_count: number;
  protected_proposal_status: string | null;
  protected_proposal_applied_at: string | null;
  protected_proposal_applied_by: string | null;
  crop_cycle_2_exists: boolean;
};

function createPool(): Pool {
  return new Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_APP_DB_USER ?? "farmos_app_local",
  });
}

async function readProtectedState(pool: Pool): Promise<ProtectedState> {
  const proposalCount = await pool.query(`
    select count(*)::int as count
    from ai.proposal_inbox
  `);

  const hermesNoteCount = await pool.query(`
    select count(*)::int as count
    from ai.proposal_inbox
    where proposal_type = 'hermes_apply_blocker_explanation'
  `);

  const applyHistoryCount = await pool.query(`
    select count(*)::int as count
    from audit.proposal_review_apply_events
  `);

  const protectedProposal = await pool.query(
    `
      select
        status,
        applied_at,
        applied_by
      from ai.proposal_inbox
      where id = $1::uuid
    `,
    [PROTECTED_PROPOSAL_ID],
  );

  const cropCycle2 = await pool.query(`
    select exists(select 1 from app.crop_cycles where id = 2) as exists
  `);

  const protectedRow = protectedProposal.rows[0];

  return {
    proposal_count: Number(proposalCount.rows[0]?.count ?? 0),
    hermes_note_count: Number(hermesNoteCount.rows[0]?.count ?? 0),
    apply_history_count: Number(applyHistoryCount.rows[0]?.count ?? 0),
    protected_proposal_status: protectedRow?.status ?? null,
    protected_proposal_applied_at: protectedRow?.applied_at ?? null,
    protected_proposal_applied_by: protectedRow?.applied_by ?? null,
    crop_cycle_2_exists: Boolean(cropCycle2.rows[0]?.exists),
  };
}

function assertCondition(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

async function main(): Promise<void> {
  const pool = createPool();

  try {
    const before = await readProtectedState(pool);

    const result = await readHermesMemoryContext({
      proposalId: PROTECTED_PROPOSAL_ID,
    });

    const after = await readProtectedState(pool);

    assertCondition(result.result === "ok", "memory context result must be ok");
    assertCondition(Boolean(result.context), "memory context must exist");
    assertCondition(result.context?.scope === "hermes_memory_context_minimum", "scope mismatch");

    assertCondition(
      result.context?.proposal_context.proposal_id === PROTECTED_PROPOSAL_ID,
      "proposal context proposal_id mismatch",
    );

    assertCondition(
      result.context?.proposal_context.context_scope === "proposal_review_apply_context",
      "proposal context scope mismatch",
    );

    assertCondition(
      typeof result.context?.proposal_context.proposal_status === "string",
      "proposal status must be available",
    );

    assertCondition(
      typeof result.context?.proposal_context.readiness_result === "string",
      "readiness result must be available",
    );

    assertCondition(
      typeof result.context?.proposal_context.preview_result === "string",
      "preview result must be available",
    );

    assertCondition(
      typeof result.context?.proposal_context.apply_history_summary_count === "number",
      "apply history summary count must be a number",
    );

    assertCondition(
      (result.context?.latest_hermes_notes.length ?? 0) >= 2,
      "latest Hermes notes must include at least 2 records",
    );

    assertCondition(
      Array.isArray(result.context?.safe_app_context.crop_cycles_summary),
      "safe crop cycle summary must be an array",
    );

    assertCondition(
      (result.context?.safe_app_context.visible_domain_scope.length ?? 0) >= 1,
      "visible domain scope must be present",
    );

    assertCondition(
      result.boundary.transaction_read_only === true,
      "transaction_read_only must be true",
    );

    assertCondition(result.boundary.writes_performed === false, "writes_performed must be false");
    assertCondition(result.boundary.commands_executed === false, "commands_executed must be false");
    assertCondition(
      result.boundary.hermes_runtime_executed === false,
      "hermes_runtime_executed must be false",
    );
    assertCondition(
      result.boundary.llm_runtime_executed === false,
      "llm_runtime_executed must be false",
    );
    assertCondition(
      result.boundary.embeddings_executed === false,
      "embeddings_executed must be false",
    );
    assertCondition(
      result.boundary.vector_search_executed === false,
      "vector_search_executed must be false",
    );
    assertCondition(
      result.boundary.app_schema_write_allowed === false,
      "app schema writes must not be allowed",
    );
    assertCondition(
      result.boundary.ai_proposal_write_allowed === false,
      "ai proposal writes must not be allowed",
    );
    assertCondition(
      result.boundary.audit_apply_event_write_allowed === false,
      "audit apply event writes must not be allowed",
    );

    assertCondition(
      result.context?.restricted_domain_data_exposed === false,
      "restricted domain data must not be exposed",
    );

    assertCondition(
      before.proposal_count === after.proposal_count,
      "proposal_count changed",
    );
    assertCondition(
      before.hermes_note_count === after.hermes_note_count,
      "hermes_note_count changed",
    );
    assertCondition(
      before.apply_history_count === after.apply_history_count,
      "apply_history_count changed",
    );
    assertCondition(
      after.protected_proposal_status === "pending",
      "protected proposal status changed",
    );
    assertCondition(
      after.protected_proposal_applied_at === null,
      "protected proposal applied_at changed",
    );
    assertCondition(
      after.protected_proposal_applied_by === null,
      "protected proposal applied_by changed",
    );
    assertCondition(after.crop_cycle_2_exists === true, "crop cycle id=2 disappeared");

    console.log(JSON.stringify({
      result: "ok",
      checks: {
        memory_context_result: result.result,
        context_scope: result.context?.scope,
        proposal_context_source: result.context?.proposal_context.source,
        proposal_id: result.context?.proposal_context.proposal_id,
        proposal_status: result.context?.proposal_context.proposal_status,
        readiness_result: result.context?.proposal_context.readiness_result,
        preview_result: result.context?.proposal_context.preview_result,
        apply_history_summary_count: result.context?.proposal_context.apply_history_summary_count,
        latest_hermes_note_count: result.context?.latest_hermes_notes.length,
        safe_crop_cycle_summary_count: result.context?.safe_app_context.crop_cycles_summary.length,
        visible_domain_scope: result.context?.safe_app_context.visible_domain_scope,
        transaction_read_only: result.boundary.transaction_read_only,
        writes_performed: result.boundary.writes_performed,
        commands_executed: result.boundary.commands_executed,
        hermes_runtime_executed: result.boundary.hermes_runtime_executed,
        llm_runtime_executed: result.boundary.llm_runtime_executed,
        embeddings_executed: result.boundary.embeddings_executed,
        vector_search_executed: result.boundary.vector_search_executed,
        app_schema_write_allowed: result.boundary.app_schema_write_allowed,
        ai_proposal_write_allowed: result.boundary.ai_proposal_write_allowed,
        audit_apply_event_write_allowed: result.boundary.audit_apply_event_write_allowed,
        proposal_count_before: before.proposal_count,
        proposal_count_after: after.proposal_count,
        hermes_note_count_before: before.hermes_note_count,
        hermes_note_count_after: after.hermes_note_count,
        apply_history_count_before: before.apply_history_count,
        apply_history_count_after: after.apply_history_count,
        protected_proposal_status: after.protected_proposal_status,
        protected_proposal_applied_at: after.protected_proposal_applied_at,
        protected_proposal_applied_by: after.protected_proposal_applied_by,
        crop_cycle_2_exists: after.crop_cycle_2_exists,
        restricted_domain_data_exposed: result.context?.restricted_domain_data_exposed,
      },
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
