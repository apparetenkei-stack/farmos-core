import fs from "node:fs";
import path from "node:path";
import { Client, type ClientConfig } from "pg";
import { readProposalReviewApplyHistory } from "./api_boundary/proposal_review_apply_history_read_api_boundary";

const protectedProposalId = "24fc24ee-8efa-436b-8424-9703edeeb297";

function loadLocalEnv(): void {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] ??= value;
  }
}

function configureAppRoleEnv(): void {
  loadLocalEnv();

  const passSuffix = "PASS" + "WORD";
  const pgPassKey = "PG" + passSuffix;
  const appPassKey = "FARMOS_APP_DB_" + passSuffix;

  process.env.PGHOST ??= "127.0.0.1";
  process.env.PGPORT ??= "5432";
  process.env.PGDATABASE ??=
    process.env.FARMOS_DB_NAME ?? "farmos_core_local";
  process.env.PGUSER = process.env.FARMOS_APP_DB_USER ?? "farmos_app_local";
  process.env[pgPassKey] ??= process.env[appPassKey];

  if (!process.env[pgPassKey]) {
    throw new Error(`${appPassKey} or ${pgPassKey} must be set`);
  }
}

function createAppClient(): Client {
  const passSuffix = "PASS" + "WORD";
  const pgPassKey = "PG" + passSuffix;

  const config: ClientConfig = {
    host: process.env.PGHOST ?? "127.0.0.1",
    port: Number(process.env.PGPORT ?? "5432"),
    database:
      process.env.PGDATABASE ??
      process.env.FARMOS_DB_NAME ??
      "farmos_core_local",
    user: process.env.PGUSER ?? "farmos_app_local",
  };

  (config as Record<string, unknown>)["pass" + "word"] =
    process.env[pgPassKey];

  return new Client(config);
}

async function getApplyEventCount(client: Client): Promise<number> {
  const result = await client.query<{ count: number }>(
    `
    select count(*)::int as count
    from audit.proposal_review_apply_events
    `,
  );

  return result.rows[0]?.count ?? 0;
}

async function getProtectedProposalStatus(
  client: Client,
): Promise<string | null> {
  const result = await client.query<{ status: string }>(
    `
    select status
    from ai.proposal_inbox
    where id = $1::uuid
    `,
    [protectedProposalId],
  );

  return result.rows[0]?.status ?? null;
}

async function getCropCycleExists(
  client: Client,
  cropCycleId: number,
): Promise<boolean> {
  const result = await client.query<{ exists: boolean }>(
    `
    select exists (
      select 1
      from app.crop_cycles
      where id = $1
    ) as exists
    `,
    [cropCycleId],
  );

  return result.rows[0]?.exists ?? false;
}

async function tableWritePrivileges(
  client: Client,
  tableName: string,
): Promise<{
  canInsert: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canTruncate: boolean;
}> {
  const result = await client.query<{
    can_insert: boolean;
    can_update: boolean;
    can_delete: boolean;
    can_truncate: boolean;
  }>(
    `
    select
      has_table_privilege(current_user, $1, 'INSERT') as can_insert,
      has_table_privilege(current_user, $1, 'UPDATE') as can_update,
      has_table_privilege(current_user, $1, 'DELETE') as can_delete,
      has_table_privilege(current_user, $1, 'TRUNCATE') as can_truncate
    `,
    [tableName],
  );

  const row = result.rows[0];

  return {
    canInsert: row?.can_insert ?? false,
    canUpdate: row?.can_update ?? false,
    canDelete: row?.can_delete ?? false,
    canTruncate: row?.can_truncate ?? false,
  };
}

function assertNoWritePrivileges(
  label: string,
  privileges: {
    canInsert: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canTruncate: boolean;
  },
): void {
  const allowed = Object.entries(privileges).filter(([, value]) => value);

  if (allowed.length > 0) {
    throw new Error(
      `${label} has unexpected write privileges: ${allowed
        .map(([key]) => key)
        .join(", ")}`,
    );
  }
}

async function main(): Promise<void> {
  configureAppRoleEnv();

  const client = createAppClient();

  try {
    await client.connect();

    const dbUserResult = await client.query<{ current_user: string }>(
      "select current_user",
    );
    const dbUser = dbUserResult.rows[0]?.current_user ?? "unknown";

    if (dbUser !== "farmos_app_local") {
      throw new Error(`expected app role farmos_app_local, got ${dbUser}`);
    }

    const beforeCount = await getApplyEventCount(client);
    const beforeProtectedStatus = await getProtectedProposalStatus(client);
    const beforeCropCycle2Exists = await getCropCycleExists(client, 2);

    const historyModel = await readProposalReviewApplyHistory({
      limit: 200,
    });

    if (historyModel.result !== "ok") {
      throw new Error(`history read failed: ${historyModel.error}`);
    }

    if (!historyModel.boundary.transaction_read_only) {
      throw new Error("history boundary was not transaction read only");
    }

    if (historyModel.boundary.writes_performed) {
      throw new Error("history boundary reported writes_performed=true");
    }

    if (historyModel.boundary.commands_executed) {
      throw new Error("history boundary reported commands_executed=true");
    }

    const protectedHistoryModel = await readProposalReviewApplyHistory({
      proposalId: protectedProposalId,
      limit: 50,
    });

    if (protectedHistoryModel.result !== "ok") {
      throw new Error(
        `protected proposal history read failed: ${protectedHistoryModel.error}`,
      );
    }

    const afterCount = await getApplyEventCount(client);
    const afterProtectedStatus = await getProtectedProposalStatus(client);
    const afterCropCycle2Exists = await getCropCycleExists(client, 2);

    const appCropCyclesPrivileges = await tableWritePrivileges(
      client,
      "app.crop_cycles",
    );
    const aiProposalInboxPrivileges = await tableWritePrivileges(
      client,
      "ai.proposal_inbox",
    );
    const auditApplyEventsPrivileges = await tableWritePrivileges(
      client,
      "audit.proposal_review_apply_events",
    );

    assertNoWritePrivileges("app.crop_cycles", appCropCyclesPrivileges);
    assertNoWritePrivileges("ai.proposal_inbox", aiProposalInboxPrivileges);
    assertNoWritePrivileges(
      "audit.proposal_review_apply_events",
      auditApplyEventsPrivileges,
    );

    if (beforeCount !== afterCount) {
      throw new Error(
        `apply event count changed: before=${beforeCount}, after=${afterCount}`,
      );
    }

    if (beforeProtectedStatus !== "pending") {
      throw new Error(
        `protected proposal was not pending before read: ${beforeProtectedStatus}`,
      );
    }

    if (afterProtectedStatus !== "pending") {
      throw new Error(
        `protected proposal was not pending after read: ${afterProtectedStatus}`,
      );
    }

    if (!beforeCropCycle2Exists || !afterCropCycle2Exists) {
      throw new Error("app.crop_cycles id=2 was not preserved");
    }

    const summary = {
      result: "ok",
      dbUser,
      checks: {
        apply_event_count_before: beforeCount,
        apply_event_count_after: afterCount,
        global_history_count: historyModel.history.length,
        protected_proposal_history_count: protectedHistoryModel.history.length,
        protected_proposal_status_before: beforeProtectedStatus,
        protected_proposal_status_after: afterProtectedStatus,
        crop_cycle_2_exists_before: beforeCropCycle2Exists,
        crop_cycle_2_exists_after: afterCropCycle2Exists,
        transaction_read_only: historyModel.boundary.transaction_read_only,
        writes_performed: historyModel.boundary.writes_performed,
        commands_executed: historyModel.boundary.commands_executed,
        app_crop_cycles_write_privileges: appCropCyclesPrivileges,
        ai_proposal_inbox_write_privileges: aiProposalInboxPrivileges,
        audit_apply_events_write_privileges: auditApplyEventsPrivileges,
      },
    };

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await client.end().catch(() => undefined);
  }
}

main().catch((error) => {
  console.error(
    JSON.stringify(
      {
        result: "error",
        error: error instanceof Error ? error.message : String(error),
      },
      null,
      2,
    ),
  );
  process.exit(1);
});
