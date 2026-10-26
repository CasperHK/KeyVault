# syntax=docker/dockerfile:1.7
# ---------- Stage 1: build the SPA bundle ----------
FROM node:22.23-alpine AS frontend
WORKDIR /app/frontend

# The pnpm that package.json names in packageManager, which CI installs too.
# The image ran pnpm 9, which does not read onlyBuiltDependencies, so every
# dependency's install script ran during the build. Raise the two together.
RUN corepack enable && corepack prepare pnpm@10.33.4 --activate

COPY frontend/package.json frontend/pnpm-lock.yaml* ./
RUN pnpm install --no-frozen-lockfile

COPY frontend/ ./
RUN pnpm build

# ---------- Stage 2: build the Go binary ----------
FROM golang:1.26.10-alpine AS gobuild
WORKDIR /app

RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN go mod download

# Copy source, then drop the freshly-built SPA bundle into the location the
# //go:embed all:frontend/dist directive expects (project root).
COPY . .
COPY --from=frontend /app/frontend/dist ./frontend/dist

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/server .

# ---------- Stage 3: minimal runtime ----------
FROM alpine:3.24
RUN apk add --no-cache ca-certificates tzdata

# Packages a plugin needs at runtime go here, such as ffmpeg for grit plugin
# add video.
# grit:runtime-packages

# Create non-root user.
RUN addgroup -S app && adduser -S -G app app

WORKDIR /app
COPY --from=gobuild /out/server ./server

# IMPORTANT: chown happens before the USER directive. Sentinel/Pulse open
# embedded SQLite stores relative to CWD; without write access here they
# crash with "unable to open database file: out of memory (14)".
RUN chown -R app:app /app

USER app

EXPOSE 8080
ENV PORT=8080

# Unhealthy when the API stops answering. /api/health answers 200 while the
# server is serving, and reports each dependency in its body.
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD wget -q -O /dev/null "http://127.0.0.1:${APP_PORT:-8080}/api/health" || exit 1

CMD ["./server"]
