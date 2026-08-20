import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_GATE13_OWNED_RESOURCES,
  FARM_OS_DAY150_GATE13_OWNER_LABEL_KEY,
  FARM_OS_DAY150_GATE13_OWNER_LABEL_VALUE,
  cleanupFarmOsDay150Gate13OwnedResources,
  reconcileFarmOsDay150Gate13OwnedResource,
  settleFarmOsDay150Gate13Creation,
  type FarmOsDay150Gate13OwnedResourceAdapter,
} from "./lib/farm_os_day150_gate13_owned_resource_reconciliation";

type Kind = keyof typeof FARM_OS_DAY150_GATE13_OWNED_RESOURCES;
const present = new Map<Kind, Readonly<{ owned: boolean; running: boolean }>>();
const touched: string[] = [];
const inspectJson = (kind: Kind, name: string, state: Readonly<{ owned: boolean;
  running: boolean }>) => JSON.stringify([{ Name: kind === "container" ? `/${name}` : name,
    ...(kind === "container" ? { Config: { Labels: {
      [FARM_OS_DAY150_GATE13_OWNER_LABEL_KEY]: state.owned
        ? FARM_OS_DAY150_GATE13_OWNER_LABEL_VALUE : "unrelated",
    } }, State: { Running: state.running } } : { Labels: {
      [FARM_OS_DAY150_GATE13_OWNER_LABEL_KEY]: state.owned
        ? FARM_OS_DAY150_GATE13_OWNER_LABEL_VALUE : "unrelated",
    } }) }]);
const adapter: FarmOsDay150Gate13OwnedResourceAdapter = {
  async inspect(kind, name) {
    const state = present.get(kind);
    return state ? { exit_code: 0, stdout: inspectJson(kind, name, state), stderr: "" } :
      { exit_code: 1, stdout: "", stderr: kind === "container"
        ? `Error response from daemon: No such container: ${name}\n`
        : kind === "network" ? `network ${name} not found\n`
          : `get ${name}: no such volume\n` };
  },
  async stopExactContainer(name) { touched.push(`stop:${name}`);
    const state = present.get("container");
    if (state) present.set("container", { ...state, running: false });
    return "ACKNOWLEDGED";
  },
  async removeExact(kind, name) { touched.push(`remove:${kind}:${name}`);
    present.delete(kind); return "ACKNOWLEDGED"; },
};

for (const kind of ["container", "network", "volume"] as const) {
  present.set(kind, { owned: true, running: kind === "container" });
  const settled = await settleFarmOsDay150Gate13Creation({ adapter, kind,
    acknowledgement: "OUTCOME_UNKNOWN" });
  assert.equal(settled.outcome, "CREATION_OUTCOME_UNKNOWN");
  assert.equal(settled.resource.state, "OWNED_PRESENT");
}
const cleanup = await cleanupFarmOsDay150Gate13OwnedResources(adapter);
assert.deepEqual(cleanup, { container: "ABSENT", network: "ABSENT", volume: "ABSENT",
  zero_residual: true, unrelated_resources_touched: 0 });
assert.deepEqual([...present.keys()], []);
assert.ok(touched.every((entry) => Object.values(FARM_OS_DAY150_GATE13_OWNED_RESOURCES)
  .some((name) => entry.endsWith(name))));

const absentAfterAckLoss = await settleFarmOsDay150Gate13Creation({ adapter,
  kind: "container", acknowledgement: "OUTCOME_UNKNOWN" });
assert.equal(absentAfterAckLoss.outcome, "CREATION_OUTCOME_UNKNOWN");
assert.equal(absentAfterAckLoss.resource.state, "ABSENT");
present.set("network", { owned: false, running: false });
assert.equal((await reconcileFarmOsDay150Gate13OwnedResource(adapter, "network")).state,
  "CONFLICT_OR_UNKNOWN");
await assert.rejects(cleanupFarmOsDay150Gate13OwnedResources(adapter),
  /CLEANUP_OUTCOME_UNKNOWN/u);
present.clear();

process.stdout.write(`${JSON.stringify({ status: "PASS", cases: 12,
  ack_loss_owned_resource_discovered: true,
  cleanup_discovery_independent_of_memory_flags: true,
  conflicting_identity_fails_closed: true,
  unrelated_resource_operations: 0 })}\n`);
