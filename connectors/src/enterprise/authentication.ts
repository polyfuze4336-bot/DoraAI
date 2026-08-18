import {
  EnvironmentCredential,
  ManagedIdentityCredential,
  type TokenCredential,
} from "@azure/identity";

import type {
  AccessTokenProvider,
  EnterpriseAuthenticationConfig,
} from "./contracts";

export class AzureIdentityTokenProvider implements AccessTokenProvider {
  readonly #credential: TokenCredential;

  constructor(config: EnterpriseAuthenticationConfig) {
    this.#credential =
      config.method === "managed-identity"
        ? config.managedIdentityClientId
          ? new ManagedIdentityCredential({
              clientId: config.managedIdentityClientId,
            })
          : new ManagedIdentityCredential()
        : new EnvironmentCredential();
  }

  async getToken(scope: string): Promise<string> {
    const token = await this.#credential.getToken(scope);
    if (!token)
      throw new Error(`Unable to acquire an access token for ${scope}.`);
    return token.token;
  }
}
