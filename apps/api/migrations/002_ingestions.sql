-- ProjectWatch Rwanda — Phase 1 schema (part 2): ingestion jobs.
-- Apply with: psql "$DATABASE_URL" -f migrations/002_ingestions.sql

CREATE TABLE IF NOT EXISTS ingestions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  source      TEXT NOT NULL DEFAULT 'sentinel-2',
  status      TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  scenes      JSONB NOT NULL DEFAULT '[]'::JSONB,
  acquired_at TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ingestions_project_idx ON ingestions (project_id);
CREATE INDEX IF NOT EXISTS ingestions_status_idx ON ingestions (status);
