import { readFileSync } from "node:fs";

import { hash, compare } from "bcryptjs";
import { describe, expect, it } from "vitest";

import { authorizeAdmin } from "../apps/web/src/lib/admin-authorization";
import { configuredAuthProvider } from "../apps/web/src/lib/auth/contracts";
import {
  createSessionToken,
  verifySessionToken,
} from "../apps/web/src/lib/auth/session";

const secret = "prototype-session-secret-with-more-than-32-characters";
const user = {
  id: "10000000-0000-4000-8000-000000000099",
  username: "admin@dora.local",
  displayName: "DORA Administrator",
  role: "admin",
};

describe("prototype authentication", () => {
  it("defaults to database auth and preserves the Entra switch", () => {
    expect(configuredAuthProvider({})).toBe("database");
    expect(configuredAuthProvider({ AUTH_PROVIDER: "database" })).toBe(
      "database",
    );
    expect(configuredAuthProvider({ AUTH_PROVIDER: "entra" })).toBe("entra");
  });

  it("accepts valid signed sessions and rejects tampered or expired sessions", async () => {
    const token = await createSessionToken(user, secret, 1_000_000);
    await expect(verifySessionToken(token, secret, 1_000_001)).resolves.toEqual(
      user,
    );
    await expect(
      verifySessionToken(`${token.slice(0, -1)}x`, secret, 1_000_001),
    ).resolves.toBeNull();
    await expect(
      verifySessionToken(token, secret, 1_000_000 + 8 * 60 * 60 * 1000 + 1),
    ).resolves.toBeNull();
  });

  it("authorizes database administrators from middleware-owned headers", () => {
    const previous = process.env.AUTH_PROVIDER;
    process.env.AUTH_PROVIDER = "database";
    try {
      expect(
        authorizeAdmin(
          new Headers({
            "x-dora-user-id": user.id,
            "x-dora-user-role": "admin",
          }),
        ),
      ).toMatchObject({ authorized: true, source: "database" });
      expect(
        authorizeAdmin(
          new Headers({
            "x-dora-user-id": user.id,
            "x-dora-user-role": "viewer",
          }),
        ).authorized,
      ).toBe(false);
    } finally {
      process.env.AUTH_PROVIDER = previous;
    }
  });

  it("uses bcrypt hashes and defines no plaintext password column", async () => {
    const password = "correct-horse-battery-staple";
    const passwordHash = await hash(password, 4);
    expect(passwordHash).not.toContain(password);
    await expect(compare(password, passwordHash)).resolves.toBe(true);

    const migration = readFileSync(
      new URL(
        "../infrastructure/database/migrations/011_prototype_users.sql",
        import.meta.url,
      ),
      "utf8",
    );
    expect(migration).toContain("password_hash text NOT NULL");
    expect(migration).not.toMatch(/\bpassword\s+text\b/i);
    expect(migration).toContain("last_login_at timestamptz");
  });
});
