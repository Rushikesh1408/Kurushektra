import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { mockPractice, mockGaps } from '../../data/mockData';

export default function PracticeActivityPage() {
  const { activityId } = useParams<{ activityId: string }>();

  const activity = mockPractice.find(p => p.id === activityId) || mockPractice[0];
  const relatedGap = mockGaps.find(g => g.id === activity.gapId) || mockGaps[0];

  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selectedOption === activity.correctAnswer;

  const handleSubmit = () => {
    if (!selectedOption) return;
    setSubmitted(true);
  };

  const handleReset = () => {
    setSelectedOption(null);
    setSubmitted(false);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <Link to={`/learn/gap/${relatedGap.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Back to Learning Gap</span>
            </Link>
            <span>/</span>
            <span>Practice & Verification</span>
          </div>
          <h1 className="text-headline-md text-primary font-bold">{activity.concept}</h1>
          <p className="text-body-sm text-on-surface-variant">
            Targeted drill · Type: <span className="font-mono text-primary uppercase">{activity.type.replace('_', ' ')}</span>
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Main Exercise Card */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-6">
        <div>
          <span className="text-label-xs font-mono uppercase text-outline block mb-1">PRACTICE PROMPT</span>
          <h2 className="text-headline-sm text-primary font-medium leading-relaxed">
            {activity.prompt}
          </h2>
        </div>

        {/* Options */}
        {activity.options && (
          <div className="space-y-3">
            {activity.options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              let btnClass = 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface';

              if (submitted) {
                if (opt === activity.correctAnswer) {
                  btnClass = 'bg-emerald-500/10 border-emerald-500 text-emerald-300 font-semibold';
                } else if (isSelected && !isCorrect) {
                  btnClass = 'bg-red-500/10 border-red-500 text-red-300 font-semibold';
                }
              } else if (isSelected) {
                btnClass = 'bg-surface-container-high border-primary text-primary';
              }

              return (
                <button
                  key={i}
                  disabled={submitted}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-4 rounded-lg text-left transition-all border flex items-center justify-between font-mono text-code-sm ${btnClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border border-outline-variant flex items-center justify-center text-label-xs shrink-0">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span>{opt}</span>
                  </div>
                  {submitted && opt === activity.correctAnswer && (
                    <Icon name="check_circle" size={18} className="text-emerald-400 shrink-0" />
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <Icon name="cancel" size={18} className="text-red-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        {!submitted ? (
          <div className="flex justify-end pt-3 border-t border-outline-variant">
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className="btn btn-primary px-6 font-mono text-label-sm uppercase tracking-wider disabled:opacity-30"
            >
              Verify Solution
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t border-outline-variant">
            {/* Feedback alert */}
            <div className={`p-4 rounded-lg border ${
              isCorrect
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                : 'bg-red-500/10 border-red-500/20 text-red-300'
            }`}>
              <div className="flex items-center gap-2 font-bold font-mono text-label-sm uppercase mb-1">
                <Icon name={isCorrect ? 'check_circle' : 'cancel'} size={18} />
                <span>{isCorrect ? 'Verification Passed!' : 'Verification Failed'}</span>
              </div>
              <p className="text-body-sm text-on-surface-variant">
                {activity.explanation}
              </p>
            </div>

            {/* Mastery Update notification */}
            {isCorrect && (
              <div className="p-4 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon name="military_tech" size={24} className="text-emerald-400" />
                  <div>
                    <p className="text-body-sm font-semibold text-primary">Mastery Invariant Verified</p>
                    <p className="text-label-xs text-on-surface-variant">Remediation completed. Invariant gap marked as resolved.</p>
                  </div>
                </div>
                <span className="badge badge-success font-mono text-label-xs">RESOLVED</span>
              </div>
            )}

            {/* Next Steps Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <button onClick={handleReset} className="btn btn-ghost btn-sm font-mono">
                Try Exercise Again
              </button>
              <div className="flex items-center gap-3">
                <Link to="/mastery" className="btn btn-secondary btn-sm font-mono">
                  Mastery Overview
                </Link>
                <Link to="/challenges" className="btn btn-primary btn-sm font-mono">
                  Apply to Challenges
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
