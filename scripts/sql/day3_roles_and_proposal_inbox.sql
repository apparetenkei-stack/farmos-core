-- Day 3: FarmOS Core local role and schema setup
-- Local development only.
-- AI agents must not directly write to app schema.

BEGIN;

-- Schemas
CREATE SCHEMA IF NOT EXISTS app;
CREATE SCHEMA IF NOT EXISTS ai;
CREATE SCHEMA IF NOT EXISTS knowledge;
CREATE SCHEMA IF NOT EXISTS audit;

-- Roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'farmos_owner_local') THEN
    CREATE ROLE farmos_owner_local NOLOGIN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'farmos_app_local') THEN
    CREATE ROLE farmos_app_local LOGIN PASSWORD 'change_me_app_local';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'farmos_ai_readonly_local') THEN
    CREATE ROLE farmos_ai_readonly_local LOGIN PASSWORD 'change_me_ai_readonly_local';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'farmos_ai_proposal_local') THEN
    CREATE ROLE farmos_ai_proposal_local LOGIN PASSWORD 'change_me_ai_proposal_local';
  END IF;
END
$$;

-- Ownership
ALTER SCHEMA app OWNER TO farmos_owner_local;
ALTER SCHEMA ai OWNER TO farmos_owner_local;
ALTER SCHEMA knowledge OWNER TO farmos_owner_local;
ALTER SCHEMA audit OWNER TO farmos_owner_local;

-- Remove broad default access
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA ai FROM PUBLIC;
REVOKE ALL ON SCHEMA knowledge FROM PUBLIC;
REVOKE ALL ON SCHEMA audit FROM PUBLIC;

-- Basic schema usage
GRANT USAGE ON SCHEMA app TO farmos_app_local;
GRANT USAGE ON SCHEMA ai TO farmos_app_local;
GRANT USAGE ON SCHEMA knowledge TO farmos_app_local;
GRANT USAGE ON SCHEMA audit TO farmos_app_local;

GRANT USAGE ON SCHEMA app TO farmos_ai_readonly_local;
GRANT USAGE ON SCHEMA knowledge TO farmos_ai_readonly_local;

GRANT USAGE ON SCHEMA ai TO farmos_ai_proposal_local;

-- AI proposal inbox
CREATE TABLE IF NOT EXISTS ai.proposal_inbox (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  proposal_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,

  payload_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  source_refs_json jsonb NOT NULL DEFAULT '[]'::jsonb,

  model_name text,
  agent_name text,
  confidence numeric(4,3),

  reason text,
  risk_level text NOT NULL DEFAULT 'low',

  status text NOT NULL DEFAULT 'pending',

  reviewed_by text,
  reviewed_at timestamptz,
  review_note text,

  applied_at timestamptz,
  applied_by text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT proposal_inbox_status_check
    CHECK (status IN ('pending', 'approved', 'rejected', 'needs_revision', 'applied', 'expired')),

  CONSTRAINT proposal_inbox_risk_level_check
    CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),

  CONSTRAINT proposal_inbox_confidence_check
    CHECK (confidence IS NULL OR (confidence >= 0 AND confidence <= 1))
);

ALTER TABLE ai.proposal_inbox OWNER TO farmos_owner_local;

-- App can read and manage proposals
GRANT SELECT, INSERT, UPDATE ON ai.proposal_inbox TO farmos_app_local;

-- AI proposal role can insert and read proposals,
-- but cannot update approval state.
GRANT SELECT, INSERT ON ai.proposal_inbox TO farmos_ai_proposal_local;

-- AI readonly can read proposal history
GRANT SELECT ON ai.proposal_inbox TO farmos_ai_readonly_local;

-- Future app tables
ALTER DEFAULT PRIVILEGES FOR ROLE farmos_owner_local IN SCHEMA app
GRANT SELECT, INSERT, UPDATE ON TABLES TO farmos_app_local;

ALTER DEFAULT PRIVILEGES FOR ROLE farmos_owner_local IN SCHEMA app
GRANT SELECT ON TABLES TO farmos_ai_readonly_local;

-- Future knowledge tables
ALTER DEFAULT PRIVILEGES FOR ROLE farmos_owner_local IN SCHEMA knowledge
GRANT SELECT, INSERT, UPDATE ON TABLES TO farmos_app_local;

ALTER DEFAULT PRIVILEGES FOR ROLE farmos_owner_local IN SCHEMA knowledge
GRANT SELECT ON TABLES TO farmos_ai_readonly_local;

COMMIT;
