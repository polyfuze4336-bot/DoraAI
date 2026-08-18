import { z } from "zod";

const booleanFromEnvironment = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.toLowerCase() === "true";
}, z.boolean());

const sharedConfigSchema = z.object({
  DORA_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  NEXT_PUBLIC_DORA_APP_NAME: z.string().trim().min(1).default("DORA"),
  NEXT_PUBLIC_DORA_DEMO_MODE: booleanFromEnvironment.default(true),
});

export type SharedConfig = z.infer<typeof sharedConfigSchema>;

export function loadSharedConfig(
  environment: Record<string, string | undefined> = process.env,
): SharedConfig {
  return sharedConfigSchema.parse(environment);
}
