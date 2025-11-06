# Jottin - Product Requirements Document

## Overview

Jottin is an AI-powered note-taking application that helps users create, organize, and discover connections between their notes using Google Gemini AI.

## Tech Stack

### Frontend

- React 19.2.0 + TypeScript
- Vite 6.2.0
- Tailwind CSS 3.4.18
- Font Awesome icons
- Google Gemini AI SDK

### Backend

- Go 1.25.3
- PostgreSQL (database)
- Google Gemini AI integration

### Deployment

- Docker + Docker Compose
- DigitalOcean VPS

## Architecture

```
┌─────────────┐         ┌─────────────┐         ┌──────────────┐
│   Frontend  │ ◄─────► │   Backend   │ ◄─────► │  PostgreSQL  │
│   (React)   │   HTTP  │    (Go)     │         │              │
└─────────────┘         └─────────────┘         └──────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │  Gemini AI   │
                        └──────────────┘
```

## Core Features

### 1. Note Management

- Create, edit, delete notes
- Rich text editor with markdown support
- Pin important notes
- Organize notes into collections
- Voice transcription (live)

### 2. AI Features

- **Smart Cleanup**: AI-powered note formatting and grammar correction
- **Related Notes**: Automatic discovery of relevant notes based on content
- **AI Chat**: Ask questions about your notes
- **Context Awareness**: AI understands note relationships

### 3. Collections

- Group related notes
- Color-coded organization
- Filter notes by collection

## API Endpoints

### Phase 1: AI Features (Current Implementation)

```
POST /api/chat
POST /api/notes/relevant
POST /api/notes/cleanup
```

### Phase 2: Full CRUD (Planned)

```
GET    /api/notes
POST   /api/notes
PUT    /api/notes/:id
DELETE /api/notes/:id

GET    /api/collections
POST   /api/collections
PUT    /api/collections/:id
DELETE /api/collections/:id
```

## Environment Variables

### Backend

```env
GEMINI_API_KEY=your_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/jottin
PORT=8080
```

### Frontend

```env
VITE_API_URL=http://localhost:8080
```

## Setup Instructions

### Prerequisites

- Node.js 18+
- Go 1.25+
- PostgreSQL 14+
- Docker & Docker Compose (optional)

### Local Development

#### Frontend

```bash
cd frontend
npm install
npm run dev
```

#### Backend

```bash
cd backend
go mod download
go run main.go
```

### Docker Deployment

```bash
docker-compose up --build
```

## Database Schema (Planned - Phase 2)

### Notes Table

```sql
notes (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  content TEXT,
  is_pinned BOOLEAN,
  collection_id UUID,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
)
```

### Collections Table

```sql
collections (
  id UUID PRIMARY KEY,
  name VARCHAR(100),
  icon VARCHAR(50),
  color VARCHAR(20),
  created_at TIMESTAMP
)
```

## Security Considerations

- API key stored securely in backend only (never exposed to frontend)
- Input validation on all endpoints
- CORS configuration for production
- PostgreSQL connection pooling and prepared statements

## Future Enhancements

- User authentication & authorization
- Real-time collaboration
- Mobile app (React Native)
- Export notes (PDF, Markdown)
- Dark mode
- Note sharing & permissions
- Full-text search optimization
