import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST,
  FarmOsDay150Gate13EndpointLeaseAuthority,
  parseFarmOsDay150Gate13EphemeralPortTopology,
  resolveFarmOsDay150Gate13PostStartPortTopology,
  validateFarmOsDay150Gate13RequestedPortTopology,
  type FarmOsDay150Gate13LifecyclePhase,
} from "./lib/farm_os_day150_gate13_ephemeral_port_topology";

const binding = (HostIp: string, HostPort: string) => ({ HostIp, HostPort });
const inspect = (ports: unknown, running: boolean, requestedHostPort = "") => JSON.stringify([{
  State: { Running: running },
  HostConfig: { PortBindings: { "5432/tcp": [
    binding("127.0.0.1", requestedHostPort),
  ] } },
  NetworkSettings: { Ports: ports },
}]);
const parse = (ports: unknown, phase: FarmOsDay150Gate13LifecyclePhase = "POST_START",
  running = true, publishRequest: string = FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST) =>
  parseFarmOsDay150Gate13EphemeralPortTopology({ publish_request: publishRequest,
    lifecycle_phase: phase, inspect_stdout: inspect(ports, running) });
const reason = (value: ReturnType<typeof parse>) => value.accepted ? "ACCEPTED" : value.reason;

assert.deepEqual(validateFarmOsDay150Gate13RequestedPortTopology(
  FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST), {
  accepted: true, container_port: "5432/tcp", host_ip: "127.0.0.1",
  host_port: "DOCKER_ASSIGNED_EPHEMERAL",
});
assert.equal(validateFarmOsDay150Gate13RequestedPortTopology(
  "127.0.0.1:55432:5432").accepted, false);

const preStart = parse({ "5432/tcp": null }, "PRE_START", false);
assert.equal(reason(preStart), "PRE_START_REALIZED_BINDING_NOT_AUTHORITY");
assert.equal(preStart.accepted ? true : preStart.evidence.realized_binding_shape, "NULL");
const accepted = parse({ "5432/tcp": [binding("127.0.0.1", "49152")] });
assert.equal(accepted.accepted, true);
assert.deepEqual(accepted.accepted ? accepted.endpoint : null,
  { host: "127.0.0.1", port: 49152 });
assert.equal(accepted.accepted ? accepted.evidence.container_running : null, true);
const leases = new FarmOsDay150Gate13EndpointLeaseAuthority();
const initialLease = leases.issueFromFreshInspect(accepted);
assert.deepEqual(leases.endpointForConnection(initialLease),
  { host: "127.0.0.1", port: 49152 });
leases.invalidateForContainerRestart();
assert.throws(() => leases.endpointForConnection(initialLease),
  /STALE_OR_UNTRUSTED_POSTGRES_ENDPOINT_LEASE/u);
const samePortAfterRestart = parse({ "5432/tcp": [binding("127.0.0.1", "49152")] });
const samePortLease = leases.issueFromFreshInspect(samePortAfterRestart);
assert.deepEqual(leases.endpointForConnection(samePortLease),
  { host: "127.0.0.1", port: 49152 });
leases.invalidateForContainerRestart();
const changedPortAfterRestart = parse({ "5432/tcp": [binding("127.0.0.1", "49153")] });
const changedPortLease = leases.issueFromFreshInspect(changedPortAfterRestart);
assert.deepEqual(leases.endpointForConnection(changedPortLease),
  { host: "127.0.0.1", port: 49153 });

for (const [name, actual, expected] of [
  ["null", parse({ "5432/tcp": null }), "PUBLISHED_BINDING_NULL_NOT_YET_REALIZED"],
  ["empty array", parse({ "5432/tcp": [] }), "PUBLISHED_BINDING_EMPTY_NOT_YET_REALIZED"],
  ["missing port", parse({}), "EXACT_CONTAINER_PORT_READBACK_REQUIRED"],
  ["wildcard", parse({ "5432/tcp": [binding("0.0.0.0", "49152")] }),
    "LOCALHOST_IPV4_BINDING_REQUIRED"],
  ["wrong port", parse({ "5433/tcp": [binding("127.0.0.1", "49152")] }),
    "EXACT_CONTAINER_PORT_READBACK_REQUIRED"],
  ["multiple", parse({ "5432/tcp": [binding("127.0.0.1", "49152"),
    binding("127.0.0.1", "49153")] }), "PUBLISHED_BINDING_AMBIGUOUS"],
  ["malformed", parse({ "5432/tcp": [binding("127.0.0.1", "49x52")] }),
    "PUBLISHED_HOST_PORT_MALFORMED"],
  ["leading zero", parse({ "5432/tcp": [binding("127.0.0.1", "04915")] }),
    "PUBLISHED_HOST_PORT_MALFORMED"],
  ["zero", parse({ "5432/tcp": [binding("127.0.0.1", "0")] }),
    "PUBLISHED_HOST_PORT_MALFORMED"],
  ["IPv6 only", parse({ "5432/tcp": [binding("::1", "49152")] }),
    "LOCALHOST_IPV4_BINDING_REQUIRED"],
  ["not running", parse({ "5432/tcp": [binding("127.0.0.1", "49152")] },
    "POST_START", false), "TRUSTED_RUNNING_STATE_REQUIRED"],
] as const) assert.equal(reason(actual), expected, name);

const nullResult = parse({ "5432/tcp": null });
const emptyResult = parse({ "5432/tcp": [] });
assert.equal(nullResult.accepted ? null : nullResult.evidence.realized_binding_shape, "NULL");
assert.equal(emptyResult.accepted ? null : emptyResult.evidence.realized_binding_shape,
  "EMPTY_ARRAY");
assert.equal(nullResult.accepted ? false : nullResult.retryable, true);
assert.equal(emptyResult.accepted ? false : emptyResult.retryable, true);
assert.equal(parseFarmOsDay150Gate13EphemeralPortTopology({
  publish_request: FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST,
  lifecycle_phase: "POST_START", inspect_stdout: "not-json",
}).accepted, false);
assert.equal(reason(parse({ "5432/tcp": [
  { HostIp: "127.0.0.1", HostPort: "49152", Unexpected: true },
] })), "PUBLISHED_BINDING_SCHEMA_INVALID");
const requestedZeroInspect = JSON.stringify([{ State: { Running: true }, HostConfig: {
  PortBindings: { "5432/tcp": [binding("127.0.0.1", "0")] } }, NetworkSettings: {
    Ports: { "5432/tcp": [binding("127.0.0.1", "49152")] } } }]);
assert.equal(parseFarmOsDay150Gate13EphemeralPortTopology({ publish_request:
  FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST, lifecycle_phase: "POST_START",
inspect_stdout: requestedZeroInspect }).accepted, true);
for (const malformedInspect of [JSON.stringify([{}]), JSON.stringify([{ HostConfig: {},
  NetworkSettings: { Ports: null } }]), JSON.stringify([]), JSON.stringify([{}, {}])]) {
  assert.equal(parseFarmOsDay150Gate13EphemeralPortTopology({ publish_request:
    FARM_OS_DAY150_GATE13_EPHEMERAL_PUBLISH_REQUEST, lifecycle_phase: "POST_START",
  inspect_stdout: malformedInspect }).accepted, false);
}
let now = 0;
const inspectSequence = [inspect({ "5432/tcp": null }, true),
  inspect({ "5432/tcp": [] }, true),
  inspect({ "5432/tcp": [binding("127.0.0.1", "49154")] }, true)];
const sequenced = await resolveFarmOsDay150Gate13PostStartPortTopology({
  async read_inspect(timeout) { assert.ok(timeout >= 1 && timeout <= 1_000);
    now += 1; return inspectSequence.shift()!; },
  async bounded_wait(milliseconds) { now += milliseconds; }, monotonic_now: () => now,
  maximum_elapsed_milliseconds: 10_000, maximum_attempts: 40,
});
assert.equal(sequenced.accepted, true);
assert.equal(sequenced.attempt_count, 3);
assert.equal(sequenced.accepted ? sequenced.topology.host_port : null, 49154);

process.stdout.write(`${JSON.stringify({ status: "PASS", cases: 30,
  pre_start_endpoint_constructed: false,
  post_start_endpoint: accepted.accepted ? accepted.endpoint : null,
  restart_invalidates_cached_endpoint: true,
  same_numeric_port_requires_fresh_inspect: true,
  changed_ephemeral_port_requires_fresh_inspect: true,
  bounded_retry_sequence: "NULL_TO_EMPTY_TO_REALIZED",
  null_distinguished: true, empty_array_distinguished: true,
  textual_docker_port_fallback: false })}\n`);
