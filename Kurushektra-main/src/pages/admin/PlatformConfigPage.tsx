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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <span>Admin</span>
            <span>/</span>
            <span>Infrastructure</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">Platform Configuration & Health</h1>
          <p className="text-body-sm text-on-surface-variant">
            Telemetry service monitors, execution runner clusters, and platform-wide security quotas
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Infrastructure Health Status */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-headline-sm text-primary font-semibold">Service Health Monitors</h2>
          </div>
          <span className="text-label-xs font-mono text-emerald-400">All Core Subsystems Operational</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {services.map((svc, i) => (
            <div key={i} className="p-3.5 bg-surface-container-lowest rounded border border-outline-variant space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-body-sm font-semibold text-primary truncate">{svc.name}</span>
                <span className={`badge font-mono text-label-xs uppercase ${
                  svc.status === 'operational' ? 'badge-success' : svc.status === 'simulated' ? 'badge-warning' : 'badge-neutral'
                }`}>
                  {svc.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-label-xs font-mono text-outline">
                <span>Latency: {svc.latency}</span>
                <span>Uptime: {svc.uptime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Configuration Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-5">
          <h2 className="text-headline-sm text-primary font-semibold">Execution Service Parameters</h2>

          <div className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded border border-outline-variant">
            <div className="space-y-0.5">
              <span className="text-body-sm font-semibold text-primary block">Live Remote Code Execution Cluster</span>
              <span className="text-label-xs font-mono text-outline">
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
              <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Runner Endpoint URL</label>
              <input
                type="text"
                value={execUrl}
                onChange={(e) => setExecUrl(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline"
              />
            </div>

            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Execution Timeout (Seconds)</label>
              <input
                type="number"
                value={timeoutSec}
                onChange={(e) => setTimeoutSec(Number(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline"
              />
            </div>
          </div>
        </div>

        {/* Cognitive & Rate Limiting Quotas */}
        <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-5">
          <h2 className="text-headline-sm text-primary font-semibold">Cognitive & Rate Limiting Controls</h2>

          <div className="flex items-center justify-between p-3.5 bg-surface-container-lowest rounded border border-outline-variant">
            <div className="space-y-0.5">
              <span className="text-body-sm font-semibold text-primary block">Automatic Understanding Assessment Trigger</span>
              <span className="text-label-xs font-mono text-outline">
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
              <div className="w-11 h-6 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Daily Submissions Quota Per User</label>
              <input
                type="number"
                value={maxSubmissions}
                onChange={(e) => setMaxSubmissions(Number(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline"
              />
            </div>

            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Maintenance Mode</label>
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMaintenance(m => !m)}
                  className={`btn btn-sm font-mono text-label-xs ${maintenance ? 'btn-danger' : 'btn-secondary'}`}
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
            <span className="text-emerald-400 font-mono text-label-sm flex items-center gap-1.5">
              <Icon name="check" size={16} /> Configuration updated and synced to edge!
            </span>
          ) : <div />}

          <button type="submit" className="btn btn-primary px-6 font-mono text-label-sm uppercase tracking-wider">
            Save Platform Settings
          </button>
        </div>
      </form>
    </div>
  );
}
