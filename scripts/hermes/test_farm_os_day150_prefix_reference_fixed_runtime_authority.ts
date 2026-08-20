import assert from "node:assert/strict";
import { FARM_OS_DAY150_FIXED_RUNTIME_ARCHIVE as archive, FARM_OS_DAY150_FIXED_RUNTIME_COMPENSATION as compensation, FARM_OS_DAY150_FIXED_RUNTIME_ENV_REJECTIONS as rejects, FARM_OS_DAY150_FIXED_RUNTIME_INSTALLATION_STEPS as steps, FARM_OS_DAY150_FIXED_RUNTIME_INSTALL_ROOT as root, FARM_OS_DAY150_FIXED_RUNTIME_NODE as node, FARM_OS_DAY150_FIXED_RUNTIME_SAME_UID_ADVERSARIAL_CHECKS as uidChecks, FARM_OS_DAY150_PREFIX_REFERENCE_SEALED_BUNDLE_CANDIDATE_V1 as sealedBundle, FARM_OS_DAY150_PREFIX_REFERENCE_FIXED_RUNTIME_PROFILE_DIGEST_V1 as profileDigest, deriveFarmOsDay150FixedRuntimeProfileDigest as profile, validateFarmOsDay150FixedRuntimeArchiveProvenance as archiveValid, validateFarmOsDay150FixedRuntimeEnvironment as envValid, validateFarmOsDay150FixedRuntimeInstalledTree as treeValid, validateFarmOsDay150FixedRuntimeInstallationOrCompensation as installValid, validateFarmOsDay150FixedRuntimeObservedReadback as runtimeValid, validateFarmOsDay150FixedRuntimeSameUidQualification as uidValid, validateFarmOsDay150FixedRuntimeV7Binding as bindValid } from "../../src/lib/hermes/farm_os_day150_prefix_reference_fixed_runtime_authority";
const digest = `sha256:${"a".repeat(64)}` as const;
assert.equal(steps.length, 16); assert.equal(root, "/Library/Application Support/FarmOS/qualification/day150-prefix-reference/fixed-runtime/v1");
assert.equal(archiveValid({ ...archive, pubring_sha256: archive.active_pubring_sha256 }), true);
for (const mutation of [{ sha256:digest },{ release_list_sha256:digest },{ signer_fingerprint:"bad" },
  { pubring_sha256:digest },{ signer_key_sha256:digest }]) assert.equal(archiveValid({ ...archive,
    pubring_sha256:archive.active_pubring_sha256,...mutation }),false);
assert.equal(runtimeValid({ ...node, fixed_dylibs: 0 }), true);
for (const mutation of [{ fixed_dylibs:1 },{ version:"v26.4.0" },{ architecture:"x64" },
  { team_identifier:null },{ lc_rpath_count:1 },{ apple_dependencies:["/opt/homebrew/lib/x.dylib"] }])
  assert.equal(runtimeValid({ ...node, fixed_dylibs:0,...mutation }),false);
const entry = (path: string, mode: "0755"|"0555"|"0444") => ({ path,
  kind: path === "runtime/bin/node" || path.endsWith(".mjs") || path.endsWith(".json")
    ? "file" : "directory", owner: "root:wheel" as const, mode, symlink: false as const,
  hardlink: false as const, writable_acl: false as const, uid501_writable_ancestor: false as const });
const entries = [entry("","0755"),entry("runtime","0755"),entry("runtime/bin","0755"),
  entry("runtime/bin/node","0555"),entry("application","0755"),
  entry("application/day150-prefix-reference-sealed-execution-bundle-v1.mjs","0444"),
  entry("authority","0755"),entry("authority/fixed-runtime-profile-v1.json","0444")];
const exactTree = { install_root:root,target_preexistence:"ABSENT",
  ancestor_chain_uid501_writable:false,entries };
assert.equal(treeValid(exactTree), true);
for (const mutation of [{ entries:entries.map((x,i)=>i===3?{...x,symlink:true}:x) },
  { entries:entries.map((x,i)=>i===3?{...x,hardlink:true}:x) },
  { entries:entries.map((x,i)=>i===3?{...x,writable_acl:true}:x) },
  { entries:entries.map((x,i)=>i===3?{...x,owner:"hayate:admin"}:x) },
  { ancestor_chain_uid501_writable:true },{ target_preexistence:"UNEXPECTED" }])
  assert.equal(treeValid({ ...exactTree,...mutation }),false);
const exactPath = `${root}/runtime/bin:/usr/bin:/bin`;
assert.equal(envValid({ runtime_path: `${root}/runtime/bin/node`, environment: { PATH:exactPath,
  LANG:"C" }, homebrew_fallback:false,codex_fallback:false }),true);
assert.equal(envValid({ runtime_path: `${root}/runtime/bin/node`, environment:{ PATH:exactPath,
  [rejects[0]]:"x" },homebrew_fallback:false,codex_fallback:false }),false);
assert.equal(envValid({ runtime_path:"/opt/homebrew/bin/node",environment:{PATH:exactPath},
  homebrew_fallback:true,codex_fallback:false }),false);
assert.equal(installValid({ authorized_by_human:true, proposal_only:false, acquisition_temp_trusted:false, outcome:"INSTALLED", completed_steps:steps, trusted_readback:true, adoption_completed:false, audit_receipt_digest:digest }), true); assert.equal(installValid({ authorized_by_human:true, proposal_only:false, acquisition_temp_trusted:true, outcome:"COMPENSATED_PRE_ADOPTION", compensation, adoption_completed:false, removed_only_created_paths:true, audit_receipt_digest:digest }), false); assert.equal(installValid({ authorized_by_human:true, proposal_only:false, acquisition_temp_trusted:false, outcome:"INSTALLED", completed_steps:[...steps].reverse(), trusted_readback:true, adoption_completed:false, audit_receipt_digest:digest }), false);
assert.notEqual(profile({ bundle_digest:digest, source_digest:`sha256:${"b".repeat(64)}`, build_configuration_digest:`sha256:${"c".repeat(64)}` }), profile({ bundle_digest:digest, source_digest:`sha256:${"d".repeat(64)}`, build_configuration_digest:`sha256:${"c".repeat(64)}` }));
assert.equal(profile(sealedBundle), profileDigest);
assert.equal(installValid({ authorized_by_human:true,proposal_only:false,
  acquisition_temp_trusted:false,outcome:"COMPENSATED_PRE_ADOPTION",compensation,
  adoption_completed:false,removed_only_created_paths:true,created_paths:[root],
  unexpected_preexisting_state:false,audit_receipt_digest:digest }),true);
assert.equal(uidValid({ execution_uid:501,checks:uidChecks,results:uidChecks.map(() =>
  ({ mutation_succeeded:false,execution_identity_changed:false })) }),true);
assert.equal(bindValid({ authorization_revision:7, profile_digest:profileDigest,
  bundle_digest:sealedBundle.bundle_digest,human_approval_reference:"approval_1" }), true);
assert.equal(bindValid({ authorization_revision:7,profile_digest:digest,
  bundle_digest:sealedBundle.bundle_digest,human_approval_reference:"approval_1" }),false);
console.log("day150 fixed runtime authority: ok");
