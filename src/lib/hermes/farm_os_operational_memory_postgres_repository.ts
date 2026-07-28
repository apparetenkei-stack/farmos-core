import { Pool, type PoolClient, type PoolConfig } from "pg";

import {
  parseFarmOsStableChangesPage,
  type FarmOsOperationalMemoryFailureCode,
} from "./farm_os_operational_memory_contract";
import type {
  FarmOsDailyProjectionContent,
  FarmOsSnapshotStateEvent,
  FarmOsSourceSnapshot,
} from "./farm_os_operational_memory_compiler";
import {
  FarmOsInMemoryOperationalMemoryRepository,
  ingestFarmOsStableChanges,
  type FarmOsDailyProjection,
  type FarmOsOperationalMemoryIngestionResult,
  type FarmOsOperationalMemoryRejection,
  type FarmOsOperationalMemoryState,
  type FarmOsProjectionLineage,
  type FarmOsProjectionStateEvent,
} from "./farm_os_operational_memory_persistence";

const LOCK_KEY = "farmos_operational_memory_v1";
const BEGIN_SQL = "begin isolation level read committed read write";
const LOCK_SQL = "select pg_advisory_xact_lock(hashtext($1::text))";
const BUNDLE_SQL =
  "select ai.persist_operational_memory_bundle($1::jsonb,$2::jsonb,$3::jsonb,$4::jsonb,$5::jsonb,$6::jsonb) as result";

export const FARM_OS_OPERATIONAL_MEMORY_POSTGRES_RUNTIME_SCOPE = Object.freeze({
  historical_backfill: {
    implemented: false,
    new_stable_changes_supported: true,
    verified_history_excluded: true,
    future_rebuild_from_retained_snapshots: true,
  },
  human_correction: {
    overwrite_prohibited_by_contract: true,
    persistence_store_implemented: false,
    future_overlay_hook: "reserved_not_connected",
  },
});

type PostgresRepositoryPool = {
  connect(): Promise<PoolClient>;
  end(): Promise<void>;
};

type SnapshotRow = Omit<
  FarmOsSourceSnapshot,
  | "business_date"
  | "recorded_at"
  | "source_updated_at"
  | "deleted_at"
  | "observed_at"
  | "ingestion_sequence"
> & {
  business_date: string;
  recorded_at: Date | string | null;
  source_updated_at: Date | string;
  deleted_at: Date | string | null;
  observed_at: Date | string;
  ingestion_sequence: string | number;
};

type SnapshotEventRow = Omit<
  FarmOsSnapshotStateEvent,
  "sequence" | "occurred_at"
> & {
  sequence: string | number;
  occurred_at: Date | string;
};

type ProjectionRow = Omit<
  FarmOsDailyProjection,
  "content" | "generated_at"
> & {
  projection_content: FarmOsDailyProjectionContent;
  generated_at: Date | string;
};

type ProjectionEventRow = Omit<
  FarmOsProjectionStateEvent,
  "sequence" | "occurred_at"
> & {
  sequence: string | number;
  occurred_at: Date | string;
};

type RejectionRow = Omit<FarmOsOperationalMemoryRejection, "observed_at"> & {
  observed_at: Date | string;
};

export type FarmOsOperationalMemoryPostgresIngestionResult =
  FarmOsOperationalMemoryIngestionResult & {
    postgres_persistence: {
      transaction_committed: boolean;
      core_persistence_write_performed: boolean;
      farming_app_write_performed: false;
    };
  };

const READ_SNAPSHOTS_SQL = `
select snapshot_id, contract_version, source_system, source_record_id,
  source_record_version, source_content_hash, operation,
  business_date::text as business_date, recorded_at, source_updated_at,
  deleted_at, field_reference, crop_cycle_reference, work_type_reference,
  safe_payload, observed_at, ingestion_sequence, initial_state,
  supersedes_snapshot_id, rejection_code
from ai.operational_memory_source_snapshots
order by ingestion_sequence
`;
const READ_SNAPSHOT_EVENTS_SQL = `
select event_id, snapshot_id, state, event_sequence as sequence, occurred_at
from ai.operational_memory_snapshot_state_events
order by event_sequence
`;
const READ_PROJECTIONS_SQL = `
select projection_id, projection_type, projection_version,
  business_date::text as business_date, compiler_id, compiler_version,
  content_hash, projection_content, generated_at, supersedes_projection_id
from ai.operational_memory_daily_projections
order by business_date, projection_version
`;
const READ_PROJECTION_EVENTS_SQL = `
select event_id, projection_id, status, event_sequence as sequence, occurred_at
from ai.operational_memory_projection_state_events
order by event_sequence
`;
const READ_LINEAGE_SQL = `
select projection_id, snapshot_id, source_record_id, source_content_hash,
  relation
from ai.operational_memory_projection_lineage
order by projection_id, snapshot_id
`;
const READ_REJECTIONS_SQL = `
select rejection_id, source_record_id, failure_code, observed_at
from ai.operational_memory_ingestion_rejections
order by observed_at, rejection_id
`;

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error("operational_memory_database_timestamp_invalid");
  }
  return date.toISOString();
}

function integer(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error("operational_memory_database_sequence_invalid");
  }
  return parsed;
}

function safeFailure(
  failureCode: FarmOsOperationalMemoryFailureCode,
): FarmOsOperationalMemoryPostgresIngestionResult {
  const result: FarmOsOperationalMemoryIngestionResult = {
    result: "rejected",
    outcomes: [{
      source_record_id: null,
      status: "rejected",
      failure_code: failureCode,
      snapshot_write_count: 0,
      projection_write_count: 0,
      lineage_write_count: 0,
      affected_business_dates: [],
    }],
    safety: {
      business_sot: "farming_app",
      source_snapshot_is_business_sot: false,
      daily_projection_is_business_sot: false,
      farming_app_write_performed: false,
      production_db_operation_performed: false,
      linked_db_operation_performed: false,
      llm_used: false,
      human_correction_overlay_write_performed: false,
    },
  };
  return {
    ...result,
    postgres_persistence: {
      transaction_committed: false,
      core_persistence_write_performed: false,
      farming_app_write_performed: false,
    },
  };
}

function withPersistenceEvidence(
  result: FarmOsOperationalMemoryIngestionResult,
  input: {
    transaction_committed: boolean;
    core_persistence_write_performed: boolean;
  },
): FarmOsOperationalMemoryPostgresIngestionResult {
  return {
    ...result,
    postgres_persistence: {
      ...input,
      farming_app_write_performed: false,
    },
  };
}

async function readState(client: PoolClient): Promise<FarmOsOperationalMemoryState> {
  const snapshotsResult = await client.query<SnapshotRow>(READ_SNAPSHOTS_SQL);
  const snapshotEventsResult = await client.query<SnapshotEventRow>(
    READ_SNAPSHOT_EVENTS_SQL,
  );
  const projectionsResult = await client.query<ProjectionRow>(
    READ_PROJECTIONS_SQL,
  );
  const projectionEventsResult = await client.query<ProjectionEventRow>(
    READ_PROJECTION_EVENTS_SQL,
  );
  const lineageResult = await client.query<FarmOsProjectionLineage>(
    READ_LINEAGE_SQL,
  );
  const rejectionsResult = await client.query<RejectionRow>(
    READ_REJECTIONS_SQL,
  );

  const snapshots: FarmOsSourceSnapshot[] = snapshotsResult.rows.map((row) => ({
    ...row,
    source_record_version: row.source_record_version === null
      ? null
      : Number(row.source_record_version),
    recorded_at: row.recorded_at === null ? null : iso(row.recorded_at),
    source_updated_at: iso(row.source_updated_at),
    deleted_at: row.deleted_at === null ? null : iso(row.deleted_at),
    observed_at: iso(row.observed_at),
    ingestion_sequence: integer(row.ingestion_sequence),
  }));
  const snapshotStateEvents: FarmOsSnapshotStateEvent[] =
    snapshotEventsResult.rows.map((row) => ({
      ...row,
      sequence: integer(row.sequence),
      occurred_at: iso(row.occurred_at),
    }));
  const projections: FarmOsDailyProjection[] = projectionsResult.rows.map(
    ({ projection_content, ...row }) => ({
      ...row,
      projection_version: Number(row.projection_version),
      compiler_version: Number(row.compiler_version) as 1,
      content: structuredClone(projection_content),
      generated_at: iso(row.generated_at),
    }),
  );
  const projectionStateEvents: FarmOsProjectionStateEvent[] =
    projectionEventsResult.rows.map((row) => ({
      ...row,
      sequence: integer(row.sequence),
      occurred_at: iso(row.occurred_at),
    }));
  const rejections: FarmOsOperationalMemoryRejection[] =
    rejectionsResult.rows.map((row) => ({
      ...row,
      observed_at: iso(row.observed_at),
    }));

  return {
    snapshots,
    snapshot_state_events: snapshotStateEvents,
    projections,
    projection_state_events: projectionStateEvents,
    lineage: lineageResult.rows.map((row) => structuredClone(row)),
    rejections,
    next_ingestion_sequence:
      Math.max(0, ...snapshots.map((snapshot) => snapshot.ingestion_sequence)) +
      1,
    next_event_sequence: Math.max(
      0,
      ...snapshotStateEvents.map((event) => event.sequence),
      ...projectionStateEvents.map((event) => event.sequence),
    ) + 1,
  };
}

function delta<T>(before: T[], after: T[]): T[] {
  if (after.length < before.length) {
    throw new Error("operational_memory_database_state_regressed");
  }
  return after.slice(before.length);
}

function identitySet(values: string[]): string[] {
  return values.slice().sort((left, right) =>
    left < right ? -1 : left > right ? 1 : 0
  );
}

function verifyPersisted(
  expected: FarmOsOperationalMemoryState,
  actual: FarmOsOperationalMemoryState,
): void {
  const identities = (state: FarmOsOperationalMemoryState) => ({
    snapshots: identitySet(state.snapshots.map((row) => row.snapshot_id)),
    snapshotEvents: identitySet(
      state.snapshot_state_events.map((row) => row.event_id),
    ),
    projections: identitySet(state.projections.map((row) => row.projection_id)),
    projectionEvents: identitySet(
      state.projection_state_events.map((row) => row.event_id),
    ),
    lineage: identitySet(
      state.lineage.map((row) => `${row.projection_id}:${row.snapshot_id}`),
    ),
    rejections: identitySet(state.rejections.map((row) => row.rejection_id)),
    contentHashes: identitySet(
      state.projections.map((row) => row.content_hash),
    ),
  });
  if (JSON.stringify(identities(expected)) !== JSON.stringify(identities(actual))) {
    throw new Error("operational_memory_database_readback_mismatch");
  }
}

function bundleValues(
  before: FarmOsOperationalMemoryState,
  after: FarmOsOperationalMemoryState,
): string[] {
  return [
    JSON.stringify(delta(before.snapshots, after.snapshots)),
    JSON.stringify(
      delta(before.snapshot_state_events, after.snapshot_state_events),
    ),
    JSON.stringify(delta(before.projections, after.projections).map(
      ({ content, ...projection }) => ({
        ...projection,
        projection_content: content,
      }),
    )),
    JSON.stringify(
      delta(before.projection_state_events, after.projection_state_events),
    ),
    JSON.stringify(delta(before.lineage, after.lineage)),
    JSON.stringify(delta(before.rejections, after.rejections)),
  ];
}

export class FarmOsOperationalMemoryPostgresRepository {
  private readonly pool: PostgresRepositoryPool;
  private readonly ownsPool: boolean;

  constructor(input: { pool: PostgresRepositoryPool } | { poolConfig: PoolConfig }) {
    if ("pool" in input) {
      this.pool = input.pool;
      this.ownsPool = false;
    } else {
      this.pool = new Pool({
        ...input.poolConfig,
        application_name: "farmos-core-operational-memory",
        max: Math.min(input.poolConfig.max ?? 2, 4),
      });
      this.ownsPool = true;
    }
  }

  async ingest(input: {
    page: unknown;
    observed_at: string;
  }): Promise<FarmOsOperationalMemoryPostgresIngestionResult> {
    if (!parseFarmOsStableChangesPage(input.page).valid) {
      return withPersistenceEvidence(
        ingestFarmOsStableChanges({
          ...input,
          repository: new FarmOsInMemoryOperationalMemoryRepository(),
        }),
        {
          transaction_committed: false,
          core_persistence_write_performed: false,
        },
      );
    }
    const client = await this.pool.connect();
    let transactionStarted = false;
    try {
      await client.query(BEGIN_SQL);
      transactionStarted = true;
      await client.query("set local statement_timeout = '10000ms'");
      await client.query("set local lock_timeout = '10000ms'");
      await client.query(LOCK_SQL, [LOCK_KEY]);
      const before = await readState(client);
      const domainRepository =
        new FarmOsInMemoryOperationalMemoryRepository(before);
      const result = ingestFarmOsStableChanges({
        ...input,
        repository: domainRepository,
      });
      const after = domainRepository.snapshot();
      const values = bundleValues(before, after);
      const writePerformed = values.some((value) => value !== "[]");
      if (writePerformed) {
        const persisted = await client.query<{ result: unknown }>(
          BUNDLE_SQL,
          values,
        );
        if (persisted.rows.length !== 1) {
          throw new Error("operational_memory_database_bundle_invalid");
        }
      }
      const readback = await readState(client);
      verifyPersisted(after, readback);
      await client.query("commit");
      transactionStarted = false;
      return withPersistenceEvidence(result, {
        transaction_committed: true,
        core_persistence_write_performed: writePerformed,
      });
    } catch {
      if (transactionStarted) {
        try {
          await client.query("rollback");
        } catch {
          // Fail closed; never expose connection or input details.
        }
      }
      return safeFailure("unexpected_error");
    } finally {
      client.release();
    }
  }

  async readState(): Promise<FarmOsOperationalMemoryState> {
    const client = await this.pool.connect();
    let transactionStarted = false;
    try {
      await client.query("begin isolation level repeatable read read only");
      transactionStarted = true;
      const state = await readState(client);
      await client.query("commit");
      transactionStarted = false;
      return state;
    } catch {
      if (transactionStarted) {
        try {
          await client.query("rollback");
        } catch {
          // Fail closed.
        }
      }
      throw new Error("operational_memory_database_read_failed");
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    if (this.ownsPool) await this.pool.end();
  }
}
