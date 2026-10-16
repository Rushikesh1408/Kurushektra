import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ApiError, api } from "../lib/api";

interface Case { input_data: string; expected_output: string; is_hidden: boolean }
const select = "h-10 w-full rounded-control border border-line bg-base px-3 text-sm";
const area = "w-full rounded-control border border-line bg-base p-3 font-mono text-sm";

export default function NewChallenge() {
  const nav = useNavigate();
  const toast = useToast();
  const [langs, setLangs] = useState<{ key: string; display_name: string }[]>([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [difficulty, setDifficulty] = useState("easy");
  const [lang, setLang] = useState("python3");
  const [starter, setStarter] = useState("");
  const [publish, setPublish] = useState(false);
  const [cases, setCases] = useState<Case[]>([{ input_data: "", expected_output: "", is_hidden: false }]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api<typeof langs>("/languages").then(setLangs).catch(() => undefined); }, []);
  const setCase = (i: number, patch: Partial<Case>) => setCases(cases.map((c, j) => (j === i ? { ...c, ...patch } : c)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await api<{ slug: string }>("/challenges", {
        method: "POST",
        body: JSON.stringify({
          title, description_md: desc, difficulty, is_published: publish,
          languages: [{ key: lang, starter_code: starter }],
          test_cases: cases.filter((c) => c.expected_output.trim() !== ""),
        }),
      });
      toast("Challenge created");
      nav(`/challenges/${created.slug}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.fields[0] ? `${err.fields[0].field}: ${err.fields[0].message}` : err.message : "Couldn't reach the server.");
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-2xl font-semibold">New challenge</h1>
      <form onSubmit={submit} className="mt-6 space-y-6" noValidate>
        <Card className="space-y-4 p-5">
          <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <div className="space-y-1.5"><label htmlFor="desc" className="text-sm font-medium">Description</label>
            <textarea id="desc" className={area} rows={6} value={desc} onChange={(e) => setDesc(e.target.value)} required /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><label htmlFor="diff" className="text-sm font-medium">Difficulty</label>
              <select id="diff" className={select} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
                <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option></select></div>
            <div className="space-y-1.5"><label htmlFor="lang" className="text-sm font-medium">Language</label>
              <select id="lang" className={select} value={lang} onChange={(e) => setLang(e.target.value)}>
                {langs.length === 0 && <option value="python3">Python 3</option>}
                {langs.map((l) => <option key={l.key} value={l.key}>{l.display_name}</option>)}</select></div>
          </div>
          <div className="space-y-1.5"><label htmlFor="starter" className="text-sm font-medium">Starter code (optional)</label>
            <textarea id="starter" className={area} rows={4} value={starter} onChange={(e) => setStarter(e.target.value)} /></div>
        </Card>

        <section aria-labelledby="tests" className="space-y-3">
          <h2 id="tests" className="font-medium">Test cases</h2>
          <p className="text-sm text-muted">Hidden tests are never shown to students. Mark a case visible to use it as a sample.</p>
          {cases.map((c, i) => (
            <Card key={i} className="space-y-3 p-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label htmlFor={`in${i}`} className="text-xs text-muted">Input</label>
                  <textarea id={`in${i}`} className={area} rows={2} value={c.input_data} onChange={(e) => setCase(i, { input_data: e.target.value })} /></div>
                <div><label htmlFor={`out${i}`} className="text-xs text-muted">Expected output</label>
                  <textarea id={`out${i}`} className={area} rows={2} value={c.expected_output} onChange={(e) => setCase(i, { expected_output: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!c.is_hidden} onChange={(e) => setCase(i, { is_hidden: !e.target.checked })} /> Show to students as a sample</label>
                {cases.length > 1 && <Button type="button" variant="ghost" size="sm" onClick={() => setCases(cases.filter((_, j) => j !== i))}>Remove case</Button>}
              </div>
            </Card>
          ))}
          <Button type="button" variant="secondary" onClick={() => setCases([...cases, { input_data: "", expected_output: "", is_hidden: true }])}>Add test case</Button>
        </section>

        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={publish} onChange={(e) => setPublish(e.target.checked)} /> Publish now so students can see it</label>
        {error && <p role="alert" className="text-sm text-bad">{error}</p>}
        <Button type="submit" loading={busy}>Create challenge</Button>
      </form>
    </main>
  );
}
