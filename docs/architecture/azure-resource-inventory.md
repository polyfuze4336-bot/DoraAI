# Azure Resource Inventory (Phase 1)

Actual resources backing the deployed DORA prototype. Resource **names and types** are listed for architectural clarity; no secrets, keys, connection strings, or subscription identifiers are included.

## DORA-Owned Resources (`rg-dora-demo`)

| Azure Resource | Service | Purpose | Reused / New | Phase |
|---|---|---|---|---|
| `dora-web` | Container App | Next.js web app + BFF API + login | New | 1 |
| `dora-scheduled-processing` | Container Apps Job | Scheduled ingestion/processing (cron */30) | New | 1 |
| `dora-demo-pg-*` | PostgreSQL Flexible Server (v16, West US 3) | Canonical signals, forecasts, risks, users | New | 1 |
| Blob container `dora-data` | Blob Storage container | Raw payloads and artefacts | New (isolated container) | 1 |
| `dora-demo-kv-*` | Key Vault | Secret storage | New | 1 |
| `dora-demo-workload-id` | Managed Identity | Passwordless data-plane access | New | 1 |
| `dora-demo-acs` | Communication Services | Email service resource | New | 1 |
| `dora-demo-email` + `AzureManagedDomain` | Email Communication Service | Managed email domain | New | 1 |
| `dorademodata*` | Storage account | Dedicated data account (provisioned) | New | 1 |

> **Storage note:** the dedicated storage account (`dorademodata*`) was provisioned with `publicNetworkAccess: Disabled` and is not reachable from the VNet-less Container Apps Environment. DORA runtime therefore persists to an **isolated `dora-data` container** on a reachable, pre-existing storage account, with access scoped to that container via the workload identity. This is a deliberate prototype workaround, not a production pattern; production should attach a private endpoint to the dedicated account.

## Reused Platform Resources (`rg-aisgemini-dev`)

| Azure Resource | Service | Purpose | Reused / New | Phase |
|---|---|---|---|---|
| `cae-yfjw6y` | Container Apps Environment (East US 2, no VNet) | Hosts web app and job | Reused | 1 |
| `craisgeminidevyfjw6y` | Azure Container Registry (Basic) | Container images | Reused | 1 |
| `aif-yfjw6y` | Microsoft Foundry / Cognitive Services (S0) | LLM + embedding models | Reused | 1 |
| `srch-agentops` | Azure AI Search (Basic) | Knowledge index | Reused | 1 |
| `log-yfjw6y` | Log Analytics workspace | Telemetry store | Reused | 1 |
| `appi-yfjw6y` | Application Insights | Application telemetry | Reused | 1 |

## Reused Blob Storage (`rg-phoenixai-demo`)

| Azure Resource | Service | Purpose | Reused / New | Phase |
|---|---|---|---|---|
| `stphxyun*` (container `dora-data`) | Blob Storage account | Reachable Blob persistence for DORA (isolated container) | Reused | 1 |

## Model Deployments (Microsoft Foundry `aif-yfjw6y`)

| Deployment | Model | Capacity | Role | Env alias |
|---|---|---|---|---|
| `dora-fast` | gpt-4o-mini (2024-07-18) | GlobalStandard 10 | Fast synthesis | `DORA_FAST_MODEL` |
| `gpt-4o` | gpt-4o (2024-11-20) | GlobalStandard 10 | Reasoning | `DORA_REASONING_MODEL` |
| `text-embedding-3-small` | embedding v1 | Standard 10 | Retrieval embeddings | `DORA_EMBEDDING_MODEL` |

## Identity and Access

- **Workload managed identity** `dora-demo-workload-id` holds the data-plane roles used by the web app and job (PostgreSQL principal, Storage Blob Data Contributor on the `dora-data` container scope, Cognitive Services OpenAI User on Foundry, and Azure AI Search data roles).
- **Microsoft Entra app registration** for the production auth boundary is retained but disabled while `AUTH_PROVIDER=database`.

## Infrastructure as Code

| Path | Scope |
|---|---|
| `infra/subscription.bicep` | Subscription-scoped wrapper |
| `infra/main.bicep` | Platform resources |
| `infra/modules/*` | Modular resource definitions |
| `infra/environments/prototype.subscription.bicepparam` | Prototype parameters |
| `infrastructure/workloads.bicep` | Container App + Job workloads |
| `infrastructure/pipeline-jobs.bicep` | Scheduled job definition |
| `infrastructure/data-foundation.bicep` | Data-layer resources |
| `.github/workflows/ci.yml`, `deploy.yml` | Build/test and OIDC deploy |
</content>
