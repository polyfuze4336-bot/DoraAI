import { ProviderRegistry } from "./provider-registry";
import type { ProviderDefinition } from "./provider-config";
import { EiaCommodityPriceProvider } from "./providers/eia-commodity-price-provider";
import { FredMarketIntelligenceProvider } from "./providers/fred-market-intelligence-provider";
import { GdeltNewsProvider } from "./providers/gdelt-news-provider";
import { WorldBankPinkSheetProvider } from "./providers/world-bank-pink-sheet-provider";

interface ConfiguredRegistryOptions {
  readonly environment?: Record<string, string | undefined>;
  readonly fetchImplementation?: typeof fetch;
}

export function createConfiguredProviderRegistry(
  definitions: readonly ProviderDefinition[],
  options: ConfiguredRegistryOptions = {},
): ProviderRegistry {
  const registry = new ProviderRegistry();
  const environment = options.environment ?? process.env;
  const fetchImplementation = options.fetchImplementation ?? fetch;

  for (const definition of definitions) {
    if (!definition.enabled) {
      continue;
    }

    switch (definition.type) {
      case "eia": {
        const provider = new EiaCommodityPriceProvider(
          {
            id: definition.id,
            apiKey: requireSecret(
              definition.authentication.apiKeyEnv,
              environment,
              definition.id,
            ),
            baseUrl: definition.baseUrl,
            runtime: definition.runtime,
            series: definition.series,
            observationsPerSeries: definition.observationsPerSeries,
          },
          fetchImplementation,
        );
        registry.register(provider, definition);
        break;
      }
      case "fred": {
        const provider = new FredMarketIntelligenceProvider(
          {
            ...definition,
            apiKey: requireSecret(
              definition.authentication.apiKeyEnv,
              environment,
              definition.id,
            ),
          },
          fetchImplementation,
        );
        registry.register(provider, definition);
        break;
      }
      case "world-bank-pink-sheet": {
        registry.register(
          new WorldBankPinkSheetProvider(definition, fetchImplementation),
          definition,
        );
        break;
      }
      case "gdelt": {
        registry.register(
          new GdeltNewsProvider(definition, fetchImplementation),
          definition,
        );
        break;
      }
    }
  }

  return registry;
}

function requireSecret(
  environmentName: string,
  environment: Record<string, string | undefined>,
  providerId: string,
): string {
  const value = environment[environmentName]?.trim();
  if (!value) {
    throw new Error(
      `${environmentName} is required for enabled provider '${providerId}'.`,
    );
  }
  return value;
}
