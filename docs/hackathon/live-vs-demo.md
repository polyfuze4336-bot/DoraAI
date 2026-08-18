# Live vs Demo

The single source of truth for what to claim on stage. If it is not on the LIVE list, do not call it live.

## LIVE (verified, connected, running on Azure)

- Commodity price ingestion — **World Bank Pink Sheet** (public).
- Global news ingestion — **GDELT** (public).
- **Scheduled processing job** — `dora-scheduled-processing`, cron every 30 minutes (a successful execution has run).
- **Blob Storage** persistence — isolated `dora-data` container.
- **PostgreSQL** persistence — canonical signals, forecasts, risks, users.
- **Deterministic forecasting** — horizons 1/7/30/90 with uncertainty bands.
- **Deterministic risk engine**.
- **Deterministic scenario engine**.
- **Database authentication** — bcrypt + signed HTTP-only cookie (seeded admin verified).
- **Application Insights** monitoring — telemetry and traces.
- **Weekly report generation** — deterministic assembly.
- **Dashboard and all UI pages** — rendering live persisted data.

## PARTIALLY IMPLEMENTED (wired; activates with configuration/content)

- **Microsoft Foundry AI synthesis** — `dora-fast` (gpt-4o-mini), `gpt-4o`, embeddings deployed and wired; deterministic reasoning is the guaranteed baseline, AI adds grounded explanation.
- **Azure AI Search** — `srch-agentops` reused and configured; knowledge indexing/search activates when documents are ingested.
- **ACS Email delivery** — Communication Services + managed email domain provisioned and connection wired; real delivery depends on recipient configuration.

## DEMO / SYNTHETIC (clearly labelled)

- **Manufacturing signals** — synthetic operational data.
- **Seeded demo domains** — reference records (migration 008).
- **Timeline events** — seeded narrative records.

## NOT CONNECTED (future integration)

- **SharePoint**, **Databricks**, **Power BI** adapters.
- **EIA** and **FRED** — adapters present but disabled pending keys.
- **Commercial feeds** — Reuters, Platts, ICIS, Argus, Wood Mackenzie, S&P Global (require licences).

## FUTURE (does not exist today)

- **Microsoft Copilot Studio** experience — architecture-ready, not implemented.

## Presenter Phrasing

- LIVE item: "This is live on Azure."
- PARTIAL item: "This is wired and configured; it activates when we supply content/recipients."
- DEMO item: "This is demo/synthetic data to show the experience."
- FUTURE item: "This is our roadmap — architecture-ready, not built yet."
</content>
