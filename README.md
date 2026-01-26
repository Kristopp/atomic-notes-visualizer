# Atomic Notes Visualizer

Transform your atomic notes into an interactive, colorful knowledge graph for visual memorization.

## Overview

Atomic Notes Visualizer is an AI-powered visualization tool that converts text-based atomic notes into an interactive mind-map. Using OpenAI's GPT-5 mini (with reasoning!) and embeddings, it automatically:

- Extracts key concepts and entities with AI reasoning
- Discovers relationships between ideas
- Generates a beautiful, interactive graph visualization
- Enables semantic search and filtering
- Supports personal annotations

## Features

### 🎨 Visual Memorization
- **Interactive Graph**: D3.js v7.9.0 force-directed layout
- **Colorful Nodes**: Category-based color coding (8 vibrant colors)
- **Relationship Edges**: Visual connections showing how concepts relate
- **Physics Simulation**: Organic, natural clustering

### 🤖 AI-Powered
- **Entity Extraction**: GPT-5 mini with built-in reasoning
- **Relationship Detection**: AI-powered connection discovery
- **Semantic Search**: Vector-based similarity search with text-embedding-3-small
- **Auto-Categorization**: Groups concepts by theme

### 🎯 Interactive Features
- Click nodes to see details
- Drag to reposition
- Zoom and pan navigation
- Filter by category/type/strength
- Hover tooltips
- Responsive design

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + D3.js v7.9.0 + Tailwind CSS
- **Backend**: FastAPI + PostgreSQL 15 + pgvector 0.8.1
- **AI**: OpenAI GPT-5 mini (reasoning) + text-embedding-3-small
- **Infrastructure**: Docker Compose

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Python 3.12+
- Node.js 18+
- OpenAI API key

### One-Command Startup 🚀

```bash
# Clone the repository
git clone <your-repo-url>
cd atomic-notes-visualizer

# Start everything (database, backend, frontend)
./start.sh
```

That's it! Open http://localhost:5173 (or 5174) in your browser.

### Manual Installation

If you prefer to set up manually:

1. **Start PostgreSQL**
```bash
docker compose up -d
```

2. **Setup Backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Run database migrations
alembic upgrade head

# Start backend server
uvicorn app.main:app --reload --port 8002
```

3. **Setup Frontend**
```bash
cd frontend
npm install
npm run dev
```

4. Open http://localhost:5173 in your browser

## Management Scripts

Convenient scripts to manage all services:

```bash
# Start all services (database, backend, frontend)
./start.sh

# Check status of all services
./status.sh

# Stop all services
./stop.sh
```

### What `start.sh` Does
1. ✅ Checks Docker is running
2. ✅ Starts PostgreSQL (if not running)
3. ✅ Starts backend API on port 8002
4. ✅ Starts frontend dev server
5. ✅ Shows you all URLs and PIDs
6. ✅ Creates log files in /tmp/

## Usage

### With Mock Data (No API Key Required)

```bash
# Seed the database with sample React Hooks data
cd backend
source venv/bin/activate
python seed_mock_data.py

# Start the app
cd ..
./start.sh
```

Open http://localhost:5173 - you'll see a React Hooks knowledge graph!

### With Real AI Processing (API Key Required)

1. **Add your OpenAI API key**
```bash
# Create backend/.env
echo "DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atomic_notes" > backend/.env
echo "OPENAI_API_KEY=sk-your-key-here" >> backend/.env
echo "DEBUG=False" >> backend/.env
```

2. **Upload a note through the UI**
   - Click the upload panel
   - Drop a .txt or .md file
   
3. **Process with AI** (uncomment code in `frontend/src/App.tsx:100-120`)
   - Automatically extracts entities
   - Generates embeddings
   - Detects relationships
   - Visualizes the graph

**Cost per note:** ~$0.003 (less than half a cent!)

## API Endpoints

- `GET /` - Health check
- `POST /api/notes/upload` - Upload a note file
- `POST /api/notes/{id}/process` - Process with AI
- `GET /api/notes/{id}/graph` - Get graph data
- `GET /api/notes/` - List all notes
- `GET /api/search?q=query` - Semantic search

See `backend/README.md` for full API documentation.

## Project Status

✅ **Fully Functional!**

- ✅ Frontend with D3.js visualization (10/10 tests passing)
- ✅ Backend API with FastAPI (4/4 tests passing)
- ✅ PostgreSQL + pgvector database
- ✅ GPT-5 mini AI integration (with reasoning)
- ✅ Mock data for testing without API key
- ✅ One-command startup scripts
- ✅ Full-stack integration complete

**Ready to use!** Just run `./start.sh` and open your browser.

## Architecture

- **PostgreSQL + pgvector**: Hybrid database for traditional data + vector search
- **Multi-Step AI Pipeline**: Extract entities → Generate embeddings → Find relationships → Categorize
- **D3.js Custom Visualization**: Force-directed graph with custom interactions
- **FastAPI Backend**: RESTful API with async support

## Future Plans

- Integration with YouTube Atomic Notes project
- Collaboration features (share graphs)
- Multiple visualization modes (3D, timeline, hierarchical)
- Export to Obsidian, Roam Research, Notion
- Spaced repetition system integration

## License

MIT

## Contributing

This is a personal learning project. Contributions and suggestions are welcome!

## Contact

Built with ⚡ for visual learners
