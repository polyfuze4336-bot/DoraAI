import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const designSystemRoot = new URL(
  "../apps/web/src/components/design-system/",
  import.meta.url,
);

const requiredComponents = {
  DoraCard: "dora-card.tsx",
  InsightCard: "intelligence-cards.tsx",
  SignalCard: "intelligence-cards.tsx",
  RiskBadge: "indicators.tsx",
  ConfidenceIndicator: "indicators.tsx",
  TrendIndicator: "indicators.tsx",
  PriceTicker: "price-ticker.tsx",
  SourceBadge: "indicators.tsx",
  FreshnessIndicator: "indicators.tsx",
  ForecastCard: "intelligence-cards.tsx",
  ExecutiveBriefCard: "executive-brief-card.tsx",
  EvidenceDrawer: "evidence-drawer.tsx",
  ScenarioCard: "intelligence-cards.tsx",
  MarketPulse: "intelligence-cards.tsx",
  AgentActivity: "intelligence-cards.tsx",
  NotificationPanel: "notification-panel.tsx",
} as const;

function readDesignSystemFile(fileName: string): string {
  return readFileSync(
    fileURLToPath(new URL(fileName, designSystemRoot)),
    "utf8",
  );
}

describe("DORA design-system contract", () => {
  it("exports every required premium component", () => {
    const barrel = readDesignSystemFile("index.ts");

    for (const [componentName, fileName] of Object.entries(
      requiredComponents,
    )) {
      const source = readDesignSystemFile(fileName);
      expect(source).toMatch(
        new RegExp(`export (?:function|class) ${componentName}\\b`),
      );
      expect(barrel).toContain(`./${fileName.replace(/\.tsx$/, "")}`);
    }
  });

  it.each(["ready", "loading", "empty", "error"] as const)(
    "implements the shared %s state",
    (state) => {
      const source = readDesignSystemFile("foundation.tsx");
      expect(source).toContain(`state === \"${state}\"`);
    },
  );

  it("routes card state through the shared StateBoundary", () => {
    const source = readDesignSystemFile("dora-card.tsx");

    expect(source).toContain("<StateBoundary");
    expect(source).toContain("state={state}");
  });
});
