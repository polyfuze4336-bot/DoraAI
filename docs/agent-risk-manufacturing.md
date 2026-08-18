# DORA Agent, Risk, and Manufacturing Intelligence

## Primary Intelligence Agent

DORA uses one specialist `DoraIntelligenceAgent`. It retrieves observed market data, measured forecasts, deterministically scored risks, manufacturing status, supporting research, and citations before composing an answer. When Foundry is unavailable, deterministic evidence-bound synthesis remains functional. It does not answer commodity questions from model memory when DORA evidence exists.

Responses distinguish Observed Data, Inference, Forecast, and Recommendation. Significant conclusions retain citation IDs. Percentage scenarios use deterministic sensitivity tools and are labeled calculations rather than forecasts.

The agent supports market questions, condition summaries, signal synthesis, evidence retrieval, forecast interpretation, period comparison, emerging risk explanation, management briefings, contradictory-signal review, and scenarios worth monitoring.

## Ask DORA

The global Ask DORA drawer is an embedded analyst surface, not a generic chat transcript. It provides:

- Suggested questions based on current market activity
- Commodity chips and date filters
- NDJSON streaming status and answer events
- Structured answer sections
- Inline forecast chart
- Clickable and expandable evidence
- Reasoning Summary
- Principal drivers and risk factors
- Forecast invalidation conditions
- Follow-up questions and related analysis

The API invokes the primary agent and the same DORA tool contracts used by other workflows.

## Emerging Risk

`DeterministicRiskEngine` calculates probability, impact, velocity, confidence, and composite score from normalized inputs. AI may explain these outputs but cannot invent or modify scores.

Probability combines base likelihood, signal strength, and source agreement. Impact combines severity and portfolio exposure. Velocity adjusts urgency, and confidence discounts incomplete or conflicting evidence.

`/risks` provides filters, a probability-impact heatmap, ranked trend bars, detection timeline, detailed risk fields, supporting signals, management implication, evidence links, and scoring basis. Prototype risk inputs are explicitly labeled seeded demo data.

## Manufacturing Intelligence

Normalized records contain site, region, product, capacity, utilization, planned and actual output, downtime, inventory, feedstock availability, demand indicator, status, timestamp, and data origin.

Production uses PostgreSQL. Local development uses a persistent SQLite application database at `.dora-data/dora-local.db`, seeded from the migration-aligned artifact only when empty. No manufacturing seed values are hard-coded in UI components.

`/manufacturing` displays capacity utilization, production change, downtime, inventory, demand, regional activity, feedstock coverage, and status. Every seeded row is visibly labeled as demo data.

`calculateManufacturingOutlookInfluence` deterministically transforms utilization, demand, feedstock, output variance, and downtime into a supportive/neutral/softening market indicator. This calculated demand signal can influence DORA's outlook but does not replace commodity forecasting models.
