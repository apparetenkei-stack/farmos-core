import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  readHermesMemoryContext
} from "./api_boundary/hermes_memory_context_read_boundary";
import {
  createHermesDailyFarmBrief
} from "../../src/lib/hermes/hermes_daily_farm_brief_boundary";

type ProtectedState = {
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  crop_cycle_count: number;
  protected_proposal_status: string | null;
  protected_proposal_applied_at: string | null;
  protected_proposal_applied_by: string | null;
};

const PROTECTED_PROPOSAL_ID =
  "24fc24ee-8efa-436b-8424-9703edeeb297";

function createPool(): Pool {
  return new Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ?? "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      "farmos_app_local"
  });
}

async function readProtectedState(
  pool: Pool
): Promise<ProtectedState> {
  const client = await pool.connect();

  try {
    await client.query("begin transaction read only");

    const result = await client.query(
      `
        select json_build_object(
          $key$proposal_count$key$,
            (select count(*)::int
             from ai.proposal_inbox),
          $key$decision_history_count$key$,
            (select count(*)::int
             from audit.proposal_review_decision_events),
          $key$apply_history_count$key$,
            (select count(*)::int
             from audit.proposal_review_apply_events),
          $key$crop_cycle_count$key$,
            (select count(*)::int
             from app.crop_cycles),
          $key$protected_proposal_status$key$,
            (select status
             from ai.proposal_inbox
             where id = $1::uuid),
          $key$protected_proposal_applied_at$key$,
            (select applied_at
             from ai.proposal_inbox
             where id = $1::uuid),
          $key$protected_proposal_applied_by$key$,
            (select applied_by
             from ai.proposal_inbox
             where id = $1::uuid)
        ) as snapshot
      `,
      [PROTECTED_PROPOSAL_ID]
    );

    await client.query("rollback");

    return result.rows[0].snapshot as ProtectedState;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve the original error.
    }

    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const pool = createPool();

  try {
    const before = await readProtectedState(pool);

    const context = await readHermesMemoryContext({
      proposalId: PROTECTED_PROPOSAL_ID
    });

    const brief = createHermesDailyFarmBrief({
      briefDate: "2026-07-10",
      context,
      inventorySourceAvailable: false,
      workLogSourceAvailable: false,
      fieldTableAvailable: false
    });

    const after = await readProtectedState(pool);

    assert.equal(brief.result, "preview");
    assert.equal(brief.transaction_read_only, true);
    assert.equal(brief.crop_cycle_count, 8);
    assert.equal(brief.hermes_note_count, 5);
    assert.equal(
      brief.inventory_source_available,
      false
    );
    assert.equal(
      brief.work_log_source_available,
      false
    );
    assert.equal(brief.field_table_available, false);
    assert.equal(brief.requires_human_review, true);
    assert.equal(brief.brief_saved, false);
    assert.equal(brief.proposal_saved, false);
    assert.equal(brief.app_write_performed, false);
    assert.equal(
      brief.database_write_performed,
      false
    );
    assert.equal(
      brief.restricted_domain_data_exposed,
      false
    );
    assert.equal(brief.blockers.length, 0);

    assert.equal(
      brief.warnings.includes(
        "inventory_source_not_available"
      ),
      true
    );

    assert.equal(
      brief.warnings.includes(
        "work_log_source_not_available"
      ),
      true
    );

    assert.equal(
      brief.warnings.includes(
        "field_table_not_available"
      ),
      true
    );

    assert.equal(
      brief.warnings.includes(
        "fixture_crop_cycle_detected"
      ),
      true
    );

    assert.deepEqual(after, before);

    const blocked = createHermesDailyFarmBrief({
      briefDate: "2026-07-10",
      context: {
        ...context,
        boundary: {
          ...context.boundary,
          transaction_read_only: false
        }
      },
      inventorySourceAvailable: false,
      workLogSourceAvailable: false,
      fieldTableAvailable: false
    });

    assert.equal(blocked.result, "blocked");
    assert.equal(
      blocked.blockers.includes(
        "readonly_context_invalid"
      ),
      true
    );

    console.log(JSON.stringify({
      result: "ok",
      checked: "hermes_daily_farm_brief_boundary",
      brief,
      blocked_scenario: {
        result: blocked.result,
        blockers: blocked.blockers
      },
      protected_state: {
        before,
        after,
        unchanged:
          JSON.stringify(before) ===
          JSON.stringify(after)
      }
    }, null, 2));
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
