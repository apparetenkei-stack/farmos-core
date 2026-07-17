import { parseHermesDailyFarmBriefPersistenceCommand } from "./hermes_daily_farm_brief_persistence_command_contract";
import { isHermesDailyFarmBusinessDate } from "./hermes_daily_farm_brief_generation_contract";

export const HERMES_DAILY_FARM_BRIEF_WRITE_READINESS_CLASSIFICATIONS = [
  "ready",
  "database_unavailable",
  "transaction_read_only",
  "relation_missing",
  "function_missing",
  "function_signature_mismatch",
  "execute_privilege_missing",
  "relation_privilege_missing",
  "existing_record_conflict",
  "command_invalid",
  "unknown_failure",
] as const;

export type HermesDailyFarmBriefWriteReadinessClassification =
  (typeof HERMES_DAILY_FARM_BRIEF_WRITE_READINESS_CLASSIFICATIONS)[number];

export type HermesDailyFarmBriefWriteReadinessEvidence = {
  connection_available: boolean;
  transaction_read_only: boolean;
  records_relation_exists: boolean;
  commands_relation_exists: boolean;
  function_exists: boolean;
  function_signature_matches: boolean;
  execute_privilege: boolean;
  relation_privileges: boolean;
  canonical_record_count: number;
  expected_version_matches: boolean;
  rollback_verified: boolean;
};

export type HermesDailyFarmBriefProductionWriteReadinessResult = {
  schema_version: "hermes.daily_farm_brief.production_write_readiness.v1";
  classification: HermesDailyFarmBriefWriteReadinessClassification;
  command_valid: boolean;
  connection_available: boolean;
  transaction_mode: "read_write" | "read_only" | "not_started";
  required_relations: "present" | "missing" | "not_checked";
  persist_function: "ready" | "missing" | "signature_mismatch" | "not_checked";
  execute_privilege: "present" | "missing" | "not_checked";
  relation_privileges: "present" | "missing" | "not_checked";
  existing_canonical: "absent" | "present" | "not_checked";
  current_version: "absent" | "present" | "not_checked";
  expected_current_version: "none" | "provided";
  rollback_verified: boolean;
  transaction_committed: false;
  database_write_performed: false;
  application_database_write_performed: false;
  retry_count: 0;
  secret_exposed: false;
};

function base(input: {
  classification: HermesDailyFarmBriefWriteReadinessClassification;
  commandValid: boolean;
  expectedCurrentVersion: number | null;
  evidence?: HermesDailyFarmBriefWriteReadinessEvidence;
}): HermesDailyFarmBriefProductionWriteReadinessResult {
  const evidence = input.evidence;
  const relationsChecked = evidence?.connection_available === true;
  const relationsPresent = evidence?.records_relation_exists === true && evidence.commands_relation_exists === true;
  const functionChecked = relationsChecked && relationsPresent;
  const canonicalChecked = functionChecked && evidence?.function_signature_matches === true;
  return {
    schema_version: "hermes.daily_farm_brief.production_write_readiness.v1",
    classification: input.classification,
    command_valid: input.commandValid,
    connection_available: evidence?.connection_available ?? false,
    transaction_mode: evidence === undefined || !evidence.connection_available ? "not_started" : evidence.transaction_read_only ? "read_only" : "read_write",
    required_relations: !relationsChecked ? "not_checked" : relationsPresent ? "present" : "missing",
    persist_function: !functionChecked ? "not_checked" : !evidence.function_exists ? "missing" : evidence.function_signature_matches ? "ready" : "signature_mismatch",
    execute_privilege: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.execute_privilege ? "present" : "missing",
    relation_privileges: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.relation_privileges ? "present" : "missing",
    existing_canonical: !canonicalChecked ? "not_checked" : evidence.canonical_record_count > 0 ? "present" : "absent",
    current_version: !canonicalChecked ? "not_checked" : evidence.canonical_record_count > 0 ? "present" : "absent",
    expected_current_version: input.expectedCurrentVersion === null ? "none" : "provided",
    rollback_verified: evidence?.rollback_verified ?? false,
    transaction_committed: false,
    database_write_performed: false,
    application_database_write_performed: false,
    retry_count: 0,
    secret_exposed: false,
  };
}

export function classifyHermesDailyFarmBriefProductionWriteReadiness(input: {
  command: unknown;
  targetDate: string;
  expectedCurrentVersion: number | null;
  evidence?: HermesDailyFarmBriefWriteReadinessEvidence;
  connectionFailure?: boolean;
}): HermesDailyFarmBriefProductionWriteReadinessResult {
  const command = parseHermesDailyFarmBriefPersistenceCommand(input.command);
  const commandValid = command !== null && isHermesDailyFarmBusinessDate(input.targetDate) && command.business_date === input.targetDate && command.expected_current_version === input.expectedCurrentVersion;
  if (input.connectionFailure || input.evidence === undefined || !input.evidence.connection_available) return base({ classification: "database_unavailable", commandValid, expectedCurrentVersion: input.expectedCurrentVersion, evidence: input.evidence });
  const evidence = input.evidence;
  let classification: HermesDailyFarmBriefWriteReadinessClassification = "ready";
  if (evidence.transaction_read_only) classification = "transaction_read_only";
  else if (!evidence.records_relation_exists || !evidence.commands_relation_exists) classification = "relation_missing";
  else if (!evidence.function_exists) classification = "function_missing";
  else if (!evidence.function_signature_matches) classification = "function_signature_mismatch";
  else if (!evidence.execute_privilege) classification = "execute_privilege_missing";
  else if (!evidence.relation_privileges) classification = "relation_privilege_missing";
  else if (!commandValid) classification = "command_invalid";
  else if (evidence.canonical_record_count > 1 || (input.expectedCurrentVersion === null ? evidence.canonical_record_count !== 0 : evidence.canonical_record_count !== 1 || !evidence.expected_version_matches)) classification = "existing_record_conflict";
  else if (!evidence.rollback_verified) classification = "unknown_failure";
  return base({ classification, commandValid, expectedCurrentVersion: input.expectedCurrentVersion, evidence });
}
