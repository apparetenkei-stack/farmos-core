import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

export const DAY132_TEST_SUITE_VERSION="farmos.day132.final-gate.v2" as const;
export const DAY132_REVIEW_FINDING_IDS=["DAY132-P1-L3-REAUTHENTICATION","DAY132-P1-PROPOSAL-HASH-SCOPE","DAY132-P2-SIDE-EFFECT-EVIDENCE","DAY132-P2-FORMAL-DECISION-EVIDENCE"] as const;
export const DAY132_SOURCE_FILES=["src/lib/hermes/farm_os_approved_proposal_contract.ts","src/lib/hermes/farm_os_approved_command_contract.ts","src/lib/hermes/farm_os_command_registry.ts","src/lib/hermes/farm_os_execution_gateway_contract.ts","scripts/hermes/farm_os_day132_fixture.ts","scripts/hermes/test_farm_os_approved_proposal_contract.ts","scripts/hermes/test_farm_os_approved_command_contract.ts","scripts/hermes/test_farm_os_approved_command_fixture_integration.ts","scripts/hermes/test_farm_os_approved_command_dependency_boundary.ts","scripts/hermes/test_farm_os_approved_command_report.ts","scripts/hermes/farm_os_day132_evidence.ts","scripts/hermes/run_farm_os_day132_final_gate.ts","scripts/hermes/run_farm_os_day132_isolated_build.ts","docs/architecture/farm-os-approved-proposal-and-command-contract.md","package.json"] as const;
export const computeDay132TreeHash=(root:string)=>{
  const files=execFileSync("git",["ls-files","-z","--cached","--others","--exclude-standard"],{cwd:root,encoding:"utf8"}).split("\0").filter(Boolean).filter((file)=>file!=="next-env.d.ts"&&!/(^|\/)\.env(?:\.|$)/u.test(file)).sort();
  return`sha256:${createHash("sha256").update(files.map((file)=>`${file}\0${readFileSync(path.join(root,file))}`).join("\0")).digest("hex")}`;
};

export type Day132BuildEvidence={schema_version:"farmos.day132.build-evidence.v1";reviewed_tree_hash:string;source_commit:string;test_suite_version:typeof DAY132_TEST_SUITE_VERSION;command:"pnpm run build";exit_code:number;generated_at:string};
export type Day132ReviewArtifact={schema_version:"farmos.day132.review-artifact.v1";review_id:string;reviewer_id:string;review_method:"independent_read_only_review";reviewed_tree_hash:string;source_commit:string;test_suite_version:typeof DAY132_TEST_SUITE_VERSION;generated_at:string;findings:readonly{finding_id:string;severity:"P1"|"P2";status:"open"|"resolved";evidence_refs:readonly string[]}[]};
export type Day132ExecutedEvidence={targeted_test_exit_code:number|null;day131_regression_exit_code:number|null;day130_5_regression_exit_code:number|null;typecheck_exit_code:number|null;dependency_boundary_exit_code:number|null;report_integrity_exit_code:number|null};
const record=(value:unknown):value is Record<string,unknown>=>typeof value==="object"&&value!==null&&!Array.isArray(value);
const iso=(value:unknown)=>typeof value==="string"&&Number.isFinite(Date.parse(value));
const exactKeys=(value:Record<string,unknown>,keys:readonly string[])=>Object.keys(value).sort().join(",")===[...keys].sort().join(",");
export function parseDay132BuildEvidence(value:unknown):Day132BuildEvidence|null{
  if(!record(value)||!exactKeys(value,["command","exit_code","generated_at","reviewed_tree_hash","schema_version","source_commit","test_suite_version"])||value.schema_version!=="farmos.day132.build-evidence.v1"||value.test_suite_version!==DAY132_TEST_SUITE_VERSION||value.command!=="pnpm run build"||typeof value.exit_code!=="number"||typeof value.reviewed_tree_hash!=="string"||typeof value.source_commit!=="string"||!iso(value.generated_at))return null;
  return value as Day132BuildEvidence;
}
export function parseDay132ReviewArtifact(value:unknown):Day132ReviewArtifact|null{
  if(!record(value)||!exactKeys(value,["schema_version","review_id","reviewer_id","review_method","reviewed_tree_hash","source_commit","test_suite_version","generated_at","findings"])||value.schema_version!=="farmos.day132.review-artifact.v1"||value.review_method!=="independent_read_only_review"||value.test_suite_version!==DAY132_TEST_SUITE_VERSION||typeof value.review_id!=="string"||typeof value.reviewer_id!=="string"||typeof value.reviewed_tree_hash!=="string"||typeof value.source_commit!=="string"||!iso(value.generated_at)||!Array.isArray(value.findings))return null;
  const findings=value.findings;
  if(findings.some((item)=>!record(item)||!exactKeys(item,["finding_id","severity","status","evidence_refs"])||typeof item.finding_id!=="string"||!/^[A-Z0-9][A-Z0-9_-]{7,127}$/u.test(item.finding_id)||!(["P1","P2"] as const).includes(item.severity as never)||!(["open","resolved"] as const).includes(item.status as never)||!Array.isArray(item.evidence_refs)||item.evidence_refs.length===0||item.evidence_refs.some((ref)=>typeof ref!=="string"||ref.length===0)))return null;
  const ids=findings.map((item)=>item.finding_id);
  if(new Set(ids).size!==ids.length||DAY132_REVIEW_FINDING_IDS.some((id)=>!ids.includes(id)))return null;
  return value as unknown as Day132ReviewArtifact;
}
export function decideDay132Gate(input:{tree_hash:string;source_commit:string;executed:Day132ExecutedEvidence;machine_checks_valid:boolean;build:Day132BuildEvidence|null;review:Day132ReviewArtifact|null}){
  const buildValid=input.build!==null&&input.build.reviewed_tree_hash===input.tree_hash&&input.build.source_commit===input.source_commit&&input.build.exit_code===0;
  const reviewValid=input.review!==null&&input.review.reviewed_tree_hash===input.tree_hash&&input.review.source_commit===input.source_commit;
  const p1Count=reviewValid?input.review!.findings.filter((item)=>item.severity==="P1"&&item.status==="open").length:-1;
  const p2Count=reviewValid?input.review!.findings.filter((item)=>item.severity==="P2"&&item.status==="open").length:-1;
  const executionsValid=Object.values(input.executed).every((code)=>code===0);
  return{formal_decision:buildValid&&reviewValid&&executionsValid&&input.machine_checks_valid&&p1Count===0&&p2Count===0?"go" as const:"hold" as const,reviewed_tree_hash:input.tree_hash,source_commit:input.source_commit,test_suite_version:DAY132_TEST_SUITE_VERSION,isolated_build_valid:buildValid,review_artifact_valid:reviewValid,machine_checks_valid:input.machine_checks_valid,p1_count:p1Count,p2_count:p2Count,...input.executed};
}
