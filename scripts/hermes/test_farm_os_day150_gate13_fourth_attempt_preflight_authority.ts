import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_PATH,
  FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_PATH,
} from "../../src/lib/hermes/farm_os_day150_gate13_durability_qualification_evidence";
import {
  FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_PATH,
  createFarmOsDay150Gate13FourthExecutionSnapshot,
  loadFarmOsDay150Gate13SourceSetManifest,
} from "../../src/lib/hermes/farm_os_day150_gate13_qualification_source_set";
import {
  FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH,
  createFarmOsDay150Gate13FourthAttemptAuthority,
  parseFarmOsDay150Gate13ThirdAttemptClaim,
  parseFarmOsDay150Gate13ThirdAttemptTerminal,
} from "../../src/lib/hermes/farm_os_day150_gate13_third_attempt_authority";

const root = process.cwd();
const thirdClaim = parseFarmOsDay150Gate13ThirdAttemptClaim(JSON.parse(readFileSync(resolve(root,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_CLAIM_PATH), "utf8")));
const thirdTerminal = parseFarmOsDay150Gate13ThirdAttemptTerminal(JSON.parse(readFileSync(resolve(root,
  FARM_OS_DAY150_GATE13_THIRD_ATTEMPT_TERMINAL_PATH), "utf8")));
assert.ok(thirdClaim); assert.ok(thirdTerminal);
assert.equal(thirdClaim.attempt_identity,
  "sha256:b28f1c8aa82dd36c356840bccb839871d27bb948a31f6909f4fcc6177ab02865");
assert.equal(thirdClaim.claim_digest,
  "sha256:0fe924c504d2adcbe2d19da54a0731f11db8413fb99d0babc1a054021f1de612");
assert.equal(thirdTerminal.qualification_result, "QUALIFICATION_FAILED");
assert.equal(thirdTerminal.terminal_digest,
  "sha256:4385a60a0533cf9570a6e0c244a9c8d7e375a55a8e4cea249030e6f8a3310440");
assert.equal(thirdTerminal.qualification_result_digest,
  "sha256:93603e11f1c3dbaf33cf01b8831552480bc312c221f96d2ca6af73490f18d9b2");

for (const path of [FARM_OS_DAY150_GATE13_FOURTH_EXECUTION_SNAPSHOT_PATH,
  FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_CLAIM_PATH,
  FARM_OS_DAY150_GATE13_FOURTH_ATTEMPT_TERMINAL_PATH,
  FARM_OS_DAY150_GATE13_QUALIFICATION_RESULT_PATH,
  FARM_OS_DAY150_GATE13_DURABILITY_EVIDENCE_PATH]) {
  assert.equal(existsSync(resolve(root, path)), false, path);
}
const manifest = loadFarmOsDay150Gate13SourceSetManifest(root);
const snapshot = createFarmOsDay150Gate13FourthExecutionSnapshot(manifest);
const fourth = createFarmOsDay150Gate13FourthAttemptAuthority({
  source_set_digest: manifest.qualification_source_set_digest,
  execution_snapshot_digest: snapshot.execution_snapshot_digest,
});
assert.notEqual(fourth.attempt_identity, thirdClaim.attempt_identity);
assert.notEqual(fourth.source_set_digest, thirdClaim.source_set_digest);
assert.equal(fourth.supersedes_attempt_identity, null);
assert.equal(fourth.fifth_attempt_authorized, false);

process.stdout.write(`${JSON.stringify({ status: "PASS", third_attempt: "FAILED_IMMUTABLE",
  third_attempt_identity: thirdClaim.attempt_identity, third_claim_digest: thirdClaim.claim_digest,
  third_terminal_digest: thirdTerminal.terminal_digest,
  third_result_digest: thirdTerminal.qualification_result_digest,
  fourth_attempt_identity_candidate: fourth.attempt_identity,
  repaired_source_set_digest: fourth.source_set_digest,
  execution_snapshot_digest_candidate: fourth.execution_snapshot_digest,
  fourth_snapshot: "ABSENT", fourth_claim: "ABSENT", fourth_terminal: "ABSENT",
  fourth_pass_evidence: "ABSENT", fifth_attempt_authorized: false })}\n`);
