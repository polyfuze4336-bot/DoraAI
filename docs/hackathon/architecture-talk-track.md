# Architecture Talk Track

How to narrate the DORA Azure architecture in ~90 seconds, using the diagram in
[../architecture/current-azure-architecture.md](../architecture/current-azure-architecture.md).

## The Narration

> "DORA runs on Azure Container Apps. There are two workloads: a **web app** that serves the dashboard and the API, and a **scheduled job** that ingests and processes data every 30 minutes.
>
> The job pulls **live public data** — commodity prices from the World Bank Pink Sheet and global news from GDELT — normalises it into a canonical signal model, and persists it to **PostgreSQL** and **Blob Storage**.
>
> When a user asks a question, the web app runs **deterministic** forecasting and risk engines for the numbers, retrieves supporting evidence from **Azure AI Search**, and uses **Microsoft Foundry** to explain the findings in management language — grounded in that evidence.
>
> Access is **passwordless** where possible: a workload **managed identity** connects to PostgreSQL, Blob, Foundry and AI Search. Secrets live in **Key Vault**. Everything is observed through **Application Insights** and **Log Analytics**.
>
> We reused existing platform resources — the Container Apps environment, registry, Foundry, AI Search and monitoring — and added DORA's own data, identity, secret and email resources. That keeps the prototype lean without compromising the design."

## Anticipated Follow-Ups

- **"Why two workloads?"** Separation of concerns: ingestion runs on a schedule and can scale independently from the interactive web app.
- **"Why managed identity?"** No connection strings to leak; RBAC-scoped, passwordless data access.
- **"Where does the AI get its facts?"** From retrieved evidence via Azure AI Search — not model memory. Numbers are always deterministic.
- **"Is there a VNet?"** Not in this prototype; access is secured by managed identity and RBAC. Production would add private networking (see [../copilot-studio/target-architecture.md](../copilot-studio/target-architecture.md) and roadmap).

## Key Phrases to Use

- "Deterministic numbers, grounded explanations."
- "Passwordless by managed identity."
- "Reuse where sensible, own the data layer."
</content>
