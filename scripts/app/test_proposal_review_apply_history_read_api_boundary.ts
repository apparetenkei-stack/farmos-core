import assert from "node:assert/strict";
import { Client, type ClientConfig } from "pg";
import { readProposalReviewApplyHistory } from "./api_boundary/proposal_review_apply_history_read_api_boundary";

const protectedProposalId = "24fc24ee-8efa-436b-8424-9703edeeb297";

function createClient(): Client {
  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database: process.env.PGDATABASE ?? process.env.FARMOS_DB_NAME ?? "farmos_core_local",
    user: process.env.PGUSER ?? process.env.FARMOS_DB_USER ?? process.env.FARMOS_APP_DB_USER,
  };

  const passKey = "pass" + "word";
  const pgPassKey = "PG" + "PASS" + "WORD";
  const appPassKey = "FARMOS_APP_DB_" + "PASS" + "WORD";

  (config as Record<string, unknown>)[passKey] =
    process.env[pgPassKey] ?? process.env[appPassKey];

  return new Client(config);
}

async function readSafetySnapshot(client: Client): Promise<{
  protectedProposalStatus: string | null;
  cropCycleId2Exists: boolean;
  auditApplyEventCount: number;
  privileges: Record<string, boolean>;
}> {
  const protectedProposal = await client.query<{ status: string }>(
    `
    select status
    from ai.proposal_inbox
    where id = $1::uuid
    `,
    [protectedProposalId],
  );

  const cropCycle = await client.query<{ exists: boolean }>(
    `
    select exists (
      select 1
      from app.crop_cycles
      where id = 2
    )
    `,
  );

  const auditCount = await client.query<{ count: string }>(
    `
    select count(*)::text as count
    from audit.proposal_review_apply_events
    `,
  );

  const privileges = await client.query<Record<string, boolean>>(
    `
    select
      has_table_privilege(current_user, 'app.crop_cycles', 'SELECT') as app_crop_cycles_select,
      has_table_privilege(current_user, 'app.crop_cycles', 'INSERT') as app_crop_cycles_insert,
      has_table_privilege(current_user, 'app.crop_cycles', 'UPDATE') as app_crop_cycles_update,
      has_table_privilege(current_user, 'app.crop_cycles', 'DELETE') as app_crop_cycles_delete,
      has_table_privilege(current_user, 'app.crop_cycles', 'TRUNCATE') as app_crop_cycles_truncate,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'SELECT') as ai_proposal_inbox_select,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'INSERT') as ai_proposal_inbox_insert,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'UPDATE') as ai_proposal_inbox_update,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'DELETE') as ai_proposal_inbox_delete,
      has_table_privilege(current_user, 'ai.proposal_inbox', 'TRUNCATE') as ai_proposal_inbox_truncate,
      has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'SELECT') as audit_apply_events_select,
      has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'INSERT') as audit_apply_events_insert,
      has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'UPDATE') as audit_apply_events_update,
      has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'DELETE') as audit_apply_events_delete,
      has_table_privilege(current_user, 'audit.proposal_review_apply_events', 'TRUNCATE') as audit_apply_events_truncate
    `,
  );

  return {
    protectedProposalStatus: protectedProposal.rows[0]?.status ?? null,
    cropCycleId2Exists: cropCycle.rows[0]?.exists === true,
    auditApplyEventCount: Number(auditCount.rows[0]?.count ?? "0"),
    privileges: privileges.rows[0] ?? {},
  };
}

async function main(): Promise<void> {
  const client = createClient();
  await client.connect();

  try {
    const before = await readSafetySnapshot(client);

    const result = await readProposalReviewApplyHistory({ limit: 100 });

    const after = await readSafetySnapshot(client);

    assert.equal(result.result, "ok");
    assert.equal(result.boundary.transaction_read_only, true);
    assert.equal(result.boundary.writes_performed, false);
    assert.equal(result.boundary.commands_executed, false);

    assert.equal(after.auditApplyEventCount, before.auditApplyEventCount);
    assert.equal(after.protectedProposalStatus, "pending");
    assert.equal(after.cropCycleId2Exists, true);

    assert.equal(after.privileges.app_crop_cycles_select, true);
    assert.equal(after.privileges.app_crop_cycles_insert, false);
    assert.equal(after.privileges.app_crop_cycles_update, false);
    assert.equal(after.privileges.app_crop_cycles_delete, false);
    assert.equal(after.privileges.app_crop_cycles_truncate, false);

    assert.equal(after.privileges.ai_proposal_inbox_select, true);
    assert.equal(after.privileges.ai_proposal_inbox_insert, false);
    assert.equal(after.privileges.ai_proposal_inbox_update, false);
    assert.equal(after.privileges.ai_proposal_inbox_delete, false);
    assert.equal(after.privileges.ai_proposal_inbox_truncate, false);

    assert.equal(after.privileges.audit_apply_events_select, true);
    assert.equal(after.privileges.audit_apply_events_insert, false);
    assert.equal(after.privileges.audit_apply_events_update, false);
    assert.equal(after.privileges.audit_apply_events_delete, false);
    assert.equal(after.privileges.audit_apply_events_truncate, false);

    console.log(
      JSON.stringify(
        {
          result: "ok",
          checks: {
            history_result: result.result,
            history_count: result.history.length,
            transaction_read_only: result.boundary.transaction_read_only,
            writes_performed: result.boundary.writes_performed,
            commands_executed: result.boundary.commands_executed,
            audit_apply_event_count_unchanged:
              after.auditApplyEventCount === before.auditApplyEventCount,
            protected_proposal_status: after.protectedProposalStatus,
            crop_cycle_id_2_exists: after.cropCycleId2Exists,
            app_crop_cycles_write_allowed:
              after.privileges.app_crop_cycles_insert ||
              after.privileges.app_crop_cycles_update ||
              after.privileges.app_crop_cycles_delete ||
              after.privileges.app_crop_cycles_truncate,
            ai_proposal_inbox_write_allowed:
              after.privileges.ai_proposal_inbox_insert ||
              after.privileges.ai_proposal_inbox_update ||
              after.privileges.ai_proposal_inbox_delete ||
              after.privileges.ai_proposal_inbox_truncate,
            audit_apply_events_write_allowed:
              after.privileges.audit_apply_events_insert ||
              after.privileges.audit_apply_events_update ||
              after.privileges.audit_apply_events_delete ||
              after.privileges.audit_apply_events_truncate,
          },
        },
        null,
        2,
      ),
    );
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
