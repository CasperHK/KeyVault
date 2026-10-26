# web-framework

Built with [Grit](https://gritframework.dev).

## Quick Start

```bash
# Go hot reload, bundled by the CLI; this installs it globally instead
go install github.com/air-verse/air@latest

# Frontend dependencies
pnpm install

# Create the tables
grit migrate

# Sample data, optional
grit seed

# Run everything
grit start
```

## Cloned this project?

`.env` holds this machine's secrets and is not committed; `.env.example` is, with
`CHANGE_ME` in their place. Create yours before anything else:

```bash
grit env        # .env from .env.example, every secret freshly generated
grit migrate
grit seed
```

To share a database that already holds encrypted data, put the team's
`FIELD_ENCRYPTION_KEY` in `.env` instead of the new one.

## Project Structure

```
web-framework/
├── api/              # Go backend (Gin + GORM)
├── src/              # The SPA the binary embeds
├── packages/shared/  # Shared types, schemas, constants
└── docker-compose.yml
```

## Services

| Service | URL |
|---------|-----|
| API | http://localhost:8080 |
| API docs | http://localhost:8080/docs |
| GORM Studio | http://localhost:8080/studio |
| Frontend | http://localhost:5173 |

## Development

```bash
# The Go API, with hot reload
cd api && air

# The frontend
pnpm dev
```

## No servers to run

This project uses SQLite, so there is no database process to start.
Redis is off unless you set `REDIS_URL`, and files go to `storage/` unless you
set `STORAGE_DRIVER`.

## Tech Stack

- **Backend:** Go + Gin + GORM
- **Frontend:** Vite + React + TanStack Router + TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Database:** SQLite
- **Validation:** Zod (shared schemas)
- **Data fetching:** React Query (TanStack Query)

---

*Built with Grit v3.411.4*
