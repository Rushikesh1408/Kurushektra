import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { Icon, DifficultyBadge, SimulatedDemoLabel } from '../../components/ui';
import { mockChallenges } from '../../data/mockData';
import { api } from '../../services/api';
import { offlineSync } from '../../services/offlineSync';
import type { BackendSubmission, BackendChallengeDetail } from '../../services/api';

type WorkspaceTab = 'problem' | 'code' | 'output' | 'feedback';

export default function CodingWorkspacePage() {
  const { challengeId } = useParams<{ challengeId: string }>();
  const navigate = useNavigate();

  // Find initial fallback from mock or slug
  const fallbackChallenge = mockChallenges.find(c => c.id === challengeId || c.slug === challengeId) || mockChallenges[0];

  const [challenge, setChallenge] = useState<{
    id: string;
    slug: string;
    title: string;
    difficulty: 'easy' | 'medium' | 'hard';
    tags: string[];
    description: string;
    examples: { input: string; output: string; explanation?: string }[];
    constraints: string[];
    starterCode: Record<string, string>;
  }>({
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
  const [code, setCode] = useState(
    offlineSync.getDraft(challengeId || fallbackChallenge.id, 'python') ||
    fallbackChallenge.starterCode['python'] || ''
  );
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('code');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeOutputTab, setActiveOutputTab] = useState<'tests' | 'hints' | 'alternatives' | 'console'>('tests');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Progressive Hint & Alternative Solutions state
  const [currentHintLevel, setCurrentHintLevel] = useState<number>(1);
  const [hintData, setHintData] = useState<{ hint_level: number; hint_title: string; hint_text: string; target_area?: string } | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [altData, setAltData] = useState<{ current_approach_summary: string; alternatives: Array<{ approach_name: string; description: string; time_complexity: string; space_complexity: string; code_example: string; trade_offs: string }> } | null>(null);
  const [altLoading, setAltLoading] = useState(false);
  const [failureExplanation, setFailureExplanation] = useState<{ summary: string; suspected_cause: string; suggested_fix: string } | null>(null);
  const [explainingFailure, setExplainingFailure] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // Execution result state from backend
  const [hasRun, setHasRun] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<BackendSubmission | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string>('');

  const handleCodeChange = (newVal: string) => {
    setCode(newVal);
    offlineSync.saveDraft(challenge.id, language, newVal);
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleFetchHint = async (level: number) => {
    if (!lastSubmission) {
      setErrorMessage('Please run code first so the AI Brain has execution diagnostics for hints.');
      return;
    }
    setHintLoading(true);
    setCurrentHintLevel(level);
    try {
      const res = await api.comprehension.getHint(lastSubmission.id, level);
      setHintData(res);
      setActiveOutputTab('hints');
    } catch (err: any) {
      console.error('Failed to get hint:', err);
      setErrorMessage(err?.message || 'Failed to retrieve progressive hint from AI Brain.');
    } finally {
      setHintLoading(false);
    }
  };

  const handleFetchAlternatives = async () => {
    if (!lastSubmission) {
      setErrorMessage('Please run code first to analyze current solution alternatives.');
      return;
    }
    setAltLoading(true);
    try {
      const res = await api.comprehension.getAlternatives(lastSubmission.id);
      setAltData(res);
      setActiveOutputTab('alternatives');
    } catch (err: any) {
      console.error('Failed to get alternatives:', err);
      setErrorMessage(err?.message || 'Failed to retrieve alternative approaches.');
    } finally {
      setAltLoading(false);
    }
  };

  const handleExplainFailure = async () => {
    if (!lastSubmission) return;
    setExplainingFailure(true);
    try {
      const res = await api.comprehension.explainFailure(lastSubmission.id);
      setFailureExplanation(res);
      setActiveOutputTab('console');
    } catch (err: any) {
      console.error('Failed to explain failure:', err);
      setErrorMessage(err?.message || 'Failed to explain test failure.');
    } finally {
      setExplainingFailure(false);
    }
  };

  // Fetch real challenge details from backend if available
  useEffect(() => {
    let mounted = true;
    async function fetchChallenge() {
      if (!challengeId) return;
      try {
        let chDetail: BackendChallengeDetail | null = null;
        try {
          chDetail = await api.challenges.get(challengeId);
        } catch {
          // If challengeId is a slug or wasn't found by ID, lookup in challenges list
          const list = await api.challenges.list();
          const found = list.items.find(i => i.id === challengeId || i.slug === challengeId);
          if (found) {
            chDetail = await api.challenges.get(found.id);
          }
        }

        if (mounted && chDetail) {
          const starterMap: Record<string, string> = {};
          chDetail.languages?.forEach(l => {
            const frontendKey = l.key === 'python3' ? 'python' : l.key;
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
        console.warn('Could not load challenge from backend, using baseline challenge:', err);
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

  // Poll submission status until completed or failed
  const pollSubmission = async (subId: string): Promise<BackendSubmission> => {
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 700));
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

      let logAppend = `[RESULT] Execution completed with status: ${finished.status.toUpperCase()}\n`;
      logAppend += `[SUMMARY] Tests Passed: ${passCount}/${totalCount}\n`;
      if (finished.compile_error) {
        logAppend += `[COMPILE ERROR]\n${finished.compile_error}\n`;
      }
      if (finished.error_message) {
        logAppend += `[RUNTIME ERROR]\n${finished.error_message}\n`;
      }
      finished.results?.forEach(r => {
        logAppend += `[TEST ${r.label}] ${r.status} (${r.runtime_ms ?? 0}ms, ${r.memory_kb ?? 0}KB)\n`;
      });

      setConsoleLogs(prev => prev + logAppend);
    } catch (err: any) {
      console.error('Run code error:', err);
      setErrorMessage(err?.message || 'Failed to run code. Please verify backend connection.');
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
      // Navigate with real submission ID directly into the assessment verification flow
      navigate(`/submissions/${finished.id}`);
    } catch (err: any) {
      console.error('Submit solution error:', err);
      setErrorMessage(err?.message || 'Failed to submit solution to backend.');
      setIsSubmitting(false);
    }
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
              <option value="java">Java</option>
            </select>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-500/10 border-b border-red-500/20 px-4 py-2 text-label-xs text-red-400 font-mono flex items-center justify-between">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-outline hover:text-primary">
            <Icon name="close" size={14} />
          </button>
        </div>
      )}

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
                <span className="font-mono text-label-xs text-outline uppercase tracking-wider">CHALLENGE</span>
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
            <div className="text-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              <p>{challenge.description}</p>
            </div>

            {/* Constraints */}
            {challenge.constraints.length > 0 && (
              <div className="flex flex-col gap-2">
                <span className="text-label-sm font-semibold uppercase text-primary tracking-wider font-mono">Constraints</span>
                <ul className="list-disc list-inside text-body-sm text-on-surface-variant font-mono space-y-1">
                  {challenge.constraints.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Examples */}
            <div className="flex flex-col gap-3">
              <span className="text-label-sm font-semibold uppercase text-primary tracking-wider font-mono">Sample Test Cases</span>
              {challenge.examples.map((ex, i) => (
                <div key={i} className="card bg-surface-container-low p-3.5 flex flex-col gap-1.5 font-mono text-code-sm">
                  <div className="flex items-start gap-2">
                    <span className="text-outline shrink-0">Input:</span>
                    <span className="text-primary whitespace-pre-wrap">{ex.input}</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-outline shrink-0">Output:</span>
                    <span className="text-emerald-400 whitespace-pre-wrap">{ex.output}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Monaco Editor & Output Execution Tray */}
        <div className={`w-full lg:w-[58%] flex flex-col bg-surface-container-lowest overflow-hidden ${
          activeTab !== 'problem' ? 'flex' : 'hidden lg:flex'
        }`}>
          {/* Editor Header / Language switcher */}
          <div className="h-9 bg-surface-container-low px-4 flex items-center justify-between border-b border-outline-variant shrink-0">
            <div className="flex items-center gap-2 text-label-xs font-mono text-on-surface-variant">
              <Icon name="code" size={14} className="text-primary" />
              <span>solution.{language === 'python' ? 'py' : language === 'javascript' ? 'js' : 'java'}</span>
            </div>

            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value as any)}
              className="md:hidden bg-surface-container border border-outline-variant rounded px-2 py-0.5 text-label-xs text-primary font-mono"
            >
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
            </select>
          </div>

          {/* Monaco Editor Container */}
          <div className={`flex-1 min-h-[240px] relative ${activeTab === 'output' ? 'hidden lg:block' : 'block'}`}>
            <Editor
              height="100%"
              language={language === 'python' ? 'python' : language === 'javascript' ? 'javascript' : 'java'}
              theme="vs-dark"
              value={code}
              onChange={(val) => handleCodeChange(val || '')}
              onMount={(editor) => {
                editor.onDidPaste((e) => {
                  try {
                    const pasteLen = editor.getModel()?.getValueInRange(e.range).length || 0;
                    void api.learning.recordTelemetry({
                      challenge_id: challenge.id,
                      paste_events: 1,
                      paste_length: pasteLen,
                    });
                  } catch {
                    // Non-blocking telemetry
                  }
                });
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                tabSize: 4,
                automaticLayout: true,
                readOnly: false,
                domReadOnly: false,
                contextmenu: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Execution & Output Panel (Split bottom on desktop, Tab on mobile) */}
          <div className={`h-72 lg:h-64 bg-surface-container-low border-t border-outline-variant flex flex-col shrink-0 ${
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
                  Test Results {lastSubmission ? `(${lastSubmission.passed}/${lastSubmission.total})` : ''}
                </button>
                <button
                  onClick={() => setActiveOutputTab('hints')}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors flex items-center gap-1 ${
                    activeOutputTab === 'hints' ? 'bg-surface-container text-amber-400 font-bold' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon name="lightbulb" size={13} />
                  <span>AI Hints {hintData ? `(L${hintData.hint_level})` : ''}</span>
                </button>
                <button
                  onClick={() => setActiveOutputTab('alternatives')}
                  className={`px-2.5 py-1 text-label-xs font-mono uppercase tracking-wider rounded transition-colors flex items-center gap-1 ${
                    activeOutputTab === 'alternatives' ? 'bg-surface-container text-sky-400 font-bold' : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  <Icon name="alt_route" size={13} />
                  <span>Alternatives</span>
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

              {lastSubmission && (
                <div className="flex items-center gap-2 text-label-xs font-mono text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{lastSubmission.passed} Passed / {lastSubmission.total} Total</span>
                </div>
              )}
            </div>

            {/* Output Panel Content */}
            <div className="flex-1 p-3 overflow-y-auto font-mono text-code-sm">
              {!hasRun ? (
                <div className="h-full flex flex-col items-center justify-center text-outline gap-1">
                  <Icon name="play_circle" size={24} />
                  <span>Click "Run Code" to execute assertions on live backend</span>
                </div>
              ) : activeOutputTab === 'tests' ? (
                <div className="space-y-2">
                  {lastSubmission?.results && lastSubmission.results.length > 0 ? (
                    lastSubmission.results.map((t, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 rounded bg-surface-container-lowest border border-outline-variant text-label-xs">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${t.status === 'passed' ? 'bg-emerald-400' : 'bg-red-400'}`} />
                          <span className="text-primary font-medium">{t.label}</span>
                          <span className="text-outline">({t.runtime_ms ?? 0}ms)</span>
                        </div>
                        <div className="text-on-surface-variant mt-1 sm:mt-0">
                          Verdict: <code className={t.status === 'passed' ? 'text-emerald-400' : 'text-red-400'}>{t.status}</code>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-on-surface-variant text-code-sm">
                      {isRunning ? 'Executing test suite on backend...' : 'No test results returned yet.'}
                    </div>
                  )}
                  {lastSubmission && lastSubmission.passed < lastSubmission.total && (
                    <div className="pt-2">
                      <button
                        onClick={handleExplainFailure}
                        disabled={explainingFailure}
                        className="btn btn-secondary btn-sm flex items-center gap-1.5 text-label-xs font-mono text-amber-400"
                      >
                        <Icon name="psychology" size={14} />
                        <span>{explainingFailure ? 'Analyzing Failure...' : 'Explain Failed Tests with Brain'}</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : activeOutputTab === 'hints' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-outline-variant">
                    <span className="text-label-xs text-outline font-mono">Progressive Levels:</span>
                    {[1, 2, 3, 4].map(lvl => (
                      <button
                        key={lvl}
                        onClick={() => handleFetchHint(lvl)}
                        disabled={hintLoading}
                        className={`px-2 py-0.5 rounded text-label-xs font-mono uppercase ${
                          currentHintLevel === lvl && hintData
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold'
                            : 'bg-surface-container-lowest text-on-surface-variant hover:text-primary'
                        }`}
                      >
                        Level {lvl}: {lvl === 1 ? 'Concept' : lvl === 2 ? 'Location' : lvl === 3 ? 'Action' : 'Detailed'}
                      </button>
                    ))}
                  </div>

                  {hintLoading ? (
                    <div className="text-amber-400 flex items-center gap-2 text-label-xs">
                      <Icon name="sync" size={14} className="animate-spin" />
                      <span>Brain is synthesizing progressive hint from execution diagnostics...</span>
                    </div>
                  ) : hintData ? (
                    <div className="card p-3 bg-surface-container-lowest border border-amber-500/30 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-label-xs font-bold text-amber-400 uppercase tracking-wider">{hintData.hint_title}</span>
                        {hintData.target_area && (
                          <span className="badge badge-neutral text-label-xs">{hintData.target_area}</span>
                        )}
                      </div>
                      <p className="text-body-sm text-on-surface-variant leading-relaxed font-sans">{hintData.hint_text}</p>
                    </div>
                  ) : (
                    <div className="text-outline text-label-xs flex items-center justify-between">
                      <span>Select a level above to generate a progressive hint from the central AI Brain.</span>
                      <button
                        onClick={() => handleFetchHint(1)}
                        className="btn btn-secondary btn-sm text-label-xs font-mono"
                      >
                        Get Level 1 Hint
                      </button>
                    </div>
                  )}
                </div>
              ) : activeOutputTab === 'alternatives' ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-outline-variant">
                    <span className="text-label-xs text-outline font-mono">Alternative Solution Paradigms:</span>
                    <button
                      onClick={handleFetchAlternatives}
                      disabled={altLoading}
                      className="btn btn-secondary btn-sm text-label-xs font-mono flex items-center gap-1 text-sky-400"
                    >
                      <Icon name="sync" size={13} className={altLoading ? 'animate-spin' : ''} />
                      <span>{altLoading ? 'Analyzing...' : 'Analyze Alternatives'}</span>
                    </button>
                  </div>

                  {altLoading ? (
                    <div className="text-sky-400 flex items-center gap-2 text-label-xs">
                      <Icon name="sync" size={14} className="animate-spin" />
                      <span>Brain is evaluating algorithmic trade-offs and complexity models...</span>
                    </div>
                  ) : altData ? (
                    <div className="space-y-2">
                      <p className="text-label-xs text-on-surface-variant font-sans italic">{altData.current_approach_summary}</p>
                      {altData.alternatives.map((alt, idx) => (
                        <div key={idx} className="p-2.5 rounded bg-surface-container-lowest border border-outline-variant space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-primary font-bold text-label-xs">{alt.approach_name}</span>
                            <div className="flex items-center gap-2 text-label-xs text-outline font-mono">
                              <span>Time: {alt.time_complexity}</span>
                              <span>·</span>
                              <span>Space: {alt.space_complexity}</span>
                            </div>
                          </div>
                          <p className="text-label-xs text-on-surface-variant font-sans">{alt.description}</p>
                          <div className="text-label-xs text-amber-400 font-sans">Trade-offs: {alt.trade_offs}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-outline text-label-xs">
                      Click "Analyze Alternatives" to compare your solution with alternative algorithmic approaches.
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {failureExplanation && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded space-y-1">
                      <div className="flex items-center gap-2 text-red-400 text-label-xs font-bold uppercase">
                        <Icon name="error" size={14} />
                        <span>AI Diagnostic: {failureExplanation.summary}</span>
                      </div>
                      <p className="text-label-xs text-on-surface-variant font-sans"><strong>Suspected Cause:</strong> {failureExplanation.suspected_cause}</p>
                      <p className="text-label-xs text-emerald-400 font-sans"><strong>Suggested Fix:</strong> {failureExplanation.suggested_fix}</p>
                    </div>
                  )}
                  <pre className="text-on-surface-variant m-0 text-code-sm whitespace-pre-wrap">
                    {consoleLogs || 'No output recorded.'}
                  </pre>
                </div>
              )}
            </div>

            {/* Bottom Action Footer with Run & Submit */}
            <div className="h-12 bg-surface-container-lowest border-t border-outline-variant px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-label-xs text-outline font-mono">
                <span>Tab size: 4</span>
                <span>·</span>
                <span>UTF-8</span>
                {draftSaved && (
                  <span className="text-emerald-400 font-sans ml-2 flex items-center gap-1">
                    <Icon name="check" size={12} />
                    <span>Draft autosaved (offline cached)</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunCode}
                  disabled={isRunning || isSubmitting}
                  className="btn btn-secondary btn-sm flex items-center gap-1.5 font-mono"
                >
                  <Icon name={isRunning ? 'sync' : 'play_arrow'} size={16} className={isRunning ? 'animate-spin' : ''} />
                  <span>{isRunning ? 'Running...' : 'Run Code'}</span>
                </button>

                <button
                  onClick={handleSubmitSolution}
                  disabled={isRunning || isSubmitting}
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
