import { createHash } from "node:crypto";

import type { KnowledgeChunk, KnowledgeDocumentMetadata } from "./types";

interface ChunkDocumentInput {
  readonly documentId: string;
  readonly text: string;
  readonly metadata: KnowledgeDocumentMetadata;
  readonly maxWords?: number;
  readonly overlapWords?: number;
}

export function chunkDocument({
  documentId,
  text,
  metadata,
  maxWords = 260,
  overlapWords = 35,
}: ChunkDocumentInput): readonly KnowledgeChunk[] {
  const sections = splitSections(text);
  const chunks: KnowledgeChunk[] = [];

  for (const section of sections) {
    const words = section.content.split(/\s+/).filter(Boolean);
    const step = Math.max(1, maxWords - overlapWords);
    for (let offset = 0; offset < words.length; offset += step) {
      const content = words
        .slice(offset, offset + maxWords)
        .join(" ")
        .trim();
      if (!content) continue;
      const chunkIndex = chunks.length;
      const contentHash = createHash("sha256").update(content).digest("hex");
      chunks.push({
        chunkId: `${documentId}-${String(chunkIndex).padStart(4, "0")}`,
        documentId,
        chunkIndex,
        heading: section.heading,
        content,
        tokenCount: estimateTokens(content),
        citationLabel: `${metadata.title}, ${metadata.author || "Unknown author"}, ${metadata.date || "undated"}, section ${chunkIndex + 1}`,
        contentHash,
        metadata,
      });
      if (offset + maxWords >= words.length) break;
    }
  }
  return chunks;
}

function splitSections(
  text: string,
): readonly { heading: string | null; content: string }[] {
  const blocks = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const sections: { heading: string | null; content: string }[] = [];
  let heading: string | null = null;
  let paragraphs: string[] = [];

  const flush = () => {
    if (paragraphs.length)
      sections.push({ heading, content: paragraphs.join("\n\n") });
    paragraphs = [];
  };

  for (const block of blocks) {
    if (isHeading(block)) {
      flush();
      heading = block.replace(/^#{1,6}\s*/, "").trim();
    } else {
      paragraphs.push(block);
    }
  }
  flush();
  return sections.length ? sections : [{ heading: null, content: text }];
}

function isHeading(block: string): boolean {
  return (
    /^#{1,6}\s+/.test(block) ||
    (block.length <= 90 &&
      !/[.!?]$/.test(block) &&
      block.split(/\s+/).length <= 12)
  );
}

function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
