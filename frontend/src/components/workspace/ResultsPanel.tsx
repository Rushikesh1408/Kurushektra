import { useEffect, useState } from "react";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import type { ResultStatus, Submission } from "../../lib/api";

const labels: Record<ResultStatus, string> = {
  accepted: "Passed", wrong_answer: "Wrong answer", compile_error: "Compile error", runtime_error: "Runtime error",
  timeout: "Time limit exceeded", memory_limit: "Memory limit exceeded", output_limit: "Output limit exceeded",
};
const tone = (s: ResultStatus) => (s === "accepted" ? "ok" : s === "wrong_answer" ? "bad" : "warn") as "ok" | "bad" | "warn";
const pre = "mt-1 overflow-x-auto whitespace-pre-wrap rounded-control bg-base p-2 font-mono text-xs";

export function ResultsPanel({ sub }: { sub: Submission | null }) {
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    fetch("/api/v1/demo/status")
      .then((r) => r.json())
      .then((d) => { if (d.demo_mode) setIsDemo(true); })
      .catch(() => {});
  }, []);

  const hasDemoMarker = isDemo || 
    Boolean(sub?.compile_error?.includes("[DEMO SIMULATION]")) || 
    Boolean(sub?.custom_output?.includes("[DEMO SIMULATION]")) ||
    Boolean(sub?.results.some((r) => r.output_excerpt?.includes("[DEMO SIMULATION]")));

  if (!sub) return <Card className="p-4 text-sm text-muted">Run your code to see results here. Run checks the sample tests; Submit also runs the hidden ones.</Card>;
  if (sub.status === "queued" || sub.status === "running") {
    return <Card className="p-4 text-sm" role="status">{sub.status === "queued" ? "Waiting for the code runner…" : "Running your code…"}</Card>;
  }
  if (sub.status === "failed") return <Card className="border-bad/50 p-4 text-sm" role="alert">{sub.error_message ?? "The run failed."}</Card>;

  if (sub.custom_input !== null) {
    return (
      <Card className="space-y-2 p-4 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-medium">Custom input {sub.custom_status && sub.custom_status !== "ok" && <Badge tone="warn">{sub.custom_status.replace("_", " ")}</Badge>}</p>
          {hasDemoMarker && (
            <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
              DEMO SIMULATION — NOT LIVE EXECUTION
            </span>
          )}
        </div>
        {sub.compile_error && <pre className={pre}>{sub.compile_error}</pre>}
        <p className="text-xs text-muted">Output</p>
        <pre className={pre}>{sub.custom_output || "(no output)"}</pre>
      </Card>
    );
  }

  return (
    <Card className="space-y-3 p-4 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium" aria-live="polite">
          {sub.passed} of {sub.total} tests passed{sub.is_run_only ? " (samples only)" : ""}
        </p>
        {hasDemoMarker && (
          <span className="rounded bg-amber-500/15 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
            DEMO SIMULATION — NOT LIVE EXECUTION
          </span>
        )}
      </div>
      {sub.compile_error && <div><p className="text-xs text-muted">Compiler output</p><pre className={pre}>{sub.compile_error}</pre></div>}
      <ul className="space-y-2">
        {sub.results.map((r) => (
          <li key={r.label} className="rounded-control border border-line p-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>{r.label}</span>
              <span className="flex items-center gap-2 text-xs text-muted">
                {r.runtime_ms !== null && <span>{r.runtime_ms} ms</span>}
                {r.memory_kb !== null && <span>{(r.memory_kb / 1024).toFixed(1)} MB</span>}
                <Badge tone={tone(r.status)}>{labels[r.status]}</Badge>
              </span>
            </div>
            {!r.is_hidden && r.status !== "accepted" && r.status !== "compile_error" && (
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <div><p className="text-xs text-muted">Input</p><pre className={pre}>{r.input_data || "(empty)"}</pre></div>
                <div><p className="text-xs text-muted">Expected</p><pre className={pre}>{r.expected_output}</pre></div>
                <div><p className="text-xs text-muted">Your output</p><pre className={pre}>{r.output_excerpt || "(none)"}</pre></div>
              </div>
            )}
          </li>
        ))}
      </ul>
      {sub.correctness_ratio !== null && !sub.is_run_only && (
        <p className="text-xs text-muted">Test score: {Math.round(sub.correctness_ratio * 100)}%. Follow-up questions appear below.</p>
      )}
    </Card>
  );
}
