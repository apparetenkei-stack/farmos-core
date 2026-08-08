import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";

import { Pool } from "pg";

import {
  FARM_OS_STABLE_CHANGES_CONTRACT_ID,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FARM_OS_STABLE_CHANGES_HTTP_CAPABILITY,
  FARM_OS_STABLE_CHANGES_HTTP_ENDPOINT,
  FarmOsStableChangesHttpConsumer,
  loadFarmOsStableChangesHttpConsumerConfig,
} from "../../src/lib/hermes/farm_os_stable_changes_http_consumer";
import {
  createFarmOsStableChangesScopeId,
} from "../../src/lib/hermes/farm_os_stable_changes_persistence";
import {
  FarmOsStableChangesPostgresRepository,
  type FarmOsStableChangesPool,
} from "../../src/lib/hermes/farm_os_stable_changes_postgres_repository";
import {
  stableChange,
  stablePage,
} from "./lib/farm_os_stable_changes_consumer_fixture";

const IMAGE = "postgres:17";
const nonce = randomBytes(6).toString("hex");
const container = `farmos_stable_changes_http_${nonce}`;
const database = `stable_changes_http_${nonce}`;
const adminPassword = "stable-changes-http-admin-fixture-only";
const runtimePassword = "stable-changes-http-runtime-fixture-only";
const token = "fixture-only-stable-changes-http-token";
const migrationSql = readFileSync(new URL(
  "../../db/migrations/202608070001_stable_changes_consumer_persistence.sql",
  import.meta.url,
), "utf8");
const verifySql = readFileSync(new URL(
  "../../db/migrations/202608070001_stable_changes_consumer_persistence.verify.sql",
  import.meta.url,
), "utf8");

function docker(args: string[]): string {
  return execFileSync("docker", args, { encoding: "utf8" }).trim();
}

async function waitForPostgres(pool: Pool): Promise<void> {
  let last: unknown;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      await pool.query("select 1");
      return;
    } catch (error) {
      last = error;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
  throw last;
}

let admin: Pool | null = null;
let runtime: Pool | null = null;
let server: ReturnType<typeof createServer> | null = null;
try {
  docker([
    "run", "--detach", "--pull=never", "--restart=no", "--name", container,
    "--publish", "127.0.0.1::5432",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=256m",
    "--env", `POSTGRES_DB=${database}`,
    "--env", "POSTGRES_USER=postgres",
    "--env", `POSTGRES_PASSWORD=${adminPassword}`,
    "--label", `farmos.stable_changes.http.execution_nonce=${nonce}`,
    IMAGE,
  ]);
  const portOutput = docker(["port", container, "5432/tcp"]);
  const port = Number(portOutput.match(/127\.0\.0\.1:(\d+)/u)?.[1]);
  assert.ok(Number.isInteger(port) && port > 0);
  admin = new Pool({
    host: "127.0.0.1", port, database, user: "postgres",
    password: adminPassword, ssl: false, max: 4,
  });
  await waitForPostgres(admin);
  await admin.query("create schema ai");
  await admin.query("create role anon nologin");
  await admin.query("create role authenticated nologin");
  await admin.query(migrationSql);
  await admin.query(verifySql);

  const scope = {
    contract_version: FARM_OS_STABLE_CHANGES_CONTRACT_ID,
    installation_id: "installation_http_e2e",
    farm_id: "farm_http_e2e",
    from_business_date: "2026-08-01",
    to_business_date: "2026-08-07",
    page_size: 100,
  } as const;
  const initialized = await admin.query<{
    result: { stable_changes_scope_id: string };
  }>(`select ai.initialize_stable_changes_consumer_scope(
    $1::text,$2::text,$3::date,$4::date,$5::smallint
  ) as result`, [
    scope.installation_id, scope.farm_id, scope.from_business_date,
    scope.to_business_date, scope.page_size,
  ]);
  assert.equal(initialized.rows[0]?.result.stable_changes_scope_id,
    createFarmOsStableChangesScopeId(scope));
  await admin.query(`create role stable_changes_http_runtime_fixture login password
    '${runtimePassword}' noinherit nosuperuser nocreatedb nocreaterole
    noreplication nobypassrls`);
  await admin.query(
    "grant farmos_core_stable_changes_runtime to stable_changes_http_runtime_fixture",
  );
  runtime = new Pool({
    host: "127.0.0.1", port, database,
    user: "stable_changes_http_runtime_fixture", password: runtimePassword,
    ssl: false, max: 4,
  });
  const requests: Array<{ cursor: string | null }> = [];
  server = createServer((request, response) => {
    const url = new URL(request.url ?? "", "http://loopback");
    assert.equal(request.method, "GET");
    assert.equal(url.pathname, FARM_OS_STABLE_CHANGES_HTTP_ENDPOINT);
    assert.equal(request.headers.authorization, `Bearer ${token}`);
    assert.equal(request.headers["x-farmos-capability"],
      FARM_OS_STABLE_CHANGES_HTTP_CAPABILITY);
    assert.equal(request.headers["x-farmos-installation-id"],
      scope.installation_id);
    assert.equal(request.headers["x-farm-id"], scope.farm_id);
    assert.equal(url.searchParams.get("contract_version"),
      scope.contract_version);
    assert.equal(url.searchParams.get("from_business_date"),
      scope.from_business_date);
    assert.equal(url.searchParams.get("to_business_date"), scope.to_business_date);
    assert.equal(url.searchParams.get("limit"), "100");
    const cursor = url.searchParams.get("cursor");
    requests.push({ cursor });
    const page = cursor === null
      ? stablePage({
          changes: [stableChange({ change_sequence: "1" })],
          has_more: true,
          next_cursor: "e2e_cursor_2",
        })
      : stablePage({ changes: [stableChange({
          change_sequence: "2",
          source_record_id: "work_fixture_02",
          source_updated_at: "2026-08-01T09:01:00.000001+09:00",
        })] });
    const body = JSON.stringify(page);
    response.writeHead(200, {
      "content-type": "application/json",
      "content-length": String(Buffer.byteLength(body)),
    });
    response.end(body);
  });
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(0, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  assert.ok(address !== null && typeof address === "object");
  const config = loadFarmOsStableChangesHttpConsumerConfig({
    FARMOS_STABLE_CHANGES_HTTP_BASE_URL:
      `http://127.0.0.1:${address.port}`,
    FARMOS_STABLE_CHANGES_HTTP_BEARER: token,
    FARMOS_STABLE_CHANGES_CONTRACT_VERSION: scope.contract_version,
    FARMOS_STABLE_CHANGES_FROM_BUSINESS_DATE: scope.from_business_date,
    FARMOS_STABLE_CHANGES_TO_BUSINESS_DATE: scope.to_business_date,
    FARMOS_STABLE_CHANGES_PAGE_SIZE: "100",
    FARMOS_STABLE_CHANGES_TIMEOUT_MS: "8000",
    FARMOS_INSTALLATION_ID: scope.installation_id,
    FARMOS_AUTHORIZED_FARM_SCOPE: scope.farm_id,
    FARMOS_BUSINESS_TIMEZONE: "Asia/Tokyo",
  });
  const repository = new FarmOsStableChangesPostgresRepository({
    pool: runtime as unknown as FarmOsStableChangesPool,
  });
  const result = await new FarmOsStableChangesHttpConsumer({
    config,
    repository,
    observedAt: () => "2026-08-08T00:00:00.000001Z",
  }).run();
  assert.deepEqual({
    result: result.result,
    pages: result.page_count,
    changes: result.change_count,
    generation: result.checkpoint_generation,
    downstream: [
      result.downstream_snapshot_write_performed,
      result.candidate_generation_performed,
      result.projection_generation_performed,
      result.promotion_performed,
      result.active_write_performed,
      result.app_writeback_performed,
    ],
  }, {
    result: "complete", pages: 2, changes: 2, generation: "2",
    downstream: [false, false, false, false, false, false],
  });
  assert.deepEqual(requests, [{ cursor: null }, { cursor: "e2e_cursor_2" }]);
  const persisted = await admin.query<{
    generation: string; receipts: string; ingress: string;
  }>(`select checkpoint.generation::text,
      (select count(*)::text from ai.stable_changes_page_commit_receipts
        where stable_changes_scope_id=$1) receipts,
      (select count(*)::text from ai.stable_changes_validated_ingress
        where stable_changes_scope_id=$1) ingress
    from ai.stable_changes_consumer_checkpoints checkpoint
    where checkpoint.stable_changes_scope_id=$1`,
  [createFarmOsStableChangesScopeId(scope)]);
  assert.deepEqual(persisted.rows[0], {
    generation: "2", receipts: "2", ingress: "2",
  });
  console.log("farm_os_stable_changes_http_consumer_isolated_postgres: PASS");
} finally {
  if (server !== null) {
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  }
  if (runtime !== null) await runtime.end().catch(() => undefined);
  if (admin !== null) await admin.end().catch(() => undefined);
  try {
    docker(["rm", "--force", container]);
  } catch {
    // Specific isolated fixture cleanup is best-effort and never broad.
  }
}
