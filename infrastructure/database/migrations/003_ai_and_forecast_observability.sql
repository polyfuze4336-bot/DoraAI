BEGIN;

CREATE TABLE IF NOT EXISTS forecast_backtests (
  backtest_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id text NOT NULL REFERENCES commodities(commodity_id),
  model text NOT NULL,
  model_version text NOT NULL,
  horizon_days integer NOT NULL CHECK (horizon_days IN (1, 7, 30, 90)),
  samples integer NOT NULL CHECK (samples > 0),
  mae double precision NOT NULL CHECK (mae >= 0),
  mape double precision CHECK (mape IS NULL OR mape >= 0),
  rmse double precision NOT NULL CHECK (rmse >= 0),
  directional_accuracy double precision NOT NULL CHECK (directional_accuracy BETWEEN 0 AND 1),
  evaluated_at timestamptz NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS ai_requests (
  request_id text PRIMARY KEY,
  deployment text NOT NULL,
  reported_model text,
  reported_model_version text,
  requested_at timestamptz NOT NULL,
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  prompt_tokens integer NOT NULL DEFAULT 0 CHECK (prompt_tokens >= 0),
  completion_tokens integer NOT NULL DEFAULT 0 CHECK (completion_tokens >= 0),
  total_tokens integer NOT NULL DEFAULT 0 CHECK (total_tokens >= 0),
  purpose text NOT NULL,
  success boolean NOT NULL,
  error_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS ix_backtests_commodity_horizon_evaluated
  ON forecast_backtests (commodity_id, horizon_days, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_requests_purpose_requested
  ON ai_requests (purpose, requested_at DESC);
CREATE INDEX IF NOT EXISTS ix_ai_requests_deployment_requested
  ON ai_requests (deployment, requested_at DESC);

COMMIT;