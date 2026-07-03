begin;

create schema if not exists app;

do $$
begin
  if to_regprocedure('audit.set_updated_at()') is null then
    create function audit.set_updated_at()
    returns trigger
    language plpgsql
    as $fn$
    begin
      new.updated_at = now();
      return new;
    end;
    $fn$;
  end if;
end
$$;

create table if not exists app.crop_cycles (
  id bigserial primary key,

  season_year integer not null,
  crop text not null,
  variety text,
  field_name text,
  sowing_date_text text,
  transplant_date_text text,

  source_apply_plan_id bigint not null
    references knowledge.app_projection_apply_plans(id)
    on update cascade
    on delete restrict,

  source_projection_candidate_id bigint
    references knowledge.projection_candidates(id)
    on update cascade
    on delete restrict,

  source_document_id bigint
    references knowledge.source_documents(id)
    on update cascade
    on delete restrict,

  document_extraction_id bigint
    references knowledge.document_extractions(id)
    on update cascade
    on delete restrict,

  source_extracted_fact_ids bigint[] not null default '{}'::bigint[],

  created_by text not null,
  created_by_role text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  archived boolean not null default false,
  archived_at timestamptz,
  archive_reason text,

  constraint chk_crop_cycles_season_year_range
    check (season_year between 1900 and 2200),

  constraint chk_crop_cycles_crop_not_blank
    check (nullif(trim(crop), '') is not null),

  constraint chk_crop_cycles_created_by_not_blank
    check (nullif(trim(created_by), '') is not null),

  constraint chk_crop_cycles_archived_state
    check (
      archived = false
      or archived_at is not null
    )
);

create unique index if not exists idx_crop_cycles_source_apply_plan_id_unique
  on app.crop_cycles(source_apply_plan_id);

create index if not exists idx_crop_cycles_season_year
  on app.crop_cycles(season_year);

create index if not exists idx_crop_cycles_crop
  on app.crop_cycles(crop);

create index if not exists idx_crop_cycles_field_name
  on app.crop_cycles(field_name);

create index if not exists idx_crop_cycles_source_projection_candidate_id
  on app.crop_cycles(source_projection_candidate_id);

create index if not exists idx_crop_cycles_source_document_id
  on app.crop_cycles(source_document_id);

create index if not exists idx_crop_cycles_source_extracted_fact_ids_gin
  on app.crop_cycles
  using gin (source_extracted_fact_ids);

drop trigger if exists trg_crop_cycles_set_updated_at on app.crop_cycles;

create trigger trg_crop_cycles_set_updated_at
before update on app.crop_cycles
for each row
execute function audit.set_updated_at();

grant usage on schema app to farmos_app_local;
grant usage on schema app to farmos_ai_readonly_local;
grant usage on schema app to farmos_ai_proposal_local;

grant select, insert, update on app.crop_cycles to farmos_app_local;
grant usage, select on sequence app.crop_cycles_id_seq to farmos_app_local;

grant select on app.crop_cycles to farmos_ai_readonly_local;
grant select on app.crop_cycles to farmos_ai_proposal_local;

revoke delete on app.crop_cycles from farmos_app_local;

revoke insert, update, delete on app.crop_cycles from farmos_ai_readonly_local;
revoke insert, update, delete on app.crop_cycles from farmos_ai_proposal_local;

revoke usage, select on sequence app.crop_cycles_id_seq from farmos_ai_readonly_local;
revoke usage, select on sequence app.crop_cycles_id_seq from farmos_ai_proposal_local;

commit;
