import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const componentSource = readFileSync(
  fileURLToPath(
    new URL(
      "../apps/web/src/components/dora-command-centre.tsx",
      import.meta.url,
    ),
  ),
  "utf8",
);
const dataSource = readFileSync(
  fileURLToPath(
    new URL("../apps/web/src/lib/command-centre-data.ts", import.meta.url),
  ),
  "utf8",
);

describe("DORA executive command centre contract", () => {
  it.each([
    "What is happening?",
    "Why is it happening?",
    "What happens next?",
    "What needs attention?",
  ])("answers the executive question: %s", (question) => {
    expect(componentSource).toContain(question);
  });

  it.each([
    "BRENT",
    "WTI",
    "NG",
    "LNG-P",
    "XAU",
    "CU",
    "AL",
    "NI",
    "PALM",
    "NAPHTHA",
  ])("includes the selected commodity %s", (symbol) => {
    expect(dataSource).toContain(`symbol: \"${symbol}\"`);
  });

  it.each(["24h", "7d", "30d", "90d"])(
    "supports the %s forecast horizon",
    (horizon) => {
      expect(dataSource).toContain(`id: \"${horizon}\"`);
    },
  );

  it("models all ten requested market driver categories", () => {
    const categories = [
      "Geopolitical",
      "Supply",
      "Demand",
      "Inventory",
      "Manufacturing",
      "Macro",
      "FX",
      "Energy",
      "Weather",
      "Shipping",
    ];

    for (const category of categories) {
      expect(dataSource).toContain(`category: \"${category}\"`);
    }
  });

  it("routes analysis through evidence and reasoning", () => {
    expect(componentSource).toContain("reasoning={selectedAnalysis.reasoning}");
    expect(componentSource).toContain("evidence={selectedAnalysis.evidence}");
    expect(componentSource).toContain("openAnalysis(");
  });

  it("labels forecast ranges as uncertainty rather than precision", () => {
    expect(componentSource).toContain("normalized directional outlook");
    expect(componentSource).toContain(
      "The index communicates direction, not a precise target price.",
    );
  });
});
