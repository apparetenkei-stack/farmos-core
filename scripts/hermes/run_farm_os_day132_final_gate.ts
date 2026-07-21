import { readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  computeDay132TreeHash,
  decideDay132Gate,
  parseDay132BuildEvidence,
  parseDay132ReviewArtifact,
  type Day132ExecutedEvidence,
} from "./farm_os_day132_evidence";

const root = process.cwd();
const [buildPath, reviewPath] = process.argv.slice(2).filter((argument) => argument !== "--");
if (!buildPath || !reviewPath || !path.isAbsolute(buildPath) || !path.isAbsolute(reviewPath)) {
  throw new Error("absolute build and review evidence paths required");
}
const run = (script: string) => {
  const result = spawnSync("pnpm", ["run", script], { cwd: root, encoding: "utf8" });
  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  return { exitCode: result.status, stdout: result.stdout };
};
const targeted = run("test-farm-os-approved-command-boundary");
const day131 = run("test-farm-agent-risk-policy-contract");
const day130Runtime = run("test-farm-agent-runtime-port");
const day130Ledger = run("test-farm-os-evolution-ledger-candidate");
const day130Fixture = run("test-farm-os-evolution-ledger-fixture-integration");
const typecheck = spawnSync("pnpm", ["exec", "tsc", "--noEmit", "--tsBuildInfoFile", "/private/tmp/farmos-core-day132-final-gate.tsbuildinfo", "--pretty", "false"], { cwd: root, encoding: "utf8" });
process.stdout.write(typecheck.stdout); process.stderr.write(typecheck.stderr);
const dependency = run("test-farm-os-approved-command-dependency-boundary");
const reportIntegrity = run("test-farm-os-approved-command-report");
const executed: Day132ExecutedEvidence = {
  targeted_test_exit_code: targeted.exitCode,
  day131_regression_exit_code: day131.exitCode,
  day130_5_regression_exit_code: [day130Runtime, day130Ledger, day130Fixture].every((item) => item.exitCode === 0) ? 0 : 1,
  typecheck_exit_code: typecheck.status,
  dependency_boundary_exit_code: dependency.exitCode,
  report_integrity_exit_code: reportIntegrity.exitCode,
};
const parseJsonLine = (text: string, predicate: (value: Record<string, unknown>) => boolean) => text.split("\n").map((line) => { try { return JSON.parse(line) as Record<string, unknown>; } catch { return null; } }).find((value): value is Record<string, unknown> => value !== null && predicate(value));
const fixture = parseJsonLine(targeted.stdout, (value) => value.schema_version === "farmos.day132.fixture.report.v1");
const boundary = parseJsonLine(dependency.stdout, (value) => Object.hasOwn(value, "builder_pure_dependency_boundary_valid"));
const machineChecksValid=fixture?.fixture_count===10&&fixture.fixture_pass_count===10&&fixture.fixture_fail_count===0&&boundary?.builder_pure_dependency_boundary_valid===true&&boundary.gateway_implementation_absent===true&&boundary.gateway_call_path_absent===true&&boundary.business_write_dependency_absent===true&&boundary.proposal_apply_dependency_absent===true;
const sourceCommit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).stdout.trim();
const treeHash = computeDay132TreeHash(root);
const build = parseDay132BuildEvidence(JSON.parse(readFileSync(buildPath, "utf8")));
const review = parseDay132ReviewArtifact(JSON.parse(readFileSync(reviewPath, "utf8")));
const gate = decideDay132Gate({ tree_hash: treeHash, source_commit: sourceCommit, executed, machine_checks_valid:machineChecksValid, build, review });
const counters = fixture?.test_observed_counters as Record<string, unknown> | undefined;
const report = {
  schema_version: "farmos.day132.final-report.v2",
  day: 132,
  generated_at: new Date().toISOString(),
  ...gate,
  fixture_count: fixture?.fixture_count ?? null,
  fixture_pass_count: fixture?.fixture_pass_count ?? null,
  fixture_fail_count: fixture?.fixture_fail_count ?? null,
  command_build_count: counters?.command_build_count ?? null,
  command_rejected_count: counters?.command_rejected_count ?? null,
  command_validation_count: counters?.command_validation_count ?? null,
  builder_pure_dependency_boundary_valid: boundary?.builder_pure_dependency_boundary_valid ?? false,
  gateway_implementation_absent: boundary?.gateway_implementation_absent ?? false,
  gateway_call_path_absent: boundary?.gateway_call_path_absent ?? false,
  business_write_dependency_absent: boundary?.business_write_dependency_absent ?? false,
  proposal_apply_dependency_absent: boundary?.proposal_apply_dependency_absent ?? false,
};
console.log(JSON.stringify(report, null, 2));
if (report.formal_decision !== "go") process.exitCode = 1;
