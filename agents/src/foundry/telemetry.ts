import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

import type { AiRequestTelemetry, AiRequestTelemetrySink } from "./contracts";
import { logStructured } from "@dora/observability";

export class JsonLinesAiTelemetrySink implements AiRequestTelemetrySink {
  constructor(private readonly filePath: string) {}

  async record(event: AiRequestTelemetry): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await appendFile(this.filePath, `${JSON.stringify(event)}\n`, "utf8");
    logStructured({
      event: "ai.request",
      correlationId: event.correlationId,
      timestamp: event.timestamp,
      success: event.success,
      durationMs: event.latencyMs,
      attributes: {
        deployment: event.deployment,
        reportedModel: event.reportedModel,
        reportedModelVersion: event.reportedModelVersion,
        purpose: event.purpose,
        promptTokens: event.tokenUsage.promptTokens,
        completionTokens: event.tokenUsage.completionTokens,
        totalTokens: event.tokenUsage.totalTokens,
        errorType: event.errorType,
      },
    });
  }
}

export class StructuredAiTelemetrySink implements AiRequestTelemetrySink {
  async record(event: AiRequestTelemetry): Promise<void> {
    logAiRequest(event);
  }
}

export class InMemoryAiTelemetrySink implements AiRequestTelemetrySink {
  readonly events: AiRequestTelemetry[] = [];

  async record(event: AiRequestTelemetry): Promise<void> {
    this.events.push(event);
    logAiRequest(event);
  }
}

function logAiRequest(event: AiRequestTelemetry): void {
  logStructured({
    event: "ai.request",
    correlationId: event.correlationId,
    timestamp: event.timestamp,
    success: event.success,
    durationMs: event.latencyMs,
    attributes: {
      deployment: event.deployment,
      reportedModel: event.reportedModel,
      reportedModelVersion: event.reportedModelVersion,
      purpose: event.purpose,
      promptTokens: event.tokenUsage.promptTokens,
      completionTokens: event.tokenUsage.completionTokens,
      totalTokens: event.tokenUsage.totalTokens,
      errorType: event.errorType,
    },
  });
}
