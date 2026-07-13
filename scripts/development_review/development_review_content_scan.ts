const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/iu,
  /authorization\s*[:=]\s*["']?bearer\s+[a-z0-9._~+\/-]{8,}/iu,
  /\b(?:password|passwd|secret|token|api[_ -]?key)\b\s*[:=]\s*(?:["'][^"'\r\n]{12,}["']|[a-z0-9_+\/.~-]{16,})/iu,
  /\b(?:postgres|postgresql|mysql|mariadb|mongodb(?:\+srv)?|redis|amqp):\/\/[^\s:@/]+:[^\s@/]+@[^\s/]+/iu,
  /\b(?:gh[pousr]_[a-z0-9]{20,}|github_pat_[a-z0-9_]{20,})\b/iu,
  /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/u,
  /\beyJ[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\.[a-zA-Z0-9_-]{8,}\b/u,
];

export function containsDevelopmentReviewSecretCandidate(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function findSecretCandidateFileInPatch(patch: string): string | null {
  let currentFile: string | null = null;
  for (const line of patch.split(/\r?\n/u)) {
    const header = /^diff --git a\/(.+) b\/(.+)$/u.exec(line);
    if (header) currentFile = header[2];
    if (containsDevelopmentReviewSecretCandidate(line)) return currentFile ?? "unknown";
  }
  return null;
}
