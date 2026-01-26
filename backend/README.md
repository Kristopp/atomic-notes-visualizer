# Atomic Notes Visualizer - Backend

AI-powered knowledge graph API for transforming atomic notes into interactive visualizations.

## Features

✅ **File Upload** - Upload .txt or .md notes  
✅ **AI Entity Extraction** - GPT-5 mini powered with built-in reasoning  
✅ **Vector Embeddings** - text-embedding-3-small for semantic search  
✅ **Relationship Detection** - AI-discovered connections with reasoning  
✅ **Graph API** - Returns D3.js-ready graph data  
✅ **Semantic Search** - pgvector-powered similarity search  

## Tech Stack

- **FastAPI** - Modern Python web framework
- **PostgreSQL 15** - Relational database
- **pgvector 0.8.1** - Vector similarity search extension
- **OpenAI** - GPT-5 mini (with reasoning) + text-embedding-3-small
- **SQLAlchemy** - ORM
- **Alembic** - Database migrations

## Setup

### Prerequisites

- Python 3.12+
- Docker & Docker Compose
- OpenAI API key

### Installation

```bash
# 1. Start PostgreSQL with pgvector
cd ..
docker compose up -d

# 2. Create virtual environment
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Configure environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# 5. Run migrations
alembic upgrade head

# 6. Start server
uvicorn app.main:app --reload --port 8002
```

## API Endpoints

### Upload Note
```bash
POST /api/notes/upload
Content-Type: multipart/form-data

# Example using curl
curl -X POST "http://localhost:8002/api/notes/upload" \
  -F "file=@test_note.txt"

# Response:
{
  "note_id": 1,
  "title": "test_note.txt",
  "content_length": 542,
  "status": "uploaded",
  "message": "Note uploaded successfully. Call /process to extract entities."
}
```

### Process Note (AI Pipeline)
```bash
POST /api/notes/{note_id}/process

# Example
curl -X POST "http://localhost:8002/api/notes/1/process"

# Response:
{
  "note_id": 1,
  "entities_count": 8,
  "relationships_count": 12,
  "status": "completed"
}
```

### Get Graph Data
```bash
GET /api/notes/{note_id}/graph

# Example
curl "http://localhost:8002/api/notes/1/graph"

# Response:
{
  "entities": [
    {
      "id": 1,
      "name": "React Hooks",
      "entity_type": "concept",
      "description": "Feature allowing state in functional components",
      "color": "#FF70A6"
    }
    ...
  ],
  "relationships": [
    {
      "id": 1,
      "source_entity_id": 1,
      "target_entity_id": 2,
      "relationship_type": "related_to",
      "strength": 0.9,
      "ai_explanation": "Hooks are implemented using useState"
    }
    ...
  ]
}
```

### Semantic Search
```bash
GET /api/search?q=state+management&limit=10

# Example
curl "http://localhost:8002/api/search?q=redux"
```

### List All Notes
```bash
GET /api/notes/

curl "http://localhost:8002/api/notes/"
```

## Database Schema

### Tables

- **notes** - Uploaded notes with vector embeddings
- **entities** - AI-extracted concepts (nodes in graph)
- **relationships** - Connections between entities (edges)
- **annotations** - User notes on entities

### Vector Search

Uses pgvector for similarity search:
```sql
SELECT * FROM entities 
ORDER BY embedding <=> query_embedding 
LIMIT 10;
```

## AI Pipeline

The processing pipeline (`/process` endpoint) performs these steps:

1. **Entity Extraction** (GPT-5 mini)
   - Analyzes note content with reasoning capability
   - Extracts concepts, technologies, ideas
   - Categorizes by type
   - Assigns vibrant colors
   - **Cost:** ~$0.25 per 1M input tokens, ~$2.00 per 1M output tokens

2. **Embedding Generation** (text-embedding-3-small)
   - Generates 1536-dimensional vectors
   - For note and each entity
   - Enables semantic search
   - **Cost:** ~$0.02 per 1M tokens

3. **Relationship Detection** (GPT-5 mini)
   - Identifies connections with reasoning
   - Assigns relationship types
   - Calculates strength scores (0.0-1.0)
   - Provides AI explanations
   - **Cost:** ~$0.25 per 1M input tokens, ~$2.00 per 1M output tokens

4. **Database Storage**
   - Saves all entities
   - Creates relationships
   - Indexes vectors for fast search

### Estimated Costs Per Note

Assuming average note size of ~1000 tokens (750 words):

- Entity extraction: ~$0.0003 (input) + ~$0.001 (output) = ~$0.0013
- Embeddings (10 entities): ~$0.00003
- Relationship detection: ~$0.0003 (input) + ~$0.001 (output) = ~$0.0013
- **Total: ~$0.003 per note** (less than half a cent!)

**Model Comparison:**
- Old (GPT-4 + ada-002): ~$0.03 per note
- GPT-4o-mini + embedding-3-small: ~$0.0005 per note
- **GPT-5 mini + embedding-3-small: ~$0.003 per note**
  - Slightly more expensive than gpt-4o-mini BUT includes reasoning capability
  - Better quality entity and relationship detection
  - 10x cheaper than old GPT-4 setup

**Why GPT-5 mini?**
- Built-in reasoning for smarter entity extraction
- Better at understanding complex relationships
- 400K context window (vs 128K for gpt-4o-mini)
- Still 10x cheaper than original GPT-4 setup

## Development

### Run Tests
```bash
# Vector DB tests
pytest -v app/tests/test_vector_db.py

# All tests
pytest -v
```

### Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback
alembic downgrade -1
```

### View API Documentation
```
http://localhost:8002/docs        # Swagger UI
http://localhost:8002/redoc       # ReDoc
```

## Color Palette

Entity types are automatically colored:

- **Concept** - Pink (#FF70A6)
- **Technology** - Orange (#FF9770)
- **Idea** - Yellow (#FFD670)
- **Person** - Cyan (#70E0FF)
- **Technique** - Purple (#A770FF)
- **Architecture** - Green (#70FFB9)
- **Pattern** - Magenta (#FF70DD)
- **Tool** - Blue (#70A7FF)

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/atomic_notes

# OpenAI
OPENAI_API_KEY=sk-...

# Debug
DEBUG=False
```

## Project Structure

```
backend/
├── app/
│   ├── api/              # FastAPI routers
│   │   ├── notes.py      # Note upload & processing
│   │   └── search.py     # Semantic search
│   ├── models/           # SQLAlchemy models
│   │   ├── note.py
│   │   ├── entity.py
│   │   ├── relationship.py
│   │   └── annotation.py
│   ├── services/         # Business logic
│   │   ├── ai_parser.py  # OpenAI integration
│   │   └── processor.py  # Pipeline orchestration
│   ├── tests/            # Test suite
│   │   └── test_vector_db.py
│   ├── database.py       # DB connection
│   └── main.py           # FastAPI app
├── alembic/              # Database migrations
├── requirements.txt      # Python dependencies
├── .env.example          # Environment template
└── README.md             # This file
```

## Performance

- Uses connection pooling (SQLAlchemy)
- Vector indexes for fast similarity search (pgvector IVFFlat)
- Async endpoints where beneficial
- Batch embedding generation possible

## Troubleshooting

### Port Already in Use
```bash
# Change port in command
uvicorn app.main:app --reload --port 8003
```

### Database Connection Error
```bash
# Check Docker container
docker ps | grep atomic-notes-db

# Restart container
docker compose restart
```

### OpenAI API Error
- Verify OPENAI_API_KEY in .env
- Check API quota/billing
- Review logs for details

## Next Steps

- [ ] Add rate limiting
- [ ] Implement caching
- [ ] Add background job queue (Celery)
- [ ] Create admin dashboard
- [ ] Add authentication
- [ ] Export to various formats
- [ ] Batch processing endpoint

## License

MIT

## Author

Built with ❤️ following Test-Driven Agent (TDA) pattern
