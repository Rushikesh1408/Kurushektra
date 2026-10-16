import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { api, type ChallengeListItem, type Page } from "../lib/api";
import { useAuth } from "../lib/auth";

const tone = { easy: "ok", medium: "warn", hard: "bad" } as const;

export default function Challenges() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<ChallengeListItem> | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    api<Page<ChallengeListItem>>(`/challenges?page=${page}&page_size=10`).then(setData).catch((e) => setError(e.message));
  }, [page]);

  const canCreate = user?.role === "teacher" || user?.role === "admin";
  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Challenges</h1>
        {canCreate && (
          <Link to="/challenges/new" className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-medium text-white hover:brightness-110">
            New challenge
          </Link>
        )}
      </div>
      {error && <p role="alert" className="mt-6 text-bad">{error}</p>}
      {!data && !error && <p className="mt-6 text-muted">Loading challenges…</p>}
      {data && data.items.length === 0 && (
        <Card className="mt-6 p-8 text-center">
          <p className="font-medium">No challenges yet</p>
          <p className="mt-1 text-sm text-muted">{canCreate ? "Create the first challenge to get started." : "Your teacher hasn't published any challenges yet."}</p>
        </Card>
      )}
      {data && data.items.length > 0 && (
        <>
          <ul className="mt-6 space-y-3">
            {data.items.map((c) => (
              <li key={c.id}>
                <Link to={`/challenges/${c.slug}`}>
                  <Card className="flex items-center justify-between p-4 hover:border-accent/60">
                    <span className="font-medium">{c.title}</span>
                    <span className="flex gap-2">
                      {c.is_fixture && <Badge>Sample</Badge>}
                      {!c.is_published && <Badge tone="warn">Draft</Badge>}
                      <Badge tone={tone[c.difficulty as keyof typeof tone] ?? "neutral"}>{c.difficulty}</Badge>
                    </span>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between text-sm text-muted">
            <span>{data.total} total</span>
            <span className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page * data.page_size >= data.total} onClick={() => setPage(page + 1)}>Next</Button>
            </span>
          </div>
        </>
      )}
    </main>
  );
}
