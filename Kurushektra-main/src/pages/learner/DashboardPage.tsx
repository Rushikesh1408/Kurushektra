import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Icon, ProgressBar, SectionHeader, MasteryBadge, StatusBadge } from '../../components/ui';
import { mockMastery, mockGaps, mockSubmissions } from '../../data/mockData';
import { api } from '../../services/api';

export default function DashboardPage() {
  const { user } = useAuth();
  const [masteryData, setMasteryData] = useState(mockMastery);
  const [gapList, setGapList] = useState(mockGaps);

  useEffect(() => {
    let mounted = true;
    async function loadDashboardData() {
      try {
        const [mRes, gRes] = await Promise.allSettled([
          api.adaptive.mastery(),
          api.adaptive.gaps(),
        ]);

        if (mounted && mRes.status === 'fulfilled' && mRes.value.length > 0) {
          const mapped = mRes.value.map(bm => {
            const level =
              bm.status === 'mastered' ? 'mastered' :
              bm.status === 'in_progress' ? 'developing' :
              bm.status === 'struggling' ? 'struggling' : 'developing';
            return {
              concept: bm.name,
              level: level as any,
              percentage: Math.round(bm.mastery_score * 100),
              confidence: bm.confidence > 0.7 ? ('high' as const) : bm.confidence > 0.4 ? ('medium' as const) : ('low' as const),
              testsCompleted: bm.total_attempts,
              testsTotal: Math.max(5, bm.total_attempts + 2),
              lastAssessed: new Date().toISOString(),
            };
          });
          setMasteryData(mapped);
        }

        if (mounted && gRes.status === 'fulfilled' && gRes.value.length > 0) {
          const mappedGaps = gRes.value.map((bg, idx) => ({
            id: `gap-${idx}`,
            concept: bg.target_concept,
            severity: bg.root_mastery < 0.3 ? ('high' as const) : ('medium' as const),
            description: `${bg.reason} Focus on prerequisite: ${bg.root_gap_concept}`,
            relatedChallenges: [bg.target_slug],
            resources: [{ type: 'article' as const, title: `${bg.root_gap_concept} Documentation`, url: '#' }],
          }));
          setGapList(mappedGaps);
        }
      } catch (err) {
        console.warn('Could not load dashboard data from backend:', err);
      }
    }
    loadDashboardData();
    return () => {
      mounted = false;
    };
  }, []);

  const topMastery = masteryData.slice(0, 4);
  const recentSubmissions = mockSubmissions.slice(0, 4);

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
      {/* ── 1. WELCOME & MOTIVATIONAL HEADER ────────────────────────────── */}
      <div className="card p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1C2022] border-[#343A40]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#60E3D0]" />
            <span className="text-xs font-mono text-[#60E3D0] uppercase font-semibold">Active Learning Journey</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#F2F3F5] tracking-tight">
            Welcome back, {user?.name ? user.name.split(' ')[0] : 'Learner'}!
          </h1>
          <p className="text-sm text-[#B7BEC5] max-w-2xl leading-relaxed">
            You're making steady progress. Continue with your active challenge or focus on your recommended practice task to solidify key algorithmic concepts.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <Link to="/challenges" className="btn btn-secondary text-xs font-mono">
            <Icon name="list" size={16} />
            <span>All Challenges</span>
          </Link>
          <Link to="/workspace/c1" className="btn btn-primary text-xs font-mono">
            <Icon name="play_arrow" size={16} />
            <span>Resume Workspace</span>
          </Link>
        </div>
      </div>

      {/* ── 2. CONTINUE LEARNING & RECOMMENDED CHALLENGE ────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Active Target Card */}
        <div className="card lg:col-span-8 p-5 sm:p-6 flex flex-col justify-between bg-[#1C2022] border-[#343A40] space-y-4">
          <div>
            <SectionHeader
              icon="play_circle"
              title="Continue Learning"
              subtitle="Current Challenge in Progress"
              action={
                <span className="badge badge-primary text-xs font-mono">
                  In Progress
                </span>
              }
            />

            <div className="space-y-2 mt-2">
              <div className="flex items-center gap-2">
                <span className="badge badge-neutral text-xs font-mono">Data Structures</span>
                <span className="text-xs text-[#737E89] font-mono">Estimated time: 10 mins</span>
              </div>
              <h2 className="text-xl font-bold text-[#F2F3F5]">
                Two Sum — Hash Map Optimization
              </h2>
              <p className="text-sm text-[#B7BEC5] leading-relaxed">
                Learn how to trade linear memory for constant lookup time. Instead of quadratic brute-force nested loops, check whether each number's complement is already in your hash map.
              </p>
            </div>

            {/* Why this is recommended */}
            <div className="mt-4 p-3.5 rounded-lg bg-[#15181A] border border-[#343A40] space-y-1">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#8FAFF5]">
                <Icon name="lightbulb" size={15} />
                <span>Why this challenge is recommended for you</span>
              </div>
              <p className="text-xs text-[#B7BEC5] leading-relaxed">
                Based on your recent submissions, you have strong loop fundamentals and are ready to master constant-time hash map lookups.
              </p>
            </div>

            {/* Current Test Case Progress */}
            <div className="mt-4 space-y-1.5">
              <div className="flex justify-between items-center text-xs font-mono text-[#B7BEC5]">
                <span>Test Cases Passed: 2 of 5</span>
                <span className="text-[#60E3D0] font-semibold">40% Complete</span>
              </div>
              <ProgressBar value={40} variant="primary" />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[#343A40]">
            <span className="text-xs text-[#B7BEC5] flex items-center gap-1.5">
              <Icon name="info" size={15} className="text-[#60E3D0]" />
              <span>Edge cases remaining: negative integers and identical duplicate elements</span>
            </span>

            <div className="flex items-center gap-2">
              <Link to="/challenges/c1" className="btn btn-secondary text-xs font-mono">
                Challenge Details
              </Link>
              <Link to="/workspace/c1" className="btn btn-primary text-xs font-mono flex items-center gap-1">
                <span>Resume Coding</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            </div>
          </div>
        </div>

        {/* Next Recommended Practice Task */}
        <div className="card lg:col-span-4 p-5 sm:p-6 flex flex-col justify-between bg-[#1C2022] border-[#343A40] space-y-4">
          <div>
            <SectionHeader
              icon="fitness_center"
              title="Next Recommended Task"
              subtitle="Targeted Practice Drill"
              badge={<span className="badge badge-warning text-xs font-mono">High Impact</span>}
            />

            <h3 className="text-base font-bold text-[#F2F3F5] mt-2 mb-1.5">
              Binary Search Boundary Drill
            </h3>
            <p className="text-xs sm:text-sm text-[#B7BEC5] leading-relaxed mb-3">
              Strengthen off-by-one boundary handling when pointers converge (<code className="text-xs bg-[#15181A] px-1 py-0.5 rounded text-[#60E3D0]">left == right</code>) on single-element arrays.
            </p>

            <div className="p-3 rounded bg-[#15181A] border border-[#343A40] space-y-1.5 text-xs text-[#B7BEC5]">
              <span className="text-[#F2B866] font-semibold flex items-center gap-1">
                <Icon name="flag" size={14} /> Key concept to practice:
              </span>
              <p>Ensuring the while condition <code className="text-[#F2F3F5]">while left &lt;= right</code> checks the final remaining candidate element.</p>
            </div>
          </div>

          <Link to="/practice/a1" className="btn btn-secondary w-full justify-center text-xs font-mono flex items-center gap-2">
            <Icon name="play_arrow" size={16} className="text-[#60E3D0]" />
            <span>Start Practice Drill (5 mins)</span>
          </Link>
        </div>
      </div>

      {/* ── 3. WEAK CONCEPTS & PREREQUISITE GAPS ─────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Identified Weak Concepts */}
        <div className="card lg:col-span-6 p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
          <SectionHeader
            icon="psychology_alt"
            title="Concepts Requiring Attention"
            subtitle="Identified from recent test cases & reasoning questions"
          />

          <div className="space-y-3">
            {gapList.map(gap => (
              <div
                key={gap.id}
                className="p-3.5 rounded-lg bg-[#15181A] border border-[#343A40] space-y-2 hover:border-[#56606A] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#F2F3F5]">{gap.concept}</span>
                  <span className={`badge text-xs font-mono ${gap.severity === 'high' ? 'badge-error' : 'badge-warning'}`}>
                    {gap.severity === 'high' ? 'Needs Review' : 'Practice Recommended'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#B7BEC5] leading-relaxed">
                  {gap.description}
                </p>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-[#737E89] font-mono">Found in recent attempts</span>
                  <Link
                    to={`/learn/gap/${gap.id}`}
                    className="text-xs font-mono text-[#60E3D0] hover:underline flex items-center gap-1"
                  >
                    <span>Remediate Concept</span>
                    <Icon name="arrow_forward" size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Verified Mastery Progress */}
        <div className="card lg:col-span-6 p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
          <SectionHeader
            icon="insights"
            title="Verified Mastery Progress"
            subtitle="Demonstrated understanding across algorithmic topics"
            action={
              <Link to="/mastery" className="text-xs text-[#60E3D0] hover:underline flex items-center gap-1 font-mono">
                <span>View Full Path</span>
                <Icon name="arrow_forward" size={14} />
              </Link>
            }
          />

          <div className="space-y-4">
            {topMastery.map(m => (
              <div key={m.concept} className="space-y-1.5 p-3 rounded-lg bg-[#15181A] border border-[#343A40]">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#F2F3F5]">{m.concept}</span>
                    <MasteryBadge level={m.level} />
                  </div>
                  <span className="text-xs font-bold font-mono text-[#60E3D0]">{m.percentage}%</span>
                </div>
                <ProgressBar
                  value={m.percentage}
                  variant={m.percentage >= 80 ? 'success' : m.percentage >= 50 ? 'primary' : 'warning'}
                />
                <div className="flex justify-between items-center text-[11px] font-mono text-[#737E89] pt-0.5">
                  <span>{m.testsCompleted} of {m.testsTotal} challenges verified</span>
                  <span>Confidence: {m.confidence}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 4. RECENT SUBMISSIONS & RESULTS ─────────────────────────────── */}
      <div className="card p-5 sm:p-6 bg-[#1C2022] border-[#343A40] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <SectionHeader
            icon="history"
            title="Recent Submissions & Results"
            subtitle="Review your latest code attempts and test case breakdowns"
          />
          <Link to="/history" className="text-xs font-mono text-[#60E3D0] hover:underline flex items-center gap-1">
            <span>View All History</span>
            <Icon name="arrow_forward" size={14} />
          </Link>
        </div>

        <div className="space-y-2.5">
          {recentSubmissions.map(sub => (
            <div
              key={sub.id}
              className="p-3.5 rounded-lg bg-[#15181A] border border-[#343A40] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#56606A] transition-colors"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[#F2F3F5]">{sub.challengeTitle}</span>
                  <StatusBadge status={sub.status} />
                </div>
                <div className="flex items-center gap-3 text-xs text-[#737E89] font-mono">
                  <span>{sub.language.toUpperCase()}</span>
                  <span>·</span>
                  <span>{sub.testsPassed} of {sub.testsTotal} tests passed</span>
                  <span>·</span>
                  <span>{new Date(sub.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  to={`/submissions/${sub.id}`}
                  className="btn btn-secondary text-xs font-mono py-1 px-2.5"
                >
                  <span>Review Test Run</span>
                </Link>
                <Link
                  to={`/assessment/${sub.id}`}
                  className="btn btn-primary text-xs font-mono py-1 px-2.5"
                >
                  <span>Explain Code</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
