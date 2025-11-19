.PHONY: deps format lint test build migrate help

# Default target
help:
	@echo "Available targets:"
	@echo "  make deps      - Install Go dependencies and tools"
	@echo "  make format    - Format Go code with gofmt and goimports"
	@echo "  make lint      - Run golangci-lint"
	@echo "  make test      - Run tests"
	@echo "  make build     - Build the backend binary"
	@echo "  make migrate   - Run database migrations"
	@echo "  make check     - Run format and lint (for CI)"

# Install dependencies and tools
deps:
	go mod download
	@echo "Installing goimports..."
	@go install golang.org/x/tools/cmd/goimports@latest
	@echo "Installing golangci-lint..."
	@if ! command -v golangci-lint &> /dev/null; then \
		go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest; \
	fi

# Format code
format:
	@echo "Formatting Go code..."
	go fmt ./...
	@if command -v goimports &> /dev/null; then \
		goimports -w .; \
	else \
		echo "goimports not found. Run 'make deps' first."; \
	fi
	@echo "Formatting complete!"

# Lint code
lint:
	@if command -v golangci-lint &> /dev/null; then \
		echo "Running golangci-lint..."; \
		golangci-lint run ./...; \
	else \
		echo "golangci-lint not found. Run 'make deps' first."; \
		exit 1; \
	fi

# Run tests
test:
	@echo "Running tests..."
	go test -v ./...

# Build binary
build:
	@echo "Building backend..."
	go build -o jottin-backend .
	@echo "Build complete!"

# Run database migration
migrate:
	@if [ -z "$$DATABASE_URL" ]; then \
		echo "Error: DATABASE_URL environment variable is required"; \
		echo "Usage: DATABASE_URL='your_connection_string' make migrate"; \
		exit 1; \
	fi
	@echo "Running migration..."
	go run cmd/migrate/main.go

# Run both format and lint (for CI)
check: format lint

