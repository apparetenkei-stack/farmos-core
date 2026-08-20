import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { Pool } from "pg";

import {
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
  FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH,
} from "../../src/lib/hermes/farm_os_production_target_execution_postgres_contract";
import {
  qualifyFarmOsDay150Gate13FiniteAcceptance,
} from "./lib/farm_os_day150_gate13_finite_acceptance_qualification";
import { FARM_OS_PTE_C2B_MIGRATION_HISTORY_DDL } from
  "./lib/farm_os_production_target_execution_postgres_qualification_fixture";

const run = promisify(execFile);
const ROOT = process.cwd();
const IMAGE = "docker.io/library/postgres@sha256:" +
  "7958605b474b3d264a969cb3a123d6aa00ad1e1fe9da8a69984dabb704d93317";
const CONTAINER = "farmos-day150-gate13-finite-preattempt-v1";
const NETWORK = "farmos-day150-gate13-finite-preattempt-network-v1";
const VOLUME = "farmos-day150-gate13-finite-preattempt-volume-v1";
const OWNER = "farmos.day150.gate13=finite-preattempt-v1";

async function docker(args: readonly string[], allowAbsent = false): Promise<string> {
  try {
    return (await run("docker", [...args], { cwd: ROOT, encoding: "utf8", timeout: 30_000,
      maxBuffer: 512 * 1024 })).stdout;
  } catch (error) {
    const candidate = error as { code?: number; stderr?: string };
    if (allowAbsent && candidate.code === 1 && /(?:No such|not found)/iu.test(
      String(candidate.stderr))) return "ABSENT";
    throw new Error("DAY150_GATE13_FINITE_DOCKER_OPERATION_FAILED");
  }
}

async function absent(kind: "container" | "network" | "volume", name: string) {
  return await docker([kind, "inspect", name], true) === "ABSENT";
}

async function cleanup(): Promise<void> {
  if (!await absent("container", CONTAINER)) {
    await docker(["container", "stop", CONTAINER]);
    await docker(["container", "rm", CONTAINER]);
  }
  if (!await absent("volume", VOLUME)) await docker(["volume", "rm", VOLUME]);
  if (!await absent("network", NETWORK)) await docker(["network", "rm", NETWORK]);
  assert.equal(await absent("container", CONTAINER), true);
  assert.equal(await absent("network", NETWORK), true);
  assert.equal(await absent("volume", VOLUME), true);
}

async function waitForPostgres(port: number): Promise<void> {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const pool = new Pool({ host: "127.0.0.1", port, database: "postgres", user: "postgres",
      connectionTimeoutMillis: 1_000 });
    try { await pool.query("select 1"); await pool.end(); return; }
    catch { await pool.end().catch(() => undefined); await new Promise((done) =>
      setTimeout(done, 250)); }
  }
  throw new Error("DAY150_GATE13_FINITE_POSTGRES_NOT_READY");
}

assert.equal(await absent("container", CONTAINER), true);
assert.equal(await absent("network", NETWORK), true);
assert.equal(await absent("volume", VOLUME), true);
let port = 0;
try {
  await docker(["network", "create", "--label", OWNER, NETWORK]);
  await docker(["volume", "create", "--label", OWNER, VOLUME]);
  await docker(["run", "-d", "--name", CONTAINER, "--label", OWNER, "--network", NETWORK,
    "--mount", `source=${VOLUME},target=/var/lib/postgresql/data`, "-p", "127.0.0.1::5432",
    "-e", "POSTGRES_HOST_AUTH_METHOD=trust", IMAGE]);
  let endpoint = "";
  for (let attempt = 0; attempt < 40 && endpoint === ""; attempt += 1) {
    endpoint = (await docker(["container", "port", CONTAINER, "5432/tcp"])).trim();
    if (endpoint === "") await new Promise((done) => setTimeout(done, 250));
  }
  const match = /^127\.0\.0\.1:([1-9][0-9]{0,4})$/u.exec(endpoint);
  port = Number(match?.[1]);
  assert.ok(match);
  assert.equal(Number.isSafeInteger(port) && port > 0, true);
  await waitForPostgres(port);
  const finite = await qualifyFarmOsDay150Gate13FiniteAcceptance({
    create_database: async (caseId) => {
      const database = `farmos_day150_gate13_${caseId.toLowerCase()}`;
      const admin = new Pool({ host: "127.0.0.1", port, database: "postgres", user: "postgres" });
      await admin.query(`create database ${database}`);
      await admin.end();
      const pool = new Pool({ host: "127.0.0.1", port, database, user: "postgres", max: 8 });
      pool.on("error", () => undefined);
      for (const ddl of FARM_OS_PTE_C2B_MIGRATION_HISTORY_DDL) await pool.query(ddl);
      await pool.query(readFileSync(resolve(ROOT,
        FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_PATH), "utf8"));
      await pool.query(`insert into core_schema.migration_history
        (migration_id, sequence, checksum, description, applied_at, applied_by, execution_id)
        values ($1, 202608110001, $2, 'Day150 Gate13 finite pre-attempt qualification',
          pg_catalog.clock_timestamp(), 'day150_gate13_finite', $3)`,
      [FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_MIGRATION_ID,
        FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_APPLY_SHA256, `finite-${caseId}`]);
      await pool.query(readFileSync(resolve(ROOT,
        FARM_OS_PRODUCTION_TARGET_EXECUTION_POSTGRES_VERIFY_PATH), "utf8"));
      const identity = (await pool.query(
        "select ai.read_production_target_execution_schema_identity() as value")).rows[0]?.value;
      assert.ok(identity);
      return pool;
    },
  });
  process.stdout.write(`${JSON.stringify({ status: "PASS", ...finite,
    attempt_claim_created: false, attempt_terminal_created: false,
    qualification_resources_zero_residual: true })}\n`);
} finally {
  await cleanup();
}
