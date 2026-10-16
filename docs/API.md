# API reference

Base URL `http://localhost:8000/api/v1`. Interactive docs: `/docs`, spec: `/openapi.json`.
Errors always look like `{"error": {"code": "...", "message": "...", "fields": [...]}}`; validation errors never echo submitted values.
Authenticated routes take `Authorization: Bearer <access_token>`. Access tokens last 15 minutes; the refresh token is an httpOnly, SameSite=Strict cookie scoped to `/api/v1/auth`, rotated on every use. Presenting an already-used refresh token revokes all of that user's sessions.

| Method & path | Role | Notes |
|---|---|---|
| POST `/auth/register` | public | Always creates a `student`. Rate limited. |
| POST `/auth/login` | public | Rate limited (default 10/min per IP). Same 401 for unknown email and wrong password. |
| POST `/auth/refresh` | cookie | Rotates the refresh token. |
| POST `/auth/logout` | cookie | Revokes the refresh token. |
| GET `/auth/me` | any | |
| GET `/languages` | any | Enabled languages. |
| GET `/challenges?page=&page_size=` | any | Students: published only. Teachers: published + own. Admin: all. |
| GET `/challenges/{slug}` | any | Safe view: description, sample tests, `hidden_test_count`. Never hidden test contents. |
| POST `/challenges` | teacher, admin | |
| GET `/challenges/{id}/manage` | owner, admin | Full view including hidden tests. Others get 404. |
| PATCH `/challenges/{id}` | owner, admin | |
| POST `/challenges/{id}/test-cases` | owner, admin | Hidden by default. |
| DELETE `/challenges/{id}/test-cases/{tid}` | owner, admin | |
| POST `/challenges/{id}/run` | any | 202. Sample tests only, or `custom_input` for a single run. Hidden tests never run. 30/min. |
| POST `/challenges/{id}/submissions` | any | 202. Official submission: all tests. 20/min. |
| GET `/submissions/{id}` | owner | Poll until `status` is `completed` or `failed`. Hidden tests appear as label, verdict, time and memory only. |
| GET `/challenges/{id}/submissions` | any | Your own official submissions, paginated. |
| GET `/submissions/{id}/review` | challenge owner, admin | Code plus full test detail including hidden. Audited. |
| GET `/submissions/{id}/questions` | submission owner | Student view: lists follow-up questions. `expected_points` / grading guides are excluded. 404 if not owner. |
| POST `/submissions/{id}/questions` | challenge owner, admin | (Re)generates follow-up questions (count clamped 1..6, default 4). Returns 409 if student answers exist unless `force=true`. Rate limited (10/min). Audited. |
| GET `/submissions/{id}/questions/review` | challenge owner, admin | Teacher review: questions with grading guide (`expected_points`) and question source (`llm` or `fallback`). Audited. |
| POST `/submissions/{id}/questions/{qid}/answers` | submission owner | Student submits or replaces an answer for a specific question. Sets `score` and `feedback` to null for re-evaluation. Rate limited (20/min). Audited. |
| GET `/reports/{submission_id}` | challenge owner, admin | Analysis report: static analysis findings, jscpd similarity comparisons, summary stats. Audited. |
| POST `/reports/{submission_id}/reanalyse` | challenge owner, admin | Re-run static analysis and peer similarity on demand. Audited. |
| GET `/reports/{submission_id}/similarity` | challenge owner, admin | Detailed similarity comparison list. |
| GET `/admin/users` | admin | Paginated. |
| PATCH `/admin/users/{id}` | admin | Change role or active flag; audited; cannot target yourself. |

## Examples
```bash
curl -X POST localhost:8000/api/v1/auth/login -H 'content-type: application/json' \
  -d '{"email":"fixture-teacher@example.com","password":"<SEED_PASSWORD>"}'

curl -X POST localhost:8000/api/v1/challenges -H "Authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{
  "title": "Sum two numbers", "description_md": "Read two ints, print the sum.", "is_published": true,
  "languages": [{"key": "python3", "starter_code": "# your code"}],
  "test_cases": [
    {"input_data": "1 2", "expected_output": "3", "is_hidden": false},
    {"input_data": "40 2", "expected_output": "42", "is_hidden": true}]}'

# Student fetches questions
curl localhost:8000/api/v1/submissions/$SUBMISSION_ID/questions -H "Authorization: Bearer $STUDENT_TOKEN"

# Student submits answer
curl -X POST localhost:8000/api/v1/submissions/$SUBMISSION_ID/questions/$QUESTION_ID/answers \
  -H "Authorization: Bearer $STUDENT_TOKEN" -H 'content-type: application/json' \
  -d '{"answer_text": "The outer loop iterates n times while the inner runs at most O(log n)."}'
```

## Submission lifecycle
`POST` creates a `Submission` and an `ExecutionJob` (status `queued`) and returns immediately. A separate worker (`python -m app.worker`) claims jobs, runs each test in Judge0, grades by comparing output (trailing whitespace and trailing blank lines ignored), and stores results. Verdicts: `accepted`, `wrong_answer`, `compile_error`, `runtime_error`, `timeout`, `memory_limit`, `output_limit`. If the sandbox is down the submission ends `failed` with a generic message and no partial results, so a student is never graded on an outage. A user can have at most 3 queued/running submissions at once. Jobs stuck `running` for 5+ minutes are requeued.

Sandbox output is stored sanitized (file paths replaced, control characters removed, length capped). Compiler output may be shown to students; runtime messages for hidden tests never are.

## Question Engine
Follow-up questions probe student understanding after code submission:
- **Generation**: Triggered by teachers/admins via `POST /submissions/{id}/questions` or pipeline integration. If `LLM_PROVIDER` is configured (OpenAI-compatible) and responds with valid JSON adhering to schema within timeout, questions are created with `source="llm"`.
- **Deterministic fallback**: If `LLM_PROVIDER=none`, unconfigured, unreachable, timed out, or returning non-conforming responses, questions are synthesized deterministically from submission evidence (test failures, static analysis findings, jscpd similarity, language specifics) with `source="fallback"`.
- **Authorization & Privacy**: Students only see questions for submissions they own via `GET /submissions/{id}/questions`, which strictly excludes `expected_points` and evaluation rubrics. Teachers review full questions and grading guides via `GET /submissions/{id}/questions/review`.
- **Answer preservation**: Answers cascade from question records. To protect student work, regenerating questions returns HTTP 409 Conflict if answers exist, requiring explicit `force=true` to overwrite.
- **Scoring integration**: Student answer records store `score` (0..1) and `feedback` along with reviewer metadata. Submitting an updated answer automatically resets `score` and `feedback` to `null` for re-grading.

## Known limits
- Duplicate-email registration returns 409, which reveals that an email is registered. Accepted trade-off for clearer UX; revisit with email verification.
- Rate limits are in-memory per process. Behind multiple API replicas they need a shared store (Redis).
- CSRF protection relies on SameSite=Strict, exact-origin CORS and JSON-only bodies; there is no separate CSRF token.
- Memory-limit detection is approximate: Judge0 reports memory kills as runtime errors, so a violation is inferred when peak memory reaches the limit.
- Python/other runtime stderr shown for sample tests is sanitized but not parsed; teachers should not put secrets in sample test data.
- Live Judge0 sandbox requires Docker with privileged container execution (isolate) on a separate network; without a running Judge0 service, execution jobs fail with service unavailable.

