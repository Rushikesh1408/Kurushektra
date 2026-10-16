import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, ProgressBar, SimulatedDemoLabel } from '../../components/ui';
import { mockSubmissions, mockChallenges } from '../../data/mockData';

interface Question {
  id: string;
  concept: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUESTIONS: Question[] = [
  {
    id: 'q1',
    concept: 'Time Complexity Tradeoff',
    prompt: 'Why does storing elements in a hash map reduce the time complexity from O(n²) to O(n)?',
    options: [
      'Hash maps sort elements automatically upon insertion, enabling binary search in O(log n)',
      'Hash maps provide expected O(1) average lookup time for the complement value, eliminating the nested loop',
      'Hash maps eliminate all duplicate elements and compress memory buffers',
      'Hash maps execute in parallel on multiple GPU threads by default',
    ],
    correctIndex: 1,
    explanation: 'By computing complement = target - num, we can check if the complement has already been seen in average O(1) time instead of scanning the rest of the array with an inner loop.',
  },
  {
    id: 'q2',
    concept: 'Collision & Degradation',
    prompt: 'What happens to the time complexity in the pathological worst-case where all keys hash to the same bucket?',
    options: [
      'Lookup degrades to O(n) because all elements fall into a linked list or linear probing chain',
      'The runtime is completely unaffected because hash functions never produce duplicate outputs',
      'The program immediately raises a MemoryError exception',
      'The complexity becomes O(log n) because buckets use B-Trees',
    ],
    correctIndex: 0,
    explanation: 'When extreme collisions occur, all entries collide into the same bucket. Searching within that bucket degrades to O(n) linear search, making the overall algorithm O(n²).',
  },
  {
    id: 'q3',
    concept: 'Boundary Invariants',
    prompt: 'Why must we record `seen[nums[i]] = i` AFTER checking for the complement, rather than before?',
    options: [
      'Because Python dictionaries do not support updates after creation',
      'To prevent an element from matching with itself when target == 2 * nums[i]',
      'To save memory during the initial iteration',
      'To ensure keys are sorted in ascending order',
    ],
    correctIndex: 1,
    explanation: 'If we put `nums[i]` into the map before checking `target - nums[i]`, then for an input like nums=[3, 4], target=6, the algorithm would match 3 with itself at index 0!',
  },
];

export default function UnderstandingAssessmentPage() {
  const { submissionId } = useParams<{ submissionId: string }>();

  const submission = mockSubmissions.find(s => s.id === submissionId) || mockSubmissions[0];
  const challenge = mockChallenges.find(c => c.id === submission.challengeId) || mockChallenges[0];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [isCompleted, setIsCompleted] = useState(false);

  const currentQ = QUESTIONS[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isCompleted) return;
    setSelectedOption(idx);
    setAnswers(prev => ({ ...prev, [currentIndex]: idx }));
  };

  const handleNext = () => {
    if (currentIndex < QUESTIONS.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(answers[currentIndex + 1] ?? null);
    } else {
      setIsCompleted(true);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
      setSelectedOption(answers[currentIndex - 1] ?? null);
    }
  };

  // Calculate results
  const score = Object.entries(answers).reduce((acc, [qIdx, ansIdx]) => {
    return acc + (QUESTIONS[Number(qIdx)].correctIndex === ansIdx ? 1 : 0);
  }, 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <Link to={`/submissions/${submission.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Back to Submission</span>
            </Link>
            <span>/</span>
            <span>Assessment</span>
          </div>
          <h1 className="text-headline-md text-primary font-bold">Understanding Assessment</h1>
          <p className="text-body-sm text-on-surface-variant">
            Validating cognitive mastery for <span className="text-primary font-semibold">{challenge.title}</span>
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {!isCompleted ? (
        <div className="space-y-6">
          {/* Progress Tracker */}
          <div className="card p-4 bg-surface-container-low border border-outline-variant space-y-2">
            <div className="flex items-center justify-between text-label-xs font-mono">
              <span className="text-primary font-semibold">QUESTION {currentIndex + 1} OF {QUESTIONS.length}</span>
              <span className="text-outline">{Math.round(((currentIndex + 1) / QUESTIONS.length) * 100)}% COMPLETE</span>
            </div>
            <ProgressBar value={currentIndex + 1} max={QUESTIONS.length} variant="primary" />
          </div>

          {/* Question Card */}
          <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-5">
            <div className="flex items-center gap-2">
              <span className="badge badge-neutral text-label-xs font-mono">
                {currentQ.concept}
              </span>
              <span className="text-label-xs text-outline font-mono">· Conceptual Checkpoint</span>
            </div>

            <h2 className="text-headline-sm text-primary font-medium leading-relaxed">
              {currentQ.prompt}
            </h2>

            {/* Multiple Choice Options */}
            <div className="space-y-3 pt-2">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedOption === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-4 rounded-lg text-left transition-all border flex items-start gap-3.5 ${
                      isSelected
                        ? 'bg-surface-container-high border-primary text-primary shadow-sm'
                        : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-outline hover:text-on-surface'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 text-label-xs font-mono ${
                      isSelected ? 'border-primary bg-primary text-on-primary font-bold' : 'border-outline text-outline'
                    }`}>
                      {String.fromCharCode(65 + idx)}
                    </div>
                    <span className="text-body-md leading-relaxed">{opt}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-outline-variant">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="btn btn-ghost btn-sm flex items-center gap-1 font-mono disabled:opacity-30"
              >
                <Icon name="chevron_left" size={16} />
                <span>Previous</span>
              </button>

              <button
                onClick={handleNext}
                disabled={selectedOption === null}
                className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono px-5"
              >
                <span>{currentIndex === QUESTIONS.length - 1 ? 'Finish Assessment' : 'Next Question'}</span>
                <Icon name={currentIndex === QUESTIONS.length - 1 ? 'check' : 'chevron_right'} size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Results View */
        <div className="card p-8 bg-surface-container-low border border-outline-variant space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-3">
              <Icon name="verified" size={36} />
            </div>
            <h2 className="text-headline-lg text-primary font-bold">Understanding Verified!</h2>
            <p className="text-body-md text-on-surface-variant max-w-md mx-auto">
              You correctly answered <span className="text-primary font-bold">{score} of {QUESTIONS.length}</span> questions.
              Your mastery state has been upgraded.
            </p>
          </div>

          {/* Mastery Update Callout */}
          <div className="p-4 bg-surface-container rounded-lg border border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Icon name="workspace_premium" size={24} className="text-primary" />
              <div>
                <p className="text-body-sm font-semibold text-primary">Hash Maps & Direct Addressing</p>
                <p className="text-label-xs text-on-surface-variant">Mastery score updated: 85% → 92% (Demonstrated)</p>
              </div>
            </div>
            <span className="badge badge-success font-mono text-label-xs">DEMONSTRATED</span>
          </div>

          {/* Detailed Question Review */}
          <div className="space-y-4 pt-2">
            <h3 className="text-label-sm font-mono uppercase text-primary font-bold">Explanation Breakdown</h3>
            {QUESTIONS.map((q, idx) => {
              const userAns = answers[idx];
              const isCorrect = userAns === q.correctIndex;
              return (
                <div key={q.id} className="p-4 rounded-lg bg-surface-container-lowest border border-outline-variant space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon name={isCorrect ? 'check_circle' : 'cancel'} size={16} className={isCorrect ? 'text-emerald-400' : 'text-red-400'} />
                    <span className="text-label-xs font-mono uppercase font-semibold text-primary">{q.concept}</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant">{q.prompt}</p>
                  <p className="text-body-sm text-emerald-400 bg-emerald-500/5 p-2.5 rounded border border-emerald-500/10">
                    <span className="font-semibold text-emerald-300">Explanation: </span>
                    {q.explanation}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-4 border-t border-outline-variant">
            <Link to="/mastery" className="btn btn-primary w-full sm:w-auto font-mono flex items-center justify-center gap-2 px-6">
              <Icon name="school" size={16} />
              <span>View Skill Tree & Mastery Path</span>
            </Link>
            <Link to="/challenges" className="btn btn-secondary w-full sm:w-auto font-mono flex items-center justify-center gap-2 px-6">
              <span>Next Challenge</span>
              <Icon name="arrow_forward" size={16} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
