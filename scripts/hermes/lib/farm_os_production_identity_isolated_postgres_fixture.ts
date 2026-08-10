import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS,
  type FarmOsProductionIdentityQueryV2CandidateSection,
} from "../../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  createFarmOsProductionIdentityH2NotApplicableSentinel,
} from "../../../src/lib/hermes/farm_os_production_identity_runtime_foundation";
import {
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_QUALIFICATION_POLICY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY,
  classifyFarmOsProductionIdentityPostgresCompatibility,
  parseFarmOsProductionIdentityPostgresQualificationEvidence,
  sha256FarmOsProductionIdentityQualificationSource,
  type FarmOsProductionIdentityPostgresMajor,
} from "./farm_os_production_identity_postgres_qualification_contract";

export type FarmOsProductionIdentityFixtureCase =
  | "MIGRATION_HISTORY_ABSENT"
  | "MIGRATION_HISTORY_PRESENT";

export const FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_ROLE_NAMES = [
  "farmos_core_projection_command_transaction",
  "farmos_core_projection_reader",
  "farmos_core_projection_writer",
  "farmos_core_proposal_audit_writer",
  "farmos_core_proposal_reviewer",
  "farmos_core_proposal_transaction",
  "farmos_core_proposal_writer",
  "farmos_core_stable_changes_runtime",
] as const;

export const FARM_OS_PRODUCTION_IDENTITY_SYNTHETIC_MARKERS = Object.freeze([
  "SYNTHETIC_SECRET_MARKER_COLUMN_DEFAULT",
  "SYNTHETIC_SECRET_MARKER_PROCONFIG",
  "SYNTHETIC_SECRET_MARKER_FUNCTION_BODY",
  "SYNTHETIC_SECRET_MARKER_CONSTRAINT",
  "SYNTHETIC_SECRET_MARKER_PARTIAL_INDEX",
  "SYNTHETIC_SECRET_MARKER_TRIGGER_WHEN",
  "SYNTHETIC_SECRET_MARKER_RLS_USING",
  "SYNTHETIC_SECRET_MARKER_RLS_WITH_CHECK",
  "SYNTHETIC_SECRET_MARKER_CLUSTER_IDENTIFIER",
] as const);

const FIXTURE_PASSWORD = "SYNTHETIC_FIXTURE_PASSWORD_NOT_A_CREDENTIAL";
const FIXED_CONTAINER_PREFIX = "farmos-pi-pg-qualification";
const SAFE_NONCE = /^[a-z0-9]{6,32}$/u;

export type FarmOsProductionIdentityDockerCommandPlan = Readonly<{
  container_name: string;
  image: `postgres:${FarmOsProductionIdentityPostgresMajor}`;
  create_argv: readonly string[];
  cleanup_argv: null;
  ownership_label: string;
  inspect_argv: readonly string[];
  retry_count: 0;
  named_volume_count: 0;
  production_network_count: 0;
}>;

export interface FarmOsProductionIdentityDockerRunner {
  run(argv: readonly string[]): Promise<Readonly<{ exit_code: number; stdout: string }>>;
}

export function buildFarmOsProductionIdentityDockerCommandPlan(
  postgresMajor: FarmOsProductionIdentityPostgresMajor,
  nonce: string,
): FarmOsProductionIdentityDockerCommandPlan | null {
  if (![14, 15, 16, 17].includes(postgresMajor) || !SAFE_NONCE.test(nonce)) return null;
  const containerName = `${FIXED_CONTAINER_PREFIX}-${postgresMajor}-${nonce}`;
  const ownershipLabel = `farmos.production-identity-qualification=${postgresMajor}-${nonce}`;
  const image = `postgres:${postgresMajor}` as const;
  return Object.freeze({
    container_name: containerName,
    image,
    create_argv: Object.freeze([
      "docker", "run", "--detach", "--pull=never", "--restart=no",
      "--name", containerName,
      "--label", ownershipLabel,
      "--publish", "127.0.0.1::5432",
      "--tmpfs", "/var/lib/postgresql/data:rw,noexec,nosuid,size=512m",
      "--env", `POSTGRES_PASSWORD=${FIXTURE_PASSWORD}`,
      "--env", "POSTGRES_DB=farmos_identity_qualification",
      image,
    ]),
    cleanup_argv: null,
    ownership_label: ownershipLabel,
    inspect_argv: Object.freeze(["docker", "inspect", "--type", "container", containerName]),
    retry_count: 0,
    named_volume_count: 0,
    production_network_count: 0,
  });
}

export function buildFarmOsProductionIdentityOwnedContainerCleanupCommand(
  plan: FarmOsProductionIdentityDockerCommandPlan,
  creation: Readonly<{ container_name: string; ownership_label: string; container_id: string }>,
): readonly string[] | null {
  if (creation.container_name !== plan.container_name || creation.ownership_label !== plan.ownership_label ||
    !/^[a-f0-9]{64}$/u.test(creation.container_id)) return null;
  return Object.freeze(["docker", "rm", "--force", creation.container_id]);
}

export const FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL = [
  "SELECT column_name",
  "FROM information_schema.columns",
  "WHERE table_schema = 'pg_catalog'",
  "AND table_name = 'pg_auth_members'",
  "AND column_name IN ('inherit_option', 'set_option')",
  "ORDER BY column_name COLLATE \"C\";",
].join("\n");

export const FARM_OS_PRODUCTION_IDENTITY_RLS_FIXTURE_MATRIX = Object.freeze({
  disabled_zero_policy: true,
  enabled_zero_policy: true,
  enabled_with_policies: true,
  commands: Object.freeze(["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"] as const),
  modes: Object.freeze(["PERMISSIVE", "RESTRICTIVE"] as const),
  principals: Object.freeze(["PUBLIC", "NAMED_ROLE"] as const),
  expressions: Object.freeze(["USING", "WITH_CHECK"] as const),
} as const);

export const FARM_OS_PRODUCTION_IDENTITY_ACL_FIXTURE_MATRIX = Object.freeze({
  object_classes: Object.freeze(["r", "s", "f", "n"] as const),
  null_acl: true,
  explicit_grant: true,
  grant_option: true,
  public_principal: true,
  membership: true,
  unknown_relkind: "UNIT_TEST_FAIL_CLOSED_ONLY",
} as const);

export function buildFarmOsProductionIdentityExpectedQualificationScenario(
  postgresMajor: FarmOsProductionIdentityPostgresMajor,
): Readonly<{
  expected_capability_columns: readonly ("inherit_option" | "set_option")[];
  full_v2_executor_call_count: 0 | 1;
  expected_section_count: 0 | 11;
  expected_parser_pass: boolean;
  expected_sanitizer_pass: boolean;
  expected_rollback: boolean;
  expected_cleanup: true;
  technical_classification: "NOT_ELIGIBLE" | "QUALIFIED";
  runtime_authority_closed: false;
}> {
  const eligible = postgresMajor === 16 || postgresMajor === 17;
  return Object.freeze({
    expected_capability_columns: eligible
      ? Object.freeze(["inherit_option", "set_option"] as const)
      : Object.freeze([] as const),
    full_v2_executor_call_count: eligible ? 1 : 0,
    expected_section_count: eligible ? 11 : 0,
    expected_parser_pass: eligible,
    expected_sanitizer_pass: eligible,
    expected_rollback: eligible,
    expected_cleanup: true,
    technical_classification: eligible ? "QUALIFIED" : "NOT_ELIGIBLE",
    runtime_authority_closed: false,
  });
}

export type FarmOsProductionIdentitySyntheticFixture = Readonly<{
  fixture_id: string;
  postgres_major: FarmOsProductionIdentityPostgresMajor;
  fixture_case: FarmOsProductionIdentityFixtureCase;
  qualification_mode: "CAPABILITY_NEGATIVE_ONLY" | "FULL_V2_ISOLATED";
  setup_statements: readonly string[];
  capability_probe_sql: string;
  fixture_digest: `sha256:${string}`;
  target_relation_universe_count: 20;
  target_function_universe_count: 21;
  target_role_universe_count: 8;
  representative_present_objects: true;
  formal_absent_rows_required: true;
  business_row_count: 0;
  h2_expected_invocation_count: 0 | 1;
  h2_expected_row_count: 0 | 5;
}>;

const createFixtureStatements = (fixtureCase: FarmOsProductionIdentityFixtureCase): readonly string[] => {
  const roles = FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_ROLE_NAMES.map((role) =>
    `CREATE ROLE ${role} NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;`);
  const migrationHistory = fixtureCase === "MIGRATION_HISTORY_PRESENT" ? [
    "CREATE TABLE core_schema.migration_history (migration_id text PRIMARY KEY, sequence bigint NOT NULL, checksum text NOT NULL);",
    "INSERT INTO core_schema.migration_history (migration_id, sequence, checksum) VALUES " +
      "('202607260001_eligible_proposal_persistence', 202607260001, 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'), " +
      "('202607300001_daily_operational_projection_candidate_foundation', 202607300001, 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'), " +
      "('202607310001_daily_operational_projection_candidate_activation', 202607310001, 'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc'), " +
      "('202608030001_daily_operational_projection_command_ledger', 202608030001, 'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd'), " +
      "('202608070001_stable_changes_consumer_persistence', 202608070001, 'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee');",
    "GRANT USAGE ON SCHEMA core_schema TO farmos_identity_qualification;",
    "GRANT SELECT ON TABLE core_schema.migration_history TO farmos_identity_qualification;",
  ] : [];
  return Object.freeze([
    "CREATE SCHEMA ai;",
    "CREATE SCHEMA audit;",
    "CREATE SCHEMA core_schema;",
    ...roles,
    `CREATE ROLE farmos_identity_qualification LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD '${FIXTURE_PASSWORD}';`,
    "GRANT pg_monitor TO farmos_identity_qualification;",
    "GRANT farmos_core_projection_reader TO farmos_identity_qualification WITH ADMIN FALSE;",
    "GRANT farmos_core_projection_reader TO farmos_identity_qualification WITH INHERIT TRUE;",
    "GRANT farmos_core_projection_reader TO farmos_identity_qualification WITH SET TRUE;",
    "GRANT farmos_core_proposal_reviewer TO farmos_identity_qualification WITH ADMIN TRUE;",
    "GRANT farmos_core_proposal_reviewer TO farmos_identity_qualification WITH INHERIT FALSE;",
    "GRANT farmos_core_proposal_reviewer TO farmos_identity_qualification WITH SET FALSE;",
    "CREATE TABLE ai.proposal_inbox (id bigint GENERATED ALWAYS AS IDENTITY, marker text DEFAULT 'SYNTHETIC_SECRET_MARKER_COLUMN_DEFAULT', CONSTRAINT proposal_inbox_secret_check CHECK (marker <> 'SYNTHETIC_SECRET_MARKER_CONSTRAINT'));",
    "CREATE SEQUENCE ai.fixture_sequence;",
    "CREATE TABLE ai.proposal_creation_idempotency (id bigint PRIMARY KEY, owner_name text);",
    "ALTER TABLE ai.proposal_creation_idempotency ENABLE ROW LEVEL SECURITY;",
    "CREATE TABLE ai.proposal_execution_state (id bigint PRIMARY KEY, owner_name text, marker text);",
    "ALTER TABLE ai.proposal_execution_state ENABLE ROW LEVEL SECURITY;",
    "CREATE FUNCTION ai.enforce_proposal_creation_idempotency_transition() RETURNS trigger LANGUAGE plpgsql SET fixture.synthetic_marker = 'SYNTHETIC_SECRET_MARKER_PROCONFIG' AS $$ BEGIN PERFORM 'SYNTHETIC_SECRET_MARKER_FUNCTION_BODY'; RETURN NEW; END $$;",
    "CREATE INDEX proposal_execution_state_partial_index ON ai.proposal_execution_state (id) WHERE marker <> 'SYNTHETIC_SECRET_MARKER_PARTIAL_INDEX';",
    "CREATE TRIGGER proposal_execution_state_trigger BEFORE UPDATE ON ai.proposal_execution_state FOR EACH ROW WHEN (NEW.marker <> 'SYNTHETIC_SECRET_MARKER_TRIGGER_WHEN') EXECUTE FUNCTION ai.enforce_proposal_creation_idempotency_transition();",
    "CREATE POLICY proposal_state_all_permissive ON ai.proposal_execution_state AS PERMISSIVE FOR ALL TO PUBLIC USING (marker <> 'SYNTHETIC_SECRET_MARKER_RLS_USING') WITH CHECK (marker <> 'SYNTHETIC_SECRET_MARKER_RLS_WITH_CHECK');",
    "CREATE POLICY proposal_state_select_restrictive ON ai.proposal_execution_state AS RESTRICTIVE FOR SELECT TO farmos_core_projection_reader USING (owner_name = current_user);",
    "CREATE POLICY proposal_state_insert_permissive ON ai.proposal_execution_state AS PERMISSIVE FOR INSERT TO farmos_core_projection_writer WITH CHECK (owner_name = current_user);",
    "CREATE POLICY proposal_state_update_restrictive ON ai.proposal_execution_state AS RESTRICTIVE FOR UPDATE TO farmos_core_projection_writer USING (owner_name = current_user) WITH CHECK (owner_name = current_user);",
    "CREATE POLICY proposal_state_delete_permissive ON ai.proposal_execution_state AS PERMISSIVE FOR DELETE TO farmos_core_proposal_reviewer USING (owner_name = current_user);",
    "GRANT SELECT ON ai.proposal_inbox TO PUBLIC;",
    "GRANT SELECT ON ai.proposal_execution_state TO farmos_core_projection_reader WITH GRANT OPTION;",
    "GRANT USAGE ON SEQUENCE ai.fixture_sequence TO farmos_core_projection_writer;",
    "GRANT EXECUTE ON FUNCTION ai.enforce_proposal_creation_idempotency_transition() TO PUBLIC;",
    "GRANT USAGE ON SCHEMA ai TO farmos_core_projection_reader WITH GRANT OPTION;",
    ...migrationHistory,
  ]);
};

export function buildFarmOsProductionIdentitySyntheticFixture(
  postgresMajor: FarmOsProductionIdentityPostgresMajor,
  fixtureCase: FarmOsProductionIdentityFixtureCase,
): FarmOsProductionIdentitySyntheticFixture {
  const policy = classifyFarmOsProductionIdentityPostgresCompatibility(postgresMajor * 10_000)!;
  const full = policy.classification === "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION";
  const setupStatements = full ? createFixtureStatements(fixtureCase) : Object.freeze([]);
  const digestSource = JSON.stringify({ postgresMajor, fixtureCase, setupStatements, capability: FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL });
  return Object.freeze({
    fixture_id: `synthetic-production-identity-pg${postgresMajor}-${fixtureCase.toLowerCase().replaceAll("_", "-")}`,
    postgres_major: postgresMajor,
    fixture_case: fixtureCase,
    qualification_mode: full ? "FULL_V2_ISOLATED" : "CAPABILITY_NEGATIVE_ONLY",
    setup_statements: setupStatements,
    capability_probe_sql: FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL,
    fixture_digest: sha256FarmOsProductionIdentityQualificationSource(digestSource),
    target_relation_universe_count: 20,
    target_function_universe_count: 21,
    target_role_universe_count: 8,
    representative_present_objects: true,
    formal_absent_rows_required: true,
    business_row_count: 0,
    h2_expected_invocation_count: fixtureCase === "MIGRATION_HISTORY_PRESENT" && full ? 1 : 0,
    h2_expected_row_count: fixtureCase === "MIGRATION_HISTORY_PRESENT" && full ? 5 : 0,
  });
}

export function buildFarmOsProductionIdentitySectionOrchestration(
  fixtureCase: FarmOsProductionIdentityFixtureCase,
): Readonly<{
  executed_sections: readonly FarmOsProductionIdentityQueryV2CandidateSection[];
  logical_section_count: 11;
  h2_invocation_count: 0 | 1;
  h2_not_applicable_sentinel: ReturnType<typeof createFarmOsProductionIdentityH2NotApplicableSentinel> | null;
}> {
  if (fixtureCase === "MIGRATION_HISTORY_ABSENT") {
    return Object.freeze({
      executed_sections: Object.freeze(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS.filter(
        (section) => section !== "H2_MIGRATION_HISTORY_ROWS_IF_PRESENT",
      )),
      logical_section_count: 11,
      h2_invocation_count: 0,
      h2_not_applicable_sentinel: createFarmOsProductionIdentityH2NotApplicableSentinel("absent"),
    });
  }
  return Object.freeze({
    executed_sections: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS,
    logical_section_count: 11,
    h2_invocation_count: 1,
    h2_not_applicable_sentinel: null,
  });
}

export function evaluateFarmOsProductionIdentityQualificationClosure(
  evidenceMatrix: readonly unknown[],
): Readonly<{
  technical_evidence_valid: true;
  technical_qualification_achieved: true;
  runtime_authority_closed: false;
  blocker: "BOOTSTRAP_RUNTIME_NOT_BOUND";
  runtime_evidence_assembly: "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY";
}> | null {
  if (evidenceMatrix.length !== 2) return null;
  const parsed = evidenceMatrix.map(parseFarmOsProductionIdentityPostgresQualificationEvidence);
  if (parsed.some((item) => item === null)) return null;
  const evidence = parsed.filter((item) => item !== null);
  const absent = evidence.find((item) => item.h1_h2_case === "MIGRATION_HISTORY_ABSENT");
  const present = evidence.find((item) => item.h1_h2_case === "MIGRATION_HISTORY_PRESENT");
  if (absent === undefined || present === undefined || absent === present ||
    absent.classification !== "QUALIFIED" || present.classification !== "QUALIFIED" ||
    (absent.postgres_major !== 16 && absent.postgres_major !== 17) ||
    present.postgres_major !== absent.postgres_major || present.server_version_num !== absent.server_version_num ||
    present.git_commit !== absent.git_commit || present.image_tag !== absent.image_tag ||
    present.image_id !== absent.image_id || present.image_repo_digest !== absent.image_repo_digest) return null;
  const expectedAbsent = buildFarmOsProductionIdentitySyntheticFixture(absent.postgres_major, "MIGRATION_HISTORY_ABSENT");
  const expectedPresent = buildFarmOsProductionIdentitySyntheticFixture(absent.postgres_major, "MIGRATION_HISTORY_PRESENT");
  if (absent.fixture_digest !== expectedAbsent.fixture_digest || present.fixture_digest !== expectedPresent.fixture_digest) return null;
  return Object.freeze({
    technical_evidence_valid: true,
    technical_qualification_achieved: true,
    runtime_authority_closed: false,
    blocker: "BOOTSTRAP_RUNTIME_NOT_BOUND",
    runtime_evidence_assembly: "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY",
  });
}

export type FarmOsProductionIdentityQualificationHarnessInput = Readonly<{
  postgres_major: FarmOsProductionIdentityPostgresMajor;
  fixture_case: FarmOsProductionIdentityFixtureCase;
  docker_runner: FarmOsProductionIdentityDockerRunner;
}>;

export function planFarmOsProductionIdentitySourceOnlyQualification(
  input: FarmOsProductionIdentityQualificationHarnessInput,
): Readonly<{
  phase: "SOURCE_ONLY";
  docker_execution_authorized: false;
  docker_runner_calls: 0;
  policy: ReturnType<typeof classifyFarmOsProductionIdentityPostgresCompatibility>;
  fixture: FarmOsProductionIdentitySyntheticFixture;
  bootstrap_repository_authority: "ADOPTED";
  bootstrap_runtime_binding: "NOT_RUNTIME_BOUND";
  technical_qualification_status: "NOT_RUN";
  runtime_evidence_assembly: "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY";
  production_operations: 0;
}> {
  void input.docker_runner;
  return Object.freeze({
    phase: "SOURCE_ONLY",
    docker_execution_authorized: false,
    docker_runner_calls: 0,
    policy: classifyFarmOsProductionIdentityPostgresCompatibility(input.postgres_major * 10_000),
    fixture: buildFarmOsProductionIdentitySyntheticFixture(input.postgres_major, input.fixture_case),
    bootstrap_repository_authority: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.adoption_status,
    bootstrap_runtime_binding: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.runtime_binding_status,
    technical_qualification_status: "NOT_RUN",
    runtime_evidence_assembly: "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY",
    production_operations: 0,
  });
}

void FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_QUALIFICATION_POLICY;
