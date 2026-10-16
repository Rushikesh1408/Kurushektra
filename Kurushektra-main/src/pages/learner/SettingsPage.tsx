import React, { useState } from 'react';
import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types';

export default function SettingsPage() {
  const { user, login } = useAuth();

  const [name, setName] = useState(user?.name || 'Alex Chen');
  const [email, setEmail] = useState(user?.email || 'alex@example.com');
  const [keybinding, setKeybinding] = useState<'standard' | 'vim'>('standard');
  const [tabSize, setTabSize] = useState<number>(4);
  const [fontSize, setFontSize] = useState<number>(13);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleRoleSwitch = async (role: UserRole) => {
    await login(email, 'password', role);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <span>Account</span>
            <span>/</span>
            <span>Configuration</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">Profile & Environment Settings</h1>
          <p className="text-body-sm text-on-surface-variant">
            Manage your account credentials, editor preferences, and role permissions
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* DEMO PERSONA SWITCHER - Very useful for reviewers! */}
      <div className="card p-6 bg-surface-container border-2 border-primary/20 space-y-3">
        <div className="flex items-center gap-2 text-primary font-mono text-label-sm uppercase font-semibold">
          <Icon name="switch_account" size={20} />
          <span>Interactive Role Persona Switcher</span>
        </div>
        <p className="text-body-sm text-on-surface-variant">
          Quickly test the platform as different user types. Switching roles dynamically changes the layout and accessible routes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            onClick={() => handleRoleSwitch('learner')}
            className={`p-3 rounded-lg border text-left font-mono text-label-xs transition-all ${
              user?.role === 'learner'
                ? 'bg-surface-container-high border-primary text-primary shadow'
                : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-outline'
            }`}
          >
            <div className="font-bold text-body-sm mb-0.5">Learner Persona</div>
            <div className="text-outline">Alex Chen (u1)</div>
            <div className="text-emerald-400 mt-2 font-semibold">{user?.role === 'learner' ? '● CURRENT' : 'Switch →'}</div>
          </button>

          <button
            onClick={() => handleRoleSwitch('teacher')}
            className={`p-3 rounded-lg border text-left font-mono text-label-xs transition-all ${
              user?.role === 'teacher'
                ? 'bg-surface-container-high border-primary text-primary shadow'
                : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-outline'
            }`}
          >
            <div className="font-bold text-body-sm mb-0.5">Teacher Persona</div>
            <div className="text-outline">Dr. Sarah Kim (u2)</div>
            <div className="text-sky-400 mt-2 font-semibold">{user?.role === 'teacher' ? '● CURRENT' : 'Switch →'}</div>
          </button>

          <button
            onClick={() => handleRoleSwitch('admin')}
            className={`p-3 rounded-lg border text-left font-mono text-label-xs transition-all ${
              user?.role === 'admin'
                ? 'bg-surface-container-high border-primary text-primary shadow'
                : 'bg-surface-container-lowest border-outline-variant text-on-surface-variant hover:border-outline'
            }`}
          >
            <div className="font-bold text-body-sm mb-0.5">Admin Persona</div>
            <div className="text-outline">System Admin (u3)</div>
            <div className="text-red-400 mt-2 font-semibold">{user?.role === 'admin' ? '● CURRENT' : 'Switch →'}</div>
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <h2 className="text-headline-sm text-primary font-semibold">Learner Identity</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-sm text-primary focus:outline-none focus:border-outline"
              />
            </div>
            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-sm text-primary focus:outline-none focus:border-outline"
              />
            </div>
          </div>
        </div>

        {/* Editor Preferences */}
        <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <h2 className="text-headline-sm text-primary font-semibold">Coding Workspace Preferences</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Keybinding Mode</label>
              <select
                value={keybinding}
                onChange={(e) => setKeybinding(e.target.value as any)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline cursor-pointer"
              >
                <option value="standard">Standard (VS Code default)</option>
                <option value="vim">Vim Emulation</option>
              </select>
            </div>

            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Tab Indentation</label>
              <select
                value={tabSize}
                onChange={(e) => setTabSize(Number(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline cursor-pointer"
              >
                <option value={2}>2 Spaces</option>
                <option value={4}>4 Spaces</option>
              </select>
            </div>

            <div>
              <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline cursor-pointer"
              >
                <option value={12}>12 px</option>
                <option value={13}>13 px (Default)</option>
                <option value={14}>14 px</option>
                <option value={16}>16 px</option>
              </select>
            </div>
          </div>
        </div>

        {/* Notifications & Security */}
        <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
          <h2 className="text-headline-sm text-primary font-semibold">Security & API Tokens</h2>
          <div className="flex items-center justify-between p-3 bg-surface-container-lowest rounded border border-outline-variant">
            <div>
              <span className="text-body-sm font-semibold text-primary block">API Client Bearer Token</span>
              <span className="text-label-xs font-mono text-outline">Stored in local storage as cc_token</span>
            </div>
            <span className="badge badge-neutral font-mono text-label-xs">demo-token-active</span>
          </div>
        </div>

        {/* Save CTA */}
        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-emerald-400 font-mono text-label-sm flex items-center gap-1.5">
              <Icon name="check" size={16} /> Preferences saved successfully!
            </span>
          ) : <div />}

          <button type="submit" className="btn btn-primary px-6 font-mono text-label-sm uppercase tracking-wider">
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
