-- ProjectWatch Rwanda — Phase 2 schema: analyses (intelligence layer).
-- Apply with: psql "$DATABASE_URL" -f migrations/003_analyses.sql

CREATE TABLE IF NOT EXISTS analyses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status       TEXT NOT NULL DEFAULT 'pending',  -- pending | processing | done | failed
  change_score REAL,                                   -- 0..1 magnitude of detected change
  confidence   REAL,                                    -- 0..1 model/observation confidence
  progress_pct REAL,                                    -- 0..100 schedule-based progress
  risk         TEXT,                                    -- green | amber | red
  reason       TEXT,
  scenes_compared TEXT[],                               -- raster keys compared
  error        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS analyses_project_idx ON analyses (project_id);
CREATE INDEX IF NOT EXISTS analyses_status_idx ON analyses (status);
