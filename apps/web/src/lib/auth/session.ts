import type { AuthenticatedUser } from "./contracts";

export const sessionCookieName = "dora_session";
const sessionDurationSeconds = 8 * 60 * 60;

interface SessionPayload extends AuthenticatedUser {
  readonly expiresAt: number;
}

export async function createSessionToken(
  user: AuthenticatedUser,
  secret: string,
  now = Date.now(),
): Promise<string> {
  requireSecret(secret);
  const payload = encode(
    JSON.stringify({
      ...user,
      expiresAt: Math.floor(now / 1000) + sessionDurationSeconds,
    } satisfies SessionPayload),
  );
  return `${payload}.${await sign(payload, secret)}`;
}

export async function verifySessionToken(
  token: string | undefined,
  secret: string,
  now = Date.now(),
): Promise<AuthenticatedUser | null> {
  if (!token || secret.length < 32) return null;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;
  const key = await signingKey(secret);
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    decodeBytes(signature),
    new TextEncoder().encode(payload),
  );
  if (!valid) return null;
  try {
    const value = JSON.parse(decode(payload)) as SessionPayload;
    if (
      !value.id ||
      !value.username ||
      !value.displayName ||
      !value.role ||
      value.expiresAt <= Math.floor(now / 1000)
    ) {
      return null;
    }
    return {
      id: value.id,
      username: value.username,
      displayName: value.displayName,
      role: value.role,
    };
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: sessionDurationSeconds,
};

function requireSecret(secret: string): void {
  if (secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET must contain at least 32 characters.");
  }
}

async function sign(value: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign(
    "HMAC",
    await signingKey(secret),
    new TextEncoder().encode(value),
  );
  return encodeBytes(new Uint8Array(signature));
}

function signingKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function encode(value: string): string {
  return encodeBytes(new TextEncoder().encode(value));
}

function decode(value: string): string {
  return new TextDecoder().decode(decodeBytes(value));
}

function encodeBytes(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function decodeBytes(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}