BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS sources (
  source_id text PRIMARY KEY,
  provider text NOT NULL,
  source_type text NOT NULL,
  name text NOT NULL,
  source_url text,
  licence text,
  terms_url text,
  enabled boolean NOT NULL DEFAULT true,
  refresh_minutes integer CHECK (refresh_minutes IS NULL OR refresh_minutes > 0),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS commodities (
  commodity_id text PRIMARY KEY,
  symbol text,
  name text NOT NULL,
  category text,
  default_currency char(3),
  default_unit text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  run_id uuid PRIMARY KEY,
  provider_id text NOT NULL,
  source_id text,
  status text NOT NULL CHECK (status IN ('running','completed','partial','failed','skipped')),
  started_at timestamptz NOT NULL,
  completed_at timestamptz,
  fetched_items integer NOT NULL DEFAULT 0,
  normalized_items integer NOT NULL DEFAULT 0,
  signal_items integer NOT NULL DEFAULT 0,
  raw_path text,
  normalized_path text,
  signal_path text,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS signals (
  signal_id text PRIMARY KEY,
  signal_type text NOT NULL,
  source text NOT NULL,
  provider text NOT NULL,
  commodity_id text REFERENCES commodities(commodity_id),
  region text,
  observed_at timestamptz NOT NULL,
  ingested_at timestamptz NOT NULL,
  value_numeric double precision,
  value_text text,
  unit text,
  direction text NOT NULL,
  magnitude double precision CHECK (magnitude IS NULL OR magnitude BETWEEN 0 AND 1),
  sentiment text NOT NULL,
  relevance double precision NOT NULL CHECK (relevance BETWEEN 0 AND 1),
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  freshness_status text NOT NULL,
  headline text NOT NULL,
  description text NOT NULL,
  source_url text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  provenance jsonb NOT NULL,
  raw_reference jsonb NOT NULL
);

CREATE TABLE IF NOT EXISTS prices (
  price_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id text NOT NULL REFERENCES commodities(commodity_id),
  provider text NOT NULL,
  source_id text NOT NULL,
  observed_at timestamptz NOT NULL,
  published_at timestamptz,
  ingested_at timestamptz NOT NULL,
  value double precision NOT NULL,
  currency char(3) NOT NULL,
  unit text NOT NULL,
  region text,
  provenance jsonb NOT NULL,
  UNIQUE (provider, source_id, observed_at)
);

CREATE TABLE IF NOT EXISTS forecasts (
  forecast_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commodity_id text NOT NULL REFERENCES commodities(commodity_id),
  engine text NOT NULL,
  horizon text NOT NULL,
  generated_at timestamptz NOT NULL,
  target_at timestamptz NOT NULL,
  value double precision NOT NULL,
  lower_bound double precision,
  upper_bound double precision,
  confidence double precision CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  model_version text NOT NULL,
  feature_version text,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS risks (
  risk_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  risk_type text NOT NULL,
  commodity_id text REFERENCES commodities(commodity_id),
  region text,
  probability_min double precision CHECK (probability_min IS NULL OR probability_min BETWEEN 0 AND 1),
  probability_max double precision CHECK (probability_max IS NULL OR probability_max BETWEEN 0 AND 1),
  impact text NOT NULL,
  urgency_at timestamptz,
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status text NOT NULL DEFAULT 'open',
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  observed_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS insights (
  insight_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_type text NOT NULL,
  title text NOT NULL,
  summary text NOT NULL,
  commodity_id text REFERENCES commodities(commodity_id),
  region text,
  as_of timestamptz NOT NULL,
  valid_until timestamptz,
  confidence double precision NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  freshness_status text NOT NULL,
  evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  citations jsonb NOT NULL DEFAULT '[]'::jsonb,
  limitations jsonb NOT NULL DEFAULT '[]'::jsonb,
  model_version text,
  prompt_version text,
  supersedes_id uuid REFERENCES insights(insight_id),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  report_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type text NOT NULL,
  title text NOT NULL,
  status text NOT NULL,
  generated_at timestamptz NOT NULL,
  as_of timestamptz NOT NULL,
  blob_path text,
  insight_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id text PRIMARY KEY,
  preferences jsonb NOT NULL DEFAULT '{}'::jsonb,
  watchlist jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_rules (
  alert_rule_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  name text NOT NULL,
  commodity_id text REFERENCES commodities(commodity_id),
  signal_type text,
  condition jsonb NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  cooldown_minutes integer NOT NULL DEFAULT 60 CHECK (cooldown_minutes > 0),
  last_triggered_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_documents (
  document_id uuid PRIMARY KEY,
  title text NOT NULL,
  author text,
  document_date date,
  business_unit text,
  commodity_id text REFERENCES commodities(commodity_id),
  region text,
  document_type text NOT NULL,
  source_system text NOT NULL,
  source_uri text,
  version text NOT NULL,
  classification text NOT NULL,
  authority_rank integer NOT NULL DEFAULT 50 CHECK (authority_rank BETWEEN 0 AND 100),
  status text NOT NULL DEFAULT 'current' CHECK (status IN ('current','superseded','archived')),
  content_hash char(64) NOT NULL,
  blob_path text NOT NULL,
  indexed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  chunk_id text PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES knowledge_documents(document_id) ON DELETE CASCADE,
  chunk_index integer NOT NULL,
  heading text,
  content text NOT NULL,
  token_count integer NOT NULL,
  citation_label text NOT NULL,
  content_hash char(64) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS ix_signals_commodity_observed_desc ON signals (commodity_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_signals_type_observed_desc ON signals (signal_type, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_signals_provider_ingested_desc ON signals (provider, ingested_at DESC);
CREATE INDEX IF NOT EXISTS ix_signals_freshness_observed_desc ON signals (freshness_status, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_prices_commodity_observed_desc ON prices (commodity_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_prices_provider_observed_desc ON prices (provider, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_forecasts_commodity_target ON forecasts (commodity_id, target_at DESC);
CREATE INDEX IF NOT EXISTS ix_risks_commodity_observed_desc ON risks (commodity_id, observed_at DESC);
CREATE INDEX IF NOT EXISTS ix_risks_status_urgency ON risks (status, urgency_at);
CREATE INDEX IF NOT EXISTS ix_insights_commodity_asof_desc ON insights (commodity_id, as_of DESC);
CREATE INDEX IF NOT EXISTS ix_insights_type_asof_desc ON insights (insight_type, as_of DESC);
CREATE INDEX IF NOT EXISTS ix_ingestion_runs_provider_started_desc ON ingestion_runs (provider_id, started_at DESC);
CREATE INDEX IF NOT EXISTS ix_reports_type_asof_desc ON reports (report_type, as_of DESC);
CREATE INDEX IF NOT EXISTS ix_alert_rules_user_enabled ON alert_rules (user_id, enabled);
CREATE INDEX IF NOT EXISTS ix_documents_commodity_date_desc ON knowledge_documents (commodity_id, document_date DESC);
CREATE INDEX IF NOT EXISTS ix_documents_source_status_date ON knowledge_documents (source_system, status, document_date DESC);
CREATE INDEX IF NOT EXISTS ix_documents_authority_date ON knowledge_documents (authority_rank DESC, document_date DESC);
CREATE INDEX IF NOT EXISTS ix_chunks_document_index ON knowledge_chunks (document_id, chunk_index);
CREATE INDEX IF NOT EXISTS ix_chunks_content_fts ON knowledge_chunks USING gin (to_tsvector('english', content));
CREATE INDEX IF NOT EXISTS ix_signals_metadata_gin ON signals USING gin (metadata);

COMMIT;
