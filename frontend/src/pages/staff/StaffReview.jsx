// src/pages/staff/SelfReview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';

const quarterOptions = ['Q1 2025','Q2 2025','Q3 2025','Q4 2025'];

export default function SelfReview() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [quarter, setQuarter] = useState(quarterOptions[1]);
  const [me, setMe] = useState(null);
  const [goals, setGoals] = useState([]);
  const [rows, setRows] = useState([]); // [{goal_id, title, rating, comment}]
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [ok, setOk] = useState('');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // load me + assigned goals
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setErr(''); setOk('');
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sign in required.');

        const { data: meRow, error: meErr } = await supabase
          .schema('app').from('employees')
          .select('id, full_name').eq('user_id', user.id).maybeSingle();
        if (meErr) throw meErr;
        if (!meRow) throw new Error('No employee profile linked.');
        if (cancel) return;
        setMe(meRow);

        const { data: assigned, error: aErr } = await supabase
          .schema('app').from('goal_assignments')
          .select('goals:goals(id,label,measure_type,unit,meta)')
          .eq('employee_id', meRow.id);
        if (aErr) throw aErr;

        const myGoals = (assigned || [])
          .map(x => x.goals)
          .filter(Boolean)
          .map(g => ({ id: g.id, title: g.label }));

        // existing draft rows for this quarter
        let existing = [];
        try {
          const { data: r } = await supabase
            .schema('app').from('self_reviews')
            .select('goal_id, rating, comment')
            .eq('employee_id', meRow.id)
            .eq('quarter', quarter);
          existing = r || [];
        } catch { /* table may not exist yet */ }

        const merged = myGoals.map(g => {
          const found = existing.find(e => e.goal_id === g.id);
          return { goal_id: g.id, title: g.title, rating: found?.rating ?? '', comment: found?.comment ?? '' };
        });

        if (!cancel) { setGoals(myGoals); setRows(merged); }
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      }
    })();
    return () => { cancel = true; };
  }, [quarter]);

  function setCell(goal_id, patch) {
    setRows(rs => rs.map(r => r.goal_id === goal_id ? { ...r, ...patch } : r));
  }

  async function save(status) {
    try {
      setBusy(true); setErr(''); setOk('');
      if (!me) throw new Error('No profile.');

      const payload = rows.map(r => ({
        employee_id: me.id,
        goal_id: r.goal_id,
        quarter,
        rating: r.rating === '' ? null : Number(r.rating),
        comment: r.comment || null,
        status, // 'draft' | 'submitted'
      }));

      // requires unique index on (employee_id, goal_id, quarter)
      const { error } = await supabase
        .schema('app')
        .from('self_reviews')
        .upsert(payload, { onConflict: 'employee_id,goal_id,quarter' });

      if (error) throw error;
      setOk(status === 'submitted' ? 'Review submitted.' : 'Draft saved.');
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
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

        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 group-hover:ml-64">
          <div>
            <h1 className="text-2xl font-bold">Self-review</h1>
            <p className="text-sm text-gray-500">Quarterly reflection on your goals</p>
          </div>
          <div className="flex gap-3 items-center">
            <select value={quarter} onChange={e=>setQuarter(e.target.value)}
                    className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
              {quarterOptions.map(q => <option key={q}>{q}</option>)}
            </select>
          </div>
        </div>

        <main className="flex-1 ml-16 mt-4 mr-4 mb-4 px-6 overflow-auto">
          {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
          {ok && <div className="mb-3 text-sm text-green-600">{ok}</div>}

          {!me ? (
            <EmptyState title="No profile" subtitle="Ask HR to link your account to an employee." />
          ) : goals.length === 0 ? (
            <EmptyState title="No goals found" subtitle="Your assigned goals will show here." />
          ) : (
            <>
              <div className="rounded-xl bg-white dark:bg-gray-800 shadow p-5">
                <table className="min-w-full text-sm">
                  <thead className="text-left text-gray-500">
                    <tr>
                      <th className="py-2 pr-3">Goal</th>
                      <th className="py-2 pr-3 w-32">Rating (1–5)</th>
                      <th className="py-2 pr-3">Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(r => (
                      <tr key={r.goal_id} className="border-t border-gray-200/60">
                        <td className="py-3 pr-3">{r.title}</td>
                        <td className="py-3 pr-3">
                          <select
                            className="w-28 rounded-lg border p-2 dark:bg-gray-900"
                            value={r.rating}
                            onChange={(e)=>setCell(r.goal_id, { rating: e.target.value })}
                          >
                            <option value="">—</option>
                            {[1,2,3,4,5].map(n => <option key={n} value={n}>{n}</option>)}
                          </select>
                        </td>
                        <td className="py-3 pr-3">
                          <textarea
                            className="w-full rounded-lg border p-2 dark:bg-gray-900"
                            rows={3}
                            value={r.comment}
                            onChange={(e)=>setCell(r.goal_id, { comment: e.target.value })}
                            placeholder="What went well? What could improve?"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 flex justify-end gap-2">
                <button
                  className="px-4 py-2 rounded-lg border dark:border-gray-700"
                  onClick={()=>save('draft')}
                  disabled={busy}
                >
                  {busy ? 'Saving…' : 'Save draft'}
                </button>
                <button
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-60"
                  onClick={()=>save('submitted')}
                  disabled={busy}
                >
                  {busy ? 'Submitting…' : 'Submit review'}
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
