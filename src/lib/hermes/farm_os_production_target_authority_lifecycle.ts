export const FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MINIMUM = 1 as const;
export const FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MAXIMUM = 65_535 as const;

export type FarmOsProductionTargetAuthorityLifecycle = Readonly<{
  activates_at: string;
  expires_at: string;
  revoked: boolean;
}>;

export type FarmOsProductionTargetAuthorityLifecycleState =
  | "INVALID"
  | "NOT_YET_ACTIVE"
  | "ACTIVE"
  | "EXPIRED"
  | "REVOKED";

const CANONICAL_UTC_TIMESTAMP =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})\.(\d{3})Z$/u;

function leapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return leapYear(year) ? 29 : 28;
  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

export function parseFarmOsProductionTargetCanonicalTimestamp(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = CANONICAL_UTC_TIMESTAMP.exec(value);
  if (!match) return null;
  const [year, month, day, hour, minute, second, millisecond] =
    match.slice(1).map((part) => Number(part));
  if (year === undefined || month === undefined || day === undefined || hour === undefined ||
    minute === undefined || second === undefined || millisecond === undefined ||
    year < 1 || month < 1 || month > 12 || day < 1 ||
    day > daysInMonth(year, month) || hour > 23 || minute > 59 || second > 59) {
    return null;
  }
  const timestamp = Date.UTC(year, month - 1, day, hour, minute, second, millisecond);
  if (!Number.isFinite(timestamp)) return null;
  const canonical = new Date(timestamp).toISOString();
  return canonical === value ? timestamp : null;
}

export function isFarmOsProductionTargetAuthorityRevision(value: unknown): value is number {
  return Number.isInteger(value) &&
    Number(value) >= FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MINIMUM &&
    Number(value) <= FARM_OS_PRODUCTION_TARGET_AUTHORITY_REVISION_MAXIMUM;
}

export function evaluateFarmOsProductionTargetAuthorityLifecycle(
  lifecycle: FarmOsProductionTargetAuthorityLifecycle,
  now: string,
): FarmOsProductionTargetAuthorityLifecycleState {
  const activates = parseFarmOsProductionTargetCanonicalTimestamp(lifecycle.activates_at);
  const expires = parseFarmOsProductionTargetCanonicalTimestamp(lifecycle.expires_at);
  const current = parseFarmOsProductionTargetCanonicalTimestamp(now);
  if (activates === null || expires === null || current === null || activates >= expires ||
    typeof lifecycle.revoked !== "boolean") {
    return "INVALID";
  }
  if (lifecycle.revoked) return "REVOKED";
  if (current < activates) return "NOT_YET_ACTIVE";
  if (current >= expires) return "EXPIRED";
  return "ACTIVE";
}
