# DORA Test Results

Last updated: 2026-08-18

## Automated Results

| Area                      | Status | Evidence                                                                                                                                                     |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| TypeScript workspaces     | Pass   | All workspace typechecks passed before Phase 40 preparation.                                                                                                 |
| Unit and contract tests   | Pass   | 103 tests across 22 files passed, including 7 prototype-auth tests and focused storage/pipeline suites.                                                      |
| Production web build      | Pass   | Next.js compiled 21 application pages/API routes, including database login and logout.                                                                       |
| Dependency audit          | Pass   | `npm audit --omit=dev` reported zero vulnerabilities.                                                                                                        |
| Bicep                     | Pass   | Platform, prototype parameters and web/job workload templates compile without diagnostics.                                                                   |
| Playwright desktop/mobile | Pass   | 13 local feature journeys passed across desktop/mobile with 3 intentional skips; the deployed database-auth journey passed separately.                       |
| All-screen render sweep   | Pass   | Dashboard, intelligence, research, sources, alerts, risks, manufacturing, scenarios, reports, timeline and performance rendered with H1s and no page errors. |

## Interactive Control Audit

| Control                     | Status | Result                                                                                                  |
| --------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| Navigation                  | Pass   | Grouped final navigation routes to every required domain; no inert rail buttons remain.                 |
| Commodity cards/table rows  | Pass   | Pointer and keyboard activation open evidence; category filters work on desktop and mobile.             |
| Charts and horizon controls | Pass   | Horizon selection changes pressed state; charts render in fixed responsive containers.                  |
| Filters and date controls   | Pass   | Commodity, risk, source, timeline and Ask DORA dates are labeled and actionable.                        |
| Ask DORA                    | Pass   | Deep link opens dialog; filters/date range submit; deterministic stream returns evidence and citations. |
| Sources                     | Pass   | Test, sync, enable/disable, edit and save controls issue API actions.                                   |
| Alerts                      | Pass   | Filters, evidence details and acknowledgement behavior are wired.                                       |
| Risks                       | Pass   | Heatmap/register selection and source evidence links work.                                              |
| Reports                     | Pass   | Regenerate/send/test-send actions are wired; HTML download returns an attachment.                       |
| Settings                    | Pass   | Authorized local mode saves; production mode correctly requires trusted Entra identity.                 |
| Scenario sliders            | Pass   | Slider changes call the deterministic engine; reset restores defaults.                                  |
| Manual refresh              | Pass   | Dashboard refresh updates analysis state.                                                               |
| Notification icon           | Pass   | Popover opens, notifications can be marked read and it closes correctly.                                |
| Profile menu                | Pass   | Profile menu opens, routes to account settings and signs out through the server logout API.              |
| Evidence links              | Pass   | Evidence drawers and external source links are actionable with safe external-link attributes.           |

## Known Limitations

- Prototype market cards remain clearly labeled illustrative until Azure ingestion completes and live source records replace the snapshot.
- Next.js emits Node's experimental SQLite warning during local demo tests; production configuration requires PostgreSQL and does not select SQLite.
- `next start` prints an advisory for standalone output in the local Playwright harness; the full static assets and pages render correctly. Azure uses the standalone container entrypoint.
- The prototype uses database-backed authentication with bcrypt and signed cookies. Entra configuration remains present but disabled for later production restoration.

## Deployed Prototype Authentication

| Check | Status | Evidence |
| --- | --- | --- |
| Unauthenticated direct access | Pass | `/dashboard` returns 307 to `/login?returnTo=%2Fdashboard`; protected APIs return 401. |
| Invalid login | Pass | Deployed Playwright journey receives the generic incorrect-email/password message. |
| Valid login | Pass | Azure PostgreSQL administrator reaches `/dashboard` and admin-only `/settings`. |
| Session security | Pass | `dora_session` is Secure, HttpOnly and SameSite=Lax; signature tamper/expiry tests pass. |
| Logout | Pass | Logout clears the session; subsequent `/settings` access redirects to login. |
| Password storage | Pass | Azure user row reports bcrypt hash, length 60, not plaintext; no password appears in logs or frontend chunks. |
| Last-login audit | Pass | `last_login_at` populated after deployed login. |
| Runtime secret | Pass | Container App references encrypted `auth-session-secret`; value is absent from source and frontend. |
| Provider migration path | Pass | `AUTH_PROVIDER=database`; existing Container Apps Entra config and app registration remain disabled, not deleted. |

## Azure Status

- Azure URL and health: Pass at `https://dora-web.nicefield-0eb02a6f.eastus2.azurecontainerapps.io`; health reports production and connected mode.
- PostgreSQL migrations/seed: Pass through migration 011; seeded domains and prototype administrator are in Azure PostgreSQL.
- Scheduled job: Pass; latest execution succeeded on the configured 30-minute schedule.
- Foundry routing: `dora-fast`, `gpt-4o` and `text-embedding-3-small` deployments are configured.
- Entra: retained as a disabled future provider; the app registration has no client secret.
- ACS Email and broad live AI quality benchmark remain operational follow-ups rather than authentication blockers for the demo.
- The inaccessible dedicated Storage account remains undeleted; DORA uses an isolated `dora-data` container on the only policy-compatible reachable account.
- GitHub push is pending because this workspace has no Git remote configured.
