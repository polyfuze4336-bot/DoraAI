import { describe, expect, it, vi } from "vitest";

import {
  DoraIntelligenceAgent,
  FoundryModelClient,
  InMemoryAiTelemetrySink,
  loadFoundryModelConfiguration,
  routeModelWorkload,
  type DoraAgentTools,
} from "@dora/agents";

describe("Microsoft Foundry model configuration", () => {
  it("routes economical, reasoning and embedding workloads independently", () => {
    expect(routeModelWorkload("classification")).toBe("fast");
    expect(routeModelWorkload("news-extraction")).toBe("fast");
    expect(routeModelWorkload("embedding")).toBe("embedding");
    expect(
      routeModelWorkload("agent-answer", "Compare conflicting supply signals."),
    ).toBe("reasoning");
    expect(
      routeModelWorkload("agent-answer", "List the latest source labels."),
    ).toBe("fast");
  });

  it("requires all deployment names and never supplies model-name defaults", () => {
    expect(loadFoundryModelConfiguration({})).toBeNull();
    expect(
      loadFoundryModelConfiguration({
        DORA_FOUNDRY_ENDPOINT: "https://dora.openai.azure.com",
        DORA_FAST_MODEL: "fast-deployment-from-config",
        DORA_REASONING_MODEL: "reasoning-deployment-from-config",
        DORA_EMBEDDING_MODEL: "embedding-deployment-from-config",
      }),
    ).toMatchObject({
      fastDeployment: "fast-deployment-from-config",
      reasoningDeployment: "reasoning-deployment-from-config",
      embeddingDeployment: "embedding-deployment-from-config",
    });
  });

  it("records deployment, model, latency, usage, purpose and success", async () => {
    const telemetry = new InMemoryAiTelemetrySink();
    const credential = {
      getToken: vi.fn().mockResolvedValue({
        token: "token",
        expiresOnTimestamp: Date.now() + 60_000,
      }),
    };
    const fetchImplementation = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        id: "request-42",
        model: "reported-model-version",
        choices: [{ message: { content: "summary" } }],
        usage: {
          prompt_tokens: 14,
          completion_tokens: 7,
          total_tokens: 21,
        },
      }),
    );
    const client = new FoundryModelClient(
      {
        endpoint: "https://dora.openai.azure.com",
        fastDeployment: "configured-fast",
        reasoningDeployment: "configured-reasoning",
        embeddingDeployment: "configured-embedding",
        apiVersion: "2024-10-21",
      },
      telemetry,
      credential,
      fetchImplementation,
    );

    await client.chat({
      tier: "fast",
      purpose: "summarisation",
      messages: [{ role: "user", content: "Summarise evidence." }],
    });

    expect(String(fetchImplementation.mock.calls[0]?.[0])).toContain(
      "/deployments/configured-fast/",
    );
    expect(telemetry.events[0]).toMatchObject({
      requestId: "request-42",
      deployment: "configured-fast",
      reportedModel: "reported-model-version",
      tokenUsage: { promptTokens: 14, completionTokens: 7, totalTokens: 21 },
      purpose: "summarisation",
      success: true,
    });
    expect(telemetry.events[0]?.latencyMs).toBeGreaterThanOrEqual(0);
  });
});

describe("DORA specialist intelligence agent", () => {
  it("retrieves every DORA evidence surface before answering", async () => {
    const tools = createTools();
    const agent = new DoraIntelligenceAgent(tools);

    const answer = await agent.answer({
      question: "Why is Brent forecast to increase?",
      commodityIds: ["BRENT"],
    });

    expect(tools.getObservedData).toHaveBeenCalledOnce();
    expect(tools.getForecasts).toHaveBeenCalledOnce();
    expect(tools.getRisks).toHaveBeenCalledOnce();
    expect(tools.getManufacturing).toHaveBeenCalledOnce();
    expect(tools.searchResearch).toHaveBeenCalledOnce();
    expect(tools.getCitations).toHaveBeenCalledOnce();
    expect(answer.sections.observedData[0]).toContain("[market-1]");
    expect(answer.sections.forecast[0]).toContain("30-day");
    expect(answer.citations[0]?.id).toBe("market-1");
    expect(answer.mode).toBe("deterministic");
  });

  it("uses the scenario tool for percentage sensitivity questions", async () => {
    const tools = createTools();
    const agent = new DoraIntelligenceAgent(tools);

    await agent.answer({
      question: "What would happen if oil rises another 10%?",
      commodityIds: ["BRENT"],
    });

    expect(tools.runScenario).toHaveBeenCalledWith(expect.anything(), 10);
  });
});

function createTools() {
  return {
    getObservedData: vi.fn().mockResolvedValue([
      {
        id: "observed-1",
        label: "Brent price",
        value: "84.16 USD/bbl",
        observedAt: "2026-08-17T12:00:00.000Z",
        citationId: "market-1",
        direction: "up",
      },
    ]),
    getForecasts: vi.fn().mockResolvedValue([
      {
        commodityId: "BRENT",
        horizonDays: 30,
        forecast: 87,
        lowerBound: 81,
        upperBound: 93,
        confidence: 0.72,
        model: "linear-regression-trend v1",
        generatedAt: "2026-08-17T12:00:00.000Z",
      },
    ]),
    getRisks: vi.fn().mockResolvedValue([]),
    getManufacturing: vi.fn().mockResolvedValue([]),
    searchResearch: vi.fn().mockResolvedValue([]),
    getCitations: vi.fn().mockResolvedValue([
      {
        id: "market-1",
        label: "DORA market snapshot",
        observedAt: "2026-08-17T12:00:00.000Z",
      },
    ]),
    runScenario: vi.fn().mockResolvedValue({
      name: "Oil +10%",
      assumptions: ["Oil rises 10%."],
      calculatedEffects: ["Price rises from 84.16 to 92.58."],
      limitations: ["Sensitivity only."],
    }),
  } satisfies DoraAgentTools;
}
