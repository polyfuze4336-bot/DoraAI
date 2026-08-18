# Copilot Studio Migration Checklist

> **Status: FUTURE.** Ordered preparation steps to expose DORA through Microsoft Copilot Studio without rebuilding the Azure backend. None of these are done today; the platform is architecture-ready.

## Preparation (max 10 items)

1. **Finalise the OpenAPI contract** — validate and stabilise [../../openapi/dora-api.yaml](../../openapi/dora-api.yaml) for the read endpoints Copilot Studio will call.
2. **Restore production authentication** — set `AUTH_PROVIDER=entra` and re-enable the Microsoft Entra app registration for the API boundary.
3. **Stand up Azure API Management** — front `dora-web` with an AI gateway (auth, rate limiting, token metrics, telemetry).
4. **Configure managed-identity backend auth** — APIM-to-`dora-web` using managed identity; no shared secrets.
5. **Build the custom connector** — import the OpenAPI into Copilot Studio as a custom connector / actions.
6. **Create the DORA agent** — define topics that map to actions (forecasts, risks, scenarios, sources, timeline, Ask DORA).
7. **Wire identity/OBO** — Microsoft Entra sign-in and on-behalf-of so answers respect user permissions.
8. **Add governance policies** — token-limit and emit-token-metric in APIM for cost control and observability.
9. **Test grounded responses** — verify Copilot Studio surfaces DORA's deterministic numbers and Foundry-grounded explanations unchanged.
10. **Harden and monitor** — private networking, Application Insights dashboards, and load/behaviour tests before rollout.

## Detailed Steps

### 1. Contract
- Ensure every operation exposed to Copilot Studio has a stable `operationId`, request/response schema, and auth definition.
- Mark future endpoints clearly so they are not imported prematurely.

### 2. Authentication
- Switch the deployed app to `AUTH_PROVIDER=entra`.
- Confirm the app registration redirect URIs, scopes and token audience.

### 3. Gateway (APIM)
- Import the OpenAPI as an APIM API with a real operation per endpoint.
- Apply `validate-jwt`, rate limits, and token-metric policies.
- Set the backend to `dora-web` with `authentication-managed-identity`.

### 4. Connector + Agent
- In Copilot Studio, create a custom connector from the APIM API.
- Author topics that call the actions and present results conversationally.

### 5. Validation
- Confirm deterministic numbers match the web app.
- Confirm AI explanations remain evidence-grounded.
- Run behaviour tests and cost/telemetry checks.

## What NOT to Do

- Do **not** duplicate DORA's data layer inside Copilot Studio.
- Do **not** let Copilot Studio generate numbers — always call DORA's deterministic engines.
- Do **not** embed secrets in the connector or agent — use Entra + managed identity + Key Vault.

## Dependencies

- Phase 2 hardening (Microsoft Entra production auth, private networking) strengthens this path but the OpenAPI/API foundation already exists in Phase 1.
</content>
