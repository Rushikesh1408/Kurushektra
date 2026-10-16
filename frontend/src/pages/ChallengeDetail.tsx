import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";
import { Workspace } from "../components/workspace/Workspace";
import { api, type ChallengeDetail as Detail } from "../lib/api";

export default function ChallengeDetail() {
  const { slug } = useParams();
  const [c, setC] = useState<Detail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<Detail>(`/challenges/${encodeURIComponent(slug ?? "")}`).then(setC).catch((e) => setError(e.message));
  }, [slug]);

  if (error) return <main className="p-12 text-center"><p role="alert" className="text-bad">{error}</p><Link className="text-accent" to="/challenges">Back to challenges</Link></main>;
  if (!c) return <p className="p-12 text-center text-muted">Loading challenge…</p>;

  return (
    <main className="mx-auto grid max-w-7xl gap-8 px-4 py-10 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <div className="space-y-6">
      <div>
        <Link to="/challenges" className="text-sm text-muted hover:text-fg">Back to challenges</Link>
        <h1 className="mt-2 text-2xl font-semibold">{c.title}</h1>
        <div className="mt-2 flex flex-wrap gap-2">
          <Badge tone="accent">{c.difficulty}</Badge>
          <Badge>{c.time_limit_ms} ms limit</Badge>
          <Badge>{Math.round(c.memory_limit_kb / 1000)} MB limit</Badge>
          {c.languages.map((l) => <Badge key={l.key}>{l.display_name}</Badge>)}
        </div>
      </div>
      {/* Rendered as text, not HTML, so teacher-authored content can't inject script. */}
      <Card className="whitespace-pre-wrap p-5">{c.description_md}</Card>
      <section>
        <h2 className="mb-2 font-medium">Sample tests</h2>
        {c.visible_tests.length === 0 ? <p className="text-sm text-muted">No sample tests are shown for this challenge.</p> : (
          <div className="space-y-3">
            {c.visible_tests.map((t, i) => (
              <Card key={i} className="grid gap-4 p-4 font-mono text-sm sm:grid-cols-2">
                <div><p className="mb-1 font-sans text-xs text-muted">Input</p><pre className="whitespace-pre-wrap">{t.input_data || "(empty)"}</pre></div>
                <div><p className="mb-1 font-sans text-xs text-muted">Expected output</p><pre className="whitespace-pre-wrap">{t.expected_output}</pre></div>
              </Card>
            ))}
          </div>
        )}
        {c.hidden_test_count > 0 && <p className="mt-3 text-sm text-muted">{c.hidden_test_count} more hidden tests run when you submit.</p>}
      </section>
      </div>
      <Workspace key={c.id} challenge={c} />
    </main>
  );
}
