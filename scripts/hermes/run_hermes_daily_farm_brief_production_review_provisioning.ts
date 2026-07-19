import {
  applyDay130ProductionReviewProvisioning,
  diagnoseDay130ProductionReviewProvisioning,
} from "./provisioning/hermes_daily_farm_brief_production_review_provisioning";

try { process.loadEnvFile(".env.local"); } catch { /* fail closed */ }

const explicitApply = process.argv.length === 3 && process.argv[2] === "--apply";
const result = explicitApply
  ? await applyDay130ProductionReviewProvisioning(process.env)
  : await diagnoseDay130ProductionReviewProvisioning(process.env);

console.log(JSON.stringify(result));
