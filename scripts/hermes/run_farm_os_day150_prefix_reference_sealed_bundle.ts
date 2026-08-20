import {
  executeFarmOsDay150PrefixReferenceCatalogOnce,
} from "../../src/lib/hermes/farm_os_day150_prefix_expected_catalog_derivation";

const digestPattern = /^sha256:[a-f0-9]{64}$/u;
const required = ["FARM_OS_DAY150_SEALED_BUNDLE_DIGEST",
  "FARM_OS_DAY150_BUILD_INPUT_DIGEST", "FARM_OS_DAY150_FIXED_RUNTIME_PROFILE_DIGEST"] as const;
if (process.argv.slice(2).length !== 0 || required.some((name) =>
  !digestPattern.test(process.env[name] ?? "")) ||
  process.env.FARM_OS_DAY150_APPROVAL_REPOSITORY_ROOT === undefined) {
  throw new Error("DAY150_SEALED_NO_INPUT_RUNTIME_ATTESTATION_REJECTED");
}
const result = await executeFarmOsDay150PrefixReferenceCatalogOnce();
process.stdout.write(`${JSON.stringify(result)}\n`);
if (result.status !== "DAY150_PREFIX_REFERENCE_CATALOG_CANDIDATES_GENERATED") process.exitCode = 1;
