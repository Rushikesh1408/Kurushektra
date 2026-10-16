# COGNICODE

Coding assessment platform that asks whether a student can explain, modify, and debug their own code. AI-origin analysis is an optional experimental module and never affects scores.

**Status: Phase 5 in progress.** Done: architecture, full schema + migration, authentication (argon2, short-lived JWT, rotating refresh cookie), backend role checks, challenge and hidden-test management, audit logging, seed fixtures, sign-in/register, challenge library, challenge detail, teacher challenge form, Monaco coding workspace (run, submit, custom input, history), submission API with job queue and worker, Judge0 adapter, static analysis & jscpd duplication detection, teacher analysis reports, and the follow-up question engine with student answer submission and evaluation-only data protection. In progress: debugging tasks, rubric scoring pipeline, and live sandbox validation. Nothing here is production-ready.

## What's verified

- Backend: 144 pytest tests pass (question engine & answer workflows, provider fallbacks, static analysis, jscpd similarity integration, submission pipeline, grading, Judge0 adapter against a mocked sandbox, hidden-result protection, outage handling, job cap and rate limits, plus auth, token handling, refresh reuse detection, role checks, hidden-test protection, rate limiting, validation, audit, seeds, models).
- A live run against a real migrated database confirmed: students see sample tests only, teachers see hidden ones, student create returns 403.
- Migration `0001`: applies on SQLite; generates 24 tables as PostgreSQL SQL (not run against a live PostgreSQL).
- Frontend: `npm run build` and 12 Vitest tests pass (including FollowUpQuestions workflow: loading, empty state, errors/retry, input validation, submission, and answer replacement).
- **Not verified: a real Judge0 deployment.** Docker daemon is unavailable in this environment and Judge0 is unconfigured/unreachable (`UNVERIFIED`). The adapter is tested against a mocked HTTP sandbox only. Run a real Judge0 and try a few submissions before trusting results.
- The Monaco editor loads its files from a CDN (jsdelivr) at runtime, so the workspace needs internet access in the browser. Bundling it locally is a possible later change.
- Docker files and `docker-compose.judge0.yml` are written but untested.

## Run locally

### Backend (Linux / macOS)
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="sqlite:///./dev.db"
export JWT_SECRET="$(python -c 'import secrets; print(secrets.token_urlsafe(64))')"
export COOKIE_SECURE=false      # plain-http local dev only
alembic upgrade head
python -m app.seed languages
SEED_PASSWORD='choose-a-password' python -m app.seed fixtures   # optional sample teacher + challenges
uvicorn app.main:app --reload
# in a second terminal, once Judge0 is running and JUDGE0_URL / JUDGE0_AUTH_TOKEN are set:
python -m app.worker
```

### Backend (Windows PowerShell)
```powershell
cd backend
py -3.12 -m venv .venv; .\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
$env:DATABASE_URL = "sqlite:///./dev.db"
$env:JWT_SECRET = python -c "import secrets; print(secrets.token_urlsafe(64))"
$env:COOKIE_SECURE = "false"   # plain-http local dev only
alembic upgrade head
python -m app.seed languages
$env:SEED_PASSWORD = "choose-a-password"; python -m app.seed fixtures
uvicorn app.main:app --reload
# second PowerShell window, with JUDGE0_URL and JUDGE0_AUTH_TOKEN set: python -m app.worker
```
API docs: http://localhost:8000/docs

### Frontend (both)
```bash
cd frontend
npm install
npm run dev      # http://localhost:5173
```

### Tests
```bash
cd backend && pytest          # Windows: same command inside the venv
cd frontend && npm test
```

### Docker (app + PostgreSQL)
```bash
cp .env.example .env          # Windows: Copy-Item .env.example .env, then edit values
docker compose up --build                                  # web, api, db (no code execution)
docker compose -f docker-compose.judge0.yml up -d          # sandbox, review its security notes first
docker compose --profile execution up --build              # adds the worker
```
Without the worker, submissions stay queued.

## Configuration
Copy `.env.example` to `.env`. Every secret is a placeholder; the API refuses to start without `DATABASE_URL` and a `JWT_SECRET` of at least 32 characters. Judge0 and LLM settings are only needed from phases 3 and 5.

### Create the first admin
```bash
ADMIN_EMAIL=you@college.edu ADMIN_PASSWORD='a-long-password' python -m app.seed admin
```
Registration only creates students. Teachers are promoted by an admin via `PATCH /admin/users/{id}`.

## Innovation Demo Simulation Mode & Demo Credentials
For presentations, competitions, and local demonstrations without Docker or Judge0, use **Option 1** in `start_codearena.bat` or run with `DEMO_MODE=true`.

The pre-configured demonstration accounts stored in the database:

| Role | Email | Password | Access / Purpose |
| :--- | :--- | :--- | :--- |
| **Student** | `demo-student@codearena.local` | `demo-arena-2026!` | Coding workspace, solution submissions, algorithmic follow-up questions |
| **Teacher** | `demo-teacher@codearena.local` | `demo-arena-2026!` | Teacher Assessment Dashboard, grading rubrics (`expected_points`), static analysis, similarity reports |

Both accounts are stored with argon2 password hashes directly in the application database (`dev.db`).

## Docs
`docs/ARCHITECTURE.md`: architecture, sequence and ER diagrams, phase plan. `docs/API.md`: endpoints, examples, known limits.

