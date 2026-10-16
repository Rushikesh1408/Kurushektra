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
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#343B42]">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-muted uppercase mb-1">
            <span>Learner</span>
            <span>/</span>
            <span className="text-primary-text font-bold">Audit Ledger</span>
          </div>
          <h1 className="text-headline-lg font-bold text-primary-text tracking-tight">
            Submission History
          </h1>
          <p className="text-body-sm text-secondary-text mt-0.5">
            Full record of execution runs, test assertions, and diagnostic submissions
          </p>
        </div>
        <SimulatedDemoLabel />
      </div>

      {/* Filter and Search Bar */}
      <div className="card p-3 sm:p-4 bg-[#1C2024] border-[#343B42] flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative flex items-center bg-[#111315] border border-[#343B42] rounded px-3 py-1.5 focus-within:border-primary transition-colors">
          <Icon name="search" size={16} className="text-muted mr-2" />
          <input
            type="text"
            placeholder="Search by challenge title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-body-sm text-primary-text placeholder-muted font-mono"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#111315] border border-[#343B42] rounded px-3 py-1.5 text-label-xs text-primary font-mono focus:border-primary cursor-pointer outline-none min-h-[36px]"
          >
            <option value="all">All Verdicts</option>
            <option value="accepted">Accepted</option>
            <option value="wrong_answer">Wrong Answer</option>
            <option value="timeout">Timeout</option>
          </select>

          <select
            value={languageFilter}
            onChange={(e) => setLanguageFilter(e.target.value)}
            className="bg-[#111315] border border-[#343B42] rounded px-3 py-1.5 text-label-xs text-primary font-mono focus:border-primary cursor-pointer outline-none min-h-[36px]"
          >
            <option value="all">All Languages</option>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="java">Java</option>
          </select>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="card bg-[#1C2024] border-[#343B42] overflow-hidden hidden md:block">
        <table className="data-table">
          <thead>
            <tr>
              <th>Challenge</th>
              <th>Verdict</th>
              <th>Language</th>
              <th>Assertions</th>
              <th>Runtime</th>
              <th>Timestamp</th>
              <th className="text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(s => (
              <tr key={s.id}>
                <td>
                  <span className="text-body-sm text-primary-text font-bold block">{s.challengeTitle}</span>
                  <span className="text-muted text-label-xs font-mono">{s.id}</span>
                </td>
                <td>
                  <StatusBadge status={s.status} />
                </td>
                <td className="uppercase text-secondary-text font-mono">
                  {s.language}
                </td>
                <td className="text-secondary-text font-mono">
                  {s.testsPassed} / {s.testsTotal}
                </td>
                <td className="text-[#83D69A] font-mono">
                  {s.runtime ? `${s.runtime}ms` : '—'}
                </td>
                <td className="text-muted font-sans">
                  {new Date(s.submittedAt).toLocaleDateString()}
                </td>
                <td className="text-right">
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
          <div key={s.id} className="card p-4 bg-[#1C2024] border-[#343B42] space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-body-md font-bold text-primary-text">{s.challengeTitle}</h3>
                <span className="text-label-xs font-mono text-muted">{s.id} · {s.language.toUpperCase()}</span>
              </div>
              <StatusBadge status={s.status} />
            </div>

            <div className="grid grid-cols-2 gap-2 text-label-xs font-mono text-secondary-text pt-2 border-t border-[#343B42]">
              <span>Tests: <strong className="text-primary-text">{s.testsPassed}/{s.testsTotal}</strong></span>
              <span>Runtime: <strong className="text-[#83D69A]">{s.runtime ? `${s.runtime}ms` : '—'}</strong></span>
            </div>

            <div className="pt-1">
              <Link
                to={`/submissions/${s.id}`}
                className="btn btn-secondary btn-sm w-full justify-center font-mono"
              >
                <span>Inspect Results & Assessment</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
