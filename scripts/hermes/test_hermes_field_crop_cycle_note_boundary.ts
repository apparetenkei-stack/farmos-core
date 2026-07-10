import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  readHermesMemoryContext
} from "./api_boundary/hermes_memory_context_read_boundary";
import {
  createHermesFieldCropCycleNote
} from "../../src/lib/hermes/hermes_field_crop_cycle_note_boundary";

const PROTECTED_PROPOSAL_ID =
  "24fc24ee-8efa-436b-8424-9703edeeb297";

type ProtectedState = {
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  crop_cycle_count: number;
};

function createPool(): Pool {
  return new Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(
      process.env.PGPORT ?? "5432"
    ),
    database:
      process.env.PGDATABASE ??
      "farmos_core_local",
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
    await client.query(
      "begin transaction read only"
    );

    const result = await client.query(
      `
        select
          (select count(*)::int
           from ai.proposal_inbox)
            as proposal_count,
          (select count(*)::int
           from audit.proposal_review_decision_events)
            as decision_history_count,
          (select count(*)::int
           from audit.proposal_review_apply_events)
            as apply_history_count,
          (select count(*)::int
           from app.crop_cycles)
            as crop_cycle_count
      `
    );

    await client.query("rollback");

    return result.rows[0] as ProtectedState;
  } catch (error) {
    try {
      await client.query("rollback");
    } catch {
      // Preserve original error.
    }

    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const pool = createPool();

  try {
    const before =
      await readProtectedState(pool);

    const context =
      await readHermesMemoryContext({
        proposalId:
          PROTECTED_PROPOSAL_ID
      });

    const cropCycleNote =
      createHermesFieldCropCycleNote({
        targetType: "crop_cycle",
        targetId: "2",
        context
      });

    assert.equal(
      cropCycleNote.result,
      "preview"
    );
    assert.equal(
      cropCycleNote.target_found,
      true
    );
    assert.equal(
      cropCycleNote.crop_cycle_id,
      "2"
    );
    assert.equal(
      cropCycleNote.field_name,
      "A圃場"
    );
    assert.equal(
      cropCycleNote.crop,
      "ブロッコリー"
    );
    assert.equal(
      cropCycleNote.target_fixture_like,
      false
    );
    assert.equal(
      cropCycleNote.note_candidate_created,
      true
    );
    assert.equal(
      cropCycleNote.note_saved,
      false
    );
    assert.equal(
      cropCycleNote.proposal_saved,
      false
    );
    assert.equal(
      cropCycleNote.database_write_performed,
      false
    );
    assert.deepEqual(
      cropCycleNote.blockers,
      []
    );

    const fieldNote =
      createHermesFieldCropCycleNote({
        targetType: "field",
        targetId: "A圃場",
        context
      });

    assert.equal(
      fieldNote.result,
      "preview"
    );
    assert.equal(
      fieldNote.resolved_target_id,
      "A圃場"
    );
    assert.equal(
      fieldNote.note_candidate_created,
      true
    );

    const missingTarget =
      createHermesFieldCropCycleNote({
        targetType: "crop_cycle",
        targetId: "999999",
        context
      });

    assert.equal(
      missingTarget.result,
      "blocked"
    );
    assert.equal(
      missingTarget.blockers.includes(
        "target_not_found"
      ),
      true
    );

    const fixtureTarget =
      createHermesFieldCropCycleNote({
        targetType: "crop_cycle",
        targetId: "6",
        context
      });

    assert.equal(
      fixtureTarget.result,
      "blocked"
    );
    assert.equal(
      fixtureTarget.target_fixture_like,
      true
    );
    assert.equal(
      fixtureTarget.blockers.includes(
        "fixture_target_not_allowed_for_operational_note"
      ),
      true
    );

    const after =
      await readProtectedState(pool);

    assert.deepEqual(after, before);

    console.log(JSON.stringify({
      result: "ok",
      checked:
        "hermes_field_crop_cycle_note_boundary",
      crop_cycle_note: cropCycleNote,
      field_note: fieldNote,
      missing_target: {
        result: missingTarget.result,
        blockers: missingTarget.blockers
      },
      fixture_target: {
        result: fixtureTarget.result,
        warnings: fixtureTarget.warnings,
        blockers: fixtureTarget.blockers
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
