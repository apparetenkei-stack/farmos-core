export const FARM_OS_BUSINESS_TIMEZONE = "Asia/Tokyo" as const;

const BUSINESS_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const CANONICAL_ISO_TIMESTAMP_PATTERN =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u;

function isLeapYear(year: number): boolean {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

export function isFarmOsBusinessDate(value: unknown): value is string {
  if (typeof value !== "string" || !BUSINESS_DATE_PATTERN.test(value)) {
    return false;
  }
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) {
    return false;
  }
  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 &&
    day <= daysInMonth[month - 1]!;
}

function isCanonicalIsoTimestamp(value: string): boolean {
  if (!CANONICAL_ISO_TIMESTAMP_PATTERN.test(value)) return false;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString() === value;
}

export function deriveFarmOsBusinessDate(timestamp: string): string | null {
  if (!isCanonicalIsoTimestamp(timestamp)) return null;
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: FARM_OS_BUSINESS_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(timestamp));
  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  const businessDate = `${values.year}-${values.month}-${values.day}`;
  return isFarmOsBusinessDate(businessDate) ? businessDate : null;
}
