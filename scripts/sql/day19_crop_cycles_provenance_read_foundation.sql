begin;

update app.crop_cycles
set source_extracted_fact_ids = (
  select array_agg(distinct_fact_id order by distinct_fact_id)
  from (
    select distinct distinct_fact_id
    from unnest(source_extracted_fact_ids) as distinct_fact_id
  ) deduped
)
where source_apply_plan_id = 1
  and source_extracted_fact_ids is not null;

create or replace view app.crop_cycles_with_provenance as
select
  cc.id as crop_cycle_id,
  cc.season_year,
  cc.crop,
  cc.variety,
  cc.field_name,
  cc.sowing_date_text,
  cc.transplant_date_text,
  cc.source_apply_plan_id,
  cc.source_projection_candidate_id,
  cc.source_document_id,
  sd.title as source_document_title,
  sd.ocr_status as source_document_ocr_status,
  cc.document_extraction_id,
  de.status as document_extraction_status,
  de.is_current as document_extraction_is_current,
  cc.source_extracted_fact_ids,
  cc.created_by,
  cc.created_by_role,
  cc.created_at,
  cc.updated_at,
  cc.archived,
  cc.archived_at,
  cc.archive_reason,
  ap.readiness_status as apply_plan_readiness_status,
  ap.status as apply_plan_status,
  ap.reviewed as apply_plan_reviewed,
  ap.rejected as apply_plan_rejected,
  ap.approved_for_app_apply,
  pc.status as projection_candidate_status,
  pc.reviewed as projection_candidate_reviewed,
  pc.rejected as projection_candidate_rejected,
  pc.approved_for_app_projection
from app.crop_cycles cc
left join knowledge.source_documents sd
  on sd.id = cc.source_document_id
left join knowledge.document_extractions de
  on de.id = cc.document_extraction_id
left join knowledge.app_projection_apply_plans ap
  on ap.id = cc.source_apply_plan_id
left join knowledge.projection_candidates pc
  on pc.id = cc.source_projection_candidate_id;

grant select on app.crop_cycles_with_provenance to farmos_app_local;
grant select on app.crop_cycles_with_provenance to farmos_ai_readonly_local;
grant select on app.crop_cycles_with_provenance to farmos_ai_proposal_local;

commit;
