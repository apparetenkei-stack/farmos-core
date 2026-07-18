"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse,
  type HermesDailyFarmBriefProposalReviewDecisionHttpResponse,
} from "../../../scripts/hermes/brief_runtime/hermes_daily_farm_brief_proposal_review_api_contract";
import type { HermesDailyFarmBriefProposalReviewDecision } from "../../lib/hermes/hermes_daily_farm_brief_proposal_review_decision_boundary";

const LABELS:Record<HermesDailyFarmBriefProposalReviewDecision,string>={approve:"承認",reject:"却下",request_revision:"修正依頼"};
const STATUS_LABELS:Record<string,string>={approved:"承認済み",rejected:"却下",needs_revision:"修正依頼"};

export function DailyFarmBriefProposalReviewControls(input:{proposalRef:string;expectedUpdatedAt:string;initialStatus:string}){
  const router=useRouter();
  const [note,setNote]=useState("");
  const [submitting,setSubmitting]=useState(false);
  const [status,setStatus]=useState(input.initialStatus);
  const [message,setMessage]=useState<string|null>(null);

  async function submit(decision:HermesDailyFarmBriefProposalReviewDecision){
    if(submitting||status!=="pending")return;
    const trimmed=note.trim();
    if(trimmed.length===0){setMessage("判断理由を入力してください。");return;}
    if(!window.confirm(`${LABELS[decision]}を記録します。よろしいですか？`))return;
    setSubmitting(true);setMessage(null);
    try{
      const response=await fetch(`/api/hermes/daily-farm-brief/proposals/${encodeURIComponent(input.proposalRef)}/review`,{
        method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({decision,review_note:trimmed,expected_status:"pending",expected_updated_at:input.expectedUpdatedAt}),
      });
      let raw:unknown=null;try{raw=JSON.parse(await response.text());}catch{/* fail closed */}
      const parsed=parseHermesDailyFarmBriefProposalReviewDecisionHttpResponse(raw);
      if(response.status===409&&parsed?.ok===false&&parsed.error==="stale"){
        setMessage("表示内容が更新されています。最新状態を再取得しました。判断は再送信していません。");
        router.refresh();return;
      }
      if(!response.ok||parsed===null||parsed.ok===false){
        const error=parsed?.ok===false?parsed.error:"unavailable";
        setMessage(error==="unauthenticated"?"認証が必要です。":error==="forbidden"?"この操作を行う権限がありません。":error==="expired"?"期限切れのため判断を記録できません。":error==="protected"?"保護された確認事項は操作できません。":error==="invalid_transition"?"現在の状態では判断を記録できません。":"現在、判断を記録できません。");
        return;
      }
      const success=parsed as Extract<HermesDailyFarmBriefProposalReviewDecisionHttpResponse,{ok:true}>;
      setStatus(success.status);setMessage(`${STATUS_LABELS[success.status]??success.status}として記録しました。`);setNote("");
      router.refresh();
    }catch{setMessage("現在、判断を記録できません。");}finally{setSubmitting(false);}
  }

  if(status!=="pending")return <section aria-live="polite"><h3>レビュー結果</h3><p>{message??`${STATUS_LABELS[status]??"判断済み"}です。`}</p></section>;
  return <section aria-labelledby="daily-brief-review-heading"><h3 id="daily-brief-review-heading">管理者レビュー</h3><p>この操作はレビュー判断だけを記録します。営農データへの適用は行いません。</p><label htmlFor="daily-brief-review-note">判断理由</label><textarea id="daily-brief-review-note" value={note} onChange={(event)=>setNote(event.target.value)} disabled={submitting} maxLength={1000} rows={5}/><div><button type="button" disabled={submitting} onClick={()=>void submit("approve")}>承認する</button><button type="button" disabled={submitting} onClick={()=>void submit("reject")}>却下する</button><button type="button" disabled={submitting} onClick={()=>void submit("request_revision")}>修正を依頼する</button></div>{message?<p role="status" aria-live="polite">{message}</p>:null}</section>;
}
