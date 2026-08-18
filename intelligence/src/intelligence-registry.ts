import type { IntelligenceDomain } from "@dora/shared";

import type { IntelligenceService } from "./intelligence-service";
import {
  CommodityPriceIntelligenceService,
  EmergingRiskIntelligenceService,
  ManufacturingStatusIntelligenceService,
  MarketIntelligenceService,
  NewsUpdatesIntelligenceService,
} from "./services";

export class IntelligenceServiceRegistry {
  readonly #services = new Map<IntelligenceDomain, IntelligenceService>();

  register(service: IntelligenceService): void {
    if (this.#services.has(service.domain)) {
      throw new Error(
        `Intelligence service already registered: ${service.domain}`,
      );
    }

    this.#services.set(service.domain, service);
  }

  get(domain: IntelligenceDomain): IntelligenceService {
    const service = this.#services.get(domain);

    if (!service) {
      throw new Error(`Intelligence service not registered: ${domain}`);
    }

    return service;
  }

  list(): readonly IntelligenceService[] {
    return [...this.#services.values()];
  }
}

export function createDefaultIntelligenceRegistry(): IntelligenceServiceRegistry {
  const registry = new IntelligenceServiceRegistry();

  registry.register(new CommodityPriceIntelligenceService());
  registry.register(new NewsUpdatesIntelligenceService());
  registry.register(new EmergingRiskIntelligenceService());
  registry.register(new MarketIntelligenceService());
  registry.register(new ManufacturingStatusIntelligenceService());

  return registry;
}
