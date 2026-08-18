import type {
  CommodityObservation,
  DoraSignal,
  MarketIntelligenceRecord,
  NewsItem,
} from "@dora/shared";

import type {
  NormalizedProviderType,
  SignalNormalizationContext,
  SignalNormalizer,
} from "./contracts";
import { createSignal, movement, sentimentFromDirection } from "./helpers";

abstract class PriceSignalNormalizer implements SignalNormalizer {
  abstract readonly providerType: NormalizedProviderType;
  protected abstract readonly sourceName: string;
  protected abstract readonly confidence: number;

  normalize(
    items: readonly unknown[],
    context: SignalNormalizationContext,
  ): readonly DoraSignal[] {
    const observations = items
      .map(assertCommodityObservation)
      .sort(
        (left, right) =>
          Date.parse(left.observedAt) - Date.parse(right.observedAt),
      );
    const previousByCommodity = new Map<string, number>();

    return observations.map((observation) => {
      const previousValue = previousByCommodity.get(observation.commodityId);
      const priceMovement = movement(observation.price, previousValue);
      previousByCommodity.set(observation.commodityId, observation.price);

      return createSignal(
        {
          signalType: "PRICE",
          externalId: observation.externalId,
          source: this.sourceName,
          commodity: {
            id: observation.commodityId,
            symbol: observation.symbol,
            name: observation.name,
          },
          region: observation.geography ?? null,
          timestamp: observation.observedAt,
          value: observation.price,
          unit: `${observation.currency}/${observation.unit}`,
          direction: priceMovement.direction,
          magnitude: priceMovement.magnitude,
          sentiment: "NEUTRAL",
          relevance: 0.9,
          confidence: this.confidence,
          headline: `${observation.name}: ${observation.price.toLocaleString("en-US")} ${observation.currency}/${observation.unit}`,
          description:
            priceMovement.percentageChange === null
              ? "No prior canonical observation is available for comparison."
              : `${(priceMovement.percentageChange * 100).toFixed(2)}% change from the previous canonical observation.`,
          metadata: {
            providerType: context.providerType,
            externalId: observation.externalId,
            currency: observation.currency,
            previousValue: previousValue ?? null,
            percentageChange: priceMovement.percentageChange,
            publishedAt: observation.publishedAt ?? null,
          },
          provenance: observation.provenance,
        },
        context,
      );
    });
  }
}

export class EiaSignalNormalizer extends PriceSignalNormalizer {
  readonly providerType = "eia" as const;
  protected readonly sourceName = "U.S. Energy Information Administration";
  protected readonly confidence = 0.94;
}

export class WorldBankSignalNormalizer extends PriceSignalNormalizer {
  readonly providerType = "world-bank-pink-sheet" as const;
  protected readonly sourceName = "World Bank Pink Sheet";
  protected readonly confidence = 0.92;
}

export class FredSignalNormalizer implements SignalNormalizer {
  readonly providerType = "fred" as const;

  normalize(
    items: readonly unknown[],
    context: SignalNormalizationContext,
  ): readonly DoraSignal[] {
    const records = items
      .map(assertMarketIntelligenceRecord)
      .sort(
        (left, right) =>
          Date.parse(left.effectiveAt) - Date.parse(right.effectiveAt),
      );
    const previousBySeries = new Map<string, number>();

    return records.map((record) => {
      const body = parseFredBody(record.body);
      const previousValue = previousBySeries.get(body.seriesId);
      const macroMovement = movement(body.value, previousValue);
      previousBySeries.set(body.seriesId, body.value);

      return createSignal(
        {
          signalType: "MACRO",
          externalId: record.externalId,
          source: "Federal Reserve Economic Data",
          commodity: record.commodityIds[0]
            ? { id: record.commodityIds[0] }
            : null,
          region: "United States",
          timestamp: record.effectiveAt,
          value: body.value,
          unit: body.unit,
          direction: macroMovement.direction,
          magnitude: macroMovement.magnitude,
          sentiment: sentimentFromDirection(macroMovement.direction),
          relevance: record.commodityIds.length ? 0.86 : 0.72,
          confidence: 0.9,
          headline: `${record.title}: ${body.value.toLocaleString("en-US")} ${body.unit}`,
          description:
            macroMovement.percentageChange === null
              ? "No prior canonical observation is available for comparison."
              : `${(macroMovement.percentageChange * 100).toFixed(2)}% change from the previous release in this ingestion window.`,
          metadata: {
            providerType: context.providerType,
            externalId: record.externalId,
            seriesId: body.seriesId,
            realtimeStart: body.realtimeStart,
            realtimeEnd: body.realtimeEnd,
            previousValue: previousValue ?? null,
            percentageChange: macroMovement.percentageChange,
          },
          provenance: record.provenance,
        },
        context,
      );
    });
  }
}

export class GdeltSignalNormalizer implements SignalNormalizer {
  readonly providerType = "gdelt" as const;

  normalize(
    items: readonly unknown[],
    context: SignalNormalizationContext,
  ): readonly DoraSignal[] {
    return items.map(assertNewsItem).map((article) =>
      createSignal(
        {
          signalType: "NEWS",
          externalId: article.externalId,
          source: "GDELT DOC 2.0",
          commodity: article.commodityIds[0]
            ? { id: article.commodityIds[0] }
            : null,
          region: null,
          timestamp: article.publishedAt,
          value: null,
          unit: null,
          direction: "UNKNOWN",
          magnitude: null,
          sentiment: "UNKNOWN",
          relevance: article.commodityIds.length ? 0.82 : 0.65,
          confidence: 0.7,
          headline: article.headline,
          description:
            article.summary ??
            "Global news article matched a configured commodity query.",
          metadata: {
            providerType: context.providerType,
            externalId: article.externalId,
            commodityIds: article.commodityIds,
          },
          provenance: article.provenance,
        },
        context,
      ),
    );
  }
}

function assertCommodityObservation(value: unknown): CommodityObservation {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as CommodityObservation).price !== "number" ||
    typeof (value as CommodityObservation).commodityId !== "string" ||
    !(value as CommodityObservation).provenance
  ) {
    throw new Error(
      "Price provider returned an incompatible canonical record.",
    );
  }
  return value as CommodityObservation;
}

function assertMarketIntelligenceRecord(
  value: unknown,
): MarketIntelligenceRecord {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as MarketIntelligenceRecord).body !== "string" ||
    typeof (value as MarketIntelligenceRecord).effectiveAt !== "string" ||
    !(value as MarketIntelligenceRecord).provenance
  ) {
    throw new Error("FRED provider returned an incompatible canonical record.");
  }
  return value as MarketIntelligenceRecord;
}

function assertNewsItem(value: unknown): NewsItem {
  if (
    !value ||
    typeof value !== "object" ||
    typeof (value as NewsItem).headline !== "string" ||
    typeof (value as NewsItem).publishedAt !== "string" ||
    !(value as NewsItem).provenance
  ) {
    throw new Error(
      "GDELT provider returned an incompatible canonical record.",
    );
  }
  return value as NewsItem;
}

function parseFredBody(value: string): {
  readonly seriesId: string;
  readonly value: number;
  readonly unit: string;
  readonly realtimeStart: string;
  readonly realtimeEnd: string;
} {
  const parsed = JSON.parse(value) as Record<string, unknown>;
  if (
    typeof parsed.seriesId !== "string" ||
    typeof parsed.value !== "number" ||
    typeof parsed.unit !== "string" ||
    typeof parsed.realtimeStart !== "string" ||
    typeof parsed.realtimeEnd !== "string"
  ) {
    throw new Error("FRED canonical body is malformed.");
  }
  return {
    seriesId: parsed.seriesId,
    value: parsed.value,
    unit: parsed.unit,
    realtimeStart: parsed.realtimeStart,
    realtimeEnd: parsed.realtimeEnd,
  };
}
