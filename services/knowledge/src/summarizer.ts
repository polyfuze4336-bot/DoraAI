import type {
  GroundedAnswer,
  KnowledgeCitation,
  KnowledgeDocument,
  KnowledgeSearchResult,
} from "./types";

export interface GroundedSummarizer {
  summarize(
    question: string,
    results: readonly KnowledgeSearchResult[],
  ): Promise<GroundedAnswer>;
}

export class ExtractiveGroundedSummarizer implements GroundedSummarizer {
  async summarize(
    question: string,
    results: readonly KnowledgeSearchResult[],
  ): Promise<GroundedAnswer> {
    if (!results.length) {
      return {
        answer: "No indexed evidence supports an answer to this question.",
        citations: [],
        relatedReports: [],
        mode: "extractive",
        limitations: ["No matching knowledge chunks were retrieved."],
      };
    }
    const selected = results.slice(0, 4);
    const citations = selected.map(toCitation);
    const statements = selected.map(
      (result, index) =>
        `${firstSentences(result.chunk.content, 2)} [${index + 1}]`,
    );
    return {
      answer: `For “${question}”: ${statements.join(" ")}`,
      citations,
      relatedReports: uniqueDocuments(results).slice(0, 5),
      mode: "extractive",
      limitations: [
        "This local fallback is extractive, not generative.",
        "Enable the approved Azure OpenAI summarizer for synthesized narrative answers.",
      ],
    };
  }
}

export class AzureOpenAiGroundedSummarizer implements GroundedSummarizer {
  constructor(
    private readonly endpoint: string,
    private readonly deployment: string,
    private readonly getAccessToken: () => Promise<string>,
    private readonly apiVersion = "2024-10-21",
  ) {}

  async summarize(
    question: string,
    results: readonly KnowledgeSearchResult[],
  ): Promise<GroundedAnswer> {
    if (!results.length) {
      return new ExtractiveGroundedSummarizer().summarize(question, results);
    }
    const evidence = results.slice(0, 8).map((result, index) => ({
      citationId: String(index + 1),
      title: result.document.metadata.title,
      date: result.document.metadata.date,
      content: result.chunk.content,
    }));
    const response = await fetch(
      `${this.endpoint.replace(/\/$/, "")}/openai/deployments/${encodeURIComponent(this.deployment)}/chat/completions?api-version=${this.apiVersion}`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${await this.getAccessToken()}`,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          temperature: 0.1,
          max_tokens: 800,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "Answer only from the supplied evidence. Return JSON with answer and citationIds. Every factual claim must cite one or more numeric citation IDs. If evidence is insufficient, say so.",
            },
            {
              role: "user",
              content: JSON.stringify({ question, evidence }),
            },
          ],
        }),
      },
    );
    if (!response.ok) {
      throw new Error(
        `Azure OpenAI summarization failed: HTTP ${response.status}`,
      );
    }
    const payload = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const parsed = JSON.parse(
      payload.choices?.[0]?.message?.content ?? "{}",
    ) as {
      answer?: string;
      citationIds?: string[];
    };
    const selectedIds = new Set(parsed.citationIds ?? []);
    const citations = results
      .slice(0, 8)
      .map(toCitation)
      .filter((_, index) => selectedIds.has(String(index + 1)));
    if (!parsed.answer || !citations.length) {
      throw new Error(
        "Azure OpenAI returned an answer without valid citations.",
      );
    }
    return {
      answer: parsed.answer,
      citations,
      relatedReports: uniqueDocuments(results).slice(0, 5),
      mode: "azure-openai",
      limitations: [],
    };
  }
}

function toCitation(
  result: KnowledgeSearchResult,
  index = 0,
): KnowledgeCitation {
  return {
    citationId: String(index + 1),
    documentId: result.document.documentId,
    chunkId: result.chunk.chunkId,
    title: result.document.metadata.title,
    author: result.document.metadata.author,
    date: result.document.metadata.date,
    sourceSystem: result.document.metadata.sourceSystem,
    citationLabel: result.chunk.citationLabel,
    excerpt: result.chunk.content.slice(0, 320),
  };
}

function uniqueDocuments(
  results: readonly KnowledgeSearchResult[],
): KnowledgeDocument[] {
  return [
    ...new Map(
      results.map((result) => [result.document.documentId, result.document]),
    ).values(),
  ];
}

function firstSentences(value: string, count: number): string {
  const sentences = [
    ...new Intl.Segmenter("en", { granularity: "sentence" }).segment(value),
  ]
    .slice(0, count)
    .map(({ segment }) => segment.trim())
    .filter(Boolean);
  return sentences.join(" ") || value.slice(0, 360);
}
