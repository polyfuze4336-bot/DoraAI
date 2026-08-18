# DORA Prototype Security Baseline

## Implemented

- Azure workload access uses a user-assigned Managed Identity and data-plane RBAC for newly created Storage, Search, Key Vault and Foundry resources.
- Reused resources can live outside the DORA resource group. Their owners must grant the emitted workload identity the documented roles; cross-resource-group RBAC is not silently mutated.
- External credentials remain server-side. `/settings` stores only Key Vault secret names and never reads or returns secret values.
- Administrator settings require an allowed Entra principal ID from App Service/Container Apps authentication headers. Local development access is allowed only in development and can be disabled with `DORA_ALLOW_LOCAL_ADMIN=false`.
- HTTPS-only cloud endpoints, strict input validation, CSP, `nosniff`, same-origin framing, restrictive permissions policy and referrer policy are applied.
- Foundry, Graph, Databricks, Power BI, PostgreSQL, Search, Blob and ACS use Managed Identity / Entra tokens where supported.
- Git ignores runtime databases, telemetry, reports, environment files and local state. CI scans for credential-like literals outside tests and runs dependency audit plus CodeQL.
- Structured telemetry redacts authorization, tokens, API keys, passwords, credentials, connection strings and report content.

## Entra and RBAC Deployment

Configure Container Apps built-in authentication or an upstream Entra-aware gateway to set `x-ms-client-principal-id`. Set `DORA_ADMIN_PRINCIPAL_IDS` to approved user/group/service-principal object IDs. Production must set `DORA_ALLOW_LOCAL_ADMIN=false`.

The workload identity requires least-privilege roles:

- Storage Blob Data Contributor on DORA storage
- Search Index Data Contributor and Search Service Contributor on Search
- Key Vault Secrets User on Key Vault
- Cognitive Services OpenAI User on Foundry
- PostgreSQL database roles established through the Entra administrator
- ACS Email Sender on the Communication Service when email is enabled

## Key Vault

Third-party credentials are created and rotated outside DORA. Settings reference names such as `dora-eia-api-key`; the deployment platform maps those names to Key Vault-backed secrets. Secret values never enter browser JavaScript, GitHub artifacts, API responses or structured logs.

## Production Recommendations, Not Prototype Requirements

Private endpoints, hub/spoke networking, WAF/Front Door, SOC/SIEM integration, advanced Purview classification, customer-managed keys, multi-region failover and full network isolation are recommended when risk, licensing or compliance requires them. They are intentionally not forced into the prototype unless shared services already provide them.
