# DORA Application Foundation

## Runtime Shape

The MVP has two deployable workloads:

- `@dora/web`: Next.js App Router web/BFF with standalone container output.
- `@dora/pipeline`: scheduled, self-contained Node.js bundle for Azure Container Apps Jobs.

The remaining workspaces are TypeScript domain packages. They do not depend on Next.js, Azure SDKs, or vendor SDKs.

## Provider Contract

Every external integration implements `ExternalProvider<TQuery, TRaw, TNormalized>` from `@dora/connectors`:

```typescript
interface ExternalProvider<TQuery, TRaw, TNormalized> {
  readonly id: string;
  readonly kind: ProviderKind;
  fetch(query: TQuery, context: ProviderContext): Promise<ProviderFetchResult<TRaw>>;
  validate(data: TRaw): Promise<ProviderValidationResult>;
  normalize(data: TRaw, context: ProviderContext): Promise<readonly TNormalized[]>;
  healthCheck(): Promise<ProviderHealth>;
}
```

Specialised aliases define the replacement boundaries:

- `CommodityPriceProvider`
- `NewsProvider`
- `MarketIntelligenceProvider`
- `ManufacturingProvider`
- `EnterpriseDocumentProvider`

The provider registry keys adapters by provider kind and ID. Domain and intelligence packages consume canonical records, never Reuters, ICIS, Argus, Platts, Wood Mackenzie, IEA, CMA, or other vendor-specific response objects.

## Adding or Replacing a Provider

1. Add a vendor adapter under `connectors/src/providers`.
2. Parse all adapter configuration from environment or a secure runtime configuration source.
3. Implement `fetch`, `validate`, `normalize`, and `healthCheck`.
4. Map vendor identifiers, timestamps, currencies, units, geographies, and revision fields into shared canonical types.
5. Add contract tests using an injected HTTP/client boundary; tests must not call the live vendor.
6. Register the adapter in the pipeline composition root.
7. Preserve immutable raw payload storage and licence metadata when persistence is added.

Replacing a provider must not modify intelligence-service interfaces, forecast interfaces, dashboard contracts, or the Insight Repository model.

## Configuration Rules

- `.env.example` documents names and safe defaults only.
- Secrets are never prefixed with `NEXT_PUBLIC_`.
- The web app exposes only non-secret provider readiness.
- Production Azure services use managed identity; third-party secrets are retrieved from Key Vault.
- Enabling a provider without its required configuration fails fast with an actionable error.

## Intelligence and Agent Boundary

The five intelligence domains implement `IntelligenceService`. Their MVP implementations are deterministic, evidence-backed modules registered in one shared service registry.

The `@dora/agents` workspace contains `AgentIntelligenceServiceAdapter`. It can replace one domain implementation with a Foundry agent later while preserving the same request/result contract. No autonomous agent is configured in Phase 2.

## Prototype Data

The dashboard currently uses clearly marked prototype data so the UX is available without credentials. The EIA adapter is a real external integration boundary but remains disabled until an API key and series mapping are supplied. Later phases should persist canonical observations and replace prototype dashboard projections through BFF repository interfaces.