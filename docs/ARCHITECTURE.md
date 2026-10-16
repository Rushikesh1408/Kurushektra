# CodeArena architecture

## System overview

```mermaid
flowchart LR
    subgraph Browser
      SPA[React + Vite SPA<br/>Monaco, Recharts]
    end
    subgraph AppNet[App network]
      API[FastAPI API<br/>auth, RBAC, rate limits]
      WRK[Assessment worker<br/>analysis, similarity, scoring]
      DB[(PostgreSQL)]
    end
    subgraph SandboxNet[Isolated sandbox network]
      J0[Judge0 server + workers<br/>isolate, no egress]
    end
    LLM[[Configurable LLM provider]]

    SPA -- HTTPS JSON --> API
    API --> DB
    WRK --> DB
    API -- enqueue --> WRK
    WRK -- run code, token auth --> J0
    WRK -- question prompts, schema-validated --> LLM
```

Key boundaries:

- Student code never runs in the API process. Only the worker talks to Judge0, and Judge0's token never reaches the browser.
- The LLM is optional. If it times out, errors, or returns schema-invalid output, deterministic fallback questions are used.
- Hidden test cases are read only by the worker and by teacher/admin schemas. Student response models do not declare fields for hidden input or expected output.
- AI-origin analysis is stored in its own table and is excluded from `assessment_scores` by design.

## Submission sequence (implemented across phases 3 to 6)

```mermaid
sequenceDiagram
    participant S as Student
    participant A as API
    participant W as Worker
    participant J as Judge0
    participant T as Teacher
    S->>A: POST /submissions (code, language)
    A->>A: validate, authorize, persist Submission + ExecutionJob
    A-->>S: 202 {submission_id}
    W->>J: run against visible + hidden tests
    J-->>W: per-test status, time, memory
    W->>W: static analysis, similarity, experimental AI-origin report
    W->>W: generate follow-up questions (LLM or fallback)
    S->>A: GET /submissions/{id} (poll)
    A-->>S: status + visible results only
    S->>A: POST answers, POST debug fix
    W->>W: score by rubric, build evidence report
    T->>A: GET /reports/{id} (full evidence)
```

## Entity relationship diagram

```mermaid
erDiagram
    users ||--o{ refresh_tokens : has
    users ||--o{ notifications : receives
    users ||--o{ audit_logs : acts
    users ||--o{ challenges : creates
    users ||--o{ submissions : makes
    permissions ||--o{ role_permissions : granted_by
    challenges ||--o{ challenge_languages : supports
    languages ||--o{ challenge_languages : used_in
    challenges ||--o{ test_cases : has
    challenges ||--o{ assessment_challenges : included_in
    assessments ||--o{ assessment_challenges : contains
    assessments ||--o{ assessment_participants : invites
    users ||--o{ assessment_participants : joins
    rubrics ||--o{ assessments : scores_with
    challenges ||--o{ submissions : receives
    assessments ||--o{ submissions : collects
    languages ||--o{ submissions : written_in
    submissions ||--o{ execution_jobs : queues
    submissions ||--o{ test_case_results : produces
    test_cases ||--o{ test_case_results : evaluated_as
    submissions ||--o{ code_analysis_findings : has
    submissions ||--o{ similarity_comparisons : compared_a
    submissions ||--o| ai_origin_reports : has
    submissions ||--o{ follow_up_questions : asks
    follow_up_questions ||--o{ student_answers : answered_by
    submissions ||--o{ debugging_tasks : poses
    submissions ||--o| assessment_scores : scored_as
    rubrics ||--o{ assessment_scores : applied
```

Notes on the schema (`backend/app/models`, migration `0001_initial_schema`):

- UUID string primary keys, `created_at`/`updated_at` where records change.
- Enums are stored as VARCHAR with CHECK constraints so the same migration runs on PostgreSQL and SQLite (tests).
- Uniqueness: user email, challenge slug, `(challenge, language)`, `(assessment, participant)`, `(submission, test case)` results, similarity `(a, b, method)`, one score and one AI-origin report per submission.
- `challenges.is_fixture` marks seed/sample data so it can be told apart from real assessment data.
- `refresh_tokens` stores a hash only.
- `debugging_tasks` keeps `original_code` and `modified_code` apart from `submissions.source_code`, which is never edited.

## Repository layout

```
codearena/
├── backend/
│   ├── app/{core,api,models}/    config, DB, routers, SQLAlchemy models
│   ├── alembic/                  migrations
│   └── tests/                    pytest
├── frontend/
│   └── src/{components,pages,lib}/
├── docs/ARCHITECTURE.md
├── docker-compose.yml            db + api + web
├── docker-compose.judge0.yml     sandbox (untested)
└── .env.example
```

Planned additions: `backend/app/{services,workers,schemas}`, `backend/app/services/{execution,analysis,similarity,ai_origin,questions,debugging,scoring}`.

## Plan
 
| Phase | Scope | Status |
|---|---|---|
| 1 | Architecture, schema, migration, design system, landing page | Done |
| 2 | Auth (argon2, JWT access + refresh), RBAC, challenge CRUD, seed fixtures | Done |
| 3 | Monaco workspace, submission API, Judge0 integration | Done (sandbox verified against a mock only) |
| 4 | Static analysis, similarity, report endpoints | Done |
| 5 | Follow-up question engine & student answering workflow, debugging engine | Question engine complete; debugging engine next |
| 6 | Rubric scoring, teacher review, analytics | Rubrics & answer schema defined; scoring pipeline next |
| 7 | Hardening, Playwright E2E, deployment docs | |

