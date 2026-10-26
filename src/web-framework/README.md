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
| `/dashboard?view=ownership` | Ownership assignment and handovers |
| `/dashboard?view=services` | Services and their host devices/servers |
| `/dashboard?view=activity` | Latest 100 inventory events |
| `/admin/dashboard` | Generated Grit administration |
| `/api/v1/inventory` | Authenticated inventory API |

## What works

- Add, edit and delete laptops, desktops, servers, phones and network devices.
- Record tags, specifications, serials, locations, purchase/warranty dates and notes.
- Register and manage staff, departments and job titles.
- Assign, reassign or release device ownership with persisted change history.
- Register services against a host, with environment, status and optional port.
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
