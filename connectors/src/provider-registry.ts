import type {
  ExternalProvider,
  ProviderHealth,
  ProviderKind,
} from "./contracts";

type RegisteredProvider = ExternalProvider<unknown, unknown, unknown>;

export interface ProviderRegistration {
  readonly id: string;
  readonly kind: ProviderKind;
  readonly type: string;
  readonly refreshMinutes: number;
  readonly provider: RegisteredProvider;
}

interface ProviderRegistrationOptions {
  readonly type?: string;
  readonly refreshMinutes?: number;
}

export class ProviderRegistry {
  readonly #providers = new Map<string, RegisteredProvider>();
  readonly #registrations = new Map<string, ProviderRegistration>();

  register<TQuery, TRaw, TNormalized>(
    provider: ExternalProvider<TQuery, TRaw, TNormalized>,
    options: ProviderRegistrationOptions = {},
  ): void {
    const key = this.key(provider.kind, provider.id);

    if (this.#providers.has(key)) {
      throw new Error(`Provider already registered: ${key}`);
    }

    const registeredProvider = provider as unknown as RegisteredProvider;
    this.#providers.set(key, registeredProvider);
    this.#registrations.set(key, {
      id: provider.id,
      kind: provider.kind,
      type: options.type ?? provider.id,
      refreshMinutes: options.refreshMinutes ?? 60,
      provider: registeredProvider,
    });
  }

  get<TQuery, TRaw, TNormalized>(
    kind: ProviderKind,
    id: string,
  ): ExternalProvider<TQuery, TRaw, TNormalized> {
    const provider = this.#providers.get(this.key(kind, id));

    if (!provider) {
      throw new Error(`Provider not registered: ${kind}:${id}`);
    }

    return provider as ExternalProvider<TQuery, TRaw, TNormalized>;
  }

  list(kind?: ProviderKind): readonly RegisteredProvider[] {
    return [...this.#providers.values()].filter(
      (provider) => kind === undefined || provider.kind === kind,
    );
  }

  registrations(kind?: ProviderKind): readonly ProviderRegistration[] {
    return [...this.#registrations.values()].filter(
      (registration) => kind === undefined || registration.kind === kind,
    );
  }

  async healthCheckAll(): Promise<readonly ProviderHealth[]> {
    return Promise.all(this.list().map((provider) => provider.healthCheck()));
  }

  private key(kind: ProviderKind, id: string): string {
    return `${kind}:${id}`;
  }
}
