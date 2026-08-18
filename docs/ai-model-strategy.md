# DORA AI Model Strategy

## Routing Principle

DORA routes by workload, not by a model name embedded in source. Three deployment aliases are configuration:

- `DORA_FAST_MODEL`: classification, metadata extraction, tagging, basic summaries and signal categorization.
- `DORA_REASONING_MODEL`: weekly synthesis, cross-source reasoning, scenario interpretation, conflicting signals and executive briefings.
- `DORA_EMBEDDING_MODEL`: Search indexing and query embeddings.

The same aliases are editable through authorized settings and can point to different Microsoft Foundry deployments by environment. Managed identity is the only production authentication path.

The specialist agent selects the reasoning tier for why, risk, contradiction, management and scenario questions. Routine evidence-grounded answers use the fast tier. Deterministic services continue to own forecasts, scores, thresholds, scenarios and arithmetic.

## Benchmark Gate

Candidate deployments must be available in the target Azure region and support the required chat/JSON/tool contract. Run all 30 checked-in cases against each candidate with an identical evidence bundle and temperature.

| Dimension             | Measurement                                                          | Promotion gate                                                                             |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Quality               | Human-reviewed task completion plus required-term coverage           | No critical task failure; aggregate relevance at least 0.80.                               |
| Groundedness          | Evidence-kind coverage, valid citations and unsupported-claim checks | At least 0.80 per case; no invented evidence.                                              |
| Citation correctness  | Citation IDs must be members of retrieved evidence                   | 1.00 for every promoted case.                                                              |
| Numerical accuracy    | Extracted values compared with references and tolerance              | 1.00 on all cases with numeric expectations.                                               |
| Freshness             | Evidence timestamps compared with case bounds                        | At least 0.80, with stale evidence disclosed.                                              |
| Latency               | Median and p95 end-to-end response time                              | Fast tier p95 <= 5 seconds; reasoning tier p95 <= 20 seconds.                              |
| Cost                  | Input/output tokens using current regional deployment pricing        | Record cost per successful answer; choose the lowest-cost candidate meeting quality gates. |
| Tool support          | Structured JSON, citation IDs and required tool invocation           | 100% schema-valid responses and mandatory retrieval.                                       |
| Regional availability | Deployment SKU/quota in selected region                              | Required before selection; no cross-region dependency without approval.                    |

A response that sounds plausible but fails citation, numerical or unsupported-claim gates is unsuccessful.

## Selection Record

| Tier      | Selected deployment    | Benchmark status                                             |
| --------- | ---------------------- | ------------------------------------------------------------ |
| Fast      | `dora-fast` alias      | Pending target-region Foundry deployment and live benchmark. |
| Reasoning | `dora-reasoning` alias | Pending target-region Foundry deployment and live benchmark. |
| Embedding | `dora-embedding` alias | Pending target-region Search relevance benchmark.            |

These are aliases, not model names. The production deployment behind each alias is selected only after the live benchmark, quota and regional availability checks. Results must capture deployment name, reported model/version, dataset revision, region, timestamp, quality dimensions, p50/p95 latency, tokens, estimated cost and tool/schema success.

## Change Control

1. Deploy a candidate under a non-production alias.
2. Run the complete evaluation dataset and adversarial citation tests.
3. Compare against the current deployment on identical evidence.
4. Review failures, latency, cost and regional quota.
5. Approve and update deployment configuration, not source code.
6. Observe canary telemetry and retain immediate alias rollback.
