// Shared UI primitives faithfully matching the Congnicode Stitch design tokens

import React from 'react';
import type { Difficulty, SubmissionStatus, MasteryLevel } from '../../types';

// ── Icon Wrapper ──────────────────────────────────────────────────────────
export interface IconProps {
  name: string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, className = '', style }: IconProps) {
  return (
    <span
      className={`material-symbols-outlined shrink-0 ${className}`}
      style={{ fontSize: size, ...style }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

// ── Difficulty Badge ──────────────────────────────────────────────────────
export function DifficultyBadge({ difficulty }: { difficulty?: Difficulty | string | null }) {
  const diff = (difficulty || 'easy').toLowerCase();
  const map: Record<string, { cls: string; dot: string; label: string }> = {
    easy:   { cls: 'badge-success', dot: 'bg-[#83D69A]', label: 'Easy' },
    medium: { cls: 'badge-warning', dot: 'bg-[#F2B866]', label: 'Medium' },
    hard:   { cls: 'badge-error',   dot: 'bg-[#E99AA4]', label: 'Hard' },
  };
  const item = map[diff] || map.easy;
  return (
    <span className={`badge ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.label}</span>
    </span>
  );
}

// ── Status Badge ──────────────────────────────────────────────────────────
export function StatusBadge({ status }: { status?: SubmissionStatus | string | null }) {
  const cfg: Record<string, { cls: string; label: string; dot: string }> = {
    accepted:           { cls: 'badge-success',  label: 'Accepted',             dot: 'bg-[#83D69A]' },
    wrong_answer:       { cls: 'badge-error',    label: 'Wrong Answer',         dot: 'bg-[#E99AA4]' },
    partial_pass:       { cls: 'badge-warning',  label: 'Partial Pass',         dot: 'bg-[#F2B866]' },
    compile_error:      { cls: 'badge-error',    label: 'Compile Error',        dot: 'bg-[#E99AA4]' },
    runtime_error:      { cls: 'badge-error',    label: 'Runtime Error',        dot: 'bg-[#E99AA4]' },
    timeout:            { cls: 'badge-warning',  label: 'Time Limit Exceeded',  dot: 'bg-[#F2B866]' },
    pending:            { cls: 'badge-neutral',  label: 'Pending',              dot: 'bg-[#56606A]' },
    queued:             { cls: 'badge-neutral',  label: 'Queued',               dot: 'bg-[#56606A]' },
    running:            { cls: 'badge-info',     label: 'Running',              dot: 'bg-[#8FAFF5]' },
    completed:          { cls: 'badge-success',  label: 'Completed',            dot: 'bg-[#83D69A]' },
    failed:             { cls: 'badge-error',    label: 'Failed',               dot: 'bg-[#E99AA4]' },
    service_unavailable:{ cls: 'badge-neutral',  label: 'Service Unavailable',  dot: 'bg-[#56606A]' },
    live_execution:     { cls: 'badge-primary',  label: 'Live Execution',       dot: 'bg-[#60E3D0]' },
    simulated_demo:     { cls: 'badge-warning',  label: 'Simulated Demo',       dot: 'bg-[#F2B866]' },
  };
  const key = (status || 'pending').toLowerCase();
  const item = cfg[key] || { cls: 'badge-neutral', label: key.replace(/_/g, ' '), dot: 'bg-[#56606A]' };
  return (
    <span className={`badge ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.label}</span>
    </span>
  );
}

// ── Mastery Badge ─────────────────────────────────────────────────────────
export function MasteryBadge({ level }: { level?: MasteryLevel | string | null }) {
  const cfg: Record<string, { cls: string; label: string; dot: string }> = {
    not_started:  { cls: 'badge-neutral', label: 'Not Started',  dot: 'bg-[#56606A]' },
    struggling:   { cls: 'badge-error',   label: 'Struggling',   dot: 'bg-[#E99AA4]' },
    developing:   { cls: 'badge-neutral', label: 'Developing',   dot: 'bg-[#8FAFF5]' },
    in_progress:  { cls: 'badge-warning', label: 'In Progress',  dot: 'bg-[#F2B866]' },
    demonstrated: { cls: 'badge-info',    label: 'Demonstrated', dot: 'bg-[#8FAFF5]' },
    mastered:     { cls: 'badge-success', label: 'Mastered',     dot: 'bg-[#83D69A]' },
  };
  const key = (level || 'developing').toLowerCase();
  const item = cfg[key] || { cls: 'badge-neutral', label: key.replace(/_/g, ' '), dot: 'bg-[#56606A]' };
  return (
    <span className={`badge ${item.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
      <span>{item.label}</span>
    </span>
  );
}

// ── Simulated Demo Label ──────────────────────────────────────────────────
export function SimulatedDemoLabel() {
  return (
    <span className="demo-label" title="Simulated evaluation in baseline demo environment">
      <span className="status-dot status-dot-warning animate-pulse-dot" />
      <span>Simulated Demo</span>
    </span>
  );
}

// ── Live Execution Label ──────────────────────────────────────────────────
export function LiveLabel() {
  return (
    <span className="live-label" title="Verified live execution on remote container runner">
      <span className="status-dot status-dot-active" />
      <span>Live Execution</span>
    </span>
  );
}

// ── Progress Bar ──────────────────────────────────────────────────────────
export interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: 'primary' | 'success' | 'warning' | 'error';
  className?: string;
  showLabel?: boolean;
}

export function ProgressBar({ value, max = 100, variant = 'primary', className = '', showLabel = false }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)));
  const barClass = variant === 'success'
    ? 'progress-success'
    : variant === 'warning'
    ? 'progress-warning'
    : variant === 'error'
    ? 'bg-[#E99AA4]'
    : 'progress-primary';

  return (
    <div className={`flex flex-col gap-1 w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center text-label-xs text-on-surface-variant font-mono">
          <span>Progress</span>
          <span className="text-primary font-semibold">{pct}%</span>
        </div>
      )}
      <div className="progress">
        <div className={`progress-bar ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── Loading Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 20, className = '' }: { size?: number; className?: string }) {
  return (
    <Icon
      name="progress_activity"
      size={size}
      className={`animate-spin text-primary ${className}`}
    />
  );
}

// ── Empty State ───────────────────────────────────────────────────────────
export interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon = 'inbox', title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-center border border-dashed border-[#343B42] rounded-lg bg-[#171A1E]">
      <div className="w-12 h-12 rounded-full bg-[#1C2024] flex items-center justify-center text-outline border border-[#343B42]">
        <Icon name={icon} size={24} />
      </div>
      <p className="text-headline-sm text-primary font-semibold">{title}</p>
      {description && <p className="text-body-md text-secondary-text max-w-md leading-relaxed">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ── Error State ───────────────────────────────────────────────────────────
export function ErrorState({ title, message, onRetry }: { title?: string; message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 gap-3 text-center border border-[#E98779]/30 rounded-lg bg-[#E98779]/5">
      <div className="w-12 h-12 rounded-full bg-[#1C2024] flex items-center justify-center text-error border border-[#E98779]/40">
        <Icon name="error" size={24} />
      </div>
      <p className="text-headline-sm text-primary font-semibold">{title || 'Execution Error'}</p>
      <p className="text-body-md text-secondary-text max-w-md font-mono text-code-sm">{message}</p>
      {onRetry && (
        <button className="btn btn-secondary btn-sm mt-2" onClick={onRetry}>
          <Icon name="refresh" size={16} /> Try again
        </button>
      )}
    </div>
  );
}

// ── Card ──────────────────────────────────────────────────────────────────
export interface CardProps {
  children: React.ReactNode;
  className?: string;
  elevated?: boolean;
  style?: React.CSSProperties;
  onClick?: () => void;
}

export function Card({ children, className = '', elevated = false, style, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={`${elevated ? 'card-elevated' : 'card'} ${onClick ? 'cursor-pointer hover:border-[#525C66] transition-colors' : ''} ${className}`}
    >
      {children}
    </div>
  );
}

// ── Skeleton Loader ───────────────────────────────────────────────────────
export function Skeleton({ className = '', height = '1rem' }: { className?: string; height?: string }) {
  return <div className={`skeleton ${className}`} style={{ height }} />;
}

// ── Tabs ──────────────────────────────────────────────────────────────────
export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  active: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, active, onChange, className = '' }: TabsProps) {
  return (
    <div className={`tab-bar ${className}`}>
      {tabs.map(t => (
        <button
          key={t.id}
          className={`tab ${active === t.id ? 'tab-active' : ''}`}
          onClick={() => onChange(t.id)}
        >
          {t.icon && <Icon name={t.icon} size={15} />}
          <span>{t.label}</span>
          {t.count !== undefined && (
            <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-[#242A30] text-secondary-text border border-[#343B42]">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────
export interface SectionHeaderProps {
  icon?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  badge?: React.ReactNode;
}

export function SectionHeader({ icon, title, subtitle, action, badge }: SectionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-5 border-b border-[#343B42]">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-8 h-8 rounded bg-[#1C2024] flex items-center justify-center text-primary border border-[#343B42]">
            <Icon name={icon} size={18} />
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-headline-md text-primary font-bold">{title}</h2>
            {badge}
          </div>
          {subtitle && <p className="text-code-sm text-secondary-text mt-0.5">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  );
}

// ── Code Block ────────────────────────────────────────────────────────────
export function CodeBlock({ code, language = '' }: { code: string; language?: string }) {
  return (
    <div className="bg-[#0D0F11] rounded-md border border-[#343B42] overflow-x-auto">
      {language && (
        <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-[#343B42] bg-[#171A1E]">
          <span className="text-label-xs text-primary font-mono">{language}</span>
          <span className="text-[10px] text-muted font-mono uppercase">Read Only</span>
        </div>
      )}
      <pre className="text-code-sm text-primary-text p-3.5 m-0 overflow-x-auto whitespace-pre leading-relaxed font-mono">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────
export interface MetricCardProps {
  label: string;
  value: string | number;
  icon?: string;
  sub?: string;
  trend?: { direction: 'up' | 'down' | 'neutral'; text: string };
}

export function MetricCard({ label, value, icon, sub, trend }: MetricCardProps) {
  return (
    <div className="card p-4 flex flex-col justify-between gap-2 bg-[#1C2024] border-[#343B42]">
      <div className="flex items-center justify-between text-secondary-text">
        <span className="text-label-xs uppercase tracking-wider font-mono">{label}</span>
        {icon && (
          <div className="w-6 h-6 rounded bg-[#242A30] flex items-center justify-center text-primary border border-[#343B42]">
            <Icon name={icon} size={15} />
          </div>
        )}
      </div>
      <div>
        <span className="text-display font-bold text-primary font-mono tracking-tight">{value}</span>
        {sub && <p className="text-body-sm text-secondary-text mt-1">{sub}</p>}
        {trend && (
          <div className={`flex items-center gap-1 text-label-xs mt-1.5 ${
            trend.direction === 'up' ? 'text-[#83D69A]' : trend.direction === 'down' ? 'text-[#E98779]' : 'text-secondary-text'
          }`}>
            <Icon name={trend.direction === 'up' ? 'trending_up' : trend.direction === 'down' ? 'trending_down' : 'remove'} size={14} />
            <span>{trend.text}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Kbd ───────────────────────────────────────────────────────────────────
export function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="px-1.5 py-0.5 bg-[#242A30] text-primary-text text-label-xs font-mono rounded border border-[#343B42] shadow-sm">
      {children}
    </kbd>
  );
}

// ── Modal / Dialog ────────────────────────────────────────────────────────
export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
}

export function Modal({ isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className={`card-elevated w-full ${maxWidth} overflow-hidden border border-[#343B42] flex flex-col`}>
        {/* Header */}
        <div className="h-12 px-4 bg-[#171A1E] border-b border-[#343B42] flex items-center justify-between shrink-0">
          <span className="text-headline-sm text-primary font-bold">{title}</span>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center text-secondary-text hover:text-primary hover:bg-[#242A30] transition-colors"
            aria-label="Close dialog"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[80vh]">
          {children}
        </div>
        {/* Footer */}
        {footer && (
          <div className="h-14 px-4 bg-[#171A1E] border-t border-[#343B42] flex items-center justify-end gap-2.5 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
