import { FoundryModelClient } from "../foundry/client";
import { routeModelWorkload } from "../foundry/routing";
import type {
  DoraAgentAnswer,
  DoraAgentEvidence,
  DoraAgentQuery,
  DoraAgentSynthesizer,
} from "./contracts";

export class FoundryDoraAgentSynthesizer implements DoraAgentSynthesizer {
  constructor(private readonly client: FoundryModelClient) {}

  async synthesize(
    query: DoraAgentQuery,
    evidence: DoraAgentEvidence,
  ): Promise<
    Omit<DoraAgentAnswer, "answerId" | "question" | "generatedAt" | "mode">
  > {
    const tier = routeModelWorkload("agent-answer", query.question);
    const result = await this.client.chat({
      correlationId: query.correlationId,
      tier: tier === "reasoning" ? "reasoning" : "fast",
      purpose: tier === "reasoning" ? "important-synthesis" : "agent-answer",
      jsonResponse: true,
      messages: [
        {
          role: "system",
          content: [
            "You are DORA, a commodity intelligence analyst.",
            "Use only supplied tool evidence; never answer from model memory when evidence exists.",
            "Return concise JSON matching the supplied response schema.",
            "Separate observedData, inference, forecast, and recommendation.",
            "Cite significant conclusions using supplied citation IDs.",
            "Do not expose chain-of-thought. Provide only the structured reasoningSummary fields.",
            "Do not invent numerical risk scores or forecasts.",
          ].join(" "),
        },
        {
          role: "user",
          content: JSON.stringify({
            question: query.question,
            query,
            evidence,
          }),
        },
      ],
    });
    const parsed = JSON.parse(result.content) as Omit<
      DoraAgentAnswer,
      "answerId" | "question" | "generatedAt" | "mode"
    >;
    validateSynthesis(parsed, evidence);
    return parsed;
  }
}

function validateSynthesis(
  value: Omit<
    DoraAgentAnswer,
    "answerId" | "question" | "generatedAt" | "mode"
  >,
  evidence: DoraAgentEvidence,
): void {
  if (!value?.summary || !value.sections || !value.reasoningSummary) {
    throw new Error("Foundry returned an invalid DORA response structure.");
  }
  const allowedCitationIds = new Set(evidence.citations.map((item) => item.id));
  if (
    value.citations.some((citation) => !allowedCitationIds.has(citation.id))
  ) {
    throw new Error(
      "Foundry returned a citation that was not supplied by DORA tools.",
    );
  }
  if (
    !Number.isFinite(value.reasoningSummary.confidence) ||
    value.reasoningSummary.confidence < 0 ||
    value.reasoningSummary.confidence > 1
  ) {
    throw new Error(
      "Foundry returned an invalid reasoning summary confidence.",
    );
  }
}
