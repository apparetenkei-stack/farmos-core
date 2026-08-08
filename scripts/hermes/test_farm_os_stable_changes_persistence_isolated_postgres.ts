import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

import { Pool, type PoolClient, type QueryResult } from "pg";

import {
  farmOsStableChangesTimestampMicros,
} from "../../src/lib/hermes/farm_os_operational_memory_contract";
import {
  FarmOsStableChangesPersistenceError,
  createFarmOsStableChangesPageFingerprint,
  createFarmOsStableChangesScopeId,
  type FarmOsStableChangesScope,
} from "../../src/lib/hermes/farm_os_stable_changes_persistence";
import {
  FarmOsStableChangesPostgresRepository,
  type FarmOsStableChangesPool,
  type FarmOsStableChangesPoolClient,
} from "../../src/lib/hermes/farm_os_stable_changes_postgres_repository";
import {
  STABLE_CHANGES_SCOPE,
  stableChange,
  stablePage,
  stableTombstone,
} from "./lib/farm_os_stable_changes_consumer_fixture";

const IMAGE = "postgres:17";
const nonce = randomBytes(6).toString("hex");
const container = `farmos_stable_changes_${nonce}`;
const database = `stable_changes_${nonce}`;
const adminPassword = "stable-changes-admin-fixture-only";
const runtimePassword = "stable-changes-runtime-fixture-only";
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

function scope(suffix: string, input?: Partial<FarmOsStableChangesScope>):
FarmOsStableChangesScope {
  return {
    ...STABLE_CHANGES_SCOPE,
    farm_id: `farm_${suffix}`,
    ...input,
  };
}

async function initializeScope(
  admin: Pool,
  value: FarmOsStableChangesScope,
): Promise<string> {
  const result = await admin.query<{ result: { stable_changes_scope_id: string } }>(
    `select ai.initialize_stable_changes_consumer_scope(
      $1::text,$2::text,$3::date,$4::date,$5::smallint
    ) as result`,
    [
      value.installation_id, value.farm_id, value.from_business_date,
      value.to_business_date, value.page_size,
    ],
  );
  const scopeId = result.rows[0]?.result.stable_changes_scope_id;
  assert.equal(scopeId, createFarmOsStableChangesScopeId(value));
  return scopeId;
}

async function expectCode(
  action: () => Promise<unknown>,
  code: string,
): Promise<void> {
  await assert.rejects(action, (error: unknown) => {
    assert.ok(error instanceof FarmOsStableChangesPersistenceError);
    assert.equal(error.code, code);
    assert.equal(error.message, code);
    return true;
  });
}

async function callCommitWithFailure(input: {
  pool: Pool;
  scopeId: string;
  expected: string;
  page: unknown;
  failureStage: "ingress" | "receipt" | "checkpoint";
}): Promise<void> {
  const client = await input.pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role farmos_core_stable_changes_runtime");
    await client.query("select pg_catalog.set_config('farmos.test_failure_stage',$1,true)", [
      input.failureStage,
    ]);
    await assert.rejects(client.query(
      `select ai.commit_stable_changes_page(
        $1::text,$2::bigint,$3::text,$4::jsonb,$5::timestamptz
      )`,
      [
        input.scopeId, input.expected, null, JSON.stringify(input.page),
        "2026-08-07T01:00:00.000001Z",
      ],
    ));
    await client.query("rollback");
  } finally {
    client.release();
  }
}

async function assertDirectInvalidScalarAtomic(input: {
  admin: Pool;
  pool: Pool;
  scope: FarmOsStableChangesScope;
  path: readonly string[];
  replacementJson: string;
  remove?: boolean;
  page?: unknown;
}): Promise<void> {
  const scopeId = await initializeScope(input.admin, input.scope);
  const client = await input.pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role farmos_core_stable_changes_runtime");
    await assert.rejects(client.query(
      `select ai.commit_stable_changes_page(
        $1::text,$2::bigint,$3::text,
        case when $8::boolean then $4::jsonb #- $6::text[]
          else pg_catalog.jsonb_set($4::jsonb,$6::text[],$7::jsonb,true)
        end,
        $5::timestamptz
      )`, [
        scopeId, "0", null,
        JSON.stringify(input.page ?? stablePage({
          changes: [stableChange({ change_sequence: "1" })],
        })),
        "2026-08-07T00:00:00.000001Z",
        [...input.path], input.replacementJson, input.remove ?? false,
      ],
    ), (error: unknown) => {
      assert.ok(error instanceof Error);
      assert.equal(error.message, "INGRESS_CONTRACT_INVALID");
      assert.equal(
        typeof error === "object" && error !== null && "code" in error
          ? error.code
          : null,
        "22023",
      );
      return true;
    });
    await client.query("rollback");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  const state = await input.admin.query<{
    generation: string;
    receipts: string;
    ingress: string;
  }>(`
    select checkpoint.generation::text,
      (select count(*)::text from ai.stable_changes_page_commit_receipts
        where stable_changes_scope_id=$1) receipts,
      (select count(*)::text from ai.stable_changes_validated_ingress
        where stable_changes_scope_id=$1) ingress
    from ai.stable_changes_consumer_checkpoints checkpoint
    where checkpoint.stable_changes_scope_id=$1
  `, [scopeId]);
  assert.deepEqual(state.rows[0], {
    generation: "0", receipts: "0", ingress: "0",
  });
}

class LostCommitPool implements FarmOsStableChangesPool {
  private failNextCommit = true;
  constructor(private readonly pool: Pool) {}

  async connect(): Promise<FarmOsStableChangesPoolClient> {
    const client = await this.pool.connect();
    const owner = this;
    return {
      async query<Row extends Record<string, unknown> = Record<string, unknown>>(
        text: string,
        values?: readonly unknown[],
      ) {
        if (text === "commit" && owner.failNextCommit) {
          owner.failNextCommit = false;
          await client.query("commit");
          throw new Error("fixture_connection_lost_after_commit");
        }
        return client.query(text, values as unknown[]) as unknown as Promise<{
          rows: Row[];
          rowCount: number | null;
        }>;
      },
      release() {
        client.release();
      },
    };
  }

  async end(): Promise<void> {}
}

let admin: Pool | null = null;
let runtimePool: Pool | null = null;
try {
  docker([
    "run", "--detach", "--pull=never", "--restart=no", "--name", container,
    "--publish", "127.0.0.1::5432",
    "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=256m",
    "--env", `POSTGRES_DB=${database}`,
    "--env", "POSTGRES_USER=postgres",
    "--env", `POSTGRES_PASSWORD=${adminPassword}`,
    "--label", `farmos.stable_changes.execution_nonce=${nonce}`,
    IMAGE,
  ]);
  const portOutput = docker(["port", container, "5432/tcp"]);
  const port = Number(portOutput.match(/127\.0\.0\.1:(\d+)/u)?.[1]);
  assert.ok(Number.isInteger(port) && port > 0);
  admin = new Pool({
    host: "127.0.0.1", port, database, user: "postgres",
    password: adminPassword, ssl: false, max: 8,
  });
  await waitForPostgres(admin);
  const version = await admin.query<{ server_version: string }>("show server_version");
  assert.match(version.rows[0]?.server_version ?? "", /^17\./u);
  await admin.query("create schema ai");
  await admin.query("create role anon nologin");
  await admin.query("create role authenticated nologin");
  await admin.query(migrationSql);
  await admin.query(verifySql);

  const role = await admin.query<{
    rolcanlogin: boolean; rolsuper: boolean; rolcreatedb: boolean;
    rolcreaterole: boolean; rolinherit: boolean; rolreplication: boolean;
    rolbypassrls: boolean;
  }>(`select rolcanlogin,rolsuper,rolcreatedb,rolcreaterole,rolinherit,
    rolreplication,rolbypassrls from pg_roles
    where rolname='farmos_core_stable_changes_runtime'`);
  assert.deepEqual(role.rows[0], {
    rolcanlogin: false, rolsuper: false, rolcreatedb: false,
    rolcreaterole: false, rolinherit: false, rolreplication: false,
    rolbypassrls: false,
  });
  await admin.query(`create role stable_changes_runtime_fixture login password
    '${runtimePassword}' noinherit nosuperuser nocreatedb nocreaterole
    noreplication nobypassrls`);
  await admin.query(
    "grant farmos_core_stable_changes_runtime to stable_changes_runtime_fixture",
  );
  await admin.query("create role stable_changes_browser_fixture nologin");
  const browserAcl = await admin.query<{
    load_allowed: boolean; commit_allowed: boolean; table_allowed: boolean;
  }>(`
    select
      has_function_privilege('stable_changes_browser_fixture',
        'ai.load_stable_changes_checkpoint(text)','EXECUTE') as load_allowed,
      has_function_privilege('stable_changes_browser_fixture',
        'ai.commit_stable_changes_page(text,bigint,text,jsonb,timestamptz)',
        'EXECUTE') as commit_allowed,
      has_table_privilege('stable_changes_browser_fixture',
        'ai.stable_changes_consumer_checkpoints','SELECT,INSERT,UPDATE,DELETE,TRUNCATE')
        as table_allowed
  `);
  assert.deepEqual(browserAcl.rows[0], {
    load_allowed: false, commit_allowed: false, table_allowed: false,
  });
  runtimePool = new Pool({
    host: "127.0.0.1", port, database,
    user: "stable_changes_runtime_fixture", password: runtimePassword,
    ssl: false, max: 8,
  });
  const repository = new FarmOsStableChangesPostgresRepository({
    pool: runtimePool as unknown as FarmOsStableChangesPool,
  });

  await assert.rejects(runtimePool.query(
    "select * from ai.stable_changes_consumer_checkpoints",
  ));
  await assert.rejects(runtimePool.query(
    "insert into ai.stable_changes_consumer_checkpoints(stable_changes_scope_id) values ('forbidden')",
  ));
  await assert.rejects(runtimePool.query(
    "update ai.stable_changes_consumer_checkpoints set generation=1",
  ));
  await assert.rejects(runtimePool.query(
    "delete from ai.stable_changes_consumer_checkpoints",
  ));
  await assert.rejects(runtimePool.query(
    "truncate table ai.stable_changes_consumer_checkpoints",
  ));
  await expectCode(() => repository.loadCheckpoint(scope("missing")),
    "CHECKPOINT_NOT_FOUND");

  const diagnosticScope = scope("diagnostic");
  const diagnosticScopeId = await initializeScope(admin, diagnosticScope);
  const diagnosticClient = await runtimePool.connect();
  try {
    await diagnosticClient.query("begin");
    await diagnosticClient.query("set local role farmos_core_stable_changes_runtime");
    const diagnosticResult = await diagnosticClient.query<{ result: unknown }>(
      `select ai.commit_stable_changes_page(
        $1::text,$2::bigint,$3::text,$4::jsonb,$5::timestamptz
      ) as result`,
      [
        diagnosticScopeId, "0", null,
        JSON.stringify(stablePage({
          changes: [stableChange({ change_sequence: "1" })],
        })),
        "2026-08-07T00:00:00.000001Z",
      ],
    );
    assert.equal(
      (diagnosticResult.rows[0]?.result as { result?: unknown })?.result,
      "committed",
    );
    await diagnosticClient.query("rollback");
  } catch (error) {
    await diagnosticClient.query("rollback").catch(() => undefined);
    const sqlState = typeof error === "object" && error !== null &&
        "code" in error && typeof error.code === "string"
      ? error.code
      : "unknown";
    throw new Error(`stable_changes_direct_commit_sqlstate_${sqlState}`);
  } finally {
    diagnosticClient.release();
  }

  for (const [suffix, field, replacementJson, remove] of [
    ["numeric_sequence", "change_sequence", "123", false],
    ["numeric_source_id", "source_record_id", "123", false],
    ["numeric_hash", "source_content_hash", "1".repeat(64), false],
    ["numeric_field_reference", "field_reference", "123", false],
    ["numeric_work_type", "work_type_reference", "123", false],
    ["numeric_recorded_at", "recorded_at", "123", false],
    ["numeric_source_updated_at", "source_updated_at", "123", false],
    ["numeric_operation", "operation", "123", false],
    ["array_safe_payload", "safe_payload", "[]", false],
    ["string_safe_payload", "safe_payload", "\"x\"", false],
    ["crop_cycle_value", "crop_cycle_reference", "\"uuid\"", false],
    ["unknown_key", "unexpected", "true", false],
    ["missing_key", "change_sequence", "null", true],
  ] as const) {
    await assertDirectInvalidScalarAtomic({
      admin,
      pool: runtimePool,
      scope: scope(`invalid_${suffix}`),
      path: ["changes", "0", field],
      replacementJson,
      remove,
    });
  }
  for (const [suffix, field, replacementJson] of [
    ["numeric_next_cursor", "next_cursor", "123"],
    ["object_next_cursor", "next_cursor", "{}"],
    ["numeric_contract_version", "contract_version", "123"],
    ["numeric_result", "result", "123"],
  ] as const) {
    await assertDirectInvalidScalarAtomic({
      admin,
      pool: runtimePool,
      scope: scope(`invalid_${suffix}`),
      path: [field],
      replacementJson,
      page: stablePage({
        changes: [stableChange({ change_sequence: "1" })],
        has_more: true,
      }),
    });
  }

  const basicScope = scope("basic");
  const basicScopeId = await initializeScope(admin, basicScope);
  const initial = await repository.loadCheckpoint(basicScope);
  assert.equal(initial.generation, "0");
  assert.equal(initial.cursor, null);
  const firstPage = stablePage({
    changes: [stableChange({ change_sequence: "1" })],
    has_more: true,
    next_cursor: "cursor_basic_1",
  });
  const firstCommit = await repository.commitPage({
    scope: basicScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: firstPage, observedAt: "2026-08-07T00:00:00.000001Z",
  });
  assert.equal(firstCommit.result, "committed");
  assert.equal(firstCommit.checkpoint.generation, "1");
  assert.equal(firstCommit.checkpoint.cursor, "cursor_basic_1");
  const persisted = await admin.query<{ receipts: string; ingress: string }>(`
    select
      (select count(*)::text from ai.stable_changes_page_commit_receipts
        where stable_changes_scope_id=$1) as receipts,
      (select count(*)::text from ai.stable_changes_validated_ingress
        where stable_changes_scope_id=$1) as ingress
  `, [basicScopeId]);
  assert.deepEqual(persisted.rows[0], { receipts: "1", ingress: "1" });
  const firstArtifacts = await admin.query<{
    expected_generation: string; committed_generation: string;
    returned_count: number; accepted_count: number; duplicate_count: number;
    disposition: string; crop_cycle_reference: string | null;
  }>(`select receipt.expected_generation::text,
      receipt.committed_generation::text,receipt.returned_count,
      receipt.accepted_count,receipt.duplicate_count,
      ingress.disposition,ingress.crop_cycle_reference
    from ai.stable_changes_page_commit_receipts receipt
    join ai.stable_changes_validated_ingress ingress
      using (stable_changes_scope_id,committed_generation)
    where receipt.stable_changes_scope_id=$1`, [basicScopeId]);
  assert.deepEqual(firstArtifacts.rows[0], {
    expected_generation: "0", committed_generation: "1",
    returned_count: 1, accepted_count: 1, duplicate_count: 0,
    disposition: "accepted", crop_cycle_reference: null,
  });
  const firstFingerprint = await admin.query<{ page_fingerprint: string }>(`
    select page_fingerprint from ai.stable_changes_page_commit_receipts
    where stable_changes_scope_id=$1 and committed_generation=1
  `, [basicScopeId]);
  assert.equal(firstFingerprint.rows[0]?.page_fingerprint,
    createFarmOsStableChangesPageFingerprint({
      scope: basicScope, request_cursor: null, page: firstPage,
    }));

  const sameRetry = await repository.commitPage({
    scope: basicScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: firstPage, observedAt: "2026-08-07T00:00:00.000001Z",
  });
  assert.equal(sameRetry.result, "already_committed");
  assert.equal(sameRetry.checkpoint.generation, "1");

  const sequenceReplay = stablePage({
    changes: [stableChange({ change_sequence: "1" })],
  });
  const replay = await repository.commitPage({
    scope: basicScope, expectedGeneration: "1",
    requestCursor: "cursor_basic_1", validatedPage: sequenceReplay,
    observedAt: "2026-08-07T00:01:00.000001Z",
  });
  assert.equal(replay.checkpoint.last_duplicate_count, 1);
  assert.equal(replay.checkpoint.last_accepted_count, 0);
  const advancedCheckpointRetry = await repository.commitPage({
    scope: basicScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: firstPage, observedAt: "2026-08-07T00:00:00.000001Z",
  });
  assert.equal(advancedCheckpointRetry.result, "already_committed");
  assert.equal(advancedCheckpointRetry.checkpoint.generation, "2");

  const sequenceConflictScope = scope("sequence_conflict");
  await initializeScope(admin, sequenceConflictScope);
  await repository.commitPage({
    scope: sequenceConflictScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({ change_sequence: "1" })] }),
    observedAt: "2026-08-07T00:00:00.000001Z",
  });
  await expectCode(() => repository.commitPage({
    scope: sequenceConflictScope, expectedGeneration: "1", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({
      change_sequence: "1", source_content_hash: "b".repeat(64),
    })] }),
    observedAt: "2026-08-07T00:01:00.000001Z",
  }), "DEDUPE_CONFLICT");

  const semanticScope = scope("semantic");
  const semanticScopeId = await initializeScope(admin, semanticScope);
  const semanticChanges = [
    stableChange({ change_sequence: "10" }),
    stableChange({
      change_sequence: "11",
      source_updated_at: "2026-08-01T09:01:00.000001+09:00",
    }),
    stableChange({
      change_sequence: "12", source_record_version: 2,
      source_content_hash: "b".repeat(64),
      source_updated_at: "2026-08-01T09:02:00.000001+09:00",
    }),
    stableChange({
      change_sequence: "13", source_record_version: 3,
      source_content_hash: "a".repeat(64),
      source_updated_at: "2026-08-01T09:03:00.000001+09:00",
    }),
    stableTombstone({
      change_sequence: "14", source_record_version: 4,
      source_content_hash: "a".repeat(64),
      source_updated_at: "2026-08-01T10:00:00.000001+09:00",
    }),
  ];
  const semanticCommit = await repository.commitPage({
    scope: semanticScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: semanticChanges }),
    observedAt: "2026-08-07T00:00:00.000001Z",
  });
  assert.equal(semanticCommit.checkpoint.last_accepted_count, 4);
  assert.equal(semanticCommit.checkpoint.last_duplicate_count, 1);
  const dispositions = await admin.query<{
    change_sequence: string; disposition: string; operation: string;
  }>(`select change_sequence::text,disposition,operation
    from ai.stable_changes_validated_ingress
    where stable_changes_scope_id=$1 order by change_sequence`, [semanticScopeId]);
  assert.deepEqual(dispositions.rows, [
    { change_sequence: "10", disposition: "accepted", operation: "upsert" },
    { change_sequence: "11", disposition: "semantic_duplicate", operation: "upsert" },
    { change_sequence: "12", disposition: "accepted", operation: "upsert" },
    { change_sequence: "13", disposition: "accepted", operation: "upsert" },
    { change_sequence: "14", disposition: "accepted", operation: "tombstone" },
  ]);

  const nonMonotonicScope = scope("non_monotonic_sequence");
  const nonMonotonicScopeId = await initializeScope(admin, nonMonotonicScope);
  await repository.commitPage({
    scope: nonMonotonicScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: [
      stableChange({ change_sequence: "100" }),
      stableChange({
        change_sequence: "50", source_record_version: 2,
        source_content_hash: "b".repeat(64),
        source_updated_at: "2026-08-01T09:01:00.000001+09:00",
      }),
      stableChange({
        change_sequence: "51",
        source_updated_at: "2026-08-01T09:02:00.000001+09:00",
      }),
    ] }), observedAt: "2026-08-07T00:00:00.000001Z",
  });
  const nonMonotonicDispositions = await admin.query<{
    change_sequence: string; disposition: string;
  }>(`select change_sequence::text,disposition
    from ai.stable_changes_validated_ingress
    where stable_changes_scope_id=$1 order by source_updated_at,change_sequence`,
  [nonMonotonicScopeId]);
  assert.deepEqual(nonMonotonicDispositions.rows, [
    { change_sequence: "100", disposition: "accepted" },
    { change_sequence: "50", disposition: "accepted" },
    { change_sequence: "51", disposition: "accepted" },
  ]);

  const nonMonotonicDuplicateScope = scope("non_monotonic_duplicate");
  const nonMonotonicDuplicateScopeId = await initializeScope(
    admin, nonMonotonicDuplicateScope,
  );
  await repository.commitPage({
    scope: nonMonotonicDuplicateScope, expectedGeneration: "0",
    requestCursor: null, validatedPage: stablePage({ changes: [
      stableChange({ change_sequence: "100" }),
      stableChange({
        change_sequence: "50",
        source_updated_at: "2026-08-01T09:01:00.000001+09:00",
      }),
    ] }), observedAt: "2026-08-07T00:00:00.000001Z",
  });
  const nonMonotonicDuplicateRows = await admin.query<{
    change_sequence: string; disposition: string;
    duplicate_target_sequence: string | null;
  }>(`select change_sequence::text,disposition,
      duplicate_target_sequence::text
    from ai.stable_changes_validated_ingress
    where stable_changes_scope_id=$1 order by source_updated_at,change_sequence`,
  [nonMonotonicDuplicateScopeId]);
  assert.deepEqual(nonMonotonicDuplicateRows.rows, [
    {
      change_sequence: "100", disposition: "accepted",
      duplicate_target_sequence: null,
    },
    {
      change_sequence: "50", disposition: "semantic_duplicate",
      duplicate_target_sequence: "100",
    },
  ]);

  const versionConflictScope = scope("version_conflict");
  await initializeScope(admin, versionConflictScope);
  await repository.commitPage({
    scope: versionConflictScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({ change_sequence: "1" })] }),
    observedAt: "2026-08-07T00:00:00.000001Z",
  });
  await expectCode(() => repository.commitPage({
    scope: versionConflictScope, expectedGeneration: "1", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({
      change_sequence: "2", source_content_hash: "c".repeat(64),
      source_updated_at: "2026-08-01T09:01:00.000001+09:00",
    })] }), observedAt: "2026-08-07T00:01:00.000001Z",
  }), "DEDUPE_CONFLICT");

  const orderingScope = scope("ordering");
  await initializeScope(admin, orderingScope);
  await repository.commitPage({
    scope: orderingScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({
      change_sequence: "20",
      source_updated_at: "2026-08-01T09:00:00.000002+09:00",
    })] }), observedAt: "2026-08-07T00:00:00.000001Z",
  });
  await expectCode(() => repository.commitPage({
    scope: orderingScope, expectedGeneration: "1", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({
      change_sequence: "21",
      source_updated_at: "2026-08-01T09:00:00.000001+09:00",
    })] }), observedAt: "2026-08-07T00:01:00.000001Z",
  }), "ORDERING_REGRESSION");
  await expectCode(() => repository.commitPage({
    scope: orderingScope, expectedGeneration: "1", requestCursor: "wrong",
    validatedPage: stablePage({ changes: [stableChange({
      change_sequence: "22",
      source_updated_at: "2026-08-01T09:00:00.000003+09:00",
    })] }), observedAt: "2026-08-07T00:01:00.000001Z",
  }), "CHECKPOINT_CONFLICT");

  const precisionScope = scope("precision");
  await initializeScope(admin, precisionScope);
  const precisionCommit = await repository.commitPage({
    scope: precisionScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: [
      stableChange({ change_sequence: "70" }),
      stableChange({
        change_sequence: "71",
        source_record_id: "precision_tie",
        source_content_hash: "b".repeat(64),
      }),
      stableChange({
        change_sequence: "72",
        source_record_id: "precision_microsecond",
        source_content_hash: "c".repeat(64),
        source_updated_at: "2026-08-01T09:00:00.000002+09:00",
      }),
    ] }), observedAt: "2026-08-07T00:01:00.000001Z",
  });
  assert.equal(precisionCommit.checkpoint.last_change_sequence, "72");
  assert.equal(farmOsStableChangesTimestampMicros(
    precisionCommit.checkpoint.last_source_updated_at,
  ), farmOsStableChangesTimestampMicros("2026-08-01T00:00:00.000002Z"));

  const invalidPrecisionScope = scope("invalid_precision");
  const invalidPrecisionScopeId = await initializeScope(admin, invalidPrecisionScope);
  const invalidPrecisionClient = await runtimePool.connect();
  try {
    await invalidPrecisionClient.query("begin");
    await invalidPrecisionClient.query(
      "set local role farmos_core_stable_changes_runtime",
    );
    const invalidPrecisionPage = stablePage({ changes: [stableChange({
      change_sequence: "73",
      recorded_at: "2026-08-01T09:00:00.1234567+09:00",
    })] });
    await assert.rejects(invalidPrecisionClient.query(
      `select ai.commit_stable_changes_page(
        $1::text,$2::bigint,$3::text,$4::jsonb,$5::timestamptz
      )`, [
        invalidPrecisionScopeId, "0", null,
        JSON.stringify(invalidPrecisionPage), "2026-08-07T00:01:00.000001Z",
      ],
    ), /INGRESS_CONTRACT_INVALID/u);
    await invalidPrecisionClient.query("rollback");
  } finally {
    invalidPrecisionClient.release();
  }

  const raceScope = scope("race");
  await initializeScope(admin, raceScope);
  const raceResults = await Promise.allSettled([
    repository.commitPage({
      scope: raceScope, expectedGeneration: "0", requestCursor: null,
      validatedPage: stablePage({ changes: [stableChange({
        change_sequence: "30", source_record_id: "race_a",
      })] }), observedAt: "2026-08-07T00:00:00.000001Z",
    }),
    repository.commitPage({
      scope: raceScope, expectedGeneration: "0", requestCursor: null,
      validatedPage: stablePage({ changes: [stableChange({
        change_sequence: "31", source_record_id: "race_b",
        source_content_hash: "b".repeat(64),
      })] }), observedAt: "2026-08-07T00:00:00.000001Z",
    }),
  ]);
  assert.equal(raceResults.filter((result) => result.status === "fulfilled").length, 1);
  assert.equal(raceResults.filter((result) => result.status === "rejected").length, 1);

  const sameRaceScope = scope("same_race");
  await initializeScope(admin, sameRaceScope);
  const sameRaceInput = {
    scope: sameRaceScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({ change_sequence: "40" })] }),
    observedAt: "2026-08-07T00:00:00.000001Z",
  } as const;
  const sameRace = await Promise.all([
    repository.commitPage(sameRaceInput), repository.commitPage(sameRaceInput),
  ]);
  assert.deepEqual(sameRace.map((value) => value.result).sort(),
    ["already_committed", "committed"]);

  await admin.query(`
    create function ai.stable_changes_fixture_fail() returns trigger
    language plpgsql set search_path=pg_catalog as $$
    begin
      if pg_catalog.current_setting('farmos.test_failure_stage', true) = tg_argv[0]
      then raise exception 'fixture_failure'; end if;
      return new;
    end $$;
    create trigger stable_changes_fixture_ingress before insert
      on ai.stable_changes_validated_ingress for each row
      execute function ai.stable_changes_fixture_fail('ingress');
    create trigger stable_changes_fixture_receipt before insert
      on ai.stable_changes_page_commit_receipts for each row
      execute function ai.stable_changes_fixture_fail('receipt');
    create trigger stable_changes_fixture_checkpoint before update
      on ai.stable_changes_consumer_checkpoints for each row
      execute function ai.stable_changes_fixture_fail('checkpoint');
  `);
  for (const failureStage of ["ingress", "receipt", "checkpoint"] as const) {
    const failureScope = scope(`failure_${failureStage}`);
    const failureScopeId = await initializeScope(admin, failureScope);
    await callCommitWithFailure({
      pool: runtimePool, scopeId: failureScopeId, expected: "0",
      page: stablePage({ changes: [stableChange({ change_sequence: "50" })] }),
      failureStage,
    });
    const countsResult: QueryResult<{
      generation: string;
      ingress: string;
      receipt: string;
    }> = await admin.query(`
      select checkpoint.generation::text,
        (select count(*)::text from ai.stable_changes_validated_ingress
          where stable_changes_scope_id=$1) ingress,
        (select count(*)::text from ai.stable_changes_page_commit_receipts
          where stable_changes_scope_id=$1) receipt
      from ai.stable_changes_consumer_checkpoints checkpoint
      where checkpoint.stable_changes_scope_id=$1
    `, [failureScopeId]);
    assert.deepEqual(countsResult.rows[0], {
      generation: "0", ingress: "0", receipt: "0",
    });
  }

  const lostScope = scope("lost_commit");
  await initializeScope(admin, lostScope);
  const lostRepository = new FarmOsStableChangesPostgresRepository({
    pool: new LostCommitPool(runtimePool),
  });
  const lost = await lostRepository.commitPage({
    scope: lostScope, expectedGeneration: "0", requestCursor: null,
    validatedPage: stablePage({ changes: [stableChange({ change_sequence: "60" })] }),
    observedAt: "2026-08-07T00:00:00.000001Z",
  });
  assert.equal(lost.result, "already_committed");
  assert.equal(lost.checkpoint.generation, "1");

  const isolatedScopes = [
    scope("isolation_a"),
    scope("isolation_b", { from_business_date: "2026-08-02" }),
    scope("isolation_c", { page_size: 99 }),
  ];
  const isolatedIds = await Promise.all(isolatedScopes.map((value) =>
    initializeScope(admin!, value)
  ));
  assert.equal(new Set(isolatedIds).size, 3);

  for (const relation of [
    "stable_changes_consumer_scopes",
    "stable_changes_page_commit_receipts",
    "stable_changes_validated_ingress",
  ]) {
    await assert.rejects(admin.query(
      `update ai.${relation} set stable_changes_scope_id=stable_changes_scope_id
        where stable_changes_scope_id=$1`, [basicScopeId],
    ), /stable_changes_append_only/u);
    await assert.rejects(admin.query(
      `delete from ai.${relation} where stable_changes_scope_id=$1`, [basicScopeId],
    ), /stable_changes_append_only/u);
    await assert.rejects(admin.query(
      `truncate table ai.${relation} cascade`,
    ), /stable_changes_append_only/u);
  }

  const secretScan = await admin.query<{ exposed: string }>(`
    select count(*)::text as exposed from (
      select cursor::text value from ai.stable_changes_consumer_checkpoints
      union all select page_fingerprint from ai.stable_changes_page_commit_receipts
      union all select dto_identity_hash from ai.stable_changes_validated_ingress
    ) values where value like '%Bearer %' or value like '%JWT%'
  `);
  assert.equal(secretScan.rows[0]?.exposed, "0");

  console.log("farm_os_stable_changes_persistence_isolated_postgres: PASS");
} finally {
  if (runtimePool !== null) await runtimePool.end().catch(() => undefined);
  if (admin !== null) await admin.end().catch(() => undefined);
  try {
    docker(["rm", "--force", container]);
  } catch {
    // Specific isolated fixture cleanup is best-effort and never broad.
  }
}
