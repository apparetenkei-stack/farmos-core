import assert from "node:assert/strict";
import { Pool } from "pg";
import {
  createHermesInventoryWorkLogSuggestions
} from "../../src/lib/hermes/hermes_inventory_work_log_suggestion_boundary";

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

    const unavailableSources =
      createHermesInventoryWorkLogSuggestions({
        inventory: {
          source_type: "inventory",
          available: false,
          transaction_read_only: false,
          records: []
        },
        workLog: {
          source_type: "work_log",
          available: false,
          transaction_read_only: false,
          records: []
        }
      });

    assert.equal(
      unavailableSources.result,
      "preview"
    );
    assert.equal(
      unavailableSources.inventory_source_available,
      false
    );
    assert.equal(
      unavailableSources.work_log_source_available,
      false
    );
    assert.equal(
      unavailableSources.actual_inventory_analysis_performed,
      false
    );
    assert.equal(
      unavailableSources.actual_work_log_analysis_performed,
      false
    );
    assert.equal(
      unavailableSources.suggestion_preview_created,
      true
    );
    assert.equal(
      unavailableSources.suggestions.length,
      2
    );
    assert.equal(
      unavailableSources.suggestions.every(
        (suggestion) =>
          suggestion.suggestion_type ===
            "data_source_gap" &&
          suggestion.proposal_ready === false
      ),
      true
    );
    assert.equal(
      unavailableSources.suggestion_saved,
      false
    );
    assert.equal(
      unavailableSources.proposal_saved,
      false
    );
    assert.equal(
      unavailableSources.database_write_performed,
      false
    );
    assert.deepEqual(
      unavailableSources.blockers,
      []
    );

    const simulatedReadonlySources =
      createHermesInventoryWorkLogSuggestions({
        inventory: {
          source_type: "inventory",
          available: true,
          transaction_read_only: true,
          records: [
            {
              id: "inventory-preview-1",
              quantity: 1
            }
          ]
        },
        workLog: {
          source_type: "work_log",
          available: true,
          transaction_read_only: true,
          records: [
            {
              id: "work-log-preview-1",
              status: "missing_detail"
            }
          ]
        }
      });

    assert.equal(
      simulatedReadonlySources.result,
      "preview"
    );
    assert.equal(
      simulatedReadonlySources.actual_inventory_analysis_performed,
      true
    );
    assert.equal(
      simulatedReadonlySources.actual_work_log_analysis_performed,
      true
    );
    assert.equal(
      simulatedReadonlySources.suggestions.length,
      2
    );
    assert.equal(
      simulatedReadonlySources.suggestions.every(
        (suggestion) =>
          suggestion.proposal_ready === false
      ),
      true
    );

    const unsafeInventory =
      createHermesInventoryWorkLogSuggestions({
        inventory: {
          source_type: "inventory",
          available: true,
          transaction_read_only: false,
          records: [
            {
              id: "unsafe-inventory"
            }
          ]
        },
        workLog: {
          source_type: "work_log",
          available: false,
          transaction_read_only: false,
          records: []
        }
      });

    assert.equal(
      unsafeInventory.result,
      "blocked"
    );
    assert.equal(
      unsafeInventory.blockers.includes(
        "inventory_source_not_read_only"
      ),
      true
    );

    const after =
      await readProtectedState(pool);

    assert.deepEqual(after, before);

    console.log(JSON.stringify({
      result: "ok",
      checked:
        "hermes_inventory_work_log_suggestion_boundary",
      unavailable_sources:
        unavailableSources,
      simulated_readonly_sources:
        simulatedReadonlySources,
      unsafe_source: {
        result: unsafeInventory.result,
        blockers: unsafeInventory.blockers
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
