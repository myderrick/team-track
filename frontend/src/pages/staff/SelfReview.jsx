// src/pages/staff/SelfReview.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, Target, DollarSign, Flag, Plus, Check, X } from 'lucide-react';

// ---------- helpers (module scope) ----------
const coerceNum = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// Detect "function is missing" style errors coming from PostgREST
const FN_MISSING_RE = /(schema cache|Could not find the function|does not exist|No function matches)/i;
const isFnMissing = (errOrRes) => {
  const msg = (errOrRes?.error?.message || errOrRes?.message || errOrRes || '').toString();
  return FN_MISSING_RE.test(msg);
};


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
async function rpcSafe(name, args) {
  let r = await supabase.rpc(name, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache|Could not find the function/i.test(msg)) {
    r = await supabase.schema('app').rpc(name, args);
  }
  return r;
}
async function getLatestProgress(ids, quarter) {
  let r = await rpcSafe('goal_progress_latest', { p_goal_ids: ids });
  const msg = r.error?.message || '';
  if (r.error && /does not exist|No function matches|schema cache/i.test(msg)) {
    r = await rpcSafe('goal_progress_latest', { p_goal_ids: ids, p_quarter: quarter });
  }
  return r;
}
function pct(value, target) {
  if (!target || target <= 0 || value == null) return null;
  const p = Math.max(0, Math.min(1, Number(value) / Number(target)));
  return Math.round(p * 100);
}
function ProgressBar({ percent }) {
  return (
    <div className="w-full h-2 rounded bg-gray-100 dark:bg-gray-700 overflow-hidden">
      <div
        className="h-2 bg-indigo-600 transition-all"
        style={{ width: `${Math.max(0, Math.min(100, percent || 0))}%` }}
      />
    </div>
  );
}

// ---------- page ----------
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

  // modals
  const [progressModal, setProgressModal] = useState(null); // { goal, type, ... }
  const [reviewModal, setReviewModal] = useState(null);     // { goal, review, rating, status }
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
        const r = await supabase.schema('public').rpc('my_dashboard');
        if (cancel) return;
        if (r.error) throw r.error;

        setMe(r.data?.me || null);
        let rows = (r.data?.goals || []).map(normalizeGoal);

        // If the dashboard already sent latest measurements, merge them now
        if (Array.isArray(r.data?.latest_measurements) && r.data.latest_measurements.length > 0) {
          const pre = new Map(
            r.data.latest_measurements.map((m) => [
              m.goal_id,
              { goal_id: m.goal_id, value: coerceNum(m.value), measured_at: m.measured_at, note: m.note ?? null },
            ])
          );
          rows = rows.map((g) => ({ ...g, latest_measurement: pre.get(g.id) || g.latest_measurement || null }));
        }

        // 1) latest self progress
        const ids = rows.map(g => g.id);
        if (ids.length > 0 && rows.some(g => !g.latest_progress)) {
          const r2 = await getLatestProgress(ids, quarter);
          if (!r2.error && Array.isArray(r2.data)) {
            const map = new Map(r2.data.map(x => [x.goal_id, x]));
            rows = rows.map(g => ({ ...g, latest_progress: map.get(g.id) || null }));
          }
        }

        // 2) latest measurements
        if (ids.length > 0) {
          const r3 = await rpcSafe('goal_measurement_latest', { p_goal_ids: ids });
          if (!r3.error && Array.isArray(r3.data)) {
            const map = new Map(
              r3.data.map((x) => [
                x.goal_id,
                { goal_id: x.goal_id, value: coerceNum(x.value), measured_at: x.measured_at, note: x.note ?? null },
              ])
            );
            rows = rows.map((g) => ({ ...g, latest_measurement: map.get(g.id) || g.latest_measurement || null }));
          }
        }

        setGoals(rows);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []); // no dependency on quarter

  const assignedGoals = useMemo(
    () => goals.filter(g => !(g.meta?.self_selected === true)),
    [goals]
  );
  const selfSelectedGoals = useMemo(
    () => goals.filter(g => g.meta?.self_selected === true),
    [goals]
  );

  // map DB -> UI
  function normalizeGoal(row = {}) {
  const type =
    (row.type || row.measure_type || row.meta?.measure_type || '').toLowerCase() || 'qualitative';
  return {
    ...row,
    title: row.title || row.label || row.name || '',
    description: row.description || row.details || null,
    type,                                   // 'numeric' | 'monetary' | 'qualitative'
    target_value: row.target_value ?? row.target ?? null,
    unit: row.unit ?? row.meta?.unit ?? null,
    currency: row.currency ?? row.currency_code ?? row.meta?.measure_currency ?? null,
    latest_measurement: row.latest_measurement
      ? {
          goal_id: row.latest_measurement.goal_id ?? row.id,
          value: coerceNum(row.latest_measurement.value),
          measured_at: row.latest_measurement.measured_at || null,
          note: row.latest_measurement.note || null,
        }
      : null,
    latest_progress: row.latest_progress
      ? {
          goal_id: row.latest_progress.goal_id ?? row.id,
          value: coerceNum(row.latest_progress.value),
          currency: row.latest_progress.currency || null,
          // be lenient with backend naming
          qual_status:
            row.latest_progress.qual_status ??
            row.latest_progress.status ??
            row.latest_progress.progress_status ??
            null,
          note: row.latest_progress.note || null,
          created_at: row.latest_progress.created_at || null,
        }
      : null,
  };
}


  function openProgress(goal) {
    const lp = goal.latest_progress || {};
    let t = (goal.type || '').toLowerCase();
    if (!t && typeof goal.target_value === 'number') {
      t = goal.currency ? 'monetary' : 'numeric';
    }
    if (t === 'numeric') {
      setProgressModal({ goal, type: 'numeric', value: lp.value ?? '', note: '' });
    } else if (t === 'monetary') {
      setProgressModal({ goal, type: 'monetary', value: lp.value ?? '', currency: goal.currency || lp.currency || '', note: '' });
    } else {
      setProgressModal({ goal, type: 'qualitative', qual_status: lp.qual_status || 'in_progress', note: '' });
    }
  }

  function openReview(goal) {
    setReviewModal({
      goal,
      review: '',
      rating: 3,
      status: 'draft',
    });
  }

  async function saveProgress() {
  if (!progressModal) return;
  const { goal, type } = progressModal;

  setSaving(true);
  setErr('');

  try {
    const nowIso = new Date().toISOString();

    if (type === 'numeric' || type === 'monetary') {
      // validate
      const valueNum = Number(progressModal.value);
      const value = Number.isFinite(valueNum) ? valueNum : null;
      if (value === null) {
        setErr('Please enter a valid number.');
        setSaving(false);
        return;
      }

      // 1) write measurement (this table/function exists in your DB)
      const m = await rpcSafe('add_goal_measurement', {
        p_goal_id: goal.id,
        p_measured_at: nowIso,
        p_note: progressModal.note || null,
        p_value: value,
      });
      if (m.error) throw new Error(`[add_goal_measurement] ${m.error.message || m.error}`);

      // 2) try to write progress journal (may not exist in some DBs)
      const r = await rpcSafe('add_goal_progress', {
        p_goal_id: goal.id,
        p_value: value,
        p_currency: type === 'monetary' ? (progressModal.currency || goal.currency || null) : null,
        p_qual_status: null,
        p_note: progressModal.note || null,
        p_quarter: null,
        p_measured_at: null,
      });

      if (r.error && !isFnMissing(r)) {
        // real error (not "missing function")
        throw new Error(`[add_goal_progress] ${r.error.message || r.error}`);
      }

      // 3) optimistic UI update (works even if journaling RPC is missing)
      setGoals(gs =>
        gs.map(g => {
          if (g.id !== goal.id) return g;
          const currCurrency =
            type === 'monetary' ? (progressModal.currency || goal.currency || null) : null;
          return {
            ...g,
            latest_progress: {
              goal_id: goal.id,
              value,
              currency: currCurrency,
              qual_status: null,
              note: progressModal.note || null,
              created_at: nowIso,
            },
            latest_measurement: {
              goal_id: goal.id,
              value,
              measured_at: nowIso,
              note: progressModal.note || null,
            },
          };
        })
      );

      setToast(isFnMissing(r)
        ? 'Measurement saved (progress journal endpoint missing).'
        : 'Progress updated.');
      setProgressModal(null);
      setTimeout(() => setToast(''), 1500);
      return;
    }

    // qualitative path (requires the journaling RPC)
    if (type === 'qualitative') {
      const r = await rpcSafe('add_goal_progress', {
        p_goal_id: goal.id,
        p_value: null,
        p_currency: null,
        p_qual_status: progressModal.qual_status || 'in_progress',
        p_note: progressModal.note || null,
        p_quarter: null,
        p_measured_at: null,
      });

      if (r.error) {
        if (isFnMissing(r)) {
          throw new Error(
            'The database RPC app.add_goal_progress is missing. Qualitative updates cannot be saved until this RPC is added.'
          );
        }
        throw new Error(`[add_goal_progress] ${r.error.message || r.error}`);
      }

      setGoals(gs =>
        gs.map(g => {
          if (g.id !== goal.id) return g;
          return {
            ...g,
            latest_progress: {
              goal_id: goal.id,
              value: null,
              currency: null,
              qual_status: progressModal.qual_status || 'in_progress',
              note: progressModal.note || null,
              created_at: nowIso,
            },
          };
        })
      );

      setToast('Progress updated.');
      setProgressModal(null);
      setTimeout(() => setToast(''), 1500);
    }
  } catch (e) {
    setErr(String(e.message || e));
  } finally {
    setSaving(false);
  }
}


  async function saveReview() {
    if (!reviewModal) return;
    setSaving(true); setErr('');
    try {
      const { goal, review, rating, status } = reviewModal;
      const r = await supabase.schema('public').rpc('save_self_review', {
        p_goal_id: goal.id,
        p_quarter: quarter,
        p_review: review || null,
        p_rating: rating ?? null,
        p_status: status || 'draft',
      });
      if (r.error) throw r.error;
      setToast('Review saved.');
      setReviewModal(null);
      setTimeout(() => setToast(''), 1500);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
      <Sidebar />
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
            <p className="text-sm text-gray-500">Update progress and add your self-assessment</p>
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

              <GoalSection
                title="Assigned goals"
                empty="No assigned goals"
                items={assignedGoals}
                onAddProgress={openProgress}
                onWriteReview={openReview}
              />

              <GoalSection
                title="My added goals"
                subtitle="Marked as self-selected"
                empty="No self-selected goals"
                items={selfSelectedGoals}
                onAddProgress={openProgress}
                onWriteReview={openReview}
              />
            </>
          )}
        </main>
      </div>

      {/* Progress modal */}
      {progressModal && (
        <Modal onClose={() => setProgressModal(null)} title="Add progress">
          <div className="mb-3 font-medium">{progressModal.goal.title}</div>

          {progressModal.type === 'numeric' && (
            <div className="space-y-3">
              <label className="block">
                <div className="text-sm mb-1">Current value {progressModal.goal.unit ? `(${progressModal.goal.unit})` : ''}</div>
                <input
                  type="number"
                  step="any"
                  className="w-full rounded-lg border p-2"
                  value={progressModal.value}
                  onChange={e => setProgressModal(s => ({ ...s, value: e.target.value }))}
                />
              </label>
              <label className="block">
                <div className="text-sm mb-1">Note (optional)</div>
                <textarea className="w-full rounded-lg border p-2" rows={3}
                  value={progressModal.note}
                  onChange={e => setProgressModal(s => ({ ...s, note: e.target.value }))}
                />
              </label>
            </div>
          )}

          {progressModal.type === 'monetary' && (
            <div className="space-y-3">
              <label className="block">
                <div className="text-sm mb-1">Currency</div>
                <input
                  className="w-full rounded-lg border p-2"
                  value={progressModal.currency}
                  onChange={e => setProgressModal(s => ({ ...s, currency: e.target.value }))}
                  placeholder="USD"
                />
              </label>
              <label className="block">
                <div className="text-sm mb-1">Amount</div>
                <input
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border p-2"
                  value={progressModal.value}
                  onChange={e => setProgressModal(s => ({ ...s, value: e.target.value }))}
                />
              </label>
              <label className="block">
                <div className="text-sm mb-1">Note (optional)</div>
                <textarea className="w-full rounded-lg border p-2" rows={3}
                  value={progressModal.note}
                  onChange={e => setProgressModal(s => ({ ...s, note: e.target.value }))}
                />
              </label>
            </div>
          )}

          {progressModal.type === 'qualitative' && (
            <div className="space-y-3">
              <div className="text-sm mb-1">Status</div>
              <div className="flex flex-wrap gap-2">
                {['not_started','in_progress','blocked','done'].map(s => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setProgressModal(m => ({ ...m, qual_status: s }))}
                    className={`px-3 py-1.5 rounded-full border text-sm ${
                      progressModal.qual_status === s ? 'bg-indigo-600 text-white border-indigo-600' : ''
                    }`}
                  >
                    {s.replace('_',' ')}
                  </button>
                ))}
              </div>
              <label className="block">
                <div className="text-sm mb-1">Note (optional)</div>
                <textarea className="w-full rounded-lg border p-2" rows={3}
                  value={progressModal.note}
                  onChange={e => setProgressModal(s => ({ ...s, note: e.target.value }))}
                />
              </label>
            </div>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded-lg border" onClick={() => setProgressModal(null)}>
              Cancel
            </button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              onClick={saveProgress}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Add update'}
            </button>
          </div>
        </Modal>
      )}

      {/* Review modal */}
      {reviewModal && (
        <Modal onClose={() => setReviewModal(null)} title="Self-assessment">
          <div className="mb-3 font-medium">{reviewModal.goal.title}</div>

          {/* Context: Target + Current */}
          {reviewModal.goal.type !== 'qualitative' && reviewModal.goal.target_value ? (() => {
            const g = reviewModal.goal;
            const lm = g.latest_measurement || {};
            const lp = g.latest_progress || {};
            const currentVal = lm.value ?? lp.value ?? 0;
            const currentTs  = lm.measured_at ?? lp.created_at ?? null;
            const unitOrCur  = g.type === 'monetary' ? (g.currency || lp.currency || '') : (g.unit || '');
            return (
              <div className="mb-3 text-sm text-gray-600">
                Target: <b>{g.target_value}</b> {unitOrCur}
                {' · '}
                Current: <b>{currentVal}</b> {unitOrCur}
                {currentTs ? ` (as of ${new Date(currentTs).toLocaleDateString()})` : ''}
              </div>
            );
          })() : null}

          <label className="block mb-3">
            <div className="text-sm mb-1">Your review</div>
            <textarea
              className="w-full rounded-lg border p-2"
              rows={5}
              value={reviewModal.review}
              onChange={(e)=>setReviewModal(s => ({ ...s, review: e.target.value }))}
              placeholder="What went well, what could be better, context & evidence…"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="text-sm mb-1">Rating (1–5)</div>
              <input
                type="number" min={1} max={5}
                className="w-full rounded-lg border p-2"
                value={reviewModal.rating}
                onChange={(e)=>setReviewModal(s => ({ ...s, rating: Number(e.target.value) }))}
              />
            </label>
            <label className="block">
              <div className="text-sm mb-1">Status</div>
              <select
                className="w-full rounded-lg border p-2 bg-white"
                value={reviewModal.status}
                onChange={(e)=>setReviewModal(s => ({ ...s, status: e.target.value }))}
              >
                <option value="draft">Draft</option>
                <option value="ready_for_manager">Ready for manager</option>
              </select>
            </label>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button className="px-3 py-2 rounded-lg border" onClick={() => setReviewModal(null)}>Cancel</button>
            <button
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
              onClick={saveReview}
              disabled={saving}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save review'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- sections & cards ---------- */
function GoalSection({ title, subtitle, empty, items, onAddProgress, onWriteReview }) {
  return (
    <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-lg font-semibold">{title}</div>
          {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
        </div>
      </div>
      {items.length === 0 ? (
        <EmptyState title={empty} />
      ) : (
        <div className="grid gap-4">
          {items.map(g => <GoalCard key={g.id} goal={g} onAddProgress={() => onAddProgress(g)} onWriteReview={() => onWriteReview(g)} />)}
        </div>
      )}
    </section>
  );
}
function GoalCard({ goal, onAddProgress, onWriteReview }) {
  const lp = goal.latest_progress || {};
  const lm = goal.latest_measurement || {};
  const isQual = (goal.type || '').toLowerCase() === 'qualitative';
  const isQuant = !isQual;

  // prefer measurement, then progress; coerce to number
  const currentValue = isQuant ? (coerceNum(lm.value) ?? coerceNum(lp.value)) : null;

  const currentTs = isQuant
    ? (lm.measured_at ?? lp.created_at ?? null)
    : (lp.created_at ?? null);

  const p = isQuant && currentValue != null && goal.target_value != null
    ? Math.round(Math.max(0, Math.min(1, Number(currentValue) / Number(goal.target_value))) * 100)
    : null;

  const unitOrCur = goal.type === 'monetary' ? (goal.currency || lp.currency || '') : (goal.unit || '');

  // tolerant status mapping
  const qualStatusRaw = lp.qual_status || lp.status || lp.progress_status || '';
  const qualStatus = qualStatusRaw ? qualStatusRaw.replace('_', ' ') : 'not started';

  return (
    <div className="rounded-xl border p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{goal.title}</div>
          {goal.description && <div className="text-xs text-gray-500">{goal.description}</div>}
        </div>
        <div className="flex gap-2">
          <button onClick={onAddProgress} className="px-3 py-1.5 rounded-lg border text-sm">Add progress</button>
          <button onClick={onWriteReview} className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm">Write review</button>
        </div>
      </div>

      <div className="mt-3 grid sm:grid-cols-2 gap-3 text-sm">
        {/* Target + Current together */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-gray-600">
            {goal.type === 'monetary' ? <DollarSign className="w-4 h-4" /> : <Target className="w-4 h-4" />}
            <span>Target</span>
          </div>

          <div className="mt-1 font-medium">
            {isQual ? '—' : (
              <>
                {goal.type === 'monetary' && unitOrCur ? `${unitOrCur} ` : ''}
                {goal.target_value ?? '—'} {goal.type !== 'monetary' ? unitOrCur : ''}
              </>
            )}
          </div>

          {/* Current */}
          <div className="mt-3 text-xs text-gray-600">Current</div>
          <div className="font-medium">
            {isQual ? (
              qualStatus
            ) : (
              <>
                {goal.type === 'monetary' && unitOrCur ? `${unitOrCur} ` : ''}
                {currentValue != null ? new Intl.NumberFormat().format(currentValue) : '—'} {goal.type !== 'monetary' ? unitOrCur : ''}
              </>
            )}
          </div>

          {/* For qualitative, also show the latest note right here */}
          {isQual && lp.note && (
            <div className="mt-1 text-xs text-gray-500">{lp.note}</div>
          )}

          {/* Progress bar (quantitative only) */}
          {isQuant && goal.target_value ? (
            <div className="mt-2">
              <ProgressBar percent={p ?? 0} />
              <div className="mt-1 text-xs text-gray-500">{p ?? 0}%</div>
            </div>
          ) : null}
        </div>

        {/* Last update */}
        <div className="rounded-lg border p-3">
          <div className="flex items-center gap-2 text-gray-600">
            <Flag className="w-4 h-4" />
            <span>Last update</span>
          </div>
          <div className="mt-1 text-sm">{currentTs ? new Date(currentTs).toLocaleString() : '—'}</div>
          {/* Avoid duplicate note: only show here if not qualitative (where we already show it) */}
          {!isQual && (lm.note || lp.note) && (
            <div className="mt-1 text-xs text-gray-500 line-clamp-2">{lm.note || lp.note}</div>
          )}
        </div>
      </div>
    </div>
  );
}


/* ---------- modal shell ---------- */
function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-lg bg-white dark:bg-gray-900 rounded-xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">{title}</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
