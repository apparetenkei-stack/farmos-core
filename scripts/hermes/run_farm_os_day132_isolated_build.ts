import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  DAY132_TEST_SUITE_VERSION,
  computeDay132TreeHash,
  type Day132BuildEvidence,
} from "./farm_os_day132_evidence";

const root = process.cwd();
const outputPath = process.argv.slice(2).find((argument) => argument !== "--");
if (!outputPath || !path.isAbsolute(outputPath)) throw new Error("absolute build evidence path required");
const sourceCommit = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
if (sourceCommit.status !== 0) throw new Error("source commit unavailable");
const reviewedTreeHash = computeDay132TreeHash(root);
const buildRoot = mkdtempSync(path.join(tmpdir(), "farmos-core-day132-build-"));
const copy = spawnSync("rsync", ["-a", "--exclude", ".git", "--exclude", "node_modules", "--exclude", ".next", "--exclude", ".turbo", "--exclude", "tsconfig.tsbuildinfo", "--exclude", ".env*", `${root}/`, `${buildRoot}/`], { stdio: "inherit" });
let exitCode = copy.status ?? 1;
if (exitCode === 0) {
  const install = spawnSync("pnpm", ["install", "--frozen-lockfile"], { cwd: buildRoot, stdio: "inherit" });
  exitCode = install.status ?? 1;
}
if (exitCode === 0) {
  const build = spawnSync("pnpm", ["run", "build"], { cwd: buildRoot, stdio: "inherit" });
  exitCode = build.status ?? 1;
}
const evidence: Day132BuildEvidence = {
  schema_version: "farmos.day132.build-evidence.v1",
  reviewed_tree_hash: reviewedTreeHash,
  source_commit: sourceCommit.stdout.trim(),
  test_suite_version: DAY132_TEST_SUITE_VERSION,
  command: "pnpm run build",
  exit_code: exitCode,
  generated_at: new Date().toISOString(),
};
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
const reread = JSON.parse(readFileSync(outputPath, "utf8")) as Day132BuildEvidence;
console.log(JSON.stringify({ ...reread, isolated_build_directory: buildRoot }));
process.exitCode = exitCode;
