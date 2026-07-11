-- ProjectWatch Rwanda — Phase 3: ground truth validation.
-- Records manual field observations to compare against AI analysis results.

CREATE TABLE IF NOT EXISTS ground_truths (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id        UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  project_id         UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  observed_change    REAL CHECK (observed_change >= 0 AND observed_change <= 1),
  observed_progress  REAL CHECK (observed_progress >= 0 AND observed_progress <= 100),
  notes              TEXT,
  recorded_by        TEXT,
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ground_truths_analysis_idx ON ground_truths (analysis_id);
CREATE INDEX IF NOT EXISTS ground_truths_project_idx ON ground_truths (project_id);
