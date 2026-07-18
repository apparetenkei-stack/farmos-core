import { serveHermesDailyFarmBriefProposalReviewDetail } from "../../../../../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_proposal_review_service";
import { hermesDailyFarmBriefProposalReviewServerDependencies } from "../../../../../../lib/hermes/hermes_daily_farm_brief_proposal_review_server_boundary";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request:Request):Promise<Response>{
  return serveHermesDailyFarmBriefProposalReviewDetail({request,dependencies:hermesDailyFarmBriefProposalReviewServerDependencies});
}
