import { resolve } from "node:path";

import { DefaultAzureCredential } from "@azure/identity";
import { AzureBlobObjectStore, LocalFileObjectStore } from "@dora/storage";

import { AzureAiSearchKnowledgeIndex } from "./azure-search";
import { LocalKnowledgeIndex, type KnowledgeIndex } from "./repository";
import { KnowledgeService } from "./service";
import {
  AzureOpenAiGroundedSummarizer,
  ExtractiveGroundedSummarizer,
  type GroundedSummarizer,
} from "./summarizer";

let servicePromise: Promise<KnowledgeService> | undefined;

export function getKnowledgeService(): Promise<KnowledgeService> {
  servicePromise ??= createKnowledgeService();
  return servicePromise;
}

async function createKnowledgeService(): Promise<KnowledgeService> {
  const root = process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
  const dataRoot = resolve(root, process.env.DORA_DATA_PATH ?? ".dora-data");
  const credential = new DefaultAzureCredential();
  const blobEndpoint = process.env.AZURE_STORAGE_BLOB_ENDPOINT;
  const objectStore = blobEndpoint
    ? new AzureBlobObjectStore(
        blobEndpoint,
        process.env.AZURE_STORAGE_CONTAINER ?? "dora-data",
        credential,
      )
    : new LocalFileObjectStore(dataRoot);
  const index: KnowledgeIndex = process.env.AZURE_SEARCH_ENDPOINT
    ? new AzureAiSearchKnowledgeIndex(
        {
          endpoint: process.env.AZURE_SEARCH_ENDPOINT,
          indexName: process.env.AZURE_SEARCH_INDEX ?? "dora-knowledge",
          embeddingDimensions: Number(
            process.env.AZURE_SEARCH_EMBEDDING_DIMENSIONS ?? 1536,
          ),
        },
        credential,
      )
    : new LocalKnowledgeIndex(resolve(dataRoot, "knowledge-index.json"));
  const summarizer = createSummarizer(credential);
  const service = new KnowledgeService(objectStore, index, summarizer);
  await service.initialize();
  return service;
}

function createSummarizer(
  credential: DefaultAzureCredential,
): GroundedSummarizer {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT;
  if (!endpoint || !deployment) return new ExtractiveGroundedSummarizer();
  return new AzureOpenAiGroundedSummarizer(endpoint, deployment, async () => {
    const token = await credential.getToken(
      "https://cognitiveservices.azure.com/.default",
    );
    if (!token) throw new Error("Unable to acquire Azure OpenAI token.");
    return token.token;
  });
}
