import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { DevelopmentReviewBundle, DevelopmentReviewErrorCode } from "./development_review_contract";
import { findSecretCandidateFileInPatch } from "./development_review_content_scan";

const execFileAsync = promisify(execFile);
const MAX_DIFF_BYTES = 2_000_000;

export type DevelopmentReviewGit = { run: (args: string[]) => Promise<{ stdout: string; stderr: string; exitCode: number }> };
export const systemDevelopmentReviewGit: DevelopmentReviewGit = { async run(args) {
  try { const value = await execFileAsync("git", args, { maxBuffer: MAX_DIFF_BYTES + 100_000 }); return { stdout: value.stdout, stderr: value.stderr, exitCode: 0 }; }
  catch (error) { const value = error as { stdout?: string; stderr?: string; code?: number }; return { stdout: value.stdout ?? "", stderr: value.stderr ?? "", exitCode: value.code ?? 1 }; }
} };

export class DevelopmentReviewBundleError extends Error { constructor(public readonly code: DevelopmentReviewErrorCode, public readonly targetFile: string | null = null) { super(code); } }

export function isDangerousReviewPath(path: string): boolean {
  const normalized = path.replaceAll("\\", "/").toLowerCase();
  const base = normalized.split("/").at(-1) ?? normalized;
  return normalized.split("/").some((part) => ["node_modules", ".next", ".git", "backups", "backup", "credentials"].includes(part)) ||
    base === ".env" || base.startsWith(".env.") || /\.(pem|key|p12|pfx|crt|cer|der|dump|backup|bak|sql\.gz|db|sqlite|sqlite3|csv)$/u.test(base) ||
    /(?:^|[-_.])(credential|credentials|secret|secrets)(?:[-_.]|$)/u.test(base) ||
    /(?:real|production|prod)[-_].*\.csv$/u.test(base);
}

const lines = (value: string) => value.split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
async function required(git: DevelopmentReviewGit, args: string[]) { const result = await git.run(args); if (result.exitCode !== 0) throw new DevelopmentReviewBundleError("review_diff_collection_failed"); return result.stdout; }

export async function createDevelopmentReviewBundle(input: { git?: DevelopmentReviewGit; verificationResults?: DevelopmentReviewBundle["verificationResults"] } = {}): Promise<DevelopmentReviewBundle> {
  const git = input.git ?? systemDevelopmentReviewGit;
  const [projectRoot, head, statusShort, unstagedNames, stagedNames, untrackedNames] = await Promise.all([
    required(git, ["rev-parse", "--show-toplevel"]), required(git, ["rev-parse", "HEAD"]), required(git, ["status", "--short"]), required(git, ["diff", "--name-only"]),
    required(git, ["diff", "--cached", "--name-only"]), required(git, ["ls-files", "--others", "--exclude-standard"]),
  ]);
  const untrackedFiles = lines(untrackedNames);
  const changedFiles = [...new Set([...lines(unstagedNames), ...lines(stagedNames), ...untrackedFiles])].sort();
  if (changedFiles.some(isDangerousReviewPath)) throw new DevelopmentReviewBundleError("review_dangerous_file_detected");
  const [diffStat, trackedUnstagedDiff, stagedDiff, diffCheck] = await Promise.all([
    required(git, ["diff", "--stat"]), required(git, ["diff", "--no-ext-diff", "--binary"]),
    required(git, ["diff", "--cached", "--no-ext-diff", "--binary"]), git.run(["diff", "--check"]),
  ]);
  const untrackedPatches: string[] = [];
  for (const path of untrackedFiles) {
    const patch = await git.run(["diff", "--no-index", "--binary", "--", "/dev/null", path]);
    if (patch.exitCode !== 0 && patch.exitCode !== 1) throw new DevelopmentReviewBundleError("review_diff_collection_failed");
    untrackedPatches.push(patch.stdout);
  }
  const unstagedDiff = [trackedUnstagedDiff, ...untrackedPatches].filter(Boolean).join("\n");
  if (Buffer.byteLength(unstagedDiff) + Buffer.byteLength(stagedDiff) > MAX_DIFF_BYTES) throw new DevelopmentReviewBundleError("review_diff_too_large");
  const secretFile = findSecretCandidateFileInPatch(unstagedDiff) ?? findSecretCandidateFileInPatch(stagedDiff);
  if (secretFile) throw new DevelopmentReviewBundleError("review_secret_candidate_detected", secretFile);
  const hashInput = JSON.stringify({ head: head.trim(), unstagedDiff, stagedDiff, changedFiles });
  return { schemaVersion: "farmos.development-review.bundle.v1", projectRoot: projectRoot.trim(), head: head.trim(), statusShort, diffStat, unstagedDiff, stagedDiff,
    changedFiles, diffCheck: { ok: diffCheck.exitCode === 0, output: diffCheck.stdout || diffCheck.stderr },
    verificationResults: input.verificationResults ?? [], diffHash: createHash("sha256").update(hashInput).digest("hex") };
}
