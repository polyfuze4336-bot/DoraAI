import { createHash } from "node:crypto";

import type { DataProvenance } from "@dora/shared";

interface ProvenanceInput {
  readonly providerId: string;
  readonly sourceId: string;
  readonly sourceUrl: string;
  readonly sourceTimestamp: string;
  readonly fetchedAt: string;
  readonly ingestedAt: string;
  readonly correlationId: string;
  readonly license: string;
  readonly termsUrl: string;
  readonly rawValue?: unknown;
}

export function createProvenance(input: ProvenanceInput): DataProvenance {
  return {
    providerId: input.providerId,
    sourceId: input.sourceId,
    sourceUrl: input.sourceUrl,
    sourceTimestamp: input.sourceTimestamp,
    fetchedAt: input.fetchedAt,
    ingestedAt: input.ingestedAt,
    correlationId: input.correlationId,
    license: input.license,
    termsUrl: input.termsUrl,
    rawChecksum:
      input.rawValue === undefined
        ? undefined
        : checksumRawValue(input.rawValue),
  };
}

export function checksumRawValue(value: unknown): string {
  const serialized =
    typeof value === "string"
      ? value
      : JSON.stringify(value, jsonStableReplacer);
  return createHash("sha256").update(serialized).digest("hex");
}

function jsonStableReplacer(_key: string, value: unknown): unknown {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  }

  return value;
}
