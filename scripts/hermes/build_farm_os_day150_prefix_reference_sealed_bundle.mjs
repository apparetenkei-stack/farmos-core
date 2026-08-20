import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const esbuildPath = resolve(root,
  "node_modules/.pnpm/tsx@4.22.4/node_modules/esbuild/lib/main.js");
const esbuild = await import(pathToFileURL(esbuildPath).href);
if (esbuild.version !== "0.28.1") throw new Error("DAY150_SEALED_ESBUILD_VERSION_REJECTED");
const dataFiles = Object.freeze([
  "db/provisioning/manifest.json",
  "scripts/sql/farm_os_production_identity_readonly_v5.sql",
  "db/migrations/202607260001_eligible_proposal_persistence.sql",
  "db/migrations/202607260001_eligible_proposal_persistence.verify.sql",
  "db/migrations/202607300001_daily_operational_projection_candidate_foundation.sql",
  "db/migrations/202607300001_daily_operational_projection_candidate_foundation.verify.sql",
  "db/migrations/202607310001_daily_operational_projection_candidate_activation.sql",
  "db/migrations/202607310001_daily_operational_projection_candidate_activation.verify.sql",
  "db/migrations/202608030001_daily_operational_projection_command_ledger.sql",
  "db/migrations/202608030001_daily_operational_projection_command_ledger.verify.sql",
  "db/migrations/202608070001_stable_changes_consumer_persistence.sql",
  "db/migrations/202608070001_stable_changes_consumer_persistence.verify.sql",
]);
const sha = (bytes) => createHash("sha256").update(bytes).digest("hex");
const config = Object.freeze({ platform: "node", format: "esm", target: "node24",
  bundle: true, packages: "bundle", legalComments: "none", charset: "utf8",
  sourcemap: false, minify: false, treeShaking: true });
const buildConfigurationDigest = sha(Buffer.from(
  `farmos.day150-prefix-reference-esbuild-configuration.v1\n${JSON.stringify(config)}`));
const worker = await esbuild.build({ ...config,
  entryPoints: [resolve(root,
    "scripts/hermes/lib/farm_os_day150_prefix_reference_postgres_worker.ts")],
  write: false, metafile: true });
if (worker.outputFiles.length !== 1) throw new Error("DAY150_SEALED_WORKER_OUTPUT_REJECTED");
const workerSource = worker.outputFiles[0].text;
const workerInputs = Object.keys(worker.metafile.inputs);
if (!workerInputs.some((path) => /node_modules\/.+\/pg\//u.test(path)) ||
  workerInputs.some((path) => /node_modules\/.+\/tsx\//u.test(path))) {
  throw new Error("DAY150_SEALED_POSTGRES_DEPENDENCY_CLOSURE_REJECTED");
}
const payloadBase = { runtime_data_base64: Object.fromEntries(dataFiles.map((path) =>
  [path, readFileSync(resolve(root, path)).toString("base64")])), postgres_worker_source: workerSource };
const buildMain = (payload) => esbuild.build({ ...config,
  entryPoints: [resolve(root,
    "scripts/hermes/run_farm_os_day150_prefix_reference_sealed_bundle.ts")],
  write: false, metafile: true,
  banner: { js: `globalThis.__FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_PAYLOAD_V1=${JSON.stringify(payload)};` },
});
const preliminary = await buildMain({ ...payloadBase, build_input_digest:
  `sha256:${"0".repeat(64)}` });
const inputs = [...new Set([...Object.keys(preliminary.metafile.inputs), ...workerInputs, ...dataFiles,
  "package.json", "pnpm-lock.yaml", "tsconfig.json",
  "scripts/hermes/build_farm_os_day150_prefix_reference_sealed_bundle.mjs"])].sort();
const rows = inputs.map((path) => ({ path, sha256: sha(readFileSync(resolve(root, path))) }));
const buildInputDigest = sha(Buffer.from(
  `farmos.day150-prefix-reference-sealed-build-input-closure.v1\n${JSON.stringify(rows)}`));
const result = await buildMain({ ...payloadBase,
  build_input_digest: `sha256:${buildInputDigest}` });
if (result.outputFiles.length !== 1) throw new Error("DAY150_SEALED_BUNDLE_OUTPUT_REJECTED");
const bundle = result.outputFiles[0].contents;
const externalImports = Object.values(result.metafile.outputs).flatMap((output) => output.imports)
  .filter((entry) => entry.external).map((entry) => entry.path).sort();
if (externalImports.some((path) => !path.startsWith("node:"))) {
  throw new Error("DAY150_SEALED_EXTERNAL_APPLICATION_IMPORT_REJECTED");
}
const outputPath = resolve(root,
  "artifacts/day150/prefix-expected-catalog/sealed-runtime/v1/day150-prefix-reference-sealed-execution-bundle-v1.mjs");
const manifestPath = `${outputPath}.manifest.json`;
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, bundle);
const manifest = { schema_version: "farmos.day150-prefix-reference-sealed-execution-bundle.v1",
  authority_id: "DAY150_PREFIX_REFERENCE_SEALED_EXECUTION_BUNDLE_V1",
  bundle_path: outputPath.slice(root.length + 1), bundle_sha256: `sha256:${sha(bundle)}`,
  byte_length: bundle.byteLength, build_input_digest: `sha256:${buildInputDigest}`,
  build_configuration_digest: `sha256:${buildConfigurationDigest}`,
  package_json_sha256: `sha256:${sha(readFileSync(resolve(root, "package.json")))}`,
  pnpm_lock_sha256: `sha256:${sha(readFileSync(resolve(root, "pnpm-lock.yaml")))}`,
  tsconfig_closure: ["tsconfig.json"], esbuild_version: esbuild.version, config,
  input_rows: rows, bundled_node_module_inputs: [...new Set([...workerInputs,
    ...Object.keys(result.metafile.inputs)].filter((path) => path.includes("node_modules")))].sort(),
  external_imports: externalImports, runtime_tsx: false, runtime_node_modules: false };
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(manifest)}\n`);
