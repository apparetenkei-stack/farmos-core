import { headers } from "next/headers";
import Link from "next/link";
import { DailyFarmBriefProposalList } from "../../../components/hermes/DailyFarmBriefProposalList";
import { readDailyBriefProposalListUi } from "../../../lib/hermes/hermes_daily_farm_brief_proposal_review_ui_client";

export const dynamic="force-dynamic";
export const runtime="nodejs";
export default async function DailyBriefProposalPage(){const state=await readDailyBriefProposalListUi({headers:await headers()});return <main><p><Link href="/proposals">Proposal一覧へ戻る</Link></p><header><h1>Daily Brief 確認事項</h1><p>Hermesが保存した確認候補を管理者が確認するread-only画面です。</p><p>この画面は確認専用です。承認・却下・適用は行いません。</p></header><DailyFarmBriefProposalList state={state}/></main>;}
