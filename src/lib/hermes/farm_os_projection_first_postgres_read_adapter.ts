import type { PoolClient } from "pg";

import {
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
} from "./farm_os_operational_memory_contract";
import type {
  FarmOsDailyProjectionContent,
  FarmOsSnapshotStateEvent,
  FarmOsSourceSnapshot,
} from "./farm_os_operational_memory_compiler";
import type {
  FarmOsDailyProjection,
  FarmOsProjectionLineage,
  FarmOsProjectionStateEvent,
} from "./farm_os_operational_memory_persistence";
import {
  FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT,
  isFarmOsProjectionFirstCalendarDate,
} from "./farm_os_projection_first_contract";
import type {
  FarmOsProjectionFirstAuthorizedScope,
  FarmOsProjectionFirstLineageSource,
  FarmOsProjectionFirstReadPort,
} from "./farm_os_projection_first_runtime";
import type {
  FarmOsProjectionFirstScopedBundle,
} from "./farm_os_projection_first_selector";
import {
  resolveFarmOsProjectionFirstActiveProjection,
} from "./farm_os_projection_first_selector";
import type {
  FarmOsProjectionFirstInstallationBinding,
} from "./farm_os_projection_first_installation_binding";

export const FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR =
  "PROJECTION_FIRST_SCOPED_READ_UNAVAILABLE" as const;
export const FARM_OS_PROJECTION_FIRST_SCOPED_READ_EVENTS = [
  "FARMOS_PROJECTION_FIRST_SCOPED_READ_STARTED",
  "FARMOS_PROJECTION_FIRST_SCOPED_READ_COMPLETED",
  "FARMOS_PROJECTION_FIRST_SCOPED_READ_FAILED",
] as const;
export type FarmOsProjectionFirstScopedReadEvent =
  typeof FARM_OS_PROJECTION_FIRST_SCOPED_READ_EVENTS[number];

export const FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL = Object.freeze({
  begin: "begin isolation level repeatable read read only",
  projections: `
select projection_id, projection_type, projection_version,
  business_date::text as business_date, compiler_id, compiler_version,
  content_hash, projection_content, generated_at, supersedes_projection_id
from ai.operational_memory_daily_projections
where business_date = $1::date
order by projection_version
limit 51
`,
  projection_events: `
select event_id, projection_id, status, event_sequence as sequence, occurred_at
from ai.operational_memory_projection_state_events
where projection_id = any($1::text[])
order by event_sequence
`,
  lineage: `
select projection_id, snapshot_id, source_record_id, source_content_hash,
  relation
from ai.operational_memory_projection_lineage
where projection_id = $1
order by snapshot_id
limit 51
`,
  snapshots: `
select snapshot_id, contract_version, source_system, source_record_id,
  source_record_version, source_content_hash, operation,
  business_date::text as business_date, recorded_at, source_updated_at,
  deleted_at, field_reference, crop_cycle_reference, work_type_reference,
  safe_payload, observed_at, ingestion_sequence, initial_state,
  supersedes_snapshot_id, rejection_code
from ai.operational_memory_source_snapshots
where business_date = $1::date
  and snapshot_id = any($2::text[])
order by ingestion_sequence
limit 51
`,
  snapshot_events: `
select event_id, snapshot_id, state, event_sequence as sequence, occurred_at
from ai.operational_memory_snapshot_state_events
where snapshot_id = any($1::text[])
order by event_sequence
`,
});

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

export type FarmOsProjectionFirstPostgresPool = {
  connect(): Promise<PoolClient>;
  end?(): Promise<void>;
};

function iso(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
  }
  return date.toISOString();
}

function positiveInteger(value: string | number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
  }
  return parsed;
}

function projections(rows: ProjectionRow[]): FarmOsDailyProjection[] {
  return rows.map(({ projection_content, ...row }) => ({
    ...row,
    projection_version: Number(row.projection_version),
    compiler_version: Number(row.compiler_version) as 1,
    content: structuredClone(projection_content),
    generated_at: iso(row.generated_at),
  }));
}

function projectionEvents(
  rows: ProjectionEventRow[],
): FarmOsProjectionStateEvent[] {
  return rows.map((row) => ({
    ...row,
    sequence: positiveInteger(row.sequence),
    occurred_at: iso(row.occurred_at),
  }));
}

function snapshots(rows: SnapshotRow[]): FarmOsSourceSnapshot[] {
  return rows.map((row) => ({
    ...row,
    source_record_version: row.source_record_version === null
      ? null
      : Number(row.source_record_version),
    recorded_at: row.recorded_at === null ? null : iso(row.recorded_at),
    source_updated_at: iso(row.source_updated_at),
    deleted_at: row.deleted_at === null ? null : iso(row.deleted_at),
    observed_at: iso(row.observed_at),
    ingestion_sequence: positiveInteger(row.ingestion_sequence),
  }));
}

function snapshotEvents(
  rows: SnapshotEventRow[],
): FarmOsSnapshotStateEvent[] {
  return rows.map((row) => ({
    ...row,
    sequence: positiveInteger(row.sequence),
    occurred_at: iso(row.occurred_at),
  }));
}

function identitySet(values: string[]): Set<string> {
  const result = new Set(values);
  if (result.size !== values.length) {
    throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
  }
  return result;
}

export class FarmOsProjectionFirstPostgresReadAdapter
  implements FarmOsProjectionFirstReadPort {
  private readonly allowedLineageSnapshots = new Map<string, Set<string>>();

  constructor(private readonly dependencies: {
    installation_binding: FarmOsProjectionFirstInstallationBinding;
    postgres_pool: FarmOsProjectionFirstPostgresPool;
    owns_pool?: boolean;
    onEvent?: (event: FarmOsProjectionFirstScopedReadEvent) => void;
  }) {}

  private emit(event: FarmOsProjectionFirstScopedReadEvent): void {
    try {
      this.dependencies.onEvent?.(event);
    } catch {
      // Fixed observability cannot change read-only behavior.
    }
  }

  private scopeKey(
    scope: FarmOsProjectionFirstAuthorizedScope,
    businessDate: string,
  ): string {
    return `${scope.installation_id}:${scope.farm_scope}:${businessDate}`;
  }

  private verifyScope(
    scope: FarmOsProjectionFirstAuthorizedScope,
    businessDate: string,
  ): void {
    if (
      scope.installation_id !==
        this.dependencies.installation_binding.installation_id ||
      scope.farm_scope !== this.dependencies.installation_binding.farm_scope ||
      !isFarmOsProjectionFirstCalendarDate(businessDate)
    ) {
      throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
    }
  }

  private async readOnly<T>(
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    this.emit("FARMOS_PROJECTION_FIRST_SCOPED_READ_STARTED");
    const client = await this.dependencies.postgres_pool.connect();
    let transactionStarted = false;
    try {
      await client.query(FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.begin);
      transactionStarted = true;
      const result = await operation(client);
      await client.query("commit");
      transactionStarted = false;
      this.emit("FARMOS_PROJECTION_FIRST_SCOPED_READ_COMPLETED");
      return result;
    } catch {
      if (transactionStarted) {
        try {
          await client.query("rollback");
        } catch {
          // The read failed closed; never expose the connection error.
        }
      }
      this.emit("FARMOS_PROJECTION_FIRST_SCOPED_READ_FAILED");
      throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
    } finally {
      client.release();
    }
  }

  async readProjectionBundle(input: {
    authorized_scope: FarmOsProjectionFirstAuthorizedScope;
    business_date: string;
  }): Promise<FarmOsProjectionFirstScopedBundle> {
    this.verifyScope(input.authorized_scope, input.business_date);
    return this.readOnly(async (client) => {
      const projectionResult = await client.query<ProjectionRow>(
        FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.projections,
        [input.business_date],
      );
      if (
        projectionResult.rows.length >
          FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT
      ) {
        throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
      }
      const selectedProjections = projections(projectionResult.rows);
      const projectionIds = identitySet(
        selectedProjections.map((projection) => projection.projection_id),
      );
      const projectionEventResult = projectionIds.size === 0
        ? { rows: [] as ProjectionEventRow[] }
        : await client.query<ProjectionEventRow>(
          FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.projection_events,
          [[...projectionIds]],
        );
      const selectedProjectionEvents = projectionEvents(
        projectionEventResult.rows,
      );
      const activeResolution = resolveFarmOsProjectionFirstActiveProjection({
        business_date: input.business_date,
        projections: selectedProjections,
        projection_state_events: selectedProjectionEvents,
      });

      let selectedLineage: FarmOsProjectionLineage[] = [];
      let selectedSnapshots: FarmOsSourceSnapshot[] = [];
      let selectedSnapshotEvents: FarmOsSnapshotStateEvent[] = [];
      if (activeResolution.result === "selected") {
        const lineageResult = await client.query<FarmOsProjectionLineage>(
          FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.lineage,
          [activeResolution.projection_id],
        );
        if (
          lineageResult.rows.length >
            FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT
        ) {
          throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
        }
        selectedLineage = lineageResult.rows.map((row) =>
          structuredClone(row)
        );
        const snapshotIds = identitySet(
          selectedLineage.map((entry) => entry.snapshot_id),
        );
        if (snapshotIds.size > 0) {
          const snapshotResult = await client.query<SnapshotRow>(
            FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.snapshots,
            [input.business_date, [...snapshotIds]],
          );
          if (
            snapshotResult.rows.length !== snapshotIds.size ||
            snapshotResult.rows.length >
              FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT
          ) {
            throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
          }
          selectedSnapshots = snapshots(snapshotResult.rows);
          if (
            selectedSnapshots.some((snapshot) =>
              !snapshotIds.has(snapshot.snapshot_id) ||
              snapshot.business_date !== input.business_date
            )
          ) {
            throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
          }
          const snapshotEventResult = await client.query<SnapshotEventRow>(
            FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.snapshot_events,
            [[...snapshotIds]],
          );
          selectedSnapshotEvents = snapshotEvents(snapshotEventResult.rows);
        }
        this.allowedLineageSnapshots.set(
          this.scopeKey(input.authorized_scope, input.business_date),
          snapshotIds,
        );
      } else {
        this.allowedLineageSnapshots.delete(
          this.scopeKey(input.authorized_scope, input.business_date),
        );
      }

      return {
        farm_scope: input.authorized_scope.farm_scope,
        business_date: input.business_date,
        full_history_scan_performed: false,
        projections: selectedProjections,
        projection_state_events: selectedProjectionEvents,
        lineage: selectedLineage,
        snapshots: selectedSnapshots,
        snapshot_state_events: selectedSnapshotEvents,
      };
    });
  }

  async readLineageSources(input: {
    authorized_scope: FarmOsProjectionFirstAuthorizedScope;
    business_date: string;
    snapshot_ids: string[];
    limit: number;
  }): Promise<FarmOsProjectionFirstLineageSource[]> {
    this.verifyScope(input.authorized_scope, input.business_date);
    if (
      !Number.isSafeInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT ||
      input.snapshot_ids.length > input.limit
    ) {
      throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
    }
    const requestedIds = identitySet(input.snapshot_ids);
    const allowed = this.allowedLineageSnapshots.get(
      this.scopeKey(input.authorized_scope, input.business_date),
    );
    if (
      allowed === undefined ||
      [...requestedIds].some((snapshotId) => !allowed.has(snapshotId))
    ) {
      throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
    }
    if (requestedIds.size === 0) return [];

    return this.readOnly(async (client) => {
      const result = await client.query<SnapshotRow>(
        FARM_OS_PROJECTION_FIRST_SCOPED_READ_SQL.snapshots,
        [input.business_date, [...requestedIds]],
      );
      if (
        result.rows.length !== requestedIds.size ||
        result.rows.length > input.limit
      ) {
        throw new Error(FARM_OS_PROJECTION_FIRST_SCOPED_READ_ERROR);
      }
      return snapshots(result.rows).map((snapshot) => ({
        snapshot_id: snapshot.snapshot_id,
        source_record_id: snapshot.source_record_id,
        source_content_hash: snapshot.source_content_hash,
        business_date: snapshot.business_date,
        field_reference: snapshot.field_reference,
        crop_cycle_reference: snapshot.crop_cycle_reference,
        work_type_reference: snapshot.work_type_reference,
      }));
    });
  }

  async close(): Promise<void> {
    if (this.dependencies.owns_pool === true) {
      await this.dependencies.postgres_pool.end?.();
    }
  }
}

export const FARM_OS_PROJECTION_FIRST_SUPPORTED_COMPILER = Object.freeze({
  compiler_id: FARM_OS_OPERATIONAL_MEMORY_COMPILER_ID,
  compiler_version: FARM_OS_OPERATIONAL_MEMORY_COMPILER_VERSION,
});
