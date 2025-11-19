# Jottin Backend

Backend server for Jottin note-taking app with AI features and cloud sync.

## Setup

### Prerequisites

- Go 1.23+
- PostgreSQL (Neon recommended)
- Clerk account for authentication

### Environment Variables

Create a `.env` file in the `backend` directory:

```env
# Required
GEMINI_API_KEY=your_gemini_api_key
DATABASE_URL=postgresql://user:password@host/database
CLERK_SECRET_KEY=your_clerk_secret_key

# Optional
PORT=8080
```

### Database Setup

1. Create a Neon PostgreSQL database at https://neon.tech
2. Get your connection string (DATABASE_URL)
3. Run the migration:

```bash
# Using psql
psql $DATABASE_URL -f migrations/001_initial_schema.sql

# Or using Neon's SQL editor in the dashboard
```

### Running

```bash
# Development (with hot reload using Air)
air

# Production
go run main.go
```

## API Endpoints

### AI Endpoints
- `POST /api/chat` - Chat with AI
- `POST /api/notes/relevant` - Find relevant notes
- `POST /api/notes/cleanup` - Clean up note content
- `POST /api/validate-key` - Validate API key

### Sync Endpoints (Protected)
- `GET /api/sync/notes?since=<timestamp>` - Fetch notes since last sync
- `POST /api/sync/push` - Push local changes to server

All sync endpoints require authentication via Clerk JWT token in `Authorization: Bearer <token>` header.

## Architecture

- **Handlers**: HTTP request handlers (`handlers/`)
- **Services**: Business logic (`services/`)
- **Models**: Data structures (`models/`)
- **Database**: Neon PostgreSQL with migrations (`migrations/`)

## Cloud Sync

Cloud sync uses end-to-end encryption (E2E). Notes are encrypted on the client before being sent to the server. The server only stores encrypted blobs and cannot read note content.
