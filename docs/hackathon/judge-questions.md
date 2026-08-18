# Judge Questions and Honest Answers

Answer precisely. When something is not live, say so and explain the path to make it live.

## Product

**Q: What problem does DORA solve?**
Commodity-exposed organisations can't turn fragmented signals into timely decisions. DORA combines prices, news, risk, market intelligence and manufacturing into one explainable management view.

**Q: Who is it for?**
Management and analysts in commodity-exposed businesses who need timely, explainable, consistent intelligence.

## What's Real

**Q: Is this actually deployed?**
Yes. It runs on Azure Container Apps with a scheduled ingestion job, PostgreSQL, Blob Storage, Microsoft Foundry, Azure AI Search and Application Insights. The URL is live.

**Q: What data is live?**
Commodity prices (World Bank Pink Sheet) and global news (GDELT), ingested by the scheduled job. See [live-vs-demo.md](live-vs-demo.md).

**Q: What is demo data?**
Manufacturing signals and some seeded reference/timeline records are synthetic, to demonstrate the multi-domain experience. We label these clearly.

## AI and Trust

**Q: Does the AI make up numbers?**
No. All numbers come from deterministic engines (forecasting, risk, scenarios). Microsoft Foundry only explains retrieved evidence in management language.

**Q: How do you prevent hallucination?**
Retrieval-grounded synthesis via Azure AI Search, with the deterministic result as the guaranteed baseline. If AI is unavailable, the deterministic answer still stands.

**Q: Which models?**
Microsoft Foundry deployments: gpt-4o-mini (fast), gpt-4o (reasoning), and text-embedding-3-small (retrieval).

## Architecture and Security

**Q: How do you handle secrets and access?**
Workload managed identity for passwordless data access; Key Vault for secrets; RBAC-scoped roles. No credentials in the repository.

**Q: Authentication?**
Phase 1 uses simplified database-backed login (bcrypt + signed HTTP-only cookie). Microsoft Entra ID is configured and is the production recommendation.

**Q: Is it networked/isolated?**
The prototype has no VNet; access is secured by managed identity and RBAC. Production adds private networking and a private endpoint for the dedicated storage account.

## Roadmap

**Q: What's next?**
Phase 2 connects enterprise sources (SharePoint, Databricks, Power BI) and commercial feeds, and deepens intelligence. Phase 3 adds multi-agent orchestration and a Microsoft Copilot Studio experience. See [../roadmap/dora-roadmap.md](../roadmap/dora-roadmap.md).

**Q: Is Copilot Studio built?**
No — it's a future direction. The platform is architecture-ready: the API can be exposed as Copilot Studio actions without rebuilding the Azure backend. See [../copilot-studio/copilot-studio-evolution.md](../copilot-studio/copilot-studio-evolution.md).

## Limitations

**Q: What are the current limitations?**
See [known-limitations.md](known-limitations.md). Headlines: prototype auth, some demo data, commercial feeds not yet licensed, no VNet, single-region compute.
</content>
