// Shared UI components used across all layouts

import React from 'react';
import type { Difficulty, SubmissionStatus, MasteryLevel } from '../../types';

// ── Icon wrapper ──────────────────────────────────────────────────────────
interface IconProps { name: string; size?: number; className?: string; }
export function Icon({ name, size = 18, className = '' }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined ${className}`}
      style={{ fontSize: size }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

// ── Difficulty Badge ──────────────────────────────────────────────────────
export function DifficultyBadge({ difficulty }: { difficulty?: Difficulty | string | null }) {
  const diff = (difficulty || 'easy').toLowerCase();
  const cls = diff === 'hard' ? 'difficulty-hard' : diff === 'medium' ? 'difficulty-medium' : 'difficulty-easy';
  return (
    <span className={`text-label-sm font-semibold capitalize ${cls}`}>
      {diff}
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status?: SubmissionStatus | string | null }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    accepted:           { cls: 'badge-success',  label: 'Accepted' },
    wrong_answer:       { cls: 'badge-error',    label: 'Wrong Answer' },
    partial_pass:       { cls: 'badge-warning',  label: 'Partial Pass' },
    compile_error:      { cls: 'badge-error',    label: 'Compile Error' },
    runtime_error:      { cls: 'badge-error',    label: 'Runtime Error' },
    timeout:            { cls: 'badge-warning',  label: 'Time Limit Exceeded' },
    pending:            { cls: 'badge-neutral',  label: 'Pending' },
    queued:             { cls: 'badge-neutral',  label: 'Queued' },
    running:            { cls: 'badge-info',     label: 'Running' },
    completed:          { cls: 'badge-success',  label: 'Completed' },
    failed:             { cls: 'badge-error',    label: 'Failed' },
    service_unavailable:{ cls: 'badge-neutral',  label: 'Service Unavailable' },
    live_execution:     { cls: 'badge-info',     label: 'Live Execution' },
    simulated_demo:     { cls: 'badge-warning',  label: 'Simulated Demo' },
  };
  const key = (status || 'pending').toLowerCase();
  const item = cfg[key] || { cls: 'badge-neutral', label: key.replace(/_/g, ' ') };
  return <span className={`badge ${item.cls}`}>{item.label}</span>;
}

// ── Mastery Badge ─────────────────────────────────────────────────────────
export function MasteryBadge({ level }: { level?: MasteryLevel | string | null }) {
  const cfg: Record<string, { cls: string; label: string }> = {
    not_started:  { cls: 'badge-neutral', label: 'Not Started' },
    struggling:   { cls: 'badge-error',   label: 'Struggling' },
    developing:   { cls: 'badge-warning', label: 'Developing' },
    in_progress:  { cls: 'badge-warning', label: 'In Progress' },
    demonstrated: { cls: 'badge-info',    label: 'Demonstrated' },
    mastered:     { cls: 'badge-success', label: 'Mastered' },
  };
  const key = (level || 'developing').toLowerCase();
  const item = cfg[key] || { cls: 'badge-neutral', label: key.replace(/_/g, ' ') };
  return <span className={`badge ${item.cls}`}>{item.label}</span>;
}

// ── Simulated Demo Label ──────────────────────────────────────────────────
export function SimulatedDemoLabel() {
  return (
    <span className="demo-label">
      <span className="status-dot status-dot-warning" />
      Simulated Demo Result
    </span>
  );
}

// ── Live Execution Label ──────────────────────────────────────────────────
export function LiveLabel() {
  return (
    <span className="live-label">
      <span className="status-dot status-dot-active" />
      Live Execution
    </span>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────
interface ProgressBarProps { value: number; max?: number; variant?: 'primary' | 'success' | 'warning'; className?: string; }
export function ProgressBar({ value, max = 100, variant = 'primary', className = '' }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className={`progress ${className}`}>
      <div className={`progress-bar progress-${variant}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <Icon name="progress_activity" size={size} className={`animate-spin text-primary ${className}`} />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────
interface EmptyStateProps { icon?: string; title: string; description?: string; action?: React.ReactNode; }
export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Icon name={icon} size={40} className="text-outline" />
      <p className="text-headline-sm text-on-surface">{title}</p>
      {description && <p className="text-body-md text-on-surface-variant max-w-sm">{description}</p>}
      {action}
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────
export function ErrorState({ title, message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
      <Icon name="error" size={40} className="text-error" />
      <p className="text-headline-sm text-on-surface">{title || 'Something went wrong'}</p>
      <p className="text-body-md text-on-surface-variant max-w-sm">{message}</p>
      {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
interface CardProps { children: React.ReactNode; className?: string; elevated?: boolean; }
export function Card({ children, className = '', elevated = false }: CardProps) {
  return (
    <div className={`${elevated ? 'card-elevated' : 'card'} ${className}`}>
      {children}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────
export function Skeleton({ className = '', height = '1rem' }: { className?: string; height?: string }) {
  return <div className={`skeleton ${className}`} style={{ height }} />;
}

// ── Tabs (simple) ─────────────────────────────────────────────────────────
interface Tab { id: string; label: string; icon?: string; }
interface TabsProps { tabs: Tab[]; active: string; onChange: (id: string) => void; }
export function Tabs({ tabs, active, onChange }: TabsProps) {
  return (
    <div className="tab-bar">
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab ${active === t.id ? 'tab-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <Icon name={t.icon} size={14} />}
          {t.label}
        </button>
      ))}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────
interface SectionHeaderProps { icon?: string; title: string; subtitle?: string; action?: React.ReactNode; }
export function SectionHeader({ icon, title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-3 mb-4 border-b border-outline-variant">
      <div className="flex items-center gap-2">
        {icon && <Icon name={icon} size={20} className="text-outline" />}
        <h2 className="text-headline-md text-primary">{title}</h2>
        {subtitle && <span className="text-code-sm text-outline">{subtitle}</span>}
      </div>
      {action}
    </div>
  );
}

// ── Code Block ────────────────────────────────────────────────────────────
export function CodeBlock({ code, language = '' }: { code: string; language?: string }) {
  return (
    <div className="bg-surface-container-lowest rounded border border-outline-variant overflow-x-auto">
      {language && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-outline-variant">
          <span className="text-label-xs text-outline">{language}</span>
        </div>
      )}
      <pre className="text-code-sm text-on-surface-variant p-3 m-0 overflow-x-auto whitespace-pre leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────
interface MetricProps { label: string; value: string | number; icon?: string; sub?: string; }
export function MetricCard({ label, value, icon, sub }: MetricProps) {
  return (
    <div className="card p-4 flex flex-col gap-1">
      <div className="flex items-center gap-2 text-on-surface-variant">
        {icon && <Icon name={icon} size={16} />}
        <span className="text-code-sm uppercase tracking-wider">{label}</span>
      </div>
      <span className="text-headline-md text-primary font-bold">{value}</span>
      {sub && <span className="text-body-sm text-on-surface-variant">{sub}</span>}
    </div>
  );
}

// ── Kbd ───────────────────────────────────────────────────────────────────
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1 py-0.5 bg-surface-container-high text-on-surface-variant text-label-sm rounded border border-outline-variant">
      {children}
    </kbd>
  );
}
