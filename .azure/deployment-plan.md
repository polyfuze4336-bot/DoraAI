# DORA Azure Deployment Plan

Status: Validated

## Scope

Deploy the Azure platform and workloads for DORA Phases 7 through 40.
The existing Next.js web/BFF and scheduled Node pipeline remain the two deployable application components.

## Approved Architecture

### Approved target

- Subscription: `870b491d-74bb-4aa7-95ab-647f262444d5` (`ME-MngEnvMCAP682563-mkhalib-1`)
- Resource group: `rg-dora-demo`
- Region: `eastus2`
- PostgreSQL Entra administrator: `admin@MngEnvMCAP682563.onmicrosoft.com` (`eb96b05f-f6a6-48f4-9348-d37b3abad1a8`)
- User approval: subscription selected explicitly on 2026-08-18.

### Reuse decisions

- Reuse Foundry account `aif-yfjw6y` and existing `gpt-4o` / `text-embedding-3-small` deployments.
- Reuse AI Search `srch-agentops`.
- Reuse Log Analytics `log-yfjw6y` and Application Insights `appi-yfjw6y`.
- Reuse Container Apps environment `cae-yfjw6y` and ACR `craisgeminidevyfjw6y`.
- Create dedicated DORA Storage and Key Vault because the existing shared services have public network access disabled and the reused Container Apps environment is not VNet-integrated.
- Create PostgreSQL Flexible Server because none exists in the approved subscription.
- Create ACS Email with an Azure-managed domain because Microsoft.Communication is not yet registered and no ACS resource exists.

- Azure Blob Storage: one Standard LRS account and `dora-data` container for immutable raw provider payloads and uploaded knowledge documents.
- Azure Database for PostgreSQL Flexible Server: one Entra-only operational database named `dora` for signals, commodities, prices, forecasts, risks, insights, sources, ingestion runs, reports, preferences, alert rules, and knowledge metadata.
- Azure AI Search: one Basic service for keyword, vector, and semantic retrieval over document chunks.
- Managed identity and Microsoft Entra ID are used for data-plane access. Shared keys and database passwords are disabled for the Azure target.
- Local filesystem and lexical retrieval remain available for local development.
- Reuse-first Bicep accepts existing Foundry, Search, Key Vault, Log Analytics, Application Insights, Container Apps environment, Storage, and PostgreSQL resource IDs across resource groups.
- Workspace-backed Application Insights receives OpenTelemetry from the web and scheduled pipeline; Container Apps environment logs flow to Azure Monitor / Log Analytics.
- Azure Container Apps Jobs dispatch configuration-owned ingestion, daily synthesis, and Monday reporting schedules.

## Cost Profile

- Storage: Standard LRS, no geo-redundancy for the prototype.
- PostgreSQL: burstable compute, 32 GB storage, seven-day backup, no high availability for the prototype.
- Search: Basic, one replica, one partition; semantic search configured at the lowest supported tier.
- Production evolution may add private endpoints, zone redundancy, higher Search replicas, PostgreSQL HA, and geo-redundant storage.

## Application Changes

- Persist raw provider responses under `raw/{provider}/{year}/{month}/{day}/{hour}/{runId}.json`.
- Persist canonical signals transactionally in PostgreSQL when configured.
- Parse PDF, DOCX, PPTX, text, Markdown, CSV, JSON, and HTML knowledge sources.
- Store originals, validate metadata, create citation-aware chunks, and index for hybrid retrieval.
- Require citations in generated answers and penalize superseded or archived documents.
- Expose upload, document list, search, and grounded-answer APIs to `/knowledge`.
- Provide authorised administration, scenario analysis, reporting, alerting, historical timeline, forecast performance, source management, source quality and Demo Story experiences.
- Seed synthetic internal data into PostgreSQL with explicit `seeded-demo` metadata when live internal sources are unavailable.

## Security

- Disable shared-key access on Storage and Search.
- Use Entra authentication for PostgreSQL and Azure OpenAI.
- Keep secrets out of source control and application settings where managed identity is supported.
- Treat document classification as a filterable field; production authorization enforcement is required before restricted multi-user rollout.
- Configure Container Apps Entra authentication and allow-listed administrator object IDs before production access.
- Use Key Vault secret-name references only; never return secret values to browser APIs.
- Use GitHub OIDC and protected GitHub Environments for deployment; no long-lived Azure client secret.

## Validation

All validation checks pass:

- Compile `infra/main.bicep`, `infra/environments/prototype.bicepparam`, and `infrastructure/workloads.bicep` without diagnostics.
- Run repository typechecks, unit/contract tests, lint, production builds, dependency audit and secret scan.
- Run desktop/mobile Playwright critical journeys and all-screen page-error sweep.
- Run Azure resource provider checks, deployment validation and resource-group what-if.
- Verify static RBAC for Storage Blob Data Contributor and Key Vault Secrets User on newly created resources.
- Verify live RBAC separately for reused Foundry, Search and ACR scopes before workload deployment.
- Verify production environment values select Blob, PostgreSQL, AI Search, Foundry and Application Insights and reject local persistence.
- Verify model deployments, ACS sender, PostgreSQL Entra login, migrations and seed process before smoke tests.

- Run workspace typechecks, tests, lint, and production build.
- Validate raw Blob path partitioning, document parsing/chunking, authority/freshness ranking, and citation-required answers.
- Run Bicep validation and Azure what-if only after subscription, resource group, region, and identity are approved.
- Validate CI workflows, OpenTelemetry redaction, secure headers, admin authorization, environment parameter files, database migrations, report delivery waiting states, and responsive management routes.

## Section 7: Validation Proof

- 2026-08-18: Official Bicep validation script passed Azure CLI/authentication, clean compilation, subscription deployment validation and final what-if.
- Final what-if: 10 creates, 0 modifies, 0 deletes in subscription `870b491d-74bb-4aa7-95ab-647f262444d5` / `eastus2`.
- Repository gate: all workspace typechecks, lint and builds passed; 21 test files / 99 tests passed; dependency audit reported zero vulnerabilities.
- Playwright: 11 critical desktop/mobile journeys passed with one intentional desktop skip for a mobile-only assertion; all-screen render/page-error sweep passed.
- Changed-file Prettier check passed.
- Policy review: inherited resource-creation policies deny Classic resource types and provisioned OpenAI capacity only; DORA uses neither. MCAPS not-allowed types list contains Classic providers only.
- Static RBAC verified: Storage Blob Data Contributor, Key Vault Secrets User, Cognitive Services OpenAI User, Search Index Data Contributor, Search Service Contributor, AcrPull and Monitoring Metrics Publisher, each scoped to its resource.
- Production persistence verified: Blob for ingestion/knowledge artifacts, PostgreSQL for operational/runtime/report/schedule state, AI Search for retrieval and Azure Monitor for telemetry. Production paths reject local persistence when Azure configuration is absent.
- Foundry capacity: `gpt-4o-mini` `2024-07-18`, GlobalStandard, East US 2, 5,870K TPM available; target confirmed as `aif-yfjw6y / proj-agentops`.

## Remaining external values

- Confirm the Foundry project/account target before creating an economical model deployment; current existing reasoning deployment is `gpt-4o`.
- ACS test recipient defaults to the approved administrator address unless changed during deployment.
- Container Apps Entra authentication app registration will be created in the approved tenant and configured before public smoke tests.
- GitHub OIDC and push remain pending because no Git remote exists in the workspace.
