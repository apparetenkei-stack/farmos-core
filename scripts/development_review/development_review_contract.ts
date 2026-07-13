export type DevelopmentReviewFinding = {
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  file: string;
  line: number | null;
  summary: string;
  reason: string;
  recommendation: string;
};

export type DevelopmentReviewResult = {
  result: "pass" | "conditional_pass" | "fail";
  reviewedHead: string;
  reviewedDiffHash: string;
  model: string;
  findings: DevelopmentReviewFinding[];
  unverified: string[];
  generatedAt: string;
};

export type DevelopmentReviewAssessment = Pick<DevelopmentReviewResult, "result" | "findings" | "unverified">;

export type DevelopmentReviewBundle = {
  schemaVersion: "farmos.development-review.bundle.v1";
  projectRoot: string;
  head: string;
  statusShort: string;
  diffStat: string;
  unstagedDiff: string;
  stagedDiff: string;
  changedFiles: string[];
  diffCheck: { ok: boolean; output: string };
  verificationResults: Array<{ command: string; status: "pass" | "fail" | "not_run"; summary: string }>;
  diffHash: string;
};

export type DevelopmentReviewErrorCode =
  | "review_configuration_missing"
  | "review_diff_collection_failed"
  | "review_dangerous_file_detected"
  | "review_diff_too_large"
  | "review_provider_unavailable"
  | "review_provider_timeout"
  | "review_provider_http_error"
  | "review_response_incomplete"
  | "review_response_invalid_json"
  | "review_response_invalid_schema"
  | "review_secret_candidate_detected"
  | "review_output_secret_candidate_detected"
  | "source_changed_during_review";
