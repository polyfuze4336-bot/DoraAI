import type { FoundryModelConfiguration } from "./contracts";

export function loadFoundryModelConfiguration(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): FoundryModelConfiguration | null {
  const endpoint = value(environment.DORA_FOUNDRY_ENDPOINT);
  const fastDeployment = value(environment.DORA_FAST_MODEL);
  const reasoningDeployment = value(environment.DORA_REASONING_MODEL);
  const embeddingDeployment = value(environment.DORA_EMBEDDING_MODEL);
  if (
    !endpoint ||
    !fastDeployment ||
    !reasoningDeployment ||
    !embeddingDeployment
  ) {
    return null;
  }
  const url = new URL(endpoint);
  if (url.protocol !== "https:") {
    throw new Error("DORA_FOUNDRY_ENDPOINT must use HTTPS.");
  }
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    fastDeployment,
    reasoningDeployment,
    embeddingDeployment,
    apiVersion: value(environment.DORA_FOUNDRY_API_VERSION) ?? "2024-10-21",
  };
}

function value(input: string | undefined): string | undefined {
  return input?.trim() || undefined;
}
