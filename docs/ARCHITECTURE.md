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
## COGNICODE Central AI Brain & Subsystems

```mermaid
flowchart TD
    subgraph UI[React + TypeScript SPA (Kurushektra-main)]
      CW[Coding Workspace]
      LG[Learning Gap Radar]
      MP[Mastery Path]
      LR[Learner Report]
      RT[RAG Tutor]
      OFS[Offline Sync Manager]
    end

    subgraph API[FastAPI Gateway]
      direction TB
      AUTH[Auth & RBAC]
      SUB[Submissions & Execution API]
      COMP[Comprehension API]
      ADAP[Adaptive Engine API]
      LEVN[Learning Timeline & DNA API]
      TUTR[Tutor API]
      SYNC[Sync Endpoint]
    end

    subgraph Brain[Central COGNICODE BrainService]
      direction TB
      CTX[Context Builder & Permission Filter]
      PROV[Provider Interface & Fallback Engine]
      VIVA[Solution-Aware Viva]
      EVAL[Rubric Answer Evaluator]
      HINT[Progressive Hint Engine]
      ALT[Alternative Solution Explorer]
      PRED[Code Prediction Lab]
      DIAG[Failure Diagnostic Engine]
    end

    subgraph AdaptiveSystem[Adaptive & Evidence Layer]
      BKT[Bayesian Knowledge Tracing]
      DAG[Concept Prerequisite DAG]
      DNA[Personal Error DNA Engine]
      SRS[Spaced-Repetition Scheduler]
    end

    subgraph Storage[PostgreSQL / SQLite Storage]
      MIG[(Alembic Migrations)]
      EVT[(Learning Events & DNA)]
      MST[(Concepts, DAG, Mastery)]
      KB[(Knowledge Docs & Chunks)]
    end

    UI --> API
    API --> Brain
    API --> AdaptiveSystem
    Brain --> Storage
    AdaptiveSystem --> Storage
```

### Architectural Principles

1. **One Brain, Specialized Capabilities**: All AI-assisted features (viva generation, answer evaluation, progressive hints, code predictions, tutor chat) route through `app.brain.service.BrainService`.
2. **Context Built from Trusted Records Only**: The context builder checks caller identity and strictly excludes hidden test cases, expected hidden answers, and other students' submissions.
3. **Deterministic Core**: Code execution, grading, test results, and mastery estimates are calculated deterministically. AI interpretations are stored separately from authoritative records.
4. **Resilient Fallback**: If LLM providers are unavailable or return malformed JSON, deterministic fallbacks ensure student progression is never blocked.
5. **Idempotent Background Jobs & Safe Offline Sync**: Submissions and sync batches use idempotency keys to prevent duplicate execution or state corruption.

