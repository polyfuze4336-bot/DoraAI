import type {
  IntelligenceContext,
  IntelligenceService,
} from "@dora/intelligence";
import type {
  IntelligenceDomain,
  IntelligenceRequest,
  IntelligenceResult,
} from "@dora/shared";

export * from "./engine-interpreter";
export * from "./dora-agent/agent";
export * from "./dora-agent/contracts";
export * from "./dora-agent/foundry-synthesizer";
export * from "./evaluation/contracts";
export * from "./evaluation/evaluator";
export * from "./foundry/client";
export * from "./foundry/configuration";
export * from "./foundry/contracts";
export * from "./foundry/routing";
export * from "./foundry/telemetry";

export interface FoundryAgentInvocation {
  readonly agentId: string;
  readonly request: IntelligenceRequest;
  readonly context: IntelligenceContext;
}

export interface FoundryAgentPort {
  invoke(invocation: FoundryAgentInvocation): Promise<IntelligenceResult>;
}

export class AgentIntelligenceServiceAdapter implements IntelligenceService {
  constructor(
    readonly domain: IntelligenceDomain,
    readonly agentId: string,
    private readonly agentPort: FoundryAgentPort,
  ) {}

  analyse(
    request: IntelligenceRequest,
    context: IntelligenceContext,
  ): Promise<IntelligenceResult> {
    if (request.domain !== this.domain) {
      throw new Error(
        `Expected ${this.domain} request, received ${request.domain}.`,
      );
    }

    return this.agentPort.invoke({ agentId: this.agentId, request, context });
  }
}
