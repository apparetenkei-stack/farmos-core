import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  farmOsStableChangesTimestampMicros,
  parseFarmOsStableChangesPage,
} from "./farm_os_operational_memory_contract";
import {
  createFarmOsStableChangesScopeId,
  FarmOsStableChangesPersistenceError,
  parseFarmOsStableChangesScope,
  type FarmOsStableChangesCheckpoint,
  type FarmOsStableChangesCommitPageInput,
  type FarmOsStableChangesCommitPageResult,
  type FarmOsStableChangesPersistenceErrorCode,
  type FarmOsStableChangesPersistenceRepository,
  type FarmOsStableChangesScope,
} from "./farm_os_stable_changes_persistence";

type QueryResult<Row extends Record<string, unknown>> = {
  rows: Row[];
  rowCount: number | null;
};

export type FarmOsStableChangesPoolClient = {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<QueryResult<Row>>;
  release(): void;
};

export type FarmOsStableChangesPool = {
  connect(): Promise<FarmOsStableChangesPoolClient>;
  end(): Promise<void>;
};

const CHECKPOINT_KEYS = [
  "stable_changes_scope_id", "cursor", "generation",
  "last_source_updated_at", "last_change_sequence",
  "last_successful_page_at", "last_returned_count",
  "last_accepted_count", "last_duplicate_count", "last_has_more",
  "last_page_fingerprint", "created_at", "updated_at",
] as const;

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function canonicalIso(value: unknown): value is string {
  return typeof value === "string" &&
    farmOsStableChangesTimestampMicros(value) !== null;
}

function parseCheckpoint(
  value: unknown,
  expectedScopeId: string,
): FarmOsStableChangesCheckpoint | null {
  if (!record(value) || Object.keys(value).length !== CHECKPOINT_KEYS.length ||
    !CHECKPOINT_KEYS.every((key) => Object.hasOwn(value, key)) ||
    value.stable_changes_scope_id !== expectedScopeId ||
    !(value.cursor === null || (typeof value.cursor === "string" &&
      value.cursor.length >= 1 && value.cursor.length <= 512)) ||
    typeof value.generation !== "string" || !/^\d+$/u.test(value.generation) ||
    !(
      (value.last_source_updated_at === null && value.last_change_sequence === null) ||
      (canonicalIso(value.last_source_updated_at) &&
        typeof value.last_change_sequence === "string" &&
        /^[1-9]\d{0,18}$/u.test(value.last_change_sequence))
    ) ||
    !(value.last_successful_page_at === null ||
      canonicalIso(value.last_successful_page_at)) ||
    !["last_returned_count", "last_accepted_count", "last_duplicate_count"]
      .every((key) => value[key] === null ||
        (Number.isSafeInteger(value[key]) && Number(value[key]) >= 0)) ||
    !(value.last_has_more === null || typeof value.last_has_more === "boolean") ||
    !(value.last_page_fingerprint === null ||
      (typeof value.last_page_fingerprint === "string" &&
        /^[0-9a-f]{64}$/u.test(value.last_page_fingerprint))) ||
    !canonicalIso(value.created_at) || !canonicalIso(value.updated_at)) return null;
  return value as unknown as FarmOsStableChangesCheckpoint;
}

function mappedError(error: unknown): FarmOsStableChangesPersistenceError {
  const message = error instanceof Error ? error.message : "";
  const driverCode = record(error) && typeof error.code === "string"
    ? error.code
    : "";
  const codes: readonly FarmOsStableChangesPersistenceErrorCode[] = [
    "CHECKPOINT_NOT_FOUND", "CHECKPOINT_CONFLICT", "ORDERING_REGRESSION",
    "DEDUPE_CONFLICT", "INGRESS_CONTRACT_INVALID",
  ];
  const matched = codes.find((code) => message === code);
  if (/^08/u.test(driverCode) || [
    "57P01", "57P02", "57P03", "ECONNRESET", "ECONNREFUSED", "EPIPE",
  ].includes(driverCode)) {
    return new FarmOsStableChangesPersistenceError("PERSISTENCE_UNAVAILABLE");
  }
  return new FarmOsStableChangesPersistenceError(
    matched ?? "TRANSACTION_FAILED",
  );
}

export class FarmOsStableChangesPostgresRepository
implements FarmOsStableChangesPersistenceRepository {
  private readonly pool: FarmOsStableChangesPool;
  private readonly ownsPool: boolean;

  constructor(input: { pool: FarmOsStableChangesPool } | { poolConfig: PoolConfig }) {
    if ("pool" in input) {
      this.pool = input.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        ...input.poolConfig,
        application_name: "farmos-core-stable-changes-consumer",
        max: Math.min(input.poolConfig.max ?? 2, 4),
      }) as unknown as FarmOsStableChangesPool;
      this.ownsPool = true;
    }
  }

  private async begin(client: FarmOsStableChangesPoolClient): Promise<void> {
    await client.query("begin isolation level read committed read write");
    await client.query("set local statement_timeout = '10000ms'");
    await client.query("set local lock_timeout = '5000ms'");
    await client.query("set local role farmos_core_stable_changes_runtime");
  }

  private async rollback(client: FarmOsStableChangesPoolClient): Promise<void> {
    try {
      await client.query("rollback");
    } catch {
      // Fail closed. Connection details and raw database errors stay redacted.
    }
  }

  async loadCheckpoint(
    scope: FarmOsStableChangesScope,
  ): Promise<FarmOsStableChangesCheckpoint> {
    const parsedScope = parseFarmOsStableChangesScope(scope);
    if (parsedScope === null) {
      throw new FarmOsStableChangesPersistenceError("INGRESS_CONTRACT_INVALID");
    }
    const scopeId = createFarmOsStableChangesScopeId(parsedScope);
    const client = await this.pool.connect().catch(() => {
      throw new FarmOsStableChangesPersistenceError("PERSISTENCE_UNAVAILABLE");
    });
    try {
      await this.begin(client);
      const result = await client.query<{ result: unknown }>(
        "select ai.load_stable_changes_checkpoint($1::text) as result",
        [scopeId],
      );
      const checkpoint = parseCheckpoint(result.rows[0]?.result, scopeId);
      if (checkpoint === null) {
        throw new FarmOsStableChangesPersistenceError("TRANSACTION_FAILED");
      }
      await client.query("commit");
      return checkpoint;
    } catch (error) {
      await this.rollback(client);
      if (error instanceof FarmOsStableChangesPersistenceError) throw error;
      throw mappedError(error);
    } finally {
      client.release();
    }
  }

  private async executeCommit(
    client: FarmOsStableChangesPoolClient,
    input: FarmOsStableChangesCommitPageInput,
    scopeId: string,
  ): Promise<FarmOsStableChangesCommitPageResult> {
    const result = await client.query<{ result: unknown }>(
      `select ai.commit_stable_changes_page(
        $1::text,$2::bigint,$3::text,$4::jsonb,$5::timestamptz
      ) as result`,
      [
        scopeId,
        input.expectedGeneration,
        input.requestCursor,
        JSON.stringify(input.validatedPage),
        input.observedAt,
      ],
    );
    const payload = result.rows[0]?.result;
    if (!record(payload) ||
      (payload.result !== "committed" && payload.result !== "already_committed")) {
      throw new FarmOsStableChangesPersistenceError("TRANSACTION_FAILED");
    }
    const checkpoint = parseCheckpoint(payload.checkpoint, scopeId);
    if (checkpoint === null) {
      throw new FarmOsStableChangesPersistenceError("TRANSACTION_FAILED");
    }
    return { result: payload.result, checkpoint };
  }

  async commitPage(
    input: FarmOsStableChangesCommitPageInput,
  ): Promise<FarmOsStableChangesCommitPageResult> {
    const scope = parseFarmOsStableChangesScope(input.scope);
    const parsedPage = parseFarmOsStableChangesPage(input.validatedPage);
    if (scope === null || !parsedPage.valid ||
      parsedPage.value.changes.length > scope.page_size ||
      !/^\d+$/u.test(input.expectedGeneration) ||
      farmOsStableChangesTimestampMicros(input.observedAt) === null) {
      throw new FarmOsStableChangesPersistenceError("INGRESS_CONTRACT_INVALID");
    }
    const scopeId = createFarmOsStableChangesScopeId(scope);
    const client = await this.pool.connect().catch(() => {
      throw new FarmOsStableChangesPersistenceError("PERSISTENCE_UNAVAILABLE");
    });
    let commitStarted = false;
    try {
      await this.begin(client);
      const result = await this.executeCommit(client, input, scopeId);
      commitStarted = true;
      await client.query("commit");
      return result;
    } catch (error) {
      await this.rollback(client);
      if (commitStarted) {
        return this.reconcileUnknownCommit(input, scopeId);
      }
      if (error instanceof FarmOsStableChangesPersistenceError) throw error;
      throw mappedError(error);
    } finally {
      client.release();
    }
  }

  private async reconcileUnknownCommit(
    input: FarmOsStableChangesCommitPageInput,
    scopeId: string,
  ): Promise<FarmOsStableChangesCommitPageResult> {
    const client = await this.pool.connect().catch(() => {
      throw new FarmOsStableChangesPersistenceError("COMMIT_OUTCOME_UNKNOWN");
    });
    try {
      await this.begin(client);
      const result = await this.executeCommit(client, input, scopeId);
      if (result.result !== "already_committed") {
        await this.rollback(client);
        throw new FarmOsStableChangesPersistenceError("COMMIT_OUTCOME_UNKNOWN");
      }
      await client.query("commit");
      return result;
    } catch (error) {
      await this.rollback(client);
      if (error instanceof FarmOsStableChangesPersistenceError &&
        error.code === "CHECKPOINT_CONFLICT") {
        throw error;
      }
      throw new FarmOsStableChangesPersistenceError("COMMIT_OUTCOME_UNKNOWN");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.ownsPool) await this.pool.end();
  }
}
