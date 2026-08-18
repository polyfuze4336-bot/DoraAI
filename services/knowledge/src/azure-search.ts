import { DefaultAzureCredential, type TokenCredential } from "@azure/identity";

import type { KnowledgeIndex } from "./repository";
import type {
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeSearchRequest,
  KnowledgeSearchResult,
} from "./types";

interface AzureSearchConfig {
  readonly endpoint: string;
  readonly indexName?: string;
  readonly embeddingDimensions?: number;
}

interface SearchRow {
  readonly [key: string]: unknown;
  readonly "@search.score"?: number;
  readonly "@search.rerankerScore"?: number;
}

export class AzureAiSearchKnowledgeIndex implements KnowledgeIndex {
  readonly #endpoint: string;
  readonly #indexName: string;
  readonly #embeddingDimensions: number;

  constructor(
    config: AzureSearchConfig,
    private readonly credential: TokenCredential = new DefaultAzureCredential(),
  ) {
    this.#endpoint = config.endpoint.replace(/\/$/, "");
    this.#indexName = config.indexName ?? "dora-knowledge";
    this.#embeddingDimensions = config.embeddingDimensions ?? 1536;
  }

  async ensureIndex(): Promise<void> {
    await this.request(`/indexes/${this.#indexName}`, {
      method: "PUT",
      body: JSON.stringify(
        buildIndexDefinition(this.#indexName, this.#embeddingDimensions),
      ),
    });
  }

  async indexDocument(
    document: KnowledgeDocument,
    chunks: readonly KnowledgeChunk[],
  ): Promise<void> {
    const value = chunks.map((chunk) => ({
      "@search.action": "mergeOrUpload",
      id: chunk.chunkId,
      documentId: document.documentId,
      chunkIndex: chunk.chunkIndex,
      title: document.metadata.title,
      author: document.metadata.author,
      documentDate: document.metadata.date,
      businessUnit: document.metadata.businessUnit,
      commodity: document.metadata.commodity,
      region: document.metadata.region,
      documentType: document.metadata.documentType,
      sourceSystem: document.metadata.sourceSystem,
      externalSourceId: document.metadata.externalSourceId,
      externalSourceUri: document.metadata.externalSourceUri,
      sourceVersion: document.metadata.sourceVersion,
      version: document.metadata.version,
      classification: document.metadata.classification,
      status: document.metadata.status,
      authorityRank: document.metadata.authorityRank,
      heading: chunk.heading ?? "",
      content: chunk.content,
      citationLabel: chunk.citationLabel,
      contentVector: chunk.embedding,
    }));
    await this.request(`/indexes/${this.#indexName}/docs/index`, {
      method: "POST",
      body: JSON.stringify({ value }),
    });
  }

  async search(
    request: KnowledgeSearchRequest,
  ): Promise<readonly KnowledgeSearchResult[]> {
    const filters = [
      request.commodity
        ? `commodity eq '${escapeFilter(request.commodity)}'`
        : "",
      request.region ? `region eq '${escapeFilter(request.region)}'` : "",
      request.classification
        ? `classification eq '${escapeFilter(request.classification)}'`
        : "",
    ].filter(Boolean);
    const vectorQueries = request.queryVector?.length
      ? [
          {
            kind: "vector",
            vector: request.queryVector,
            fields: "contentVector",
            k: Math.max(request.top ?? 10, 20),
          },
        ]
      : undefined;
    const response = await this.request(
      `/indexes/${this.#indexName}/docs/search`,
      {
        method: "POST",
        body: JSON.stringify({
          search: request.query || "*",
          queryType: "semantic",
          semanticConfiguration: "dora-semantic",
          captions: "extractive",
          answers: "extractive|count-3",
          filter: filters.length ? filters.join(" and ") : undefined,
          top: Math.min((request.top ?? 10) * 5, 50),
          scoringProfile: "authorityFreshness",
          vectorQueries,
          select:
            "id,documentId,chunkIndex,title,author,documentDate,businessUnit,commodity,region,documentType,sourceSystem,externalSourceId,externalSourceUri,sourceVersion,version,classification,status,authorityRank,heading,content,citationLabel",
        }),
      },
    );
    const payload = (await response.json()) as { value?: SearchRow[] };
    return (payload.value ?? [])
      .map(mapSearchRow)
      .map(applyLifecycleRanking)
      .sort((left, right) => right.score - left.score)
      .slice(0, request.top ?? 10);
  }

  async listDocuments(): Promise<readonly KnowledgeDocument[]> {
    const results = await this.search({ query: "*", top: 100 });
    const documents = new Map<string, KnowledgeDocument>();
    for (const result of results)
      documents.set(result.document.documentId, result.document);
    return [...documents.values()];
  }

  private async request(path: string, init: RequestInit): Promise<Response> {
    const token = await this.credential.getToken(
      "https://search.azure.com/.default",
    );
    if (!token) throw new Error("Unable to acquire Azure AI Search token.");
    const response = await fetch(
      `${this.#endpoint}${path}?api-version=2025-09-01`,
      {
        ...init,
        headers: {
          authorization: `Bearer ${token.token}`,
          "content-type": "application/json",
          ...init.headers,
        },
      },
    );
    if (!response.ok) {
      throw new Error(
        `Azure AI Search request failed: HTTP ${response.status} ${await response.text()}`,
      );
    }
    return response;
  }
}

function buildIndexDefinition(name: string, dimensions: number) {
  const stringField = (
    fieldName: string,
    options: Record<string, unknown> = {},
  ) => ({
    name: fieldName,
    type: "Edm.String",
    ...options,
  });
  return {
    name,
    fields: [
      stringField("id", { key: true, filterable: true }),
      stringField("documentId", { filterable: true }),
      {
        name: "chunkIndex",
        type: "Edm.Int32",
        filterable: true,
        sortable: true,
      },
      stringField("title", {
        searchable: true,
        filterable: true,
        sortable: true,
      }),
      stringField("author", { searchable: true, filterable: true }),
      {
        name: "documentDate",
        type: "Edm.DateTimeOffset",
        filterable: true,
        sortable: true,
      },
      stringField("businessUnit", {
        searchable: true,
        filterable: true,
        facetable: true,
      }),
      stringField("commodity", {
        searchable: true,
        filterable: true,
        facetable: true,
      }),
      stringField("region", {
        searchable: true,
        filterable: true,
        facetable: true,
      }),
      stringField("documentType", { filterable: true, facetable: true }),
      stringField("sourceSystem", { filterable: true, facetable: true }),
      stringField("externalSourceId", { filterable: true }),
      stringField("externalSourceUri"),
      stringField("sourceVersion", { filterable: true }),
      stringField("version", { filterable: true }),
      stringField("classification", { filterable: true, facetable: true }),
      stringField("status", { filterable: true, facetable: true }),
      {
        name: "authorityRank",
        type: "Edm.Int32",
        filterable: true,
        sortable: true,
      },
      stringField("heading", { searchable: true }),
      stringField("content", { searchable: true }),
      stringField("citationLabel", { searchable: true }),
      {
        name: "contentVector",
        type: "Collection(Edm.Single)",
        searchable: true,
        vectorSearchDimensions: dimensions,
        vectorSearchProfileName: "dora-vector-profile",
      },
    ],
    vectorSearch: {
      algorithms: [
        {
          name: "dora-hnsw",
          kind: "hnsw",
          hnswParameters: { metric: "cosine" },
        },
      ],
      profiles: [{ name: "dora-vector-profile", algorithm: "dora-hnsw" }],
    },
    semantic: {
      configurations: [
        {
          name: "dora-semantic",
          prioritizedFields: {
            titleField: { fieldName: "title" },
            prioritizedContentFields: [{ fieldName: "content" }],
            prioritizedKeywordsFields: [
              { fieldName: "commodity" },
              { fieldName: "region" },
              { fieldName: "businessUnit" },
            ],
          },
        },
      ],
    },
    scoringProfiles: [
      {
        name: "authorityFreshness",
        functions: [
          {
            type: "magnitude",
            fieldName: "authorityRank",
            boost: 2,
            interpolation: "linear",
            magnitude: {
              boostingRangeStart: 0,
              boostingRangeEnd: 100,
              constantBoostBeyondRange: false,
            },
          },
          {
            type: "freshness",
            fieldName: "documentDate",
            boost: 1.5,
            interpolation: "logarithmic",
            freshness: { boostingDuration: "P730D" },
          },
        ],
        functionAggregation: "sum",
      },
    ],
  };
}

function mapSearchRow(row: SearchRow): KnowledgeSearchResult {
  const metadata = {
    title: String(row.title ?? "Untitled"),
    author: String(row.author ?? ""),
    date: String(row.documentDate ?? ""),
    businessUnit: String(row.businessUnit ?? ""),
    commodity: String(row.commodity ?? ""),
    region: String(row.region ?? ""),
    documentType: String(row.documentType ?? "unknown"),
    sourceSystem: String(
      row.sourceSystem ?? "upload",
    ) as KnowledgeDocument["metadata"]["sourceSystem"],
    externalSourceId: row.externalSourceId
      ? String(row.externalSourceId)
      : undefined,
    externalSourceUri: row.externalSourceUri
      ? String(row.externalSourceUri)
      : undefined,
    sourceVersion: row.sourceVersion ? String(row.sourceVersion) : undefined,
    version: String(row.version ?? "1"),
    classification: String(
      row.classification ?? "internal",
    ) as KnowledgeDocument["metadata"]["classification"],
    authorityRank: Number(row.authorityRank ?? 50),
    status: String(
      row.status ?? "current",
    ) as KnowledgeDocument["metadata"]["status"],
  };
  const document: KnowledgeDocument = {
    documentId: String(row.documentId),
    fileName: "",
    contentType: "",
    metadata,
    contentHash: "",
    objectPath: "",
    summary: "",
    createdAt: metadata.date,
    indexedAt: metadata.date,
  };
  const chunk: KnowledgeChunk = {
    chunkId: String(row.id),
    documentId: document.documentId,
    chunkIndex: Number(row.chunkIndex ?? 0),
    heading: row.heading ? String(row.heading) : null,
    content: String(row.content ?? ""),
    tokenCount: Math.ceil(String(row.content ?? "").length / 4),
    citationLabel: String(row.citationLabel ?? metadata.title),
    contentHash: "",
    metadata,
  };
  const keywordScore = Number(row["@search.score"] ?? 0);
  return {
    chunk,
    document,
    score: Number(row["@search.rerankerScore"] ?? keywordScore),
    keywordScore,
    vectorScore: null,
    authorityScore: metadata.authorityRank / 100,
    freshnessScore: 0,
    rerankerScore: row["@search.rerankerScore"],
  };
}

function escapeFilter(value: string): string {
  return value.replace(/'/g, "''");
}

function applyLifecycleRanking(
  result: KnowledgeSearchResult,
): KnowledgeSearchResult {
  const ageDays = Math.max(
    0,
    (Date.now() - Date.parse(result.document.metadata.date)) / 86_400_000,
  );
  const freshnessScore = Number.isFinite(ageDays)
    ? Math.exp(-ageDays / 730)
    : 0.25;
  const statusPenalty =
    result.document.metadata.status === "current"
      ? 1
      : result.document.metadata.status === "superseded"
        ? 0.35
        : 0.2;
  return {
    ...result,
    freshnessScore,
    score:
      (result.score + result.authorityScore * 0.25 + freshnessScore * 0.15) *
      statusPenalty,
  };
}
