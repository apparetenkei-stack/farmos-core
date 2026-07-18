import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

export async function runDay127ProposalReviewUiBoundary(){
  const paths=["src/app/proposals/daily-brief/page.tsx","src/app/proposals/daily-brief/[proposalRef]/page.tsx","src/components/hermes/DailyFarmBriefProposalList.tsx","src/components/hermes/DailyFarmBriefProposalDetail.tsx","src/lib/hermes/hermes_daily_farm_brief_proposal_review_ui_client.ts"];
  const [listPage,detailPage,listComponent,detailComponent,client]=await Promise.all(paths.map((path)=>readFile(path,"utf8")));
  for(const page of [listPage,detailPage]){assert.match(page,/force-dynamic/u);assert.doesNotMatch(page,/postgres|repository|\bselect\b|\binsert\b|\bupdate\b|\bdelete\b/iu);assert.doesNotMatch(page,/JSON\.stringify|<pre/u);}
  assert.match(listPage,/この画面は確認専用です。承認・却下・適用は行いません。/u);
  assert.match(detailPage,/管理者のレビュー判断を記録できます。営農データへの適用は行いません。/u);
  assert.match(listPage,/Daily Brief 確認事項/u);assert.match(detailPage,/proposalRef:string/u);
  assert.match(client,/serveHermesDailyFarmBriefProposalReview(?:List|Detail)/u);assert.doesNotMatch(client,/process\.env|databaseTarget|role:|principal_ref:/u);
  assert.doesNotMatch(listComponent,/<button|<form/u);assert.doesNotMatch(listComponent,/payload_json|source_refs_json|candidate_id|duplicate_signature|idempotency_key|reviewed_by|review_note|applied_by/u);
  assert.doesNotMatch(detailComponent,/payload_json|source_refs_json|candidate_id|duplicate_signature|idempotency_key|reviewed_by|review_note|applied_by/u);
  assert.match(listComponent,/現在表示できる確認事項はありません/u);assert.match(listComponent,/現在、確認事項を読み込めません/u);assert.match(detailComponent,/確認事項が見つかりません/u);assert.match(listComponent,/期限切れ/u);
  const existing=await readFile("src/app/proposals/page.tsx","utf8");assert.match(existing,/href="\/proposals\/daily-brief"/u);
  return{result:"pass",list_page_exists:true,detail_page_exists:true,safe_server_reader_only:true,raw_repository_imported:false,sql_present:false,safety_note_present:true,expired_state_present:true,empty_error_not_found_states:true};
}
if(import.meta.url===pathToFileURL(process.argv[1]??"").href)console.log(JSON.stringify(await runDay127ProposalReviewUiBoundary()));
