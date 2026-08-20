import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_BUNDLE_CANDIDATE_V1 as candidate } from
  "../../src/lib/hermes/farm_os_day150_prefix_reference_fixed_runtime_authority";

const manifestPath = resolve("artifacts/day150/prefix-expected-catalog/sealed-runtime/v1/" +
  "day150-prefix-reference-sealed-execution-bundle-v1.mjs.manifest.json");
const build = () => spawnSync(process.execPath,
  ["scripts/hermes/build_farm_os_day150_prefix_reference_sealed_bundle.mjs"],
  { cwd: process.cwd(), encoding: "utf8", env: { PATH: process.env.PATH ?? "/usr/bin:/bin" } });
const first = build();
assert.equal(first.status, 0, first.stderr);
const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
  bundle_path: string; bundle_sha256: string; build_input_digest: string;
  build_configuration_digest: string; runtime_tsx: boolean; runtime_node_modules: boolean;
  bundled_node_module_inputs: string[]; external_imports: string[]; input_rows: { path: string }[];
};
const bytes = readFileSync(resolve(manifest.bundle_path));
const digest = `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
assert.equal(digest, manifest.bundle_sha256);
assert.equal(candidate.bundle_digest, manifest.bundle_sha256);
assert.equal(candidate.source_digest, manifest.build_input_digest);
assert.equal(candidate.build_configuration_digest, manifest.build_configuration_digest);
assert.equal(manifest.runtime_tsx, false);
assert.equal(manifest.runtime_node_modules, false);
assert.ok(manifest.bundled_node_module_inputs.some((path) => /\/pg@8\.22\.0\//u.test(path)));
assert.equal(manifest.bundled_node_module_inputs.some((path) => /\/tsx@/u.test(path)), false);
assert.equal(manifest.external_imports.every((path) => path.startsWith("node:")), true);
for (const path of ["package.json", "pnpm-lock.yaml", "tsconfig.json",
  "scripts/hermes/build_farm_os_day150_prefix_reference_sealed_bundle.mjs"]) {
  assert.ok(manifest.input_rows.some((row) => row.path === path), path);
}
const second = build();
assert.equal(second.status, 0, second.stderr);
const secondManifest = JSON.parse(readFileSync(manifestPath, "utf8")) as typeof manifest;
assert.equal(secondManifest.bundle_sha256, manifest.bundle_sha256);
assert.equal(secondManifest.build_input_digest, manifest.build_input_digest);
assert.equal(secondManifest.build_configuration_digest, manifest.build_configuration_digest);
const tampered = Buffer.concat([bytes, Buffer.from("\nDAY150_TAMPER")]);
assert.notEqual(`sha256:${createHash("sha256").update(tampered).digest("hex")}`,
  manifest.bundle_sha256);
assert.match(bytes.toString("utf8"), /DAY150_PREFIX_REFERENCE_SEALED_EXECUTION_BUNDLE|SEALED_PAYLOAD_V1/u);
console.log(JSON.stringify({ status: "DAY150_SEALED_BUNDLE_SOURCE_QUALIFIED",
  bundle_digest: manifest.bundle_sha256, build_input_digest: manifest.build_input_digest,
  runtime_tsx: false, runtime_node_modules: false }));
