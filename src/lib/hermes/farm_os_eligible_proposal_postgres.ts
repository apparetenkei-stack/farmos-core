import {
  isCanonicalFarmOsIso,
  isFarmOsDigest,
  isFarmOsIdentifier,
  isFarmOsRecord,
} from "./farm_os_approved_proposal_contract";
import {
  FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY,
  FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION,
  FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION,
  FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION,
  computeProposalExecutionSnapshotHashV1,
  parseStoredProposalCreationRecord,
  persistCoreProposalCandidate,
  transitionProposalExecutionState,
  type PersistCoreProposalCandidateRequest,
  type ProposalCreationAuthenticationPort,
  type ProposalCreationResult,
  type ProposalCreationRecord,
  type ProposalCreationTransactionPort,
  type ProposalExecutionProjectionStatus,
} from "./farm_os_eligible_proposal_persistence";
import {
  ProductionProposalPersistenceWorkloadAuthentication,
  ProductionProposalVerificationWorkloadAuthentication,
} from "./farm_os_production_workload_auth";
import {
  FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
  type ProposalExecutionRepositoryResult,
  type ProposalExecutionState,
  type ProposalExecutionVerificationRepositoryPort,
  type ProposalVerificationAuthenticationPort,
  type ProposalVerificationClockPort,
} from "./farm_os_proposal_execution_verification_contract";

export type FarmOsPgQueryResult = { rows: unknown[]; rowCount?: number | null };
export interface FarmOsPgQueryPort {
  query(text: string, values?: readonly unknown[]): Promise<FarmOsPgQueryResult>;
}
export interface FarmOsPgTransactionClient extends FarmOsPgQueryPort {
  release(): void;
}
export interface FarmOsPgPoolPort extends FarmOsPgQueryPort {
  connect(): Promise<FarmOsPgTransactionClient>;
}

const KNOWN_STATUSES: readonly ProposalExecutionProjectionStatus[] = [
  "draft",
  "review_ready",
  "execution_eligible",
  "rejected",
  "expired",
  "superseded",
  "withdrawn",
];
const mapStatus = (
  status: ProposalExecutionProjectionStatus,
): ProposalExecutionState["proposal_status"] =>
  status === "execution_eligible"
    ? "executable"
    : status === "review_ready"
      ? "draft"
    : status === "withdrawn"
      ? "rejected"
      : status;
const pgIso = (value: unknown): string | null =>
  value instanceof Date
    ? value.toISOString()
    : isCanonicalFarmOsIso(value)
      ? value
      : null;
const pgSafeInteger = (value: unknown): number | null => {
  const normalized =
    typeof value === "string" && /^[1-9][0-9]*$/u.test(value)
      ? Number(value)
      : value;
  return Number.isSafeInteger(normalized) && (normalized as number) >= 1
    ? (normalized as number)
    : null;
};

function parseProjectionRow(value: unknown): ProposalExecutionState | null {
  if (!isFarmOsRecord(value)) return null;
  const status = String(value.execution_status) as ProposalExecutionProjectionStatus;
  const scope = value.scope_constraints;
  if (
    !isFarmOsIdentifier(value.proposal_id) ||
    !pgSafeInteger(value.proposal_version) ||
    !pgSafeInteger(value.execution_state_version) ||
    !KNOWN_STATUSES.includes(status) ||
    !["confirmation_task", "work_plan_draft", "assignment_candidate"].includes(String(value.proposal_type)) ||
    value.schema_version !== FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION ||
    value.snapshot_schema_version !== FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION ||
    value.policy_version !== FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION ||
    value.contract_version !== FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION ||
    !isFarmOsDigest(value.proposal_snapshot_hash) ||
    typeof value.operation_type !== "string" ||
    typeof value.target_system !== "string" ||
    !isFarmOsIdentifier(value.target_reference) ||
    typeof value.required_capability !== "string" ||
    !isFarmOsRecord(scope) ||
    scope.scope_type !== "exact_target" ||
    !isFarmOsIdentifier(scope.scope_id) ||
    !isFarmOsIdentifier(scope.target_reference) ||
    !isFarmOsIdentifier(value.correlation_id) ||
    !isFarmOsIdentifier(value.causation_id) ||
    !pgIso(value.expires_at)
  ) return null;
  const expiresAt = pgIso(value.expires_at)!;
  const proposalType = value.proposal_type as keyof typeof FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY;
  const proposalVersion = pgSafeInteger(value.proposal_version)!;
  const stateVersion = pgSafeInteger(value.execution_state_version)!;
  const registry = FARM_OS_ELIGIBLE_PROPOSAL_REGISTRY[proposalType];
  if (
    value.operation_type !== registry.operation_type ||
    value.target_system !== registry.target_system ||
    value.required_capability !== registry.required_capability
  ) return null;
  const expectedHash = computeProposalExecutionSnapshotHashV1({
    snapshot_schema_version: FARM_OS_PROPOSAL_EXECUTION_SNAPSHOT_VERSION,
    contract_version: FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
    proposal_id: value.proposal_id,
    proposal_type: proposalType,
    proposal_version: proposalVersion,
    operation_type: registry.operation_type,
    target_system: registry.target_system,
    target_reference: value.target_reference,
    required_capability: registry.required_capability,
    scope_constraints: {
      scope_type: "exact_target",
      scope_id: scope.scope_id as string,
      target_reference: scope.target_reference as string,
    },
    correlation_id: value.correlation_id,
    causation_id: value.causation_id,
    expires_at: expiresAt,
    execution_status: status,
  });
  if (expectedHash !== value.proposal_snapshot_hash) return null;
  return {
    proposal_id: value.proposal_id,
    proposal_version: proposalVersion,
    proposal_snapshot_hash: value.proposal_snapshot_hash,
    proposal_status: mapStatus(status),
    operation_type: value.operation_type,
    target_system: value.target_system,
    target_reference: value.target_reference,
    required_capability: value.required_capability,
    scope_constraints: {
      scope_type: "exact_target",
      scope_id: scope.scope_id,
      target_reference: scope.target_reference,
    },
    correlation_id: value.correlation_id,
    causation_id: value.causation_id,
    proposal_expires_at: expiresAt,
    repository_state_version: stateVersion,
  };
}

export class ProductionProposalExecutionRepositoryAdapter
  implements ProposalExecutionVerificationRepositoryPort
{
  constructor(
    private readonly database: FarmOsPgQueryPort | null,
    private readonly projectionEnabled: boolean,
  ) {}

  async getCurrentProposalExecutionState(
    proposalId: string,
  ): Promise<ProposalExecutionRepositoryResult> {
    if (!this.projectionEnabled || !this.database) {
      return { kind: "unavailable", reason: "projection_authority_disabled" };
    }
    try {
      const result = await this.database.query(
        `select proposal_id,proposal_type,schema_version,proposal_version,
          execution_state_version,execution_status,proposal_snapshot_hash,
          snapshot_schema_version,operation_type,target_system,target_reference,
          required_capability,scope_constraints,correlation_id,causation_id,expires_at,
          policy_version,contract_version
        from ai.proposal_execution_state where proposal_id=$1 limit 1`,
        [proposalId],
      );
      if (result.rows.length === 0) {
        const legacy = await this.database.query(
          "select core_proposal_id from ai.proposal_inbox where core_proposal_id=$1 limit 1",
          [proposalId],
        );
        return legacy.rows.length === 0
          ? { kind: "not_found" }
          : { kind: "unknown", reason: "legacy_not_projected" };
      }
      if (result.rows.length !== 1) return { kind: "unknown", reason: "projection_not_unique" };
      const state = parseProjectionRow(result.rows[0]);
      return state
        ? { kind: "found", state }
        : { kind: "unknown", reason: "invalid_projection_row" };
    } catch (error) {
      const reason =
        error instanceof Error && /timeout/iu.test(error.message)
          ? "repository_timeout"
          : "repository_unavailable";
      return { kind: "unavailable", reason };
    }
  }
}

export class ProductionProposalCreationTransaction
  implements ProposalCreationTransactionPort
{
  constructor(private readonly pool: FarmOsPgPoolPort | null) {}

  async persistAtomically(input: ProposalCreationRecord) {
    if (!this.pool) return { kind: "unavailable" as const };
    let client: FarmOsPgTransactionClient | null = null;
    let commitAttempted = false;
    try {
      client = await this.pool.connect();
      await client.query("begin");
      await client.query("set local role farmos_core_proposal_transaction");
      const identity = await client.query("select current_user as current_user");
      if (
        identity.rows.length !== 1 ||
        !isFarmOsRecord(identity.rows[0]) ||
        identity.rows[0].current_user !== "farmos_core_proposal_transaction"
      ) {
        await client.query("rollback");
        return { kind: "unavailable" as const };
      }
      const reserved = await client.query(
        `insert into ai.proposal_creation_idempotency
          (idempotency_key_hash,request_fingerprint,status,reserved_at)
         values ($1,$2,'reserved',$3)
         on conflict (idempotency_key_hash) do nothing
         returning idempotency_key_hash`,
        [input.idempotency_key_hash, input.request_fingerprint, input.projection.proposal_created_at],
      );
      if (reserved.rows.length === 0) {
        const existing = await client.query(
          `select request_fingerprint,status,result_json
             from ai.proposal_creation_idempotency
            where idempotency_key_hash=$1 for update`,
          [input.idempotency_key_hash],
        );
        await client.query("rollback");
        const row = existing.rows[0];
        if (!isFarmOsRecord(row) || row.request_fingerprint !== input.request_fingerprint) {
          return { kind: "conflict" as const };
        }
        const replay = parseStoredProposalCreationRecord(row.result_json);
        if (
          row.status === "succeeded" &&
          replay &&
          replay.request_fingerprint === input.request_fingerprint &&
          replay.idempotency_key_hash === input.idempotency_key_hash &&
          replay.payload_hash === input.payload_hash
        ) {
          return { kind: "replay" as const, record: replay };
        }
        return { kind: "pending" as const };
      }
      await client.query(
        `insert into ai.proposal_inbox
          (id,proposal_type,title,body,payload_json,source_refs_json,model_name,agent_name,
           confidence,reason,risk_level,status,created_at,updated_at,core_proposal_id,
           proposal_schema_version,source_system,source_reference,source_version,candidate_id,
           parent_proposal_id,payload_hash,correlation_id,causation_id,created_by_kind,
           created_by_reference,expires_at,creation_idempotency_key_hash,request_fingerprint)
         values
          ($1,$2,$3,$4,$5,$6,$7,$8,0.500,$9,'low','pending',$10,$10,
           $11,$12,'farmos_core',$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)`,
        [
          input.inbox_record_id,
          input.proposal_type,
          `${input.proposal_type} proposal`,
          "Core typed proposal candidate",
          input.payload,
          { source_candidate_id: input.payload.source_candidate_id },
          "deterministic",
          "farmos_core_proposal_persistence",
          "Human review required; execution eligibility is separate.",
          input.projection.proposal_created_at,
          input.proposal_id,
          input.payload.schema_version,
          input.source_reference,
          input.source_version,
          input.payload.source_candidate_id,
          input.parent_proposal_id,
          input.payload_hash,
          input.projection.correlation_id,
          input.projection.causation_id,
          input.created_by_kind,
          input.created_by_reference,
          input.projection.proposal_expires_at,
          input.idempotency_key_hash,
          input.request_fingerprint,
        ],
      );
      await client.query(
        `insert into ai.proposal_execution_state
          (inbox_record_id,proposal_id,proposal_type,schema_version,proposal_version,
           execution_state_version,execution_status,proposal_snapshot_hash,
           snapshot_schema_version,operation_type,target_system,target_reference,
           required_capability,scope_constraints,correlation_id,causation_id,
           proposal_created_at,proposal_updated_at,expires_at,state_changed_at,
           state_changed_reason,policy_version,contract_version)
         values ($1,$2,$3,$4,1,1,'draft',$5,'farmos.proposal-execution-snapshot.v1',
           $6,$7,$8,$9,$10,$11,$12,$13,$13,$14,$13,'proposal_created',$15,$16)`,
        [
          input.inbox_record_id,
          input.proposal_id,
          input.proposal_type,
          FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION,
          input.projection.proposal_snapshot_hash,
          input.projection.operation_type,
          input.projection.target_system,
          input.projection.target_reference,
          input.projection.required_capability,
          input.projection.scope_constraints,
          input.projection.correlation_id,
          input.projection.causation_id,
          input.projection.proposal_created_at,
          input.projection.proposal_expires_at,
          FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION,
          FARM_OS_PROPOSAL_EXECUTION_VERIFICATION_CONTRACT_VERSION,
        ],
      );
      await client.query(
        `insert into audit.proposal_creation_events
          (event_id,proposal_id,proposal_type,source_reference,payload_hash,
           created_by_kind,created_by_reference,correlation_id,causation_id,created_at)
         values (gen_random_uuid(),$1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [
          input.proposal_id,
          input.proposal_type,
          input.source_reference,
          input.payload_hash,
          input.created_by_kind,
          input.created_by_reference,
          input.projection.correlation_id,
          input.projection.causation_id,
          input.projection.proposal_created_at,
        ],
      );
      await client.query(
        `insert into audit.proposal_execution_state_events
          (event_id,proposal_id,new_proposal_version,new_execution_state_version,
           new_status,new_snapshot_hash,change_reason,correlation_id,causation_id,changed_at)
         values (gen_random_uuid(),$1,1,1,'draft',$2,'proposal_created',$3,$4,$5)`,
        [
          input.proposal_id,
          input.projection.proposal_snapshot_hash,
          input.projection.correlation_id,
          input.projection.causation_id,
          input.projection.proposal_created_at,
        ],
      );
      const completed = await client.query(
        `update ai.proposal_creation_idempotency
            set status='succeeded',proposal_id=$2,result_json=$3,completed_at=$4
          where idempotency_key_hash=$1 and status='reserved'
          returning idempotency_key_hash`,
        [
          input.idempotency_key_hash,
          input.proposal_id,
          input,
          input.projection.proposal_created_at,
        ],
      );
      if (completed.rows.length !== 1) {
        await client.query("rollback");
        return { kind: "unavailable" as const };
      }
      commitAttempted = true;
      await client.query("commit");
      return { kind: "created" as const, record: input };
    } catch (error) {
      if (commitAttempted) return { kind: "outcome_unknown" as const };
      if (client) {
        try {
          await client.query("rollback");
        } catch {
          return { kind: "outcome_unknown" as const };
        }
      }
      if (
        isFarmOsRecord(error) &&
        error.code === "23505" &&
        (error.constraint === "proposal_inbox_candidate_id_unique" ||
          error.constraint === "proposal_inbox_creation_idempotency_unique")
      ) return { kind: "conflict" as const };
      return { kind: "unavailable" as const };
    } finally {
      client?.release();
    }
  }
}

export class ProductionProposalProjectionTransition {
  constructor(
    private readonly pool: FarmOsPgPoolPort | null,
    private readonly authority: ProposalEligibilityAuthorityPort | null,
  ) {}

  async transition(input: {
    proposalId: string;
    expectedExecutionStateVersion: number;
    nextStatus: ProposalExecutionProjectionStatus;
    now: string;
    reason: string;
    supersededByProposalId?: string;
  }): Promise<
    | { result: "updated"; repositoryStateVersion: number }
    | { result: "rejected"; rejectionCode: string }
    | { result: "unavailable" | "outcome_unknown" }
  > {
    if (!this.pool || !this.authority) return { result: "unavailable" };
    const authority = await this.authority
      .authorize({
        proposalId: input.proposalId,
        nextStatus: input.nextStatus,
      })
      .catch(() => ({ kind: "unavailable" as const }));
    if (authority.kind !== "authorized") {
      return authority.kind === "rejected"
        ? { result: "rejected", rejectionCode: "ELIGIBILITY_AUTHORITY_REJECTED" }
        : { result: "unavailable" };
    }
    let client: FarmOsPgTransactionClient | null = null;
    let commitAttempted = false;
    try {
      client = await this.pool.connect();
      await client.query("begin");
      await client.query("set local role farmos_core_proposal_transaction");
      const selected = await client.query(
        `select proposal_id,proposal_type,schema_version,proposal_version,execution_state_version,
          execution_status,proposal_snapshot_hash,snapshot_schema_version,operation_type,target_system,
          target_reference,required_capability,scope_constraints,correlation_id,
          causation_id,expires_at,proposal_created_at,proposal_updated_at,
          state_changed_at,state_changed_reason,policy_version,contract_version
        from ai.proposal_execution_state where proposal_id=$1 for update`,
        [input.proposalId],
      );
      if (selected.rows.length !== 1 || !isFarmOsRecord(selected.rows[0])) {
        await client.query("rollback");
        return { result: "rejected", rejectionCode: "PROJECTION_NOT_FOUND" };
      }
      const row = selected.rows[0];
      const parsed = parseProjectionRow(row);
      if (
        !parsed ||
        !["confirmation_task", "work_plan_draft", "assignment_candidate"].includes(String(row.proposal_type)) ||
        !pgIso(row.proposal_created_at) ||
        !pgIso(row.proposal_updated_at) ||
        !pgIso(row.state_changed_at) ||
        typeof row.state_changed_reason !== "string" ||
        row.policy_version !== FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION
      ) {
        await client.query("rollback");
        return { result: "unavailable" };
      }
      const current: ProposalCreationRecord["projection"] = {
        ...parsed,
        schema_version: FARM_OS_PROPOSAL_EXECUTION_STATE_VERSION,
        proposal_type: row.proposal_type as ProposalCreationRecord["proposal_type"],
        execution_state_version: pgSafeInteger(row.execution_state_version)!,
        execution_status: row.execution_status as ProposalExecutionProjectionStatus,
        proposal_created_at: pgIso(row.proposal_created_at)!,
        proposal_updated_at: pgIso(row.proposal_updated_at)!,
        state_changed_at: pgIso(row.state_changed_at)!,
        state_changed_reason: row.state_changed_reason,
        policy_version: FARM_OS_PROPOSAL_EXECUTION_POLICY_VERSION,
      };
      let authoritativeSuccessorType: ProposalCreationRecord["proposal_type"] | undefined;
      if (input.nextStatus === "superseded") {
        if (!input.supersededByProposalId) {
          await client.query("rollback");
          return { result: "rejected", rejectionCode: "SUPERSEDE_INVALID" };
        }
        const successor = await client.query(
          `select proposal_id,proposal_type,execution_status,superseded_by_proposal_id
             from ai.proposal_execution_state where proposal_id=$1 for update`,
          [input.supersededByProposalId],
        );
        const successorRow = successor.rows[0];
        if (
          successor.rows.length !== 1 ||
          !isFarmOsRecord(successorRow) ||
          successorRow.proposal_id === current.proposal_id ||
          successorRow.proposal_type !== current.proposal_type ||
          successorRow.execution_status !== "execution_eligible" ||
          successorRow.superseded_by_proposal_id !== null
        ) {
          await client.query("rollback");
          return { result: "rejected", rejectionCode: "SUPERSEDE_INVALID" };
        }
        authoritativeSuccessorType = successorRow.proposal_type as ProposalCreationRecord["proposal_type"];
      }
      const transitioned = transitionProposalExecutionState({
        current,
        expectedExecutionStateVersion: input.expectedExecutionStateVersion,
        nextStatus: input.nextStatus,
        now: input.now,
        reason: input.reason,
        supersededByProposalId: input.supersededByProposalId,
        successorProposalType: authoritativeSuccessorType,
        successorChain: [],
      });
      if (transitioned.result === "rejected") {
        await client.query("rollback");
        return { result: "rejected", rejectionCode: transitioned.rejection_code };
      }
      const updated = await client.query(
        `update ai.proposal_execution_state
          set execution_state_version=$2,execution_status=$3,proposal_snapshot_hash=$4,
              proposal_updated_at=$5,state_changed_at=$5,state_changed_reason=$6,
              execution_eligible_at=case when $3='execution_eligible' then $5 else execution_eligible_at end,
              superseded_at=case when $3='superseded' then $5 else superseded_at end,
              superseded_by_proposal_id=case when $3='superseded' then $7 else superseded_by_proposal_id end
         where proposal_id=$1 and execution_state_version=$8
         returning execution_state_version`,
        [
          input.proposalId,
          transitioned.state.execution_state_version,
          transitioned.state.execution_status,
          transitioned.state.proposal_snapshot_hash,
          input.now,
          input.reason,
          input.supersededByProposalId ?? null,
          input.expectedExecutionStateVersion,
        ],
      );
      if (updated.rows.length !== 1) {
        await client.query("rollback");
        return { result: "rejected", rejectionCode: "VERSION_CONFLICT" };
      }
      await client.query(
        `insert into audit.proposal_execution_state_events
          (event_id,proposal_id,previous_proposal_version,new_proposal_version,
           previous_execution_state_version,new_execution_state_version,previous_status,
           new_status,previous_snapshot_hash,new_snapshot_hash,change_reason,
           correlation_id,causation_id,changed_at)
         values (gen_random_uuid(),$1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [
          current.proposal_id,
          current.proposal_version,
          current.execution_state_version,
          transitioned.state.execution_state_version,
          current.execution_status,
          transitioned.state.execution_status,
          current.proposal_snapshot_hash,
          transitioned.state.proposal_snapshot_hash,
          input.reason,
          current.correlation_id,
          current.causation_id,
          input.now,
        ],
      );
      commitAttempted = true;
      await client.query("commit");
      return {
        result: "updated",
        repositoryStateVersion: transitioned.state.execution_state_version,
      };
    } catch {
      if (commitAttempted) return { result: "outcome_unknown" };
      if (client) {
        try {
          await client.query("rollback");
        } catch {
          return { result: "outcome_unknown" };
        }
      }
      return { result: "unavailable" };
    } finally {
      client?.release();
    }
  }
}

export interface ProposalEligibilityAuthorityPort {
  authorize(input: {
    proposalId: string;
    nextStatus: ProposalExecutionProjectionStatus;
  }): Promise<
    | { kind: "authorized"; authority_reference: string }
    | { kind: "rejected"; reason: string }
    | { kind: "unavailable"; reason: string }
  >;
}

export type ProductionProposalVerificationComposition = {
  repository: ProposalExecutionVerificationRepositoryPort;
  authentication: ProposalVerificationAuthenticationPort;
  clock: ProposalVerificationClockPort;
  fixture_fallback_used: false;
  workload_auth_production_adapter_complete: boolean;
};
export function createProductionProposalVerificationComposition(input: {
  projectionEnabled: boolean;
  database: FarmOsPgQueryPort | null;
  authentication: ProductionProposalVerificationWorkloadAuthentication | null;
  clock: ProposalVerificationClockPort;
}): ProductionProposalVerificationComposition {
  const unavailableAuthentication: ProposalVerificationAuthenticationPort = {
    async authenticate() {
      return { kind: "unavailable", reason: "production_workload_authentication_unavailable" };
    },
  };
  return {
    repository: new ProductionProposalExecutionRepositoryAdapter(
      input.database,
      input.projectionEnabled,
    ),
    authentication: input.authentication ?? unavailableAuthentication,
    clock: input.clock,
    fixture_fallback_used: false,
    workload_auth_production_adapter_complete:
      input.authentication instanceof ProductionProposalVerificationWorkloadAuthentication,
  };
}

export function createProductionProposalPersistenceComposition(input: {
  pool: FarmOsPgPoolPort | null;
  authentication: ProductionProposalPersistenceWorkloadAuthentication | null;
  eligibleProposalPersistenceEnabled: boolean;
  proposalExecutionProjectionEnabled: boolean;
  clock: { now(): Promise<string> };
}): {
  persist(request: PersistCoreProposalCandidateRequest): Promise<ProposalCreationResult>;
  fixture_fallback_used: false;
  workload_auth_production_adapter_complete: boolean;
} {
  const unavailable: ProposalCreationAuthenticationPort = {
    async authenticate() {
      return { kind: "unavailable" };
    },
  };
  const authentication = input.authentication ?? unavailable;
  const transaction = new ProductionProposalCreationTransaction(input.pool);
  return {
    async persist(request) {
      const now = await input.clock.now().catch(() => "");
      if (!isCanonicalFarmOsIso(now)) {
        return { result: "outcome_unknown", rejection_code: "PERSISTENCE_UNAVAILABLE", replay: false };
      }
      return persistCoreProposalCandidate({
        request,
        flags: {
          eligibleProposalPersistenceEnabled: input.eligibleProposalPersistenceEnabled,
          proposalExecutionProjectionEnabled: input.proposalExecutionProjectionEnabled,
        },
        authentication,
        transaction,
        now,
      });
    },
    fixture_fallback_used: false,
    workload_auth_production_adapter_complete:
      input.authentication instanceof ProductionProposalPersistenceWorkloadAuthentication,
  };
}
