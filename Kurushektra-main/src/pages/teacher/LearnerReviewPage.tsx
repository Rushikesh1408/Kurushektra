import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Icon, ProgressBar, SimulatedDemoLabel } from '../../components/ui';
import { mockAdminUsers, mockMastery, mockSubmissions, mockReviews } from '../../data/mockData';

export default function LearnerReviewPage() {
  const { id } = useParams<{ id: string }>();

  const learner = mockAdminUsers.find(u => u.id === id) || mockAdminUsers[0];
  const learnerReviews = mockReviews.filter(r => r.learnerId === learner.id);

  const [notes, setNotes] = useState(learnerReviews[0]?.notes || '');
  const [status, setStatus] = useState<'pending' | 'approved' | 'intervention'>('pending');
  const [saved, setSaved] = useState(false);

  const handleSaveReview = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-outline-variant">
        <div>
          <div className="flex items-center gap-2 text-label-xs font-mono text-outline uppercase mb-1">
            <Link to="/teacher/dashboard" className="hover:text-primary transition-colors flex items-center gap-1">
              <Icon name="arrow_back" size={14} />
              <span>Back to Cohort</span>
            </Link>
            <span>/</span>
            <span>Learner Dossier</span>
          </div>
          <h1 className="text-headline-lg text-primary font-bold">{learner.name}</h1>
          <p className="text-body-sm text-on-surface-variant font-mono">
            {learner.email} · ID: {learner.id} · Enrolled: {new Date(learner.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <SimulatedDemoLabel />
          <span className="badge badge-info font-mono uppercase text-label-xs">Active Student</span>
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 bg-surface-container-low border border-outline-variant space-y-1">
          <span className="text-label-xs font-mono uppercase text-outline">Verified Mastery</span>
          <span className="text-headline-lg font-mono font-bold text-emerald-400">82.5%</span>
          <span className="text-label-xs text-on-surface-variant font-mono">Demonstrated algorithmic invariant competency</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant space-y-1">
          <span className="text-label-xs font-mono uppercase text-outline">Total Submissions</span>
          <span className="text-headline-lg font-mono font-bold text-primary">{mockSubmissions.length}</span>
          <span className="text-label-xs text-on-surface-variant font-mono">3 Accepted, 1 TLE, 1 Wrong Answer</span>
        </div>

        <div className="card p-4 bg-surface-container-low border border-outline-variant space-y-1">
          <span className="text-label-xs font-mono uppercase text-outline">Integrity & Anomaly Flags</span>
          <span className="text-headline-lg font-mono font-bold text-amber-400">1 Review Flag</span>
          <span className="text-label-xs text-on-surface-variant font-mono">Neutral telemetry audit indicator</span>
        </div>
      </div>

      {/* Review Notes Form */}
      <form onSubmit={handleSaveReview} className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-headline-sm text-primary font-semibold">Faculty Review & Intervention Notes</h2>
          <span className="text-label-xs font-mono text-outline">Confidential faculty record</span>
        </div>

        <div>
          <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Evaluation Status</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStatus('pending')}
              className={`px-3 py-1.5 rounded font-mono text-label-xs uppercase transition-colors border ${
                status === 'pending' ? 'bg-surface-container-high border-primary text-primary font-bold' : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              Needs Review
            </button>
            <button
              type="button"
              onClick={() => setStatus('approved')}
              className={`px-3 py-1.5 rounded font-mono text-label-xs uppercase transition-colors border ${
                status === 'approved' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold' : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              Mastery Approved
            </button>
            <button
              type="button"
              onClick={() => setStatus('intervention')}
              className={`px-3 py-1.5 rounded font-mono text-label-xs uppercase transition-colors border ${
                status === 'intervention' ? 'bg-amber-500/20 border-amber-500 text-amber-400 font-bold' : 'border-outline-variant text-on-surface-variant'
              }`}
            >
              Schedule 1-on-1 Office Hours
            </button>
          </div>
        </div>

        <div>
          <label className="text-label-xs font-mono uppercase text-outline block mb-1.5">Instructor Observation Notes</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full bg-surface-container-lowest border border-outline-variant rounded p-3 text-body-sm text-primary font-mono focus:outline-none focus:border-outline"
            placeholder="Record observations regarding code approach, understanding follow-up gaps, or recommended remediation..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          {saved && (
            <span className="text-emerald-400 font-mono text-label-xs flex items-center gap-1">
              <Icon name="check" size={14} /> Notes and status updated!
            </span>
          )}
          <button type="submit" className="btn btn-primary btn-sm font-mono ml-auto">
            Save Review Decision
          </button>
        </div>
      </form>

      {/* Concept Mastery Inventory */}
      <div className="card p-6 bg-surface-container-low border border-outline-variant space-y-4">
        <h2 className="text-headline-sm text-primary font-semibold">Concept Invariant Breakdown</h2>
        <div className="space-y-3">
          {mockMastery.map((m, i) => (
            <div key={i} className="p-3 bg-surface-container-lowest rounded border border-outline-variant flex items-center justify-between gap-4">
              <div className="space-y-0.5">
                <span className="text-body-sm font-semibold text-primary">{m.concept}</span>
                <span className="text-label-xs font-mono text-outline block">Confidence: {m.confidence}</span>
              </div>
              <div className="flex items-center gap-4 w-44">
                <ProgressBar value={m.percentage} max={100} variant={m.percentage > 80 ? 'success' : 'primary'} className="flex-1" />
                <span className="text-label-sm font-mono text-primary font-bold w-10 text-right">{m.percentage}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
