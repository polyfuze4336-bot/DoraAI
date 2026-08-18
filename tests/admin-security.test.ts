import { describe, expect, it } from "vitest";

import {
  AdminAuthorizationError,
  authorizeAdmin,
  requireAdmin,
} from "../apps/web/src/lib/admin-authorization";
import { adminSettingsSchema } from "../apps/web/src/lib/admin-settings";

const validSettings = {
  commodities: [{ id: "brent", name: "Brent", enabled: true }],
  regions: ["Global"],
  providers: {
    eia: {
      enabled: true,
      refreshMinutes: 60,
      keyVaultSecretName: "dora-eia-api-key",
    },
  },
  refreshSchedules: { news: 30 },
  weeklyReportSchedule: {
    day: "Monday",
    localTime: "08:00",
    timezone: "Asia/Kuala_Lumpur",
  },
  reportRecipients: ["authorized@example.test"],
  alertThresholds: {
    priceMovementPercent: 5,
    forecastDirectionChange: true,
    riskScore: 0.55,
    anomalyZScore: 2,
    manufacturingUtilizationDropPercent: 10,
    confidenceDropPercent: 15,
  },
  aiModels: {
    fastDeployment: "fast-alias",
    reasoningDeployment: "reasoning-alias",
    embeddingDeployment: "embedding-alias",
  },
  forecastHorizons: [1, 7, 30, 90],
  riskThresholds: { medium: 0.18, high: 0.35, critical: 0.55 },
};

describe("admin authorization", () => {
  it("authorizes only configured Entra principals", () => {
    const previous = process.env.DORA_ADMIN_PRINCIPAL_IDS;
    const previousTrust = process.env.DORA_TRUST_ENTRA_HEADERS;
    process.env.DORA_ADMIN_PRINCIPAL_IDS = "admin-object-id";
    process.env.DORA_TRUST_ENTRA_HEADERS = "true";
    try {
      expect(
        authorizeAdmin(
          new Headers({ "x-ms-client-principal-id": "admin-object-id" }),
        ),
      ).toMatchObject({ authorized: true, source: "entra" });
      expect(() =>
        requireAdmin(
          new Headers({ "x-ms-client-principal-id": "other-object-id" }),
        ),
      ).toThrow(AdminAuthorizationError);
    } finally {
      process.env.DORA_ADMIN_PRINCIPAL_IDS = previous;
      process.env.DORA_TRUST_ENTRA_HEADERS = previousTrust;
    }
  });
});

describe("admin settings security", () => {
  it("accepts Key Vault secret names but exposes no credential value field", () => {
    const parsed = adminSettingsSchema.parse(validSettings);
    expect(parsed.providers.eia?.keyVaultSecretName).toBe("dora-eia-api-key");
    expect(JSON.stringify(parsed)).not.toContain("secretValue");
    expect(JSON.stringify(parsed)).not.toContain("credentialValue");
  });

  it("rejects values that cannot be Key Vault secret names", () => {
    expect(() =>
      adminSettingsSchema.parse({
        ...validSettings,
        providers: {
          eia: {
            enabled: true,
            refreshMinutes: 60,
            keyVaultSecretName: "https://vault/secrets/value",
          },
        },
      }),
    ).toThrow();
  });
});
