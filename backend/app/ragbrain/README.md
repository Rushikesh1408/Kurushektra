# Code Arena AI Brain

> **Adaptive Coding Education • RAG Tutoring • Deterministic Code Assessment • Mistake Memory**

Code Arena AI Brain is an integration-ready, production-grade cognitive module developed to supercharge modern programming education platforms with vector-grounded generative AI, isolated code execution, mistake diagnosis, and personalized adaptive learning paths.

---

## 🌟 Key Features

1. **RAG-Grounded AI Tutor**:
   - Semantic retrieval over vetted curriculum and textbooks using ChromaDB / Qdrant.
   - Built-in prompt injection defense ensuring answers are explanatory without leaking raw assignment code solutions.
   - Complete citation transparency with relevance scores and chunk references.

2. **Isolated Code Assessment & Deterministic Rubric**:
   - Sandboxed execution via Judge0 with CPU, memory, and wall-clock safety limits.
   - Hidden test case isolation ensuring expected outputs never leak to client network responses.
   - Deterministic mathematical grading separated strictly from generative text synthesis.

3. **Mistake Memory & Diagnosis Engine**:
   - Automated categorization of compilation, runtime, and logical failures (`OFF_BY_ONE`, `RECURSION_BASE_CASE`, `NULL_POINTER`, `TIME_LIMIT_EXCEEDED`, etc.).
   - Longitudinal tracking of student error patterns across assignments.

4. **Adaptive Learning Policy**:
   - Zone of Proximal Development (ZPD) heuristic algorithms.
   - Dynamic pedagogical interventions (`practice_easier`, `hint_scaffolding`, `concept_review`, `challenge_next`, `error_targeted`).

5. **Modern Glassmorphic Frontend Demo**:
   - Built with React 18, Vite, and TypeScript.
   - Full dark-mode UI with Monaco-style code editor, test case breakdown, knowledge explorer, and student skill profile visualizations.

---

## 🏗️ Repository Structure

```
rag/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/v1/           # API Routers (auth, health, tutor, submissions, progress)
│   │   ├── core/             # Configuration, logging, security & JWT
│   │   ├── db/               # SQLAlchemy engine & session factory
│   │   ├── models/           # PostgreSQL relational schema models
│   │   ├── schemas/          # Pydantic v2 validation models
│   │   └── services/         # Core engines (adaptive, evaluation, execution, inference, mistake memory, RAG)
│   ├── tests/                # Unit, integration, and security test suites
│   ├── Dockerfile            # Container build for backend
│   └── requirements.txt      # Python dependencies
├── frontend/                 # React 18 + Vite Web App
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, etc.)
│   │   ├── pages/            # Dashboard, Tutor, CodeArena, Knowledge, Progress, Auth
│   │   ├── services/         # Typed Axios API client
│   │   └── types/            # TypeScript interfaces
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
├── deploy/                   # Deployment configurations
│   └── docker-compose.yml    # Multi-container orchestration (FastAPI, Postgres, Qdrant, Judge0)
├── docs/                     # Architectural and API documentation
│   ├── api/                  # Endpoints reference
│   └── architecture/         # System overview and design specifications
└── .env.example              # Environment variables template
```

---

## 🚀 Quickstart

### 1. Configure Environment
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 2. Run with Docker Compose
To launch the complete stack (Postgres, Qdrant, Judge0, Backend):
```bash
docker-compose -f deploy/docker-compose.yml up -d
```

### 3. Run Backend Locally
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\activate
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 4. Run Frontend Locally
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 🧪 Running Tests

Run the backend test suite:
```bash
cd backend
pytest -v
```

Run security-specific tests:
```bash
pytest backend/tests/security/test_security.py -v
```

---

## 🔒 Security & Academic Integrity

- **Prompt Guardrails**: AI tutor explicitly denies requests for raw assignment solutions and refuses prompt injections embedded inside user queries or retrieved curriculum chunks.
- **Hidden Test Privacy**: Expected test outputs for hidden test cases are processed exclusively on the server and are masked from client responses.
- **JWT & Role-Based Access Control**: Strict permissions for `student`, `teacher`, and `admin` roles, with student resource ownership validation.
