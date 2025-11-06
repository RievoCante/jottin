# Jottin

AI-powered note-taking app with smart features powered by Google Gemini.

## Features

- 📝 Rich note-taking with markdown support
- 🎤 Voice transcription
- 🤖 AI-powered features:
  - Smart cleanup (formatting & grammar)
  - Related notes discovery
  - Chat with your notes
- 📁 Collections to organize notes
- 🎨 Beautiful, modern UI

## Tech Stack

**Frontend:** React 19, TypeScript, Tailwind CSS, Vite  
**Backend:** Go 1.23, Google Gemini AI  
**Database:** PostgreSQL (Phase 2)  
**Deployment:** Docker, Docker Compose

## Setup

### Prerequisites

- Node.js 18+
- Go 1.23+
- Docker & Docker Compose
- Google Gemini API Key ([Get one here](https://aistudio.google.com/apikey))

### Local Development (Without Docker)

1. **Backend:**

```bash
cd backend
cp .env.example .env
# Add your GEMINI_API_KEY to .env
go run main.go
```

2. **Frontend:**

```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173`

### Local Development (With Docker)

1. **Setup environment:**

```bash
cp .env.dev .env
# Edit .env and add your GEMINI_API_KEY
```

2. **Run with Docker Compose:**

```bash
docker compose -f docker-compose.dev.yml up --build
```

Visit: `http://localhost:5173`

## Deployment to Production (DigitalOcean VPS)

### On Your Local Machine

1. **Prepare production environment file:**

```bash
cp .env.prod.example .env.prod
# Edit .env.prod:
#   - Add your GEMINI_API_KEY
#   - Replace YOUR_VPS_IP with your actual VPS IP address
```

2. **Transfer files to VPS:**

```bash
rsync -avz --exclude 'node_modules' --exclude 'backend/jottin-backend' --exclude '.git' \
  . root@YOUR_VPS_IP:/root/jottin/
```

### On Your VPS

1. **SSH into VPS:**

```bash
ssh root@YOUR_VPS_IP
```

2. **Install Docker (if not already installed):**

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt install docker-compose-plugin -y
```

3. **Configure environment:**

```bash
cd /root/jottin
cp .env.prod .env
nano .env  # Verify your settings
```

4. **Configure firewall:**

```bash
sudo ufw allow 80/tcp
sudo ufw allow 8080/tcp
sudo ufw enable
```

5. **Deploy:**

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

6. **Check status:**

```bash
docker ps
docker compose logs -f
```

Visit: `http://YOUR_VPS_IP`

### Useful Commands

```bash
# View logs
docker compose -f docker-compose.prod.yml logs -f

# Restart services
docker compose -f docker-compose.prod.yml restart

# Stop services
docker compose -f docker-compose.prod.yml down

# Rebuild and restart
docker compose -f docker-compose.prod.yml up -d --build
```

## Environment Variables

### Backend

- `GEMINI_API_KEY` - Your Google Gemini API key (required)
- `PORT` - Server port (default: 8080)

### Frontend

- `VITE_API_URL` - Backend API URL
  - Development: `http://localhost:8080`
  - Production: `http://YOUR_VPS_IP:8080` or your domain

## API Endpoints

- `GET /health` - Health check
- `POST /api/chat` - Chat with AI about your notes
- `POST /api/notes/relevant` - Find related notes
- `POST /api/notes/cleanup` - Clean up note formatting

## Project Structure

```
jottin/
├── frontend/          # React frontend
│   ├── components/    # React components
│   ├── services/      # API services
│   └── ...
├── backend/           # Go backend
│   ├── handlers/      # HTTP handlers
│   ├── services/      # Business logic
│   ├── models/        # Data models
│   └── main.go        # Entry point
├── docker-compose.dev.yml   # Development config
├── docker-compose.prod.yml  # Production config
└── PRD.md            # Product requirements
```

## Roadmap

### Phase 1: AI Features ✅

- [x] Backend API for AI endpoints
- [x] Chat with notes
- [x] Find relevant notes
- [x] Clean up notes

### Phase 2: Full CRUD + Database (Coming Soon)

- [ ] PostgreSQL integration
- [ ] User authentication
- [ ] Note CRUD API
- [ ] Collections API
- [ ] Data persistence

## License

MIT
