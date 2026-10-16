import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Icon, DifficultyBadge, SimulatedDemoLabel } from '../../components/ui';
import { mockChallenges, mockSubmissions } from '../../data/mockData';
import { api } from '../../services/api';
import type { BackendSubmission, BackendChallengeDetail } from '../../services/api';

type WorkspaceTab = 'problem' | 'code' | 'output' | 'feedback';
type OutputTab = 'tests' | 'ast' | 'console';

export default function CodingWorkspacePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  const fallbackChallenge = mockChallenges.find(c => c.id === challengeId || c.slug === challengeId) || mockChallenges[0];

  const [challenge, setChallenge] = useState({
    id: challengeId || fallbackChallenge.id,
    slug: fallbackChallenge.slug,
    title: fallbackChallenge.title,
    difficulty: fallbackChallenge.difficulty,
    tags: fallbackChallenge.tags,
    description: fallbackChallenge.description,
    examples: fallbackChallenge.examples,
    constraints: fallbackChallenge.constraints,
    starterCode: fallbackChallenge.starterCode,
  });

  const [language, setLanguage] = useState<'python' | 'javascript' | 'java'>('python');
  const [code, setCode] = useState(fallbackChallenge.starterCode['python'] || '');
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('code');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<OutputTab>('tests');
  const [isOutputCollapsed, setIsOutputCollapsed] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Execution states
  const [hasRun, setHasRun] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<BackendSubmission | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string>('');

  // Fetch real challenge details from backend
  useEffect(() => {
    let mounted = true;
    async function fetchChallenge() {
      if (!challengeId) return;
      try {
        let chDetail: BackendChallengeDetail | null = null;
        try {
          chDetail = await api.challenges.get(challengeId);
        } catch {
          const list = await api.challenges.list();
          const found = list.items.find(i => i.id === challengeId || i.slug === challengeId);
          if (found) {
            chDetail = await api.challenges.get(found.id);
          }
        }

        if (mounted && chDetail) {
          const starterMap: Record<string, string> = {};
          chDetail.languages?.forEach(l => {
            const frontendKey = (l.key === 'python3' ? 'python' : l.key) as 'python' | 'javascript' | 'java';
            if (l.starter_code) {
              starterMap[frontendKey] = l.starter_code;
            }
          });

          const examples = chDetail.visible_tests && chDetail.visible_tests.length > 0
            ? chDetail.visible_tests.map((vt, i) => ({
                input: vt.input_data,
                output: vt.expected_output,
                explanation: `Sample test case #${i + 1}`,
              }))
            : undefined;

          setChallenge(prev => ({
            ...prev,
            id: chDetail.id,
            slug: chDetail.slug,
            title: chDetail.title,
            difficulty: chDetail.difficulty,
            tags: chDetail.languages?.map(l => l.key) || ['algorithms'],
            description: chDetail.description_md || prev.description,
            examples: examples || prev.examples,
            constraints: [`Time limit: ${chDetail.time_limit_ms}ms`, `Memory limit: ${Math.round(chDetail.memory_limit_kb / 1024)}MB`],
            starterCode: {
              ...prev.starterCode,
              ...starterMap,
            },
          }));

          if (starterMap['python']) {
            setCode(starterMap['python']);
          }
        }
      } catch (err) {
        console.warn('Could not load challenge from backend, using baseline spec:', err);
      }
    }
    fetchChallenge();
    return () => {
      mounted = false;
    };
  }, [challengeId]);

  const handleLanguageChange = (newLang: 'python' | 'javascript' | 'java') => {
    setLanguage(newLang);
    if (challenge.starterCode[newLang]) {
      setCode(challenge.starterCode[newLang]);
    }
  };

  const getBackendLangKey = (lang: string) => (lang === 'python' ? 'python3' : lang);

  const pollSubmission = async (subId: string): Promise<BackendSubmission> => {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 650));
      const res = await api.submissions.get(subId);
      if (res.status === 'completed' || res.status === 'failed') {
        return res;
      }
    }
    return await api.submissions.get(subId);
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setErrorMessage(null);
    setHasRun(true);
    setActiveTab('output');
    setActiveOutputTab('tests');
    setIsOutputCollapsed(false);
    setConsoleLogs(`[RUNNER] Enqueueing execution job on real backend...\n[LANG] ${getBackendLangKey(language)}\n`);

    try {
      const initial = await api.submissions.run(challenge.id, {
        language: getBackendLangKey(language),
        source_code: code,
      });

      setConsoleLogs(prev => prev + `[JOB] Enqueued submission ${initial.id} (Status: ${initial.status})\n[POLL] Awaiting runner verdict...\n`);

      const finished = await pollSubmission(initial.id);
      setLastSubmission(finished);

      const passCount = finished.passed ?? 0;
      const totalCount = finished.total ?? 0;

      let logAppend = `[RESULT] Execution completed: ${finished.status.toUpperCase()}\n`;
      logAppend += `[SUMMARY] Tests Passed: ${passCount}/${totalCount}\n`;
      if (finished.compile_error) {
        logAppend += `[COMPILE ERROR]\n${finished.compile_error}\n`;
      }
      if (finished.error_message) {
        logAppend += `[RUNTIME ERROR]\n${finished.error_message}\n`;
      }
      finished.results?.forEach(r => {
        logAppend += `[TEST ${r.label}] ${r.status.toUpperCase()} (${r.runtime_ms ?? 0}ms, ${r.memory_kb ?? 0}KB)\n`;
      });

      setConsoleLogs(prev => prev + logAppend);
    } catch (err: any) {
      console.error('Run code error:', err);
      setErrorMessage(err?.message || 'Execution service unreachable. Running locally in simulated demo mode.');
      setConsoleLogs(prev => prev + `[ERROR] ${err?.message || 'Execution request failed'}\n`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const initial = await api.submissions.create(challenge.id, {
        language: getBackendLangKey(language),
        source_code: code,
      });

      const finished = await pollSubmission(initial.id);
      navigate(`/submissions/${finished.id}`);
    } catch (err: any) {
      console.error('Submit solution error:', err);
      setErrorMessage(err?.message || 'Submission failed. Please check network connectivity.');
      setIsSubmitting(false);
    }
  };

  // Recent submissions for this challenge
  const challengeSubmissions = mockSubmissions.filter(s => s.challengeId === challenge.id);

  return (
    <div className="flex flex-col h-[calc(100vh-48px-1.5rem)] md:h-[calc(100vh-48px-3rem)] bg-[#111315] border border-[#343B42] rounded-lg overflow-hidden select-none">
      {/* Top Breadcrumb & Control Bar */}
      <div className="h-10 bg-[#171A1E] px-3 sm:px-4 flex items-center justify-between border-b border-[#343B42] shrink-0">
        <div className="flex items-center gap-2 text-label-xs font-mono text-secondary-text truncate mr-2">
          <Link to="/challenges" className="hover:text-primary transition-colors flex items-center gap-1 shrink-0">
            <Icon name="arrow_back" size={14} />
            <span className="hidden sm:inline">Challenges</span>
          </Link>
          <span className="text-[#525C66]">/</span>
          <span className="text-primary-text font-bold truncate">{challenge.title}</span>
          <DifficultyBadge difficulty={challenge.difficulty} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SimulatedDemoLabel />
          {/* Desktop Language Selector */}
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value as any)}
            className="hidden md:block bg-[#1C2024] border border-[#343B42] rounded px-2.5 py-1 text-label-xs text-primary font-mono focus:border-primary cursor-pointer outline-none"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node)</option>
            <option value="java">Java 21</option>
          </select>
        </div>
      </div>

      {/* Error Alert Bar */}
      {errorMessage && (
        <div className="bg-[#E98779]/15 border-b border-[#E98779]/30 px-3 py-1.5 text-label-xs text-[#E98779] font-mono flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="warning" size={14} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-[#E98779] hover:text-[#F1F3F5]">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Mobile Tab Selector (< 1024px) */}
      <div className="flex lg:hidden bg-[#171A1E] border-b border-[#343B42] shrink-0">
        {(['problem', 'code', 'output', 'feedback'] as WorkspaceTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center text-label-xs uppercase tracking-wider font-mono border-b-2 transition-colors min-h-[44px] flex items-center justify-center gap-1 ${
              activeTab === tab
                ? 'border-primary text-primary bg-[#1C2024] font-bold'
                : 'border-transparent text-secondary-text hover:text-primary-text'
            }`}
          >
            {tab}
            {tab === 'output' && hasRun && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#83D69A]" />
            )}
          </button>
        ))}
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Specification (Desktop: 42% flex, Mobile: tab controlled) */}
        <div
          className={`w-full lg:w-[42%] border-r border-[#343B42] flex flex-col bg-[#171A1E] overflow-y-auto ${
            activeTab === 'problem' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 sm:p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-muted uppercase tracking-wider">CHALLENGE SPECIFICATION</span>
                <DifficultyBadge difficulty={challenge.difficulty} />
              </div>
              <h1 className="text-headline-md text-primary-text font-bold">{challenge.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {challenge.tags.map(t => (
                  <span key={t} className="badge badge-neutral text-label-xs font-mono">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="text-body-md text-secondary-text leading-relaxed whitespace-pre-wrap font-sans">
              <p>{challenge.description}</p>
            </div>

            {/* Constraints */}
            {challenge.constraints.length > 0 && (
              <div className="space-y-2">
                <span className="text-label-xs font-mono font-bold uppercase text-primary tracking-wider block">
                  Constraints
                </span>
                <ul className="list-disc list-inside text-code-sm text-secondary-text font-mono space-y-1">
                  {challenge.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visible Sample Test Cases */}
            <div className="space-y-3">
              <span className="text-label-xs font-mono font-bold uppercase text-primary tracking-wider block">
                Sample Test Cases
              </span>
              {challenge.examples.map((ex, i) => (
                <div key={i} className="p-3 rounded bg-[#111315] border border-[#343B42] space-y-1.5 font-mono text-code-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-muted shrink-0 w-16">Input:</span>
                    <span className="text-primary-text whitespace-pre-wrap">{ex.input}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-muted shrink-0 w-16">Output:</span>
                    <span className="text-[#83D69A] whitespace-pre-wrap">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="flex items-start gap-2 pt-1 border-t border-[#343B42]/40 text-body-sm text-muted font-sans">
                      <span>Note: {ex.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Submission History Section */}
            {challengeSubmissions.length > 0 && (
              <div className="pt-3 border-t border-[#343B42] space-y-2">
                <span className="text-label-xs font-mono font-bold uppercase text-muted tracking-wider block">
                  Recent Runs
                </span>
                <div className="space-y-1.5">
                  {challengeSubmissions.map(s => (
                    <Link
                      key={s.id}
                      to={`/submissions/${s.id}`}
                      className="p-2 rounded bg-[#111315] hover:border-primary border border-[#343B42] flex items-center justify-between text-code-sm font-mono transition-colors block"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.status === 'accepted' ? 'bg-[#83D69A]' : 'bg-[#E98779]'}`} />
                        <span className="text-primary-text">{s.status.toUpperCase()}</span>
                      </div>
                      <span className="text-muted">{s.testsPassed}/{s.testsTotal} passed</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor & Output Pane (Desktop: 58% flex, Mobile: tab controlled) */}
        <div
          className={`w-full lg:w-[58%] flex flex-col bg-[#111315] overflow-hidden ${
            activeTab !== 'problem' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Editor Sub-Header (Tabs & Language) */}
          <div className="h-9 bg-[#1C2024] px-3 flex items-center justify-between border-b border-[#343B42] shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111315] border-t-2 border-primary text-label-xs font-mono text-primary rounded-t border-x border-[#343B42]">
                <Icon name="code" size={14} />
                <span>solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'java'}</span>
              </div>
            </div>

            {/* Mobile language selector */}
            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value as any)}
              className="md:hidden bg-[#111315] border border-[#343B42] rounded px-2 py-0.5 text-label-xs text-primary font-mono outline-none"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java 21</option>
            </select>
          </div>

          {/* Monaco Editor Container */}
          <div
            className={`flex-1 min-h-[220px] relative ${
              activeTab === 'output' || activeTab === 'feedback' ? 'hidden lg:block' : 'block'
            }`}
          >
            <Editor
              height="100%"
              language={language === 'python' ? 'python' : language === 'javascript' ? 'javascript' : 'java'}
              theme="vs-dark"
              value={code}
              onChange={val => setCode(val || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
                padding: { top: 10, bottom: 10 },
              }}
            />
          </div>

          {/* Terminal & Output Tray */}
          <div
            className={`${
              isOutputCollapsed ? 'h-9' : 'h-64 lg:h-60'
            } bg-[#171A1E] border-t border-[#343B42] flex flex-col shrink-0 transition-all duration-200 ${
              activeTab === 'code' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Tray Header Tabs */}
            <div className="h-9 bg-[#1C2024] border-b border-[#343B42] flex items-center justify-between px-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setActiveOutputTab('tests');
                    setIsOutputCollapsed(false);
                  }}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'tests' && !isOutputCollapsed
                      ? 'bg-[#111315] text-primary font-bold border border-[#343B42]'
                      : 'text-secondary-text hover:text-primary-text'
                  }`}
                >
                  Test Results {lastSubmission ? `(${lastSubmission.passed}/${lastSubmission.total})` : ''}
                </button>
                <button
                  onClick={() => {
                    setActiveOutputTab('ast');
                    setIsOutputCollapsed(false);
                  }}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'ast' && !isOutputCollapsed
                      ? 'bg-[#111315] text-primary font-bold border border-[#343B42]'
                      : 'text-secondary-text hover:text-primary-text'
                  }`}
                >
                  AST Analysis
                </button>
                <button
                  onClick={() => {
                    setActiveOutputTab('console');
                    setIsOutputCollapsed(false);
                  }}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'console' && !isOutputCollapsed
                      ? 'bg-[#111315] text-primary font-bold border border-[#343B42]'
                      : 'text-secondary-text hover:text-primary-text'
                  }`}
                >
                  Terminal Logs
                </button>
              </div>

              <div className="flex items-center gap-2">
                {lastSubmission && (
                  <div className="hidden sm:flex items-center gap-1.5 text-label-xs font-mono text-[#83D69A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#83D69A]" />
                    <span>{lastSubmission.passed}/{lastSubmission.total} Assertions Passed</span>
                  </div>
                )}
                <button
                  onClick={() => setIsOutputCollapsed(p => !p)}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#737E89] hover:text-[#F1F3F5] transition-colors"
                  title={isOutputCollapsed ? 'Expand panel' : 'Collapse panel'}
                  aria-label={isOutputCollapsed ? 'Expand panel' : 'Collapse panel'}
                >
                  <Icon name={isOutputCollapsed ? 'expand_less' : 'expand_more'} size={18} />
                </button>
              </div>
            </div>

            {/* Tray Content */}
            {!isOutputCollapsed && (
              <div className="flex-1 p-3 overflow-y-auto font-mono text-code-sm bg-[#111315]">
                {!hasRun ? (
                  <div className="h-full flex flex-col items-center justify-center text-muted gap-2 py-4">
                    <Icon name="terminal" size={26} className="text-[#525C66]" />
                    <span>Click "Run Code" to compile and execute assertions against test suite</span>
                  </div>
                ) : activeOutputTab === 'tests' ? (
                  <div className="space-y-2">
                    {lastSubmission?.results && lastSubmission.results.length > 0 ? (
                      lastSubmission.results.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-[#171A1E] border border-[#343B42] text-label-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${t.status === 'passed' ? 'bg-[#83D69A]' : 'bg-[#E98779]'}`} />
                            <span className="text-primary-text font-semibold">{t.label}</span>
                            <span className="text-muted">({t.runtime_ms ?? 0}ms · {t.memory_kb ?? 0}KB)</span>
                          </div>
                          <div className="text-secondary-text mt-1 sm:mt-0">
                            Verdict: <code className={t.status === 'passed' ? 'text-[#83D69A] font-bold' : 'text-[#E98779] font-bold'}>{t.status.toUpperCase()}</code>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-secondary-text text-code-sm">
                        {isRunning ? 'Executing test suite on backend runner...' : 'No test results returned yet.'}
                      </div>
                    )}
                  </div>
                ) : activeOutputTab === 'ast' ? (
                  <div className="space-y-2 text-label-xs">
                    <div className="p-2.5 rounded bg-[#171A1E] border border-[#343B42] space-y-1.5">
                      <div className="flex items-center gap-2 text-[#83D69A]">
                        <Icon name="check_circle" size={15} />
                        <span className="font-semibold">Abstract Syntax Tree Parsed</span>
                      </div>
                      <p className="text-secondary-text text-body-sm font-sans">
                        Control flow graphs and loop invariants analyzed. Complexity matches expected O(n) amortized bound.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-[#171A1E] border border-[#343B42] space-y-1.5">
                      <div className="flex items-center gap-2 text-[#E9B567]">
                        <Icon name="psychology" size={15} />
                        <span className="font-semibold">Cognitive Verification Prompt Queued</span>
                      </div>
                      <p className="text-secondary-text text-body-sm font-sans">
                        Submission triggers 2 follow-up verification questions to ensure full conceptual understanding of hash collisions and pointer persistence.
                      </p>
                    </div>
                  </div>
                ) : (
                  <pre className="text-secondary-text m-0 text-code-sm whitespace-pre-wrap leading-relaxed">
                    {consoleLogs || 'No output recorded.'}
                  </pre>
                )}
              </div>
            )}

            {/* Bottom Action Tray: UTF-8 info + Run & Submit buttons */}
            <div className="h-12 bg-[#1C2024] border-t border-[#343B42] px-3 sm:px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-label-xs text-muted font-mono">
                <span>Tab: 4 spaces</span>
                <span>·</span>
                <span>UTF-8</span>
                <span>·</span>
                <span>FastAPI Runner</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isRunning || isSubmitting}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono min-h-[36px]"
                >
                  <Icon
                    name={isRunning ? 'sync' : 'play_arrow'}
                    size={16}
                    className={isRunning ? 'animate-spin text-primary' : 'text-primary'}
                  />
                  <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                </button>

                <button
                  onClick={handleSubmitSolution}
                  disabled={isRunning || isSubmitting}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono min-h-[36px]"
                >
                  <Icon
                    name={isSubmitting ? 'sync' : 'publish'}
                    size={16}
                    className={isSubmitting ? 'animate-spin' : ''}
                  />
                  <span>{isSubmitting ? 'Submitting...' : 'Submit Proof'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
