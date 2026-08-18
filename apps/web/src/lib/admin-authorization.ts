export interface AdminIdentity {
  readonly authorized: boolean;
  readonly principalId?: string;
  readonly source: "database" | "entra" | "local-development" | "none";
}

export function authorizeAdmin(headers: Headers): AdminIdentity {
  const databaseUserId = headers.get("x-dora-user-id")?.trim();
  const databaseRole = headers.get("x-dora-user-role")?.trim().toLowerCase();
  if (
    process.env.AUTH_PROVIDER !== "entra" &&
    databaseUserId &&
    databaseRole === "admin"
  ) {
    return {
      authorized: true,
      principalId: databaseUserId,
      source: "database",
    };
  }
  const principalId =
    headers.get("x-ms-client-principal-id")?.trim() ??
    parseClientPrincipal(headers.get("x-ms-client-principal"));
  const allowed = new Set(
    (process.env.DORA_ADMIN_PRINCIPAL_IDS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
  const trustedHeaders =
    process.env.NODE_ENV === "development" ||
    process.env.DORA_TRUST_ENTRA_HEADERS === "true";
  if (principalId && trustedHeaders) {
    return {
      authorized: allowed.has(principalId.toLowerCase()),
      principalId,
      source: "entra",
    };
  }
  const localAllowed =
    process.env.NODE_ENV === "development" &&
    process.env.DORA_ALLOW_LOCAL_ADMIN !== "false";
  return {
    authorized: localAllowed,
    principalId: localAllowed ? "local-development-admin" : undefined,
    source: localAllowed ? "local-development" : "none",
  };
}

export function requireAdmin(headers: Headers): AdminIdentity {
  const identity = authorizeAdmin(headers);
  if (!identity.authorized) {
    throw new AdminAuthorizationError();
  }
  return identity;
}

export class AdminAuthorizationError extends Error {
  readonly status = 403;
  constructor() {
    super("Administrator authorization is required.");
    this.name = "AdminAuthorizationError";
  }
}

function parseClientPrincipal(value: string | null): string | undefined {
  if (!value) return undefined;
  try {
    const decoded = Buffer.from(value, "base64").toString("utf8");
    const principal = JSON.parse(decoded) as {
      userId?: string;
      userDetails?: string;
    };
    return principal.userId ?? principal.userDetails;
  } catch {
    return undefined;
  }
}
