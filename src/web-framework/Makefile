# web-framework: Single App Makefile

.PHONY: dev build migrate seed run clean

# Development: the Vite app at the root, the Go API in api/, in parallel.
dev:
	@echo "Starting development servers..."
	@pnpm dev &
	@cd api && air

# Build production binary. Vite writes into api/web and the binary embeds it,
# so the result is one file with the whole app inside it.
build:
	@echo "Building frontend..."
	@pnpm install && pnpm build
	@echo "Building Go binary..."
	@cd api && go build -o ../bin/web-framework .
	@echo "Done! Binary at bin/web-framework"

# One-shot migrate + seed (handy for local resets).
migrate:
	@cd api && go run ./cmd/migrate

seed:
	@cd api && go run ./cmd/seed

# Run the built binary.
run: build
	@./bin/web-framework

# Clean build artifacts (keeps the placeholder so go build still works).
clean:
	@rm -rf bin/
	@rm -rf api/web/assets
