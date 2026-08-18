# DORA Infrastructure Foundation

Container definitions and an undeployed Phase 7 data-foundation template are provided. Azure resources remain unprovisioned because subscription, resource group, region, ownership, and model quota are approval gates.

## Container Images

Build from the repository root:

```powershell
docker build -f infrastructure/containers/web.Dockerfile -t dora-web:local .
docker build -f infrastructure/containers/pipeline.Dockerfile -t dora-pipeline:local .
```

The web image runs the Next.js standalone server as a non-root user on port `3000`. The pipeline image contains a self-contained bundle and runs once, matching the Azure Container Apps Job execution model.

## Intended Azure Mapping

| Workload        | Azure target                                    |
| --------------- | ----------------------------------------------- |
| `dora-web`      | Azure Container App with external HTTPS ingress |
| `dora-pipeline` | Scheduled Azure Container Apps Job              |
| Images          | Azure Container Registry Basic                  |
| Runtime secrets | Key Vault references and managed identity       |
| Telemetry       | Application Insights and Log Analytics          |

## Data Foundation

`data-foundation.bicep` uses Azure Verified Modules to describe:

- Standard LRS Blob Storage with OAuth as default, shared keys disabled, versioning, and a private `dora-data` container.
- PostgreSQL Flexible Server with Entra-only authentication, a `dora` database, burstable compute, 32 GB storage, seven-day backups, and no prototype HA.
- Azure AI Search Basic with local authentication disabled, one replica, one partition, and free semantic search.

The template compiles locally but must not be deployed until the gates in `.azure/deployment-plan.md` are approved. Its `enablePublicNetworkAccess` parameter defaults to `true` for the prototype; production should supply private endpoints and set it to `false`.

Apply the operational schema after PostgreSQL provisioning and database-role setup:

```powershell
npm run migrate --workspace @dora/storage
```

Migrations `003` through `005` add forecast backtests, AI request telemetry, normalized manufacturing status with database-resident demo rows, and the formal deterministic risk framework. Local development persists manufacturing demo rows in `.dora-data/dora-local.db`; this directory is ignored by Git.
