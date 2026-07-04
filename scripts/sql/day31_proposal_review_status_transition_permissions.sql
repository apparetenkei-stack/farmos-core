begin;

grant update (
  status,
  reviewed_by,
  reviewed_at,
  review_note,
  updated_at
)
on ai.proposal_inbox
to farmos_app_local;

commit;
