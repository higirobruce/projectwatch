-- ProjectWatch Rwanda — Phase 1 schema (PostGIS)
-- Apply with: psql "$DATABASE_URL" -f migrations/001_project_registry.sql
-- Or via the apply function in src/repository/postgres.ts on first boot.

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  boundary      GEOMETRY(POLYGON, 4326) NOT NULL,
  timeline_start TIMESTAMPTZ NOT NULL,
  timeline_end  TIMESTAMPTZ NOT NULL,
  milestones    JSONB NOT NULL DEFAULT '[]'::JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS projects_boundary_idx ON projects USING GIST (boundary);
CREATE INDEX IF NOT EXISTS projects_name_idx ON projects (name);
