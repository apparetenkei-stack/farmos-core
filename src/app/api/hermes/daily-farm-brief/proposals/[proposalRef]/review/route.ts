import { serveHermesDailyFarmBriefProposalReviewDecision } from "../../../../../../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_proposal_review_service";
import { hermesDailyFarmBriefProposalReviewServerDependencies } from "../../../../../../../lib/hermes/hermes_daily_farm_brief_proposal_review_server_boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request:Request):Promise<Response>{
  return serveHermesDailyFarmBriefProposalReviewDecision({request,dependencies:hermesDailyFarmBriefProposalReviewServerDependencies});
}
