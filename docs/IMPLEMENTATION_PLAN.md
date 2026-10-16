# COGNICODE Implementation Plan

This plan documents the dependency order, acceptance criteria, and testing requirements across all milestones.

---

## Milestone 1 — Audit and Reliability (Phases 0 & 2B)

### Scope
1. Baseline audit, documentation, and test report.
2. Submission lifecycle validation and transition guards.
3. Accurate `active_count` semantics across all terminal and non-terminal states.
4. `requeue_stale` bounded retries, UTC timezone safety, and dead-letter/exhaustion handling.
5. Worker crash recovery and idempotency tests.

### Acceptance Criteria
- `active_count` returns only count of genuinely active jobs (`QUEUED`, `RUNNING`) and correctly excludes `COMPLETED`, `FAILED`, and `ERROR`.
- `requeue_stale` increments `job.retry_count`. If `retry_count >= 3`, marks `job.status = ERROR` and `submission.status = FAILED` with a clear diagnostic message.
- Full test suite in `tests/test_lifecycle_reliability.py` passing without warnings or flakiness.

---

## Milestone 2 — Unified AI Brain (Phase 4)

### Scope
1. Create `backend/app/brain/` package:
   - `__init__.py`
   - `types.py` (Enums, data structures)
   - `service.py` (`BrainService`)
   - `context.py` (Context builder with strict permission checks and hidden-test filtering)
   - `provider.py` (LLM provider interface with timeout, retry, schema validation, fallback)
   - `prompts.py` (Grounded system/user prompts)
   - `schemas.py` (Pydantic validation schemas)
   - `errors.py` (Specialized exceptions)
2. Unify existing AI services (`ai_provider.py`, `question_engine.py`, `analysis.py`, `grading.py`) behind the `BrainService`.

### Acceptance Criteria
- All AI operations route through `BrainService`.
- Context builder strictly filters out hidden test cases and protected reference solutions.
- If provider fails or returns invalid schema, system falls back gracefully to deterministic outputs without crashing.

---

## Milestone 3 — Evidence and Adaptation (Phases 5 & 6)

### Scope
1. **Phase 5 — Learning Evidence & DNA**:
   - `LearningEvent` model & migration.
   - Event logging service for challenge opened, code executed, test failed/passed, viva answered, hint used.
   - `StudentErrorPattern` model for persistent Learning DNA profile (loop boundary, array index, boolean condition, etc.).
   - Telemetry endpoint for editor activity provenance.
   - Authenticated APIs for student timeline and DNA profile.
2. **Phase 6 — Adaptive Learning Engine**:
   - `Concept` and `ConceptPrerequisite` models (prerequisite DAG with cycle detection).
   - Initial concept taxonomy seed data.
   - `ConceptMastery` model with deterministic Bayesian Knowledge Tracing (BKT) calculation.
   - Learning-Gap Radar: DAG traversal to locate deepest prerequisite gap.
   - `RevisionSchedule` model with spaced-repetition scheduling in UTC.
   - Adaptive APIs for concepts, mastery, gaps, and revisions.

### Acceptance Criteria
- Database migration `0003` created and applied cleanly.
- Adding a cyclical prerequisite is blocked with validation error.
- BKT mastery updates deterministically on evidence.
- Spaced repetition schedules UTC due dates correctly.

---

## Milestone 4 — Code Comprehension Tools (Phase 7)

### Scope
1. Solution-aware viva generation and rubric-based answer evaluation via `BrainService`.
2. Progressive debugging hints (Level 1 to 4) without leaking hidden test cases.
3. Alternative solution explorer (comparing time/space complexity and trade-offs).
4. Code Change Prediction Lab (workflow: code -> controlled mutation -> student prediction -> sandbox run -> explanation).
5. Explain failed tests diagnostic tool.

### Acceptance Criteria
- Comprehensive endpoints under `/api/v1/comprehension/*`.
- Rubric evaluation returns structured scores (0..1) with feedback across dimensions.
- Prediction lab executes safely in sandbox and compares student prediction to actual output.

---

## Milestone 5 — Grounded Tutoring with Hybrid RAG (Phase 8)

### Scope
1. Models: `KnowledgeDocument`, `KnowledgeChunk`.
2. Ingestion pipeline preserving code blocks and generating keyword indices.
3. Hybrid retrieval (keyword BM25-like + metadata filtering).
4. Grounded response generation with citation IDs mapped to actual chunks.
5. Evidence sufficiency check: admits lack of knowledge if confidence/relevance is low.
6. Tutor modes: `learn`, `debug`, `hint`, `explain_code`, `exam_prep`.
7. Evaluation dataset and automated tests.

### Acceptance Criteria
- Responses cite valid chunk IDs.
- Out-of-domain queries trigger honest refusal.
- Unit and integration tests verify citation fidelity.

---

## Milestone 6 — Offline Support & Frontend Integration (Phases 9 & 10)

### Scope
1. **Phase 9 — Offline Support**:
   - Backend idempotency model `offline_sync_records` and batch sync endpoint.
   - Frontend offline service (`offlineSync.ts`) using local persistence, online/offline detection, and queued sync.
2. **Phase 10 — Frontend Integration**:
   - Extend `api.ts` with all new endpoints.
   - Connect learner pages (`LearningGapPage`, `MasteryPathPage`, `DashboardPage`, `LearnerReportPage`, `PracticeActivityPage`, `CodingWorkspacePage`).
   - Remove misleading mocks while retaining honest empty/loading/error states.
   - End-to-end regression tests and production build verification.

### Acceptance Criteria
- `npm run build` succeeds cleanly.
- All backend tests pass.
- Frontend pages render real data when backend is online and handle network offline state gracefully.
- Comprehensive `HANDOFF.md` updated.
