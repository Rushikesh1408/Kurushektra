import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Badge } from "../components/ui/Badge";
import { Card } from "../components/ui/Card";

const sampleCode = `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid
    return lo if nums[lo] == target else -1`;

const pipeline = [
  ["Hidden tests", "Code runs in an isolated sandbox against visible and hidden cases. Timeouts and memory limits are enforced."],
  ["Static analysis", "Findings point at specific lines: complexity, repetition, unsafe calls, common mistakes."],
  ["Similarity", "Submissions are compared on normalized structure, with common boilerplate discounted."],
  ["Follow-up questions", "Questions are written from the submitted code, such as why a loop condition is safe or what an empty input does."],
  ["Debugging task", "The student fixes a deliberately broken copy of their solution and explains the fix."],
];

export default function Landing() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-16 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div className="self-center">
          <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
            Don't ask who wrote the code. Ask whether they understand it.
          </h1>
          <p className="mt-5 max-w-prose text-lg text-muted">
            CodeArena grades what a student can explain, change, and debug in their own submission. Hidden tests still
            matter, but they are one piece of evidence among several.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#how"
              className="inline-flex h-10 items-center rounded-control bg-accent px-4 text-sm font-medium text-white hover:brightness-110"
            >
              See how an assessment works
            </a>
            <Link
              to="/design-system"
              className="inline-flex h-10 items-center rounded-control border border-line bg-raised px-4 text-sm font-medium hover:border-accent/60"
            >
              Browse the design system
            </Link>
          </div>
        </div>

        <figure className="space-y-3" aria-label="Sample submission and generated follow-up question">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-2 text-xs text-muted">
              <span className="font-mono">search.py</span>
              <Badge>Sample submission</Badge>
            </div>
            <pre className="overflow-x-auto p-4 font-mono text-[13px] leading-6" tabIndex={0}>
              <code>{sampleCode}</code>
            </pre>
          </Card>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <Card className="border-violet/50 p-4">
              <p className="text-xs font-medium text-violet">Follow-up question, edge case</p>
              <p className="mt-2">
                Your loop runs while <code className="rounded bg-raised px-1 font-mono text-sm">lo &lt; hi</code>. Walk
                through what happens for an array with exactly one element, and why the final check is needed.
              </p>
            </Card>
          </motion.div>
          <figcaption className="text-xs text-muted">Illustration only. Real questions are generated per submission.</figcaption>
        </figure>
      </section>

      <section id="how" className="border-t border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-2xl font-semibold">What happens after a student submits</h2>
          <ol className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {pipeline.map(([title, body], i) => (
              <li key={title}>
                <Card className="h-full p-4">
                  <div className="font-mono text-sm text-accent">{i + 1}</div>
                  <h3 className="mt-2 font-medium">{title}</h3>
                  <p className="mt-2 text-sm text-muted">{body}</p>
                </Card>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold">Where we stay honest</h2>
            <p className="mt-3 max-w-prose text-muted">
              No tool can reliably tell whether code was written by an AI. CodeArena includes an optional AI-origin
              module, marked experimental, that can report "unavailable" or "inconclusive". It never changes a score and
              never appears as an accusation.
            </p>
          </div>
          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Badge tone="experimental">Experimental</Badge>
              <span className="text-sm font-medium">AI-origin indicators</span>
            </div>
            <p className="mt-3 text-sm text-muted">
              Status: <span className="text-fg">Unavailable</span>. No validated detector is connected. Scores are built
              only from tests, code quality, follow-up answers, and debugging.
            </p>
          </Card>
        </div>
      </section>

      <footer className="border-t border-line px-4 py-6 text-center text-sm text-muted">
        CodeArena, build phase 1 of 7: architecture, schema, and design system.
      </footer>
    </main>
  );
}
