import { parseHermesDailyFarmBriefAuthenticatedActorContext } from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_latest_api_contract";
import {
  parseHermesDailyFarmBriefPrivilegeAdminEnvironmentForTarget,
  type HermesDailyFarmBriefPrivilegeAdminConfig,
} from "./hermes_daily_farm_brief_privilege_administrator_executor";
import {
  HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS,
  parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment,
  proposalReviewDatabaseTarget,
  type HermesDailyFarmBriefProposalReviewDatabaseTarget,
} from "./hermes_daily_farm_brief_proposal_review_database_contract";

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE =
  "farmos_ai_proposal_explicit_save_writer" as const;

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV = {
  enabled: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENABLED",
  confirmation: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_CONFIRMATION",
  credential: "HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_DATABASE_PASSWORD",
} as const;

export const HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_CONFIRMATION =
  "APPLY_DAY130_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING" as const;

export type HermesDailyFarmBriefProposalExplicitSaveWriterInspection = {
  target_matches: boolean;
  administrator_safe: boolean;
  administrator_can_provision: boolean;
  schema_present: boolean;
  proposal_table_present: boolean;
  role_present: boolean;
  role_login: boolean;
  role_superuser: boolean;
  role_createdb: boolean;
  role_createrole: boolean;
  role_bypassrls: boolean;
  role_replication: boolean;
  role_attributes_valid: boolean;
  role_membership_absent: boolean;
  database_connect: boolean;
  database_create: boolean;
  schema_usage: boolean;
  schema_create: boolean;
  proposal_select: boolean;
  proposal_insert: boolean;
  proposal_update: boolean;
  proposal_delete: boolean;
  proposal_truncate: boolean;
  proposal_references: boolean;
  proposal_trigger: boolean;
  other_relation_write: boolean;
  audit_write: boolean;
  app_sales_write: boolean;
  object_ownership_present: boolean;
};

export type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningState =
  | "disabled"
  | "invalid_environment"
  | "unauthorized"
  | "administrator_contract_mismatch"
  | "writer_contract_mismatch"
  | "ready_to_apply"
  | "applied"
  | "already_applied"
  | "postcondition_failed"
  | "rollback"
  | "internal_error";

export type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult = {
  schema_version: "hermes.daily_farm_brief.proposal_explicit_save_writer_provisioning_result.v1";
  result: "ready" | "applied" | "already_applied" | "denied" | "error";
  state: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningState;
  evidence: {
    administrator_authorized: boolean;
    explicit_provisioning_gate_valid: boolean;
    target_database_matches: boolean;
    role_created: boolean;
    login_enabled: boolean;
    database_connect: boolean;
    schema_usage: boolean;
    proposal_select: boolean;
    proposal_insert: boolean;
    proposal_update: boolean;
    proposal_delete: boolean;
    proposal_truncate: boolean;
    proposal_references: boolean;
    proposal_trigger: boolean;
    schema_create: boolean;
    other_relation_write: boolean;
    audit_write: boolean;
    app_sales_write: boolean;
    superuser: boolean;
    createdb: boolean;
    createrole: boolean;
    bypassrls: boolean;
    replication: boolean;
    postcondition_valid: boolean;
    mutation_count: number;
    database_mutation_performed: boolean;
    transaction_committed: boolean;
    rollback_performed: boolean;
    proposal_save_performed: false;
    review_post_performed: false;
    proposal_apply_performed: false;
    business_row_mutation_count: 0;
    retry_count: 0;
    credential_exposed: false;
    raw_identifier_exposed: false;
  };
};

export type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor = {
  diagnose(): Promise<{ inspection: HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null; rolledBack: boolean }>;
  apply(credential: string): Promise<{
    inspection: HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null;
    roleCreated: boolean;
    mutationCount: number;
    committed: boolean;
    rolledBack: boolean;
  }>;
  close(): Promise<void>;
};

export type HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningConfig = {
  admin: HermesDailyFarmBriefPrivilegeAdminConfig;
  target: HermesDailyFarmBriefProposalReviewDatabaseTarget;
};

const INSPECTION_KEYS = [
  "target_matches", "administrator_safe", "administrator_can_provision", "schema_present",
  "proposal_table_present", "role_present", "role_login", "role_superuser", "role_createdb",
  "role_createrole", "role_bypassrls", "role_replication", "role_attributes_valid", "role_membership_absent",
  "database_connect", "database_create", "schema_usage", "schema_create", "proposal_select",
  "proposal_insert", "proposal_update", "proposal_delete", "proposal_truncate", "proposal_references",
  "proposal_trigger", "other_relation_write", "audit_write", "app_sales_write", "object_ownership_present",
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseHermesDailyFarmBriefProposalExplicitSaveWriterInspection(
  value: unknown,
): HermesDailyFarmBriefProposalExplicitSaveWriterInspection | null {
  if (!isRecord(value) || Object.keys(value).length !== INSPECTION_KEYS.length) return null;
  if (!INSPECTION_KEYS.every((key) => Object.hasOwn(value, key) && typeof value[key] === "boolean")) return null;
  return value as HermesDailyFarmBriefProposalExplicitSaveWriterInspection;
}

export function hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid(
  value: HermesDailyFarmBriefProposalExplicitSaveWriterInspection,
): boolean {
  return value.target_matches && value.administrator_safe && value.administrator_can_provision &&
    value.schema_present && value.proposal_table_present && value.role_present &&
    value.role_login && !value.role_superuser && !value.role_createdb && !value.role_createrole &&
    !value.role_bypassrls && !value.role_replication && value.role_attributes_valid && value.role_membership_absent && value.database_connect &&
    !value.database_create && value.schema_usage && !value.schema_create && value.proposal_select &&
    value.proposal_insert && !value.proposal_update && !value.proposal_delete && !value.proposal_truncate &&
    !value.proposal_references && !value.proposal_trigger && !value.other_relation_write &&
    !value.audit_write && !value.app_sales_write && !value.object_ownership_present;
}

function base(
  result: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult["result"],
  state: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningState,
  partial: Partial<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult["evidence"]> = {},
): HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult {
  return {
    schema_version: "hermes.daily_farm_brief.proposal_explicit_save_writer_provisioning_result.v1",
    result,
    state,
    evidence: {
      administrator_authorized: false,
      explicit_provisioning_gate_valid: false,
      target_database_matches: false,
      role_created: false,
      login_enabled: false,
      database_connect: false,
      schema_usage: false,
      proposal_select: false,
      proposal_insert: false,
      proposal_update: false,
      proposal_delete: false,
      proposal_truncate: false,
      proposal_references: false,
      proposal_trigger: false,
      schema_create: false,
      other_relation_write: false,
      audit_write: false,
      app_sales_write: false,
      superuser: false,
      createdb: false,
      createrole: false,
      bypassrls: false,
      replication: false,
      postcondition_valid: false,
      mutation_count: 0,
      database_mutation_performed: false,
      transaction_committed: false,
      rollback_performed: false,
      proposal_save_performed: false,
      review_post_performed: false,
      proposal_apply_performed: false,
      business_row_mutation_count: 0,
      retry_count: 0,
      credential_exposed: false,
      raw_identifier_exposed: false,
      ...partial,
    },
  };
}

export function hermesDailyFarmBriefProposalExplicitSaveWriterProvisioningInternalError(): HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult {
  return base("error", "internal_error");
}

function evidence(
  inspection: HermesDailyFarmBriefProposalExplicitSaveWriterInspection,
): Partial<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult["evidence"]> {
  return {
    target_database_matches: inspection.target_matches,
    login_enabled: inspection.role_login,
    database_connect: inspection.database_connect,
    schema_usage: inspection.schema_usage,
    proposal_select: inspection.proposal_select,
    proposal_insert: inspection.proposal_insert,
    proposal_update: inspection.proposal_update,
    proposal_delete: inspection.proposal_delete,
    proposal_truncate: inspection.proposal_truncate,
    proposal_references: inspection.proposal_references,
    proposal_trigger: inspection.proposal_trigger,
    schema_create: inspection.schema_create,
    other_relation_write: inspection.other_relation_write,
    audit_write: inspection.audit_write,
    app_sales_write: inspection.app_sales_write,
    superuser: inspection.role_superuser,
    createdb: inspection.role_createdb,
    createrole: inspection.role_createrole,
    bypassrls: inspection.role_bypassrls,
    replication: inspection.role_replication,
    postcondition_valid: hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid(inspection),
  };
}

function configuration(
  environment: Readonly<Record<string, string | undefined>>,
): HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningConfig | null {
  const review = parseHermesDailyFarmBriefProposalReviewDatabaseEnvironment(environment);
  const target = review === null ? null : proposalReviewDatabaseTarget(environment, review);
  const admin = parseHermesDailyFarmBriefPrivilegeAdminEnvironmentForTarget(environment, target);
  if (review === null || target === null || admin.admin === null || !admin.targetMatches) return null;
  if (environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_REVIEW_DATABASE_ENV_KEYS.user] === HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_ROLE) return null;
  return { admin: admin.admin, target };
}

function administrator(value: unknown): boolean {
  const actor = parseHermesDailyFarmBriefAuthenticatedActorContext(value);
  return actor !== null && actor.role === "administrator" && actor.authorization_verified && actor.allowed_scope_keys.length === 0;
}

function safeCredential(value: string | undefined): value is string {
  return typeof value === "string" && value.length >= 32 && value.length <= 512 && /^[\x21-\x7e]+$/u.test(value);
}

export async function diagnoseHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning(input: {
  environment: Readonly<Record<string, string | undefined>>;
  actor: unknown;
  executorFactory: (config: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningConfig) => HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor;
}): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult> {
  if (!administrator(input.actor)) return base("denied", "unauthorized");
  const config = configuration(input.environment);
  if (config === null) return base("denied", "invalid_environment", { administrator_authorized: true });
  const executor = input.executorFactory(config);
  try {
    const diagnosed = await executor.diagnose();
    if (diagnosed.inspection === null) return base("error", "internal_error", { administrator_authorized: true, rollback_performed: diagnosed.rolledBack });
    const inspected = diagnosed.inspection;
    const shared = { administrator_authorized: true, rollback_performed: diagnosed.rolledBack, ...evidence(inspected) };
    if (!inspected.target_matches || !inspected.administrator_safe || !inspected.administrator_can_provision || !inspected.schema_present || !inspected.proposal_table_present) {
      return base("denied", "administrator_contract_mismatch", shared);
    }
    if (hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid(inspected)) return base("already_applied", "already_applied", shared);
    if (inspected.role_present) return base("denied", "writer_contract_mismatch", shared);
    return base("ready", "ready_to_apply", shared);
  } catch {
    return base("error", "internal_error", { administrator_authorized: true });
  } finally {
    await executor.close();
  }
}

export async function applyHermesDailyFarmBriefProposalExplicitSaveWriterProvisioning(input: {
  environment: Readonly<Record<string, string | undefined>>;
  actor: unknown;
  applyRequested: boolean;
  executorFactory: (config: HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningConfig) => HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningExecutor;
}): Promise<HermesDailyFarmBriefProposalExplicitSaveWriterProvisioningResult> {
  const gate = input.applyRequested &&
    input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.enabled] === "true" &&
    input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.confirmation] === HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_CONFIRMATION;
  if (!gate) return base("denied", "disabled");
  if (!administrator(input.actor)) return base("denied", "unauthorized", { explicit_provisioning_gate_valid: true });
  const config = configuration(input.environment);
  const credential = input.environment[HERMES_DAILY_FARM_BRIEF_PROPOSAL_EXPLICIT_SAVE_WRITER_PROVISIONING_ENV.credential];
  if (config === null || !safeCredential(credential)) return base("denied", "invalid_environment", { administrator_authorized: true, explicit_provisioning_gate_valid: true });
  const executor = input.executorFactory(config);
  try {
    const applied = await executor.apply(credential);
    if (applied.inspection === null) return base("error", applied.rolledBack ? "rollback" : "internal_error", { administrator_authorized: true, explicit_provisioning_gate_valid: true, rollback_performed: applied.rolledBack });
    const valid = hermesDailyFarmBriefProposalExplicitSaveWriterPostconditionValid(applied.inspection);
    const shared = { administrator_authorized: true, explicit_provisioning_gate_valid: true, role_created: applied.roleCreated, mutation_count: applied.mutationCount, database_mutation_performed: applied.committed && applied.mutationCount > 0, transaction_committed: applied.committed, rollback_performed: applied.rolledBack, ...evidence(applied.inspection) };
    if (!valid) return base("error", "postcondition_failed", shared);
    if (!applied.roleCreated) return base("already_applied", "already_applied", shared);
    return base("applied", "applied", shared);
  } catch {
    return base("error", "internal_error", { administrator_authorized: true, explicit_provisioning_gate_valid: true });
  } finally {
    await executor.close();
  }
}
