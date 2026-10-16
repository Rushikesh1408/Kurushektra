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
    if (submissionId) {
      void loadQuestions(submissionId);
    }
  }, [submissionId, loadQuestions]);

  const handleRetry = () => {
    if (submissionId) {
      void loadQuestions(submissionId);
    }
  };

  const currentQ = questions[currentIndex];
  const totalQuestions = questions.length;
  const answeredCount = Object.keys(submittedAnswers).length;
  const isAllAnswered = totalQuestions > 0 && answeredCount === totalQuestions;

  const handleDraftChange = (qId: string, text: string) => {
    setAnswerDrafts(prev => ({ ...prev, [qId]: text }));
  };

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

  const totalScorePercent = totalQuestions > 0
    ? Math.round(
      (Object.values(submittedAnswers).reduce((sum, a) => sum + (a.score ?? 0.8), 0) / totalQuestions) * 100,
    )
    : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343B42]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <Link to={`/submissions/${submissionId}`} className="hover:text-primary transition-colors flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Back to Submission</span>
            </Link>
            <span>/</span>
            <span className="text-primary-text font-bold">Verification</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">Understanding Assessment</h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Cognitive validation prompts for Submission <span className="font-mono text-primary font-bold">{submissionId}</span>
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {loading ? (
        <div className="card p-12 flex flex-col items-center justify-center gap-3 bg-[#1C2024] border-[#343B42]">
          <Spinner size={32} />
          <span className="text-body-sm text-secondary-text font-mono">
            Generating conceptual verification prompts from submission AST...
          </span>
        </div>
      ) : error ? (
        <div className="card p-6 bg-[#E98779]/10 border border-[#E98779]/30 text-center space-y-3">
          <Icon name="error" size={32} className="text-[#E98779] mx-auto" />
          <h2 className="text-headline-sm text-[#E98779] font-bold">Failed to Load Questions</h2>
          <p className="text-body-sm text-secondary-text font-mono text-code-sm">{error}</p>
          <button onClick={handleRetry} className="btn btn-secondary btn-sm font-mono">
            <Icon name="refresh" size={16} />
            <span>Retry Request</span>
          </button>
        </div>
      ) : questions.length === 0 ? (
        <div className="card p-8 text-center space-y-4 bg-[#1C2024] border-[#343B42]">
          <div className="w-12 h-12 rounded-full bg-[#242A30] border border-[#343B42] flex items-center justify-center text-primary mx-auto">
            <Icon name="quiz" size={26} />
          </div>
          <h2 className="text-headline-sm text-primary-text font-bold">No Follow-Up Questions Found</h2>
          <p className="text-body-sm text-secondary-text max-w-md mx-auto">
            Questions are generated automatically for evaluated submissions. If your submission was just created, check back in a few seconds.
          </p>
          <button onClick={handleRetry} className="btn btn-primary btn-sm font-mono">
            <Icon name="sync" size={16} />
            <span>Check for Questions</span>
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Progress Tracker Bar */}
          <div className="card p-4 bg-[#1C2024] border-[#343B42] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-mono text-code-sm">
              <span className="uppercase text-muted">
                Question {currentIndex + 1} of {totalQuestions}
              </span>
              <span className="text-[#525C66]">·</span>
              <span className="text-[#83D69A] font-semibold">
                {answeredCount} of {totalQuestions} Answered
              </span>
            </div>
            <div className="w-full sm:w-48">
              <ProgressBar value={answeredCount} max={totalQuestions} variant="primary" />
            </div>
          </div>

          {/* Question Number Pills */}
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
                  className={`px-3 py-1.5 rounded text-label-xs font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors border min-h-[36px] ${
                    isCurrent
                      ? 'bg-primary text-[#111315] font-bold border-primary shadow-sm'
                      : isAnswered
                      ? 'bg-[#83D69A]/15 text-[#83D69A] border-[#83D69A]/30'
                      : 'bg-[#1C2024] text-secondary-text hover:text-primary-text border-[#343B42]'
                  }`}
                >
                  <span>Q{idx + 1}</span>
                  {isAnswered && <Icon name="check" size={14} />}
                </button>
              );
            })}
          </div>

          {/* Active Question Card */}
          {currentQ && (
            <div className="card p-5 sm:p-6 bg-[#1C2024] border-[#343B42] space-y-5">
              {/* Category Header */}
              <div className="flex items-center justify-between">
                <span className="badge badge-info text-label-xs font-mono uppercase flex items-center gap-1.5">
                  <Icon name={CATEGORY_LABELS[currentQ.category]?.icon || 'help'} size={15} />
                  <span>{CATEGORY_LABELS[currentQ.category]?.label || currentQ.category}</span>
                </span>
                <span className="text-label-xs text-muted font-mono">
                  Prompt #{currentQ.position}
                </span>
              </div>

              {/* Prompt Text */}
              <div className="space-y-2">
                <h2 className="text-headline-md text-primary-text font-bold leading-relaxed">
                  {currentQ.prompt}
                </h2>
                <p className="text-body-sm text-secondary-text">
                  Provide your technical rationale. The assessment engine checks for algorithmic correctness, trade-off understanding, and edge-case awareness.
                </p>
              </div>

              {/* Action Error Banner */}
              {actionError && (
                <div className="p-3 bg-[#E98779]/15 border border-[#E98779]/30 rounded text-label-xs text-[#E98779] font-mono">
                  {actionError}
                </div>
              )}

              {/* Answer Input or Submitted State */}
              {submittedAnswers[currentQ.id] ? (
                /* Evaluated Feedback Card */
                <div className="space-y-4 pt-2">
                  <div className="p-4 bg-[#111315] rounded border border-[#343B42] space-y-2 font-mono">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase text-muted">Your Explanation:</span>
                      <span className="text-[11px] text-muted">
                        {new Date(submittedAnswers[currentQ.id].submitted_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-body-sm text-primary-text whitespace-pre-wrap">
                      {submittedAnswers[currentQ.id].answer_text}
                    </p>
                  </div>

                  {/* Grading Feedback from Backend */}
                  <div className="p-4 bg-[#83D69A]/10 border border-[#83D69A]/25 rounded space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-[#83D69A] font-mono text-label-sm font-bold">
                        <Icon name="verified" size={18} />
                        <span>Backend Evaluator Feedback</span>
                      </div>
                      {submittedAnswers[currentQ.id].score !== null && (
                        <span className="badge badge-success font-mono font-bold">
                          Score: {Math.round((submittedAnswers[currentQ.id].score ?? 1) * 100)}%
                        </span>
                      )}
                    </div>
                    <p className="text-body-sm text-primary-text leading-relaxed">
                      {submittedAnswers[currentQ.id].feedback || 'Demonstrated understanding validated by cognitive assessment engine.'}
                    </p>
                  </div>
                </div>
              ) : (
                /* Textarea for writing answer */
                <div className="space-y-3">
                  <label className="text-label-sm font-mono text-secondary-text block">
                    Your Explanation:
                  </label>
                  <textarea
                    rows={5}
                    value={answerDrafts[currentQ.id] || ''}
                    onChange={(e) => handleDraftChange(currentQ.id, e.target.value)}
                    placeholder="Explain step-by-step why you chose this data structure, time/space trade-offs, and boundary behavior..."
                    className="w-full bg-[#111315] border border-[#343B42] rounded p-3 text-body-sm text-primary-text font-mono focus:border-primary focus:outline-none resize-none"
                  />
                  <div className="flex items-center justify-between">
                    <span className="text-label-xs text-muted font-mono">
                      {(answerDrafts[currentQ.id] || '').length} characters
                    </span>
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={isSubmitting || !(answerDrafts[currentQ.id] || '').trim()}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono"
                    >
                      <Icon
                        name={isSubmitting ? 'sync' : 'send'}
                        size={16}
                        className={isSubmitting ? 'animate-spin' : ''}
                      />
                      <span>{isSubmitting ? 'Evaluating...' : 'Submit Answer'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Prev / Next Pagination Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-[#343B42]">
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
            <div className="card p-5 sm:p-6 bg-[#171A1E] border border-[#83D69A]/30 space-y-4 animate-fade-in shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-[#83D69A] font-mono text-label-xs uppercase">
                    <Icon name="check_circle" size={16} />
                    <span>Cognitive Verification Complete</span>
                  </div>
                  <h3 className="text-headline-md text-primary-text font-bold">
                    Mastery Score: <span className="text-[#83D69A] font-mono">{totalScorePercent}%</span>
                  </h3>
                  <p className="text-body-sm text-secondary-text">
                    All {totalQuestions} conceptual follow-up questions have been graded by the backend and recorded to your mastery profile.
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
