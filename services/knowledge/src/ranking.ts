import type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
} from "./types";

export function rankLocalKnowledge(
  request: KnowledgeSearchRequest,
  chunks: readonly KnowledgeChunk[],
  documents: ReadonlyMap<string, KnowledgeDocument>,
): readonly KnowledgeSearchResult[] {
  const queryTerms = tokenize(request.query);
  const now = Date.now();

  return chunks
    .flatMap((chunk) => {
      const document = documents.get(chunk.documentId);
      if (!document || !matchesFilters(request, document)) return [];
      const keywordScore = lexicalScore(queryTerms, chunk);
      if (queryTerms.length && keywordScore === 0) return [];
      const vectorScore = cosineSimilarity(
        request.queryVector,
        chunk.embedding,
      );
      const authorityScore = document.metadata.authorityRank / 100;
      const ageDays = Math.max(
        0,
        (now - Date.parse(document.metadata.date)) / 86_400_000,
      );
      const freshnessScore = Number.isFinite(ageDays)
        ? Math.exp(-ageDays / 730)
        : 0.25;
      const statusPenalty =
        document.metadata.status === "current"
          ? 1
          : document.metadata.status === "superseded"
            ? 0.35
            : 0.2;
      const score =
        (keywordScore * 0.5 +
          (vectorScore ?? 0) * 0.25 +
          authorityScore * 0.15 +
          freshnessScore * 0.1) *
        statusPenalty;

      return [
        {
          chunk,
          document,
          score,
          keywordScore,
          vectorScore,
          authorityScore,
          freshnessScore,
        },
      ];
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, request.top ?? 10);
}

function matchesFilters(
  request: KnowledgeSearchRequest,
  document: KnowledgeDocument,
): boolean {
  if (request.commodity && document.metadata.commodity !== request.commodity)
    return false;
  if (request.region && document.metadata.region !== request.region)
    return false;
  if (
    request.classification &&
    document.metadata.classification !== request.classification
  )
    return false;
  return true;
}

function lexicalScore(
  queryTerms: readonly string[],
  chunk: KnowledgeChunk,
): number {
  if (!queryTerms.length) return 0.5;
  const terms = tokenize(`${chunk.heading ?? ""} ${chunk.content}`);
  const termSet = new Set(terms);
  return (
    queryTerms.filter((term) => termSet.has(term)).length / queryTerms.length
  );
}

function tokenize(value: string): readonly string[] {
  return value.toLowerCase().match(/[a-z0-9]{2,}/g) ?? [];
}

function cosineSimilarity(
  left: readonly number[] | undefined,
  right: readonly number[] | undefined,
): number | null {
  if (!left?.length || !right?.length || left.length !== right.length)
    return null;
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftNorm += leftValue ** 2;
    rightNorm += rightValue ** 2;
  }
  return leftNorm && rightNorm
    ? dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
    : null;
}
