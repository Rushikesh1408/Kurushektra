# Code Arena AI Brain — API Endpoints Reference

All endpoints are prefixed with `/api/v1`. Protected endpoints require standard `Authorization: Bearer <token>` or trusted gateway headers (`X-AI-Brain-User-ID`, `X-AI-Brain-User-Role`).

---

## 1. System & Health

### `GET /api/v1/health`
- **Access**: Public
- **Description**: Returns engine health status, app version, and environment.
- **Response**:
```json
{
  "status": "ok",
  "app_version": "1.0.0",
  "environment": "production",
  "timestamp": "2026-10-17T03:15:00Z"
}
```

### `GET /api/v1/ai/status`
- **Access**: Public
- **Description**: Returns LLM inference connectivity and latency metrics.
- **Response**:
```json
{
  "provider": "gemini",
  "model": "gemini-1.5-pro",
  "is_available": true,
  "latency_ms": 320
}
```

---

## 2. Authentication

### `POST /api/v1/auth/register`
- **Request**:
```json
{
  "email": "student@codearena.edu",
  "password": "SecurePassword123!",
  "display_name": "Jordan Smith"
}
```
- **Response**: `201 Created` with JWT access token.

### `POST /api/v1/auth/login`
- **Request**:
```json
{
  "email": "student@codearena.edu",
  "password": "SecurePassword123!"
}
```

### `GET /api/v1/auth/me`
- **Access**: Authenticated

---

## 3. RAG AI Tutor

### `POST /api/v1/tutor/ask`
- **Access**: Authenticated (`student`, `teacher`, `admin`)
- **Request**:
```json
{
  "question": "Why is the loop condition low <= high in binary search?",
  "topic_id": "topic-bs-02",
  "subject_filter": "Computer Science"
}
```
- **Response**:
```json
{
  "answer": "When the search space contains a single candidate element...",
  "is_grounded": true,
  "sources": [
    {
      "doc_id": "doc-search-02",
      "doc_title": "Binary Search Invariants & Boundary Handling",
      "chunk_index": 3,
      "relevance_score": 0.941
    }
  ],
  "model": "gemini-1.5-pro",
  "latency_seconds": 0.62,
  "request_id": "req-98af-412b",
  "warning": null
}
```

---

## 4. Submissions & Code Execution

### `POST /api/v1/submissions`
- **Access**: Authenticated
- **Request**:
```json
{
  "assignment_id": "assign-two-sum-01",
  "language": "python",
  "source_code": "def two_sum(nums, target): ..."
}
```
- **Response**: `201 Created`
```json
{
  "submission_id": "sub-c419",
  "assignment_id": "assign-two-sum-01",
  "status": "completed",
  "score_fraction": 1.0,
  "earned_points": 100,
  "total_points": 100,
  "tests_passed": 4,
  "tests_total": 4,
  "compilation_passed": true,
  "is_infrastructure_failure": false,
  "feedback_summary": "All test cases passed cleanly.",
  "test_results": [
    {
      "test_case_id": "tc-pub-1",
      "is_public": true,
      "passed": true,
      "actual_output_preview": "[0, 1]",
      "time_seconds": 0.04,
      "points_earned": 25,
      "points_available": 25
    }
  ],
  "error_category": null,
  "hint": null
}
```

### `GET /api/v1/submissions/{id}`
- **Access**: Authenticated (Owner or Teacher/Admin)

---

## 5. Knowledge Management

### `POST /api/v1/knowledge/search`
- **Access**: Authenticated
- **Request**:
```json
{
  "query": "binary search loop invariants",
  "top_k": 5
}
```

### `GET /api/v1/knowledge/documents`
- **Access**: Authenticated

---

## 6. Student Intelligence & Adaptive Policy

### `GET /api/v1/progress/me`
- **Access**: Authenticated
- **Returns**: Student topic mastery levels, confidence intervals, and aggregate progress.

### `GET /api/v1/recommendations/next?topic_id={id}`
- **Access**: Authenticated
- **Returns**: Deterministic adaptive pedagogical intervention (`practice_easier`, `hint_scaffolding`, `concept_review`, `challenge_next`, `error_targeted`).
