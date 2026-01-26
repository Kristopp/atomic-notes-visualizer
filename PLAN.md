# Atomic Notes Visualizer - Comprehensive Implementation Plan

## Project Overview
**Name:** Atomic Notes Visualizer  
**Goal:** Visual memorization tool that transforms atomic notes into an interactive, colorful mind-map using AI-powered relationship detection  
**Timeline:** Rich experience - 1 week development  
**Status:** Implementation Phase - Phase 1 (Foundation)  
**Pattern:** Test-Driven Agent (TDA) - Write tests first, then implement

---

## Tech Stack (Finalized)

### Frontend
- React 18 + TypeScript + Vite
- **D3.js v7.9.0** for custom graph visualization (latest stable)
- **Hybrid Styling**:
  - **Tailwind CSS** for UI shell (dashboard, forms, panels)
  - **CSS Modules (SCSS)** for graph components (performance-critical SVG)
- Framer Motion for animations
- Zustand for state management

### Backend
- FastAPI (Python 3.10+)
- PostgreSQL 15+ with pgvector extension
- OpenAI API (GPT-4 + Embeddings)
- SQLAlchemy ORM
- Alembic for migrations

### Testing (Test-Driven Agent Pattern)
- **Backend**: Pytest (unit + integration tests)
- **Frontend**: Vitest (unit tests for logic/math)
- **E2E/Component**: Cypress (interactive UI testing with time-travel debugging)

### Development
- Docker Compose (Postgres + pgvector)
- npm for frontend
- pip/venv for Python dependencies

---

## Database Schema

```sql
-- Notes table
CREATE TABLE notes (
    id SERIAL PRIMARY KEY,
    title VARCHAR(500),
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI ada-002 embeddings
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    source_file VARCHAR(255),
    metadata JSONB  -- flexible storage
);

-- AI-extracted entities (concepts from notes)
CREATE TABLE entities (
    id SERIAL PRIMARY KEY,
    note_id INTEGER REFERENCES notes(id),
    name VARCHAR(255) NOT NULL,
    entity_type VARCHAR(50),  -- concept, person, technique, etc.
    description TEXT,
    color VARCHAR(7),  -- hex color for visualization
    embedding vector(1536)
);

-- Relationships between entities
CREATE TABLE relationships (
    id SERIAL PRIMARY KEY,
    source_entity_id INTEGER REFERENCES entities(id),
    target_entity_id INTEGER REFERENCES entities(id),
    relationship_type VARCHAR(100),  -- "related_to", "prerequisite", "example_of"
    strength FLOAT,  -- 0.0 to 1.0
    ai_explanation TEXT  -- why AI thinks they're related
);

-- User annotations (for edit feature)
CREATE TABLE annotations (
    id SERIAL PRIMARY KEY,
    entity_id INTEGER REFERENCES entities(id),
    user_note TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- pgvector indexes for fast similarity search
CREATE INDEX ON notes USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX ON entities USING ivfflat (embedding vector_cosine_ops);
```

---

## AI Pipeline (Multi-Step)

### Step 1: Extract Entities
```python
# Prompt: Extract key concepts from atomic notes
Input: Raw note text
Output: JSON {
  "entities": [
    {"name": "Server-Side Rendering", "type": "concept", "description": "..."},
    {"name": "React Server Components", "type": "technology", "description": "..."}
  ]
}
```

### Step 2: Generate Embeddings
```python
# OpenAI text-embedding-ada-002
for each note and entity:
    embedding = openai.embeddings.create(input=text)
    store in pgvector
```

### Step 3: Find Relationships
```python
# Two approaches combined:
1. Explicit AI extraction:
   Prompt: "Analyze these concepts and identify relationships"
   
2. Embedding similarity:
   SELECT * FROM entities 
   ORDER BY embedding <=> query_embedding 
   LIMIT 10;
```

### Step 4: Categorize & Color
```python
# AI assigns categories and colors
Categories: "Architecture", "Performance", "Best Practices", etc.
Colors: Vibrant palette for playful visualization
```

---

## API Endpoints

```python
POST /api/notes/upload
  - Upload .txt file or paste text
  - Returns note_id

POST /api/notes/{note_id}/process
  - Triggers AI pipeline
  - Returns processing job_id

GET /api/notes/{note_id}/graph
  - Returns graph data for visualization
  - Format: {nodes: [...], edges: [...]}

GET /api/notes
  - List all notes

POST /api/entities/{entity_id}/annotate
  - Add user annotation to entity

GET /api/search
  - Semantic search via embeddings
  - Query param: ?q=concept&limit=10
```

---

## Frontend Features

### Main Visualization View
```
┌─────────────────────────────────────────┐
│  🔍 Search    [Filters ▼]    [+ Upload] │
├─────────────────────────────────────────┤
│                                         │
│         [D3 Interactive Graph]          │
│                                         │
│   Colorful nodes (concepts)             │
│   Curved edges (relationships)          │
│   Zoom/pan controls                     │
│   Physics simulation                    │
│                                         │
├─────────────────────────────────────────┤
│  Selected: "Server-Side Rendering"      │
│  Description: Improves load times...    │
│  [Edit] [Add Note] Related: 3 concepts  │
└─────────────────────────────────────────┘
```

### Key Interactions
1. **Click node** → Show detail panel
2. **Hover node** → Highlight connected nodes
3. **Drag node** → Reposition (physics adjust)
4. **Double-click** → Expand related concepts
5. **Filter** → By category, type, strength
6. **Search** → Semantic search, highlight matches
7. **Annotate** → Add personal notes to concepts

### D3.js Features
- Force-directed layout
- Collision detection
- Color-coded by category
- Node size = importance (centrality)
- Edge thickness = relationship strength
- Smooth animations
- Mini-map for navigation

---

## Project Structure

```
atomic-notes-visualizer/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── models/
│   │   │   ├── note.py
│   │   │   ├── entity.py
│   │   │   └── relationship.py
│   │   ├── services/
│   │   │   ├── ai_parser.py        # Multi-step AI pipeline
│   │   │   ├── embeddings.py       # OpenAI embeddings
│   │   │   ├── graph_builder.py    # Build graph from DB
│   │   │   └── vector_search.py    # pgvector queries
│   │   ├── api/
│   │   │   ├── notes.py
│   │   │   ├── graph.py
│   │   │   └── search.py
│   │   ├── database.py
│   │   └── tests/                  # Pytest test suite
│   │       ├── test_vector_db.py   # TDD: First test (pgvector)
│   │       ├── test_models.py
│   │       ├── test_ai_parser.py
│   │       └── golden_sets/        # Expected AI outputs
│   ├── alembic/                    # DB migrations
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/          # Styled with Tailwind
│   │   │   │   ├── UploadPanel.tsx
│   │   │   │   ├── FilterControls.tsx
│   │   │   │   └── SearchBar.tsx
│   │   │   └── graph/              # Styled with CSS Modules (SCSS)
│   │   │       ├── GraphCanvas.tsx
│   │   │       ├── GraphCanvas.module.scss
│   │   │       ├── Node.module.scss
│   │   │       └── NodeDetails.tsx
│   │   ├── hooks/
│   │   │   ├── useGraphData.ts
│   │   │   └── useD3.ts
│   │   ├── store/
│   │   │   └── graphStore.ts       # Zustand state
│   │   ├── types/
│   │   │   └── graph.d.ts
│   │   ├── utils/
│   │   │   ├── d3-helpers.ts       # D3 v7.9.0 utilities
│   │   │   └── graph-transformer.ts
│   │   ├── App.tsx
│   │   └── tests/                  # Vitest + Cypress
│   │       ├── unit/               # Vitest unit tests
│   │       │   └── graph-transformer.test.ts
│   │       └── e2e/                # Cypress E2E tests
│   │           └── user-journey.cy.ts
│   ├── cypress/                    # Cypress config
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml              # Postgres + pgvector
├── README.md
├── PLAN.md
└── .env.example
```

---

## Development Phases (Test-Driven Agent Pattern)

### Phase 1: Foundation & Infrastructure (Day 1-2)
- [ ] **TEST**: Write pgvector connectivity test (cosine similarity verification)
- [ ] **IMPLEMENT**: Setup project structure
- [ ] **IMPLEMENT**: Docker Compose with Postgres 15 + pgvector
- [ ] **IMPLEMENT**: FastAPI backend skeleton
- [ ] **TEST**: Write database model tests
- [ ] **IMPLEMENT**: Database models + migrations
- [ ] **TEST**: Write file upload endpoint test
- [ ] **IMPLEMENT**: Basic file upload endpoint
- [ ] **IMPLEMENT**: React + Vite + TypeScript setup with D3 v7.9.0
- [ ] **IMPLEMENT**: Configure Tailwind CSS + CSS Modules (SCSS)

### Phase 2: AI Pipeline & Vector Search (Day 2-3)
- [ ] **TEST**: Create "Golden Set" JSON specs for entity extraction
- [ ] **IMPLEMENT**: OpenAI integration
- [ ] **IMPLEMENT**: Entity extraction service
- [ ] **TEST**: Write embedding generation tests
- [ ] **IMPLEMENT**: Embedding generation with OpenAI ada-002
- [ ] **TEST**: Write vector similarity search tests
- [ ] **IMPLEMENT**: Relationship detection (AI + pgvector similarity)
- [ ] **TEST**: Verify categorization & coloring logic
- [ ] **IMPLEMENT**: Categorization & coloring service
- [ ] **TEST**: End-to-end pipeline test with Front-End Architecture notes

### Phase 3: Visualization Core (Day 3-5)
- [ ] **TEST**: Write Vitest for graph data transformation (D3 v7.9.0 format)
- [ ] **IMPLEMENT**: D3 data adapter utility
- [ ] **TEST**: Write Cypress component test for GraphCanvas
- [ ] **IMPLEMENT**: D3.js force-directed graph (v7.9.0)
- [ ] **IMPLEMENT**: Node rendering (colorful, sized) with CSS Modules
- [ ] **IMPLEMENT**: Edge rendering (curved, weighted)
- [ ] **IMPLEMENT**: Physics simulation
- [ ] **TEST**: Write interaction tests (click, drag, hover)
- [ ] **IMPLEMENT**: Zoom/pan controls
- [ ] **IMPLEMENT**: Interactive click/hover with detail panel

### Phase 4: Features & Integration (Day 5-6)
- [ ] **TEST**: Write semantic search tests
- [ ] **IMPLEMENT**: Semantic search via embeddings
- [ ] **TEST**: Write filter logic tests
- [ ] **IMPLEMENT**: Filters (category, type, strength)
- [ ] **IMPLEMENT**: Annotations/notes
- [ ] **TEST**: Write export functionality tests
- [ ] **IMPLEMENT**: Export graph (SVG/PNG)
- [ ] **IMPLEMENT**: Multiple notes support
- [ ] **TEST**: Write E2E Cypress test for complete user journey
- [ ] **IMPLEMENT**: Note comparison view

### Phase 5: Polish & Performance (Day 6-7)
- [ ] **TEST**: Write performance tests for large graphs (100+ nodes)
- [ ] **IMPLEMENT**: Performance optimization
- [ ] **IMPLEMENT**: Animations (Framer Motion)
- [ ] **IMPLEMENT**: Vibrant pastel color palette
- [ ] **IMPLEMENT**: Error handling
- [ ] **IMPLEMENT**: Loading states
- [ ] **TEST**: Responsive design tests
- [ ] **IMPLEMENT**: Responsive design
- [ ] **IMPLEMENT**: Documentation

---

## Development Environment Setup

### Prerequisites
- Docker & Docker Compose
- Python 3.10+
- Node.js 18+
- OpenAI API key

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Start Postgres with pgvector
docker-compose up -d

# Run migrations
alembic upgrade head

# Start FastAPI
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## Future Enhancements (Post-MVP)

### 1. Integration with YouTube Atomic Notes
- API endpoint to fetch notes
- One-click "Visualize" button in YouTube Notes app

### 2. Collaboration
- Share graphs with others
- Collaborative annotations
- Public graph gallery

### 3. Advanced Visualizations
- 3D graph view
- Timeline view
- Hierarchical tree view
- Comparison mode (multiple videos)

### 4. AI Features
- Auto-suggest related YouTube videos
- Generate quiz from graph
- Spaced repetition based on graph centrality

### 5. Export Options
- Obsidian format
- Roam Research
- Notion database
- Anki flashcards

---

## Design Decisions

### Why Vector Database (pgvector)?
1. **Semantic Search**: Find notes similar to X concept
2. **Auto-clustering**: Group similar notes without manual categories
3. **Relationship Discovery**: Find unexpected connections via embeddings
4. **Similarity-based edges**: Auto-connect related concepts
5. **Best of both worlds**: PostgreSQL for traditional data + vector search

### Why Hybrid Styling (Tailwind + CSS Modules)?
1. **Performance**: CSS Modules have zero runtime cost for performance-critical D3 animations
2. **Best Tool for the Job**: Tailwind excels at rapid UI prototyping; SCSS excels at complex SVG styling
3. **Bundle Size**: Tailwind purges unused classes; CSS Modules are scoped and tree-shakeable
4. **Developer Experience**: Tailwind for forms/buttons, SCSS for gradients/filters/glow effects
5. **Maintainability**: Clear separation of concerns (UI shell vs graph visualization)

### Why Cypress over Playwright?
1. **Visual Time-Travel Debugging**: See every step of D3 graph rendering
2. **SVG Support**: Excellent handling of SVG elements (what D3 renders)
3. **Easy Mocking**: `cy.intercept` for instant AI response testing without API calls
4. **Interactive**: Perfect for debugging complex drag/zoom interactions
5. **Component Testing**: Test D3 components in isolation with Cypress Component Testing

### Why Multi-Step AI Pipeline?
1. **Better control**: Debug each step independently
2. **Cost optimization**: Can cache intermediate results
3. **Quality**: More focused prompts = better results
4. **Flexibility**: Easy to modify individual steps

---

## Open Questions

1. **OpenAI API Budget**: Embedding costs (~$0.01 per long video)
2. **Postgres Installation**: Docker Compose vs Local vs Cloud
3. **Color Palette**: Pastel rainbow vs Vibrant neon vs Material Design
4. **Initial Test Data**: Use Front-End Architecture notes for testing?

---

## Notes
- Standalone project (separate from YouTube Atomic Notes)
- Development: Read notes from folder OR upload
- Production: Upload notes via UI
- Focus: Visual memorization through interactive graph
- Style: Colorful and playful (like mind mapping tools)
