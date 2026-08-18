# DORA

DORA is an AI-powered commodity intelligence and management decision-support platform. This repository contains the Phase 2 application foundation: a production-capable Next.js web/BFF, a scheduled Node.js pipeline, replaceable external-provider contracts, five modular intelligence services, deterministic forecasting, and a future Foundry-agent adapter boundary.

> **Prototype Authentication:** DORA Phase 1 currently uses simplified database-backed authentication to reduce prototype complexity. Microsoft Entra ID is the recommended authentication mechanism for production.

## Prerequisites

- Node.js 22 or newer
- npm 10
- Docker 28 or newer for container builds

## Start Locally

```powershell
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. Prototype mode is enabled by default and does not require external credentials.

The deployed prototype sets `AUTH_PROVIDER=database` and authenticates against Azure Database for PostgreSQL. Passwords are bcrypt hashes and sessions use signed, secure HTTP-only cookies. Initial administrator credentials are supplied only during deployment. Set `AUTH_PROVIDER=entra` to restore the existing Container Apps Entra boundary for production.

## Quality Commands

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Run the pipeline once with configured providers disabled:

```powershell
npm run build --workspace @dora/pipeline
npm run start --workspace @dora/pipeline
```

## Repository Structure

| Path | Responsibility |
|---|---|
| `apps/web` | Next.js dashboard, BFF routes, responsive UX |
| `services/pipeline` | Scheduled connector and processing runtime |
| `connectors` | Provider contracts, registry, vendor adapters |
| `intelligence` | Five model-independent intelligence services |
| `forecasting` | Deterministic forecast and scenario contracts |
| `agents` | Optional future Foundry-agent adapter boundary |
| `normalization` | Provider-specific canonical DORA signal conversion |
| `shared` | Canonical domain types and environment configuration |
| `infrastructure` | Container and future Azure deployment assets |
| `docs` | Assessments, architecture, decisions, and implementation guidance |
| `tests` | Cross-package contract and behaviour tests |

## Configuration

Configuration is read from the environment and validated with Zod. Use `.env.example` as the non-secret contract. Never commit `.env`, API keys, connection strings, or model credentials.

Provider selection, refresh cadence, retry, timeout, and rate limits are defined in `config/providers.json`. World Bank Pink Sheet and GDELT are enabled by default; EIA and FRED remain disabled until `EIA_API_KEY` and `FRED_API_KEY` are supplied and their config entries are enabled.

Local ingestion output is written to ignored `data/ingested/`. In Azure, provider key environment variables must be backed by Key Vault references and workload managed identity rather than literal Container App secrets.

## API Foundation

- `GET /api/health` returns application status and the five intelligence domains.
- `GET /api/providers` returns provider categories and non-secret configuration status.

See [Application Foundation](docs/application-foundation.md) for provider implementation and replacement rules.