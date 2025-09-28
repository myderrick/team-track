import React, { useEffect, useMemo, useState } from 'react';
import { format, parseISO, differenceInCalendarDays, isBefore } from 'date-fns';
import { TrendingUp, AlertTriangle, Clock, CheckCircle2, Plus } from 'lucide-react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import UpdateProgressModal from '../../components/UpdateProgressModal';

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
  return opts.reverse(); // newest first in the dropdown
}


function quarterBounds(label) {
  // label like "Q3 2025"
  const [qStr, yStr] = (label || '').split(' ');
  const year = Number(yStr || new Date().getFullYear());
  const q = Number((qStr || 'Q1').replace('Q','')) || 1;
  const startMonth = (q - 1) * 3;
  const start = new Date(year, startMonth, 1);
  const end = new Date(year, startMonth + 3, 0); // end of quarter
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
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const quarterOptions = useMemo(() => buildQuarterOptions({ years: 4 }), []);
const [quarter, setQuarter] = useState(currentQuarterLabel());

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [modalGoal, setModalGoal] = useState(null);

  // core data
  const [me, setMe] = useState(null);                // my employee row
  const [manager, setManager] = useState(null);      // manager employee row
  const [peers, setPeers] = useState([]);            // coworkers sharing my manager
  const [goals, setGoals] = useState([]);            // assigned goals (with target/unit/measure_type/deadline/meta.currency_code)
  const [latest, setLatest] = useState({});          // { [goal_id]: { value, measured_at } }
  const [feedback, setFeedback] = useState([]);      // optional, from app.feedback

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

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

      // Expecting: { me, goals, latest_measurements, manager, peers, feedback }
      setMe(data?.me || null);
      setManager(data?.manager || null);
      setPeers(data?.peers || []);
      setFeedback(data?.feedback || []);

      // latest: map -> { [goal_id]: { value, measured_at } }
      const latestMap = Object.fromEntries(
        (data?.latest_measurements || []).map(m => [
          m.goal_id,
          { value: Number(m.value || 0), measured_at: m.measured_at }
        ])
      );
      setLatest(latestMap);

      // goals already normalized by the RPC (id, title, measure_type, unit, currency_code, target, deadline, description, department)
      setGoals(data?.goals || []);
    } catch (e) {
      if (!cancel) setErr(String(e.message || e));
    } finally {
      if (!cancel) setLoading(false);
    }
  })();
  return () => { cancel = true; };
}, [quarter]);


  // Compute statuses
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
        else if ((pct ?? 0) < 40) status = 'Behind'; // simple early warning
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
      'On track': 'bg-green-50 text-green-700',
      'At risk': 'bg-amber-50 text-amber-800',
      'Behind': 'bg-yellow-50 text-yellow-800',
      'Overdue': 'bg-red-50 text-red-700',
      'In progress': 'bg-blue-50 text-blue-700',
    };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${map[status] || 'bg-gray-100'}`}>{status}</span>;
  }

  
  function logProgress(goal) {
   setModalGoal(goal);
 }


  return (
    <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(m => !m)}
        />

        {/* Filters */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 group-hover:ml-64">
          <div>
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p className="text-sm text-gray-500">Personal performance overview</p>
          </div>
          <div className="flex gap-3 items-center">
           <select
  value={quarter}
  onChange={e => setQuarter(e.target.value)}
  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
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
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : err ? (
            <div className="p-6"><EmptyState title="Unable to load" subtitle={err} /></div>
          ) : !me ? (
            <div className="p-6"><EmptyState title="No profile" subtitle="Ask HR to link your account to an employee record." /></div>
          ) : (
            <>
              {/* Profile strip */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold">{me.full_name}</div>
                      <div className="text-sm text-gray-500">{me.title} • {me.department || '—'}</div>
                    </div>
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  {manager && (
                    <div className="mt-4 text-sm">
                      <div className="font-medium">Manager</div>
                      <div className="text-gray-600">{manager.full_name}{manager.title ? ` • ${manager.title}` : ''}</div>
                    </div>
                  )}
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5" />
                    <div className="font-semibold">Goal health</div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center text-sm">
                    <div><div className="font-bold">{counts.on}</div><div className="text-green-700">On track</div></div>
                    <div><div className="font-bold">{counts.risk}</div><div className="text-amber-700">At risk</div></div>
                    <div><div className="font-bold">{counts.behind}</div><div className="text-yellow-700">Behind</div></div>
                    <div><div className="font-bold">{counts.overdue}</div><div className="text-red-700">Overdue</div></div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="w-5 h-5" />
                    <div className="font-semibold">My team</div>
                  </div>
                  {peers.length === 0
                    ? <div className="text-sm text-gray-500">No peers listed.</div>
                    : <ul className="text-sm space-y-1">{peers.map(p => <li key={p.id}>{p.full_name} • {p.title || '—'}</li>)}</ul>}
                </div>
              </div>

              {/* Goals table */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">My goals</div>
                  <a href="/staff/self-review" className="text-sm font-medium text-indigo-600 hover:underline">Start self-review →</a>
                </div>

                {rows.length === 0 ? (
                  <EmptyState title="No goals" subtitle="Your assigned goals will appear here." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-gray-500">
                        <tr>
                          <th className="py-2 pr-3">Goal</th>
                          <th className="py-2 pr-3">Current</th>
                          <th className="py-2 pr-3">Target</th>
                          <th className="py-2 pr-3">Deadline</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map(g => (
                          <tr key={g.id} className="border-t border-gray-200/60">
                            <td className="py-3 pr-3">
                              <div className="font-medium">{g.title}</div>
                              {g.description && <div className="text-xs text-gray-500 line-clamp-1">{g.description}</div>}
                            </td>
                            <td className="py-3 pr-3">{g.measure_type === 'qualitative' ? '—' : fmtMeasure(g.current, g.unit, g.currency_code)}</td>
                            <td className="py-3 pr-3">{g.measure_type === 'qualitative' ? '—' : fmtMeasure(g.target, g.unit, g.currency_code)}</td>
                            <td className="py-3 pr-3">{g.deadline ? format(parseISO(g.deadline), 'd MMM yyyy') : '—'}</td>
                            <td className="py-3 pr-3"><StatusPill status={g.status} /></td>
                            <td className="py-3 pr-3 text-right">
                              {g.measure_type !== 'qualitative' ? (
                                <button
                                  onClick={() => logProgress(g)}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                                >
                                  <Plus className="w-4 h-4" /> Update
                                </button>
                              ) : (
                                <span className="text-xs text-gray-500">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Misses & Feedback */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
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
                      <li className="text-gray-500">Nothing urgent 🎉</li>}
                  </ul>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                  <div className="text-lg font-semibold mb-3">Recent feedback</div>
                  {feedback.length === 0 ? (
                    <div className="text-sm text-gray-500">No feedback yet.</div>
                  ) : (
                    <ul className="text-sm space-y-3">
                      {feedback.map(f => (
                        <li key={f.id} className="border rounded-lg p-3 border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="font-medium">{f.author_name || 'Manager'}</div>
                            <div className="text-xs text-gray-500">{format(parseISO(f.created_at), 'd MMM')}</div>
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
