BEGIN;

INSERT INTO commodities (
  commodity_id, symbol, name, category, default_currency, default_unit, metadata
) VALUES
  ('crude-oil-brent', 'BRENT', 'Brent crude', 'Energy', 'USD', 'barrel', '{"dataOrigin":"reference"}'::jsonb),
  ('crude-oil-wti', 'WTI', 'WTI crude', 'Energy', 'USD', 'barrel', '{"dataOrigin":"reference"}'::jsonb),
  ('natural-gas-us', 'NG', 'Natural gas', 'Energy', 'USD', 'MMBtu', '{"dataOrigin":"reference"}'::jsonb),
  ('copper', 'CU', 'Copper', 'Metals', 'USD', 'tonne', '{"dataOrigin":"reference"}'::jsonb),
  ('aluminium', 'AL', 'Aluminium', 'Metals', 'USD', 'tonne', '{"dataOrigin":"reference"}'::jsonb),
  ('nickel', 'NI', 'Nickel', 'Metals', 'USD', 'tonne', '{"dataOrigin":"reference"}'::jsonb),
  ('petrochemical-feedstocks', 'FEED', 'Petrochemical feedstocks', 'Feedstocks', 'USD', 'index', '{"dataOrigin":"reference"}'::jsonb)
ON CONFLICT (commodity_id) DO NOTHING;

INSERT INTO sources (
  source_id, provider, source_type, name, source_url, enabled,
  refresh_minutes, configured_reliability, metadata
) VALUES
  ('seeded-market-intelligence', 'dora-demo', 'market-intelligence', 'Seeded market intelligence', NULL, true, 1440, 0.55, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb),
  ('seeded-manufacturing', 'dora-demo', 'manufacturing', 'Seeded manufacturing status', NULL, true, 60, 0.55, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb),
  ('seeded-risk-events', 'dora-demo', 'risk', 'Seeded risk events', NULL, true, 60, 0.55, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb)
ON CONFLICT (source_id) DO UPDATE SET metadata = EXCLUDED.metadata;

INSERT INTO insights (
  insight_id, insight_type, title, summary, commodity_id, region, as_of,
  confidence, freshness_status, evidence_ids, citations, limitations, metadata
) VALUES
  ('10000000-0000-4000-8000-000000000001', 'market-intelligence', 'Energy market remains firm', 'Supply and shipping pressure support near-term energy firmness while macro demand remains mixed.', 'crude-oil-brent', 'Global', '2026-08-17T08:00:00Z', 0.72, 'fresh', '["seeded-supply","seeded-shipping"]'::jsonb, '[]'::jsonb, '["Synthetic demo insight"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb),
  ('10000000-0000-4000-8000-000000000002', 'market-intelligence', 'Copper remains range-bound', 'Inventory tightness conflicts with softer manufacturing orders.', 'copper', 'Global', '2026-08-17T08:00:00Z', 0.64, 'fresh', '["seeded-inventory","seeded-demand"]'::jsonb, '[]'::jsonb, '["Synthetic demo insight"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb),
  ('10000000-0000-4000-8000-000000000003', 'recommendation', 'Review feedstock route contingency', 'Validate Gulf route alternatives and inventory cover before freight premiums widen.', 'petrochemical-feedstocks', 'Europe', '2026-08-17T08:00:00Z', 0.75, 'fresh', '["risk-gulf-shipping"]'::jsonb, '[]'::jsonb, '["Synthetic demo recommendation"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb)
ON CONFLICT (insight_id) DO NOTHING;

INSERT INTO forecasts (
  forecast_id, commodity_id, engine, horizon, generated_at, target_at,
  value, lower_bound, upper_bound, confidence, model_version, limitations, metadata
) VALUES
  ('20000000-0000-4000-8000-000000000001', 'crude-oil-brent', 'linear-regression-trend', '7d', '2026-08-17T08:00:00Z', '2026-08-24T08:00:00Z', 85.10, 82.90, 87.40, 0.78, '1.0.0', '["Synthetic backtest history"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true,"actual":84.70}'::jsonb),
  ('20000000-0000-4000-8000-000000000002', 'crude-oil-brent', 'linear-regression-trend', '30d', '2026-08-17T08:00:00Z', '2026-09-16T08:00:00Z', 87.25, 80.60, 93.80, 0.72, '1.0.0', '["Synthetic backtest history"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true,"actual":86.10}'::jsonb),
  ('20000000-0000-4000-8000-000000000003', 'copper', 'moving-average-7', '30d', '2026-08-17T08:00:00Z', '2026-09-16T08:00:00Z', 4.52, 4.16, 4.88, 0.64, '1.0.0', '["Synthetic backtest history"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true,"actual":4.43}'::jsonb),
  ('20000000-0000-4000-8000-000000000004', 'aluminium', 'exponential-smoothing', '90d', '2026-08-17T08:00:00Z', '2026-11-15T08:00:00Z', 2690, 2410, 2970, 0.58, '1.0.0-alpha-0.35', '["Synthetic backtest history"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true,"actual":2652}'::jsonb)
ON CONFLICT (forecast_id) DO NOTHING;

INSERT INTO risks (
  risk_id, title, description, risk_type, category, commodity_id, region,
  probability, probability_min, probability_max, impact, impact_score,
  velocity, confidence, first_detected, supporting_signals,
  management_implication, scoring_model, status, evidence_ids, observed_at,
  updated_at, metadata
) VALUES
  ('30000000-0000-4000-8000-000000000001', 'Gulf transit disruption', 'Shipping security activity could restrict tanker transit.', 'shipping', 'Shipping', 'crude-oil-brent', 'Middle East', 0.78, 0.72, 0.84, 'High', 0.91, 0.86, 0.80, '2026-08-12T08:00:00Z', '["shipping-delay-17","freight-premium-8"]'::jsonb, 'Review route contingencies and near-term crude coverage.', 'deterministic-risk-v1', 'open', '["evidence-shipping-1"]'::jsonb, '2026-08-12T08:00:00Z', '2026-08-17T09:30:00Z', '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb),
  ('30000000-0000-4000-8000-000000000002', 'Copper mine supply interruption', 'Labor and power constraints may reduce concentrate availability.', 'supply-disruption', 'Supply disruption', 'copper', 'South America', 0.66, 0.60, 0.72, 'High', 0.81, 0.63, 0.75, '2026-08-10T11:00:00Z', '["mine-output-3","copper-inventory-11"]'::jsonb, 'Test alternate concentrate sourcing.', 'deterministic-risk-v1', 'open', '["evidence-copper-1"]'::jsonb, '2026-08-10T11:00:00Z', '2026-08-17T07:15:00Z', '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb)
ON CONFLICT (risk_id) DO NOTHING;

INSERT INTO reports (
  report_id, report_type, title, status, generated_at, as_of, delivery_status,
  recipients, insight_ids, metadata
) VALUES
  ('40000000-0000-4000-8000-000000000001', 'weekly-commodity-intelligence', 'DORA Weekly Commodity Intelligence Brief - 2026-08-10', 'ready', '2026-08-10T00:00:00Z', '2026-08-10T00:00:00Z', 'not-sent', '[]'::jsonb, '["10000000-0000-4000-8000-000000000001"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb),
  ('40000000-0000-4000-8000-000000000002', 'weekly-commodity-intelligence', 'DORA Weekly Commodity Intelligence Brief - 2026-08-03', 'ready', '2026-08-03T00:00:00Z', '2026-08-03T00:00:00Z', 'not-sent', '[]'::jsonb, '["10000000-0000-4000-8000-000000000002"]'::jsonb, '{"dataOrigin":"seeded-demo","synthetic":true}'::jsonb)
ON CONFLICT (report_id) DO NOTHING;

INSERT INTO alerts (
  alert_id, alert_type, severity, commodity_id, reason, occurred_at, evidence,
  recommended_next_action, deduplication_key, occurrence_count, status,
  first_occurred_at, last_occurred_at
) VALUES
  ('50000000-0000-4000-8000-000000000001', 'price-movement', 'high', 'crude-oil-brent', 'Brent changed more than the configured threshold.', '2026-08-17T09:00:00Z', '["BRENT-market-snapshot"]'::jsonb, 'Review feedstock exposure.', 'price:brent:5pct', 1, 'open', '2026-08-17T09:00:00Z', '2026-08-17T09:00:00Z'),
  ('50000000-0000-4000-8000-000000000002', 'manufacturing-disruption', 'critical', 'petrochemical-feedstocks', 'Santos utilization and output declined beyond thresholds.', '2026-08-17T06:30:00Z', '["demo-santos-blending"]'::jsonb, 'Validate feedstock continuity.', 'manufacturing:santos:disruption', 1, 'open', '2026-08-17T06:30:00Z', '2026-08-17T06:30:00Z')
ON CONFLICT (alert_id) DO NOTHING;

COMMIT;
