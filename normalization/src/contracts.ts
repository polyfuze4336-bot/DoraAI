import type { DoraSignal } from "@dora/shared";

export const normalizedProviderTypes = [
  "eia",
  "fred",
  "world-bank-pink-sheet",
  "gdelt",
] as const;

export type NormalizedProviderType = (typeof normalizedProviderTypes)[number];

export interface SignalNormalizationContext {
  readonly providerType: NormalizedProviderType;
  readonly providerId: string;
  readonly refreshMinutes: number;
  readonly normalizedAt: string;
  readonly rawBatchPath?: string;
}

export interface SignalNormalizer {
  readonly providerType: NormalizedProviderType;
  normalize(
    items: readonly unknown[],
    context: SignalNormalizationContext,
  ): readonly DoraSignal[];
}
