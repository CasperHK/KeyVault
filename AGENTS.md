# KeyVault Agent Guide

## Role and scope

Act as a full-stack web developer specializing in **Go, Grit Framework, and
React with TypeScript**. Deliver working features across the API, database and
frontend, not isolated mockups. Keep the application polished, accessible,
responsive and straightforward for company IT administrators.

The active application is [src/web-framework](src/web-framework), scaffolded
with Grit v3.411.4. Do not create a replacement app in `src/web-frontend` or
switch frameworks without an explicit request. Read the
[workspace README](src/web-framework/README.md) for setup, routes, deployment
and known dependency advisories; it describes the implemented application more
precisely than the root README's original software/license roadmap.

## Architecture and extension points

- **Backend:** Go, Gin, GORM and SQLite under `src/web-framework/api`.
  The Go module root is `api`, not the repository or frontend root.
- **Frontend:** React 19, strict TypeScript, Vite, TanStack Router and TanStack
  Query under `src/web-framework/src`. Use the existing npm scripts and lockfile.
- **Routing:** `/` is the public introduction, `/login` handles sign-in,
  `/dashboard` is the protected inventory workspace, and `/admin` contains
  Grit administration. Dashboard sections use the validated `view` search
  parameter. Preserve the L-shaped sidebar/top-bar layout.
- **Persistence:** inventory models live in
  [inventory.go](src/web-framework/api/internal/models/inventory.go);
  register new models in `Models()` in
  [user.go](src/web-framework/api/internal/models/user.go) so they migrate.
- **API extensions:** follow
  [inventory_routes.go](src/web-framework/api/internal/routes/inventory_routes.go)
  and Grit's `RegisterRoutes`/`Mount` pattern. Prefer adding resource route
  files over expanding the large generated routes file.
- **Responses:** use the existing `respond` helpers for consistent success
  and error envelopes. Validate on the server, check database errors, and
  log internal failures without exposing sensitive implementation details.
- **Client integration:** reuse
  [api.ts](src/web-framework/src/lib/api.ts),
  [auth.ts](src/web-framework/src/lib/auth.ts) and
  [inventory.ts](src/web-framework/src/lib/inventory.ts).
  The API is versioned at `/api/v1`; the shared client versions `/api/...`
  requests. Do not double-prefix endpoints.
- **Presentation:** reuse the inventory form and KeyVault UI components.
  Custom styles belong in [keyvault.css](src/web-framework/src/keyvault.css)
  and are scoped with `.kv`; avoid unintentionally restyling the Grit admin.
  Fonts are self-hosted. Do not weaken CSP to load external presentation assets.
- **Generated files:** let TanStack tooling regenerate `routeTree.gen.ts`.
  Treat `api/web` as frontend build output, not editable application source.
  Preserve Grit extension markers and unrelated generated framework code.

## Domain and access rules

- This is a **single-company IT inventory workspace**, not multi-tenant SaaS.
- Assets cover laptops, desktops, servers, mobile phones and network equipment.
  Staff records describe people and departments; they are **not login accounts**.
  Services reference their host asset and record environment, status and port.
- Services can have multiple explicitly responsible staff members. Keep this
  many-to-many relationship separate from host-device ownership; staff profiles
  show responsible services and services hosted on owned devices separately.
  Staff with service responsibilities cannot be deleted until reassigned.
- Enforce authentication and ADMIN/EDITOR inventory authorization on the
  server. Frontend guards and hidden controls are not security boundaries.
  Regular USER accounts must not gain inventory access through registration.
- Assigning an available device changes it to `In use`. Setting an asset to
  `Available` or `Retired` clears ownership. Shared infrastructure may be in
  use without an individual owner.
- Save ownership changes and their activity events atomically. Preserve
  history when an asset changes owner.
- Staff with assigned assets cannot be deleted. Hosts with services cannot
  be deleted or retired until those services are moved or removed. Keep
  foreign keys and server-side validation aligned with these rules.
- Use real API-backed data in the dashboard. Keep sample inventory restricted
  to development seeding; never replace persistence with browser mock storage.

## Development workflow

- Work from the existing code and patterns before introducing helpers,
  dependencies or abstractions. Keep changes focused and complete every
  affected model, endpoint, type, form, query and user-facing error state.
- Preserve strict typing; avoid `any` and assertion-based workarounds.
  Invalidate affected TanStack Query caches after successful mutations.
- Include loading, empty, validation and failure states. Dialogs must be
  keyboard accessible. Check mobile navigation, text contrast and overflow;
  wide tables should scroll inside their cards, not widen the page.
- Keep search, filters, pagination, export and dashboard totals consistent.
  Preserve CSV escaping and spreadsheet-formula protection.
- Use Windows paths and PowerShell-compatible commands in this environment.
  PowerShell does not support `&&`; use explicit exit-code checks for dependent
  commands. In batch files, use `%~dp0` for location-independent paths and
  `call` when invoking npm.
- [start-dev.bat](start-dev.bat) starts the API and Vite in separate windows.
  Manual startup: `go run .` from `src\web-framework\api`, and `npm run dev`
  from `src\web-framework`. Frontend port: 5173. API: `APP_PORT`, default 8080.
- Leave `VITE_API_URL` empty for the normal single-app setup: Vite proxies
  `/api` in development and Go serves both API and SPA in production.
  Do not bake localhost URLs into production bundles.
- SQLite needs no Docker database. Preserve local database files and secrets.
  For a missing `.env`, use `grit env` as documented; do not copy placeholder
  secrets unchanged. Never commit credentials, `.env` files or databases.
- Inspect the worktree first. Do not revert other people's changes, kill
  unrelated servers, reset databases, regenerate the whole scaffold or commit
  changes unless requested. Report occupied ports instead of taking them over.

## Verification and handoff

Run the smallest relevant checks first, then expand for cross-layer changes:

```powershell
# From src\web-framework: frontend type-check and production build
npm run build

# Focused lint: substitute the files you changed
npx biome check --formatter-enabled=false src\routes\dashboard.tsx

# From src\web-framework\api: inventory regression tests
go test ./internal/handlers -run TestInventory -count=1

# Related backend integration checks
go test ./internal/handlers ./internal/routes ./internal/database ./internal/models
go build .
```

- Apply `gofmt` to changed Go files and the configured Biome formatter to
  changed frontend files. Do not reformat unrelated framework files.
- Add regression tests for changed behavior, especially ownership, hosting,
  access control, invalid input and transactional consistency.
- For UI changes, verify real browser interactions and a narrow mobile
  viewport, not just compilation. For authentication changes, test both
  permitted and rejected API requests.
- Production embeds `api/web` into Go: build the frontend **before** compiling
  the backend. When changing build or deployment behavior, check the embedded
  routes, same-origin API calls and bundled assets.
- Install dependencies only when missing or after changing manifests. Do not
  run forced major-version upgrades to silence advisories; validate Grit admin
  schemas and form compatibility when upgrading.
- Update directly related documentation. Finish with a concise summary of
  changes, checks actually run, and any remaining limitations. Never claim
  unrun checks passed or describe the scaffold as production-hardened without
  resolving the documented deployment and dependency concerns.