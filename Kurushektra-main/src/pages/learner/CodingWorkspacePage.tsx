import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Icon, DifficultyBadge, SimulatedDemoLabel } from '../../components/ui';
import { mockChallenges, mockSubmissions } from '../../data/mockData';
import { api } from '../../services/api';
import type { BackendSubmission, BackendChallengeDetail } from '../../services/api';

type WorkspaceTab = 'problem' | 'code' | 'output' | 'hints';
type OutputTab = 'tests' | 'guidance' | 'hints' | 'ast' | 'console';

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

  // Progressive Hints state
  const [unlockedHints, setUnlockedHints] = useState<number>(0);

  // Challenge hints definition
  const hints = [
    {
      level: 1,
      title: 'Think About Complements',
      content: 'For each number `x` in the array, the required matching value is `target - x`. How can you quickly check if this complement has already been seen without scanning the array again?',
    },
    {
      level: 2,
      title: 'Use Constant-Time Lookup',
      content: 'A hash map (dictionary in Python, Map/object in JavaScript) gives amortized O(1) key lookups. As you iterate through the list, you can store each number and its index in the map.',
    },
    {
      level: 3,
      title: 'Prevent Self-Pairing',
      content: 'Check whether `target - x` exists in your hash map BEFORE storing the current element `x`. This guarantees you never pair an element with itself at the same index.',
    },
  ];

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

      const finished = await pollSubmission(initial.id);
      setLastSubmission(finished);

      const passCount = finished.passed || finished.results?.filter(r => r.status === 'passed').length || 0;
      const totalCount = finished.total || finished.results?.length || 0;

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

      // If test failed, nudge user towards diagnostic guidance tab
      if (passCount < totalCount) {
        setActiveOutputTab('guidance');
      }
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
    <div className="flex flex-col h-[calc(100vh-48px-1.5rem)] md:h-[calc(100vh-48px-2rem)] bg-[#111315] border border-[#343A40] rounded-lg overflow-hidden select-none">
      {/* ── TOP CONTROL & BREADCRUMB BAR ─────────────────────────────────── */}
      <div className="h-10 bg-[#15181A] px-3 sm:px-4 flex items-center justify-between border-b border-[#343A40] shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-[#B7BEC5] truncate mr-2">
          <Link to="/challenges" className="hover:text-[#60E3D0] transition-colors flex items-center gap-1 shrink-0">
            <Icon name="arrow_back" size={14} />
            <span className="hidden sm:inline">Challenges</span>
          </Link>
          <span className="text-[#56606A]">/</span>
          <span className="text-[#F2F3F5] font-bold truncate">{challenge.title}</span>
          <DifficultyBadge difficulty={challenge.difficulty} />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <SimulatedDemoLabel />
          {/* Desktop Language Selector */}
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value as any)}
            className="hidden md:block bg-[#1C2022] border border-[#343A40] rounded px-2.5 py-1 text-xs text-[#60E3D0] font-mono focus:border-[#60E3D0] cursor-pointer outline-none"
          >
            <option value="python">Python 3</option>
            <option value="javascript">JavaScript (Node)</option>
            <option value="java">Java 21</option>
          </select>
        </div>
      </div>

      {/* Error Alert Bar */}
      {errorMessage && (
        <div className="bg-[#E99AA4]/15 border-b border-[#E99AA4]/30 px-3 py-1.5 text-xs text-[#E99AA4] font-mono flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <Icon name="warning" size={14} />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-[#E99AA4] hover:text-[#F2F3F5]">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

      {/* Mobile Tab Selector (< 1024px) */}
      <div className="flex lg:hidden bg-[#15181A] border-b border-[#343A40] shrink-0">
        {(['problem', 'code', 'output', 'hints'] as WorkspaceTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-center text-xs uppercase tracking-wider font-mono border-b-2 transition-colors min-h-[44px] flex items-center justify-center gap-1 ${
              activeTab === tab
                ? 'border-[#60E3D0] text-[#60E3D0] bg-[#1C2022] font-bold'
                : 'border-transparent text-[#B7BEC5] hover:text-[#F2F3F5]'
            }`}
          >
            {tab}
            {tab === 'output' && hasRun && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#83D69A]" />
            )}
            {tab === 'hints' && unlockedHints > 0 && (
              <span className="text-[10px] px-1 py-0.2 rounded bg-[#F2B866]/20 text-[#F2B866]">
                {unlockedHints}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── MAIN WORKSPACE BODY ──────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Problem Specification, Constraints & Hints (Desktop: 42%, Mobile: Tab) */}
        <div
          className={`w-full lg:w-[42%] border-r border-[#343A40] flex flex-col bg-[#15181A] overflow-y-auto ${
            activeTab === 'problem' || activeTab === 'hints' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          <div className="p-4 sm:p-5 space-y-5">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[10px] text-[#737E89] uppercase tracking-wider">CHALLENGE SPECIFICATION</span>
                <DifficultyBadge difficulty={challenge.difficulty} />
              </div>
              <h1 className="text-xl text-[#F2F3F5] font-bold">{challenge.title}</h1>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {challenge.tags.map(t => (
                  <span key={t} className="badge badge-neutral text-xs font-mono">
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="text-sm text-[#B7BEC5] leading-relaxed whitespace-pre-wrap font-sans">
              <p>{challenge.description}</p>
            </div>

            {/* Constraints */}
            {challenge.constraints.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-[#60E3D0] tracking-wider block">
                  Constraints & Bounds
                </span>
                <ul className="list-disc list-inside text-xs text-[#B7BEC5] font-mono space-y-1">
                  {challenge.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Visible Sample Test Cases */}
            <div className="space-y-3">
              <span className="text-xs font-mono font-bold uppercase text-[#60E3D0] tracking-wider block">
                Sample Test Cases
              </span>
              {challenge.examples.map((ex, i) => (
                <div key={i} className="p-3 rounded-lg bg-[#111315] border border-[#343A40] space-y-1.5 font-mono text-xs">
                  <div className="flex items-start gap-2">
                    <span className="text-[#737E89] shrink-0 w-16">Input:</span>
                    <span className="text-[#F2F3F5] whitespace-pre-wrap">{ex.input}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-[#737E89] shrink-0 w-16">Output:</span>
                    <span className="text-[#83D69A] whitespace-pre-wrap">{ex.output}</span>
                  </div>
                  {ex.explanation && (
                    <div className="flex items-start gap-2 pt-1 border-t border-[#343A40]/40 text-xs text-[#B7BEC5] font-sans">
                      <span>Explanation: {ex.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Progressive Hints Section */}
            <div className="pt-3 border-t border-[#343A40] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase text-[#F2B866]">
                  <Icon name="lightbulb" size={16} />
                  <span>Progressive Learning Hints</span>
                </div>
                <span className="text-xs font-mono text-[#737E89]">
                  {unlockedHints} of {hints.length} unlocked
                </span>
              </div>

              <div className="space-y-2">
                {hints.map((h, i) => {
                  const isUnlocked = i < unlockedHints;
                  return (
                    <div
                      key={h.level}
                      className={`p-3 rounded-lg border transition-colors ${
                        isUnlocked
                          ? 'bg-[#1C2022] border-[#343A40] space-y-1'
                          : 'bg-[#111315]/60 border-[#343A40]/60 opacity-70'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className={isUnlocked ? 'text-[#F2B866] font-semibold' : 'text-[#737E89]'}>
                          Hint {h.level}: {h.title}
                        </span>
                        {!isUnlocked && (
                          <span className="text-[10px] text-[#737E89]">Locked</span>
                        )}
                      </div>
                      {isUnlocked ? (
                        <p className="text-xs text-[#B7BEC5] leading-relaxed font-sans">
                          {h.content}
                        </p>
                      ) : (
                        <p className="text-xs text-[#737E89] italic font-sans">
                          Unlock this hint if you need guidance on how to optimize without spoiling the solution.
                        </p>
                      )}
                    </div>
                  );
                })}

                {unlockedHints < hints.length && (
                  <button
                    onClick={() => setUnlockedHints(c => c + 1)}
                    className="btn btn-secondary w-full text-xs font-mono flex items-center justify-center gap-1.5 py-1.5"
                  >
                    <Icon name="lock_open" size={14} className="text-[#F2B866]" />
                    <span>Unlock Hint {unlockedHints + 1}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Concept Remediation Link */}
            <div className="p-3 rounded-lg bg-[#1C2022] border border-[#343A40] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-[#8FAFF5] flex items-center gap-1">
                  <Icon name="splitscreen" size={14} /> Targeted Concept Drill
                </span>
              </div>
              <p className="text-xs text-[#B7BEC5]">
                Struggling with hash collision timing? Review the interactive concept gap drill.
              </p>
              <Link to="/learn/gap/g1" className="text-xs font-mono text-[#60E3D0] hover:underline flex items-center gap-1">
                <span>Open Remediation Drill</span>
                <Icon name="arrow_forward" size={12} />
              </Link>
            </div>

            {/* Submission History Section */}
            {challengeSubmissions.length > 0 && (
              <div className="pt-3 border-t border-[#343A40] space-y-2">
                <span className="text-xs font-mono font-bold uppercase text-[#737E89] tracking-wider block">
                  Recent Runs
                </span>
                <div className="space-y-1.5">
                  {challengeSubmissions.map(s => (
                    <Link
                      key={s.id}
                      to={`/submissions/${s.id}`}
                      className="p-2 rounded bg-[#111315] hover:border-[#60E3D0] border border-[#343A40] flex items-center justify-between text-xs font-mono transition-colors block"
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${s.status === 'accepted' ? 'bg-[#83D69A]' : 'bg-[#E99AA4]'}`} />
                        <span className="text-[#F2F3F5]">{s.status.toUpperCase()}</span>
                      </div>
                      <span className="text-[#737E89]">{s.testsPassed}/{s.testsTotal} passed</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Editor & Output Tray (Desktop: 58%, Mobile: Tab) */}
        <div
          className={`w-full lg:w-[58%] flex flex-col bg-[#111315] overflow-hidden ${
            activeTab !== 'problem' && activeTab !== 'hints' ? 'flex' : 'hidden lg:flex'
          }`}
        >
          {/* Editor Sub-Header (Tabs & Language) */}
          <div className="h-9 bg-[#1C2022] px-3 flex items-center justify-between border-b border-[#343A40] shrink-0">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-[#111315] border-t-2 border-[#60E3D0] text-xs font-mono text-[#60E3D0] rounded-t border-x border-[#343A40]">
                <Icon name="code" size={14} />
                <span>solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'java'}</span>
              </div>
            </div>

            {/* Mobile language selector */}
            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value as any)}
              className="md:hidden bg-[#111315] border border-[#343A40] rounded px-2 py-0.5 text-xs text-[#60E3D0] font-mono outline-none"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java 21</option>
            </select>
          </div>

          {/* Monaco Editor Container */}
          <div
            className={`flex-1 min-h-[220px] relative ${
              activeTab === 'output' ? 'hidden lg:block' : 'block'
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

          {/* ── TERMINAL & OUTPUT TRAY ───────────────────────────────────── */}
          <div
            className={`${
              isOutputCollapsed ? 'h-9' : 'h-72 lg:h-64'
            } bg-[#15181A] border-t border-[#343A40] flex flex-col shrink-0 transition-all duration-200 ${
              activeTab === 'code' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Tray Header Tabs */}
            <div className="h-9 bg-[#1C2022] border-b border-[#343A40] flex items-center justify-between px-3 shrink-0">
              <div className="flex items-center gap-1.5 overflow-x-auto">
                <button
                  onClick={() => {
                    setActiveOutputTab('tests');
                    setIsOutputCollapsed(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'tests' && !isOutputCollapsed
                      ? 'bg-[#111315] text-[#60E3D0] font-bold border border-[#343A40]'
                      : 'text-[#B7BEC5] hover:text-[#F2F3F5]'
                  }`}
                >
                  Test Results {lastSubmission ? `(${lastSubmission.passed}/${lastSubmission.total})` : ''}
                </button>

                <button
                  onClick={() => {
                    setActiveOutputTab('guidance');
                    setIsOutputCollapsed(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'guidance' && !isOutputCollapsed
                      ? 'bg-[#111315] text-[#F2B866] font-bold border border-[#343A40]'
                      : 'text-[#B7BEC5] hover:text-[#F2F3F5]'
                  }`}
                >
                  Actionable Guidance
                </button>

                <button
                  onClick={() => {
                    setActiveOutputTab('ast');
                    setIsOutputCollapsed(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'ast' && !isOutputCollapsed
                      ? 'bg-[#111315] text-[#8FAFF5] font-bold border border-[#343A40]'
                      : 'text-[#B7BEC5] hover:text-[#F2F3F5]'
                  }`}
                >
                  AST Analysis
                </button>

                <button
                  onClick={() => {
                    setActiveOutputTab('console');
                    setIsOutputCollapsed(false);
                  }}
                  className={`px-2.5 py-1 text-xs font-mono uppercase tracking-wider rounded transition-colors ${
                    activeOutputTab === 'console' && !isOutputCollapsed
                      ? 'bg-[#111315] text-[#60E3D0] font-bold border border-[#343A40]'
                      : 'text-[#B7BEC5] hover:text-[#F2F3F5]'
                  }`}
                >
                  Terminal Logs
                </button>
              </div>

              <div className="flex items-center gap-2">
                {lastSubmission && (
                  <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-[#83D69A]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#83D69A]" />
                    <span>{lastSubmission.passed}/{lastSubmission.total} Passed</span>
                  </div>
                )}
                <button
                  onClick={() => setIsOutputCollapsed(p => !p)}
                  className="w-6 h-6 rounded flex items-center justify-center text-[#737E89] hover:text-[#F2F3F5] transition-colors"
                  title={isOutputCollapsed ? 'Expand panel' : 'Collapse panel'}
                  aria-label={isOutputCollapsed ? 'Expand panel' : 'Collapse panel'}
                >
                  <Icon name={isOutputCollapsed ? 'expand_less' : 'expand_more'} size={18} />
                </button>
              </div>
            </div>

            {/* Tray Content */}
            {!isOutputCollapsed && (
              <div className="flex-1 p-3.5 overflow-y-auto font-mono text-xs bg-[#111315]">
                {!hasRun ? (
                  <div className="h-full flex flex-col items-center justify-center text-[#737E89] gap-2 py-4">
                    <Icon name="terminal" size={26} className="text-[#56606A]" />
                    <span>Click "Run Code" to compile and execute assertions against the test suite</span>
                  </div>
                ) : activeOutputTab === 'tests' ? (
                  <div className="space-y-2">
                    {lastSubmission?.results && lastSubmission.results.length > 0 ? (
                      lastSubmission.results.map((t, idx) => (
                        <div
                          key={idx}
                          className="flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded bg-[#15181A] border border-[#343A40] text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${t.status === 'passed' ? 'bg-[#83D69A]' : 'bg-[#E99AA4]'}`} />
                            <span className="text-[#F2F3F5] font-semibold">{t.label}</span>
                            <span className="text-[#737E89]">({t.runtime_ms ?? 0}ms · {t.memory_kb ?? 0}KB)</span>
                          </div>
                          <div className="text-[#B7BEC5] mt-1 sm:mt-0 font-mono">
                            Verdict: <code className={t.status === 'passed' ? 'text-[#83D69A] font-bold' : 'text-[#E99AA4] font-bold'}>{t.status.toUpperCase()}</code>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-[#B7BEC5]">
                        {isRunning ? 'Executing test suite on backend runner...' : 'No test results returned yet.'}
                      </div>
                    )}
                  </div>
                ) : activeOutputTab === 'guidance' ? (
                  /* ── Actionable Educational Guidance (Section 7) ── */
                  <div className="space-y-3 font-sans">
                    <div className="p-3 rounded-lg bg-[#15181A] border border-[#343A40] space-y-2">
                      <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#F2B866]">
                        <Icon name="diagnostic" size={16} />
                        <span>ACTIONABLE GUIDANCE</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1 text-xs">
                        <div className="space-y-1 p-2.5 rounded bg-[#1C2022] border border-[#343A40]">
                          <span className="font-mono text-[#F2B866] uppercase font-bold block">1. What Happened?</span>
                          <p className="text-[#B7BEC5]">
                            {lastSubmission && lastSubmission.passed < lastSubmission.total
                              ? 'Your solution failed on duplicate key handling or reached suboptimal asymptotic limits.'
                              : 'All current test assertions passed. Now ensure the invariant holds for large inputs.'}
                          </p>
                        </div>

                        <div className="space-y-1 p-2.5 rounded bg-[#1C2022] border border-[#343A40]">
                          <span className="font-mono text-[#8FAFF5] uppercase font-bold block">2. Supporting Evidence</span>
                          <p className="text-[#B7BEC5]">
                            {lastSubmission && lastSubmission.passed < lastSubmission.total
                              ? `Test assertions failed with mismatch on inputs where duplicate integers appeared.`
                              : `Verified O(n) amortized execution across all standard sample arrays.`}
                          </p>
                        </div>

                        <div className="space-y-1 p-2.5 rounded bg-[#1C2022] border border-[#343A40]">
                          <span className="font-mono text-[#E99AA4] uppercase font-bold block">3. Concept Involved</span>
                          <p className="text-[#B7BEC5]">
                            Hash Map Insertion Sequence: Storing the current item before complement checking can cause self-pairing on identical values.
                          </p>
                        </div>

                        <div className="space-y-1 p-2.5 rounded bg-[#1C2022] border border-[#343A40]">
                          <span className="font-mono text-[#60E3D0] uppercase font-bold block">4. What Should You Try Next?</span>
                          <p className="text-[#B7BEC5]">
                            Inspect lines where `seen[num] = i` is called. Ensure you evaluate `if complement in seen:` before recording `seen[num]`.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeOutputTab === 'ast' ? (
                  <div className="space-y-2 text-xs">
                    <div className="p-2.5 rounded bg-[#15181A] border border-[#343A40] space-y-1.5">
                      <div className="flex items-center gap-2 text-[#83D69A]">
                        <Icon name="check_circle" size={15} />
                        <span className="font-semibold">Abstract Syntax Tree Parsed</span>
                      </div>
                      <p className="text-[#B7BEC5] text-xs font-sans">
                        Control flow graphs and loop invariants analyzed. Complexity matches expected O(n) amortized bound.
                      </p>
                    </div>

                    <div className="p-2.5 rounded bg-[#15181A] border border-[#343A40] space-y-1.5">
                      <div className="flex items-center gap-2 text-[#F2B866]">
                        <Icon name="psychology" size={15} />
                        <span className="font-semibold">Cognitive Verification Prompt Queued</span>
                      </div>
                      <p className="text-[#B7BEC5] text-xs font-sans">
                        Submission triggers follow-up verification questions to ensure full conceptual understanding of hash collisions and pointer persistence.
                      </p>
                      <Link
                        to={`/assessment/${lastSubmission?.id || 's1'}`}
                        className="btn btn-secondary text-xs font-mono py-1 px-2.5 inline-flex items-center gap-1 mt-1"
                      >
                        <span>Take Understanding Assessment</span>
                        <Icon name="arrow_forward" size={12} />
                      </Link>
                    </div>
                  </div>
                ) : (
                  <pre className="text-[#B7BEC5] m-0 text-xs whitespace-pre-wrap leading-relaxed font-mono">
                    {consoleLogs || 'No output recorded.'}
                  </pre>
                )}
              </div>
            )}

            {/* ── BOTTOM ACTION TRAY ─────────────────────────────────────── */}
            <div className="h-12 bg-[#1C2022] border-t border-[#343A40] px-3 sm:px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs text-[#737E89] font-mono">
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
                  className="btn btn-secondary text-xs flex items-center gap-1.5 font-mono min-h-[36px]"
                >
                  <Icon
                    name={isRunning ? 'sync' : 'play_arrow'}
                    size={16}
                    className={isRunning ? 'animate-spin text-[#60E3D0]' : 'text-[#60E3D0]'}
                  />
                  <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                </button>

                <button
                  onClick={handleSubmitSolution}
                  disabled={isRunning || isSubmitting}
                  className="btn btn-primary text-xs flex items-center gap-1.5 font-mono min-h-[36px]"
                >
                  <Icon
                    name={isSubmitting ? 'sync' : 'publish'}
                    size={16}
                    className={isSubmitting ? 'animate-spin' : ''}
                  />
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
