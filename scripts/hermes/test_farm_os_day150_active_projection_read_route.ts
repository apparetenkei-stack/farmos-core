import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import * as route from "../../src/app/api/hermes/daily-operational-projection/active/route";

assert.equal(typeof route.GET, "function");
assert.equal(route.runtime, "nodejs");
assert.equal(route.dynamic, "force-dynamic");
for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
  assert.equal(Object.hasOwn(route, method), false);
}

const response = await route.GET(new Request(
  "http://localhost/api/hermes/daily-operational-projection/active",
));
assert.equal(response.status, 401);
assert.equal(response.headers.get("cache-control"), "no-store");
assert.deepEqual(await response.json(), { error: "unauthorized" });

const source = await readFile(
  new URL("../../src/app/api/hermes/daily-operational-projection/active/route.ts", import.meta.url),
  "utf8",
);
assert.equal((source.match(/serveFarmOsActiveProjectionRead\(/gu) ?? []).length, 1);
assert.equal((source.match(/createFarmOsActiveProjectionReadProductionDependencies\(/gu) ?? []).length, 1);
for (const forbidden of [
  "new Pool", "readProjectionBundle", "JSON.stringify", "authorization.includes",
  "candidate_id", "content_hash",
]) assert.equal(source.includes(forbidden), false);

console.log("farm_os_day150_active_projection_read_route: PASS");
