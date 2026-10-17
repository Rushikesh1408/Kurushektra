import React, { useState } from 'react';
import { Icon, DifficultyBadge, SimulatedDemoLabel } from '../../components/ui';
import { mockChallenges } from '../../data/mockData';
import type { Difficulty, Challenge } from '../../types';

export default function AssessmentManagementPage() {
  const [challenges, setChallenges] = useState<Challenge[]>(mockChallenges);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [tags, setTags] = useState('');
  const [description, setDescription] = useState('');
  const [timeComplexity, setTimeComplexity] = useState('O(n)');
  const [spaceComplexity, setSpaceComplexity] = useState('O(1)');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newChallenge: Challenge = {
      id: `c${challenges.length + 1}`,
      slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title,
      difficulty,
      tags: tags.split(',').map(t => t.trim()).filter(Boolean),
      description,
      timeComplexity,
      spaceComplexity,
      acceptanceRate: 100,
      examples: [{ input: 'example_input', output: 'example_output' }],
      constraints: ['1 <= n <= 10^4'],
      starterCode: {
        python: `def solution():\n    # TODO: Implement\n    pass`,
        javascript: `function solution() {\n    // TODO\n}`,
        java: `class Solution {\n    // TODO\n}`,
      },
    };

    setChallenges(prev => [newChallenge, ...prev]);
    setShowCreateModal(false);
    setTitle('');
    setDescription('');
    setTags('');
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this assessment challenge?')) {
      setChallenges(prev => prev.filter(c => c.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--border)]">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[var(--text-muted)] uppercase mb-1">
            <span>Faculty Portal</span>
            <span>/</span>
            <span className="text-[var(--accent-teal)]">Curriculum Management</span>
          </div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Assessment & Challenge Management</h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Author curriculum items, set algorithmic rubrics, and manage test suite invariants
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary text-xs flex items-center gap-1.5 font-mono"
          >
            <Icon name="add" size={16} />
            <span>Create New Challenge</span>
          </button>
        </div>
      </div>

      {/* Challenges List - Desktop Table */}
      <div className="hidden md:block card overflow-hidden">
        <table className="w-full text-left font-mono text-xs">
          <thead className="bg-[var(--surface-base)] border-b border-[var(--border)] text-[var(--text-muted)] uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Title & Slug</th>
              <th className="py-3 px-4">Difficulty</th>
              <th className="py-3 px-4">Paradigms / Tags</th>
              <th className="py-3 px-4">Expected Complexity</th>
              <th className="py-3 px-4">Acceptance</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {challenges.map(c => (
              <tr key={c.id} className="hover:bg-[var(--surface-elevated)]/40 transition-colors">
                <td className="py-3.5 px-4">
                  <span className="text-sm text-[var(--text-primary)] font-semibold font-sans block">{c.title}</span>
                  <span className="text-[var(--text-muted)] text-xs font-mono">{c.slug}</span>
                </td>
                <td className="py-3.5 px-4">
                  <DifficultyBadge difficulty={c.difficulty} />
                </td>
                <td className="py-3.5 px-4">
                  <div className="flex flex-wrap gap-1">
                    {c.tags.map(t => (
                      <span key={t} className="badge badge-neutral text-xs font-mono">
                        #{t}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                  {c.timeComplexity} / {c.spaceComplexity}
                </td>
                <td className="py-3.5 px-4 text-[var(--text-secondary)]">
                  {c.acceptanceRate}%
                </td>
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => alert(`Editing challenge ${c.title}`)}
                      className="btn btn-ghost btn-icon text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                      title="Edit Rubric"
                    >
                      <Icon name="edit" size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      className="btn btn-ghost btn-icon text-[var(--error-coral)] hover:text-red-300"
                      title="Delete"
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Challenges List - Mobile Cards */}
      <div className="md:hidden space-y-3">
        {challenges.map(c => (
          <div key={c.id} className="card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">{c.title}</h3>
                <span className="text-xs font-mono text-[var(--text-muted)]">{c.slug}</span>
              </div>
              <DifficultyBadge difficulty={c.difficulty} />
            </div>

            <div className="flex flex-wrap gap-1">
              {c.tags.map(t => (
                <span key={t} className="badge badge-neutral text-xs font-mono">
                  #{t}
                </span>
              ))}
            </div>

            <div className="flex items-center justify-between text-xs font-mono text-[var(--text-secondary)] pt-2 border-t border-[var(--border)]">
              <span>{c.timeComplexity} · {c.spaceComplexity}</span>
              <span>Acceptance: {c.acceptanceRate}%</span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--border)]">
              <button
                onClick={() => alert(`Editing challenge ${c.title}`)}
                className="btn btn-secondary text-xs font-mono py-1 px-3 flex items-center gap-1"
              >
                <Icon name="edit" size={14} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => handleDelete(c.id)}
                className="btn btn-danger text-xs font-mono py-1 px-3 flex items-center gap-1"
              >
                <Icon name="delete" size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal Dialog */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">Author New Coding Challenge</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn btn-ghost btn-icon"
              >
                <Icon name="close" size={18} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1">Challenge Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Reverse Linked List"
                  className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)] font-mono"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)] cursor-pointer"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1">Time Bound</label>
                  <input
                    type="text"
                    value={timeComplexity}
                    onChange={(e) => setTimeComplexity(e.target.value)}
                    placeholder="O(n)"
                    className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)]"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1">Space Bound</label>
                  <input
                    type="text"
                    value={spaceComplexity}
                    onChange={(e) => setSpaceComplexity(e.target.value)}
                    placeholder="O(1)"
                    className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)]"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="linked-list, pointers, recursion"
                  className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-teal)] font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-mono uppercase text-[var(--text-muted)] block mb-1">Problem Description</label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify problem constraints, mathematical invariants, and expected inputs..."
                  className="w-full bg-[var(--surface-base)] border border-[var(--border)] rounded-lg p-3 text-sm text-[var(--text-primary)] font-mono focus:outline-none focus:border-[var(--accent-teal)]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn btn-ghost text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary text-xs font-mono px-5"
                >
                  Publish Challenge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
