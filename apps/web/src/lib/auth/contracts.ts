export type AuthProviderName = "database" | "entra";

export interface AuthenticatedUser {
  readonly id: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: string;
}

export interface AuthenticationProvider {
  authenticate(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser | null>;
}

export function configuredAuthProvider(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): AuthProviderName {
  return environment.AUTH_PROVIDER?.trim().toLowerCase() === "entra"
    ? "entra"
    : "database";
}