begin;

-- Day23 hardening:
-- farmos_app_local is the UI read role for current read-only foundations.
-- It must not have app schema write privileges.
revoke insert, update, delete, truncate on all tables in schema app from farmos_app_local;
revoke usage, update on all sequences in schema app from farmos_app_local;

-- Keep read-only app access for existing read-only UI.
grant usage on schema app to farmos_app_local;
grant select on all tables in schema app to farmos_app_local;

-- Allow the UI read role to read AI proposals.
grant usage on schema ai to farmos_app_local;
grant select on ai.proposal_inbox to farmos_app_local;

commit;
