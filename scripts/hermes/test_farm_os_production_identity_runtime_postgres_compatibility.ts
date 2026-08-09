import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

import {
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_QUALIFICATION_POLICY,
  FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE,
  classifyFarmOsProductionIdentityPostgresCompatibility,
  parseFarmOsProductionIdentityPostgresQualificationEvidence,
  parseFarmOsProductionPostgresBootstrapResult,
} from "./lib/farm_os_production_identity_postgres_qualification_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL,
  FARM_OS_PRODUCTION_IDENTITY_ACL_FIXTURE_MATRIX,
  FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_ROLE_NAMES,
  FARM_OS_PRODUCTION_IDENTITY_RLS_FIXTURE_MATRIX,
  FARM_OS_PRODUCTION_IDENTITY_SYNTHETIC_MARKERS,
  buildFarmOsProductionIdentityDockerCommandPlan,
  buildFarmOsProductionIdentityOwnedContainerCleanupCommand,
  buildFarmOsProductionIdentitySectionOrchestration,
  buildFarmOsProductionIdentityExpectedQualificationScenario,
  evaluateFarmOsProductionIdentityQualificationClosure,
  buildFarmOsProductionIdentitySyntheticFixture,
  planFarmOsProductionIdentitySourceOnlyQualification,
  type FarmOsProductionIdentityDockerRunner,
  type FarmOsProductionIdentityFixtureCase,
} from "./lib/farm_os_production_identity_isolated_postgres_fixture";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES,
} from "../../src/lib/hermes/farm_os_production_identity_query_v2_contract";
import {
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE,
  FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
} from "../../src/lib/hermes/farm_os_production_identity_query_v3_authority";

const bootstrapBytes = readFileSync(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.artifact_path);
const bootstrapSql = bootstrapBytes.toString("utf8");
assert.equal(bootstrapSql, "SELECT current_setting('server_version_num')::integer AS server_version_num;\n");
assert.equal(bootstrapSql.endsWith("\n"), true);
assert.equal(bootstrapSql.includes("\r"), false);
assert.equal(`sha256:${createHash("sha256").update(bootstrapBytes).digest("hex")}`,
  FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
  "farmos.production-postgres-version-bootstrap-query.v1");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.status, "CANDIDATE_FOR_APPROVAL");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_status, "REQUIRED_NOT_APPROVED");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.repository_authority_adopted, false);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.runtime_bound, false);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.execution_authorized, false);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.caller_input_count, 0);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.mutation_count, 0);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.credential_selection_count, 0);
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.adoption_status, "ADOPTED");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.review_status, "APPROVED");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.runtime_binding_status, "NOT_RUNTIME_BOUND");
assert.equal(FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_AUTHORITY.execution_authorized, false);
assert.match(bootstrapSql, /^SELECT\b/u);
assert.doesNotMatch(bootstrapSql, /\b(?:INSERT|UPDATE|DELETE|MERGE|CREATE|ALTER|DROP|TRUNCATE|GRANT|REVOKE|EXECUTE|CALL|DO|COPY)\b/iu);
assert.doesNotMatch(bootstrapSql, /\b(?:FROM|JOIN|WHERE|inet_|pg_stat_activity|pg_roles|pg_authid|dblink|http)\b/iu);

assert.deepEqual(parseFarmOsProductionPostgresBootstrapResult({ server_version_num: 160012 }), {
  server_version_num: 160012,
  postgres_major: 16,
});
for (const invalid of [
  {}, { server_version_num: "160012" }, { server_version_num: 160012, extra: true },
  { server_version_num: 16.1 }, { server_version_num: Number.NaN }, { server_version_num: -1 }, null,
]) assert.equal(parseFarmOsProductionPostgresBootstrapResult(invalid), null);

assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_POSTGRES_COMPATIBILITY_QUALIFICATION_POLICY, {
  minimum_proposed_postgres_major: 16,
  automatic_latest_acceptance: false,
  qualification_required_before_execution: true,
  pg14: "NOT_ELIGIBLE",
  pg15: "NOT_ELIGIBLE",
  pg16: "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION",
  pg17: "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION",
  pg18_plus: "UNREVIEWED",
});
for (const major of [14, 15] as const) {
  assert.deepEqual(classifyFarmOsProductionIdentityPostgresCompatibility(major * 10_000), {
    classification: "NOT_ELIGIBLE",
    postgres_major: major,
    full_v2_executor_eligible: false,
    incompatibility_reasons: [
      "CATALOG_COLUMN_MISSING_INHERIT_OPTION",
      "CATALOG_COLUMN_MISSING_SET_OPTION",
    ],
  });
}
for (const major of [16, 17] as const) {
  assert.deepEqual(classifyFarmOsProductionIdentityPostgresCompatibility(major * 10_000 + 42), {
    classification: "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION",
    postgres_major: major,
    full_v2_executor_eligible: false,
    incompatibility_reasons: [],
  });
}
assert.equal(classifyFarmOsProductionIdentityPostgresCompatibility(180000)?.classification, "UNREVIEWED");
assert.equal(classifyFarmOsProductionIdentityPostgresCompatibility("170000"), null);

assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES.length, 20);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES.length, 21);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_ROLE_SCOPES.length, 8);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUALIFICATION_ROLE_NAMES.length, 8);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_CANDIDATE_SECTIONS.length, 11);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_MIGRATIONS.length, 5);
assert.match(FARM_OS_PRODUCTION_IDENTITY_CAPABILITY_PROBE_SQL, /pg_catalog[\s\S]+pg_auth_members[\s\S]+inherit_option[\s\S]+set_option/u);
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_RLS_FIXTURE_MATRIX.commands, ["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"]);
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_RLS_FIXTURE_MATRIX.modes, ["PERMISSIVE", "RESTRICTIVE"]);
assert.deepEqual(FARM_OS_PRODUCTION_IDENTITY_ACL_FIXTURE_MATRIX.object_classes, ["r", "s", "f", "n"]);
assert.equal(FARM_OS_PRODUCTION_IDENTITY_ACL_FIXTURE_MATRIX.unknown_relkind, "UNIT_TEST_FAIL_CLOSED_ONLY");

let dockerExecutionCount = 0;
const forbiddenRunner: FarmOsProductionIdentityDockerRunner = {
  run: async () => {
    dockerExecutionCount += 1;
    throw new Error("docker_execution_not_authorized_in_source_phase");
  },
};
const fixtureCases: readonly FarmOsProductionIdentityFixtureCase[] = [
  "MIGRATION_HISTORY_ABSENT", "MIGRATION_HISTORY_PRESENT",
];
for (const major of [14, 15, 16, 17] as const) {
  const expectedScenario = buildFarmOsProductionIdentityExpectedQualificationScenario(major);
  assert.equal(expectedScenario.full_v2_executor_call_count, major <= 15 ? 0 : 1);
  assert.equal(expectedScenario.expected_section_count, major <= 15 ? 0 : 11);
  assert.equal(expectedScenario.technical_classification, major <= 15 ? "NOT_ELIGIBLE" : "QUALIFIED");
  assert.equal(expectedScenario.runtime_authority_closed, false);
  const dockerPlan = buildFarmOsProductionIdentityDockerCommandPlan(major, "safe1234");
  assert.ok(dockerPlan);
  assert.equal(dockerPlan.image, `postgres:${major}`);
  assert.equal(dockerPlan.create_argv.includes("--pull=never"), true);
  assert.equal(dockerPlan.create_argv.includes("--restart=no"), true);
  assert.equal(dockerPlan.create_argv.includes("127.0.0.1::5432"), true);
  assert.equal(dockerPlan.create_argv.includes("--tmpfs"), true);
  assert.equal(dockerPlan.create_argv.includes("--network"), false);
  assert.equal(dockerPlan.create_argv.includes("--volume"), false);
  assert.equal(dockerPlan.cleanup_argv, null);
  const createdContainerId = "a".repeat(64);
  assert.deepEqual(buildFarmOsProductionIdentityOwnedContainerCleanupCommand(dockerPlan, {
    container_name: dockerPlan.container_name,
    ownership_label: dockerPlan.ownership_label,
    container_id: createdContainerId,
  }), ["docker", "rm", "--force", createdContainerId]);
  assert.equal(buildFarmOsProductionIdentityOwnedContainerCleanupCommand(dockerPlan, {
    container_name: `${dockerPlan.container_name}-collision`,
    ownership_label: dockerPlan.ownership_label,
    container_id: createdContainerId,
  }), null);
  assert.equal(dockerPlan.retry_count, 0);
  assert.equal(dockerPlan.named_volume_count, 0);
  assert.equal(dockerPlan.production_network_count, 0);
  for (const fixtureCase of fixtureCases) {
    const sourcePlan = planFarmOsProductionIdentitySourceOnlyQualification({
      postgres_major: major,
      fixture_case: fixtureCase,
      docker_runner: forbiddenRunner,
    });
    assert.equal(sourcePlan.phase, "SOURCE_ONLY");
    assert.equal(sourcePlan.docker_execution_authorized, false);
    assert.equal(sourcePlan.docker_runner_calls, 0);
    assert.equal(sourcePlan.bootstrap_repository_authority, "ADOPTED");
    assert.equal(sourcePlan.bootstrap_runtime_binding, "NOT_RUNTIME_BOUND");
    assert.equal(sourcePlan.technical_qualification_status, "NOT_RUN");
    assert.equal(sourcePlan.runtime_evidence_assembly, "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY");
    assert.equal(sourcePlan.production_operations, 0);
    assert.equal(sourcePlan.fixture.business_row_count, 0);
    assert.equal(sourcePlan.fixture.target_relation_universe_count, 20);
    assert.equal(sourcePlan.fixture.target_function_universe_count, 21);
    assert.equal(sourcePlan.fixture.target_role_universe_count, 8);
    assert.equal(sourcePlan.fixture.representative_present_objects, true);
    assert.equal(sourcePlan.fixture.formal_absent_rows_required, true);
    if (major <= 15) {
      assert.equal(sourcePlan.fixture.qualification_mode, "CAPABILITY_NEGATIVE_ONLY");
      assert.equal(sourcePlan.fixture.setup_statements.length, 0);
      assert.equal(sourcePlan.fixture.h2_expected_invocation_count, 0);
      assert.equal(sourcePlan.policy?.classification, "NOT_ELIGIBLE");
    } else {
      assert.equal(sourcePlan.fixture.qualification_mode, "FULL_V2_ISOLATED");
      assert.ok(sourcePlan.fixture.setup_statements.length > 20);
      assert.equal(sourcePlan.policy?.classification, "POLICY_ELIGIBLE_PENDING_ISOLATED_QUALIFICATION");
      assert.equal(sourcePlan.fixture.h2_expected_invocation_count, fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 1 : 0);
      assert.equal(sourcePlan.fixture.h2_expected_row_count, fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 5 : 0);
      const orchestration = buildFarmOsProductionIdentitySectionOrchestration(fixtureCase);
      assert.equal(orchestration.logical_section_count, 11);
      assert.equal(orchestration.h2_invocation_count, fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 1 : 0);
      assert.equal(orchestration.executed_sections.length, fixtureCase === "MIGRATION_HISTORY_PRESENT" ? 11 : 10);
      assert.equal(orchestration.h2_not_applicable_sentinel === null,
        fixtureCase === "MIGRATION_HISTORY_PRESENT");
    }
  }
}
assert.equal(buildFarmOsProductionIdentityDockerCommandPlan(16, "unsafe;name"), null);
assert.equal(buildFarmOsProductionIdentityDockerCommandPlan(16, "$(id)"), null);
assert.equal(dockerExecutionCount, 0);

const positiveFixture = buildFarmOsProductionIdentitySyntheticFixture(16, "MIGRATION_HISTORY_PRESENT");
const positiveAbsentFixture = buildFarmOsProductionIdentitySyntheticFixture(16, "MIGRATION_HISTORY_ABSENT");
const fixtureSql = positiveFixture.setup_statements.join("\n");
for (const target of ["ai.proposal_inbox", "ai.proposal_creation_idempotency", "ai.proposal_execution_state"]) {
  assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RELATION_SCOPES.some((scope) => scope.endsWith(`:${target}`)), true);
  assert.equal(fixtureSql.includes(target), true);
}
assert.equal(FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_FUNCTION_SCOPES.some(
  (scope) => scope.endsWith(":ai.enforce_proposal_creation_idempotency_transition")), true);
assert.equal(fixtureSql.includes("ai.enforce_proposal_creation_idempotency_transition"), true);
for (const expected of [
  "CREATE SCHEMA ai", "CREATE SCHEMA audit", "CREATE SCHEMA core_schema", "pg_monitor",
  "GENERATED ALWAYS AS IDENTITY", "CREATE SEQUENCE", "CREATE FUNCTION", "CREATE TRIGGER",
  "ENABLE ROW LEVEL SECURITY", "AS PERMISSIVE FOR ALL", "AS RESTRICTIVE FOR SELECT",
  "FOR INSERT", "FOR UPDATE", "FOR DELETE", "TO PUBLIC", "WITH GRANT OPTION",
]) assert.equal(fixtureSql.includes(expected), true, expected);
for (const marker of FARM_OS_PRODUCTION_IDENTITY_SYNTHETIC_MARKERS.slice(0, -1)) {
  assert.equal(fixtureSql.includes(marker), true, marker);
}
assert.doesNotMatch(fixtureSql, /\b(?:app|sales)\./u);

const baseEvidence = {
  schema_version: FARM_OS_PRODUCTION_IDENTITY_POSTGRES_QUALIFICATION_EVIDENCE_VERSION,
  qualification_id: "qualification-pg16-present",
  git_commit: "7ee99940bb1f0a4f967ba483d0159d0aef9eb25a",
  observed_at: "2026-08-09T00:00:00.000Z",
  postgres_major: 16,
  server_version_num: 160012,
  image_tag: "postgres:16",
  image_id: "synthetic-image-id",
  image_repo_digest: `sha256:${"1".repeat(64)}`,
  bootstrap_authority_candidate_id: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.authority_id,
  bootstrap_query_sha256: FARM_OS_PRODUCTION_POSTGRES_BOOTSTRAP_QUERY_CANDIDATE.sha256,
  query_authority_id: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_CANDIDATE.authority_id,
  query_sha256: FARM_OS_PRODUCTION_IDENTITY_QUERY_V3_SHA256,
  runtime_contract_version: FARM_OS_PRODUCTION_IDENTITY_QUERY_V2_RESULT_CONTRACT_VERSION,
  section_count: 11,
  catalog_capability_columns: ["inherit_option", "set_option"],
  full_query_executor_call_count: 1,
  executed_section_count: 11,
  parser_pass: true,
  sanitizer_pass: true,
  sensitive_marker_occurrences: 0,
  cluster_identifier_exposure_count: 0,
  h1_h2_case: "MIGRATION_HISTORY_PRESENT",
  h2_invocation_count: 1,
  h2_row_count: 5,
  fixture_digest: positiveFixture.fixture_digest,
  assertion_count: 42,
  classification: "QUALIFIED",
  transaction_mode: "REPEATABLE READ READ ONLY",
  rollback_performed: true,
  container_cleanup_performed: true,
  production_operations: 0,
  secret_exposed: false,
} as const;
const parsedEvidence = parseFarmOsProductionIdentityPostgresQualificationEvidence(baseEvidence);
assert.ok(parsedEvidence);
const parsedAbsentEvidence = parseFarmOsProductionIdentityPostgresQualificationEvidence({
  ...baseEvidence,
  qualification_id: "qualification-pg16-absent",
  h1_h2_case: "MIGRATION_HISTORY_ABSENT",
  executed_section_count: 10,
  h2_invocation_count: 0,
  h2_row_count: 0,
  fixture_digest: positiveAbsentFixture.fixture_digest,
});
assert.ok(parsedAbsentEvidence);
assert.deepEqual(evaluateFarmOsProductionIdentityQualificationClosure([parsedAbsentEvidence, parsedEvidence]), {
  technical_evidence_valid: true,
  technical_qualification_achieved: true,
  runtime_authority_closed: false,
  blocker: "BOOTSTRAP_RUNTIME_NOT_BOUND",
  runtime_evidence_assembly: "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY",
});
assert.equal(evaluateFarmOsProductionIdentityQualificationClosure([parsedEvidence]), null);
assert.equal(evaluateFarmOsProductionIdentityQualificationClosure([
  { ...parsedAbsentEvidence, fixture_digest: `sha256:${"f".repeat(64)}` },
  parsedEvidence,
]), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, extra: true }), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({
  ...baseEvidence,
  raw_cluster_identifier: "SYNTHETIC_SECRET_MARKER_CLUSTER_IDENTIFIER",
}), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, postgres_major: "16" }), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, rollback_performed: false }), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, assertion_count: 0 }), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, sanitizer_pass: false }), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, sensitive_marker_occurrences: 1 }), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, production_operations: 1 }), null);
assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({ ...baseEvidence, secret_exposed: true }), null);

for (const major of [14, 15] as const) {
  const fixture = buildFarmOsProductionIdentitySyntheticFixture(major, "MIGRATION_HISTORY_ABSENT");
  const negativeEvidence = parseFarmOsProductionIdentityPostgresQualificationEvidence({
    ...baseEvidence,
    qualification_id: `qualification-pg${major}-expected-negative`,
    postgres_major: major,
    server_version_num: major * 10_000,
    image_tag: `postgres:${major}`,
    h1_h2_case: "NOT_RUN_INCOMPATIBLE",
    catalog_capability_columns: [],
    full_query_executor_call_count: 0,
    executed_section_count: 0,
    parser_pass: false,
    sanitizer_pass: false,
    h2_invocation_count: 0,
    h2_row_count: 0,
    fixture_digest: fixture.fixture_digest,
    assertion_count: 2,
    classification: "NOT_ELIGIBLE",
    transaction_mode: "NOT_STARTED_INCOMPATIBLE",
    rollback_performed: false,
  });
  assert.ok(negativeEvidence);
  assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({
    ...negativeEvidence,
    full_query_executor_call_count: 1,
  }), null);
  assert.equal(parseFarmOsProductionIdentityPostgresQualificationEvidence({
    ...negativeEvidence,
    executed_section_count: 11,
  }), null);
}

const serializedEvidence = JSON.stringify(baseEvidence);
for (const marker of FARM_OS_PRODUCTION_IDENTITY_SYNTHETIC_MARKERS) assert.equal(serializedEvidence.includes(marker), false);
assert.doesNotMatch(serializedEvidence, /raw_cluster_identifier|raw_sensitive_texts|connection_string|password/iu);
assert.match(serializedEvidence, /fixture_digest/u);

console.log(JSON.stringify({
  result: "pass",
  phase: "source_only",
  postgres_matrix: [14, 15, 16, 17],
  fixture_cases: fixtureCases,
  docker_execution_count: dockerExecutionCount,
  production_operations: 0,
  bootstrap_repository_authority: "ADOPTED",
  bootstrap_runtime_binding: "NOT_RUNTIME_BOUND",
  technical_qualification_status: "NOT_RUN",
  runtime_evidence_assembly: "BLOCKED_RUNTIME_EVIDENCE_ASSEMBLY",
}));
