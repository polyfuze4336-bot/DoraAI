# DORA Architecture Decisions

**Version:** 1.0  
**Date:** 2026-08-17  
**Scope:** MVP architecture decisions  
**Related document:** [DORA Architecture](architecture.md)

## Decision Record Convention

Each decision is accepted for the MVP unless noted otherwise. "Accepted" defines the intended implementation direction; it does not authorise Azure provisioning. The deployment subscription, region, resource group, data licences, and model quota remain approval gates.

A decision should be revisited when its stated trigger occurs, not simply because a more elaborate technology exists.

## Decision Index

| ID | Decision | Status |
|---|---|---|
| ADR-001 | Use five modular intelligence services, not five autonomous agents | Accepted |
| ADR-002 | Start as a modular monolith with two deployable workloads | Accepted |
| ADR-003 | Use TypeScript across the MVP application and pipeline | Accepted |
| ADR-004 | Define stable ports and contracts around domains and providers | Accepted |
| ADR-005 | Host the MVP on Azure Container Apps Consumption | Accepted, pending subscription approval |
| ADR-006 | Use one scheduled job with a SQL-backed due-work dispatcher | Accepted |
| ADR-007 | Use Blob Storage plus Azure SQL Database serverless | Accepted, pending pricing/region validation |
| ADR-008 | Preserve immutable raw data and end-to-end lineage | Accepted |
| ADR-009 | Keep analytics, forecasts, scenarios, and alert thresholds deterministic | Accepted |
| ADR-010 | Use one shared DORA AI Reasoning Layer | Accepted |
| ADR-011 | Use Microsoft Foundry with model-independent application contracts | Accepted, pending model quota approval |
| ADR-012 | Introduce a retrieval port and defer Azure AI Search | Accepted |
| ADR-013 | Make the Insight Repository a durable, immutable publication boundary | Accepted |
| ADR-014 | Use Entra ID, managed identity, least privilege, and Key Vault | Accepted |
| ADR-015 | Standardise on OpenTelemetry, Application Insights, and Log Analytics | Accepted |
| ADR-016 | Deliver in-app/PDF reporting first and abstract outbound notifications | Accepted |
| ADR-017 | Use Bicep and GitHub Actions OIDC for delivery | Accepted |
| ADR-018 | Define "live" by source cadence and explicit freshness | Accepted |
| ADR-019 | Defer Service Bus, API Management, private networking, and multi-region | Accepted |
| ADR-020 | Extract a Foundry agent only when measurable criteria are met | Accepted |

---

## ADR-001: Use Five Modular Intelligence Services, Not Five Autonomous Agents

**Status:** Accepted  
**Context:** DORA requires Live Commodity Price, Live News & Updates, Emerging Risk, Market Intelligence, and Manufacturing Status. Five independent LLM agents would multiply model calls, prompts, tool permissions, evaluation work, latency, and operational cost before their independence has demonstrated value.

**Decision:** Implement each domain as a typed intelligence service sharing canonical data, deterministic analytics, retrieval, reasoning, security, and telemetry. No domain invokes a model directly.

**Why:**

- The domains overlap heavily in sources, entities, signals, and evidence.
- Most MVP work is ingestion, normalisation, calculation, and retrieval rather than autonomous reasoning.
- Shared orchestration reduces cost and inconsistent conclusions.
- A stable service interface still permits later agent-backed implementations.

**Consequences:**

- Domain ownership must be enforced through module boundaries and tests.
- The shared reasoning layer is a critical component and requires strong policy/versioning.
- Domain-specific model tuning is deferred.

**Revisit when:** A domain requires independent tools, security policy, model/evaluation lifecycle, scaling, budget, or demonstrably superior multi-step reasoning.

## ADR-002: Start as a Modular Monolith with Two Deployable Workloads

**Status:** Accepted  
**Context:** A greenfield prototype needs rapid iteration and low operational overhead. Premature microservices would create deployment, networking, messaging, tracing, schema, and ownership work before the product shape is known.

**Decision:** Use a monorepo with a DORA Web/BFF Container App and a DORA Pipeline Container Apps Job. Share packages for domain contracts, analytics, validation, retrieval, provider ports, and telemetry.

**Why:**

- Two deployables match the natural interactive and scheduled execution profiles.
- In-process domain calls are cheap, observable, and easy to test.
- Module contracts provide a path to service extraction without distributing the system now.

**Consequences:**

- A defect can affect multiple logical modules within one workload.
- Module dependency rules must be enforced in code review and automated checks.
- Independent scaling and release cadence are limited initially.

**Revisit when:** Measured load, failure isolation, security boundaries, or team ownership require independent deployment.

## ADR-003: Use TypeScript Across the MVP Application and Pipeline

**Status:** Accepted  
**Context:** Next.js is the proposed web/BFF stack. Adding Python solely for initial ingestion or basic forecasting would introduce a second dependency graph, build system, container baseline, validation model, and shared-contract problem.

**Decision:** Use TypeScript/Node.js for the web, BFF, connectors, pipeline, deterministic analytics, initial forecasts, and scenarios.

**Why:**

- One language accelerates a small team and enables shared schemas and domain types.
- The initial forecast methods do not require a specialised Python ML stack.
- Operational images and CI are simpler.

**Consequences:**

- Some mature scientific libraries are unavailable or less capable than Python equivalents.
- Numerical behaviour needs explicit tests and stable libraries.
- The forecast port must remain language-neutral at the process boundary.

**Revisit when:** Forecast quality requires Python-native libraries, notebooks, training pipelines, or specialised data engineering. A Python forecast service can then implement the same contract.

## ADR-004: Define Stable Ports and Contracts Around Domains and Providers

**Status:** Accepted  
**Context:** Azure services, source vendors, search providers, models, and notification channels will change between prototype and production.

**Decision:** Domain code depends on application ports for source access, object storage, repositories, retrieval, reasoning, forecasting, clocks, and notifications. Azure/vendor SDKs remain in adapters.

**Why:**

- Prevents cloud/vendor details from contaminating business rules.
- Enables fast tests with in-memory adapters.
- Makes deferred services and later agent extraction possible without changing callers.

**Consequences:**

- Interfaces and mapping code add a small amount of initial ceremony.
- Ports must express domain needs rather than mirror vendor APIs.
- Contract versioning becomes an architectural responsibility.

**Revisit when:** Never as a principle; individual ports should be simplified or split when their consumers prove different needs.

## ADR-005: Host the MVP on Azure Container Apps Consumption

**Status:** Accepted, pending subscription approval  
**Context:** DORA needs a web workload and scheduled pipeline with low prototype idle cost, managed ingress, container portability, revisions, and a credible production path.

**Decision:** Use one Azure Container Apps Consumption environment for the web/BFF Container App and scheduled pipeline Job. Use minimum replicas of zero where demo latency permits.

**Why:**

- Consumption supports scale-to-zero and avoids cluster management.
- The same platform supports apps and jobs.
- Containers provide a clean evolution path to separately scaled services.

**Consequences:**

- Cold starts may affect the first request or scheduled demo.
- Execution, networking, and quota limits must be validated.
- ACR and container build/security practices are required.

**Revisit when:** Sustained traffic makes dedicated workload profiles cheaper, cold starts violate SLOs, or networking/compliance requirements require a different hosting model.

## ADR-006: Use One Scheduled Job with a SQL-Backed Due-Work Dispatcher

**Status:** Accepted  
**Context:** Connectors and tasks have different cadences, but creating an Azure job or workflow resource for each source would increase cost and management overhead.

**Decision:** Run one Container Apps Job every 15 minutes. It reads schedules, checkpoints, and leases from SQL, claims due work, and executes bounded tasks with configured concurrency.

**Why:**

- Supports multiple cadences using one inexpensive resource.
- SQL leases and checkpoints provide adequate MVP reliability.
- Scheduling rules remain data-driven and testable.

**Consequences:**

- The dispatcher is a single batch control point.
- Long tasks must be bounded to avoid delaying others.
- Dead-letter and retry capabilities are less sophisticated than a broker.

**Revisit when:** Runs overlap persistently, backlog grows, tasks need immediate event-driven handling, or independent connector scaling becomes necessary. Introduce Service Bus behind the task contract then.

## ADR-007: Use Blob Storage Plus Azure SQL Database Serverless

**Status:** Accepted, pending pricing and region validation  
**Context:** DORA needs inexpensive immutable payload retention, relational integrity, time-aware queries, transactional application state, and a serving store.

**Decision:** Store raw and curated artefacts in Blob Storage with hierarchical namespace enabled. Store catalogs, canonical observations, operational state, signals, forecasts, insights, user configuration, and read models in Azure SQL Database serverless.

**Why:**

- Blob is inexpensive and suitable for source snapshots and replay.
- SQL fits relationships, constraints, scenarios, watchlists, and management queries.
- Serverless auto-pause limits idle prototype cost.
- Two stores are sufficient without introducing a lakehouse or multiple databases.

**Consequences:**

- SQL auto-pause can introduce cold-start latency.
- Analytical workloads must be bounded and indexed carefully.
- Data is deliberately duplicated between immutable artefacts and serving tables.

**Revisit when:** Data volume, concurrency, analytics, or SLOs exceed serverless SQL. Evaluate provisioned SQL, PostgreSQL, Fabric/Databricks, or a dedicated analytical store from measured requirements.

## ADR-008: Preserve Immutable Raw Data and End-to-End Lineage

**Status:** Accepted  
**Context:** Commodity sources are revised, inconsistent, and subject to licensing constraints. Insights must be auditable and transformations reproducible.

**Decision:** Persist every accepted source response before normalisation with source identity, timestamps, checksum, licence metadata, and ingestion run. Version canonical transformations, features, forecasts, prompts, and evidence links.

**Why:**

- Enables replay without refetching providers.
- Supports correction, audit, and source dispute investigation.
- Makes insight citations and freshness defensible.

**Consequences:**

- Storage grows and requires retention/lifecycle rules.
- Lineage fields are mandatory throughout the schema.
- Sensitive/licensed payload retention needs explicit policy.

**Revisit when:** Retention or licensing rules require deletion or reduced snapshots; preserve the lineage model even if payload retention changes.

## ADR-009: Keep Analytics, Forecasts, Scenarios, and Alert Thresholds Deterministic

**Status:** Accepted  
**Context:** Language models are unsuitable as authoritative calculators and cannot guarantee repeatable thresholds, time-series transformations, or forecast outputs.

**Decision:** Implement numeric metrics, signals, risk formulas, forecasts, scenario calculations, and alert rule evaluation in versioned code. Models may explain these outputs but cannot modify them.

**Why:**

- Results are testable, reproducible, and auditable.
- Forecast evaluation and confidence intervals remain meaningful.
- Alert behaviour is predictable and cost-independent.

**Consequences:**

- Domain formulas and models require explicit implementation and maintenance.
- The AI may need to abstain when deterministic inputs are insufficient.
- Product language must distinguish calculated facts, forecasts, scenarios, and AI interpretations.

**Revisit when:** Never for authoritative calculations. ML models may replace simple formulas only when trained, evaluated, versioned, and served as deterministic model artefacts.

## ADR-010: Use One Shared DORA AI Reasoning Layer

**Status:** Accepted  
**Context:** All intelligence domains need grounded synthesis, but independent model integrations would duplicate controls and produce inconsistent behaviour.

**Decision:** Route all model use through one reasoning layer responsible for intent/policy checks, domain-service calls, retrieval, allow-listed deterministic tools, prompt assembly, structured output, citation validation, repair/abstention, and invocation telemetry.

**Why:**

- Centralises safety, token budgets, model routing, prompt versioning, and evaluation.
- Reduces duplicate model calls and inconsistent citation behaviour.
- Keeps domain modules model-independent.

**Consequences:**

- The layer must avoid becoming an unstructured "god service."
- Domain prompt components need clear ownership.
- Its availability affects fresh AI briefs, though deterministic views remain operational.

**Revisit when:** A domain satisfies the dedicated-agent criteria; retain shared policy, telemetry, and evidence standards even after extraction.

## ADR-011: Use Microsoft Foundry with Model-Independent Application Contracts

**Status:** Accepted, pending model quota approval  
**Context:** DORA requires managed enterprise model access, deployment governance, and an evolution path to agents and evaluations. Model availability, cost, and quality change over time.

**Decision:** Use a Microsoft Foundry project/resource and an approved Azure OpenAI model deployment. Hide model SDK details behind a reasoning/model port and require structured outputs.

**Why:**

- Aligns with Azure-native priorities and future Foundry agent evolution.
- Provides managed identity, model deployments, safety features, and evaluation tooling.
- Model independence enables routing small and large tasks economically.

**Consequences:**

- Region, quota, deployment names, and policy must be confirmed before implementation.
- Structured output differences across models require adapter tests.
- Model changes require regression evaluation, not configuration-only promotion.

**Revisit when:** A different approved provider offers a material quality, residency, availability, or cost advantage. The application contract remains unchanged.

## ADR-012: Introduce a Retrieval Port and Defer Azure AI Search

**Status:** Accepted  
**Context:** The MVP needs grounded evidence but begins with a small structured dataset and limited documents. Azure AI Search adds a fixed service, indexing pipeline, security trimming, and evaluation work.

**Decision:** Define retrieval, evidence, chunk, citation, and authorisation contracts now. Implement MVP retrieval through Azure SQL metadata/lexical/structured queries and approved Blob reads. Add Azure AI Search behind the retrieval port only when triggered.

**Why:**

- Enables credible RAG without paying for unused scale.
- Stable citation IDs prevent the search provider from leaking into insights.
- Retrieval quality can be measured before selecting a more capable service.

**Consequences:**

- MVP semantic and multilingual retrieval will be limited.
- SQL retrieval must remain bounded and indexed.
- Chunking and evidence metadata still need to be designed correctly now.

**Revisit when:** Corpus size, latency, hybrid/vector relevance, semantic ranking, or multilingual requirements exceed SQL retrieval.

## ADR-013: Make the Insight Repository a Durable, Immutable Publication Boundary

**Status:** Accepted  
**Context:** Dashboards, reports, alerts, and audits need the same validated interpretation even after data, prompts, or models change.

**Decision:** Publish validated insights as immutable versions containing structured content, evidence/citations, freshness, limitations, model/prompt/tool versions, and review metadata. Corrections supersede rather than mutate.

**Why:**

- Decouples expensive reasoning from repeated dashboard reads.
- Makes reports and notifications reproducible.
- Supports review, feedback, quality evaluation, and audit.

**Consequences:**

- The UI must handle superseded and stale insights.
- Retention and access policy apply to generated content.
- Publication validation is a required workflow stage.

**Revisit when:** Never as a publication principle; storage implementation may evolve.

## ADR-014: Use Entra ID, Managed Identity, Least Privilege, and Key Vault

**Status:** Accepted  
**Context:** DORA is initially an internal single-tenant application that accesses data, storage, a database, and a model. Long-lived credentials would increase risk and operational burden.

**Decision:** Authenticate users through Microsoft Entra ID and server-enforce app roles. Use workload managed identities and data-plane RBAC for Azure dependencies. Store only unavoidable third-party credentials in Key Vault. Use GitHub OIDC for deployment.

**Why:**

- Eliminates most application secrets.
- Aligns access with enterprise identity and conditional access.
- Supports least privilege and auditable role assignment.

**Consequences:**

- Entra app registration, groups/roles, and managed-identity RBAC require deployment coordination.
- Local development needs a documented developer identity path.
- Source-level authorisation and licence filters remain application responsibilities.

**Revisit when:** External customer access or multi-tenancy becomes a product requirement; redesign tenant isolation and identity explicitly.

## ADR-015: Standardise on OpenTelemetry, Application Insights, and Log Analytics

**Status:** Accepted  
**Context:** The platform crosses browser requests, pipeline runs, source calls, transformations, model invocations, and report delivery. Troubleshooting and cost control require correlated telemetry.

**Decision:** Instrument workloads with OpenTelemetry and W3C trace context, export to workspace-based Application Insights and Log Analytics, and standardise correlation identifiers for ingestion, signals, forecasts, retrieval, model calls, and insights.

**Why:**

- Provides one trace and metric model across application and pipeline workloads.
- Enables source freshness, AI quality, user experience, reliability, and cost dashboards.
- Keeps instrumentation portable.

**Consequences:**

- Cardinality, sampling, redaction, retention, and daily caps require active governance.
- Licensed documents, prompts, secrets, and tokens must not be logged by default.
- Domain-specific quality metrics need explicit implementation.

**Revisit when:** Telemetry volume or organisational standards require additional sinks; retain OpenTelemetry at the application boundary.

## ADR-016: Deliver In-App/PDF Reporting First and Abstract Outbound Notifications

**Status:** Accepted  
**Context:** Management users need reports and alerts, but email/SMS provisioning, domains, consent, deliverability, templates, and recurring cost can delay the prototype.

**Decision:** Require in-app alerts and print-quality HTML/PDF reports for the MVP. Define a notification port and persistent delivery audit. Add Azure Communication Services only when outbound delivery is approved.

**Why:**

- Produces a convincing, testable workflow without blocking on communication infrastructure.
- Preserves a clean path to email/SMS.
- Ensures reports snapshot validated insight/evidence versions.

**Consequences:**

- Users must visit DORA unless email is explicitly added to MVP scope.
- PDF generation and accessibility need browser/print testing.
- Notification deduplication, cooldown, and acknowledgement are still required.

**Revisit when:** Email or SMS is a validated demo/operational requirement and sender/domain approval exists.

## ADR-017: Use Bicep and GitHub Actions OIDC for Delivery

**Status:** Accepted  
**Context:** No infrastructure or CI/CD exists. The MVP must be repeatable and capable of evolving to production without manual portal drift or stored cloud credentials.

**Decision:** Define Azure resources in Bicep and deploy through GitHub Actions using federated OIDC identity. Keep environment parameters separate and deploy application containers by immutable image digest/tag.

**Why:**

- Bicep is Azure-native and concise for the proposed resource set.
- OIDC removes long-lived deployment secrets.
- Repeatable environments lower recovery and handoff risk.

**Consequences:**

- Subscription approval and federated identity setup are prerequisites.
- Infrastructure validation and what-if checks belong in CI.
- Production promotion needs explicit approvals and environment protection.

**Revisit when:** Organisational policy mandates Terraform or another delivery platform. Preserve declarative infrastructure and secretless federation.

## ADR-018: Define "Live" by Source Cadence and Explicit Freshness

**Status:** Accepted  
**Context:** Many public commodity, macro, and manufacturing sources are delayed, daily, monthly, or revised. Calling all data "real time" would mislead decision makers.

**Decision:** Store source-observed, source-published, retrieved, and processed timestamps plus expected cadence and a freshness state. Present "live" as "current to the source's expected cadence," with visible delayed/stale labels.

**Why:**

- Preserves trust and distinguishes collection latency from provider latency.
- Supports source health alerts and defensible management reporting.
- Allows real-time licensed feeds later without changing the model.

**Consequences:**

- Every connector needs source-specific cadence and timestamp semantics.
- UX must consistently display freshness near values and claims.
- Product language may be less dramatic but more accurate.

**Revisit when:** Never as a principle; thresholds and labels may vary by source and persona.

## ADR-019: Defer Service Bus, API Management, Private Networking, and Multi-Region

**Status:** Accepted  
**Context:** These services solve real scale, governance, isolation, and resilience problems but add fixed cost and delivery complexity. The MVP has no established throughput, external API consumers, SLO, RTO/RPO, or sensitive-network mandate.

**Decision:** Use SQL task state, direct internal calls, Container Apps ingress, identity/RBAC, and one region for the MVP. Preserve ports and boundaries for later Service Bus, API Management/AI gateway, private endpoints, Front Door/WAF, and multi-region recovery.

**Why:**

- Keeps the prototype affordable and reduces operational surfaces.
- Avoids designing for unmeasured requirements.
- The selected modular boundaries permit targeted later additions.

**Consequences:**

- MVP failure isolation, queue durability, API policy, network isolation, and disaster recovery are limited.
- Public endpoints must be secured by identity, HTTPS, least privilege, and application controls.
- Production readiness requires a new threat model and reliability assessment.

**Revisit when:** Security policy, external consumers, sustained backlog, formal SLO/RTO/RPO, or sensitive data classification requires these controls.

## ADR-020: Extract a Foundry Agent Only When Measurable Criteria Are Met

**Status:** Accepted  
**Context:** DORA should be able to evolve into specialised agents without making agent count an architectural goal.

**Decision:** Replace an intelligence-service implementation with a Foundry agent adapter only when the domain requires independent tools/policy/model/evaluation, long-running multi-step reasoning, independent scaling/ownership, or proves a material quality improvement in offline evaluations.

**Why:**

- Connects architecture evolution to user value and measurable engineering needs.
- Prevents duplicated agents and model spend.
- Retains typed contracts, deterministic calculations, evidence, and central governance.

**Consequences:**

- Agent experiments must use evaluation datasets and cost/latency measurements.
- Agent memory, tools, and actions require explicit security and audit design.
- Not every domain is expected to become an agent.

**Revisit when:** A domain crosses a documented threshold; approve agent extraction as its own ADR with evaluation evidence, tool permissions, budget, and fallback behaviour.

## Deferred Decisions

The following choices require product or environment evidence and are intentionally unresolved:

- Exact Azure subscription, resource group, region, naming, and tagging values.
- Initial commodities, manufacturing sites, geographies, and personas.
- Approved public/licensed providers and redistribution rules.
- Foundry account/project shape, model deployment, version, quota, and regional availability.
- Charting, PDF rendering, schema-validation, SQL access, and forecasting libraries.
- Whether outbound email is required in the first demonstrable slice.
- Detailed RTO, RPO, SLO, retention, and data-classification policies.

These should be resolved before or during the implementation phase through focused ADR amendments rather than assumptions embedded in code.
