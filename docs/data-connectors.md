# DORA Prototype Data Connectors

## Scope

Phase 5 provides real, replaceable source adapters for:

| Provider | Data | Authentication | Default cadence |
|---|---|---|---|
| U.S. EIA API v2 | Brent, WTI, Henry Hub and configurable energy series | Free API key | 60 minutes |
| FRED | Configurable macro and manufacturing series | Free API key | 360 minutes |
| World Bank Pink Sheet | Monthly benchmark history from the official XLSX workbook | None | 1,440 minutes |
| GDELT DOC 2.0 | Bounded global commodity news ArticleList JSON | None | 30 minutes |

EIA and FRED are disabled by default until keys are provided. World Bank and GDELT are public and enabled in the committed prototype registry.

## Provider Registry

`config/providers.json` is non-secret. Each entry controls:

- `id`, `type`, and `enabled`.
- `refreshMinutes`.
- timeout, retry count, exponential-backoff bounds, and rate limit.
- provider-specific series, columns, or queries.
- the environment variable name containing a credential, never its value.

Example keyed provider:

```json
{
  "id": "eia-energy",
  "type": "eia",
  "enabled": true,
  "refreshMinutes": 60,
  "authentication": {
    "type": "apiKey",
    "apiKeyEnv": "EIA_API_KEY"
  }
}
```

The pipeline can use an alternate file through `PROVIDER_CONFIG_PATH` or an injected JSON array through `PROVIDER_CONFIG_JSON`. The JSON override is useful for tests and ephemeral jobs; do not place credentials in it.

Future licensed providers keep the same registry boundary:

```yaml
provider:
  id: reuters-commodities
  type: reuters
  enabled: true
  refreshMinutes: 5
  authentication:
    type: apiKey
    apiKeyEnv: REUTERS_API_KEY
```

```yaml
provider:
  id: woodmac-markets
  type: woodmac
  enabled: true
  refreshMinutes: 60
  authentication:
    type: oauth
    clientIdEnv: WOODMAC_CLIENT_ID
    clientSecretEnv: WOODMAC_CLIENT_SECRET
```

Adding those adapters requires a new factory registration and canonical mapping. Intelligence, forecasting, storage, and UI contracts do not change.

## Resilience

All HTTP providers use `ResilientHttpClient`:

- Per-attempt timeout through `AbortSignal.timeout`.
- Cancellation propagation.
- Exponential backoff bounded by `maxDelayMs`.
- Retry for 408, 425, 429, 500, 502, 503, and 504 only.
- `Retry-After` support.
- Configured request interval limiting.
- Immediate failure for non-transient 4xx errors.
- Secret query-parameter redaction before provenance storage.

GDELT defaults to one combined, bounded 50-record query and one request per ten seconds. EIA and FRED requests are also bounded by configured series counts and observation limits. DORA does not crawl or scrape provider websites.

## Validation and Provenance

Provider responses are validated with Zod or a workbook schema before normalization. Every normalized item requires:

- provider and source identifiers.
- source URL.
- source observation/publication timestamp.
- fetch timestamp.
- ingestion timestamp.
- correlation ID.
- licence and terms URL.
- SHA-256 checksum of the source row/article/observation.

The pipeline rejects any normalized item without provenance.

## Storage and Scheduling

The prototype `JsonFileIngestionStore` writes atomic JSON batches under:

```text
data/ingested/raw/{providerId}/{yyyy-mm-dd}/{runId}.json
data/ingested/normalized/{providerId}/{yyyy-mm-dd}/{runId}.json
data/ingested/signals/{providerId}/{yyyy-mm-dd}/{runId}.json
```

This directory is ignored by Git. `provider-state.json` stores the last attempt and last successful run per provider. The 15-minute job dispatcher skips a provider until its configured `refreshMinutes` interval elapses, including after throttling or failure. Provider failures are isolated; successful providers still persist and the run reports `partial` status.

The raw layer retains provider fetch output and metadata. The normalized layer retains provider canonical records with provenance. The signals layer retains canonical DORA signals linked to both previous layers. The storage interface is intentionally replaceable with Azure Blob/ADLS and SQL adapters in a later phase.

## Secrets

For local development:

1. Copy `.env.example` to ignored `.env.local`.
2. Add `EIA_API_KEY` and/or `FRED_API_KEY`.
3. Set the corresponding provider's `enabled` value to `true` in a local registry copy.
4. Point `PROVIDER_CONFIG_PATH` to that local file.

For Azure Container Apps:

1. Store provider keys in Azure Key Vault.
2. Grant the job's managed identity least-privilege secret access.
3. Configure Container Apps secrets as Key Vault references.
4. Map those references to the environment names used by `apiKeyEnv`.

Never commit a key, OAuth secret, or literal Key Vault secret value.

## Commands

Run public providers when due:

```powershell
npm run build --workspace @dora/pipeline
npm run start --workspace @dora/pipeline
```

Force a local refresh:

```powershell
$env:PROVIDER_FORCE_REFRESH = "true"
npm run start --workspace @dora/pipeline
```

## Live Validation on 2026-08-17

- World Bank monthly XLSX: succeeded; 2,160 normalized observations persisted with complete provenance.
- GDELT: implementation and mocked response tests pass. Live access from the current corporate egress received GDELT's explicit shared-IP HTTP 429 throttle; provider failure was isolated and the World Bank batch still completed.
- EIA/FRED: not called live because no credentials were provided. Injected-response tests verify request, schema, normalization, missing-value, redaction, and provenance behavior.

Official references:

- EIA Open Data API documentation and terms.
- FRED `series/observations` API documentation and terms.
- World Bank Commodity Markets Pink Sheet and dataset terms.
- GDELT DOC 2.0 API documentation and terms.