import type { DevelopmentReviewAssessment, DevelopmentReviewBundle, DevelopmentReviewResult } from "./development_review_contract";
import { DevelopmentReviewBundleError } from "./development_review_bundle";

export type DevelopmentReviewFetch = (input: string, init: RequestInit) => Promise<Response>;
export type DevelopmentReviewProviderConfig = { baseUrl: string; apiToken?: string; model: string; timeoutMs: number };

const text = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const exactKeys = (value: Record<string, unknown>, allowed: readonly string[]) => {
  const actual = Object.keys(value).sort(); const expected = [...allowed].sort();
  return actual.length === expected.length && actual.every((key, index) => key === expected[index]);
};
export function parseDevelopmentReviewAssessment(value: unknown): DevelopmentReviewAssessment | null {
  if (!value || typeof value !== "object") return null;
  const result = value as Record<string, unknown>;
  if (!exactKeys(result, ["result", "findings", "unverified"])) return null;
  if (!["pass", "conditional_pass", "fail"].includes(String(result.result)) || !Array.isArray(result.findings) ||
    !Array.isArray(result.unverified) || !result.unverified.every(text)) return null;
  for (const item of result.findings) {
    if (!item || typeof item !== "object") return null;
    const finding = item as Record<string, unknown>;
    if (!exactKeys(finding, ["severity", "category", "file", "line", "summary", "reason", "recommendation"])) return null;
    if (!["critical", "high", "medium", "low"].includes(String(finding.severity)) || !text(finding.category) ||
      !text(finding.file) || !(finding.line === null || (Number.isInteger(finding.line) && Number(finding.line) > 0)) ||
      !text(finding.summary) || !text(finding.reason) || !text(finding.recommendation)) return null;
  }
  return {
    result: result.result as DevelopmentReviewResult["result"],
    findings: result.findings.map((item) => { const finding = item as Record<string, unknown>; return {
      severity: finding.severity as DevelopmentReviewResult["findings"][number]["severity"], category: finding.category as string,
      file: finding.file as string, line: finding.line as number | null, summary: finding.summary as string,
      reason: finding.reason as string, recommendation: finding.recommendation as string,
    }; }),
    unverified: [...result.unverified] as string[],
  };
}

export function createDevelopmentReviewPrompt(bundle: DevelopmentReviewBundle): string {
  return `You are a read-only code reviewer for FarmOS Core. Do not change code or invoke tools. Review only the supplied Git diff. Prioritize AGENTS.md safety: Proposal First, Human Approval, no business DB writes, Secret protection, authentication/authorization, retry, idempotency, regressions, and missing tests. Sort findings by severity. Separate verified facts from inference and list anything not verifiable from the diff. Recommend minimal changes. Output JSON only, with no markdown or surrounding text. The exact schema is {"result":"pass|conditional_pass|fail","findings":[{"severity":"critical|high|medium|low","category":"string","file":"string","line":null,"summary":"string","reason":"string","recommendation":"string"}],"unverified":["string"]}. Do not add metadata or any other fields.\nREVIEW_BUNDLE:\n${JSON.stringify(bundle)}`;
}

export async function requestDevelopmentReview(input: { bundle: DevelopmentReviewBundle; config: DevelopmentReviewProviderConfig; fetchImpl?: DevelopmentReviewFetch; now?: () => Date }): Promise<DevelopmentReviewResult> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), input.config.timeoutMs);
  try {
    const response = await (input.fetchImpl ?? fetch)(`${input.config.baseUrl.replace(/\/+$/u, "")}/v1/chat/completions`, { method: "POST", signal: controller.signal,
      headers: { "content-type": "application/json", ...(input.config.apiToken ? { authorization: `Bearer ${input.config.apiToken}` } : {}) },
      body: JSON.stringify({ model: input.config.model, temperature: 0, stream: false, messages: [{ role: "user", content: createDevelopmentReviewPrompt(input.bundle) }] }) });
    if (!response.ok) throw new DevelopmentReviewBundleError("review_provider_http_error");
    let envelope: unknown; try { envelope = await response.json(); } catch { throw new DevelopmentReviewBundleError("review_response_invalid_json"); }
    if (!envelope || typeof envelope !== "object") throw new DevelopmentReviewBundleError("review_response_invalid_json");
    const choice = (envelope as { choices?: unknown[] }).choices?.[0] as { finish_reason?: unknown; message?: { content?: unknown } } | undefined;
    if (choice?.finish_reason !== "stop" || !text(choice.message?.content)) throw new DevelopmentReviewBundleError("review_response_incomplete");
    let parsed: unknown; try { parsed = JSON.parse(choice.message.content); } catch { throw new DevelopmentReviewBundleError("review_response_invalid_json"); }
    const assessment = parseDevelopmentReviewAssessment(parsed);
    if (!assessment) throw new DevelopmentReviewBundleError("review_response_invalid_schema");
    return { ...assessment, reviewedHead: input.bundle.head, reviewedDiffHash: input.bundle.diffHash,
      model: input.config.model, generatedAt: (input.now ?? (() => new Date()))().toISOString() };
  } catch (error) {
    if (error instanceof DevelopmentReviewBundleError) throw error;
    if (error instanceof Error && error.name === "AbortError") throw new DevelopmentReviewBundleError("review_provider_timeout");
    throw new DevelopmentReviewBundleError("review_provider_unavailable");
  } finally { clearTimeout(timer); }
}
