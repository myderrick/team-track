// frontend/src/pages/staff/StaffDashboard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO, differenceInCalendarDays, isBefore } from 'date-fns';
import { TrendingUp, AlertTriangle, Clock, CheckCircle2, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import UpdateProgressModal from '../../components/UpdateProgressModal';
import { useNavigate } from 'react-router-dom';

function currentQuarterLabel(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

function buildQuarterOptions({ years = 4, clampCurrentYearToCurrentQuarter = false } = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const startYear = Y - (years - 1);
  const opts = [];
  for (let y = startYear; y <= Y; y++) {
    const maxQ = clampCurrentYearToCurrentQuarter && y === Y ? Math.floor(now.getMonth() / 3) + 1 : 4;
    for (let q = 1; q <= maxQ; q++) {
      opts.push(`Q${q} ${y}`);
    }
  }
  return opts.reverse();
}

function quarterBounds(label) {
  const [qStr, yStr] = (label || '').split(' ');
  const year = Number(yStr || new Date().getFullYear());
  const q = Number((qStr || 'Q1').replace('Q','')) || 1;
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0);
  return { start, end };
}

const currencySymbol = (code) =>
  ({ USD:'$', EUR:'€', GBP:'£', GHS:'GH₵' }[(code||'').toUpperCase()] || '');

const fmtMeasure = (n, unit, currency_code) => {
  if (currency_code) return `${currencySymbol(currency_code)} ${Number(n||0).toLocaleString()}`;
  if (unit)          return `${Number(n||0).toLocaleString()} ${unit}`;
  return Number(n||0).toLocaleString();
};

export default function StaffDashboard() {
  const { orgId } = useOrg();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();


  const quarterOptions = useMemo(() => buildQuarterOptions({ years: 4 }), []);
  const [quarter, setQuarter] = useState(currentQuarterLabel());

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [modalGoal, setModalGoal] = useState(null);

  const [me, setMe] = useState(null);
  const [manager, setManager] = useState(null);
  const [peers, setPeers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [latest, setLatest] = useState({});
  const [feedback, setFeedback] = useState([]);


  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setErr('');

        const { data, error } = await supabase
          .schema('public')
          .rpc('my_dashboard', { p_quarter: quarter });

        if (cancel) return;
        if (error) throw error;

        setMe(data?.me || null);
        setManager(data?.manager || null);
        setPeers(data?.peers || []);
        setFeedback(data?.feedback || []);

        const latestMap = Object.fromEntries(
          (data?.latest_measurements || []).map(m => [
            m.goal_id,
            { value: Number(m.value || 0), measured_at: m.measured_at }
          ])
        );
        setLatest(latestMap);

        // 🔧 Normalize a reliable title so UI can always render it
        // inside the effect that loads my_dashboard, replace your current normalization:
const normalizedGoals = (data?.goals || []).map(g => ({
  ...g,
  // reliable title
  title: g.title ?? g.label ?? g.name ?? g.goal_title ?? g.goal ?? g.text ?? 'Untitled goal',
  // 🔧 map DB fields to what the UI expects
  target: g.target ?? g.target_value ?? null,
  currency_code: g.currency ?? g.currency_code ?? null,
  unit: g.unit ?? g.measure_unit ?? g.uom ?? '',
  measure_type: g.measure_type ?? g.type ?? (g.currency ? 'monetary' : 'numeric'),
  //org_goal
  org_goal_label: g.org_goal_label ?? 'None',  // ✅ use the DB label
}));

setGoals(normalizedGoals);

      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [quarter]);

  const rows = useMemo(() => {
    const today = new Date();
    return goals.map(g => {
      const cur = latest[g.id]?.value ?? 0;
      const pct = g.measure_type === 'qualitative' ? null : (g.target ? Math.min(100, Math.round((cur / g.target) * 100)) : null);

      let status = 'On track';
      if (g.measure_type !== 'qualitative' && g.target > 0) {
        const isOverdue = g.deadline && isBefore(new Date(g.deadline), today);
        const daysLeft = g.deadline ? differenceInCalendarDays(new Date(g.deadline), today) : null;

        if (isOverdue && (pct ?? 0) < 100) status = 'Overdue';
        else if (daysLeft !== null && daysLeft <= 14 && (pct ?? 0) < 70) status = 'At risk';
        else if ((pct ?? 0) < 40) status = 'Behind';
      } else if (g.measure_type === 'qualitative') {
        status = 'In progress';
      }

      return { ...g, current: cur, pct, status };
    });
  }, [goals, latest]);

  const counts = useMemo(() => {
    const c = { on:0, risk:0, behind:0, overdue:0, qualitative:0 };
    rows.forEach(r => {
      if (r.measure_type === 'qualitative') { c.qualitative++; return; }
      switch (r.status) {
        case 'On track': c.on++; break;
        case 'At risk': c.risk++; break;
        case 'Behind': c.behind++; break;
        case 'Overdue': c.overdue++; break;
        default: break;
      }
    });
    return c;
  }, [rows]);

 function StatusPill({ status }) {
  const map = {
    'On track':     'text-emerald-700 bg-emerald-50 ring-1 ring-inset ring-emerald-200 dark:text-emerald-300 dark:bg-emerald-900/30 dark:ring-emerald-800/80',
    'At risk':      'text-amber-800  bg-amber-50  ring-1 ring-inset ring-amber-200  dark:text-amber-300  dark:bg-amber-900/30  dark:ring-amber-800/80',
    'Behind':       'text-yellow-800 bg-yellow-50 ring-1 ring-inset ring-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30 dark:ring-yellow-800/80',
    'Overdue':      'text-red-700    bg-red-50    ring-1 ring-inset ring-red-200    dark:text-red-300    dark:bg-red-900/30    dark:ring-red-800/80',
    'In progress':  'text-blue-700   bg-blue-50   ring-1 ring-inset ring-blue-200   dark:text-blue-300   dark:bg-blue-900/30   dark:ring-blue-800/80',
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status] || 'text-gray-700 bg-gray-100 ring-1 ring-inset ring-gray-200 dark:text-gray-300 dark:bg-gray-800 dark:ring-gray-700'}`}>
      {status}
    </span>
  );
}


  function logProgress(goal) {
    setModalGoal(goal);
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          onToggleDark={() => {
            const el = document.documentElement;
            const isDark = el.classList.toggle('dark');
            try { localStorage.setItem('theme', isDark ? 'dark' : 'light'); } catch {}
          }}
        />

        {/* Filters */}
        <div className="toolbar flex items-center justify-between px-6 py-4 sticky top-14 z-10 shadow ml-16 group-hover:ml-64">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-sm muted">Personal performance overview</p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={quarter}
              onChange={e => setQuarter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-[var(--card)] border-[var(--border)]"
            >
              {quarterOptions.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
        </div>

        {me &&
          <UpdateProgressModal
            open={!!modalGoal}
            goal={modalGoal}
            meId={me.id}
            onClose={() => setModalGoal(null)}
            onSaved={(value, measuredAt) => {
              setLatest(s => ({ ...s, [modalGoal.id]: { value, measured_at: measuredAt } }));
              setModalGoal(null);
            }}
          />
        }

        <main className="flex-1 ml-16 mt-4 mr-4 mb-4 px-6 overflow-auto">
          {loading ? (
            <div className="p-6 text-sm text-[var(--fg-muted)]">Loading…</div>
          ) : err ? (
            <div className="p-6"><EmptyState title="Unable to load" subtitle={err} /></div>
          ) : !me ? (
            <div className="p-6"><EmptyState title="No profile" subtitle="Ask HR to link your account to an employee record." /></div>
          ) : (
            <>

             <div className="flex justify-between items-center mb-4">
          {/* Button to switch to /dashboard */}
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="mt-2 inline-flex items-center text-sm px-3 py-1.5 rounded-md bg-blue-600 text-white hover:bg-blue-700"
          >
            Switch to Manager Dashboard
          </button>

          </div>
              {/* Profile strip */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="card p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{me.full_name}</div>
                      <div className="text-sm muted">{me.title} • {me.department || '—'}</div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  {manager && (
                    <div className="mt-4 text-sm">
                      <div className="font-medium">Manager</div>
                      <div className="muted">{manager.full_name}{manager.title ? ` • ${manager.title}` : ''}</div>
                    </div>
                  )}
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5" />
                    <div className="font-semibold">Goal health</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div>
                      <div className="font-bold">{counts.on}</div>
                      <div className="text-green-700 dark:text-green-400">On track</div>
                    </div>
                    <div>
                      <div className="font-bold">{counts.risk}</div>
                      <div className="text-amber-700 dark:text-amber-400">At risk</div>
                    </div>
                    <div>
                      <div className="font-bold">{counts.behind}</div>
                      <div className="text-yellow-700 dark:text-yellow-400">Behind</div>
                    </div>
                    <div>
                      <div className="font-bold">{counts.overdue}</div>
                      <div className="text-red-700 dark:text-red-400">Overdue</div>
                    </div>
                  </div>
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5" />
                    <div className="font-semibold">My team</div>
                  </div>
                  {peers.length === 0
                    ? <div className="text-sm muted">No peers listed.</div>
                    : <ul className="text-sm space-y-1">{peers.map(p => <li key={p.id}>{p.full_name} • {p.title || '—'}</li>)}</ul>}
                </div>
              </div>

               {/* Goals table & stats  */}
              <div className="card mb-6 rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">My goals</div>
                  <a href="/staff/self-review" className="text-sm font-medium text-[var(--accent)] hover:underline">Start self-review →</a>
                </div>

                {rows.length === 0 ? (
                  <EmptyState title="No goals" subtitle="Your assigned goals will appear here." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-[var(--fg-muted)] bg-[var(--surface)]">
                        <tr>
                          <th className="py-2 pr-3 border-b border-[var(--border)] p-1 rounded-tl-xl">Goal</th>
                          <th className="py-2 pr-3 border-b border-[var(--border)]">Current</th>
                          <th className="py-2 pr-3 border-b border-[var(--border)]">Target</th>
                          <th className="py-2 pr-3 border-b border-[var(--border)]">Deadline</th>
                          <th className="py-2 pr-3 border-b border-[var(--border)]">Status</th>
                          <th className="py-2 pr-3 border-b border-[var(--border)]">Org goal</th>
                          <th className="py-2 pr-3 text-right border-b border-[var(--border)] rounded-tr-xl">Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {rows.map(g => (
                          <tr key={g.id} className="border-t border-[var(--border)] hover:bg-[var(--surface)] transition-colors">
                            <td className="py-3 pr-3 pl-1 max-w-sm">
                              <div className="font-medium">{g.title}</div>
                              {g.description && <div className="text-xs text-[var(--fg-muted)] line-clamp-1">{g.description}</div>}
                            </td>
                            <td className="py-3 pr-3">{g.measure_type === 'qualitative' ? '—' : fmtMeasure(g.current, g.unit, g.currency_code)}</td>
                            <td className="py-3 pr-3">{g.measure_type === 'qualitative' ? '—' : fmtMeasure(g.target, g.unit, g.currency_code)}</td>
                            <td className="py-3 pr-3">{g.deadline ? format(parseISO(g.deadline), 'd MMM yyyy') : '—'}</td>
                            <td className="py-3 pr-3"><StatusPill status={g.status} /></td>
                            <td className="py-3 pr-3"><StatusPill status={g.org_goal_label} /></td>
                            <td className="py-3 pr-3 text-right">
                              {g.measure_type !== 'qualitative' ? (
                                <button
                                  onClick={() => logProgress(g)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:bg-indigo-700"
                                >
                                  <Plus className="w-4 h-4" /> Update
                                </button>
                              ) : (
                                <span className="text-xs text-[var(--fg-muted)]">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="card p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                    <div className="text-lg font-semibold">Due soon & overdue</div>
                  </div>
                  <ul className="text-sm space-y-2">
                    {rows
                      .filter(r => r.measure_type !== 'qualitative')
                      .filter(r => r.status === 'At risk' || r.status === 'Overdue' || r.status === 'Behind')
                      .slice(0, 6)
                      .map(r => (
                        <li key={r.id} className="flex justify-between">
                          <span className="truncate">{r.title}</span>
                          <StatusPill status={r.status} />
                        </li>
                      ))
                    }
                    {rows.filter(r => ['At risk','Overdue','Behind'].includes(r.status)).length === 0 &&
                      <li className="text-[var(--fg-muted)]">Nothing urgent 🎉</li>}
                  </ul>
                </div>

                <div className="card p-5">
                  <div className="text-lg font-semibold mb-3">Recent feedback</div>
                  {feedback.length === 0 ? (
                    <div className="text-sm text-[var(--fg-muted)]">No feedback yet.</div>
                  ) : (
                    <ul className="text-sm space-y-3">
                      {feedback.map(f => (
                        <li key={f.id} className="border rounded-lg p-3 border-[var(--border)]">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{f.author_name || 'Manager'}</div>
                            <div className="text-xs text-[var(--fg-muted)]">{format(parseISO(f.created_at), 'd MMM')}</div>
                          </div>
                          <div className="mt-1">{f.note}</div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
