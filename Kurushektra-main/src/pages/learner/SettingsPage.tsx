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
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343B42]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <span>Account</span>
            <span>/</span>
            <span className="text-primary-text font-bold">Preferences</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
            Profile & IDE Preferences
          </h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Configure developer identity, workspace editor parameters, and test personas
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Role Persona Switcher (For local testing) */}
      <div className="card p-5 sm:p-6 bg-[#1C2024] border border-primary/30 space-y-3 shadow-md">
        <div className="flex items-center gap-2 text-primary font-mono text-label-sm uppercase font-bold">
          <Icon name="switch_account" size={18} />
          <span>Interactive Role Persona Switcher</span>
        </div>
        <p className="text-body-sm text-secondary-text">
          Evaluate the platform across different roles. Switching roles updates accessible layouts and navigation according to authentic backend-configured permissions.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={() => handleRoleSwitch('learner')}
            className={`p-3.5 rounded-md border text-left font-mono text-label-xs transition-all ${
              user?.role === 'learner'
                ? 'bg-primary/10 border-primary text-primary-text shadow-sm'
                : 'bg-[#171A1E] border-[#343B42] text-secondary-text hover:border-[#525C66]'
            }`}
          >
            <div className="font-bold text-body-sm text-primary-text mb-0.5">Learner Persona</div>
            <div className="text-muted">Alex Chen (u1)</div>
            <div className="text-[#83D69A] mt-2 font-semibold">
              {user?.role === 'learner' ? '● ACTIVE PERSONA' : 'Switch →'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('teacher')}
            className={`p-3.5 rounded-md border text-left font-mono text-label-xs transition-all ${
              user?.role === 'teacher'
                ? 'bg-primary/10 border-primary text-primary-text shadow-sm'
                : 'bg-[#171A1E] border-[#343B42] text-secondary-text hover:border-[#525C66]'
            }`}
          >
            <div className="font-bold text-body-sm text-primary-text mb-0.5">Teacher Persona</div>
            <div className="text-muted">Dr. Sarah Kim (u2)</div>
            <div className="text-[#8FAFD6] mt-2 font-semibold">
              {user?.role === 'teacher' ? '● ACTIVE PERSONA' : 'Switch →'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleRoleSwitch('admin')}
            className={`p-3.5 rounded-md border text-left font-mono text-label-xs transition-all ${
              user?.role === 'admin'
                ? 'bg-primary/10 border-primary text-primary-text shadow-sm'
                : 'bg-[#171A1E] border-[#343B42] text-secondary-text hover:border-[#525C66]'
            }`}
          >
            <div className="font-bold text-body-sm text-primary-text mb-0.5">Admin Persona</div>
            <div className="text-muted">System Admin (u3)</div>
            <div className="text-[#E98779] mt-2 font-semibold">
              {user?.role === 'admin' ? '● ACTIVE PERSONA' : 'Switch →'}
            </div>
          </button>
        </div>
      </div>

      {/* Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="card p-5 sm:p-6 bg-[#1C2024] border-[#343B42] space-y-4">
          <h2 className="text-headline-sm font-bold text-primary-text">Developer Identity</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-label-xs font-mono uppercase text-muted block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input font-mono text-code-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-label-xs font-mono uppercase text-muted block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input font-mono text-code-sm"
              />
            </div>
          </div>
        </div>

        {/* Editor Preferences */}
        <div className="card p-5 sm:p-6 bg-[#1C2024] border-[#343B42] space-y-4">
          <h2 className="text-headline-sm font-bold text-primary-text">Workspace IDE Controls</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-label-xs font-mono uppercase text-muted block">Keybinding Mode</label>
              <select
                value={keybinding}
                onChange={(e) => setKeybinding(e.target.value as any)}
                className="bg-[#111315] border border-[#343B42] rounded px-3 py-2 text-label-sm text-primary font-mono focus:border-primary cursor-pointer outline-none w-full min-h-[40px]"
              >
                <option value="standard">Standard VS Code</option>
                <option value="vim">Vim Emulation</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-xs font-mono uppercase text-muted block">Tab Indentation</label>
              <select
                value={tabSize}
                onChange={(e) => setTabSize(+e.target.value)}
                className="bg-[#111315] border border-[#343B42] rounded px-3 py-2 text-label-sm text-primary font-mono focus:border-primary cursor-pointer outline-none w-full min-h-[40px]"
              >
                <option value={2}>2 Spaces</option>
                <option value={4}>4 Spaces (Default)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-label-xs font-mono uppercase text-muted block">Font Size</label>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(+e.target.value)}
                className="bg-[#111315] border border-[#343B42] rounded px-3 py-2 text-label-sm text-primary font-mono focus:border-primary cursor-pointer outline-none w-full min-h-[40px]"
              >
                <option value={12}>12px (Compact)</option>
                <option value={13}>13px (Balanced)</option>
                <option value={14}>14px (Comfortable)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved ? (
            <span className="text-label-xs font-mono text-[#83D69A] flex items-center gap-1.5">
              <Icon name="check_circle" size={16} />
              <span>Preferences Saved Successfully</span>
            </span>
          ) : <div />}

          <button
            type="submit"
            className="btn btn-primary px-6 font-mono text-label-sm uppercase tracking-wider"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
