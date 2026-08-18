# DORA Signal Normalisation

## Purpose

Provider adapters preserve source-specific meaning while producing typed provider records. The `@dora/normalization` package then maps those records into one canonical `DoraSignal` contract consumed by enrichment, intelligence, forecasting, alerting, and future agents.

Adding or replacing a provider does not change downstream consumers. A new adapter registers one provider-specific signal normalizer.

## Canonical Model

Every signal contains:

- `signalId`: deterministic SHA-256-derived identifier.
- `signalType`: one of `PRICE`, `NEWS`, `RISK`, `MARKET_INTELLIGENCE`, `MANUFACTURING`, `MACRO`, `SUPPLY`, `DEMAND`, `INVENTORY`, `GEOPOLITICAL`, `WEATHER`, or `SHIPPING`.
- `source` and `provider`.
- canonical commodity identity and region.
- source `timestamp` and pipeline `ingestedAt`.
- typed value and unit.
- direction, normalized magnitude, sentiment, relevance, and confidence.
- freshness status, age, expected cadence, and assessment time.
- headline, description, source URL, and provider metadata.
- complete immutable `DataProvenance`.
- `rawReference` containing provider/external/source IDs, source-row checksum, and raw-batch path.

Signals are validated with `doraSignalSchema` before persistence. Confidence, relevance, and magnitude are constrained to the range 0-1.

## Provider Mappings

| Provider | Canonical type | Mapping |
|---|---|---|
| EIA | `PRICE` | Energy observation, region, price/unit, sequential direction and magnitude |
| World Bank Pink Sheet | `PRICE` | Monthly benchmark observation, workbook publication, sequential movement |
| FRED | `MACRO` | Series value/unit, real-time revision metadata, sequential movement |
| GDELT | `NEWS` | Headline, source metadata, configured commodity relevance; sentiment remains `UNKNOWN` because ArticleList does not provide a defensible sentiment value |

Price sentiment remains `NEUTRAL`; a price increase is direction, not inherently positive or negative for management. GDELT sentiment is not inferred from headline text. This avoids manufactured interpretation.

## Direction and Magnitude

For sequential numeric records:

$$
\Delta = \frac{x_t - x_{t-1}}{|x_{t-1}|}
$$

- `UP` when $\Delta \ge 0.001$.
- `DOWN` when $\Delta \le -0.001$.
- `FLAT` within that tolerance.
- `UNKNOWN` when no prior observation exists.
- `magnitude = \min(|\Delta|, 1)`.

The original current/previous values and unbounded percentage change remain in metadata.

## Freshness

Signal freshness compares the source timestamp with normalization time using the provider's configured `refreshMinutes`:

- `fresh`: age at most 1.5 cadence intervals.
- `delayed`: age at most 3 cadence intervals.
- `stale`: older than 3 intervals.
- `unknown`: timestamps cannot be interpreted.

Historical benchmark records correctly become stale; they remain useful history rather than pretending to be current signals.

## Traceability and Storage

For each provider run the pipeline writes:

1. Raw provider fetch output.
2. Provider-normalized canonical records.
3. Canonical DORA signals.

Each signal preserves the original provenance object and links to the raw batch path. The source row/article checksum is retained. No normalization stage mutates or discards the raw layer.

```text
raw provider data
  -> provider canonical record + DataProvenance
  -> DoraSignal + same DataProvenance + rawReference
```

Unsupported provider types fail explicitly with `No canonical signal normalizer`; records are never silently dropped.