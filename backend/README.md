# Jottin Backend (Go)

## Setup

1. Install Go 1.23+
2. Copy `.env.example` to `.env` and add your Gemini API key
3. Install dependencies:
   ```bash
   go mod download
   ```

## Run Locally

```bash
go run main.go
```

Server will start on `http://localhost:8080`

## Build

```bash
go build -o jottin-backend
./jottin-backend
```

## Docker

```bash
docker build -t jottin-backend .
docker run -p 8080:8080 --env-file .env jottin-backend
```

## API Endpoints

### Health Check

```
GET /health
```

### AI Chat

```
POST /api/chat
Body: {
  "prompt": "string",
  "contextNotes": [Note...]
}
```

### Find Relevant Notes

```
POST /api/notes/relevant
Body: {
  "currentContent": "string",
  "allNotes": [Note...]
}
```

### Clean Up Note

```
POST /api/notes/cleanup
Body: {
  "content": "string"
}
```
