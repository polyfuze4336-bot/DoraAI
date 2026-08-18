# DORA Forecasting and Microsoft Foundry

## Commodity Forecasting

`InterpretableBaselineForecastService` evaluates four transparent baseline families:

- Lag-one persistence
- Seven-observation moving average
- Single exponential smoothing
- Linear regression trend

For each 1, 7, 30, and 90-day horizon, DORA performs expanding-window walk-forward backtesting and selects the baseline with the lowest measured MAE. Every result contains forecast, lower and upper empirical error bounds, confidence, model, model version, horizon, target time, generated time, and historical accuracy.

Backtest metrics include MAE, RMSE, directional accuracy, sample count, and MAPE only when actual values are non-zero. Confidence is a conservative function of backtest sample size and RMSE relative to the series scale. It is not a claim of future accuracy. Bounds use historical backtest RMSE and are not calibrated probabilities.

The `CommodityForecastProvider` interface is the replacement boundary for Azure Machine Learning or Fabric ML. A production provider can return ARIMA, Prophet-equivalent, gradient-boosting, or managed-model forecasts without changing intelligence or UI callers. More complex models should be promoted only after horizon-specific walk-forward evaluation improves on the interpretable baselines with stable performance and acceptable operational cost.

## Microsoft Foundry

Model deployments are environment-owned:

- `DORA_FAST_MODEL`: economical classification, summarisation, news extraction, and routine insights.
- `DORA_REASONING_MODEL`: important synthesis, scenario interpretation, management briefings, and difficult comparative reasoning.
- `DORA_EMBEDDING_MODEL`: knowledge and retrieval embeddings.

No deployment name or model family is embedded in application logic. `DORA_FOUNDRY_ENDPOINT` and API version are also configuration values. Managed Identity obtains data-plane tokens.

Before production selection, benchmark the latest appropriate GPT-5-class Foundry deployments available in the approved target Azure region against DORA evaluation cases. Compare answer groundedness, citation correctness, structured-output reliability, latency, token consumption, safety, and cost. Deployments can then be replaced through configuration without application code changes.

Each AI request records request ID, deployment, reported model/version where available, timestamp, latency, prompt/completion/total tokens, purpose, success/failure, and error type. Local telemetry is JSON Lines under `.dora-data`; production should route the same event contract to Application Insights and the operational database.

DORA never stores or displays chain-of-thought. User-facing analysis includes a concise Reasoning Summary with observed evidence, relevant drivers, conflicting indicators, conclusion, confidence, and uncertainties.

No Foundry resource or model was deployed during this phase because Azure subscription, resource group, region, quota, and cost approval remain deployment gates.
