# DORA Explainability, Operations, and Management Workflows

## Explainability

The shared Explain drawer is the mandatory insight trace surface. It displays supporting signals, contradicting signals, numerical model forecast or an explicit not-used state, concise AI Interpretation / Reasoning Summary, clickable sources, and per-signal freshness. It never stores or displays private chain-of-thought.

## Scenario Analysis

`/scenarios` applies transparent prototype elasticities to Brent, manufacturing demand, shipping disruption and USD strength. Calculated commodity/operational effects, risks, confidence and assumptions are deterministic. Foundry may explain results later but cannot alter calculated values.

## Scheduled Processing

Logical schedules live in `config/schedules.json`. The Azure Container Apps Job template accepts the dispatcher cron as a deployment parameter, so cron is not embedded in application logic. Provider refresh intervals remain source configuration. The pipeline persists complete lifecycle records to PostgreSQL and local JSONL.

The default weekly briefing is Monday 08:00 in configurable `DORA_REPORT_TIMEZONE` (`Asia/Kuala_Lumpur` by default). The 30-minute dispatcher evaluates due logical work in that timezone.

## Weekly Brief

`@dora/reporting` generates a responsive HTML email and stored report with all required briefing sections and a maximum five-point Executive Summary. `/reports` supports preview, regenerate, Send Test, Send, HTML download and history. PDF remains a later optional renderer.

Azure Communication Services Email uses Managed Identity. Sender and recipients are runtime configuration; no management address is committed. Missing ACS or recipient configuration records `awaiting-email-configuration` and never simulates delivery.

## Alerts

`DoraAlertEngine` supports price, forecast, risk, anomaly, outage, news, manufacturing and confidence triggers. It deduplicates open alerts by key, applies cooldown, merges evidence, tracks occurrence count and supports acknowledgement. `/alerts` exposes evidence and recommended next action.

## Timeline and Performance

`/timeline` synchronizes market movement, news, risk, manufacturing, forecast and recommendation events to show lead/lag ordering. `/performance` reports forecast versus actual, MAE, RMSE, directional accuracy, commodity/horizon breakdown, confidence calibration and model version. Current history is visibly labeled seeded demo data, not production evidence.

## Sources and Quality

`/sources` manages current enterprise and future commercial connectors through one adapter boundary. Test, targeted sync, enable/disable and non-secret edits are persisted; secrets are never returned. Source quality combines configured reliability, freshness, completeness, corroboration and historical signal quality. Quality is displayed and used separately from whether source content supports DORA's forecast.
