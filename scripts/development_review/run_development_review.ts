import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { createDevelopmentReviewBundle, DevelopmentReviewBundleError, systemDevelopmentReviewGit, type DevelopmentReviewGit } from "./development_review_bundle";
import { requestDevelopmentReview, type DevelopmentReviewFetch, type DevelopmentReviewProviderConfig } from "./development_review_provider";
import { containsDevelopmentReviewSecretCandidate } from "./development_review_content_scan";
import type { DevelopmentReviewResult } from "./development_review_contract";

function readConfig(): DevelopmentReviewProviderConfig {
  const baseUrl = process.env.DEVELOPMENT_REVIEW_LMSTUDIO_BASE_URL; const model = process.env.DEVELOPMENT_REVIEW_MODEL;
  if (!baseUrl || !model) throw new DevelopmentReviewBundleError("review_configuration_missing");
  let url: URL; try { url = new URL(baseUrl); } catch { throw new DevelopmentReviewBundleError("review_configuration_missing"); }
  if (!["http:", "https:"].includes(url.protocol)) throw new DevelopmentReviewBundleError("review_configuration_missing");
  const timeout = Number(process.env.DEVELOPMENT_REVIEW_TIMEOUT_MS ?? "120000");
  if (!Number.isInteger(timeout) || timeout < 1000 || timeout > 300000) throw new DevelopmentReviewBundleError("review_configuration_missing");
  return { baseUrl: url.toString(), model, apiToken: process.env.DEVELOPMENT_REVIEW_LMSTUDIO_API_TOKEN, timeoutMs: timeout };
}

export function renderDevelopmentReviewMarkdown(result: DevelopmentReviewResult): string {
  const findings = result.findings.length === 0 ? "No findings." : result.findings.map((item) =>
    `- **${item.severity.toUpperCase()}** ${item.file}${item.line === null ? "" : `:${item.line}`} — ${item.summary}\n  - Reason: ${item.reason}\n  - Recommendation: ${item.recommendation}`).join("\n");
  const unverified = result.unverified.length === 0 ? "None." : result.unverified.map((item) => `- ${item}`).join("\n");
  return `# Development Review\n\n- Result: ${result.result}\n- HEAD: ${result.reviewedHead}\n- Diff hash: ${result.reviewedDiffHash}\n- Model: ${result.model}\n- Generated: ${result.generatedAt}\n\n## Findings\n\n${findings}\n\n## Unverified\n\n${unverified}\n`;
}

export function getDevelopmentReviewOutputPaths(projectRoot: string) {
  if (!isAbsolute(projectRoot)) throw new DevelopmentReviewBundleError("review_diff_collection_failed");
  const directory = resolve(projectRoot, "reviews");
  return { directory, json: resolve(directory, "latest-review.json"), markdown: resolve(directory, "latest-review.md"),
    jsonTemporary: resolve(directory, ".latest-review.json.tmp"), markdownTemporary: resolve(directory, ".latest-review.md.tmp") };
}

export async function resolveDevelopmentReviewProjectRoot(git: DevelopmentReviewGit = systemDevelopmentReviewGit): Promise<string> {
  const result = await git.run(["rev-parse", "--show-toplevel"]); const root = result.stdout.trim();
  if (result.exitCode !== 0 || !isAbsolute(root)) throw new DevelopmentReviewBundleError("review_diff_collection_failed"); return root;
}

export async function invalidateLatestDevelopmentReview(projectRoot: string) {
  const paths = getDevelopmentReviewOutputPaths(projectRoot); await mkdir(paths.directory, { recursive: true });
  await Promise.all([paths.json, paths.markdown, paths.jsonTemporary, paths.markdownTemporary].map((path) => unlink(path).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") throw error;
  })));
}

export async function saveDevelopmentReview(projectRoot: string, result: DevelopmentReviewResult) {
  const paths = getDevelopmentReviewOutputPaths(projectRoot); const json = `${JSON.stringify(result, null, 2)}\n`; const markdown = renderDevelopmentReviewMarkdown(result);
  if (containsDevelopmentReviewSecretCandidate(json) || containsDevelopmentReviewSecretCandidate(markdown))
    throw new DevelopmentReviewBundleError("review_output_secret_candidate_detected", "reviews/latest-review");
  await mkdir(paths.directory, { recursive: true });
  try {
    await writeFile(paths.jsonTemporary, json, { encoding: "utf8", mode: 0o600 });
    await writeFile(paths.markdownTemporary, markdown, { encoding: "utf8", mode: 0o600 });
    await rename(paths.jsonTemporary, paths.json); await rename(paths.markdownTemporary, paths.markdown);
  } catch (error) {
    await Promise.all([paths.json, paths.markdown, paths.jsonTemporary, paths.markdownTemporary].map((path) => unlink(path).catch(() => undefined)));
    throw error;
  }
}

export async function runDevelopmentReviewWorkflow(input: { config?: DevelopmentReviewProviderConfig; configFactory?: () => DevelopmentReviewProviderConfig; git?: DevelopmentReviewGit; fetchImpl?: DevelopmentReviewFetch; now?: () => Date }) {
  const git = input.git ?? systemDevelopmentReviewGit; const projectRoot = await resolveDevelopmentReviewProjectRoot(git);
  await invalidateLatestDevelopmentReview(projectRoot);
  const initial = await createDevelopmentReviewBundle({ git });
  if (initial.projectRoot !== projectRoot) throw new DevelopmentReviewBundleError("review_diff_collection_failed");
  if (initial.changedFiles.length === 0 && initial.unstagedDiff.length === 0 && initial.stagedDiff.length === 0)
    return { ok: true as const, status: "no_changes" as const, providerCalled: false, outputSaved: false, projectRoot };
  const config = input.config ?? input.configFactory?.(); if (!config) throw new DevelopmentReviewBundleError("review_configuration_missing");
  const result = await requestDevelopmentReview({ bundle: initial, config, fetchImpl: input.fetchImpl, now: input.now });
  const current = await createDevelopmentReviewBundle({ git });
  if (current.projectRoot !== projectRoot || current.head !== initial.head || current.diffHash !== initial.diffHash)
    throw new DevelopmentReviewBundleError("source_changed_during_review");
  await saveDevelopmentReview(projectRoot, result);
  return { ok: true as const, status: result.result, providerCalled: true, outputSaved: true, projectRoot, result };
}

async function main() {
  try { const outcome = await runDevelopmentReviewWorkflow({ configFactory: readConfig });
    console.log(JSON.stringify(outcome.status === "no_changes" ? { ok: true, status: "no_changes", review_saved: false, provider_called: false } :
      { ok: true, result: outcome.status, reviewedHead: outcome.result.reviewedHead, reviewedDiffHash: outcome.result.reviewedDiffHash,
        findings: outcome.result.findings.length, output: ["reviews/latest-review.json", "reviews/latest-review.md"], source_code_changed: false }));
  } catch (error) { const known = error instanceof DevelopmentReviewBundleError ? error : new DevelopmentReviewBundleError("review_provider_unavailable");
    console.error(JSON.stringify({ ok: false, error_code: known.code, target_file: known.targetFile, review_saved: false, source_code_changed: known.code === "source_changed_during_review" })); process.exitCode = 1; }
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
