// src/pages/staff/Goals.jsx
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

const CATEGORIES = [
  { value: 'development', label: 'Development Goal' },
  { value: 'learning', label: 'Learning Goal' },
  { value: 'growth', label: 'Growth Goal' },
  { value: 'other', label: 'Other Goal' },
];

const currencySymbol = (code) =>
  ({ USD: '$', EUR: '€', GBP: '£', GHS: 'GH₵' }[(code || '').toUpperCase()] || '');

function fmtMeasure(n, unit, currency_code) {
  if (currency_code)
    return `${currencySymbol(currency_code)} ${Number(n || 0).toLocaleString()}`;
  if (unit) return `${Number(n || 0).toLocaleString()} ${unit}`;
  return Number(n || 0).toLocaleString();
}

// normalize DB -> UI fields in one place
const mapGoals = (rows = []) =>
  rows.map((g) => ({
    ...g,
    title: g.title ?? g.label ?? '',
    currency_code: g.currency ?? g.currency_code ?? null,
    target: g.target ?? g.target_value ?? null,
    self_selected: g.self_selected ?? g.meta?.self_selected === true,
    category: g.category ?? g.meta?.category ?? 'other',
    org_goal_label: g.org_goal_label ?? g.alignment_label ?? null, // 👈 add this
  }));


  function clamp01(x) { return Math.max(0, Math.min(1, x)); }

function computeGoalPct(g, latestMap) {
  if (g.measure_type === 'qualitative') return null;
  const cur = Number(latestMap[g.id]?.value ?? 0);
  const tgt = Number(g.target ?? 0);
  if (!tgt || tgt <= 0) return null;
  return clamp01(cur / tgt); // 0..1
}



export default function StaffGoals() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null
      ? saved === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
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
        setLoading(true);
        setErr('');

        // Pull from your consolidated RPC
        const { data, error } = await supabase
          .schema('public')
          .rpc('my_dashboard', { p_quarter: quarter });

        if (cancel) return;
        if (error) throw error;

        setMe(data?.me || null);
        setGoals(mapGoals(data?.goals || []));

        const latestMap = Object.fromEntries(
          (data?.latest_measurements || []).map((m) => [
            m.goal_id,
            { value: Number(m.value || 0), measured_at: m.measured_at },
          ])
        );
        setLatest(latestMap);
      } catch (e) {
        if (!cancel) setErr(String(e.message || e));
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [quarter]);


  const groupedByOrgGoal = useMemo(() => {
  const groups = new Map(); // key => { label, items:[], pct:0..1|null }
  const NONE = 'Unaligned';

  (goals || []).forEach((g) => {
    const key = g.org_goal_label || NONE;
    if (!groups.has(key)) groups.set(key, { label: key, items: [] });
    groups.get(key).items.push(g);
  });

  // compute group progress (average of available %)
  for (const [, grp] of groups) {
    const pcts = grp.items
      .map((g) => computeGoalPct(g, latest))
      .filter((p) => p !== null && !Number.isNaN(p));
    grp.progress = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null;
  }

  // sort: alphabetical, but put Unaligned last
  const arr = Array.from(groups.values());
  arr.sort((a, b) => {
    if (a.label === 'Unaligned') return 1;
    if (b.label === 'Unaligned') return -1;
    return a.label.localeCompare(b.label);
  });
  return arr;
}, [goals, latest]);
function Accordion({ children, className = '' }) {
  return (
    <div
      className={[
        "rounded-2xl border border-[var(--border)] bg-[var(--card)] p-1",
        "shadow-sm overflow-hidden", // soft shadow + clean edges
        className,
      ].join(' ')}
    >
      {children}
    </div>
  );
}

function Chevron({ open }) {
  return (
    <svg
      className={[
        "w-4 h-4 transition-transform duration-200",
        open ? "rotate-180" : "rotate-0",
      ].join(' ')}
      viewBox="0 0 20 20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M5.23 7.21a.75.75 0 011.06.02L10 11.136l3.71-3.905a.75.75 0 011.08 1.04l-4.24 4.46a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function TinyProgress({ value }) {
  if (typeof value !== 'number') return null;
  const pct = Math.round(value * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="w-36 h-1.5 rounded-full bg-[var(--surface)] overflow-hidden">
        <div
          className="h-1.5 rounded-full bg-[var(--accent)] transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] text-[var(--fg-muted)] tabular-nums">{pct}%</span>
    </div>
  );
}

function HeaderBadge({ children }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
      bg-gray-100 text-gray-700 ring-1 ring-inset ring-blue-800
      dark:bg-gray-800 dark:text-gray-300 dark:ring-gray-700" 
    >
      {children}
    </span>
  );
}

function AccordionItem({
  title,
  subtitle,
  progress,
  children,
  defaultOpen = false,
}) {
  const [open, setOpen] = React.useState(defaultOpen);

  return (
    <div className="group/acc divide-y divide-[var(--border)] first:rounded-t-2xl last:rounded-b-2xl">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className={[
          // surface contrast & subtle gradient
          "w-full text-left px-4 py-3",
          "bg-[var(--surface)]/70 hover:bg-[var(--surface)]",
          "backdrop-blur-[1px]",
          "mb-2",
          // "mt-5",
          // "ml-1",
          // "mr-1",
          // layout
          "flex items-center justify-between gap-4",
          // border + focus
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)] rounded-xl",
          // improve separation between items
          "transition-colors",
        ].join(' ')}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold truncate">{title}</span>
            {subtitle && (
              <HeaderBadge>{subtitle}</HeaderBadge>
            )}
          </div>
          <div className="mt-0.5 text-xs text-[var(--fg-muted)] truncate">
            {open ? "Click to collapse" : "Click to expand"}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4">
          <TinyProgress value={progress} />
          <Chevron open={open} />
        </div>
        <div className="sm:hidden">
          <Chevron open={open} />
        </div>
      </button>

      {/* Body */}
      {open && (
        <div className="px-4 py-4 bg-[var(--card)]">
          {children}
        </div>
      )}
    </div>
  );
}

  const assignedGoals = useMemo(
    () => (goals || []).filter((g) => g.self_selected !== true),
    [goals]
  );

  const myGoalsByCategory = useMemo(() => {
    const out = { development: [], learning: [], growth: [], other: [] };
    (goals || [])
      .filter((g) => g.self_selected === true)
      .forEach((g) => {
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
    setSaving(true);
    setErr('');
    try {
      if (!editing.id) {
        // create
        const { error } = await supabase.schema('public').rpc('add_self_goal', {
          p_title: editing.title,
          p_description: editing.description || null,
          p_category: editing.category,
          p_measure_type: editing.measure_type,
          p_unit: editing.unit || null,
          p_target_value:
            editing.target === null || editing.target === ''
              ? null
              : Number(editing.target),
          p_deadline: editing.deadline || null,
          p_currency: editing.currency_code || null,
          p_quarter: quarter, // <-- from the dropdown
        });
        if (error) throw error;
        setToast('Goal added.');
      } else {
        // update
        const { error } = await supabase.schema('public').rpc('update_self_goal', {
          p_goal_id: editing.id,
          p_title: editing.title || null,
          p_description: editing.description || null,
          p_category: editing.category || null,
          p_measure_type: editing.measure_type || null,
          p_unit: editing.unit || null,
          p_target_value:
            editing.target === null || editing.target === ''
              ? null
              : Number(editing.target),
          p_deadline: editing.deadline || null,
          p_currency: editing.currency_code || null,
        });
        if (error) throw error;
        setToast('Goal updated.');
      }
      setShowEditor(false);
      // refresh
      const { data } = await supabase.schema('public').rpc('my_dashboard', { p_quarter: quarter });
      setGoals(mapGoals(data?.goals || []));
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
    setSaving(true);
    setErr('');
    try {
      const { error } = await supabase
        .schema('public')
        .rpc('delete_self_goal', { p_goal_id: goal.id });
      if (error) throw error;
      setToast('Goal removed.');
      // refresh
      const { data } = await supabase
        .schema('public')
        .rpc('my_dashboard', { p_quarter: quarter });
      setGoals(mapGoals(data?.goals || []));
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 1500);
    }
  }

  function GoalRow({ g, onEdit, onDelete }) {
    const current = latest[g.id]?.value ?? null;
    const pill = g.self_selected ? (
      <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full tint text-indigo-600">
        Self
      </span>
    ) : (
      <span className="ml-2 inline-block text-xs px-2 py-0.5 rounded-full tint text-emerald-600">
        Assigned
      </span>
    );

    return (
      <tr className="border-t border-[var(--border)]">
        <td className="py-2 pr-3">
          <div className="font-medium flex items-center">
            {g.title} {pill}
          </div>
          {!!g.description && (
            <div className="text-xs muted line-clamp-1">{g.description}</div>
          )}
        </td>
        <td className="py-2 pr-3">
          {g.measure_type === 'qualitative'
            ? '—'
            : fmtMeasure(current, g.unit, g.currency_code)}
        </td>
        <td className="py-2 pr-3">
          {g.measure_type === 'qualitative'
            ? '—'
            : fmtMeasure(g.target, g.unit, g.currency_code)}
        </td>
        <td className="py-2 pr-3">
          {g.deadline ? format(parseISO(g.deadline), 'd MMM yyyy') : '—'}
        </td>
        <td className="py-2 pr-3 text-right">
          {g.self_selected ? (
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => onEdit?.(g)}
                className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)]"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete?.(g)}
                className="px-2 py-1 rounded border border-[var(--border)] bg-[var(--card)] text-red-600"
              >
                Delete
              </button>
            </div>
          ) : (
            <a
              href="/staff/self-review"
              className="text-[var(--accent)] hover:underline text-sm"
            >
              Self Review
            </a>
          )}
        </td>
      </tr>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-[var(--fg)]">
      <Sidebar /> {/* auto staff menu on /staff/* */}
      <div className="flex flex-col flex-1">
        <TopBar
          onMenuClick={() => setSidebarOpen((o) => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((m) => !m)}
        />

        {/* Header + filters */}
        <div className="flex items-center justify-between px-6 py-4 toolbar sticky top-14 z-10 shadow ml-16 group-hover:ml-64">
          <div>
            <h1 className="text-2xl font-bold">My Goals</h1>
            <p className="text-sm muted">Assigned goals & goals you add yourself</p>
          </div>
          <div className="flex gap-3 items-center">
            <select
              value={quarter}
              onChange={(e) => setQuarter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-[var(--card)] border-[var(--border)]"
            >
              {quarterOptions.map((q) => (
                <option key={q}>{q}</option>
              ))}
            </select>
            <a
              href="/staff/self-review"
              className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)]"
            >
              Open Self-Review
            </a>
          </div>
        </div>

        <main className="flex-1 ml-16 mt-4 mr-4 mb-4 px-6 overflow-auto">
          {loading ? (
            <div className="p-6 text-sm muted">Loading…</div>
          ) : err ? (
            <div className="p-6">
              <EmptyState title="Unable to load" subtitle={err} />
            </div>
          ) : !me ? (
            <div className="p-6">
              <EmptyState
                title="No profile"
                subtitle="Ask HR to link your account to an employee record."
              />
            </div>
          ) : (
            <>
              {toast && <div className="mb-3 text-sm text-green-600">{toast}</div>}

              {/* Aligned to Org Goals (grouped) */}
<section className="card p-5 mb-6">
  <div className="flex items-center justify-between mb-3">
    <div className="text-lg font-semibold">Aligned to Org Goals</div>
    <div className="text-sm muted">
      {groupedByOrgGoal.reduce((a, g) => a + g.items.length, 0)} total goals
    </div>
  </div>

  {groupedByOrgGoal.length === 0 ? (
    <EmptyState title="No goals yet" subtitle="Your aligned goals will appear here." />
  ) : (
    <Accordion>
      {groupedByOrgGoal.map((grp, idx) => (
        <AccordionItem
          key={grp.label || 'Unaligned'}
          title={grp.label || 'Unaligned'}
          subtitle={
            grp.label === 'Unaligned'
              ? 'Goals without an org-level alignment'
              : `${grp.items.length} goal${grp.items.length > 1 ? 's' : ''}`
          }
          progress={grp.progress}
          defaultOpen={idx === 0} // first group open by default
        >
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left muted">
                <tr>
                  <th className="py-2 pr-3">Goal</th>
                  <th className="py-2 pr-3">Current</th>
                  <th className="py-2 pr-3">Target</th>
                  <th className="py-2 pr-3">Deadline</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {grp.items
                  .slice() // safe copy
                  .sort((a, b) => {
                    const da = a.deadline || '';
                    const db = b.deadline || '';
                    return da.localeCompare(db);
                  })
                  .map((g) => (
                    <GoalRow
                      key={g.id}
                      g={g}
                      onEdit={openEdit}
                      onDelete={deleteGoal}
                    />
                  ))}
              </tbody>
            </table>
          </div>
        </AccordionItem>
      ))}
    </Accordion>
  )}
</section>


              {/* My self-created goals by category */}
              {['development', 'learning', 'growth', 'other'].map((cat) => (
                <section key={cat} className="card p-5 mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-lg font-semibold">
                      {CATEGORIES.find((c) => c.value === cat)?.label || 'Other'}
                    </div>
                    <button
                      onClick={() => openCreate(cat)}
                      className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:brightness-90"
                    >
                      Add {CATEGORIES.find((c) => c.value === cat)?.label.split(' ')[0]}
                    </button>
                  </div>

                  {myGoalsByCategory[cat].length === 0 ? (
                    <EmptyState title={`No ${cat} goals`} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="text-left muted">
                          <tr>
                            <th className="py-2 pr-3">Goal</th>
                            <th className="py-2 pr-3">Current</th>
                            <th className="py-2 pr-3">Target</th>
                            <th className="py-2 pr-3">Deadline</th>
                            <th className="py-2 pr-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {myGoalsByCategory[cat].map((g) => (
                            <GoalRow
                              key={g.id}
                              g={g}
                              onEdit={openEdit}
                              onDelete={deleteGoal}
                            />
                          ))}
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
          <div className="w-full max-w-xl card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">
                {editing?.id ? 'Edit goal' : 'Add goal'}
              </div>
              <button
                onClick={() => setShowEditor(false)}
                className="muted hover:brightness-125"
              >
                ✕
              </button>
            </div>

            {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Title</label>
                <input
                  className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                  value={editing.title}
                  onChange={(e) => setEditing((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g., Complete AWS Solutions Architect"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm mb-1">Description</label>
                <textarea
                  className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                  rows={3}
                  value={editing.description}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, description: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Category</label>
                <select
                  className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                  value={editing.category}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, category: e.target.value }))
                  }
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1">Measure type</label>
                <select
                  className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                  value={editing.measure_type}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, measure_type: e.target.value }))
                  }
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
                    <select
                      className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                      value={editing.currency_code || 'USD'}
                      onChange={(e) =>
                        setEditing((s) => ({ ...s, currency_code: e.target.value }))
                      }
                    >
                      {['USD', 'EUR', 'GBP', 'GHS'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Target</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                      value={editing.target ?? ''}
                      onChange={(e) =>
                        setEditing((s) => ({ ...s, target: e.target.value }))
                      }
                    />
                  </div>
                </>
              ) : editing.measure_type === 'numeric' ? (
                <>
                  <div>
                    <label className="block text-sm mb-1">Unit</label>
                    <input
                      className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                      value={editing.unit}
                      onChange={(e) =>
                        setEditing((s) => ({ ...s, unit: e.target.value }))
                      }
                      placeholder="e.g., deals, hours, courses"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1">Target</label>
                    <input
                      type="number"
                      step="any"
                      className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                      value={editing.target ?? ''}
                      onChange={(e) =>
                        setEditing((s) => ({ ...s, target: e.target.value }))
                      }
                    />
                  </div>
                </>
              ) : null}

              <div>
                <label className="block text-sm mb-1">Deadline</label>
                <input
                  type="date"
                  className="w-full border border-[var(--border)] rounded p-2 bg-[var(--card)]"
                  value={editing.deadline || ''}
                  onChange={(e) =>
                    setEditing((s) => ({ ...s, deadline: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                onClick={() => setShowEditor(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50"
                onClick={saveGoal}
                disabled={saving || !(editing?.title?.trim())}
              >
                {saving ? 'Saving…' : editing?.id ? 'Save changes' : 'Add goal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
