import assert from "node:assert/strict";

import {
  deriveFarmOsBusinessDate,
  FARM_OS_BUSINESS_TIMEZONE,
  isFarmOsBusinessDate,
} from "../../src/lib/hermes/farm_os_business_date";
import {
  deriveHermesDailyFarmBusinessDate,
} from "./brief_runtime/hermes_daily_farm_brief_generation_contract";

assert.equal(FARM_OS_BUSINESS_TIMEZONE, "Asia/Tokyo");
assert.equal(deriveFarmOsBusinessDate("2026-08-06T03:04:05.000Z"), "2026-08-06");
assert.equal(deriveFarmOsBusinessDate("2026-08-06T18:00:00.000Z"), "2026-08-07");
assert.equal(deriveFarmOsBusinessDate("2026-08-06T14:59:59.999Z"), "2026-08-06");
assert.equal(deriveFarmOsBusinessDate("2026-08-06T15:00:00.000Z"), "2026-08-07");
assert.equal(deriveFarmOsBusinessDate("2026-08-06T15:00:00.001Z"), "2026-08-07");
assert.equal(deriveFarmOsBusinessDate("2028-02-28T15:00:00.000Z"), "2028-02-29");
assert.equal(isFarmOsBusinessDate("2028-02-29"), true);
assert.equal(isFarmOsBusinessDate("2027-02-29"), false);
assert.equal(isFarmOsBusinessDate("2026-04-31"), false);
assert.equal(deriveFarmOsBusinessDate("2026-08-06T15:00:00Z"), null);
assert.equal(deriveFarmOsBusinessDate("2026-08-06T24:00:00.000Z"), null);
assert.equal(deriveFarmOsBusinessDate("not-a-date"), null);

const previousTimezone = process.env.TZ;
try {
  process.env.TZ = "America/Los_Angeles";
  assert.equal(deriveFarmOsBusinessDate("2026-08-06T15:00:00.000Z"), "2026-08-07");
  process.env.TZ = "Pacific/Kiritimati";
  assert.equal(deriveFarmOsBusinessDate("2026-08-06T15:00:00.000Z"), "2026-08-07");
} finally {
  if (previousTimezone === undefined) delete process.env.TZ;
  else process.env.TZ = previousTimezone;
}

for (const timestamp of [
  "2026-07-14T14:59:59.999Z",
  "2026-07-14T15:00:00.000Z",
  "not-a-date",
]) {
  assert.equal(
    deriveHermesDailyFarmBusinessDate(timestamp),
    deriveFarmOsBusinessDate(timestamp),
  );
}

console.log("farm_os_day150_business_date: PASS");
