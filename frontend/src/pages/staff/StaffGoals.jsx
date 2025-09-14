// src/pages/staff/Goals.jsx
import React, { useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { format, parseISO } from 'date-fns';

function currentQuarterLabel(d = new Date()) {
  const q = Math.floor(d.getMonth()/3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}
function buildQuarterOptions({ years = 4 } = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const startYear = Y - (years - 1);
  const opts = [];
  for (let y = startYear; y <= Y; y++) {
    const maxQ = y === Y ? Math.floor(now.getMonth()/3) + 1 : 4;
    for (let q = 1; q <= maxQ; q++) opts.push(`Q${q} ${y}`);
  }
  return opts.reverse();
}

const CATEGORIES = [
  { value: 'development', label: 'Development Goal' },
  { value: 'learning',    label: 'Learning Goal' },
  { value: 'growth',      label: 'Growth Goal' },
  { value: 'other',       label: 'Other Goal' },
];

const currencySymbol = (code) =>
  ({ USD:'$', EUR:'€', GBP:'£', GHS:'GH₵' }[(code||'').toUpperCase()] || '');

function fmtMeasure(n, unit, currency_code) {
  if (currency_code) return `${currencySymbol(currency_code)} ${Number(n||0).toLocaleString()}`;
  if (unit) return `${Number(n||0).toLocaleString()} ${unit}`;
  return Number(n||0).toLocaleString();
}

export default function StaffGoals() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const quarterOptions = useMemo(() => buildQuarterOptions({ years: 4 }), []);
  const [quarter, setQuarter] = useState(currentQuarterLabel());
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  const [me, setMe] = useState(null);
  const [goals, setGoals] = useState([]);
  const [latest, setLatest] = useState({}); // { goal_id: {value, measured_at} }

  // modal states
  const [showEditor, setShowEditor] = useState(false);
  const [editing, setEditing] = useState(null); // if null -> create; else edit goal
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

        // Pull from your consolidated RPC
        const { data, error } = await supabase
          .schema('public')
          .rpc('my_dashboard', { p_quarter: quarter });

        if (cancel) return;
        if (error) throw error;

        setMe(data?.me || null);
        // Expect goals entries contain:
        // id, title, description, department, measure_type, unit, target, deadline,
        // currency_code, self_selected(bool), category(text)
        setGoals(data?.goals || []);

        const latestMap = Object.fromEntries(
          (data?.latest_measurements || []).map(m => [
            m.goal_id,
            { value: Number(m.value || 0), measured_at: m.measured_at }
          ])
        );
        setLatest(latestMap);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [quarter]);
const assignedGoals = useMemo(
  () => (goals || []).filter(g => g.self_selected !== true),
  [goals]
);

const myGoalsByCategory = useMemo(() => {
  const out = { development: [], learning: [], growth: [], other: [] };
  (goals || [])
    .filter(g => g.self_selected === true)
    .forEach(g => {
      const cat = g.category || 'other';
      (out[cat] ||= []).push(g);
    });
  return out;
}, [goals]);

  function openCreate(category = 'other') {
    setEditing({
      id: null,
      title: '',
      description: '',
      category,
      measure_type: 'numeric', // or 'monetary' | 'qualitative'
      unit: '',
      currency_code: null,
      target: null,
      deadline: '',
    });
    setShowEditor(true);
  }

  function openEdit(goal) {
    if (!goal.self_selected) return; // safeguard
    setEditing({
      id: goal.id,
      title: goal.title,
      description: goal.description || '',
      category: goal.category || 'other',
      measure_type: goal.measure_type,
      unit: goal.unit || '',
      currency_code: goal.currency_code || null,
      target: goal.target ?? null,
      deadline: goal.deadline || '',
    });
    setShowEditor(true);
  }

  async function saveGoal() {
    if (!editing) return;
    setSaving(true); setErr('');
    try {
      if (!editing.id) {
        // create
        const { error } = await supabase
        .schema('public')
        .rpc('add_self_goal', {
          p_title: editing.title,
          p_description: editing.description || null,
          p_category: editing.category,
          p_measure_type: editing.measure_type,
          p_unit: editing.unit || null,
          p_target_value: editing.target === null || editing.target === '' ? null : Number(editing.target),
          p_deadline: editing.deadline || null,
          p_currency: editing.currency_code || null,
        });
        if (error) throw error;
        setToast('Goal added.');
      } else {
        // update
        const { error } = await supabase.rpc('update_self_goal', {
          p_goal_id: editing.id,
          p_title: editing.title || null,
          p_description: editing.description || null,
          p_category: editing.category || null,
          p_measure_type: editing.measure_type || null,
          p_unit: editing.unit || null,
          p_target_value: editing.target === null || editing.target === '' ? null : Number(editing.target),
          p_deadline: editing.deadline || null,
          p_currency: editing.currency_code || null,
        });
        if (error) throw error;
        setToast('Goal updated.');
      }
      setShowEditor(false);
      // refresh
      const { data } = await supabase.rpc('my_dashboard', { p_quarter: quarter });
      setGoals(data?.goals || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 1500);
    }
  }

  async function deleteGoal(goal) {
    if (!goal?.self_selected) return;
    if (!confirm('Delete this goal?')) return;
    setSaving(true); setErr('');
    try {
      const { error } = await supabase.rpc('delete_self_goal', { p_goal_id: goal.id });
      if (error) throw error;
      setToast('Goal removed.');
      // refresh
      const { data } = await supabase.rpc('my_dashboard', { p_quarter: quarter });
      setGoals(data?.goals || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 1500);
    }
  }

  function GoalRow({ g, onEdit, onDelete }) {
  const current = latest[g.id]?.value ?? null;
  const pill = g.self_selected
    ? <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">Self</span>
    : <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Assigned</span>;

  return (
    <tr className="border-t border-gray-200/60">
      <td className="py-2 pr-3">
        <div className="font-medium flex items-center">
          {g.title} {pill}
        </div>
        {!!g.description && (
          <div className="text-xs text-gray-500 line-clamp-1">{g.description}</div>
        )}
      </td>
      <td className="py-2 pr-3">
        {g.measure_type === 'qualitative' ? '—' : fmtMeasure(current, g.unit, g.currency_code)}
      </td>
      <td className="py-2 pr-3">
        {g.measure_type === 'qualitative' ? '—' : fmtMeasure(g.target, g.unit, g.currency_code)}
      </td>
      <td className="py-2 pr-3">
        {g.deadline ? format(parseISO(g.deadline), 'd MMM yyyy') : '—'}
      </td>
      <td className="py-2 pr-3 text-right">
        {g.self_selected ? (
          <div className="flex gap-2 justify-end">
            <button onClick={() => onEdit?.(g)} className="px-2 py-1 rounded border">Edit</button>
            <button onClick={() => onDelete?.(g)} className="px-2 py-1 rounded border text-red-600">Delete</button>
          </div>
        ) : (
          <a href="/staff/self-review" className="text-indigo-600 hover:underline text-sm">Self Review</a>
        )}
      </td>
    </tr>
  );
}


  return (
    <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
      <Sidebar /> {/* auto staff menu on /staff/* */}
      <div className="flex flex-col flex-1">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(m => !m)}
        />

        {/* Header + filters */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 group-hover:ml-64">
          <div>
            <h1 className="text-2xl font-bold">My Goals</h1>
            <p className="text-sm text-gray-500">Assigned goals & goals you add yourself</p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={quarter}
              onChange={e => setQuarter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600"
            >
              {quarterOptions.map(q => <option key={q}>{q}</option>)}
            </select>
            <a href="/staff/self-review" className="px-3 py-2 rounded-lg border">Open Self-Review</a>
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

              {/* Assigned (read-only) */}
              <section className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Assigned goals</div>
                </div>
                {assignedGoals.length === 0 ? (
                  <EmptyState title="No assigned goals" />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left text-gray-500">
                        <tr>
                          <th className="py-2 pr-3">Goal</th>
                          <th className="py-2 pr-3">Current</th>
                          <th className="py-2 pr-3">Target</th>
                          <th className="py-2 pr-3">Deadline</th>
                          <th className="py-2 pr-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {assignedGoals.map(g =>
                          <GoalRow key={g.id} g={g} />
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              {/* My self-created goals by category */}
              {(['development','learning','growth','other']).map(cat => (
                <section key={cat} className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold">
                      {CATEGORIES.find(c => c.value===cat)?.label || 'Other'}
                    </div>
                    <button
                      onClick={() => openCreate(cat)}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
                    >
                      Add {CATEGORIES.find(c => c.value===cat)?.label.split(' ')[0]}
                    </button>
                  </div>

                  {myGoalsByCategory[cat].length === 0 ? (
                    <EmptyState title={`No ${cat} goals`} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left text-gray-500">
                          <tr>
                            <th className="py-2 pr-3">Goal</th>
                            <th className="py-2 pr-3">Current</th>
                            <th className="py-2 pr-3">Target</th>
                            <th className="py-2 pr-3">Deadline</th>
                            <th className="py-2 pr-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myGoalsByCategory[cat].map(g =>
                            <GoalRow key={g.id} g={g} onEdit={openEdit} onDelete={deleteGoal} />
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ))}
            </>
          )}
        </main>
      </div>

      {/* Add/Edit modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-xl bg-white dark:bg-gray-900 rounded-xl shadow-lg p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{editing?.id ? 'Edit goal' : 'Add goal'}</div>
              <button onClick={() => setShowEditor(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>

            {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Title</label>
                <input className="w-full border rounded p-2"
                  value={editing.title}
                  onChange={e=>setEditing(s=>({...s, title:e.target.value}))}
                  placeholder="e.g., Complete AWS Solutions Architect"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Description</label>
                <textarea className="w-full border rounded p-2" rows={3}
                  value={editing.description}
                  onChange={e=>setEditing(s=>({...s, description:e.target.value}))}
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Category</label>
                <select className="w-full border rounded p-2"
                  value={editing.category}
                  onChange={e=>setEditing(s=>({...s, category:e.target.value}))}
                >
                  {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Measure type</label>
                <select className="w-full border rounded p-2"
                  value={editing.measure_type}
                  onChange={e=>setEditing(s=>({...s, measure_type:e.target.value}))}
                >
                  <option value="numeric">Numeric</option>
                  <option value="monetary">Monetary</option>
                  <option value="qualitative">Qualitative</option>
                </select>
              </div>

              {editing.measure_type === 'monetary' ? (
                <>
                  <div>
                    <label className="block text-sm mb-1">Currency</label>
                    <select className="w-full border rounded p-2"
                      value={editing.currency_code || 'USD'}
                      onChange={e=>setEditing(s=>({...s, currency_code:e.target.value}))}
                    >
                      {['USD','EUR','GBP','GHS'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Target</label>
                    <input type="number" step="any" className="w-full border rounded p-2"
                      value={editing.target ?? ''}
                      onChange={e=>setEditing(s=>({...s, target:e.target.value}))}
                    />
                  </div>
                </>
              ) : editing.measure_type === 'numeric' ? (
                <>
                  <div>
                    <label className="block text-sm mb-1">Unit</label>
                    <input className="w-full border rounded p-2"
                      value={editing.unit}
                      onChange={e=>setEditing(s=>({...s, unit:e.target.value}))}
                      placeholder="e.g., deals, hours, courses"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Target</label>
                    <input type="number" step="any" className="w-full border rounded p-2"
                      value={editing.target ?? ''}
                      onChange={e=>setEditing(s=>({...s, target:e.target.value}))}
                    />
                  </div>
                </>
              ) : null}

              <div>
                <label className="block text-sm mb-1">Deadline</label>
                <input type="date" className="w-full border rounded p-2"
                  value={editing.deadline || ''}
                  onChange={e=>setEditing(s=>({...s, deadline:e.target.value}))}
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg border" onClick={()=>setShowEditor(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
                onClick={saveGoal}
                disabled={saving || !(editing?.title?.trim())}
              >
                {saving ? 'Saving…' : (editing?.id ? 'Save changes' : 'Add goal')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
