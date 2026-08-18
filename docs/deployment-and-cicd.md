# DORA Reuse-First Infrastructure and CI/CD

## Bicep

`infra/main.bicep` is the deployment entrypoint. It accepts existing resource IDs for Foundry, Search, Key Vault, Log Analytics, Application Insights, Container Apps environment, Storage and PostgreSQL. Empty IDs create the minimum secure resource. Existing resources may be in other resource groups/subscriptions available to the deployment identity.

New resources receive workload Managed Identity RBAC automatically. Reused cross-resource-group resources are not modified from the DORA deployment scope; `reusedResourceRbacRequired` identifies where owners must grant access.

Environment files:

- `infra/environments/development.bicepparam`
- `infra/environments/prototype.bicepparam`
- `infra/environments/production.bicepparam`

Override existing resource IDs and PostgreSQL Entra administrator values through environment-specific deployment configuration, not committed credentials.

## GitHub Actions

CI performs typecheck, lint, 90+ tests, dependency audit, static credential-pattern scan, CodeQL, production build, Bicep compilation and artifact packaging.

Deployment uses GitHub OIDC with Azure Login. Configure GitHub Environment variables for each environment:

- `AZURE_CLIENT_ID`
- `AZURE_TENANT_ID`
- `AZURE_SUBSCRIPTION_ID`
- `AZURE_RESOURCE_GROUP`
- Optional `AZURE_CONTAINER_REGISTRY`, `DORA_WEB_APP_NAME`, `DORA_PIPELINE_JOB_NAME`

No client secret or long-lived Azure credential is required. Federated credentials should restrict repository, branch/environment and workflow subject.

The workflow deploys reuse-first infrastructure, optionally pushes web/pipeline images, then updates configured Container Apps workloads. Production uses the protected GitHub `production` Environment with required reviewers.
