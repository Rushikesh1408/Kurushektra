import { useCallback, useEffect, useState } from "react";
import {
  api,
  ApiError,
  type StudentAnswer,
  type StudentQuestion,
} from "../../lib/api";
import { useToast } from "../Toast";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

const categoryLabels: Record<string, string> = {
  explain_algorithm: "Explain the algorithm",
  complexity: "Complexity",
  explain_code: "Explain the code",
  modify_code: "Modify the code",
  edge_case: "Edge case",
  debug: "Debug",
  compare_approaches: "Compare approaches",
  failing_test: "Failing test",
  refactor: "Refactor",
};

/**
 * Student-facing follow-up questions for one submission.
 *
 * The API returns only `StudentQuestion` (no `expected_points`), so the grading guide cannot leak
 * here even by accident. Each question shows the student's saved answer and lets them submit or
 * replace it. States handled: loading, empty, error, saved, and save-in-flight.
 */
export function FollowUpQuestions({ submissionId }: { submissionId: string }) {
  const toast = useToast();
  const [questions, setQuestions] = useState<StudentQuestion[] | null>(null);
  const [answers, setAnswers] = useState<Record<string, StudentAnswer>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    setQuestions(null);
    try {
      const qs = await api<StudentQuestion[]>(
        `/submissions/${submissionId}/questions`,
      );
      // Guard against a malformed/error payload: treat anything that is not an array as a failure
      // rather than crashing the workspace.
      if (!Array.isArray(qs)) {
        setLoadError("Couldn't load the follow-up questions.");
        return;
      }
      setQuestions(qs);
      const initAnswers: Record<string, StudentAnswer> = {};
      const initDrafts: Record<string, string> = {};
      for (const q of qs) {
        if (q.answer) {
          initAnswers[q.id] = q.answer;
          initDrafts[q.id] = q.answer.answer_text;
        } else {
          initDrafts[q.id] = "";
        }
      }
      setAnswers((prev) => ({ ...initAnswers, ...prev }));
      setDrafts((d) => ({ ...initDrafts, ...d }));
    } catch (e) {
      setLoadError(
        e instanceof ApiError && e.status === 404
          ? "These questions are not available for your account."
          : "Couldn't load the follow-up questions.",
      );
    }
  }, [submissionId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function submit(questionId: string) {
    const text = (drafts[questionId] ?? "").trim();
    if (!text) {
      toast("Write an answer before submitting.", "bad");
      return;
    }
    setSaving(questionId);
    try {
      const saved = await api<StudentAnswer>(
        `/submissions/${submissionId}/questions/${questionId}/answers`,
        {
          method: "POST",
          body: JSON.stringify({ answer_text: text }),
        },
      );
      setAnswers((a) => ({ ...a, [questionId]: saved }));
      toast("Answer saved.", "ok");
    } catch (e) {
      toast(
        e instanceof ApiError ? e.message : "Couldn't save your answer.",
        "bad",
      );
    } finally {
      setSaving(null);
    }
  }

  if (questions === null && loadError === null) {
    return (
      <Card className="p-4 text-sm text-muted" role="status">
        Loading follow-up questions…
      </Card>
    );
  }
  if (loadError) {
    return (
      <Card className="space-y-2 border-bad/40 p-4 text-sm" role="alert">
        <p>{loadError}</p>
        <Button variant="secondary" size="sm" onClick={() => void load()}>
          Try again
        </Button>
      </Card>
    );
  }
  if (questions && questions.length === 0) {
    return (
      <Card className="p-4 text-sm text-muted">
        No follow-up questions have been generated for this submission yet.
      </Card>
    );
  }

  return (
    <Card className="space-y-4 p-4 text-sm">
      <div>
        <p className="font-medium">Follow-up questions</p>
        <p className="text-xs text-muted">
          Answer in your own words. Your teacher may review these; they are not
          shown the same way.
        </p>
      </div>
      <ul className="space-y-4">
        {questions!.map((q) => {
          const saved = answers[q.id];
          const busy = saving === q.id;
          return (
            <li
              key={q.id}
              className="space-y-2 rounded-control border border-line p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="neutral">
                  {categoryLabels[q.category] ?? q.category}
                </Badge>
                {saved && <Badge tone="ok">Saved</Badge>}
              </div>
              <p>{q.prompt}</p>
              <label className="block">
                <span className="sr-only">
                  Your answer to question {q.position + 1}
                </span>
                <textarea
                  rows={3}
                  value={drafts[q.id] ?? ""}
                  onChange={(e) =>
                    setDrafts((d) => ({ ...d, [q.id]: e.target.value }))
                  }
                  disabled={busy}
                  className="w-full rounded-control border border-line bg-base p-2 text-sm"
                  placeholder={
                    saved ? "Replace your saved answer" : "Type your answer"
                  }
                />
              </label>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() => void submit(q.id)}
                >
                  {busy
                    ? "Saving…"
                    : saved
                      ? "Replace answer"
                      : "Submit answer"}
                </Button>
                {saved && (
                  <span className="text-xs text-muted" aria-live="polite">
                    Saved {new Date(saved.submitted_at).toLocaleString()}
                  </span>
                )}
                {saved?.score !== null && saved?.score !== undefined && (
                  <span className="rounded bg-ok/10 px-2 py-0.5 text-xs font-semibold text-ok">
                    Score: {Math.round(saved.score * 100)}%
                  </span>
                )}
              </div>
              {saved?.feedback && (
                <div className="rounded-control border border-line bg-base/50 p-2 text-xs text-muted">
                  <p className="font-semibold text-fg">Evaluation Feedback:</p>
                  <p>{saved.feedback}</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
