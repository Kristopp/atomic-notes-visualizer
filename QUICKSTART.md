# Atomic Notes Visualizer - Quick Reference

## 🚀 Quick Start Commands

```bash
# Start everything (one command!)
./start.sh

# Check if everything is running
./status.sh

# Stop everything
./stop.sh
```

## 📁 Project Structure

```
atomic-notes-visualizer/
├── start.sh              # 🚀 Start all services
├── stop.sh               # 🛑 Stop all services  
├── status.sh             # 📊 Check service status
├── backend/              # FastAPI + PostgreSQL + AI
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── models/       # Database models
│   │   ├── services/     # AI service (GPT-5 mini)
│   │   └── tests/        # Tests (4/4 passing)
│   ├── seed_mock_data.py # Create test data without API key
│   ├── .env.example      # Copy to .env and add API key
│   └── requirements.txt
└── frontend/             # React + D3.js + Vite
    ├── src/
    │   ├── components/   # UI components
    │   ├── utils/        # Graph transformer
    │   └── tests/        # Tests (10/10 passing)
    └── package.json
```

## 🌐 Service URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:5173 (or 5174) | React app with D3.js graph |
| Backend API | http://localhost:8002 | FastAPI REST API |
| API Docs | http://localhost:8002/docs | Swagger UI |
| Database | localhost:5432 | PostgreSQL with pgvector |

## 🔑 Environment Setup

```bash
# Create backend/.env file
cat > backend/.env << EOF
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atomic_notes
OPENAI_API_KEY=sk-your-key-here
DEBUG=False
EOF
```

## 🧪 Testing Without API Key

```bash
cd backend
source venv/bin/activate
python seed_mock_data.py

# Then open http://localhost:5173
# You'll see a React Hooks knowledge graph!
```

## 📡 API Quick Reference

```bash
# Upload a note
curl -X POST http://localhost:8002/api/notes/upload \
  -F "file=@your-note.txt"

# Process with AI (requires API key)
curl -X POST http://localhost:8002/api/notes/1/process

# Get graph data
curl http://localhost:8002/api/notes/1/graph

# List all notes
curl http://localhost:8002/api/notes/

# Search
curl "http://localhost:8002/api/search?q=react+hooks"
```

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
tail -f /tmp/atomic-notes-backend.log

# Or restart manually
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8002
```

### Frontend won't start
```bash
# Check logs
tail -f /tmp/atomic-notes-frontend.log

# Or restart manually
cd frontend
npm run dev
```

### Database connection issues
```bash
# Check if Docker is running
docker ps | grep atomic-notes-db

# Restart database
docker compose down
docker compose up -d
```

### Port already in use
```bash
# Find what's using the port
lsof -i :8002  # Backend
lsof -i :5173  # Frontend

# Kill the process
kill <PID>
```

## 💰 Cost Information

**Models Used:**
- GPT-5 mini: $0.25/1M input, $2.00/1M output
- text-embedding-3-small: $0.02/1M tokens

**Per Note (~1000 tokens):**
- Entity extraction: ~$0.0013
- Embeddings: ~$0.00003
- Relationships: ~$0.0013
- **Total: ~$0.003** (less than half a cent!)

**Processing 1000 notes: ~$3**

## 🎨 Color Palette

```javascript
concept: '#FF70A6'      // Pink
technology: '#FF9770'   // Orange
idea: '#FFD670'         // Yellow
person: '#70E0FF'       // Cyan
technique: '#A770FF'    // Purple
architecture: '#70FFB9' // Green
pattern: '#FF70DD'      // Magenta
tool: '#70A7FF'         // Blue
```

## 📝 Development Commands

```bash
# Backend
cd backend
source venv/bin/activate
pytest -v                 # Run tests
alembic revision -m "msg" # Create migration
alembic upgrade head      # Run migrations

# Frontend
cd frontend
npm test                  # Run tests
npm run build            # Production build
npm run preview          # Preview production build

# Database
docker exec -it atomic-notes-db psql -U postgres -d atomic_notes
```

## 🔥 Common Workflows

### Adding a new note
1. Open http://localhost:5173
2. Click upload panel
3. Drop .txt or .md file
4. (If API key set) AI processes automatically
5. Explore the graph!

### Viewing logs
```bash
# All logs in one view
tail -f /tmp/atomic-notes-*.log

# Just backend
tail -f /tmp/atomic-notes-backend.log

# Just frontend
tail -f /tmp/atomic-notes-frontend.log
```

### Full reset
```bash
# Stop everything
./stop.sh

# Clear database
docker compose down -v

# Start fresh
docker compose up -d
cd backend
source venv/bin/activate
alembic upgrade head
cd ..
./start.sh
```

## 📚 Documentation

- **Main README**: `/README.md`
- **Backend docs**: `/backend/README.md`
- **Frontend package**: `/frontend/package.json`
- **API docs**: http://localhost:8002/docs (when running)

## ✨ Features Implemented

✅ D3.js force-directed graph  
✅ GPT-5 mini AI extraction (with reasoning!)  
✅ Vector embeddings for search  
✅ PostgreSQL + pgvector  
✅ File upload  
✅ Interactive visualization  
✅ Click, drag, zoom, hover  
✅ Entity coloring by type  
✅ Relationship strength  
✅ Mock data seeding  
✅ Full test coverage  
✅ One-command startup  

## 🎯 Next Steps

1. Add your OpenAI API key to `backend/.env`
2. Uncomment auto-processing in `frontend/src/App.tsx:100-120`
3. Upload your notes and watch the magic! ✨

---

**Built with ⚡ for visual learners**
