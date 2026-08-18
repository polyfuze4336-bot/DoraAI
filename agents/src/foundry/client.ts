import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";

import type {
  AiRequestPurpose,
  AiRequestTelemetrySink,
  AiTokenUsage,
  DoraModelTier,
  FoundryChatRequest,
  FoundryChatResult,
  FoundryModelConfiguration,
} from "./contracts";

const cognitiveServicesScope = "https://cognitiveservices.azure.com/.default";

interface ChatPayload {
  readonly id?: string;
  readonly model?: string;
  readonly model_version?: string;
  readonly choices?: readonly {
    readonly message?: { readonly content?: string };
  }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly completion_tokens?: number;
    readonly total_tokens?: number;
  };
}

interface EmbeddingPayload {
  readonly model?: string;
  readonly data?: readonly { readonly embedding?: readonly number[] }[];
  readonly usage?: {
    readonly prompt_tokens?: number;
    readonly total_tokens?: number;
  };
}

export class FoundryModelClient {
  constructor(
    private readonly config: FoundryModelConfiguration,
    private readonly telemetry: AiRequestTelemetrySink,
    private readonly credential: TokenCredential = new DefaultAzureCredential(),
    private readonly fetchImplementation: typeof fetch = fetch,
  ) {}

  async chat(request: FoundryChatRequest): Promise<FoundryChatResult> {
    const deployment = this.deployment(request.tier);
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomUUID();
    try {
      const response = await this.fetchImplementation(
        this.url(deployment, "chat/completions"),
        {
          method: "POST",
          headers: await this.headers(),
          body: JSON.stringify({
            messages: request.messages,
            max_tokens: request.maxTokens ?? 900,
            temperature: request.temperature ?? 0.1,
            response_format: request.jsonResponse
              ? { type: "json_object" }
              : undefined,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(`Foundry request failed: HTTP ${response.status}`);
      }
      const payload = (await response.json()) as ChatPayload;
      const tokenUsage = usage(payload.usage);
      const resolvedRequestId = payload.id ?? requestId;
      await this.record({
        requestId: resolvedRequestId,
        correlationId: request.correlationId ?? resolvedRequestId,
        deployment,
        reportedModel: payload.model,
        reportedModelVersion: payload.model_version,
        timestamp,
        latencyMs: Date.now() - startedAt,
        tokenUsage,
        purpose: request.purpose,
        success: true,
      });
      return {
        requestId: resolvedRequestId,
        deployment,
        reportedModel: payload.model,
        content: payload.choices?.[0]?.message?.content ?? "",
        tokenUsage,
      };
    } catch (error) {
      await this.recordFailure(
        requestId,
        request.correlationId ?? requestId,
        deployment,
        timestamp,
        startedAt,
        request.purpose,
        error,
      );
      throw error;
    }
  }

  async embed(
    input: string | readonly string[],
    purpose: AiRequestPurpose = "embedding",
  ): Promise<readonly (readonly number[])[]> {
    const deployment = this.deployment("embedding");
    const startedAt = Date.now();
    const timestamp = new Date().toISOString();
    const requestId = crypto.randomUUID();
    try {
      const response = await this.fetchImplementation(
        this.url(deployment, "embeddings"),
        {
          method: "POST",
          headers: await this.headers(),
          body: JSON.stringify({ input }),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Foundry embedding request failed: HTTP ${response.status}`,
        );
      }
      const payload = (await response.json()) as EmbeddingPayload;
      await this.record({
        requestId,
        correlationId: requestId,
        deployment,
        reportedModel: payload.model,
        timestamp,
        latencyMs: Date.now() - startedAt,
        tokenUsage: usage(payload.usage),
        purpose,
        success: true,
      });
      return (payload.data ?? []).map((item) => item.embedding ?? []);
    } catch (error) {
      await this.recordFailure(
        requestId,
        requestId,
        deployment,
        timestamp,
        startedAt,
        purpose,
        error,
      );
      throw error;
    }
  }

  private deployment(tier: DoraModelTier): string {
    return tier === "fast"
      ? this.config.fastDeployment
      : tier === "reasoning"
        ? this.config.reasoningDeployment
        : this.config.embeddingDeployment;
  }

  private url(deployment: string, operation: string): string {
    return `${this.config.endpoint}/openai/deployments/${encodeURIComponent(deployment)}/${operation}?api-version=${encodeURIComponent(this.config.apiVersion)}`;
  }

  private async headers(): Promise<Record<string, string>> {
    const token = await this.credential.getToken(cognitiveServicesScope);
    if (!token)
      throw new Error("Unable to acquire a Microsoft Foundry access token.");
    return {
      authorization: `Bearer ${token.token}`,
      "content-type": "application/json",
    };
  }

  private record(
    event: Parameters<AiRequestTelemetrySink["record"]>[0],
  ): Promise<void> {
    return this.telemetry.record(event);
  }

  private recordFailure(
    requestId: string,
    correlationId: string,
    deployment: string,
    timestamp: string,
    startedAt: number,
    purpose: AiRequestPurpose,
    error: unknown,
  ): Promise<void> {
    return this.record({
      requestId,
      correlationId,
      deployment,
      timestamp,
      latencyMs: Date.now() - startedAt,
      tokenUsage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
      purpose,
      success: false,
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
  }
}

function usage(
  value: ChatPayload["usage"] | EmbeddingPayload["usage"],
): AiTokenUsage {
  return {
    promptTokens: value?.prompt_tokens ?? 0,
    completionTokens:
      "completion_tokens" in (value ?? {})
        ? ((value as ChatPayload["usage"])?.completion_tokens ?? 0)
        : 0,
    totalTokens: value?.total_tokens ?? 0,
  };
}
