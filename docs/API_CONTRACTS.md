# COGNICODE API Contracts

All endpoints live under `/api/v1`.  
JSON error responses always follow the format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable description",
    "fields": [{"field": "name", "message": "Field required"}]
  }
}
```

---

## 1. Authentication & System Core

- `POST /auth/register` (Public, Rate-limited 10/min)
- `POST /auth/login` (Public, Rate-limited 10/min)
- `POST /auth/refresh` (Cookie-authenticated)
- `POST /auth/logout` (Cookie-authenticated)
- `GET /auth/me` (Authenticated)
- `GET /health` (Public, returns `{"status": "ok"}`)
- `GET /demo/status` & `POST /demo/seed`

---

## 2. Challenges & Submissions

- `GET /challenges` (Query: `page`, `page_size`, `difficulty`, `search`)
- `GET /challenges/{id_or_slug}` (Public student view: visible tests only)
- `POST /challenges` (Teacher/Admin)
- `GET /challenges/{id}/manage` (Owner/Admin: includes hidden tests)
- `PATCH /challenges/{id}` (Owner/Admin)
- `POST /challenges/{id}/run` (202 Accepted, executes against sample tests or custom input)
- `POST /challenges/{id}/submissions` (202 Accepted, official submission)
- `GET /submissions/{id}` (Poll endpoint for student, returns test results with hidden tests obscured)
- `GET /submissions/{id}/review` (Teacher review: full test outputs and hidden tests, audited)
- `GET /challenges/{id}/submissions` (User submission history for this challenge)

---

## 3. Follow-up Questions & Viva Comprehension

- `GET /submissions/{id}/questions` (Student view, excludes teacher rubric/expected points)
- `POST /submissions/{id}/questions` (Teacher/Admin re-generation)
- `GET /submissions/{id}/questions/review` (Teacher view with grading guide)
- `POST /submissions/{id}/questions/{qid}/answers` (Student answer submission)
- `POST /comprehension/viva/evaluate` (Evaluates student viva answer against rubric)
  - **Body**: `{"submission_id": "...", "question_id": "...", "answer_text": "..."}`
  - **Response**: `{"score": 0.85, "feedback": "...", "dimensions": {"correctness": 0.9, "reasoning": 0.8, "edge_cases": 0.85}}`
- `POST /comprehension/hints` (Progressive debugging hint)
  - **Body**: `{"submission_id": "...", "hint_level": 1}` (1=Concept, 2=Location, 3=Action, 4=Explanation)
  - **Response**: `{"hint_level": 1, "hint_text": "...", "reveals_hidden": false}`
- `POST /comprehension/alternatives` (Alternative solutions & complexity comparison)
  - **Body**: `{"submission_id": "..."}`
  - **Response**: `{"alternatives": [{"name": "Iterative vs Recursive", "approach": "...", "time_complexity": "...", "space_complexity": "...", "trade_offs": "..."}]}`
- `POST /comprehension/predictions/generate` (Generate prediction exercise)
  - **Body**: `{"submission_id": "..."}`
  - **Response**: `{"task_id": "...", "modified_code": "...", "prompt": "..."}`
- `POST /comprehension/predictions/submit` (Submit prediction and execute)
  - **Body**: `{"task_id": "...", "predicted_output": "...", "explanation": "..."}`
  - **Response**: `{"actual_output": "...", "is_correct": true, "difference_explanation": "..."}`
- `POST /comprehension/explain-failure` (Explain failed tests with diagnostic breakdown)
  - **Body**: `{"submission_id": "..."}`
  - **Response**: `{"failure_type": "wrong_answer", "summary": "...", "suspected_cause": "...", "guidance": "..."}`

---

## 4. Learning Evidence & Learning DNA

- `GET /learning/timeline` (Paginated, filters: `event_type`, `since`, `limit`)
  - **Response**: `{"items": [{"id": "...", "event_type": "...", "timestamp": "...", "metadata": {...}}], "total": 42}`
- `GET /learning/dna` (Personal error DNA profile)
  - **Response**: `{"student_id": "...", "patterns": [{"pattern_key": "loop_boundary", "pattern_name": "Off-by-one Loop Boundary", "confidence": 0.85, "occurrence_count": 4, "status": "active", "remediation": "..."}]}`
- `POST /learning/telemetry` (Record editor activity provenance)
  - **Body**: `{"challenge_id": "...", "event": "paste", "paste_length": 120, "timestamp": "..."}`
  - **Response**: `{"status": "recorded"}`

---

## 5. Adaptive Learning Engine

- `GET /adaptive/concepts` (List concepts with prerequisite graph)
  - **Response**: `{"concepts": [{"id": "...", "slug": "loops", "name": "Loops", "prerequisites": ["conditions"]}]}`
- `GET /adaptive/mastery` (Student concept mastery map)
  - **Response**: `{"mastery": [{"concept_id": "...", "concept_name": "...", "score": 0.78, "status": "mastered"}]}`
- `GET /adaptive/gaps` (Deepest prerequisite gaps and targeted recommendations)
  - **Response**: `{"gaps": [{"target_concept": "nested_loops", "root_gap": "loop_boundaries", "reason": "...", "recommended_practice": "..."}]}`
- `GET /adaptive/revisions` (Due and upcoming revisions)
  - **Response**: `{"due": [...], "upcoming": [...]}`
- `POST /adaptive/revisions/{id}/complete` (Record revision attempt and update spaced schedule)
  - **Body**: `{"performance_rating": 4}` (1..5 rating)
  - **Response**: `{"next_due": "...", "interval_days": 6}`

---

## 6. Grounded RAG Tutor

- `POST /tutor/chat` (Ask grounded programming question)
  - **Body**: `{"mode": "learn", "question": "...", "context_submission_id": "...", "course": "cs101"}`
  - **Response**: `{"answer": "...", "citations": [{"chunk_id": "...", "source_title": "...", "snippet": "..."}], "has_sufficient_evidence": true}`
- `GET /tutor/sources` (List available approved learning resources)
- `POST /tutor/ingest` (Teacher/Admin: Ingest document and chunk with code preservation)
  - **Body**: `{"title": "...", "course": "...", "topic": "...", "content": "..."}`
  - **Response**: `{"document_id": "...", "chunk_count": 12}`

---

## 7. Offline Synchronization

- `POST /sync/batch` (Synchronize offline drafts and actions safely)
  - **Body**: `{"actions": [{"idempotency_key": "uuid", "action_type": "save_draft", "payload": {...}, "client_timestamp": "..."}]}`
  - **Response**: `{"results": [{"idempotency_key": "uuid", "status": "applied", "conflict": false}]}`
