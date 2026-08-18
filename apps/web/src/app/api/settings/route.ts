import {
  AdminAuthorizationError,
  authorizeAdmin,
  requireAdmin,
} from "@/lib/admin-authorization";
import { loadAdminSettings, saveAdminSettings } from "@/lib/admin-settings";
import {
  correlationIdFromHeaders,
  logStructured,
} from "@dora/observability";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const identity = authorizeAdmin(request.headers);
  if (!identity.authorized) {
    return Response.json(
      { error: "Administrator authorization is required." },
      { status: 403 },
    );
  }
  return Response.json({
    settings: await loadAdminSettings(),
    authorization: {
      authorized: true,
      source: identity.source,
      principalId: identity.principalId,
    },
    security: {
      secretValuesReturned: false,
      credentialConfiguration: "Key Vault secret names only",
    },
  });
}

export async function PUT(request: Request) {
  try {
    const identity = requireAdmin(request.headers);
    const settings = await saveAdminSettings(await request.json());
    logStructured({
      event: "admin.configuration.updated",
      correlationId: correlationIdFromHeaders(request.headers),
      timestamp: new Date().toISOString(),
      success: true,
      attributes: {
        principalId: identity.principalId,
        changedSections:
          "commodities,regions,providers,schedules,reports,alerts,models,forecasts,risks",
      },
    });
    return Response.json({
      settings,
      updatedBy: identity.principalId,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    if (error instanceof AdminAuthorizationError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Settings update failed.",
      },
      { status: 400 },
    );
  }
}
