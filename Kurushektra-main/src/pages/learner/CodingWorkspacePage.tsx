import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Icon, DifficultyBadge, SimulatedDemoLabel } from '../../components/ui';
import { mockChallenges, mockSubmissions } from '../../data/mockData';

type WorkspaceTab = 'problem' | 'code' | 'output' | 'feedback';

export default function CodingWorkspacePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const challenge = mockChallenges.find(c => c.id === challengeId || c.slug === challengeId) || mockChallenges[0];

  const [language, setLanguage] = useState<'python' | 'javascript' | 'java'>('python');
  const [code, setCode] = useState(challenge.starterCode[language] || '');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('code');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<'tests' | 'ast' | 'console'>('tests');

  // Execution result state
  const [hasRun, setHasRun] = useState(false);
  const [testResults] = useState([
    { id: 1, name: 'Case 1: Basic Target', input: 'nums = [2,7,11,15], target = 9', expected: '[0, 1]', actual: '[0, 1]', passed: true, runtime: '12ms' },
    { id: 2, name: 'Case 2: Duplicate Values', input: 'nums = [3,2,4], target = 6', expected: '[1, 2]', actual: '[1, 2]', passed: true, runtime: '14ms' },
    { id: 3, name: 'Case 3: Equal Elements', input: 'nums = [3,3], target = 6', expected: '[0, 1]', actual: '[0, 1]', passed: true, runtime: '11ms' },
  ]);

  const handleLanguageChange = (newLang: 'python' | 'javascript' | 'java') => {
    setLanguage(newLang);
    if (challenge.starterCode[newLang]) {
      setCode(challenge.starterCode[newLang]);
    }
  };

  const handleRunCode = () => {
    setIsRunning(true);
    setTimeout(() => {
      setIsRunning(false);
      setHasRun(true);
      setActiveTab('output');
    }, 800);
  };

  const handleSubmitSolution = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      // Create or locate submission and navigate to Submission Results
      const sub = mockSubmissions.find(s => s.challengeId === challenge.id) || mockSubmissions[0];
      navigate(`/submissions/${sub.id}`);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] -m-6 overflow-hidden bg-background">
      {/* Top Bar / Breadcrumb */}
      <div className="h-10 bg-surface-container-lowest flex items-center justify-between px-4 border-b border-outline-variant shrink-0">
        <div className="flex items-center gap-2 text-label-xs text-on-surface-variant overflow-x-auto">
          <Link to="/challenges" className="hover:text-primary transition-colors flex items-center gap-1">
            <Icon name="arrow_back" size={14} />
            <span>Challenges</span>
          </Link>
          <span className="text-outline">/</span>
          <span className="text-primary font-medium">{challenge.title}</span>
          <DifficultyBadge difficulty={challenge.difficulty} />
          <span className="text-outline hidden sm:inline">|</span>
          <span className="text-outline hidden sm:inline font-mono">{challenge.timeComplexity} / {challenge.spaceComplexity}</span>
        </div>

        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <div className="hidden md:flex items-center gap-2">
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as any)}
              className="bg-surface-container border border-outline-variant rounded px-2.5 py-1 text-label-sm text-primary font-mono focus:outline-none focus:border-outline cursor-pointer"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript (Node.js)</option>
              <option value="java">Java 17</option>
            </select>
          </div>
        </div>
      </div>

      {/* Mobile Tab Selector (Visible < 1024px) */}
      <div className="flex lg:hidden bg-surface-container-low border-b border-outline-variant shrink-0">
        {(['problem', 'code', 'output', 'feedback'] as WorkspaceTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center text-label-sm uppercase tracking-wider font-mono border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary bg-surface-container'
                : 'border-transparent text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab}
            {tab === 'output' && hasRun && <span className="inline-block w-1.5 h-1.5 ml-1.5 rounded-full bg-emerald-400" />}
          </button>
        ))}
      </div>

      {/* Main Workspace Grid (Desktop: Split Layout, Mobile: Single Tab) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Statement & Context */}
        <div className={`w-full lg:w-[42%] border-r border-outline-variant flex flex-col bg-surface-container-lowest overflow-y-auto ${
          activeTab === 'problem' ? 'flex' : 'hidden lg:flex'
        }`}>
          <div className="p-5 flex flex-col gap-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-label-xs text-outline uppercase tracking-wider">PROBLEM #0{challenge.id.replace('c','')}</span>
                <DifficultyBadge difficulty={challenge.difficulty} />
              </div>
              <h1 className="text-headline-md text-primary font-bold">{challenge.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {challenge.tags.map(t => (
                  <span key={t} className="badge badge-neutral text-label-xs font-mono">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="text-body-md text-on-surface-variant leading-relaxed">
              <p>{challenge.description}</p>
            </div>

            {/* Examples */}
            <div className="flex flex-col gap-3">
              <span className="text-label-sm font-semibold uppercase text-primary tracking-wider font-mono">Examples</span>
              {challenge.examples.map((ex, i) => (
                <div key={i} className="card bg-surface-container-low p-3.5 flex flex-col gap-1.5 font-mono text-code-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-outline shrink-0">Input:</span>
                    <span className="text-primary">{ex.input}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-outline shrink-0">Output:</span>
                    <span className="text-emerald-400">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="text-body-sm text-on-surface-variant mt-1 pt-1 border-t border-outline-variant/50 font-sans">
                      <span className="text-outline">Explanation:</span> {ex.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Constraints */}
            <div className="flex flex-col gap-2">
              <span className="text-label-sm font-semibold uppercase text-primary tracking-wider font-mono">Constraints</span>
              <ul className="list-disc list-inside space-y-1 text-code-sm text-on-surface-variant font-mono">
                {challenge.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>

            {/* Learning Loop Callout */}
            <div className="card p-3.5 bg-surface-container border border-outline-variant/80 flex items-start gap-3">
              <Icon name="psychology" size={20} className="text-primary shrink-0 mt-0.5" />
              <div>
                <p className="text-body-sm font-semibold text-primary">Prove Your Understanding</p>
                <p className="text-label-xs text-on-surface-variant mt-0.5">
                  Submitting code triggers the verification loop: syntax evaluation, AST diagnosis, followed by targeted concept questions.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Editor + Execution Panel */}
        <div className={`flex-1 flex flex-col overflow-hidden ${
          activeTab === 'code' || activeTab === 'output' || activeTab === 'feedback' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Mobile Language Selector */}
          <div className="flex lg:hidden items-center justify-between px-3 py-2 bg-surface-container-low border-b border-outline-variant">
            <span className="text-label-xs font-mono text-outline">Language</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as any)}
              className="bg-surface-container border border-outline-variant rounded px-2 py-1 text-label-xs text-primary font-mono"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
            </select>
          </div>

          {/* Monaco Editor Container */}
          <div className={`flex-1 min-h-[240px] relative ${activeTab === 'output' || activeTab === 'feedback' ? 'hidden lg:block' : 'block'}`}>
            <Editor
              height="100%"
              language={language === 'python' ? 'python' : language === 'javascript' ? 'javascript' : 'java'}
              theme="vs-dark"
              value={code}
              onChange={(val) => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Execution & Output Panel (Split bottom on desktop, Tab on mobile) */}
          <div className={`h-64 lg:h-56 bg-surface-container-low border-t border-outline-variant flex flex-col shrink-0 ${
            activeTab === 'code' ? 'hidden lg:flex' : 'flex'
          }`}>
            {/* Panel Tabs & Status Header */}
            <div className="h-8 bg-surface-container-lowest border-b border-outline-variant flex items-center justify-between px-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveOutputTab('tests')}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'tests' ? 'bg-surface-container text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Test Results ({testResults.filter(t => t.passed).length}/{testResults.length})
                </button>
                <button
                  onClick={() => setActiveOutputTab('ast')}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'ast' ? 'bg-surface-container text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  AST Analysis
                </button>
                <button
                  onClick={() => setActiveOutputTab('console')}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'console' ? 'bg-surface-container text-primary font-bold' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Console Output
                </button>
              </div>

              {hasRun && (
                <div className="flex items-center gap-2 text-label-xs font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>3 Passed · 37ms</span>
                </div>
              )}
            </div>

            {/* Output Panel Content */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-code-sm">
              {!hasRun ? (
                <div className="h-full flex flex-col items-center justify-center text-outline gap-1">
                  <Icon name="play_circle" size={24} />
                  <span>Click "Run Code" to execute assertions against mock test suite</span>
                </div>
              ) : activeOutputTab === 'tests' ? (
                <div className="space-y-2">
                  {testResults.map(t => (
                    <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-surface-container-lowest border border-outline-variant text-label-xs">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${t.passed ? 'bg-emerald-400' : 'bg-red-400'}`} />
                        <span className="text-primary font-medium">{t.name}</span>
                        <span className="text-outline">({t.runtime})</span>
                      </div>
                      <div className="text-on-surface-variant mt-1 sm:mt-0">
                        Input: <code className="text-primary">{t.input}</code> → Expected: <code className="text-emerald-400">{t.expected}</code>
                      </div>
                    </div>
                  ))}
                </div>
              ) : activeOutputTab === 'ast' ? (
                <div className="space-y-1.5 text-on-surface-variant text-label-xs">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Icon name="check_circle" size={14} />
                    <span>Single-pass loop detected: Time complexity O(n)</span>
                  </div>
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Icon name="check_circle" size={14} />
                    <span>Hash table auxiliary structure: Space complexity O(n)</span>
                  </div>
                  <div className="flex items-center gap-2 text-amber-400">
                    <Icon name="info" size={14} />
                    <span>Edge case check: Disallows self-pair index duplicate</span>
                  </div>
                </div>
              ) : (
                <pre className="text-on-surface-variant m-0 text-code-sm">
                  {`[EXEC] Starting runner with python3...\n[INFO] Loaded test suite (3 cases)\n[ASSERT] Case 1 passed (12ms)\n[ASSERT] Case 2 passed (14ms)\n[ASSERT] Case 3 passed (11ms)\n[STATUS] Exit code 0 (All tests passed successfully)`}
                </pre>
              )}
            </div>

            {/* Bottom Action Footer with Run & Submit */}
            <div className="h-12 bg-surface-container-lowest border-t border-outline-variant px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-label-xs text-outline font-mono">
                <span>Tab size: 4</span>
                <span>·</span>
                <span>UTF-8</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isRunning}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono"
                >
                  <Icon name={isRunning ? 'sync' : 'play_arrow'} size={16} className={isRunning ? 'animate-spin' : ''} />
                  <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                </button>

                <button
                  onClick={handleSubmitSolution}
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono"
                >
                  <Icon name={isSubmitting ? 'sync' : 'publish'} size={16} className={isSubmitting ? 'animate-spin' : ''} />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Solution'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
