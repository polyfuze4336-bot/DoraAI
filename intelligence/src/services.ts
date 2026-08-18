import type { IntelligenceSignal } from "@dora/shared";

import { EvidenceBackedIntelligenceService } from "./intelligence-service";

function hasMaterialSignal(signals: readonly IntelligenceSignal[]): boolean {
  return signals.some((signal) =>
    ["high", "critical"].includes(signal.severity),
  );
}

export class CommodityPriceIntelligenceService extends EvidenceBackedIntelligenceService {
  readonly domain = "commodity-price" as const;

  protected suggestActions(
    signals: readonly IntelligenceSignal[],
  ): readonly string[] {
    return hasMaterialSignal(signals)
      ? ["Review price exposure and validate current purchasing thresholds."]
      : ["Continue monitoring current price bands."];
  }
}

export class NewsUpdatesIntelligenceService extends EvidenceBackedIntelligenceService {
  readonly domain = "news-updates" as const;

  protected suggestActions(
    signals: readonly IntelligenceSignal[],
  ): readonly string[] {
    return hasMaterialSignal(signals)
      ? ["Review the linked source event and confirm operational relevance."]
      : ["No immediate news-driven action is indicated."];
  }
}

export class EmergingRiskIntelligenceService extends EvidenceBackedIntelligenceService {
  readonly domain = "emerging-risk" as const;

  protected suggestActions(
    signals: readonly IntelligenceSignal[],
  ): readonly string[] {
    return hasMaterialSignal(signals)
      ? ["Assign an owner and test the relevant mitigation scenario."]
      : ["Maintain the current risk watch cadence."];
  }
}

export class MarketIntelligenceService extends EvidenceBackedIntelligenceService {
  readonly domain = "market-intelligence" as const;

  protected suggestActions(
    signals: readonly IntelligenceSignal[],
  ): readonly string[] {
    return hasMaterialSignal(signals)
      ? ["Compare sourcing and inventory scenarios before the next commitment."]
      : ["Preserve the current market posture and monitor leading indicators."];
  }
}

export class ManufacturingStatusIntelligenceService extends EvidenceBackedIntelligenceService {
  readonly domain = "manufacturing-status" as const;

  protected suggestActions(
    signals: readonly IntelligenceSignal[],
  ): readonly string[] {
    return hasMaterialSignal(signals)
      ? [
          "Validate material coverage and production continuity with the site owner.",
        ]
      : ["No manufacturing intervention is currently indicated."];
  }
}
