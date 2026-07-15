import { createHash } from "node:crypto";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function canonicalHermesDailyFarmBriefPersistenceJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalHermesDailyFarmBriefPersistenceJson).join(",")}]`;
  if (isRecord(value)) {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalHermesDailyFarmBriefPersistenceJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function fingerprintHermesDailyFarmBriefProjectableSource(input: {
  snapshot: unknown;
  scopeIndex: unknown;
}): string {
  return createHash("sha256")
    .update(canonicalHermesDailyFarmBriefPersistenceJson({ snapshot: input.snapshot, scope_index: input.scopeIndex }), "utf8")
    .digest("hex");
}

export function fingerprintHermesDailyFarmBriefPersistenceCommandPayload(value: unknown): string {
  return createHash("sha256")
    .update(canonicalHermesDailyFarmBriefPersistenceJson(value), "utf8")
    .digest("hex");
}
