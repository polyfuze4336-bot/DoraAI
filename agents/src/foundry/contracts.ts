export type DoraModelTier = "fast" | "reasoning" | "embedding";

export type AiRequestPurpose =
  | "classification"
  | "summarisation"
  | "news-extraction"
  | "routine-insight"
  | "important-synthesis"
  | "agent-answer"
  | "embedding";

export interface FoundryModelConfiguration {
  readonly endpoint: string;
  readonly fastDeployment: string;
  readonly reasoningDeployment: string;
  readonly embeddingDeployment: string;
  readonly apiVersion: string;
}

export interface AiTokenUsage {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export interface AiRequestTelemetry {
  readonly requestId: string;
  readonly correlationId: string;
  readonly deployment: string;
  readonly reportedModel?: string;
  readonly reportedModelVersion?: string;
  readonly timestamp: string;
  readonly latencyMs: number;
  readonly tokenUsage: AiTokenUsage;
  readonly purpose: AiRequestPurpose;
  readonly success: boolean;
  readonly errorType?: string;
}

export interface AiRequestTelemetrySink {
  record(event: AiRequestTelemetry): Promise<void>;
}

export interface ReasoningSummary {
  readonly observedEvidence: readonly string[];
  readonly relevantDrivers: readonly string[];
  readonly conflictingIndicators: readonly string[];
  readonly conclusion: string;
  readonly confidence: number;
  readonly uncertainties: readonly string[];
}

export interface FoundryMessage {
  readonly role: "system" | "user" | "assistant";
  readonly content: string;
}

export interface FoundryChatRequest {
  readonly correlationId?: string;
  readonly tier: Exclude<DoraModelTier, "embedding">;
  readonly purpose: Exclude<AiRequestPurpose, "embedding">;
  readonly messages: readonly FoundryMessage[];
  readonly maxTokens?: number;
  readonly temperature?: number;
  readonly jsonResponse?: boolean;
}

export interface FoundryChatResult {
  readonly requestId: string;
  readonly deployment: string;
  readonly reportedModel?: string;
  readonly content: string;
  readonly tokenUsage: AiTokenUsage;
}
