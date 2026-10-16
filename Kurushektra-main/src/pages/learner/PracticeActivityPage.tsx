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
    <div className="max-w-3xl mx-auto space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343B42]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <Link to={`/learn/gap/${relatedGap.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Back to Remediation</span>
            </Link>
            <span>/</span>
            <span className="text-primary-text font-bold">Targeted Verification Drill</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">{activity.concept}</h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Targeted drill · Type: <span className="font-mono text-primary font-bold uppercase">{activity.type.replace('_', ' ')}</span>
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Main Exercise Card */}
      <div className="card p-5 sm:p-6 bg-[#1C2024] border-[#343B42] space-y-6">
        <div>
          <span className="text-label-xs font-mono uppercase text-muted block mb-1">PRACTICE PROMPT</span>
          <h2 className="text-headline-md font-bold text-primary-text leading-relaxed">
            {activity.prompt}
          </h2>
        </div>

        {/* Options */}
        {activity.options && (
          <div className="space-y-3">
            {activity.options.map((opt, i) => {
              const isSelected = selectedOption === opt;
              let btnClass = 'bg-[#171A1E] border-[#343B42] text-secondary-text hover:border-[#525C66] hover:text-primary-text';

              if (submitted) {
                if (opt === activity.correctAnswer) {
                  btnClass = 'bg-[#83D69A]/15 border-[#83D69A] text-[#83D69A] font-semibold';
                } else if (isSelected && !isCorrect) {
                  btnClass = 'bg-[#E98779]/15 border-[#E98779] text-[#E98779] font-semibold';
                }
              } else if (isSelected) {
                btnClass = 'bg-primary/10 border-primary text-primary font-semibold shadow-sm';
              }

              return (
                <button
                  key={i}
                  disabled={submitted}
                  onClick={() => setSelectedOption(opt)}
                  className={`w-full p-4 rounded-md text-left transition-all border flex items-center justify-between font-mono text-code-sm min-h-[48px] ${btnClass}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border border-[#343B42] bg-[#111315] flex items-center justify-center text-label-xs shrink-0 font-bold">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="leading-relaxed">{opt}</span>
                  </div>
                  {submitted && opt === activity.correctAnswer && (
                    <Icon name="check_circle" size={18} className="text-[#83D69A] shrink-0" />
                  )}
                  {submitted && isSelected && !isCorrect && (
                    <Icon name="cancel" size={18} className="text-[#E98779] shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Action Button */}
        {!submitted ? (
          <div className="flex justify-end pt-3 border-t border-[#343B42]">
            <button
              onClick={handleSubmit}
              disabled={!selectedOption}
              className="btn btn-primary px-6 font-mono text-label-sm uppercase tracking-wider disabled:opacity-30"
            >
              Verify Solution
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-4 border-t border-[#343B42]">
            {/* Feedback alert */}
            <div className={`p-4 rounded-md border ${
              isCorrect
                ? 'bg-[#83D69A]/10 border-[#83D69A]/30 text-primary-text'
                : 'bg-[#E98779]/10 border-[#E98779]/30 text-primary-text'
            }`}>
              <div className="flex items-center gap-2 font-bold font-mono text-label-sm uppercase mb-1">
                <Icon
                  name={isCorrect ? 'check_circle' : 'cancel'}
                  size={18}
                  className={isCorrect ? 'text-[#83D69A]' : 'text-[#E98779]'}
                />
                <span className={isCorrect ? 'text-[#83D69A]' : 'text-[#E98779]'}>
                  {isCorrect ? 'Verification Passed!' : 'Verification Failed'}
                </span>
              </div>
              <p className="text-body-sm text-secondary-text leading-relaxed mt-1">
                {activity.explanation}
              </p>
            </div>

            {/* Mastery Update notification */}
            {isCorrect && (
              <div className="p-4 bg-[#171A1E] rounded-md border border-[#343B42] flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-[#242A30] border border-[#343B42] flex items-center justify-center text-[#83D69A]">
                    <Icon name="military_tech" size={24} />
                  </div>
                  <div>
                    <p className="text-body-sm font-semibold text-primary-text">Cognitive Invariant Cleared</p>
                    <p className="text-label-xs text-muted font-mono">Concept gap marked as resolved in your mastery tree.</p>
                  </div>
                </div>
                <span className="badge badge-success font-mono text-label-xs">RESOLVED</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleReset}
                className="btn btn-ghost btn-sm font-mono text-secondary-text"
              >
                <Icon name="refresh" size={14} />
                <span>Retry Drill</span>
              </button>

              <Link
                to="/mastery"
                className="btn btn-primary btn-sm font-mono"
              >
                <span>View Updated Mastery</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
