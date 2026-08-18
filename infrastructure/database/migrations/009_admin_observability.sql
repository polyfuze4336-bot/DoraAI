BEGIN;

CREATE TABLE IF NOT EXISTS admin_configuration_audit (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_id text NOT NULL,
  changed_at timestamptz NOT NULL DEFAULT now(),
  configuration_version text NOT NULL,
  changed_sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  correlation_id text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS operational_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  correlation_id text NOT NULL,
  category text NOT NULL,
  occurred_at timestamptz NOT NULL,
  success boolean,
  duration_ms integer CHECK (duration_ms IS NULL OR duration_ms >= 0),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_type text,
  error_message text
);

CREATE INDEX IF NOT EXISTS ix_admin_audit_changed
  ON admin_configuration_audit (changed_at DESC);
CREATE INDEX IF NOT EXISTS ix_operational_events_correlation
  ON operational_events (correlation_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS ix_operational_events_name_occurred
  ON operational_events (event_name, occurred_at DESC);

COMMIT;
