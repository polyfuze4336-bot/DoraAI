# DORA Observability

DORA initializes `@azure/monitor-opentelemetry` in the Next.js Node runtime and scheduled pipeline when `APPLICATIONINSIGHTS_CONNECTION_STRING` is configured. The same workspace-backed Application Insights resource correlates web and job telemetry in Log Analytics.

## Captured Signals

- HTTP request/dependency latency through automatic OpenTelemetry instrumentation
- Page failures through the global error boundary
- API failures/exceptions
- Connector errors and retry attempt
- Ingestion start, duration, counts, result, error and next run
- Scheduled job execution and failure
- AI deployment/model, latency, token usage, purpose and success
- Forecast pipeline duration and horizon count
- Report generation metadata
- Email delivery outcome and recipient count

Correlation IDs propagate through `x-correlation-id`, W3C `traceparent`, ingestion run IDs, AI request IDs and report IDs. Structured logs include identifiers/counts and avoid sensitive report bodies.

## Redaction

The observability layer recursively redacts keys matching authorization, API key, token, secret, password, credential, connection string and report content. Do not add licensed source text, recipient addresses, model prompts or document bodies to telemetry attributes.

## Useful KQL

```kql
requests
| summarize requests=count(), failures=countif(success == false), p95=percentile(duration, 95) by name, bin(timestamp, 15m)
| order by timestamp desc
```

```kql
traces
| where message has_any ("connector.error", "ingestion.failed", "scheduled-job.execution")
| project timestamp, operation_Id, message, customDimensions
| order by timestamp desc
```

```kql
traces
| where message contains 'ai.request'
| extend purpose=tostring(customDimensions.purpose), tokens=toint(customDimensions.totalTokens), latency=toint(customDimensions.durationMs)
| summarize requests=count(), tokens=sum(tokens), p95Latency=percentile(latency, 95) by purpose, bin(timestamp, 1d)
```

```kql
exceptions
| project timestamp, operation_Id, type, outerMessage, cloud_RoleName
| order by timestamp desc
```

Container Apps platform logs remain in `ContainerAppConsoleLogs(_CL)` and `ContainerAppSystemLogs(_CL)` according to the environment log destination.
