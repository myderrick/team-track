// src/pages/staff/SelfReview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { format, parseISO } from 'date-fns';

function currentQuarterLabel(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}
function buildQuarterOptions({ years = 4 } = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const startYear = Y - (years - 1);
  const opts = [];
  for (let y = startYear; y <= Y; y++) {
    const maxQ = y === Y ? Math.floor(now.getMonth() / 3) + 1 : 4;
    for (let q = 1; q <= maxQ; q++) opts.push(`Q${q} ${y}`);
  }
  return opts.reverse();
}

export default function SelfReview() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const quarterOptions = useMemo(() => buildQuarterOptions({ years: 4 }), []);
  const [quarter, setQuarter] = useState(currentQuarterLabel());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [goals, setGoals] = useState([]);
  const [me, setMe] = useState(null);

  // compose modal state
  const [editing, setEditing] = useState(null); // { goal, review, rating, status }
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

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
        setMe(data?.me || null);
        setGoals(data?.goals || []);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [quarter]);

  const assignedGoals = useMemo(
    () => goals.filter(g => !(g.meta?.self_selected === true)),
    [goals]
  );
  const selfSelectedGoals = useMemo(
    () => goals.filter(g => g.meta?.self_selected === true),
    [goals]
  );

  function openReview(goal) {
    setEditing({
      goal,
      review: '',
      rating: 3,
      status: 'draft',
    });
  }

  async function saveReview() {
    if (!editing) return;
    setSaving(true);
    setErr('');
    try {
      const { error } = await supabase
        .schema('public')
        .rpc('save_self_review', {
          p_goal_id: editing.goal.id,
          p_quarter: quarter,
          p_review: editing.review || null,
          p_rating: editing.rating ?? null,
          p_status: editing.status || 'draft',
        });
      if (error) throw error;
      setToast('Saved.');
      setEditing(null);
      setTimeout(() => setToast(''), 1500);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
      <Sidebar /> {/* auto-detects /staff route -> staff menu */}
      <div className="flex flex-col flex-1">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(m => !m)}
        />

        {/* Filters */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 group-hover:ml-64">
          <div>
            <h1 className="text-2xl font-bold">Self-Review</h1>
            <p className="text-sm text-gray-500">Reflect on your goals and add your self-assessment</p>
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

        <main className="flex-1 ml-16 mt-4 mr-4 mb-4 px-6 overflow-auto">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading…</div>
          ) : err ? (
            <div className="p-6"><EmptyState title="Unable to load" subtitle={err} /></div>
          ) : !me ? (
            <div className="p-6"><EmptyState title="No profile" subtitle="Ask HR to link your account to an employee record." /></div>
          ) : (
            <>
              {toast && <div className="mb-3 text-sm text-green-600">{toast}</div>}

              <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Assigned goals</div>
                </div>
                {assignedGoals.length === 0 ? (
                  <EmptyState title="No assigned goals" />
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {assignedGoals.map(g => (
                      <li key={g.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{g.title}</div>
                          {g.description && <div className="text-xs text-gray-500">{g.description}</div>}
                        </div>
                        <button
                          onClick={() => openReview(g)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Write review
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">My added goals</div>
                  <span className="text-xs text-gray-500">Marked as “self-selected”</span>
                </div>
                {selfSelectedGoals.length === 0 ? (
                  <EmptyState title="No self-selected goals" />
                ) : (
                  <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selfSelectedGoals.map(g => (
                      <li key={g.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{g.title}</div>
                          {g.description && <div className="text-xs text-gray-500">{g.description}</div>}
                        </div>
                        <button
                          onClick={() => openReview(g)}
                          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                        >
                          Write review
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      {/* Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">Self-assessment</div>
              <button onClick={() => setEditing(null)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 mb-3">
              <div className="font-medium">{editing.goal.title}</div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Your review</label>
                <textarea
                  className="w-full border rounded-lg p-2"
                  rows={5}
                  value={editing.review}
                  onChange={(e)=>setEditing(s => ({ ...s, review: e.target.value }))}
                  placeholder="What went well, what could be better, context & evidence…"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Rating (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  className="w-24 border rounded-lg p-2"
                  value={editing.rating}
                  onChange={(e)=>setEditing(s => ({ ...s, rating: Number(e.target.value) }))}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <button className="px-3 py-2 rounded-lg border" onClick={() => setEditing(null)}>Cancel</button>
                <button
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                  onClick={saveReview}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
