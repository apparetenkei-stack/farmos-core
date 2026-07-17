import { parseHermesDailyFarmBriefPersistenceCommand } from "./hermes_daily_farm_brief_persistence_command_contract";
import { isHermesDailyFarmBusinessDate } from "./hermes_daily_farm_brief_generation_contract";

export const HERMES_DAILY_FARM_BRIEF_WRITE_READINESS_CLASSIFICATIONS = [
  "ready",
  "database_unavailable",
  "transaction_read_only",
  "relation_missing",
  "function_missing",
  "function_signature_mismatch",
  "function_not_security_definer",
  "unsafe_search_path",
  "public_execute_present",
  "execute_privilege_missing",
  "runtime_direct_dml_present",
  "owner_privilege_missing",
  "owner_role_unsafe",
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
  function_security_definer: boolean;
  function_search_path_safe: boolean;
  schema_public_create: boolean;
  schema_owner_safe: boolean;
  public_execute: boolean;
  runtime_execute_privilege: boolean;
  runtime_direct_dml: boolean;
  owner_relation_privileges: boolean;
  owner_role_safe: boolean;
  relation_owners_match_function_owner: boolean;
  owner_candidate_eligible: boolean;
  runtime_candidate_eligible: boolean;
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
  function_security: "definer" | "invoker" | "not_checked";
  search_path: "fixed" | "unsafe" | "not_checked";
  schema_create: "restricted" | "public" | "not_checked";
  schema_owner: "safe" | "unsafe" | "not_checked";
  public_execute: "absent" | "present" | "not_checked";
  execute_privilege: "present" | "missing" | "not_checked";
  runtime_direct_dml: "absent" | "present" | "not_checked";
  owner_privileges: "present" | "missing" | "not_checked";
  owner_role: "safe" | "unsafe" | "not_checked";
  relation_ownership: "aligned" | "separate" | "not_checked";
  owner_candidate: "eligible" | "ineligible" | "not_checked";
  runtime_candidate: "eligible" | "ineligible" | "not_checked";
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
    function_security: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.function_security_definer ? "definer" : "invoker",
    search_path: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.function_search_path_safe && !evidence.schema_public_create ? "fixed" : "unsafe",
    schema_create: !functionChecked ? "not_checked" : evidence.schema_public_create ? "public" : "restricted",
    schema_owner: !functionChecked ? "not_checked" : evidence.schema_owner_safe ? "safe" : "unsafe",
    public_execute: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.public_execute ? "present" : "absent",
    execute_privilege: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.runtime_execute_privilege ? "present" : "missing",
    runtime_direct_dml: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.runtime_direct_dml ? "present" : "absent",
    owner_privileges: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.owner_relation_privileges ? "present" : "missing",
    owner_role: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.owner_role_safe ? "safe" : "unsafe",
    relation_ownership: !functionChecked || !evidence.function_signature_matches ? "not_checked" : evidence.relation_owners_match_function_owner ? "aligned" : "separate",
    owner_candidate: !relationsChecked ? "not_checked" : evidence.owner_candidate_eligible ? "eligible" : "ineligible",
    runtime_candidate: !relationsChecked ? "not_checked" : evidence.runtime_candidate_eligible ? "eligible" : "ineligible",
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
  else if (!evidence.function_security_definer) classification = "function_not_security_definer";
  else if (!evidence.function_search_path_safe || evidence.schema_public_create) classification = "unsafe_search_path";
  else if (evidence.public_execute) classification = "public_execute_present";
  else if (!evidence.runtime_execute_privilege) classification = "execute_privilege_missing";
  else if (evidence.runtime_direct_dml) classification = "runtime_direct_dml_present";
  else if (!evidence.owner_role_safe) classification = "owner_role_unsafe";
  else if (!evidence.owner_relation_privileges) classification = "owner_privilege_missing";
  else if (!commandValid) classification = "command_invalid";
  else if (evidence.canonical_record_count > 1 || (input.expectedCurrentVersion === null ? evidence.canonical_record_count !== 0 : evidence.canonical_record_count !== 1 || !evidence.expected_version_matches)) classification = "existing_record_conflict";
  else if (!evidence.rollback_verified) classification = "unknown_failure";
  return base({ classification, commandValid, expectedCurrentVersion: input.expectedCurrentVersion, evidence });
}
