import type {
  ResearchEvidence,
  SupportingResearchRetriever,
} from "@dora/intelligence";

import { KnowledgeService } from "./service";

export class KnowledgeSupportingResearchRetriever implements SupportingResearchRetriever {
  constructor(private readonly knowledge: KnowledgeService) {}

  async retrieve(
    query: string,
    options: {
      readonly commodityIds: readonly string[];
      readonly asOf: string;
      readonly top: number;
    },
  ): Promise<readonly ResearchEvidence[]> {
    const commodity =
      options.commodityIds.length === 1 ? options.commodityIds[0] : undefined;
    const results = await this.knowledge.search({
      query,
      commodity,
      top: options.top,
    });
    const cutoff = Date.parse(options.asOf);
    return results
      .filter(
        (result) =>
          !Number.isFinite(cutoff) ||
          Date.parse(result.document.metadata.date) <= cutoff,
      )
      .map((result) => ({
        documentId: result.document.documentId,
        chunkId: result.chunk.chunkId,
        title: result.document.metadata.title,
        excerpt: result.chunk.content.slice(0, 500),
        citationLabel: result.chunk.citationLabel,
      }));
  }
}
