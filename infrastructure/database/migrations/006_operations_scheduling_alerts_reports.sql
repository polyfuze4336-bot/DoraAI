BEGIN;

ALTER TABLE ingestion_runs
  ADD COLUMN IF NOT EXISTS next_run_at timestamptz;

ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS report_html_path text,
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'not-sent',
  ADD COLUMN IF NOT EXISTS recipients jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS delivery_message_id text;

CREATE TABLE IF NOT EXISTS alerts (
  alert_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type text NOT NULL,
  severity text NOT NULL,
  commodity_id text REFERENCES commodities(commodity_id),
  reason text NOT NULL,
  occurred_at timestamptz NOT NULL,
  evidence jsonb NOT NULL DEFAULT '[]'::jsonb,
  recommended_next_action text NOT NULL,
  deduplication_key text NOT NULL,
  occurrence_count integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','acknowledged')),
  acknowledged_at timestamptz,
  acknowledged_by text,
  first_occurred_at timestamptz NOT NULL,
  last_occurred_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_alerts_open_deduplication
  ON alerts (deduplication_key)
  WHERE status = 'open';
CREATE INDEX IF NOT EXISTS ix_ingestion_runs_next_run
  ON ingestion_runs (next_run_at) WHERE status <> 'running';
CREATE INDEX IF NOT EXISTS ix_reports_delivery_generated
  ON reports (delivery_status, generated_at DESC);
CREATE INDEX IF NOT EXISTS ix_alerts_status_occurred
  ON alerts (status, occurred_at DESC);

COMMIT;