import assert from "node:assert/strict";

import {
  FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS,
  createFarmOsDay150Gate13SourceSetManifest,
  loadFarmOsDay150Gate13SourceSetManifest,
  type FarmOsDay150Gate13SourceSetEntry,
} from "../../src/lib/hermes/farm_os_day150_gate13_qualification_source_set";

const digest = (character: string) => `sha256:${character.repeat(64)}` as `sha256:${string}`;
const entries = FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS.map(([path, role]) => Object.freeze({
  path, role, content_sha256: digest("a"),
})) satisfies readonly FarmOsDay150Gate13SourceSetEntry[];
const baseline = createFarmOsDay150Gate13SourceSetManifest(entries);
const actual = loadFarmOsDay150Gate13SourceSetManifest(process.cwd());
assert.equal(actual.entries.length, FARM_OS_DAY150_GATE13_REQUIRED_SOURCE_PATHS.length);
const mutate = (role: string) => createFarmOsDay150Gate13SourceSetManifest(entries.map((entry) =>
  entry.role === role ? Object.freeze({ ...entry, content_sha256: digest("b") }) : entry));
for (const role of ["EFFECTFUL_SQL", "EFFECTFUL_FIXTURE", "POSTGRES_CONTRACT",
  "APPROVAL_VALIDATOR"]) {
  assert.notEqual(mutate(role).qualification_source_set_digest,
    baseline.qualification_source_set_digest, role);
}
assert.throws(() => createFarmOsDay150Gate13SourceSetManifest(entries.slice(1)),
  /REQUIRED_PATH_MISSING/u);
assert.throws(() => createFarmOsDay150Gate13SourceSetManifest([...entries, entries[0]!]),
  /DUPLICATE_PATH/u);
assert.equal(createFarmOsDay150Gate13SourceSetManifest([...entries].reverse())
  .qualification_source_set_digest, baseline.qualification_source_set_digest);
assert.throws(() => createFarmOsDay150Gate13SourceSetManifest([...entries, Object.freeze({
  path: "docs/unrelated.md", role: "UNRELATED", content_sha256: digest("c"),
})]), /UNEXPECTED_OR_INVALID_ENTRY/u);

process.stdout.write(`${JSON.stringify({ status: "PASS", required_paths: entries.length,
  actual_repository_closure_loaded: true,
  sql_fixture_contract_validator_mutations_bound: true, missing_duplicate_rejected: true,
  canonical_ordering: true, unrelated_path_rejected: true })}\n`);
