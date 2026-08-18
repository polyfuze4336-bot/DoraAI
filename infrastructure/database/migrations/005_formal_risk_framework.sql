BEGIN;

ALTER TABLE risks
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS probability double precision,
  ADD COLUMN IF NOT EXISTS impact_score double precision,
  ADD COLUMN IF NOT EXISTS velocity double precision,
  ADD COLUMN IF NOT EXISTS first_detected timestamptz,
  ADD COLUMN IF NOT EXISTS supporting_signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS management_implication text,
  ADD COLUMN IF NOT EXISTS scoring_model text;

ALTER TABLE risks
  ADD CONSTRAINT risks_probability_range
    CHECK (probability IS NULL OR probability BETWEEN 0 AND 1),
  ADD CONSTRAINT risks_impact_score_range
    CHECK (impact_score IS NULL OR impact_score BETWEEN 0 AND 1),
  ADD CONSTRAINT risks_velocity_range
    CHECK (velocity IS NULL OR velocity BETWEEN 0 AND 1);

CREATE INDEX IF NOT EXISTS ix_risks_category_updated
  ON risks (category, updated_at DESC);
CREATE INDEX IF NOT EXISTS ix_risks_probability_impact
  ON risks (probability DESC, impact_score DESC);

COMMIT;