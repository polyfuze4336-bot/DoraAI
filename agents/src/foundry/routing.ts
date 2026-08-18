import type { AiRequestPurpose, DoraModelTier } from "./contracts";

export function routeModelWorkload(
  purpose: AiRequestPurpose,
  question = "",
): DoraModelTier {
  if (purpose === "embedding") return "embedding";
  if (purpose === "important-synthesis") return "reasoning";
  if (
    purpose === "classification" ||
    purpose === "summarisation" ||
    purpose === "news-extraction" ||
    purpose === "routine-insight"
  ) {
    return "fast";
  }
  return requiresComplexReasoning(question) ? "reasoning" : "fast";
}

function requiresComplexReasoning(question: string): boolean {
  return /\b(why|compare|top risks?|contradict|conflict|management|executive|scenario|what (?:would|happens?)|invalidate|interpret)\b/i.test(
    question,
  );
}
