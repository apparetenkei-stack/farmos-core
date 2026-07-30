import type {
  FarmOsSourceSnapshot,
} from "./farm_os_operational_memory_compiler";
import type {
  FarmOsDailyProjection,
} from "./farm_os_operational_memory_persistence";
import {
  FARM_OS_PROJECTION_FIRST_DEFAULT_DRILLDOWN_LIMIT,
  FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT,
  FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
  parseFarmOsProjectionFirstRequest,
  parseFarmOsProjectionFirstResponse,
  type FarmOsProjectionFirstGroundingRef,
  type FarmOsProjectionFirstGuardFailureCode,
  type FarmOsProjectionFirstRequest,
  type FarmOsProjectionFirstResponse,
} from "./farm_os_projection_first_contract";
import {
  guardFarmOsProjectionFirstResponse,
} from "./farm_os_projection_first_response_guard";
import {
  selectFarmOsProjectionFirstProjection,
  type FarmOsProjectionFirstScopedBundle,
} from "./farm_os_projection_first_selector";

export const FARM_OS_PROJECTION_FIRST_EVENTS = [
  "FARMOS_PROJECTION_FIRST_REQUEST_ACCEPTED",
  "FARMOS_PROJECTION_SELECTED",
  "FARMOS_PROJECTION_MISSING",
  "FARMOS_PROJECTION_STALE",
  "FARMOS_PROJECTION_UNAVAILABLE",
  "FARMOS_PROJECTION_DRILLDOWN_STARTED",
  "FARMOS_PROJECTION_DRILLDOWN_COMPLETED",
  "FARMOS_PROJECTION_RESPONSE_GUARD_PASSED",
  "FARMOS_PROJECTION_RESPONSE_GUARD_REJECTED",
  "FARMOS_PROJECTION_DEEP_ANALYSIS_UNAVAILABLE",
  "FARMOS_PROJECTION_RESPONSE_COMPLETED",
] as const;
export type FarmOsProjectionFirstEvent =
  typeof FARM_OS_PROJECTION_FIRST_EVENTS[number];

export type FarmOsProjectionFirstAuthorizationContext = Readonly<{
  installation_id: string;
  bound_farm_scope: string;
  subject_id: string;
  channel: "web" | "slack" | "cli";
  actor_authorized: boolean;
  authorization_evidence_id: string;
  authentication_method: string;
}>;
export type FarmOsProjectionFirstAuthorizedScope = Readonly<{
  installation_id: string;
  farm_scope: string;
  authorization_id: string;
}>;
export type FarmOsProjectionFirstAuthorizationPort = {
  authorize(input: {
    requested_farm_scope: string;
    context: FarmOsProjectionFirstAuthorizationContext;
  }): Promise<FarmOsProjectionFirstAuthorizedScope | null>;
};
export type FarmOsProjectionFirstLineageSource = Pick<
  FarmOsSourceSnapshot,
  | "snapshot_id"
  | "source_record_id"
  | "source_content_hash"
  | "business_date"
  | "field_reference"
  | "crop_cycle_reference"
  | "work_type_reference"
>;
export type FarmOsProjectionFirstReadPort = {
  readProjectionBundle(input: {
    authorized_scope: FarmOsProjectionFirstAuthorizedScope;
    business_date: string;
  }): Promise<FarmOsProjectionFirstScopedBundle>;
  readLineageSources(input: {
    authorized_scope: FarmOsProjectionFirstAuthorizedScope;
    business_date: string;
    snapshot_ids: string[];
    limit: number;
  }): Promise<FarmOsProjectionFirstLineageSource[]>;
};

export const FARM_OS_PROJECTION_FIRST_DENY_ALL_AUTHORIZATION:
  FarmOsProjectionFirstAuthorizationPort = Object.freeze({
    authorize: async () => null,
  });

const AUTHORIZATION_CONTEXT_KEYS = [
  "installation_id",
  "bound_farm_scope",
  "subject_id",
  "channel",
  "actor_authorized",
  "authorization_evidence_id",
  "authentication_method",
] as const;
const AUTHORIZATION_REFERENCE_PATTERN =
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;

export function parseFarmOsProjectionFirstAuthorizationContext(
  value: unknown,
): FarmOsProjectionFirstAuthorizationContext | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (
    Object.keys(record).length !== AUTHORIZATION_CONTEXT_KEYS.length ||
    !AUTHORIZATION_CONTEXT_KEYS.every((key) => Object.hasOwn(record, key)) ||
    typeof record.installation_id !== "string" ||
    !AUTHORIZATION_REFERENCE_PATTERN.test(record.installation_id) ||
    typeof record.bound_farm_scope !== "string" ||
    !AUTHORIZATION_REFERENCE_PATTERN.test(record.bound_farm_scope) ||
    typeof record.subject_id !== "string" ||
    !AUTHORIZATION_REFERENCE_PATTERN.test(record.subject_id) ||
    (record.channel !== "web" &&
      record.channel !== "slack" &&
      record.channel !== "cli") ||
    record.actor_authorized !== true ||
    typeof record.authorization_evidence_id !== "string" ||
    !AUTHORIZATION_REFERENCE_PATTERN.test(record.authorization_evidence_id) ||
    typeof record.authentication_method !== "string" ||
    !AUTHORIZATION_REFERENCE_PATTERN.test(record.authentication_method)
  ) {
    return null;
  }
  return {
    installation_id: record.installation_id as string,
    bound_farm_scope: record.bound_farm_scope as string,
    subject_id: record.subject_id as string,
    channel: record.channel,
    actor_authorized: true,
    authorization_evidence_id: record.authorization_evidence_id as string,
    authentication_method: record.authentication_method as string,
  };
}

export class FarmOsProjectionFirstContractError extends Error {
  readonly code = "response_contract_invalid";

  constructor() {
    super("response_contract_invalid");
    this.name = "FarmOsProjectionFirstContractError";
  }
}

type AnswerDraft = {
  answer: string;
  refs: FarmOsProjectionFirstGroundingRef[];
  drilldownUsed: boolean;
};

function safeResponse(input: {
  request: FarmOsProjectionFirstRequest;
  result: FarmOsProjectionFirstResponse["result"];
  projectionStatus: FarmOsProjectionFirstResponse["projection_status"];
  projection?: FarmOsDailyProjection | null;
  failureCode?: FarmOsProjectionFirstGuardFailureCode | null;
  guardPassed?: boolean;
}): FarmOsProjectionFirstResponse {
  const guardPassed = input.guardPassed ?? false;
  return {
    contract_version: FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
    result: input.result,
    mode_requested: input.request.response_mode,
    mode_used: "none",
    answer: null,
    business_date: input.request.business_date,
    projection_id: input.projection?.projection_id ?? null,
    projection_status: input.projectionStatus,
    as_of: input.projection?.generated_at ?? null,
    grounding_refs: [],
    drilldown_used: false,
    response_guard: guardPassed
      ? { status: "passed", failure_codes: [] }
      : {
        status: "rejected",
        failure_codes: [input.failureCode ?? "response_contract_invalid"],
      },
    writes_performed: false,
  };
}

function projectionRef(
  projection: FarmOsDailyProjection,
): FarmOsProjectionFirstGroundingRef {
  return {
    source_type: "projection",
    reference_id: projection.projection_id,
    source_record_id: null,
    business_date: projection.business_date,
  };
}

function queryIntent(
  query: string,
): "evidence" | "count" | "field" | "crop" | "work_type" | null {
  const normalized = query.normalize("NFKC").toLocaleLowerCase("ja-JP");
  if (/(根拠|lineage|evidence|source)/u.test(normalized)) return "evidence";
  if (/(件数|何件|count|record)/u.test(normalized)) return "count";
  if (/(圃場|ほ場|field)/u.test(normalized)) return "field";
  if (/(作物|crop|栽培)/u.test(normalized)) return "crop";
  if (/(作業|work)/u.test(normalized)) return "work_type";
  return null;
}

function joinRefs(values: string[]): string {
  return values.length === 0 ? "登録なし" : values.join("、");
}

function composeFromProjection(
  request: FarmOsProjectionFirstRequest,
  projection: FarmOsDailyProjection,
): AnswerDraft | null {
  const intent = queryIntent(request.query);
  if (intent === null || intent === "evidence") return null;
  const content = projection.content;
  const answer = intent === "count"
    ? `${request.business_date}の有効な作業記録は${content.active_record_count}件、除外済み記録は${content.tombstone_count}件です。`
    : intent === "field"
    ? `${request.business_date}の圃場参照は${joinRefs(content.field_references)}です。`
    : intent === "crop"
    ? `${request.business_date}の作物サイクル参照は${joinRefs(content.crop_cycle_references)}です。`
    : `${request.business_date}の作業種別参照は${joinRefs(content.work_type_references)}です。`;
  return { answer, refs: [projectionRef(projection)], drilldownUsed: false };
}

function composeFromLineage(input: {
  request: FarmOsProjectionFirstRequest;
  projection: FarmOsDailyProjection;
  sources: FarmOsProjectionFirstLineageSource[];
}): AnswerDraft | null {
  if (queryIntent(input.request.query) !== "evidence") return null;
  const refs: FarmOsProjectionFirstGroundingRef[] = [
    projectionRef(input.projection),
    ...input.sources.map((source) => ({
      source_type: "lineage_snapshot" as const,
      reference_id: source.snapshot_id,
      source_record_id: source.source_record_id,
      business_date: source.business_date,
    })),
  ].slice(0, FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT);
  return {
    answer:
      `${input.request.business_date}の回答根拠として検証済みlineage sourceを${input.sources.length}件確認しました。`,
    refs,
    drilldownUsed: true,
  };
}

function normalizeLimit(value: number | undefined): number {
  if (!Number.isSafeInteger(value) || (value ?? 0) <= 0) {
    return FARM_OS_PROJECTION_FIRST_DEFAULT_DRILLDOWN_LIMIT;
  }
  return Math.min(value!, FARM_OS_PROJECTION_FIRST_HARD_DRILLDOWN_LIMIT);
}

export class FarmOsProjectionFirstRuntime {
  private readonly drilldownLimit: number;

  constructor(private readonly dependencies: {
    authorization: FarmOsProjectionFirstAuthorizationPort;
    repository: FarmOsProjectionFirstReadPort;
    drilldownMaxRecords?: number;
    onEvent?: (event: FarmOsProjectionFirstEvent) => void;
  }) {
    this.drilldownLimit = normalizeLimit(dependencies.drilldownMaxRecords);
  }

  private emit(event: FarmOsProjectionFirstEvent): void {
    try {
      this.dependencies.onEvent?.(event);
    } catch {
      // Fixed diagnostics cannot change read-only runtime behavior.
    }
  }

  private complete(response: FarmOsProjectionFirstResponse):
    FarmOsProjectionFirstResponse {
    const parsed = parseFarmOsProjectionFirstResponse(response);
    if (!parsed.valid) throw new FarmOsProjectionFirstContractError();
    this.emit("FARMOS_PROJECTION_RESPONSE_COMPLETED");
    return parsed.value;
  }

  async respond(input: {
    request: unknown;
    authorization_context: unknown;
  }): Promise<FarmOsProjectionFirstResponse> {
    const parsed = parseFarmOsProjectionFirstRequest(input.request);
    if (!parsed.valid) throw new FarmOsProjectionFirstContractError();
    const request = parsed.value;
    this.emit("FARMOS_PROJECTION_FIRST_REQUEST_ACCEPTED");
    const authorizationContext =
      parseFarmOsProjectionFirstAuthorizationContext(
        input.authorization_context,
      );
    if (authorizationContext === null) {
      this.emit("FARMOS_PROJECTION_RESPONSE_GUARD_REJECTED");
      return this.complete(safeResponse({
        request,
        result: "guard_rejected",
        projectionStatus: "unavailable",
        failureCode: "authorization_failed",
      }));
    }
    let authorizedScope: FarmOsProjectionFirstAuthorizedScope | null = null;
    try {
      authorizedScope = await this.dependencies.authorization.authorize({
        requested_farm_scope: request.farm_scope,
        context: authorizationContext,
      });
    } catch {
      authorizedScope = null;
    }
    if (
      authorizedScope === null ||
      authorizedScope.installation_id !== authorizationContext.installation_id ||
      authorizedScope.farm_scope !== request.farm_scope ||
      authorizedScope.authorization_id.length === 0
    ) {
      this.emit("FARMOS_PROJECTION_RESPONSE_GUARD_REJECTED");
      return this.complete(safeResponse({
        request,
        result: "guard_rejected",
        projectionStatus: "unavailable",
        failureCode: "authorization_failed",
      }));
    }
    if (request.response_mode === "deep") {
      this.emit("FARMOS_PROJECTION_DEEP_ANALYSIS_UNAVAILABLE");
      return this.complete(safeResponse({
        request,
        result: "deep_analysis_unavailable",
        projectionStatus: "unavailable",
        guardPassed: true,
      }));
    }
    let bundle: FarmOsProjectionFirstScopedBundle;
    try {
      bundle = await this.dependencies.repository.readProjectionBundle({
        authorized_scope: authorizedScope,
        business_date: request.business_date,
      });
    } catch {
      this.emit("FARMOS_PROJECTION_UNAVAILABLE");
      return this.complete(safeResponse({
        request,
        result: "projection_unavailable",
        projectionStatus: "unavailable",
        failureCode: "projection_contract_invalid",
      }));
    }
    const selection = selectFarmOsProjectionFirstProjection({
      authorized_farm_scope: authorizedScope.farm_scope,
      business_date: request.business_date,
      bundle,
    });
    if (selection.result !== "selected") {
      this.emit(selection.result === "projection_missing"
        ? "FARMOS_PROJECTION_MISSING"
        : selection.result === "projection_stale"
        ? "FARMOS_PROJECTION_STALE"
        : "FARMOS_PROJECTION_UNAVAILABLE");
      return this.complete(safeResponse({
        request,
        result: selection.result,
        projectionStatus: selection.result === "projection_missing"
          ? "missing"
          : selection.result === "projection_stale"
          ? "stale"
          : "unavailable",
        projection: selection.projection,
        failureCode: selection.failure_code,
      }));
    }
    this.emit("FARMOS_PROJECTION_SELECTED");
    let draft = composeFromProjection(request, selection.projection);
    if (draft === null) {
      this.emit("FARMOS_PROJECTION_DRILLDOWN_STARTED");
      try {
        const lineageIds = selection.lineage
          .filter((entry) => entry.relation === "included")
          .map((entry) => entry.snapshot_id)
          .slice(0, this.drilldownLimit);
        const sources = await this.dependencies.repository.readLineageSources({
          authorized_scope: authorizedScope,
          business_date: request.business_date,
          snapshot_ids: lineageIds,
          limit: this.drilldownLimit,
        });
        const allowed = new Set(lineageIds);
        if (
          sources.length > this.drilldownLimit ||
          sources.some((source) =>
            !allowed.has(source.snapshot_id) ||
            source.business_date !== request.business_date
          )
        ) {
          this.emit("FARMOS_PROJECTION_RESPONSE_GUARD_REJECTED");
          return this.complete(safeResponse({
            request,
            result: "guard_rejected",
            projectionStatus: "active",
            projection: selection.projection,
            failureCode: "projection_lineage_invalid",
          }));
        }
        draft = composeFromLineage({
          request,
          projection: selection.projection,
          sources,
        });
      } catch {
        draft = null;
      }
      this.emit("FARMOS_PROJECTION_DRILLDOWN_COMPLETED");
    }
    if (draft === null) {
      return this.complete(safeResponse({
        request,
        result: "clarification_required",
        projectionStatus: "active",
        projection: selection.projection,
        failureCode: "insufficient_grounding",
      }));
    }
    const guard = guardFarmOsProjectionFirstResponse({
      answer: draft.answer,
      expected_answer: draft.answer,
      requested_business_date: request.business_date,
      projection_business_date: selection.projection.business_date,
      projection_fresh: true,
      grounding_refs: draft.refs,
      supported_fact: true,
      hidden_business_action: false,
      write_claim_without_proof: false,
      raw_reasoning_present: false,
    });
    if (guard.status !== "passed") {
      this.emit("FARMOS_PROJECTION_RESPONSE_GUARD_REJECTED");
      return this.complete(safeResponse({
        request,
        result: "guard_rejected",
        projectionStatus: "active",
        projection: selection.projection,
        failureCode: guard.failure_codes[0],
      }));
    }
    this.emit("FARMOS_PROJECTION_RESPONSE_GUARD_PASSED");
    return this.complete({
      contract_version: FARM_OS_PROJECTION_FIRST_RESPONSE_CONTRACT,
      result: "answered",
      mode_requested: request.response_mode,
      mode_used: "fast",
      answer: draft.answer,
      business_date: request.business_date,
      projection_id: selection.projection.projection_id,
      projection_status: "active",
      as_of: selection.projection.generated_at,
      grounding_refs: draft.refs,
      drilldown_used: draft.drilldownUsed,
      response_guard: guard,
      writes_performed: false,
    });
  }
}

export class FarmOsProjectionFirstService {
  constructor(private readonly runtime: FarmOsProjectionFirstRuntime) {}

  respond(input: {
    request: unknown;
    authorization_context: unknown;
  }): Promise<FarmOsProjectionFirstResponse> {
    return this.runtime.respond(input);
  }
}
