# Data Sources Matrix (Phase 1)

Status legend:

- **LIVE** — connected and used by the deployed prototype.
- **PLANNED** — adapter exists or is scoped, disabled pending keys/config.
- **NOT CONNECTED** — target integration, no runtime connection yet.
- **FUTURE (commercial)** — requires a paid commercial subscription and contract.
- **DEMO** — synthetic/seeded data for demonstration only.

| Source | Category | Status | Data Type | Real / Demo | Refresh |
|---|---|---|---|---|---|
| World Bank Pink Sheet | Commodity prices | **LIVE** | Monthly price series | Real | Scheduled (job */30, upstream monthly) |
| GDELT | Global news | **LIVE** | News events + tone | Real | Scheduled (job */30) |
| EIA (US Energy Information Admin) | Energy/commodity | **PLANNED** | Energy series | Real (when enabled) | On enable |
| FRED (Federal Reserve) | Economic indicators | **PLANNED** | Macro series | Real (when enabled) | On enable |
| SharePoint | Internal documents | **NOT CONNECTED** | Documents | — | Future |
| Databricks | Enterprise analytics | **NOT CONNECTED** | Curated datasets | — | Future |
| Power BI | BI datasets | **NOT CONNECTED** | Datasets/metrics | — | Future |
| Reuters | Market intelligence | **FUTURE (commercial)** | News/analytics | — | Future |
| Platts (S&P Global) | Market intelligence | **FUTURE (commercial)** | Price assessments | — | Future |
| ICIS | Market intelligence | **FUTURE (commercial)** | Chemicals pricing | — | Future |
| Argus | Market intelligence | **FUTURE (commercial)** | Price assessments | — | Future |
| Wood Mackenzie | Market intelligence | **FUTURE (commercial)** | Analytics | — | Future |
| S&P Global | Market intelligence | **FUTURE (commercial)** | Analytics | — | Future |
| Manufacturing signals | Operations | **DEMO** | Operational metrics | Demo/synthetic | Seeded |
| Seeded demo domains | Cross-domain | **DEMO** | Reference records | Demo/synthetic | Seeded (migration 008) |
| Timeline events | Narrative | **DEMO** | Event records | Demo/synthetic | Seeded |

## Notes

- **Provider configuration** lives in `config/providers.json` with cadence, retry, timeout and rate limits. World Bank and GDELT are enabled by default; EIA and FRED are disabled until `EIA_API_KEY` / `FRED_API_KEY` are supplied and their entries enabled.
- **Commercial feeds** (Reuters, Platts, ICIS, Argus, Wood Mackenzie, S&P Global) require licensed subscriptions and are represented as future connector targets, not active integrations.
- **Manufacturing and seeded data** are clearly synthetic and exist to demonstrate the multi-domain intelligence experience without exposing real internal operations.
- **No credentials** for any source are stored in the repository; keys are supplied via environment and Key Vault at deployment time.
</content>
