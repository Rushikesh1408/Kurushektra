import type { HTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type Tone = "neutral" | "ok" | "warn" | "bad" | "accent" | "experimental";

const tones: Record<Tone, string> = {
  neutral: "border-line text-muted",
  ok: "border-ok/40 text-ok bg-ok/10",
  warn: "border-warn/40 text-warn bg-warn/10",
  bad: "border-bad/40 text-bad bg-bad/10",
  accent: "border-accent/40 text-accent bg-accent/10",
  experimental: "border-violet/50 text-violet bg-violet/10 border-dashed",
};

export function Badge({ tone = "neutral", className, ...rest }: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", tones[tone], className)}
      {...rest}
    />
  );
}
