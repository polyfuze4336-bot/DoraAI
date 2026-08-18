# DORA

## AI-Powered Commodity Decision Intelligence

> DORA continuously combines commodity prices, global news, emerging risks, market intelligence and manufacturing signals to help management understand what is happening, why it matters and what could happen next.

DORA is deployed on Azure as a Next.js web application, a scheduled ingestion/analysis job, PostgreSQL, Blob Storage, Microsoft Foundry models and Application Insights. Phase 1 (this repository) is a real, deployed MVP that proves the decision-intelligence workflow end to end while keeping a clean path to enterprise integration.

- **Live application:** `https://dora-web.nicefield-0eb02a6f.eastus2.azurecontainerapps.io`
- **Prototype authentication:** simplified database-backed login (bcrypt + signed HTTP-only cookie). Microsoft Entra ID remains configured but disabled for later production restoration.

---

## Repository Navigation

| Topic | Document |
|---|---|
| Current Azure architecture | [docs/architecture/current-azure-architecture.md](docs/architecture/current-azure-architecture.md) |
| Deployed Azure resource inventory | [docs/architecture/azure-resource-inventory.md](docs/architecture/azure-resource-inventory.md) |
| End-to-end data flow | [docs/architecture/data-flow.md](docs/architecture/data-flow.md) |
| Data sources matrix | [docs/architecture/data-sources.md](docs/architecture/data-sources.md) |
| Hackathon guide | [docs/hackathon/README.md](docs/hackathon/README.md) |
| 5-minute demo script | [docs/hackathon/demo-script.md](docs/hackathon/demo-script.md) |
| Presentation guide | [docs/hackathon/presentation-guide.md](docs/hackathon/presentation-guide.md) |
| Architecture talk track | [docs/hackathon/architecture-talk-track.md](docs/hackathon/architecture-talk-track.md) |
| Judge Q&A | [docs/hackathon/judge-questions.md](docs/hackathon/judge-questions.md) |
| Business value | [docs/hackathon/business-value.md](docs/hackathon/business-value.md) |
| Live vs demo | [docs/hackathon/live-vs-demo.md](docs/hackathon/live-vs-demo.md) |
| Known limitations | [docs/hackathon/known-limitations.md](docs/hackathon/known-limitations.md) |
| Roadmap (Phase 1 to 3) | [docs/roadmap/dora-roadmap.md](docs/roadmap/dora-roadmap.md) |
| Copilot Studio evolution | [docs/copilot-studio/copilot-studio-evolution.md](docs/copilot-studio/copilot-studio-evolution.md) |
| Copilot Studio target architecture | [docs/copilot-studio/target-architecture.md](docs/copilot-studio/target-architecture.md) |
| Copilot Studio migration checklist | [docs/copilot-studio/migration-checklist.md](docs/copilot-studio/migration-checklist.md) |
| DORA API (OpenAPI) | [openapi/dora-api.yaml](openapi/dora-api.yaml) |

---

## Business Problem

Commodity-exposed organisations struggle to convert scattered information into timely management decisions:

- Commodity information is **fragmented** across price feeds, news, economic data and internal operations.
- Analysts **manually combine** multiple sources, which is slow and inconsistent.
- Management reporting is **slow** and often out of date by the time it is read.
- It is **hard to correlate** news and events with commodity movement.
- Predictive capability is **limited** or lives only in spreadsheets.
- When a forecast changes, it is **difficult to explain why**.
- Different analysts produce **inconsistent insight**.
- **Emerging risks** are hard to track continuously.

## DORA Solution

DORA turns fragmented signals into an explainable management view:

1. **Collects signals** from public commodity and news APIs on a schedule.
2. **Normalises** the information into a canonical signal model with provenance.
3. **Identifies changes** across price, news, risk and manufacturing domains.
4. **Performs forecasting** with deterministic baselines across multiple horizons and uncertainty bands.
5. **Uses AI to reason** over retrieved evidence (Microsoft Foundry), never from model memory alone.
6. **Identifies risks** with a deterministic scoring engine.
7. **Generates recommendations** and management language grounded in cited evidence.
8. **Provides management reporting** via a weekly commodity intelligence brief.

Numerical forecasting, risk scoring, anomaly detection, scenarios and source quality are **deterministic**. AI is used only for evidence-grounded explanation, synthesis and management language.

---

## Technology (Phase 1, as deployed)

| Layer | Technology |
|---|---|
| Web/BFF | Next.js 15 (App Router), React 19, TypeScript |
| Hosting | Azure Container Apps (web) + Container Apps Job (scheduled pipeline) |
| Database | Azure Database for PostgreSQL Flexible Server (Entra auth) |
| Object storage | Azure Blob Storage (isolated `dora-data` container) |
| AI models | Microsoft Foundry: `dora-fast` (gpt-4o-mini), `gpt-4o`, `text-embedding-3-small` |
| Retrieval | Azure AI Search (knowledge indexing/search) |
| Monitoring | Application Insights + Log Analytics (OpenTelemetry) |
| Email | Azure Communication Services Email |
| Secrets | Azure Key Vault + workload managed identity |
| IaC | Bicep (`infra/`, `infrastructure/`) |
| CI/CD | GitHub Actions (`.github/workflows/`) |

## Repository Structure

| Path | Responsibility |
|---|---|
| `apps/web` | Next.js dashboard, BFF routes, database login, responsive UX |
| `services/pipeline` | Scheduled connector and processing runtime |
| `services/storage` | PostgreSQL/Blob stores, migrations, auth seeding |
| `services/knowledge` | Document parsing, chunking, Azure AI Search indexing |
| `services/reporting` | Weekly brief generation and ACS email |
| `connectors` | Provider contracts, registry, vendor adapters |
| `intelligence` | Model-independent intelligence services |
| `forecasting` | Deterministic forecast and scenario contracts |
| `agents` | DORA specialist agent and Foundry adapter boundary |
| `normalization` | Provider-specific canonical DORA signal conversion |
| `shared` | Canonical domain types and environment configuration |
| `infra`, `infrastructure` | Bicep, container and database deployment assets |
| `openapi` | DORA REST API contract for future tool integration |
| `docs` | Architecture, hackathon, roadmap and Copilot Studio docs |
| `tests`, `e2e` | Contract, behaviour and end-to-end tests |

---

## Quick Start (local development)

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Local mode uses file/lexical fallbacks and does not require Azure credentials.

## Quality Commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

---

## Roadmap

```text
Phase 1  DORA MVP / Hackathon
        |
        v
Phase 2  Enterprise Data + Advanced Intelligence
        |
        v
Phase 3  Enterprise DORA + Multi-Agent + Copilot Studio
```

See [docs/roadmap/dora-roadmap.md](docs/roadmap/dora-roadmap.md).

## Future: Microsoft Copilot Studio

DORA is designed so that its Azure intelligence platform does **not** need to be rewritten. A future architecture can expose DORA capabilities to Microsoft Copilot Studio as tools/actions, while keeping the existing Azure data layer, forecasting, Microsoft Foundry reasoning, Azure AI Search and integration services in place. Copilot Studio is **not implemented today** — the platform is architecture-ready.

See [docs/copilot-studio/copilot-studio-evolution.md](docs/copilot-studio/copilot-studio-evolution.md).

---

## Prototype Authentication

DORA Phase 1 uses simplified database-backed authentication (bcrypt password hashing, signed secure HTTP-only cookie session) to reduce prototype complexity. `AUTH_PROVIDER=database` is deployed; `AUTH_PROVIDER=entra` restores the existing Container Apps Microsoft Entra boundary for production. Microsoft Entra ID is the recommended authentication mechanism for production.

## Configuration

Configuration is read from the environment and validated with Zod. `.env.example` is the non-secret contract. Never commit `.env`, API keys, connection strings, or model credentials. Provider selection, cadence, retry and rate limits live in `config/providers.json`; World Bank Pink Sheet and GDELT are enabled by default, EIA and FRED remain disabled until keys are supplied.

## API Foundation

- `GET /api/health` returns application status and the five intelligence domains.
- `GET /api/providers` returns provider categories and non-secret configuration status.
- The full REST surface is documented in [openapi/dora-api.yaml](openapi/dora-api.yaml).

See [Application Foundation](docs/application-foundation.md) for provider implementation and replacement rules.