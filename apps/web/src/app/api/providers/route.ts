import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { parseProviderDefinitions } from "@dora/connectors/provider-config";

export const dynamic = "force-dynamic";

export function GET() {
  try {
    const rootDirectory =
      process.env.DORA_ROOT ?? process.env.INIT_CWD ?? process.cwd();
    const configPath = resolve(
      rootDirectory,
      process.env.PROVIDER_CONFIG_PATH ?? "config/providers.json",
    );
    const definitions = parseProviderDefinitions(
      JSON.parse(readFileSync(configPath, "utf8")) as unknown,
    );

    return Response.json({
      providers: definitions.map((definition) => {
        const secretEnvironmentName =
          definition.type === "eia" || definition.type === "fred"
            ? definition.authentication.apiKeyEnv
            : undefined;
        const missingSecret = Boolean(
          definition.enabled &&
          secretEnvironmentName &&
          !process.env[secretEnvironmentName],
        );

        return {
          id: definition.id,
          type: definition.type,
          enabled: definition.enabled,
          refreshMinutes: definition.refreshMinutes,
          configurationStatus: !definition.enabled
            ? "disabled"
            : missingSecret
              ? "missing-secret"
              : "ready",
        };
      }),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Provider configuration is unavailable.",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
