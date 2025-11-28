# Jottin - Product Requirements Document

## Overview

Jottin is an AI-powered note-taking application that helps users create, organize, and discover connections between their notes using Google Gemini AI. It features local-first storage with end-to-end encrypted cloud sync, enabling secure note synchronization across multiple devices.

## Tech Stack

### Frontend

- React 19.2.0 + TypeScript
- Vite 6.2.0
- Tailwind CSS 3.4.18
- Font Awesome icons
- IndexedDB (Dexie.js) for local-first storage
- Web Crypto API for client-side encryption

### Backend

- Go 1.23+ (Clean Architecture)
- PostgreSQL (NeonDB)
- Clerk Authentication
- Google Gemini AI integration

### Deployment

- Docker + Docker Compose
- DigitalOcean VPS (Ubuntu)
- Nginx (Reverse Proxy + SSL)
- Cloudflare DNS / Custom Domain

## Architecture

```
┌──────────────┐          ┌──────────────┐          ┌──────────────┐
│  Mobile/PC   │ ◄──────► │   Backend    │ ◄──────► │  PostgreSQL  │
│  (Frontend)  │   HTTPS  │    (Go)      │          │   (NeonDB)   │
│              │          │  (Encryption)│          │   (Vector)   │
└──────────────┘          └──────┬───────┘          └──────────────┘
       ▲                         │
       │ (Local DB)              ▼
┌──────┴───────┐          ┌──────────────┐
│   IndexedDB  │          │  Gemini AI   │
└──────────────┘          └──────────────┘
```

## Core Features

### 1. Note Management

- **Local-First**: Works offline, syncs when online
- Create, edit, delete notes
- Rich text editor with markdown support
- Pin important notes
- Organize notes into collections
- Voice transcription (live)

### 2. Cloud Sync & Security

- **Server-Side Encryption**: Notes are encrypted on the server (AES-GCM) before storage.
- **Cloud Sync**: Seamless synchronization across devices (PC, Mobile, Tablet)
- **Authentication**: Secure login via Clerk (Google, Email)

### 3. AI Features (RAG)

- **Smart Cleanup**: AI-powered note formatting and grammar correction
- **Related Notes**: Automatic discovery of relevant notes based on content
- **AI Chat**: Ask questions about your notes ("Chat with your notes") using RAG (Retrieval-Augmented Generation)
- **Vector Search**: Efficient retrieval of relevant notes using `pgvector` and Gemini embeddings

### 4. Collections

- Group related notes
- Custom icons
- Filter notes by collection

## API Endpoints

### Sync & Storage

```
GET    /api/sync/notes     # Fetch updated notes (Decrypted)
POST   /api/sync/push      # Push local changes (Plaintext -> Encrypted)
```

### AI Features

```
POST   /api/chat           # Chat with notes (RAG)
POST   /api/notes/relevant # Find related notes
POST   /api/notes/cleanup  # Format/Clean note
```

## Environment Variables

### Backend

```env
GEMINI_API_KEY=your_gemini_key
CLERK_SECRET_KEY=your_clerk_secret
DATABASE_URL=postgresql://user:pass@host/db
PORT=8080
DATA_ENCRYPTION_KEY=32_byte_hex_key
```

### Frontend

```env
VITE_API_URL=https://your-domain.com
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
```

## Database Schema

### Users Table

```sql
users (
  id VARCHAR(255) PRIMARY KEY, -- Clerk User ID
  email VARCHAR(255),
  created_at TIMESTAMP
)
```

### Notes Table

```sql
notes (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(id),
  title TEXT,
  content_encrypted BYTEA, -- AES-GCM Encrypted Content
  content_iv BYTEA,        -- AES-GCM IV
  embedding VECTOR(768),   -- Gemini Embedding
  domain VARCHAR(255),
  date TIMESTAMP,
  is_pinned BOOLEAN,
  created_at TIMESTAMP,
  updated_at TIMESTAMP,
  deleted_at TIMESTAMP
)
```

### Note Collections (Many-to-Many)

```sql
note_collections (
  note_id VARCHAR(255) REFERENCES notes(id),
  collection_id VARCHAR(255)
)
```

## Security Considerations

- **Server-Side Encryption**: Data is encrypted at rest in the database using AES-GCM.
- **Authentication**: All API endpoints protected via Clerk JWT.
- **HTTPS Enforcement**: Required for secure data transmission.

## Future Enhancements

- Real-time collaboration (Shared notes)
- Mobile App (React Native / PWA install)
- Export notes (PDF, Markdown)
- Full-text search

