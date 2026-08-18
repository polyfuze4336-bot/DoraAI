import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient, type ContainerClient } from "@azure/storage-blob";

import type {
  KnowledgeObjectInput,
  KnowledgeObjectStore,
  RawObjectInput,
  RawObjectResult,
  RawObjectStore,
} from "./contracts";

export class AzureBlobObjectStore
  implements RawObjectStore, KnowledgeObjectStore
{
  readonly #container: ContainerClient;

  constructor(
    accountUrl: string,
    containerName = "dora-data",
    credential = new DefaultAzureCredential(),
  ) {
    this.#container = new BlobServiceClient(
      accountUrl,
      credential,
    ).getContainerClient(containerName);
  }

  async put(input: RawObjectInput): Promise<RawObjectResult> {
    const path = ingestionObjectPath(
      input.layer ?? "raw",
      input.providerId,
      input.timestamp,
      input.runId,
    );
    const response = await this.#container
      .getBlockBlobClient(path)
      .uploadData(toBytes(input.data), {
        blobHTTPHeaders: { blobContentType: input.contentType },
        metadata: normalizeMetadata(input.metadata),
      });
    return { path, etag: response.etag, writtenAt: new Date().toISOString() };
  }

  async putDocument(input: KnowledgeObjectInput): Promise<RawObjectResult> {
    const path = `knowledge/${safeSegment(input.documentId)}/${safeFileName(input.fileName)}`;
    const response = await this.#container
      .getBlockBlobClient(path)
      .uploadData(input.data, {
        blobHTTPHeaders: { blobContentType: input.contentType },
        metadata: normalizeMetadata(input.metadata),
      });
    return { path, etag: response.etag, writtenAt: new Date().toISOString() };
  }
}

export class LocalFileObjectStore
  implements RawObjectStore, KnowledgeObjectStore
{
  constructor(private readonly rootDirectory: string) {}

  async put(input: RawObjectInput): Promise<RawObjectResult> {
    const path = rawObjectPath(input.providerId, input.timestamp, input.runId);
    await this.write(path, toBytes(input.data));
    return { path, writtenAt: new Date().toISOString() };
  }

  async putDocument(input: KnowledgeObjectInput): Promise<RawObjectResult> {
    const path = `knowledge/${safeSegment(input.documentId)}/${safeFileName(input.fileName)}`;
    await this.write(path, input.data);
    return { path, writtenAt: new Date().toISOString() };
  }

  private async write(relativePath: string, data: Uint8Array): Promise<void> {
    const fullPath = join(this.rootDirectory, ...relativePath.split("/"));
    await mkdir(dirname(fullPath), { recursive: true });
    const temporaryPath = `${fullPath}.${crypto.randomUUID()}.tmp`;
    await writeFile(temporaryPath, data);
    await rename(temporaryPath, fullPath);
  }
}

export function rawObjectPath(
  providerId: string,
  timestamp: string,
  runId: string,
): string {
  return ingestionObjectPath("raw", providerId, timestamp, runId);
}

export function ingestionObjectPath(
  layer: "raw" | "normalized" | "signals",
  providerId: string,
  timestamp: string,
  runId: string,
): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid raw object timestamp: ${timestamp}`);
  }
  return [
    layer,
    safeSegment(providerId),
    String(date.getUTCFullYear()),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
    String(date.getUTCHours()).padStart(2, "0"),
    `${safeSegment(runId)}.json`,
  ].join("/");
}

function toBytes(value: Uint8Array | string): Uint8Array {
  return typeof value === "string" ? new TextEncoder().encode(value) : value;
}

function normalizeMetadata(
  metadata: Readonly<Record<string, string>> | undefined,
): Record<string, string> | undefined {
  return metadata
    ? Object.fromEntries(
        Object.entries(metadata).map(([key, value]) => [
          key.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
          value,
        ]),
      )
    : undefined;
}

function safeSegment(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-");
}

function safeFileName(value: string): string {
  return safeSegment(value).slice(0, 180);
}
