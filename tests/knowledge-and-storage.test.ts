import { strToU8, zipSync } from "fflate";
import { describe, expect, it } from "vitest";

import {
  chunkDocument,
  ExtractiveGroundedSummarizer,
  parseDocument,
  rankLocalKnowledge,
  type KnowledgeChunk,
  type KnowledgeDocument,
  type KnowledgeDocumentMetadata,
} from "@dora/knowledge";
import { rawObjectPath } from "@dora/storage";

const currentDate = new Date().toISOString();
const metadata: KnowledgeDocumentMetadata = {
  title: "Copper supply outlook",
  author: "DORA Research",
  date: currentDate,
  businessUnit: "Procurement",
  commodity: "Copper",
  region: "Global",
  documentType: "Research report",
  sourceSystem: "internal-research",
  version: "1.0",
  classification: "internal",
  authorityRank: 75,
  status: "current",
};

describe("storage paths", () => {
  it("partitions raw provider responses by UTC hour", () => {
    expect(
      rawObjectPath("world-bank", "2026-08-17T12:45:00.000Z", "run-1"),
    ).toBe("raw/world-bank/2026/08/17/12/run-1.json");
  });
});

describe("knowledge ingestion", () => {
  it("parses text and Open XML Word documents", async () => {
    const text = await parseDocument(
      "market.txt",
      "text/plain",
      new TextEncoder().encode(
        "Copper inventories declined while demand remained resilient.",
      ),
    );
    const docx = zipSync({
      "word/document.xml": strToU8(
        '<?xml version="1.0"?><w:document xmlns:w="urn:test"><w:body><w:p><w:r><w:t>Copper supply remains constrained across major producing regions.</w:t></w:r></w:p></w:body></w:document>',
      ),
    });
    const word = await parseDocument(
      "outlook.docx",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      docx,
    );

    expect(text.text).toContain("inventories declined");
    expect(word.text).toContain("supply remains constrained");
  });

  it("creates bounded, overlapping, citation-aware chunks", () => {
    const words = Array.from(
      { length: 550 },
      (_, index) => `term${index}`,
    ).join(" ");
    const chunks = chunkDocument({
      documentId: "document-1",
      text: `# Supply outlook\n\n${words}`,
      metadata,
      maxWords: 100,
      overlapWords: 20,
    });

    expect(chunks.length).toBeGreaterThan(5);
    expect(chunks[0]?.heading).toBe("Supply outlook");
    expect(chunks[0]?.content.split(" ").length).toBeLessThanOrEqual(100);
    expect(chunks[0]?.content.split(" ").slice(-20)).toEqual(
      chunks[1]?.content.split(" ").slice(0, 20),
    );
    expect(chunks[0]?.citationLabel).toContain(metadata.title);
  });
});

describe("knowledge retrieval", () => {
  it("does not let a superseded report outrank a current report", () => {
    const current = document("current", metadata);
    const superseded = document("old", {
      ...metadata,
      title: "Legacy copper outlook",
      authorityRank: 100,
      status: "superseded",
    });
    const chunks = [
      chunk(
        "current-chunk",
        current,
        "Copper supply disruption is increasing.",
      ),
      chunk("old-chunk", superseded, "Copper supply disruption is increasing."),
    ];
    const results = rankLocalKnowledge(
      { query: "copper supply disruption" },
      chunks,
      new Map([
        [current.documentId, current],
        [superseded.documentId, superseded],
      ]),
    );

    expect(results[0]?.document.documentId).toBe("current");
    expect(results[0]?.score).toBeGreaterThan(results[1]?.score ?? 0);
  });

  it("returns citations with every supported extractive answer", async () => {
    const current = document("current", metadata);
    const currentChunk = chunk(
      "current-chunk",
      current,
      "Copper inventories fell in the latest reporting period. Demand stayed resilient.",
    );
    const answer = await new ExtractiveGroundedSummarizer().summarize(
      "What changed in copper?",
      [
        {
          chunk: currentChunk,
          document: current,
          score: 1,
          keywordScore: 1,
          vectorScore: null,
          authorityScore: 0.75,
          freshnessScore: 1,
        },
      ],
    );

    expect(answer.answer).toContain("[1]");
    expect(answer.citations).toHaveLength(1);
    expect(answer.citations[0]?.documentId).toBe("current");
  });
});

function document(
  documentId: string,
  documentMetadata: KnowledgeDocumentMetadata,
): KnowledgeDocument {
  return {
    documentId,
    fileName: `${documentId}.txt`,
    contentType: "text/plain",
    metadata: documentMetadata,
    contentHash: documentId,
    objectPath: `knowledge/${documentId}.txt`,
    summary: "Summary",
    createdAt: currentDate,
    indexedAt: currentDate,
  };
}

function chunk(
  chunkId: string,
  sourceDocument: KnowledgeDocument,
  content: string,
): KnowledgeChunk {
  return {
    chunkId,
    documentId: sourceDocument.documentId,
    chunkIndex: 0,
    heading: "Supply",
    content,
    tokenCount: 10,
    citationLabel: `${sourceDocument.metadata.title}, section 1`,
    contentHash: chunkId,
    metadata: sourceDocument.metadata,
  };
}
