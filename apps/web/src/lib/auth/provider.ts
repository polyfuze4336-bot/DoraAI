import "server-only";

import { configuredAuthProvider, type AuthenticationProvider } from "./contracts";
import { DatabaseAuthenticationProvider } from "./database-provider";

export function authenticationProvider(): AuthenticationProvider {
  if (configuredAuthProvider() === "entra") {
    throw new Error("Interactive Entra authentication is owned by Azure Container Apps.");
  }
  return new DatabaseAuthenticationProvider();
}