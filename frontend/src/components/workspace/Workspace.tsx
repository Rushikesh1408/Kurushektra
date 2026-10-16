import Editor from "@monaco-editor/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError, type ChallengeDetail, type Submission, type SubmissionListItem, type Page } from "../../lib/api";
import { useToast } from "../Toast";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FollowUpQuestions } from "./FollowUpQuestions";
import { ResultsPanel } from "./ResultsPanel";

const monacoLang: Record<string, string> = { python3: "python", cpp: "cpp", java: "java", javascript: "javascript" };
const MAX_POLLS = 120;

export function Workspace({ challenge, pollMs = 1000 }: { challenge: ChallengeDetail; pollMs?: number }) {
  const toast = useToast();
  const [lang, setLang] = useState(challenge.languages[0]?.key ?? "python3");
  const [codes, setCodes] = useState<Record<string, string>>(
    Object.fromEntries(challenge.languages.map((l) => [l.key, l.starter_code])),
  );
  const [custom, setCustom] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [sub, setSub] = useState<Submission | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [history, setHistory] = useState<SubmissionListItem[]>([]);
  const polls = useRef(0);

  const loadHistory = useCallback(() => {
    api<Page<SubmissionListItem>>(`/challenges/${challenge.id}/submissions?page_size=10`).then((p) => setHistory(p.items)).catch(() => undefined);
  }, [challenge.id]);
  useEffect(loadHistory, [loadHistory]);

  // Poll until the runner finishes the job.
  useEffect(() => {
    if (!sub || (sub.status !== "queued" && sub.status !== "running")) return;
    if (polls.current++ > MAX_POLLS) {
      setSub({ ...sub, status: "failed", error_message: "This is taking too long. Check the history below in a moment." });
      return;
    }
    const t = setTimeout(() => {
      api<Submission>(`/submissions/${sub.id}`).then((s) => {
        setSub(s);
        if (s.status === "completed" || s.status === "failed") { setBusy(false); if (!s.is_run_only) loadHistory(); }
      }).catch(() => { setBusy(false); toast("Lost connection while waiting for results.", "bad"); });
    }, pollMs);
    return () => clearTimeout(t);
  }, [sub, pollMs, loadHistory, toast]);

  async function start(kind: "run" | "submit") {
    setBusy(true);
    setConfirming(false);
    polls.current = 0;
    try {
      const body = { language: lang, source_code: codes[lang] ?? "", ...(kind === "run" && useCustom ? { custom_input: custom } : {}) };
      const path = kind === "run" ? `/challenges/${challenge.id}/run` : `/challenges/${challenge.id}/submissions`;
      setSub(await api<Submission>(path, { method: "POST", body: JSON.stringify(body) }));
    } catch (e) {
      setBusy(false);
      toast(e instanceof ApiError ? (e.fields[0]?.message ?? e.message) : "Couldn't reach the server.", "bad");
    }
  }

  async function openPast(id: string) {
    try {
      const s = await api<Submission>(`/submissions/${id}`);
      setLang(s.language);
      setCodes((c) => ({ ...c, [s.language]: s.source_code }));
      setSub(s);
    } catch { toast("Couldn't load that submission.", "bad"); }
  }

  const dark = document.documentElement.dataset.theme !== "light";
  return (
    <div className="space-y-3">
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">Language</span>
            <select value={lang} onChange={(e) => setLang(e.target.value)} className="h-8 rounded-control border border-line bg-base px-2 text-sm">
              {challenge.languages.map((l) => <option key={l.key} value={l.key}>{l.display_name}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => start("run")}>Run</Button>
            <Button size="sm" disabled={busy} onClick={() => setConfirming(true)}>Submit</Button>
          </div>
        </div>
        <Editor
          height="360px" language={monacoLang[lang] ?? "plaintext"} theme={dark ? "vs-dark" : "light"}
          value={codes[lang] ?? ""} onChange={(v) => setCodes((c) => ({ ...c, [lang]: v ?? "" }))}
          options={{ minimap: { enabled: false }, fontSize: 14, fontFamily: "JetBrains Mono, monospace", scrollBeyondLastLine: false, ariaLabel: "Code editor" }}
        />
        <div className="border-t border-line p-3">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={useCustom} onChange={(e) => setUseCustom(e.target.checked)} /> Run with custom input
          </label>
          {useCustom && (
            <textarea aria-label="Custom input" rows={3} value={custom} onChange={(e) => setCustom(e.target.value)}
              className="mt-2 w-full rounded-control border border-line bg-base p-2 font-mono text-sm" placeholder="Standard input for your program" />
          )}
        </div>
      </Card>

      <ResultsPanel sub={sub} />

      {sub && !sub.is_run_only && sub.status === "completed" && (
        <FollowUpQuestions submissionId={sub.id} />
      )}

      <Card className="p-3">
        <p className="mb-2 text-sm font-medium">Your submissions</p>
        {history.length === 0 ? <p className="text-sm text-muted">Nothing submitted yet.</p> : (
          <ul className="space-y-1">
            {history.map((h) => (
              <li key={h.id}>
                <button onClick={() => openPast(h.id)} className="flex w-full items-center justify-between rounded-control px-2 py-1.5 text-left text-sm hover:bg-raised">
                  <span>{new Date(h.created_at).toLocaleString()} · {h.language}</span>
                  <Badge tone={h.status === "completed" ? (h.passed === h.total ? "ok" : "warn") : "neutral"}>
                    {h.status === "completed" ? `${h.passed}/${h.total}` : h.status}
                  </Badge>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {confirming && (
        <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" className="fixed inset-0 z-40 grid place-items-center bg-black/60 p-4">
          <Card className="max-w-sm space-y-4 p-5">
            <h2 id="confirm-title" className="font-semibold">Submit your solution?</h2>
            <p className="text-sm text-muted">It runs against every test, including hidden ones, and is saved to your history.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setConfirming(false)}>Keep editing</Button>
              <Button onClick={() => start("submit")}>Submit solution</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
