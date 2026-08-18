# AI Quality Evaluation

The representative dataset is `config/ai-evaluation-dataset.json`. It contains 30 decision questions across prices, forecasts, risks, sources, freshness, manufacturing, scenarios and management synthesis.

The evaluator in `agents/src/evaluation/evaluator.ts` scores:

- groundedness against required evidence kinds;
- citation correctness against retrieved citation IDs;
- relevance against required decision terms;
- source freshness against per-case age limits;
- numerical claims against reference values and tolerances;
- unsupported and explicitly prohibited claims.

Promotion requires overall score >= 0.80, groundedness >= 0.80, perfect citation correctness, perfect required numerical accuracy and zero unsupported claims. Critical dimensions are not averaged away.

Run the contract checks with:

```powershell
npx vitest run tests/ai-quality-evaluation.test.ts
```

A live Foundry benchmark remains an external deployment step. It must evaluate each configured candidate alias in the target region, preserve the retrieved evidence bundle, record latency/token/cost metadata and retain per-case failures for review.
