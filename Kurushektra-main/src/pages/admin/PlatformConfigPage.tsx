import React, { useState } from 'react';
import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { mockPlatformConfig } from '../../data/mockData';

export default function PlatformConfigPage() {
  const [execEnabled, setExecEnabled] = useState(mockPlatformConfig.executionService.enabled);
  const [execUrl, setExecUrl] = useState(mockPlatformConfig.executionService.url);
  const [timeoutSec, setTimeoutSec] = useState(mockPlatformConfig.executionService.timeout);
  const [assessmentEnabled, setAssessmentEnabled] = useState(mockPlatformConfig.assessmentEnabled);
  const [maxSubmissions, setMaxSubmissions] = useState(mockPlatformConfig.maxSubmissionsPerDay);
  const [maintenance, setMaintenance] = useState(mockPlatformConfig.maintenanceMode);
  const [saved, setSaved] = useState(false);

  const services = [
    { name: 'AST Syntax & Invariant Engine', status: 'operational', latency: '4ms', uptime: '99.98%' },
    { name: 'Remote Code Runner Cluster', status: execEnabled ? 'operational' : 'simulated', latency: execEnabled ? '42ms' : '0ms', uptime: '99.91%' },
    { name: 'Cognitive Assessment AI Service', status: assessmentEnabled ? 'operational' : 'disabled', latency: '128ms', uptime: '99.85%' },
    { name: 'PostgreSQL Telemetry DB', status: 'operational', latency: '2ms', uptime: '100%' },
    { name: 'Redis Queue Worker Pool', status: 'operational', latency: '1ms', uptime: '99.99%' },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] uppercase mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-[var(--accent-teal)]">Infrastructure</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Platform Configuration & Health</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Telemetry service monitors, execution runner clusters, and platform-wide security quotas
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Infrastructure Health Status */}
      <div className="card p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[var(--success-green)] animate-pulse" />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Service Health Monitors</h2>
          </div>
          <span className="text-xs font-mono text-[var(--success-green)]">All Core Subsystems Operational</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc, i) => (
            <div key={i} className="p-3.5 bg-[var(--surface-base)] rounded-lg border border-[var(--border)] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--text-primary)] truncate">{svc.name}</span>
                <span className={`badge font-mono text-xs uppercase shrink-0 ${
                  svc.status === 'operational' ? 'badge-success' : svc.status === 'simulated' ? 'badge-warning' : 'badge-neutral'
                }`}>
                  {svc.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono text-[var(--text-muted)]">
                <span>Latency: {svc.latency}</span>
                <span>Uptime: {svc.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Configuration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Execution Service Parameters</h2>

          <div className="flex items-center justify-between p-3.5 bg-[var(--surface-base)] rounded-lg border border-[var(--border)]">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-[var(--text-primary)] block">Live Remote Code Execution Cluster</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                When disabled, code execution runs in safe simulated demo mode
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={execEnabled}
                onChange={(e) => setExecEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-teal)]"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1.5">Runner Endpoint URL</label>
              <input
                type="text"
                value={execUrl}
                onChange={(e) => setExecUrl(e.target.value)}
                className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)]"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1.5">Execution Timeout (Seconds)</label>
              <input
                type="number"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
                className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)]"
              />
            </div>
          </div>
        </div>

        {/* Cognitive & Rate Limiting Quotas */}
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Cognitive & Rate Limiting Controls</h2>

          <div className="flex items-center justify-between p-3.5 bg-[var(--surface-base)] rounded-lg border border-[var(--border)]">
            <div className="space-y-0.5">
              <span className="text-sm font-semibold text-[var(--text-primary)] block">Automatic Understanding Assessment Trigger</span>
              <span className="text-xs font-mono text-[var(--text-muted)]">
                Prompts learners with follow-up conceptual verification questions upon passing test suites
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={assessmentEnabled}
                onChange={(e) => setAssessmentEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[var(--surface-elevated)] border border-[var(--border)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--accent-teal)]"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1.5">Daily Submissions Quota Per User</label>
              <input
                type="number"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(Number(e.target.value))}
                className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)]"
              />
            </div>

            <div>
              <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1.5">Maintenance Mode</label>
              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setMaintenance(m => !m)}
                  className={`btn text-xs font-mono ${maintenance ? 'btn-danger' : 'btn-secondary'}`}
                >
                  {maintenance ? 'Maintenance Mode ACTIVE' : 'Platform Online (Normal)'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-[var(--success-green)] font-mono text-xs flex items-center gap-1.5">
              <Icon name="check" size={16} /> Configuration updated and synced to edge!
            </span>
          ) : <div />}

          <button type="submit" className="btn btn-primary px-6 font-mono text-xs uppercase tracking-wider">
            Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
}
