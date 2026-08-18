# Known Limitations

Stated openly. Each has a clear mitigation or roadmap path.

| # | Limitation | Impact | Mitigation / Path |
|---|---|---|---|
| 1 | Prototype authentication (database login) | Not production-grade IdP | Microsoft Entra ID is configured; set `AUTH_PROVIDER=entra` to restore |
| 2 | Some demo/synthetic data (manufacturing, seeded records, timeline) | Not real operational data | Phase 2 connects SharePoint/Databricks/Power BI |
| 3 | Commercial feeds not licensed (Reuters, Platts, ICIS, Argus, Wood Mackenzie, S&P) | Limited market-intelligence depth | Phase 2 commercial connectors + subscriptions |
| 4 | EIA/FRED disabled | Fewer economic series | Enable with API keys in `config/providers.json` |
| 5 | No VNet on Container Apps Environment | Public-endpoint access (RBAC-protected) | Add private networking + private endpoints in production |
| 6 | Dedicated storage account unreachable (public access disabled) | Runtime uses a reused isolated container | Attach private endpoint to dedicated account in production |
| 7 | Single-region compute (East US 2) | No multi-region failover | Add multi-region + zone redundancy per reliability roadmap |
| 8 | AI synthesis latency on cold start | Occasional slow first response | Deterministic result is shown first; AI adds explanation |
| 9 | Email delivery pending recipient config | Weekly brief send not yet verified end-to-end | Configure verified recipients on ACS |
| 10 | Copilot Studio not implemented | No M365 chat surface yet | Phase 3; API + OpenAPI foundation already in place |

## Design Choices (intentional, not defects)

- **Deterministic-first:** all numbers are computed deterministically; AI never invents figures. This is a deliberate trust guarantee.
- **Reuse of platform resources:** the prototype reuses an existing Container Apps environment, registry, Foundry, AI Search and monitoring to stay lean.
- **Provider abstraction:** connectors are contract-based so new sources (including commercial) can be added without changing intelligence logic.

## What We Would Not Claim

- That manufacturing data is real.
- That commercial feeds are connected.
- That Copilot Studio exists today.
- That any figure was produced by the LLM rather than a deterministic engine.
</content>
