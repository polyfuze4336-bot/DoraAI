import type { DoraSignal } from "@dora/shared";

import type {
  NormalizedProviderType,
  SignalNormalizationContext,
  SignalNormalizer,
} from "./contracts";
import {
  EiaSignalNormalizer,
  FredSignalNormalizer,
  GdeltSignalNormalizer,
  WorldBankSignalNormalizer,
} from "./normalizers";

export class SignalNormalizationRegistry {
  readonly #normalizers = new Map<NormalizedProviderType, SignalNormalizer>();

  register(normalizer: SignalNormalizer): void {
    if (this.#normalizers.has(normalizer.providerType)) {
      throw new Error(
        `Signal normalizer already registered: ${normalizer.providerType}`,
      );
    }
    this.#normalizers.set(normalizer.providerType, normalizer);
  }

  normalize(
    providerType: string,
    items: readonly unknown[],
    context: Omit<SignalNormalizationContext, "providerType">,
  ): readonly DoraSignal[] {
    if (!isNormalizedProviderType(providerType)) {
      throw new Error(
        `No canonical signal normalizer for provider: ${providerType}`,
      );
    }
    const normalizer = this.#normalizers.get(providerType);
    if (!normalizer) {
      throw new Error(`Signal normalizer not registered: ${providerType}`);
    }
    return normalizer.normalize(items, { ...context, providerType });
  }

  list(): readonly SignalNormalizer[] {
    return [...this.#normalizers.values()];
  }
}

export function createDefaultSignalNormalizationRegistry(): SignalNormalizationRegistry {
  const registry = new SignalNormalizationRegistry();
  registry.register(new EiaSignalNormalizer());
  registry.register(new FredSignalNormalizer());
  registry.register(new WorldBankSignalNormalizer());
  registry.register(new GdeltSignalNormalizer());
  return registry;
}

function isNormalizedProviderType(
  value: string,
): value is NormalizedProviderType {
  return ["eia", "fred", "world-bank-pink-sheet", "gdelt"].includes(value);
}
