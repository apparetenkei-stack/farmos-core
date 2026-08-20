export type FarmOsDay150DockerResourceKind = "container" | "network" | "volume";
export type FarmOsDay150DockerInspectClassification =
  "ABSENT" | "PRESENT" | "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME";

const removeOneTerminalTransportEol = (value: string): string => value.endsWith("\r\n")
  ? value.slice(0, -2) : value.endsWith("\n") ? value.slice(0, -1) : value;

export function classifyFarmOsDay150BoundedDockerInspectResult(input: Readonly<{
  resource_kind: FarmOsDay150DockerResourceKind;
  expected_resource_name: string;
  exit_code: number;
  stdout: string;
  stderr: string;
}>): FarmOsDay150DockerInspectClassification {
  if (input.exit_code === 0) {
    if (input.stderr !== "") return "BOUNDED_FAILURE";
    try {
      const rows = JSON.parse(input.stdout) as unknown;
      return Array.isArray(rows) && rows.length === 1 ? "PRESENT" : "BOUNDED_FAILURE";
    } catch { return "BOUNDED_FAILURE"; }
  }
  if (input.exit_code !== 1 || (input.stdout !== "" && input.stdout !== "[]\n")) {
    return "BOUNDED_FAILURE";
  }
  const kind = input.resource_kind;
  const name = input.expected_resource_name;
  const canonical = removeOneTerminalTransportEol(input.stderr);
  const observed = kind === "container"
    ? `Error response from daemon: No such container: ${name}`
    : kind === "network" ? `network ${name} not found`
      : `get ${name}: no such volume`;
  const daemonPrefixedObserved = kind === "network"
    ? `Error response from daemon: network ${name} not found`
    : kind === "volume" ? `Error response from daemon: get ${name}: no such volume`
      : null;
  const legacy = `Error: No such ${kind}: ${name}`;
  return canonical === observed || canonical === daemonPrefixedObserved || canonical === legacy
    ? "ABSENT" : "BOUNDED_FAILURE";
}

export function aggregateFarmOsDay150DockerResourcePreexistence(input: Readonly<{
  container: FarmOsDay150DockerInspectClassification;
  network: FarmOsDay150DockerInspectClassification;
  volume: FarmOsDay150DockerInspectClassification;
}>): "RESOURCE_PREEXISTENCE_CLEAR" | "BLOCKED_RESOURCE_PREEXISTS" |
  "BOUNDED_FAILURE" | "AMBIGUOUS_OUTCOME" {
  const values = [input.container, input.network, input.volume] as const;
  if (values.includes("PRESENT")) return "BLOCKED_RESOURCE_PREEXISTS";
  if (values.includes("AMBIGUOUS_OUTCOME")) return "AMBIGUOUS_OUTCOME";
  if (values.includes("BOUNDED_FAILURE")) return "BOUNDED_FAILURE";
  return "RESOURCE_PREEXISTENCE_CLEAR";
}
