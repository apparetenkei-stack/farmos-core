import { spawnSync } from "node:child_process";

const checks=[
  ["runtime_contract","test-hermes-runtime-contract-boundary"],
  ["job_envelope","test-hermes-job-envelope-boundary"],
  ["redis_queue","test-hermes-redis-queue-boundary"],
  ["worker_protocol","test-hermes-worker-protocol-boundary"],
  ["model_router","test-hermes-model-router-boundary"],
  ["recovery","test-hermes-job-recovery-boundary"],
  ["startup_request","test-hermes-worker-startup-boundary"],
  ["wake_execution","test-hermes-wake-execution-boundary"],
  ["wake_confirmation","test-hermes-wake-confirmation-boundary"],
  ["routing_resume","test-hermes-routing-resume-boundary"],
  ["integrated_redis_chain","run-hermes-routing-resume-smoke-test"],
] as const;
const evidence=checks.map(([component,script])=>{const run=spawnSync("pnpm",["run",script],{cwd:process.cwd(),env:process.env,encoding:"utf8",stdio:"pipe"});return{component,evidence:`pnpm run ${script} (exit ${run.status??"signal"})`,passed:run.status===0}});
const passed=evidence.every(item=>item.passed);
const completed=checks.slice(0,10).map(([component])=>component);
const conditions=["worker_claim_not_implemented","queued_dispatch_not_implemented","model_execution_not_implemented","job_result_transition_not_implemented"];
console.log(JSON.stringify({result:passed?"conditional_go":"blocked",completed:passed?completed:completed.filter(component=>evidence.find(item=>item.component===component)?.passed),conditions,evidence},null,2));
if(!passed)process.exitCode=1;
