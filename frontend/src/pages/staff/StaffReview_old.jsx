// src/pages/staff/SelfReview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/lib/supabaseClient';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';

const quarterOptions = ['Q1 2025','Q2 2025','Q3 2025','Q4 2025'];
// put above the component
function coerceMeasureType(raw, { currency, target_value, unit } = {}) {
  const t = String(raw || '').trim().toLowerCase();

  if (['numeric','number','count','units','unit','percentage','percent','ratio','qty','quantity'].includes(t)) {
    return 'numeric';
  }
  if (['monetary','money','currency','amount','ghs','usd','eur','gbp'].includes(t)) {
    return 'monetary';
  }
  if (currency) return 'monetary';
  if (typeof target_value === 'number' && isFinite(target_value)) return 'numeric';

  return 'qualitative';
}


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

      // 1) load assigned goals WITH measure fields
      const { data: assigned, error: aErr } = await supabase
        .schema('app').from('goal_assignments')
        .select(`
          goals:goals(
            id,
            label,
            measure_type,
            unit,
            currency,
            target_value,
            meta
          )
        `)
        .eq('employee_id', meRow.id);
      if (aErr) throw aErr;

      const myGoalsRaw = (assigned || [])
        .map(x => x.goals)
        .filter(Boolean);

      // normalize type + fields
      let myGoals = myGoalsRaw.map(g => {
        const unit = g.unit ?? g.meta?.unit ?? null;
        const currency = g.currency ?? g.meta?.measure_currency ?? null;
        const target_value = g.target_value ?? g.target ?? null;
        const type = coerceMeasureType(g.measure_type ?? g.meta?.measure_type, { currency, target_value, unit });
        return {
          id: g.id,
          title: g.label,
          type,
          unit,
          currency,
          target_value
        };
      });

      // 2) prefill latest progress for this quarter (optional but nice)
      let latestMap = new Map();
      try {
        const ids = myGoals.map(g => g.id);
        if (ids.length) {
          const { data: lp } = await supabase
            .rpc('goal_progress_latest', { p_goal_ids: ids, p_quarter: quarter }); // your existing RPC
          if (Array.isArray(lp)) latestMap = new Map(lp.map(x => [x.goal_id, x]));
        }
      } catch { /* ignore if RPC not present */ }

      // 3) existing draft rows for this quarter (rating/comment)
      let existing = [];
      try {
        const { data: r } = await supabase
          .schema('app').from('self_reviews')
          .select('goal_id, rating, comment')
          .eq('employee_id', meRow.id)
          .eq('quarter', quarter);
        existing = r || [];
      } catch { /* table may not exist yet */ }

      // 4) build UI rows
      const merged = myGoals.map(g => {
        const found = existing.find(e => e.goal_id === g.id);
        const lp = latestMap.get(g.id) || {};
        return {
          goal_id: g.id,
          title: g.title,
          type: g.type,                 // 'numeric' | 'monetary' | 'qualitative'
          unit: g.unit,
          currency: g.currency,
          target_value: g.target_value,

          // progress editor state:
          value: lp.value ?? '',        // numeric or monetary amount
          qual_status: lp.qual_status || 'in_progress',
          note: '',                     // optional note to attach to progress

          // review state:
          rating: found?.rating ?? '',
          comment: found?.comment ?? ''
        };
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
async function saveProgress(r) {
  try {
    setBusy(true); setErr(''); setOk('');

    if (r.type === 'numeric' || r.type === 'monetary') {
      // existing numeric/monetary path
      const measuredAtIso = new Date().toISOString(); // or let SQL coalesce(now())
      const { error } = await supabase
        .schema('public')              // 👈 match your working modal
        .rpc('add_goal_measurement', {
          p_goal_id: r.goal_id,
          p_value: r.value === '' ? null : Number(r.value),
          p_measured_at: measuredAtIso,
          p_note: r.note || null,
        });
      if (error) throw error;
    } else {
      // qualitative path — needs its own RPC
      const { error } = await supabase
        .schema('public')
        .rpc('add_goal_qual_update', {       // 👈 create this tiny RPC (see Option B SQL #2)
          p_goal_id: r.goal_id,
          p_qual_status: r.qual_status || 'in_progress',
          p_note: r.note || null,
        });
      if (error) throw error;
    }

    setOk('Progress saved.');
    setCell(r.goal_id, { note: '' });
  } catch (e) {
    setErr(String(e.message || e));
  } finally {
    setBusy(false);
  }
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
        <th className="py-2 pr-3 w-[28rem]">Progress update</th>
        <th className="py-2 pr-3 w-32">Rating (1–5)</th>
        <th className="py-2 pr-3">Comments</th>
      </tr>
    </thead>
    <tbody>
      {rows.map(r => (
        <tr key={r.goal_id} className="border-t border-gray-200/60 align-top">
          <td className="py-3 pr-3">
            <div className="font-medium">{r.title}</div>
            <div className="text-xs text-gray-500">
              {r.type === 'numeric' && <>Target: <b>{r.target_value ?? '—'}</b> {r.unit || ''}</>}
              {r.type === 'monetary' && <>Target: <b>{r.target_value ?? '—'}</b> {r.currency || ''}</>}
              {r.type === 'qualitative' && <>Status-based</>}
            </div>
          </td>

          {/* Progress editor cell */}
          <td className="py-3 pr-3">
            {r.type === 'numeric' && (
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <input
                    type="number" step="any"
                    className="w-40 rounded-lg border p-2 dark:bg-gray-900"
                    placeholder={`Current ${r.unit || ''}`}
                    value={r.value}
                    onChange={e=>setCell(r.goal_id, { value: e.target.value })}
                  />
                  {r.unit ? <span className="self-center text-xs text-gray-500">{r.unit}</span> : null}
                </div>
                <textarea
                  className="w-full rounded-lg border p-2 dark:bg-gray-900"
                  rows={2}
                  placeholder="Note (optional)"
                  value={r.note}
                  onChange={e=>setCell(r.goal_id, { note: e.target.value })}
                />
                <button
                  className="self-start px-3 py-1.5 rounded-lg border text-xs"
                  onClick={()=>saveProgress(r)}
                >
                  Save progress
                </button>
              </div>
            )}

            {r.type === 'monetary' && (
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <input
                    className="w-24 rounded-lg border p-2 dark:bg-gray-900"
                    placeholder="Cur."
                    value={r.currency || ''}
                    onChange={e=>setCell(r.goal_id, { currency: e.target.value })}
                  />
                  <input
                    type="number" step="0.01"
                    className="w-40 rounded-lg border p-2 dark:bg-gray-900"
                    placeholder="Amount"
                    value={r.value}
                    onChange={e=>setCell(r.goal_id, { value: e.target.value })}
                  />
                </div>
                <textarea
                  className="w-full rounded-lg border p-2 dark:bg-gray-900"
                  rows={2}
                  placeholder="Note (optional)"
                  value={r.note}
                  onChange={e=>setCell(r.goal_id, { note: e.target.value })}
                />
                <button
                  className="self-start px-3 py-1.5 rounded-lg border text-xs"
                  onClick={()=>saveProgress(r)}
                >
                  Save progress
                </button>
              </div>
            )}

            {r.type === 'qualitative' && (
              <div className="grid gap-2">
                <div className="flex flex-wrap gap-2">
                  {['not_started','in_progress','blocked','done'].map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setCell(r.goal_id, { qual_status: s })}
                      className={`px-3 py-1.5 rounded-full border text-xs ${
                        r.qual_status === s ? 'bg-indigo-600 text-white border-indigo-600' : ''
                      }`}
                    >
                      {s.replace('_',' ')}
                    </button>
                  ))}
                </div>
                <textarea
                  className="w-full rounded-lg border p-2 dark:bg-gray-900"
                  rows={2}
                  placeholder="Note (optional)"
                  value={r.note}
                  onChange={e=>setCell(r.goal_id, { note: e.target.value })}
                />
                <button
                  className="self-start px-3 py-1.5 rounded-lg border text-xs"
                  onClick={()=>saveProgress(r)}
                >
                  Save progress
                </button>
              </div>
            )}
          </td>

          {/* Rating */}
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

          {/* Comment */}
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
