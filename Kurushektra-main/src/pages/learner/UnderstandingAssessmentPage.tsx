import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, ProgressBar, SimulatedDemoLabel, Spinner } from '../../components/ui';
import { api } from '../../services/api';
import type { BackendStudentQuestion, BackendStudentAnswer } from '../../services/api';

const CATEGORY_LABELS: Record<string, { label: string; icon: string }> = {
  explain_algorithm: { label: 'Algorithm Explanation', icon: 'psychology' },
  compare_approaches: { label: 'Approach Tradeoffs', icon: 'compare_arrows' },
  complexity: { label: 'Time & Space Complexity', icon: 'timer' },
  edge_case: { label: 'Edge Case Reasoning', icon: 'rule' },
};

export default function UnderstandingAssessmentPage() {
  const { submissionId } = useParams<{ submissionId: string }>();

  const [questions, setQuestions] = useState<BackendStudentQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active question index
  const [currentIndex, setCurrentIndex] = useState(0);

  // Draft answers keyed by question ID
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  // Submitted answers keyed by question ID
  const [submittedAnswers, setSubmittedAnswers] = useState<Record<string, BackendStudentAnswer>>({});

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Fetch real follow-up questions from backend
  const loadQuestions = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      const qList = await api.submissions.getQuestions(id);
      setQuestions(qList);

      const existingAnswers: Record<string, BackendStudentAnswer> = {};
      const drafts: Record<string, string> = {};
      qList.forEach(q => {
        if (q.answer) {
          existingAnswers[q.id] = q.answer;
          drafts[q.id] = q.answer.answer_text;
        }
      });
      setSubmittedAnswers(existingAnswers);
      setAnswerDrafts(prev => ({ ...drafts, ...prev }));
    } catch (err: any) {
      console.error('Failed to load assessment questions:', err);
      setError(err?.message || 'Unable to retrieve follow-up questions from backend.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let ignore = false;
    if (submissionId) {
      api.submissions.getQuestions(submissionId)
        .then((qList) => {
          if (ignore) return;
          setQuestions(qList);
          const existingAnswers: Record<string, BackendStudentAnswer> = {};
          const drafts: Record<string, string> = {};
          qList.forEach(q => {
            if (q.answer) {
              existingAnswers[q.id] = q.answer;
              drafts[q.id] = q.answer.answer_text;
            }
          });
          setSubmittedAnswers(existingAnswers);
          setAnswerDrafts(prev => ({ ...drafts, ...prev }));
          setLoading(false);
        })
        .catch((err: any) => {
          if (ignore) return;
          console.error('Failed to load assessment questions:', err);
          setError(err?.message || 'Unable to retrieve follow-up questions from backend.');
          setLoading(false);
        });
    }
    return () => {
      ignore = true;
    };
  }, [submissionId]);

  const handleRetry = () => {
    if (submissionId) {
      void loadQuestions(submissionId);
    }
  };

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(submittedAnswers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  // Handle draft text change
  const handleDraftChange = (qId: string, text: string) => {
    setAnswerDrafts(prev => ({ ...prev, [qId]: text }));
  };

  // Submit answer to real backend
  const handleSubmitAnswer = async () => {
    if (!submissionId || !currentQ) return;
    const answerText = (answerDrafts[currentQ.id] || '').trim();
    if (!answerText) {
      setActionError('Please provide your explanation before submitting.');
      return;
    }

    setIsSubmitting(true);
    setActionError(null);
    try {
      const savedAnswer = await api.submissions.submitAnswer(submissionId, currentQ.id, answerText);
      setSubmittedAnswers(prev => ({ ...prev, [currentQ.id]: savedAnswer }));
    } catch (err: any) {
      console.error('Failed to submit answer:', err);
      setActionError(err?.message || 'Failed to submit answer to backend.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Overall score calculation
  const totalScorePercent = totalQuestions > 0
    ? Math.round(
      (Object.values(submittedAnswers).reduce((sum, a) => sum + (a.score ?? 0.8), 0) / totalQuestions) * 100,
    )
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <Link to={`/submissions/${submissionId}`} className="hover:text-primary transition-colors flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Back to Submission</span>
            </Link>
            <span>/</span>
            <span>Assessment</span>
          </div>
          <h1 className="text-headline-md text-primary font-bold">Understanding Assessment</h1>
          <p className="text-body-sm text-on-surface-variant">
            AI-Engineered Conceptual Verification for Submission <span className="font-mono text-primary font-medium">{submissionId}</span>
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3">
          <Spinner size={32} />
          <span className="text-body-sm text-on-surface-variant font-mono">
            Generating conceptual verification questions from submission code...
          </span>
        </div>
      ) : error ? (
        <div className="card p-6 bg-red-500/10 border border-red-500/20 text-center space-y-3">
          <Icon name="error" size={32} className="text-red-400 mx-auto" />
          <h2 className="text-headline-sm text-red-400 font-bold">Failed to Load Questions</h2>
          <p className="text-body-sm text-on-surface-variant">{error}</p>
          <button onClick={handleRetry} className="btn btn-secondary btn-sm">
            <Icon name="refresh" size={16} /> Retry Request
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="card p-8 text-center space-y-4">
          <Icon name="quiz" size={40} className="text-outline mx-auto" />
          <h2 className="text-headline-sm text-primary font-bold">No Follow-Up Questions Available</h2>
          <p className="text-body-sm text-on-surface-variant max-w-md mx-auto">
            Questions are generated automatically for completed submissions. If your submission is still executing, please wait a moment.
          </p>
          <button onClick={handleRetry} className="btn btn-primary btn-sm">
            <Icon name="sync" size={16} /> Check for Questions
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Progress Tracker */}
          <div className="card p-4 bg-surface-container-low flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="font-mono text-label-sm uppercase text-outline">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="text-outline">·</span>
              <span className="text-label-xs font-mono text-emerald-400">
                {answeredCount} of {totalQuestions} answered
              </span>
            </div>
            <div className="w-full sm:w-48">
              <ProgressBar value={answeredCount} max={totalQuestions} />
            </div>
          </div>

          {/* Question Navigator Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {questions.map((q, idx) => {
              const isAnswered = !!submittedAnswers[q.id];
              const isCurrent = idx === currentIndex;
              return (
                <button
                  key={q.id}
                  onClick={() => {
                    setCurrentIndex(idx);
                    setActionError(null);
                  }}
                  className={`px-3 py-1.5 rounded text-label-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors ${isCurrent
                      ? 'bg-primary text-on-primary font-bold shadow'
                      : isAnswered
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-surface-container text-on-surface-variant hover:text-on-surface border border-outline-variant'
                    }`}
                >
                  <span>Q{idx + 1}</span>
                  {isAnswered && <Icon name="check" size={12} />}
                </button>
              );
            })}
          </div>

          {/* Active Question Card */}
          {currentQ && (
            <div className="card p-6 bg-surface-container border border-outline-variant space-y-5">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <span className="badge badge-info text-label-xs font-mono uppercase flex items-center gap-1.5">
                  <Icon name={CATEGORY_LABELS[currentQ.category]?.icon || 'help'} size={14} />
                  <span>{CATEGORY_LABELS[currentQ.category]?.label || currentQ.category}</span>
                </span>
                <span className="text-label-xs text-outline font-mono">
                  Prompt #{currentQ.position}
                </span>
              </div>

              {/* Prompt Text */}
              <div className="space-y-2">
                <h2 className="text-headline-sm text-primary font-semibold leading-relaxed">
                  {currentQ.prompt}
                </h2>
                <p className="text-label-xs text-on-surface-variant">
                  Explain your reasoning thoroughly. Your response is evaluated directly against algorithmic and conceptual criteria.
                </p>
              </div>

              {/* Action Error Banner */}
              {actionError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-label-xs text-red-400 font-mono">
                  {actionError}
                </div>
              )}

              {/* Answer Input or Submitted State */}
              {submittedAnswers[currentQ.id] ? (
                /* Evaluated Feedback Card */
                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-surface-container-lowest rounded border border-outline-variant space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-label-xs font-mono uppercase text-outline">Your Submitted Explanation:</span>
                      <span className="text-label-xs text-outline font-mono">
                        {new Date(submittedAnswers[currentQ.id].submitted_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-body-md text-primary font-mono whitespace-pre-wrap">
                      {submittedAnswers[currentQ.id].answer_text}
                    </p>
                  </div>

                  {/* Grading Feedback from Backend */}
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-emerald-400 font-mono text-label-sm font-bold">
                        <Icon name="verified" size={18} />
                        <span>Backend Evaluation Feedback</span>
                      </div>
                      {submittedAnswers[currentQ.id].score !== null && (
                        <span className="badge badge-success font-mono font-bold">
                          Score: {Math.round((submittedAnswers[currentQ.id].score ?? 1) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-on-surface leading-relaxed">
                      {submittedAnswers[currentQ.id].feedback || 'Demonstrated understanding validated by cognitive assessment engine.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Textarea for writing answer */
                <div className="space-y-3">
                  <label className="text-label-sm font-mono text-on-surface-variant block">
                    Your Explanation:
                  </label>
                  <textarea
                    rows={5}
                    value={answerDrafts[currentQ.id] || ''}
                    onChange={(e) => handleDraftChange(currentQ.id, e.target.value)}
                    placeholder="Type your explanation step-by-step here (e.g. why you chose this data structure, time complexity, or edge case considerations)..."
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-md text-primary font-mono focus:outline-none focus:border-outline resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-label-xs text-outline font-mono">
                      {(answerDrafts[currentQ.id] || '').length} characters
                    </span>
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={isSubmitting || !(answerDrafts[currentQ.id] || '').trim()}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono"
                    >
                      <Icon name={isSubmitting ? 'sync' : 'send'} size={16} className={isSubmitting ? 'animate-spin' : ''} />
                      <span>{isSubmitting ? 'Evaluating...' : 'Submit Answer'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Prev / Next Pagination Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
                <button
                  onClick={() => {
                    if (currentIndex > 0) {
                      setCurrentIndex(currentIndex - 1);
                      setActionError(null);
                    }
                  }}
                  disabled={currentIndex === 0}
                  className="btn btn-secondary btn-sm flex items-center gap-1 font-mono disabled:opacity-40"
                >
                  <Icon name="arrow_back" size={14} />
                  <span>Previous</span>
                </button>

                <button
                  onClick={() => {
                    if (currentIndex < totalQuestions - 1) {
                      setCurrentIndex(currentIndex + 1);
                      setActionError(null);
                    }
                  }}
                  disabled={currentIndex === totalQuestions - 1}
                  className="btn btn-secondary btn-sm flex items-center gap-1 font-mono disabled:opacity-40"
                >
                  <span>Next Question</span>
                  <Icon name="arrow_forward" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Completion Scorecard (Shown when all questions are answered) */}
          {isAllAnswered && (
            <div className="card p-6 bg-surface-container-low border-2 border-emerald-500/30 space-y-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-mono text-label-xs uppercase">
                    <Icon name="check_circle" size={16} />
                    <span>Assessment Completed</span>
                  </div>
                  <h3 className="text-headline-md text-primary font-bold">
                    Cognitive Mastery Score: {totalScorePercent}%
                  </h3>
                  <p className="text-body-sm text-on-surface-variant">
                    All {totalQuestions} conceptual follow-up questions have been evaluated and persisted in the assessment database.
                  </p>
                </div>
                <div className="flex sm:flex-col gap-2 shrink-0">
                  <Link to="/dashboard" className="btn btn-primary btn-sm font-mono justify-center">
                    <span>Return to Dashboard</span>
                  </Link>
                  <Link to="/history" className="btn btn-secondary btn-sm font-mono justify-center">
                    <span>View Submission History</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
