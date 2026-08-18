# DORA Production Evolution Plan

## Guiding Decision

DORA should prove decision value with the smallest operable Azure architecture. New services are introduced only when a measured reliability, scale, security, integration or governance requirement cannot be met by the current platform.

## MVP Architecture

| Capability                     | MVP service                                                                 | Why it is sufficient                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Web and BFF                    | Azure Container Apps                                                        | Managed HTTPS, revisions, identity, autoscaling and low idle cost.                                     |
| Scheduled ingestion and briefs | Container Apps Jobs                                                         | Simple cron-driven work without a permanent orchestration tier.                                        |
| Operational records            | Existing suitable database or Azure Database for PostgreSQL Flexible Server | Relational integrity for observations, forecasts, runs, reports and audit events.                      |
| Raw and generated artifacts    | Azure Blob Storage                                                          | Durable low-cost object storage for source payloads and reports.                                       |
| Retrieval                      | Azure AI Search                                                             | Hybrid retrieval, filters and citations for research and source evidence.                              |
| AI                             | Microsoft Foundry deployments                                               | Managed-identity model access with independently configured fast, reasoning and embedding deployments. |
| Telemetry                      | Application Insights and Log Analytics                                      | Traces, structured events, failures, latency and token usage.                                          |
| Inputs                         | Free/open APIs first                                                        | Demonstrates ingestion and normalization before commercial licensing.                                  |
| Email                          | Azure Communication Services Email                                          | Monday brief and test delivery without a separate messaging platform.                                  |
| Secrets                        | Key Vault                                                                   | Secret names in configuration; secret values never enter source or admin responses.                    |

The web container and job must use PostgreSQL, Blob Storage and AI Search after deployment. Local JSON, filesystem, lexical search and SQLite remain development fallbacks only and must be disabled by production configuration.

## Production Gates

### Stage 1: Harden the MVP

- Managed identities for web, jobs, Search, Storage, Key Vault, Foundry and database access.
- Private configuration, health probes, minimum/maximum replicas and tested revision rollback.
- PostgreSQL high availability when recovery objectives or business criticality justify its cost.
- Zone-redundant services where the selected region and SKU support them.
- Development, prototype and production environments with isolated data and identities.
- Automated backups, restore drills, runbooks and explicit RPO/RTO.
- Continuous AI evaluation using the checked-in representative dataset.

### Stage 2: Add Integration and Decoupling Where Measured

| Service                | Add when                                                                                                 | Do not add merely because                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| API Management         | External consumers, partner APIs, centralized quotas, model governance or semantic caching are required. | There is one first-party web client.                                     |
| Service Bus            | Commands require durable retries, dead-lettering, ordering or load leveling.                             | A scheduled job can call a bounded operation directly.                   |
| Event Grid             | Blob/source lifecycle events need fan-out to several independent handlers.                               | One ingestion process owns the workflow.                                 |
| Event Hubs             | Sustained high-volume telemetry or market streams exceed request/job ingestion.                          | Polling a small set of open APIs is sufficient.                          |
| Fabric                 | Governed enterprise BI, OneLake or semantic-model workflows become a business requirement.               | DORA already has a relational operational store.                         |
| Azure Databricks       | Existing lakehouse assets or large distributed transformations justify it.                               | Small normalization jobs fit in Container Apps Jobs.                     |
| Azure Machine Learning | Custom model training, registry, managed endpoints or MLOps are required.                                | Baseline forecasts are deterministic and Foundry serves language models. |

### Stage 3: Enterprise Security and Governance

- VNet integration and private endpoints for Storage, PostgreSQL, Search, Key Vault and Foundry once network isolation is required and DNS/operations ownership exists.
- Front Door with WAF for internet-facing multi-region ingress, edge policy and failover.
- Defender for Cloud recommendations and workload protection aligned to risk.
- Purview when enterprise lineage, catalog and data classification span DORA and upstream platforms.
- Central policy, resource locks, diagnostic settings, budget alerts and managed-identity-only authentication.
- Data retention, legal hold, residency and deletion controls approved by governance owners.

### Stage 4: Resilience and Scale

- Autoscaling from measured concurrent traffic, queue depth or scheduled workload duration.
- Zone redundancy first; multi-region only after a documented outage model and data replication plan.
- Database HA/read replicas and cross-region restore according to measured RPO/RTO.
- Front Door health routing and warm secondary deployment where business impact justifies it.
- Quarterly restore, regional failover and identity-loss exercises.

## AI Operations

- Run the evaluation dataset for every prompt, retrieval, model or tool-contract change.
- Compare groundedness, citation correctness, relevance, freshness, numerical accuracy, unsupported claims, latency and cost.
- Block promotion when any critical groundedness/citation/numerical gate fails, regardless of aggregate score.
- Monitor deployment, reported model/version, tool calls, tokens, latency, failures and evaluation drift.
- Keep deployment aliases in environment/admin configuration so model upgrades do not require source changes.
- Route numerical decisions through deterministic engines; language models explain supplied evidence and do not invent calculations.

## Promotion Criteria

Production promotion requires green unit, contract and Playwright suites; successful Azure smoke tests; live open-data ingestion; Search retrieval with valid citations; Foundry evaluation above threshold; ACS test delivery; telemetry confirmation; scheduler execution; restore evidence; and no local-file/database dependency in the deployed runtime.
