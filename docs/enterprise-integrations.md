# DORA Enterprise Integrations

All enterprise integrations are optional adapters. An unavailable environment reports `awaiting-configuration` / `not-configured`; it never emits simulated records or blocks the local MVP.

## Authentication

Managed Identity is the default for Azure-hosted DORA workloads. Where the target API or tenant policy requires an Entra application, set the adapter authentication method to `entra-application` and provide the standard Azure Identity environment variables through Azure Key Vault references. Credentials are not part of connector configuration, logs, source records, or API responses.

Each workload identity must receive only the application permissions and source-system access it requires. Production must use separate identities where privilege boundaries differ.

## SharePoint

```mermaid
flowchart LR
  SP[SharePoint document library] --> G[Microsoft Graph connector]
  G --> B[Blob original/raw object]
  B --> E[Document extraction and chunking]
  E --> S[Azure AI Search]
  S --> K[DORA knowledge layer]
```

`SharePointGraphConnector` uses Microsoft Graph v1.0 drive APIs. It enumerates changed files with the drive `delta` endpoint, retains opaque continuation/delta tokens, and downloads selected files through the drive-item content endpoint. The source drive-item ID, Graph version tag, SharePoint URL, and modified timestamp are retained through ingestion.

Required configuration:

- Site ID and drive ID
- Authentication method
- Optional user-assigned Managed Identity client ID
- Graph application permissions approved by the tenant administrator

The sync coordinator maps enterprise metadata before download and indexing. Documents without acceptable metadata can be skipped explicitly.

## Azure Databricks

`DatabricksSqlAdapter` uses the Azure Databricks SQL Statement Execution API. It supports workspace URL, SQL warehouse, catalog, schema, table or one deployment-approved query, authentication method, source-ID column, modified timestamp column, and commodity column.

Table mode builds a parameterized query filtered by `changed_after`, optional commodity IDs, and a maximum record count. Approved-query mode accepts only one read-only `SELECT`/`WITH` statement containing both `:changed_after` and `LIMIT :record_limit`. Mutating, multi-statement, or unbounded SQL is rejected.

Every returned record must contain the configured source-ID column. That ID and source version are retained in knowledge metadata and PostgreSQL traceability columns. If the workspace is unavailable, the adapter remains `awaiting-configuration`; DORA does not label local or sample data as Databricks data.

## Power BI / Fabric Semantic Models

Power BI is a secondary analytics input. DORA's command centre and management workflows remain native web experiences and do not depend on embedded reports.

`PowerBiSemanticModelAdapter` uses the supported Power BI REST `executeQueries` endpoint. Application code can invoke only named DAX queries supplied in deployment configuration; callers cannot submit arbitrary DAX. The workspace, semantic model, query name, and row identity form the source reference.

Power BI tenant settings, semantic-model Build permission, workspace membership, and service-principal access must be approved before enabling this adapter. Missing configuration leaves it dormant.

## Environment Configuration

See `.env.example` for non-secret settings. For Entra application authentication, inject `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` at runtime using Key Vault references. Never commit their values.
