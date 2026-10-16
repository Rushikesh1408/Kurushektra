import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Icon, StatusBadge, SimulatedDemoLabel } from '../../components/ui';
import { mockSubmissions } from '../../data/mockData';

export default function SubmissionHistoryPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [languageFilter, setLanguageFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    return mockSubmissions.filter(s => {
      const matchSearch = s.challengeTitle.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || s.status === statusFilter;
      const matchLang = languageFilter === 'all' || s.language === languageFilter;
      return matchSearch && matchStatus && matchLang;
    });
  }, [search, statusFilter, languageFilter]);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <span>Learner</span>
            <span>/</span>
            <span>Audit Trail</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">Submission History</h1>
          <p className="text-body-sm text-on-surface-variant">
            Full record of execution runs, test assertions, and diagnostic submissions
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-4 bg-surface-container-low border border-outline-variant flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Icon name="search" size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
          <input
            type="text"
            placeholder="Search by challenge title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded pl-10 pr-4 py-2 text-body-sm text-primary placeholder:text-outline focus:outline-none focus:border-outline font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline cursor-pointer"
          >
            <option value="all">All Statuses</option>
            <option value="accepted">Accepted</option>
            <option value="wrong_answer">Wrong Answer</option>
            <option value="timeout">Timeout</option>
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-label-sm text-primary font-mono focus:outline-none focus:border-outline cursor-pointer"
          >
            <option value="all">All Languages</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="card bg-surface-container-low border border-outline-variant overflow-hidden hidden md:block">
        <table className="w-full text-left font-mono text-label-xs">
          <thead className="bg-surface-container-lowest border-b border-outline-variant text-outline uppercase tracking-wider">
            <tr>
              <th className="py-3 px-4">Challenge</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Language</th>
              <th className="py-3 px-4">Tests</th>
              <th className="py-3 px-4">Runtime</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/50">
            {filtered.map(s => (
              <tr key={s.id} className="hover:bg-surface-container-high/40 transition-colors">
                <td className="py-3.5 px-4">
                  <span className="text-body-sm text-primary font-semibold font-sans block">{s.challengeTitle}</span>
                  <span className="text-outline text-label-xs font-mono">{s.id}</span>
                </td>
                <td className="py-3.5 px-4">
                  <StatusBadge status={s.status} />
                </td>
                <td className="py-3.5 px-4 uppercase text-on-surface-variant">
                  {s.language}
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant">
                  {s.testsPassed} / {s.testsTotal}
                </td>
                <td className="py-3.5 px-4 text-on-surface-variant">
                  {s.runtime ? `${s.runtime} ms` : '—'}
                </td>
                <td className="py-3.5 px-4 text-outline font-sans">
                  {new Date(s.submittedAt).toLocaleDateString()}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <Link
                    to={`/submissions/${s.id}`}
                    className="btn btn-ghost btn-sm text-label-xs font-mono inline-flex items-center gap-1"
                  >
                    <span>Inspect</span>
                    <Icon name="arrow_forward" size={14} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card List View */}
      <div className="space-y-3 md:hidden">
        {filtered.map(s => (
          <div key={s.id} className="card p-4 bg-surface-container-low border border-outline-variant space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-body-md font-semibold text-primary">{s.challengeTitle}</h3>
                <span className="text-label-xs font-mono text-outline">{s.id} · {s.language.toUpperCase()}</span>
              </div>
              <StatusBadge status={s.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-label-xs font-mono text-on-surface-variant pt-2 border-t border-outline-variant">
              <span>Tests: <strong className="text-primary">{s.testsPassed}/{s.testsTotal}</strong></span>
              <span>Runtime: <strong className="text-primary">{s.runtime ? `${s.runtime}ms` : '—'}</strong></span>
            </div>

            <Link
              to={`/submissions/${s.id}`}
              className="btn btn-secondary btn-sm font-mono text-label-xs w-full text-center flex items-center justify-center gap-1.5"
            >
              <span>View Full Diagnostic</span>
              <Icon name="arrow_forward" size={14} />
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
