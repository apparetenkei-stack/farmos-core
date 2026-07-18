import { headers } from "next/headers";
import Link from "next/link";
import { DailyFarmBriefProposalDetail } from "../../../../components/hermes/DailyFarmBriefProposalDetail";
import { readDailyBriefProposalDetailUi } from "../../../../lib/hermes/hermes_daily_farm_brief_proposal_review_ui_client";

export const dynamic="force-dynamic";
export const runtime="nodejs";
type Props={params:Promise<{proposalRef:string}>|{proposalRef:string}};
export default async function DailyBriefProposalDetailPage({params}:Props){const {proposalRef}=await params;const state=await readDailyBriefProposalDetailUi({headers:await headers(),proposalRef});return <main><p><Link href="/proposals/daily-brief">Daily Brief 確認事項一覧へ戻る</Link></p><header><h1>Daily Brief 確認事項の詳細</h1><p>この画面は確認専用です。承認・却下・適用は行いません。</p></header><section aria-label="確認事項の詳細"><DailyFarmBriefProposalDetail state={state}/></section></main>;}
