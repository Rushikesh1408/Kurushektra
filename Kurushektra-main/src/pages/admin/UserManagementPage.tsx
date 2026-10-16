import React, { useState } from 'react';
import { Icon, SimulatedDemoLabel } from '../../components/ui';
import { mockAdminUsers } from '../../data/mockData';
import type { AdminUser, UserRole } from '../../types';

export default function UserManagementPage() {
  const [users, setUsers] = useState<AdminUser[]>(mockAdminUsers);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showInviteModal, setShowInviteModal] = useState(false);

  // New user form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('learner');

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === 'all' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const handleToggleStatus = (id: string) => {
    setUsers(prev => prev.map(u => {
      if (u.id === id) {
        return { ...u, status: u.status === 'active' ? 'suspended' : 'active' };
      }
      return u;
    }));
  };

  const handleRoleChange = (id: string, newRole: UserRole) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role: newRole } : u));
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newUser: AdminUser = {
      id: `u${users.length + 1}`,
      name,
      email,
      role,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString(),
    };

    setUsers(prev => [newUser, ...prev]);
    setShowInviteModal(false);
    setName('');
    setEmail('');
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <span>Admin</span>
            <span>/</span>
            <span>Access Control</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">User & Role Management</h1>
          <p className="text-body-sm text-on-surface-variant">
            Audit user accounts, enforce role-based access control, and manage system authentication
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <button
            onClick={() => setShowInviteModal(true)}
            className="btn btn-primary btn-sm flex items-center gap-1.5 font-mono"
          >
            <Icon name="person_add" size={16} />
            <span>Invite User</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            placeholder="Search by user name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded pl-10 pr-4 py-2 text-body-sm text-primary placeholder:text-outline focus:outline-none focus:border-outline font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="learner">Learner</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Admin</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="card bg-surface-container-low border border-outline-variant overflow-hidden">
        <table className="w-full text-left font-mono text-label-xs">
          <thead className="bg-surface-container-lowest border-b border-outline-variant text-outline uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">User</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Created Date</th>
              <th className="py-3 px-4">Last Telemetry Login</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50">
            {filtered.map(u => (
              <tr key={u.id} className="hover:bg-surface-container-high/40 transition-colors">
                <td className="py-3.5 px-4">
                  <span className="text-body-sm text-primary font-semibold font-sans block">{u.name}</span>
                  <span className="text-outline text-label-xs font-mono">{u.email}</span>
                </td>
                <td className="py-3.5 px-4">
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)}
                    className="bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-label-xs text-primary font-mono focus:outline-none focus:border-outline cursor-pointer capitalize"
                  >
                    <option value="learner">Learner</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td className="py-3.5 px-4">
                  <span className={`badge font-mono text-label-xs uppercase ${u.status === 'active' ? 'badge-success' : 'badge-error'}`}>
                    {u.status}
                  </span>
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant font-sans">
                  {new Date(u.createdAt).toLocaleDateString()}
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant font-sans">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleToggleStatus(u.id)}
                    className={`btn btn-ghost btn-sm font-mono text-label-xs ${
                      u.status === 'active' ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'
                    }`}
                  >
                    {u.status === 'active' ? 'Suspend' : 'Reactivate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card bg-surface-container-low border border-outline-variant p-6 w-full max-w-md space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-outline-variant">
              <h2 className="text-headline-sm text-primary font-bold">Invite New Platform User</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="text-label-xs font-mono uppercase text-outline block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Jordan Lee"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-sm text-primary focus:outline-none focus:border-outline font-mono"
                />
              </div>

              <div>
                <label className="text-label-xs font-mono uppercase text-outline block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jordan@university.edu"
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-body-sm text-primary focus:outline-none focus:border-outline font-mono"
                />
              </div>

              <div>
                <label className="text-label-xs font-mono uppercase text-outline block mb-1">Assigned Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline"
                >
                  <option value="learner">Learner</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="btn btn-ghost btn-sm font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary btn-sm font-mono px-5"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
