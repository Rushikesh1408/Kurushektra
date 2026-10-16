import { useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";

// Full class names so Tailwind can detect them at build time.
const swatches: Record<string, string> = {
  base: "bg-base", surface: "bg-surface", raised: "bg-raised", line: "bg-line", accent: "bg-accent",
  violet: "bg-violet", ok: "bg-ok", warn: "bg-warn", bad: "bg-bad",
};

export default function DesignSystem() {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const invalid = email.length > 0 && !email.includes("@");

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-12">
      <header>
        <h1 className="text-3xl font-semibold">Design system</h1>
        <p className="mt-2 text-muted">Tokens and primitives used across every CodeArena page. Toggle the theme in the header.</p>
      </header>

      <section aria-labelledby="colors">
        <h2 id="colors" className="mb-3 text-lg font-medium">Color tokens</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {Object.entries(swatches).map(([s, cls]) => (
            <div key={s}>
              <div className={`h-12 rounded-control border border-line ${cls}`} />
              <p className="mt-1 font-mono text-xs text-muted">{s}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="buttons">
        <h2 id="buttons" className="mb-3 text-lg font-medium">Buttons</h2>
        <div className="flex flex-wrap gap-3">
          <Button>Submit code</Button>
          <Button variant="secondary">Run samples</Button>
          <Button variant="ghost">Cancel</Button>
          <Button variant="danger">Delete challenge</Button>
          <Button loading>Running</Button>
          <Button disabled>Disabled</Button>
        </div>
      </section>

      <section aria-labelledby="badges">
        <h2 id="badges" className="mb-3 text-lg font-medium">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge>Draft</Badge>
          <Badge tone="ok">Accepted</Badge>
          <Badge tone="warn">Timeout</Badge>
          <Badge tone="bad">Wrong answer</Badge>
          <Badge tone="accent">Medium</Badge>
          <Badge tone="experimental">Experimental</Badge>
        </div>
      </section>

      <section aria-labelledby="forms">
        <h2 id="forms" className="mb-3 text-lg font-medium">Form field</h2>
        <Card className="max-w-md space-y-4 p-5">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={invalid ? "Enter an email address, like name@college.edu." : undefined}
            placeholder="name@college.edu"
          />
          <Button
            loading={saving}
            disabled={!email || invalid}
            onClick={() => {
              setSaving(true);
              setTimeout(() => setSaving(false), 800);
            }}
          >
            Save changes
          </Button>
        </Card>
      </section>

      <section aria-labelledby="empty">
        <h2 id="empty" className="mb-3 text-lg font-medium">Empty state</h2>
        <Card className="p-8 text-center">
          <p className="font-medium">No submissions yet</p>
          <p className="mt-1 text-sm text-muted">Open a challenge and submit your first solution to see results here.</p>
        </Card>
      </section>
    </main>
  );
}
