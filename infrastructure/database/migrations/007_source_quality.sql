BEGIN;

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS configured_reliability double precision,
  ADD COLUMN IF NOT EXISTS latest_quality_score double precision,
  ADD COLUMN IF NOT EXISTS latest_quality_grade text,
  ADD COLUMN IF NOT EXISTS quality_assessed_at timestamptz;

CREATE TABLE IF NOT EXISTS source_quality_history (
  assessment_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id text NOT NULL REFERENCES sources(source_id),
  quality_score double precision NOT NULL CHECK (quality_score BETWEEN 0 AND 1),
  grade text NOT NULL,
  configured_reliability double precision NOT NULL CHECK (configured_reliability BETWEEN 0 AND 1),
  freshness double precision NOT NULL CHECK (freshness BETWEEN 0 AND 1),
  completeness double precision NOT NULL CHECK (completeness BETWEEN 0 AND 1),
  corroboration double precision NOT NULL CHECK (corroboration BETWEEN 0 AND 1),
  historical_signal_quality double precision NOT NULL CHECK (historical_signal_quality BETWEEN 0 AND 1),
  assessed_at timestamptz NOT NULL,
  method text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_source_quality_source_assessed
  ON source_quality_history (source_id, assessed_at DESC);

COMMIT;