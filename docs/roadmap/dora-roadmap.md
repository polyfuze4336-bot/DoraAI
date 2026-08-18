# DORA Roadmap

DORA evolves in three phases. Phase 1 is deployed today; Phases 2 and 3 build on the same Azure backend without rebuilding it.

## Phase Flow

```mermaid
flowchart TD
    P1["Phase 1 — DORA MVP / Hackathon<br/>Deployed on Azure"]
    P2["Phase 2 — Enterprise Data + Advanced Intelligence"]
    P3["Phase 3 — Enterprise DORA + Multi-Agent + Copilot Studio"]

    P1 --> P2 --> P3

    subgraph P1d[" "]
        A1["Live public ingestion (World Bank, GDELT)"]
        A2["Deterministic forecasting / risk / scenarios"]
        A3["Grounded AI synthesis (Foundry)"]
        A4["Dashboard + weekly brief"]
        A5["Managed identity, Key Vault, IaC, CI/CD"]
    end

    subgraph P2d[" "]
        B1["Enterprise sources: SharePoint, Databricks, Power BI"]
        B2["Commercial feeds: Reuters, Platts, ICIS, Argus, WoodMac, S&P"]
        B3["EIA / FRED enabled"]
        B4["Deeper models + evaluation + monitoring"]
        B5["Private networking + hardening"]
    end

    subgraph P3d[" "]
        C1["Multi-agent orchestration"]
        C2["Microsoft Copilot Studio experience"]
        C3["OpenAPI/APIM tool surface"]
        C4["Enterprise governance + multi-region"]
    end

    P1 --- P1d
    P2 --- P2d
    P3 --- P3d
```

## Phase 1 — DORA MVP / Hackathon (DELIVERED)

The current repository. Deployed and running on Azure.

- Live ingestion of public commodity prices (World Bank Pink Sheet) and news (GDELT) via a scheduled Container Apps Job.
- Canonical signal model with provenance.
- Deterministic forecasting (horizons 1/7/30/90 with uncertainty), risk scoring and scenarios.
- Microsoft Foundry synthesis grounded in retrieved evidence (Azure AI Search).
- PostgreSQL + Blob persistence, database authentication, weekly report generation.
- Managed identity, Key Vault, Bicep IaC, GitHub Actions CI/CD, Application Insights.

## Phase 2 — Enterprise Data + Advanced Intelligence (PLANNED)

Grow signal quality and intelligence depth on the same backend.

- **Enterprise connectors:** SharePoint, Databricks, Power BI.
- **Commercial feeds:** Reuters, Platts, ICIS, Argus, Wood Mackenzie, S&P Global (licensed).
- **Public expansion:** enable EIA and FRED.
- **Advanced intelligence:** richer models, evaluation harness, continuous quality monitoring.
- **Hardening:** private networking, private endpoints, production Microsoft Entra authentication, multi-region readiness.

## Phase 3 — Enterprise DORA + Multi-Agent + Copilot Studio (FUTURE)

Bring DORA to where executives already work, with agentic orchestration.

- **Multi-agent orchestration** over the existing intelligence services.
- **Microsoft Copilot Studio** experience exposing DORA as tools/actions.
- **API/APIM tool surface** from the existing OpenAPI contract.
- **Enterprise governance:** compliance, auditing, multi-region resilience.

## Phase Comparison

| Dimension | Phase 1 (now) | Phase 2 | Phase 3 |
|---|---|---|---|
| Data sources | Public (World Bank, GDELT) + demo | + Enterprise + commercial + EIA/FRED | Full enterprise breadth |
| Intelligence | Deterministic + grounded AI | + advanced models + evaluation | + multi-agent orchestration |
| Access surface | Web app | Web app | Web app + Copilot Studio |
| Auth | Database (prototype) | Microsoft Entra (production) | Enterprise Entra + governance |
| Networking | No VNet (RBAC) | Private networking | Private + multi-region |
| Status | Deployed | Planned | Future |

## Guiding Principle

Do not rebuild the Azure backend. Each phase adds connectors, intelligence and surfaces on top of the Phase 1 platform.
</content>
