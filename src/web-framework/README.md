# KeyVault workspace

A full-stack IT inventory application scaffolded with **Grit v3.411.4**:
Go, Gin, GORM, SQLite, React, TypeScript, Vite and TanStack Router.

## Start locally (PowerShell)

Prerequisites: Go 1.26.10+ and Node.js 22+.

### One-click startup on Windows

Double-click [start-dev.bat](../../start-dev.bat) in the repository root, or run
it from a terminal. The launcher works regardless of your current directory.
It checks Go, Node.js, npm and the local `.env`, installs missing frontend
dependencies with `npm ci`, and opens separate API and frontend windows.
Vite opens **http://localhost:5173** in your browser when ready.

Keep both windows open while developing. Stop the servers with **Ctrl+C** in
each window. Errors remain visible in their respective windows. Port 5173 must
be free; the launcher intentionally does not switch to a different frontend port.
On first startup, Go compilation and database initialization may take longer
than the frontend; wait for the API's startup message before signing in.
For a fresh clone, generate `.env` as described below before using the launcher.

### Manual startup

```powershell
Set-Location src\web-framework
npm ci
```

The generated `.env` is machine-local and ignored by Git. On a fresh clone,
install the official Grit CLI and generate fresh environment secrets:

```powershell
go install github.com/MUKE-coder/grit/v3/cmd/grit@v3.411.4
grit env
```

Use the SQLite settings from `.env.example`. No Docker services are necessary.
The application automatically migrates the database on startup and seeds a
new development database with sample inventory and Grit accounts.

Start the API and frontend in two terminals:

```powershell
# Terminal 1, from src\web-framework
Set-Location api
go run .
```

```powershell
# Terminal 2, from src\web-framework
npm run dev
```

Open **http://localhost:5173**.

The SPA calls `/api` on its own origin: Vite proxies to `APP_PORT` in
development, and the Go executable serves both the API and SPA in production.
Leave `VITE_API_URL` empty unless intentionally using a separate API host.

Development-only administrator: `admin@example.com` / `admin123`.
The login page can fill these credentials when running the Vite development
server. No demo credentials are displayed in a production build.

## Routes

| Route | Purpose |
| --- | --- |
| `/` | Introduction and platform overview |
| `/login` | Workspace login, including authenticator verification |
| `/dashboard` | Authenticated L-shaped inventory dashboard |
| `/dashboard?view=devices` | All devices, including servers and phones |
| `/dashboard?view=servers` | Server inventory |
| `/dashboard?view=mobile` | Company mobile phones |
| `/dashboard?view=staff` | Staff directory |
| `/dashboard?view=staff&staff_id=1` | Shareable staff profile and currently assigned devices |
| `/dashboard?view=ownership` | Ownership assignment and handovers |
| `/dashboard?view=services` | Services and their host devices/servers |
| `/dashboard?view=services&service_id=1` | Shareable service installation and HTTP health details |
| `/dashboard?view=activity` | Latest 100 inventory events |
| `/admin/dashboard` | Generated Grit administration |
| `/api/v1/inventory` | Authenticated inventory API |

## What works

### Languages

The main KeyVault experience supports **English** and **Traditional Chinese**
(`zh-Hant`): introduction, login, inventory navigation and tables, staff/service
details, inventory dialogs, accessibility labels, known inventory API errors,
and CSV headings. Use the language selector on the introduction page, login page,
or dashboard top bar. Switching languages preserves unsaved forms and filters.

First-time visitors follow their browser's supported language preferences
(English or Traditional Chinese variants such as `zh-TW`/`zh-HK`); unsupported
languages fall back to English. A selection is saved locally as
`keyvault.language`, survives reloads and sign-out, and synchronizes across tabs.
If browser storage is unavailable, the choice still works for the current session
and a warning is logged. Dates and numbers use the selected locale, and the
document language updates for assistive technology.

Translations live in [zh-Hant.ts](src/lib/messages/zh-Hant.ts), with English
source messages as keys. Use `t("Complete sentence with {name}", { name })` and
subscribe components with `useLocale()` (or `useT()` for a locale-bound translator
used in memoized computations); do not concatenate translated sentence
fragments. Add new languages through [i18n.ts](src/lib/i18n.ts) and the language
selector. Missing/unknown messages retain their English text.

Only presentation changes: API enums, route/query parameters, identifiers, user
names, descriptions, departments, paths, URLs, and historical activity messages
remain unchanged. The generated Grit administration, blog and account-recovery
pages are outside this translation scope and remain in English.

Run `npm run test:i18n` for locale detection, persistence, interpolation, catalogue
coverage and placeholder regression checks (Node's test runner and the existing
TypeScript compiler; no additional dependencies).

The root layout includes [ScrollTopButton](src/components/buttons/ScrollTopButton.tsx)
on every route, including public, login, inventory and admin pages. It appears
after scrolling more than 300px, shows page progress in its ring and smoothly
returns to the top (instantly with reduced motion). Its styles are scoped to the
button, and admin pages reserve space above the floating quick-access control.

Inventory pop-ups share [BaseDialog](src/components/dialogs/BaseDialog.tsx) for
consistent headers, descriptions, close controls, animated entry/exit and native
keyboard/focus behavior. Animations respect reduced-motion preferences. Keep a
dialog mounted until `onClose` runs after its exit animation; use `open={false}`
for programmatic dismissal or the render-child `close` callback for custom
buttons. Set `dismissible={false}` while a save or deletion is pending.

[AssetDialog](src/components/dialogs/AssetDialog.tsx),
[StaffDialog](src/components/dialogs/StaffDialog.tsx) and
[ServiceDialog](src/components/dialogs/ServiceDialog.tsx) own their resource-specific
fields and payloads for adding and editing records. They reuse
[InventoryEditorDialog](src/components/dialogs/InventoryEditorDialog.tsx) for
submission, validation errors, cache refresh and form actions.

- Add, edit and delete laptops, desktops, servers, phones and network devices.
- Record tags, specifications, serials, locations, purchase/warranty dates and notes.
- Register and manage staff, departments and job titles.
- Open a staff name, assigned-asset count, or device owner to review a staff
  detail page with profile, all assigned devices, warranty information and
  services hosted on those devices. Export that person's devices or open an
  assigned device to manage it; ownership changes refresh the profile.
- Assign, reassign or release device ownership with persisted change history.
- Register services against a host, with environment, status and optional port.
- Open a service name in the service list or staff profiles to review its host,
  physical location, saved installation path, responsible staff and HTTP diagnostics.
  Add a read-only HTTP(S) health URL in the service editor. The detail page runs
  checks every minute while open and visible, and offers **Check now**.
  Results persist in SQLite; results five minutes or older display as **Unknown**.
  Changing or clearing the URL resets the previous result.
  The authenticated ADMIN/EDITOR-only `POST /api/v1/inventory/services/:id/check`
  performs a real server-side GET with the existing safe HTTP client (10-second
  timeout, redirect validation, normal TLS verification). HTTP 2xx is healthy;
  other statuses and connection failures are unhealthy. Blocked destinations
  show Unknown with an explicit explanation. Private, loopback and metadata
  addresses are not supported; do not disable SSRF protections for internal hosts.
  Do not put credentials or secrets in health URLs. Response bodies are not stored.
  Checks do not run unattended after leaving the page, and only the latest result
  is retained. Installation paths remain manually maintained inventory data.
  This is an availability-monitoring foundation for the SIEM roadmap, not
  security-event ingestion, host error collection or compromise detection.
- Assign multiple responsible staff to each service in its add/edit form.
  Staff profiles list explicitly responsible services separately from services
  hosted on owned devices. Service search and CSV exports include responsible
  staff, and names link back to their profiles.
- Search, status/category filtering, pagination and CSV export of filtered records.
- Live dashboard totals, category breakdown, recent activity and warranty reminders.
- Responsive navigation, keyboard-accessible modal forms and explicit error states.
- Server-side authentication and ADMIN/EDITOR authorization; regular users cannot
  read or mutate company inventory.

Staff directory records are **not login accounts**. Administrators manage login
accounts and roles through Grit administration. This is a single-company
workspace, not a multi-tenant SaaS.

Assigning an available asset changes its status to `In use`. Changing an asset
to `Available` or `Retired` clears its owner. Servers and other shared devices can
be in use without a personal owner. Ownership events and mutations are saved
atomically. A staff member with assigned assets cannot be deleted; a host with
services cannot be deleted or retired until those services are moved or removed.
Database foreign keys also protect these relationships.

Service responsibility is independent of device ownership. Existing services
start unassigned; no responsibilities are inferred from a host's owner.
Remove or reassign a staff member's service responsibilities before deleting
their record. Deleting a service removes its responsibility links. Restart the
Go API after updating so auto-migration creates the relationship table and adds
the service installation and HTTP monitoring columns without removing existing data.

## Verification

```powershell
npm run build
Set-Location api
go test ./internal/handlers ./internal/routes ./internal/database ./internal/models
go build .
```

Focused inventory tests:

```powershell
go test ./internal/handlers -run TestInventory -count=1
```

## Production

Build the frontend first; Grit embeds it in the Go executable:

```powershell
npm run build
Set-Location api
go build -o keyvault.exe .
.\keyvault.exe
```

The API serves the built frontend on port 8080. Its SQLite database is stored
on disk and survives restarts. Back up that database and your environment
encryption key.

Before deployment:

- Set `APP_ENV=production`, configure a real `APP_URL` and restrict CORS origins.
- Generate unique environment secrets; never commit `.env`.
- Provision a strong administrator password using `SEED_ADMIN_PASSWORD` and
  Grit's seed command. Development sample staff/assets and weak accounts are
  deliberately not seeded outside `APP_ENV=development`.
- Disable public account registration in Grit's authentication settings if not
  required. Registration does not grant inventory access: only ADMIN/EDITOR do.
- Serve behind HTTPS and review Grit's administration/security configuration.

DM Sans and Manrope are bundled locally through Fontsource; the interface does
not need external font services or weaker content-security policies. The landing
illustration is a static preview, not live company data. All dashboard data
comes from the Go API, not browser mock storage.

### Upstream dependency advisory

At initialization, `npm audit --omit=dev` reports
[GHSA-mrhx-c7xc-m3w5](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5)
against Grit's generated Zod 3 dependency (oversized collection validation can
exhaust memory). Inventory mutations are validated on the Go server, but this
does not remove the dependency advisory. A verified migration of the generated
Grit admin schemas and form resolvers to a patched Zod release is required
before treating this scaffold as production-hardened. Do not apply
`npm audit fix --force` without testing that major-version migration.
