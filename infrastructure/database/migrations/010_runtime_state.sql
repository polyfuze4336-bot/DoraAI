BEGIN;

CREATE TABLE IF NOT EXISTS runtime_state (
  state_key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_runtime_state_updated
  ON runtime_state (updated_at DESC);

COMMIT;
