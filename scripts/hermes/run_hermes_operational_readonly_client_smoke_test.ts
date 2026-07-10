import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { Pool } from "pg";

import {
  readHermesOperationalReadonlySources,
} from "../../src/lib/hermes/hermes_operational_readonly_client";

type ProtectedState = {
  proposal_count: number;
  decision_history_count: number;
  apply_history_count: number;
  crop_cycle_count: number;
};

function loadLocalEnvironment(): void {
  if (existsSync(".env.local")) {
    try {
      loadEnvFile(".env.local");
    } catch {
      // Existing process environment remains authoritative.
    }
  }
}

function createPool(): Pool {
  return new Pool({
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ??
      process.env.FARMOS_DB_NAME ??
      "farmos_core_local",
    user:
      process.env.PGUSER ??
      process.env.FARMOS_APP_DB_USER ??
      "farmos_app_local",
    password:
      process.env.PGPASSWORD ??
      process.env.FARMOS_APP_DB_PASSWORD,
  });
}

async function readProtectedState(pool: Pool): Promise<ProtectedState> {
  const client = await pool.connect();

  try {
    await client.query("begin transaction read only");

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
      `,
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

function firstRecordKeys(records: Record<string, unknown>[]): string[] {
  return records.length > 0
    ? Object.keys(records[0]).sort()
    : [];
}

async function main(): Promise<void> {
  loadLocalEnvironment();

  const pool = createPool();

  try {
    const before = await readProtectedState(pool);
    const result = await readHermesOperationalReadonlySources();
    const after = await readProtectedState(pool);

    const protectedStateUnchanged =
      JSON.stringify(before) === JSON.stringify(after);

    const inventoryRecords =
      result.inventory.records as Record<string, unknown>[];
    const workLogRecords =
      result.work_log.records as Record<string, unknown>[];

    const safeSummary = {
      result: result.result,
      checked: result.checked,
      inventory: {
        result: result.inventory.result,
        endpoint_path: result.inventory.endpoint_path,
        http_method: result.inventory.http_method,
        http_status: result.inventory.http_status,
        response_source: result.inventory.response_source,
        record_count: result.inventory.record_count,
        first_record_keys: firstRecordKeys(inventoryRecords),
        has_more: result.inventory.has_more,
        transaction_read_only:
          result.inventory.transaction_read_only,
        write_performed: result.inventory.write_performed,
        restricted_fields_exposed:
          result.inventory.restricted_fields_exposed,
        credentials_exposed:
          result.inventory.credentials_exposed,
        error_code: result.inventory.error_code,
      },
      work_log: {
        result: result.work_log.result,
        endpoint_path: result.work_log.endpoint_path,
        http_method: result.work_log.http_method,
        http_status: result.work_log.http_status,
        response_source: result.work_log.response_source,
        record_count: result.work_log.record_count,
        first_record_keys: firstRecordKeys(workLogRecords),
        has_more: result.work_log.has_more,
        transaction_read_only:
          result.work_log.transaction_read_only,
        write_performed: result.work_log.write_performed,
        restricted_fields_exposed:
          result.work_log.restricted_fields_exposed,
        credentials_exposed:
          result.work_log.credentials_exposed,
        error_code: result.work_log.error_code,
      },
      external_fetch_performed: result.external_fetch_performed,
      inventory_source_connected:
        result.inventory_source_connected,
      work_log_source_connected:
        result.work_log_source_connected,
      hermes_context_injection_performed:
        result.hermes_context_injection_performed,
      suggestion_generation_performed:
        result.suggestion_generation_performed,
      proposal_created: result.proposal_created,
      proposal_saved: result.proposal_saved,
      proposal_apply_performed:
        result.proposal_apply_performed,
      app_db_write_performed:
        result.app_db_write_performed,
      core_db_write_performed:
        result.core_db_write_performed,
      audit_write_performed:
        result.audit_write_performed,
      database_write_performed:
        result.database_write_performed,
      credentials_exposed: result.credentials_exposed,
      protected_state: {
        before,
        after,
        unchanged: protectedStateUnchanged,
      },
    };

    console.log(JSON.stringify(safeSummary, null, 2));

    if (
      result.result !== "ok" ||
      result.inventory.result !== "ok" ||
      result.work_log.result !== "ok" ||
      !protectedStateUnchanged
    ) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        checked: "hermes_operational_readonly_client_smoke_test",
        error: "day92_smoke_test_failed",
        credentials_exposed: false,
        database_write_performed: false,
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
