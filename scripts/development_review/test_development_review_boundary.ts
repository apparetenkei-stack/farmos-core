import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createDevelopmentReviewBundle, DevelopmentReviewBundleError, isDangerousReviewPath, type DevelopmentReviewGit } from "./development_review_bundle";
import { createDevelopmentReviewPrompt, parseDevelopmentReviewAssessment, requestDevelopmentReview } from "./development_review_provider";
import { containsDevelopmentReviewSecretCandidate } from "./development_review_content_scan";
import { getDevelopmentReviewOutputPaths, runDevelopmentReviewWorkflow, saveDevelopmentReview } from "./run_development_review";

type GitOutput = { stdout: string; stderr: string; exitCode: number };
const baseOutputs = (root = "/repo") => new Map<string, GitOutput>([
  ["rev-parse --show-toplevel", { stdout: `${root}\n`, stderr: "", exitCode: 0 }], ["rev-parse HEAD", { stdout: "abc123\n", stderr: "", exitCode: 0 }],
  ["status --short", { stdout: " M unstaged.ts\nM  staged.ts\n", stderr: "", exitCode: 0 }], ["diff --stat", { stdout: "2 files changed\n", stderr: "", exitCode: 0 }],
  ["diff --no-ext-diff --binary", { stdout: "diff --git a/unstaged.ts b/unstaged.ts\n+unstaged\n", stderr: "", exitCode: 0 }],
  ["diff --cached --no-ext-diff --binary", { stdout: "diff --git a/staged.ts b/staged.ts\n+staged\n", stderr: "", exitCode: 0 }],
  ["diff --name-only", { stdout: "unstaged.ts\n", stderr: "", exitCode: 0 }], ["diff --cached --name-only", { stdout: "staged.ts\n", stderr: "", exitCode: 0 }],
  ["ls-files --others --exclude-standard", { stdout: "", stderr: "", exitCode: 0 }], ["diff --check", { stdout: "", stderr: "", exitCode: 0 }],
]);
const fakeGit = (values: Map<string, GitOutput>): DevelopmentReviewGit => ({ async run(args) { return values.get(args.join(" ")) ?? { stdout: "", stderr: "", exitCode: 1 }; } });
const validAssessment = (result: "pass" | "conditional_pass" | "fail" = "pass") => ({
  result, findings: result === "pass" ? [] : [{ severity: result === "fail" ? "high" : "low",
    category: "test", file: "staged.ts", line: 1, summary: "summary", reason: "reason", recommendation: "recommendation" }], unverified: [],
});
const http = (body: unknown, status = 200, finishReason = "stop", onCall?: () => void) => async (_url: string, init: RequestInit) => {
  onCall?.(); const requestBody = String(init.body); const expectedAuthorization = ["Bearer", "test-token"].join(" ");
  assert.equal(requestBody.includes("test-token"), false); assert.equal((init.headers as Record<string,string>).authorization, expectedAuthorization);
  return new Response(JSON.stringify({ choices: [{ finish_reason: finishReason, message: { content: typeof body === "string" ? body : JSON.stringify(body) } }] }), { status });
};
const config = { baseUrl: "http://lmstudio.invalid", apiToken: "test-token", model: "qwen-test", timeoutMs: 50 };
const CLOCK_ISO = "2026-07-13T03:04:05.000Z"; const clock = () => new Date(CLOCK_ISO);
async function expectCode(action: () => Promise<unknown>, code: string) { await assert.rejects(action, (error: unknown) => error instanceof DevelopmentReviewBundleError && error.code === code); }
const emptyOutputs = (root: string) => { const values = baseOutputs(root); for (const key of ["status --short", "diff --stat", "diff --no-ext-diff --binary", "diff --cached --no-ext-diff --binary", "diff --name-only", "diff --cached --name-only", "ls-files --others --exclude-standard", "diff --check"]) values.set(key, { stdout: "", stderr: "", exitCode: 0 }); return values; };

async function main() {
  const bundle = await createDevelopmentReviewBundle({ git: fakeGit(baseOutputs()) }); assert.match(bundle.unstagedDiff, /unstaged/u); assert.match(bundle.stagedDiff, /staged/u);
  const prompt = createDevelopmentReviewPrompt(bundle); for (const runnerOwnedField of ["reviewedHead", "reviewedDiffHash", "model", "generatedAt"])
    assert.equal(prompt.includes(`"${runnerOwnedField}"`), false);
  assert.deepEqual(bundle.changedFiles, ["staged.ts", "unstaged.ts"]); for (const result of ["pass", "conditional_pass", "fail"] as const)
    assert.equal((await requestDevelopmentReview({ bundle, config, fetchImpl: http(validAssessment(result)), now: clock })).result, result);
  const runnerOwned = await requestDevelopmentReview({ bundle, config, fetchImpl: http(validAssessment()), now: clock });
  assert.equal(runnerOwned.reviewedHead, bundle.head); assert.equal(runnerOwned.reviewedDiffHash, bundle.diffHash);
  assert.equal(runnerOwned.model, config.model); assert.equal(runnerOwned.generatedAt, CLOCK_ISO);
  await expectCode(() => requestDevelopmentReview({ bundle, config, fetchImpl: http({}, 500) }), "review_provider_http_error");
  await expectCode(() => requestDevelopmentReview({ bundle, config, fetchImpl: http("not json") }), "review_response_invalid_json");
  await expectCode(() => requestDevelopmentReview({ bundle, config, fetchImpl: http({ result: "pass" }) }), "review_response_invalid_schema");
  await expectCode(() => requestDevelopmentReview({ bundle, config, fetchImpl: http(validAssessment(), 200, "length") }), "review_response_incomplete");
  await expectCode(() => requestDevelopmentReview({ bundle, config: { ...config, timeoutMs: 5 }, fetchImpl: (_url, init) => new Promise((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))) ) }), "review_provider_timeout");

  for (const path of [".env.local", "secret.pem", "private.key", "certificate.der", "backups/db.dump", "credentials/token.txt", "fixture.csv", "database.sqlite", "node_modules/a.js", ".next/a.js"]) assert.equal(isDangerousReviewPath(path), true);
  const bearerCandidate = ["Authorization:", "Bearer", "abcdefghijklmnop"].join(" ");
  const privateKeyCandidate = ["-----BEGIN", "PRIVATE KEY-----"].join(" ");
  const databaseUrlCandidate = ["postgresql://user", "password@localhost/db"].join(":");
  const secretCases = [bearerCandidate, privateKeyCandidate, databaseUrlCandidate];
  for (const candidate of secretCases) assert.equal(containsDevelopmentReviewSecretCandidate(candidate), true);
  for (const candidate of secretCases) { const values = baseOutputs(); values.set("diff --no-ext-diff --binary", { stdout: `diff --git a/safe.ts b/safe.ts\n+${candidate}\n`, stderr: "", exitCode: 0 });
    await expectCode(() => createDevelopmentReviewBundle({ git: fakeGit(values) }), "review_secret_candidate_detected"); }
  assert.equal(containsDevelopmentReviewSecretCandidate("550e8400-e29b-41d4-a716-446655440000"), false); assert.equal(containsDevelopmentReviewSecretCandidate("9c7fe92abcdef0123456789"), false);
  const secretValue = ["Bearer", "abcdefghijklmnop"].join(" "); const secretValues = baseOutputs(); secretValues.set("diff --no-ext-diff --binary", { stdout: `diff --git a/safe.ts b/safe.ts\n+Authorization: ${secretValue}\n`, stderr: "", exitCode: 0 });
  try { await createDevelopmentReviewBundle({ git: fakeGit(secretValues) }); assert.fail("secret accepted"); } catch (error) { assert.equal(String(error).includes(secretValue), false); }

  const assessment = validAssessment(); const parsed = parseDevelopmentReviewAssessment(assessment);
  assert.deepEqual(Object.keys(parsed!).sort(), ["findings", "result", "unverified"].sort());
  for (const ownedField of ["generatedAt", "reviewedHead", "reviewedDiffHash", "model"])
    assert.equal(parseDevelopmentReviewAssessment({ ...assessment, [ownedField]: "llm-owned" }), null);
  assert.equal(parseDevelopmentReviewAssessment({ ...assessment, unexpected: true }), null);
  assert.equal(parseDevelopmentReviewAssessment({ ...assessment, findings: [{ severity: "low", category: "x", file: "x.ts", line: null, summary: "x", reason: "x", recommendation: "x", unexpected: true }] }), null);

  const root = await mkdtemp(join(tmpdir(), "farmos-review-test-")); const paths = getDevelopmentReviewOutputPaths(root); const values = baseOutputs(root);
  const initial = await createDevelopmentReviewBundle({ git: fakeGit(values) }); const sourcePath = new URL("./development_review_bundle.ts", import.meta.url); const sourceBefore = await readFile(sourcePath, "utf8");
  const originalCwd = process.cwd(); await mkdir(join(root, "nested")); process.chdir(join(root, "nested")); let success: Awaited<ReturnType<typeof runDevelopmentReviewWorkflow>>;
  try { success = await runDevelopmentReviewWorkflow({ git: fakeGit(values), config, fetchImpl: http(validAssessment()), now: clock }); } finally { process.chdir(originalCwd); }
  assert.equal(success.outputSaved, true);
  const savedJson = JSON.parse(await readFile(paths.json, "utf8")); const savedMarkdown = await readFile(paths.markdown, "utf8");
  assert.equal(savedJson.reviewedDiffHash, initial.diffHash); assert.equal(savedJson.generatedAt, CLOCK_ISO);
  assert.match(savedMarkdown, /Development Review/u); assert.match(savedMarkdown, new RegExp(CLOCK_ISO.replaceAll(".", "\\."), "u"));
  assert.equal(await readFile(sourcePath, "utf8"), sourceBefore); assert.equal(paths.directory, join(root, "reviews"));

  await writeFile(paths.json, "old"); await writeFile(paths.markdown, "old"); const changed = baseOutputs(root); const beforeChange = await createDevelopmentReviewBundle({ git: fakeGit(changed) });
  await expectCode(() => runDevelopmentReviewWorkflow({ git: fakeGit(changed), config, fetchImpl: http(validAssessment(), 200, "stop", () => {
    changed.set("diff --no-ext-diff --binary", { stdout: "diff --git a/unstaged.ts b/unstaged.ts\n+changed\n", stderr: "", exitCode: 0 });
  }) }), "source_changed_during_review"); await assert.rejects(() => readFile(paths.json)); await assert.rejects(() => readFile(paths.markdown));

  const headChanged = baseOutputs(root); const beforeHead = await createDevelopmentReviewBundle({ git: fakeGit(headChanged) }); await expectCode(() => runDevelopmentReviewWorkflow({ git: fakeGit(headChanged), config,
    fetchImpl: http(validAssessment(), 200, "stop", () => headChanged.set("rev-parse HEAD", { stdout: "def456\n", stderr: "", exitCode: 0 })) }), "source_changed_during_review");

  await writeFile(paths.json, "old"); await writeFile(paths.markdown, "old"); let emptyHttpCalls = 0; const noChanges = await runDevelopmentReviewWorkflow({ git: fakeGit(emptyOutputs(root)),
    fetchImpl: async () => { emptyHttpCalls += 1; throw new Error("must not call"); } }); assert.equal(noChanges.status, "no_changes"); assert.equal(emptyHttpCalls, 0);
  await assert.rejects(() => readFile(paths.json)); await assert.rejects(() => readFile(paths.markdown));

  const outputSecret = { ...runnerOwned, findings: [{ severity: "high" as const, category: "secret", file: "safe.ts", line: 1, summary: bearerCandidate, reason: "reason", recommendation: "remove" }] };
  await expectCode(() => saveDevelopmentReview(root, outputSecret), "review_output_secret_candidate_detected"); await assert.rejects(() => readFile(paths.json));
  const implementation = `${createDevelopmentReviewBundle.toString()}${requestDevelopmentReview.toString()}${runDevelopmentReviewWorkflow.toString()}`;
  assert.doesNotMatch(implementation, /codex exec|INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|supabase|postgres/iu);
  console.log(JSON.stringify({ result: "ok", checked: "development_review_boundary", secret_diff_rejected: true, strict_canonical_schema: true, runner_owned_metadata: true,
    source_change_rejected: true, stale_latest_invalidated: true, output_secret_rejected: true, empty_diff_no_http: true,
    project_root_fixed: true, atomic_success_output: true, source_code_changed: false, db_write_performed: false, codex_execution_performed: false }, null, 2));
}
void main().catch((error) => { console.error(error instanceof Error ? error.message : "development_review_test_failed"); process.exitCode = 1; });
