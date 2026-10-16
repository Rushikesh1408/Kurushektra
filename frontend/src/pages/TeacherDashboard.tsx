import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import {
  api,
  type AnalysisReport,
  type ChallengeListItem,
  type Page,
  type SubmissionListItem,
  type SubmissionReviewOut,
  type TeacherQuestion,
  type TestResult,
} from "../lib/api";
import { useAuth } from "../lib/auth";

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<ChallengeListItem[]>([]);
  const [selectedChallenge, setSelectedChallenge] = useState<ChallengeListItem | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionListItem[]>([]);
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [review, setReview] = useState<SubmissionReviewOut | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [questions, setQuestions] = useState<TeacherQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load challenges created by or accessible to teacher
  useEffect(() => {
    api<Page<ChallengeListItem>>("/challenges?page=1&page_size=50")
      .then((data) => {
        setChallenges(data.items);
        if (data.items.length > 0 && !selectedChallenge) {
          setSelectedChallenge(data.items[0]);
        }
      })
      .catch((e) => setError(e.message));
  }, []);

  // Load all student submissions for selected challenge
  useEffect(() => {
    if (!selectedChallenge) return;
    setLoading(true);
    setSelectedSubId(null);
    setReview(null);
    setReport(null);
    setQuestions([]);
    api<Page<SubmissionListItem>>(
      `/challenges/${selectedChallenge.id}/submissions?all_students=true&page_size=50`
    )
      .then((data) => {
        setSubmissions(data.items);
        if (data.items.length > 0) {
          setSelectedSubId(data.items[0].id);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedChallenge]);

  // Load submission details, questions review, and analysis report
  useEffect(() => {
    if (!selectedSubId) return;
    setSubLoading(true);
    Promise.allSettled([
      api<SubmissionReviewOut>(`/submissions/${selectedSubId}/review`),
      api<AnalysisReport>(`/reports/${selectedSubId}`),
      api<TeacherQuestion[]>(`/submissions/${selectedSubId}/questions/review`),
    ])
      .then(([revRes, repRes, qRes]) => {
        if (revRes.status === "fulfilled") setReview(revRes.value);
        else setReview(null);

        if (repRes.status === "fulfilled") setReport(repRes.value);
        else setReport(null);

        if (qRes.status === "fulfilled") setQuestions(qRes.value);
        else setQuestions([]);
      })
      .finally(() => setSubLoading(false));
  }, [selectedSubId]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Teacher Assessment Dashboard</h1>
            <Badge tone="accent">{user?.role?.toUpperCase() ?? "TEACHER"}</Badge>
          </div>
          <p className="text-sm text-muted">
            Review student submissions, algorithmic follow-up questions, grading rubrics, and similarity reports.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/challenges/new"
            className="inline-flex h-9 items-center rounded-control bg-accent px-3 text-sm font-medium text-white hover:brightness-110"
          >
            Create Challenge
          </Link>
        </div>
      </div>

      {error && (
        <div role="alert" className="mt-4 rounded-control border border-bad/50 bg-bad/10 p-3 text-sm text-bad">
          {error}
        </div>
      )}

      {/* Challenge selector bar */}
      <div className="mt-6 flex flex-wrap gap-2">
        {challenges.map((c) => {
          const active = selectedChallenge?.id === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setSelectedChallenge(c)}
              className={`rounded-control px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent text-white shadow-sm"
                  : "border border-line bg-base text-muted hover:border-accent hover:text-fg"
              }`}
            >
              {c.title}
            </button>
          );
        })}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Submissions List */}
        <div className="lg:col-span-4">
          <Card className="p-4">
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <h2 className="font-semibold text-sm">Student Submissions</h2>
              <span className="text-xs text-muted">{submissions.length} total</span>
            </div>

            {loading ? (
              <p className="py-8 text-center text-sm text-muted">Loading submissions…</p>
            ) : submissions.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted">No student submissions for this challenge yet.</p>
            ) : (
              <ul className="mt-3 space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {submissions.map((sub) => {
                  const active = selectedSubId === sub.id;
                  const passedAll = sub.status === "completed" && sub.passed === sub.total;
                  return (
                    <li key={sub.id}>
                      <button
                        onClick={() => setSelectedSubId(sub.id)}
                        className={`w-full rounded-control border p-3 text-left transition-colors ${
                          active
                            ? "border-accent bg-accent/10"
                            : "border-line bg-base hover:border-accent/50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">
                            {sub.student_name || "Demo Student"}
                          </span>
                          <Badge tone={passedAll ? "ok" : sub.status === "completed" ? "warn" : "bad"}>
                            {sub.status === "completed" ? `${sub.passed}/${sub.total}` : sub.status}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted">
                          <span>{sub.language}</span>
                          <span>{new Date(sub.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>

        {/* Selected Submission Assessment Evidence */}
        <div className="space-y-6 lg:col-span-8">
          {subLoading ? (
            <Card className="p-12 text-center text-muted">Loading submission details…</Card>
          ) : !review ? (
            <Card className="p-12 text-center text-muted">Select a submission from the list to inspect evaluation evidence.</Card>
          ) : (
            <>
              {/* Header card with student details */}
              <Card className="p-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                  <div>
                    <h2 className="text-lg font-semibold">{review.student_name}</h2>
                    <p className="text-xs text-muted">
                      Submission ID: <code className="font-mono">{review.id}</code> · Language: {review.language} · Date: {new Date(review.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={review.passed === review.total ? "ok" : "warn"}>
                      Score: {review.passed}/{review.total} passed ({Math.round(review.correctness_ratio * 100)}%)
                    </Badge>
                  </div>
                </div>

                {review.compile_error && (
                  <div className="mt-3 rounded border border-bad/50 bg-bad/10 p-2 font-mono text-xs text-bad">
                    {review.compile_error}
                  </div>
                )}

                {/* Source Code */}
                <div className="mt-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">Submitted Source Code</h3>
                  <pre className="max-h-56 overflow-auto rounded-control border border-line bg-raised/70 p-3 font-mono text-xs leading-relaxed">
                    {review.source_code}
                  </pre>
                </div>
              </Card>

              {/* Follow-up Questions and Student Understanding (Teacher Review) */}
              <Card className="p-5">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <div>
                    <h3 className="font-semibold text-base">Algorithmic Follow-Up Questions & Student Reasoning</h3>
                    <p className="text-xs text-muted">
                      Review student answers alongside the teacher-only grading rubric.
                    </p>
                  </div>
                  <Badge tone="accent">{questions.length} Questions</Badge>
                </div>

                {questions.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted">
                    No follow-up questions generated for this submission yet.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-4">
                    {questions.map((q, idx) => (
                      <li key={q.id} className="rounded-control border border-line p-4 space-y-3 bg-base">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm">
                            Question {idx + 1}: {q.category.replace("_", " ").toUpperCase()}
                          </span>
                          <span className="text-xs text-muted">Source: {q.source}</span>
                        </div>
                        <p className="text-sm font-medium">{q.prompt}</p>

                        {/* Teacher-only Expected Points / Grading Rubric */}
                        {q.expected_points && (
                          <div className="rounded border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-500 dark:text-amber-400">
                            <span className="font-semibold uppercase tracking-wide">Teacher Grading Guide / Expected Points:</span>
                            <pre className="mt-1 whitespace-pre-wrap font-sans text-xs">
                              {JSON.stringify(q.expected_points, null, 2)}
                            </pre>
                          </div>
                        )}

                        {/* Student Answer & Assessment Status */}
                        <div className="rounded border border-line bg-raised/50 p-3 text-sm">
                          <span className="text-xs font-semibold uppercase tracking-wide text-muted">Student Response:</span>
                          <p className="mt-1 whitespace-pre-wrap">
                            {q.answer?.answer_text ? q.answer.answer_text : <span className="italic text-muted">No answer submitted yet.</span>}
                          </p>

                          {q.answer && (
                            <div className="mt-2 flex flex-wrap items-center gap-3 border-t border-line/60 pt-2 text-xs">
                              {q.answer.score !== null && (
                                <span className="font-semibold text-ok">
                                  Assessment Score: {Math.round(q.answer.score * 100)}%
                                </span>
                              )}
                              {q.answer.feedback && (
                                <span className="text-muted">
                                  Feedback: {q.answer.feedback}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>

              {/* Static Analysis & Plagiarism / Similarity Evidence */}
              {report && (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Static Findings */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm">Static Code Analysis</h3>
                    <p className="text-xs text-muted mb-3">Code advisor and structural quality checks.</p>
                    {report.findings.length === 0 ? (
                      <p className="text-xs text-muted">No code analysis findings reported.</p>
                    ) : (
                      <ul className="space-y-2">
                        {report.findings.map((f) => (
                          <li key={f.id} className="rounded border border-line p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <Badge tone={f.severity === "error" ? "bad" : f.severity === "warning" ? "warn" : "neutral"}>
                                {f.severity.toUpperCase()}
                              </Badge>
                              <span className="text-muted">{f.category}</span>
                            </div>
                            <p>{f.message}</p>
                            {f.line_start && (
                              <p className="text-muted">Lines: {f.line_start}–{f.line_end}</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>

                  {/* Similarity Comparisons */}
                  <Card className="p-4">
                    <h3 className="font-semibold text-sm">Plagiarism & Peer Similarity</h3>
                    <p className="text-xs text-muted mb-3">jscpd structural token comparisons.</p>
                    {report.similarities.length === 0 ? (
                      <p className="text-xs text-muted">No high similarity pairs detected with peer submissions.</p>
                    ) : (
                      <ul className="space-y-2">
                        {report.similarities.map((s) => (
                          <li key={s.id} className="rounded border border-line p-2 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">Compared to: {s.other_student_name}</span>
                              <Badge tone={s.score > 0.7 ? "bad" : s.score > 0.4 ? "warn" : "ok"}>
                                {Math.round(s.score * 100)}% match
                              </Badge>
                            </div>
                            <p className="text-muted">Method: {s.method} · Boilerplate discounted: {s.boilerplate_discounted ? "Yes" : "No"}</p>
                            {s.regions.length > 0 && (
                              <p className="text-muted">{s.regions.length} clone region(s) detected.</p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                </div>
              )}

              {/* Complete Test Case Breakdown */}
              <Card className="p-4">
                <h3 className="font-semibold text-sm">Full Test Execution Breakdown (Sample + Hidden)</h3>
                <p className="text-xs text-muted mb-3">Visible only to faculty and authorized reviewers.</p>
                <div className="space-y-2">
                  {review.results.map((res: TestResult, i: number) => (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between rounded border border-line p-3 text-xs gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge tone={res.status === "accepted" ? "ok" : "bad"}>{res.status.toUpperCase()}</Badge>
                        <span className="font-medium">{res.label}</span>
                        {res.is_hidden && <Badge tone="neutral">Hidden Test</Badge>}
                      </div>
                      <div className="flex items-center gap-4 text-muted">
                        {res.runtime_ms !== null && <span>{res.runtime_ms} ms</span>}
                        {res.memory_kb !== null && <span>{Math.round(res.memory_kb / 1024)} MB</span>}
                        {res.output_excerpt && <span className="font-mono">Output: {res.output_excerpt}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
