import { z } from "zod";

const retryPolicySchema = z.object({
  maxAttempts: z.number().int().min(1).max(6).default(3),
  baseDelayMs: z.number().int().min(10).default(500),
  maxDelayMs: z.number().int().min(100).default(8_000),
});

const rateLimitPolicySchema = z.object({
  requests: z.number().int().min(1).default(1),
  perMilliseconds: z.number().int().min(100).default(1_000),
});

export const providerRuntimePolicySchema = z
  .object({
    timeoutMs: z.number().int().min(500).default(10_000),
    retry: retryPolicySchema.default({
      maxAttempts: 3,
      baseDelayMs: 500,
      maxDelayMs: 8_000,
    }),
    rateLimit: rateLimitPolicySchema.default({
      requests: 1,
      perMilliseconds: 1_000,
    }),
  })
  .default({
    timeoutMs: 10_000,
    retry: { maxAttempts: 3, baseDelayMs: 500, maxDelayMs: 8_000 },
    rateLimit: { requests: 1, perMilliseconds: 1_000 },
  });

const commonProviderSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean().default(false),
  refreshMinutes: z.number().int().min(5),
  runtime: providerRuntimePolicySchema,
});

const commodityDefinitionSchema = z.object({
  commodityId: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  currency: z.string().length(3),
  unit: z.string().min(1),
  geography: z.string().min(1).optional(),
});

const apiKeyAuthenticationSchema = z.object({
  type: z.literal("apiKey"),
  apiKeyEnv: z.string().min(1),
});

export const eiaProviderDefinitionSchema = commonProviderSchema.extend({
  type: z.literal("eia"),
  baseUrl: z.url().default("https://api.eia.gov"),
  authentication: apiKeyAuthenticationSchema,
  series: z.record(z.string(), commodityDefinitionSchema),
  observationsPerSeries: z.number().int().min(1).max(5_000).default(120),
});

const fredSeriesDefinitionSchema = z.object({
  title: z.string().min(1),
  unit: z.string().min(1),
  commodityIds: z.array(z.string().min(1)).default([]),
});

export const fredProviderDefinitionSchema = commonProviderSchema.extend({
  type: z.literal("fred"),
  baseUrl: z.url().default("https://api.stlouisfed.org"),
  authentication: apiKeyAuthenticationSchema,
  series: z.record(z.string(), fredSeriesDefinitionSchema),
  observationsPerSeries: z.number().int().min(1).max(10_000).default(240),
});

export const worldBankProviderDefinitionSchema = commonProviderSchema.extend({
  type: z.literal("world-bank-pink-sheet"),
  downloadUrl: z.url(),
  sheetName: z.string().default("Monthly Prices"),
  maxMonths: z.number().int().min(1).max(800).default(240),
  columns: z.record(z.string(), commodityDefinitionSchema),
});

const gdeltQueryDefinitionSchema = z.object({
  query: z.string().min(2),
  commodityIds: z.array(z.string().min(1)).default([]),
});

export const gdeltProviderDefinitionSchema = commonProviderSchema.extend({
  type: z.literal("gdelt"),
  baseUrl: z.url().default("https://api.gdeltproject.org"),
  timespan: z.string().regex(/^\d+(min|h|hours|d|days|w|weeks|m|months)$/),
  maxRecords: z.number().int().min(1).max(250).default(50),
  queries: z.record(z.string(), gdeltQueryDefinitionSchema),
});

export const providerDefinitionSchema = z.discriminatedUnion("type", [
  eiaProviderDefinitionSchema,
  fredProviderDefinitionSchema,
  worldBankProviderDefinitionSchema,
  gdeltProviderDefinitionSchema,
]);

export const providerDefinitionsSchema = z.array(providerDefinitionSchema);

export type EiaProviderDefinition = z.infer<typeof eiaProviderDefinitionSchema>;
export type FredProviderDefinition = z.infer<
  typeof fredProviderDefinitionSchema
>;
export type WorldBankProviderDefinition = z.infer<
  typeof worldBankProviderDefinitionSchema
>;
export type GdeltProviderDefinition = z.infer<
  typeof gdeltProviderDefinitionSchema
>;
export type ProviderDefinition = z.infer<typeof providerDefinitionSchema>;

export function parseProviderDefinitions(
  input: unknown,
): readonly ProviderDefinition[] {
  return providerDefinitionsSchema.parse(input);
}
