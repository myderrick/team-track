// frontend/src/pages/Settings.jsx
import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import { useOrg } from '@/context/OrgContext';
import { supabase } from '@/lib/supabaseClient';
import { allGoals as starterGoals } from '../data';

// ---------------- helpers ----------------
const rpcSafe = async (name, args) => {
  // Try public first; fall back to app schema if needed
  let r = await supabase.rpc(name, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache/i.test(msg) || /Could not find the function/i.test(msg)) {
    r = await supabase.schema('app').rpc(name, args);
  }
  return r;
};

// Map UI "type" -> DB kpi_definitions.unit + selector.measure_types
const toDbUnit = (type) => {
  if (type === 'monetary') return 'currency';
  if (type === 'qualitative') return 'percent';
  return 'count'; // for "count" aka numeric
};
const toMeasureType = (type) => {
  if (type === 'monetary') return 'monetary';
  if (type === 'qualitative') return 'qualitative';
  return 'numeric';
};

// Build metadata for upsert from the simple UI shape
const buildMetadata = ({ type, unit, target }) => {
  const mt = toMeasureType(type);
  const display_suffix =
    type === 'monetary' ? (unit || '$') :
    type === 'qualitative' ? '%' :
    (unit || ''); // e.g., 'customers', 'calls'

  const meta = {
    display_suffix,
    selector: {
      measure_types: [mt],
      // NOTE: you can add "units" or "currency" filters if you need tighter goal selection:
      // units: type !== 'qualitative' && unit ? [unit] : undefined,
      // currency: type === 'monetary' ? 'USD' : undefined,
    },
    target: target === '' || target == null ? null : Number(target),
  };

  if (mt === 'qualitative') {
    meta.qualitative = {
      weights: { not_started: 0, in_progress: 0.5, done: 1 }
    };
  }
  return meta;
};

// Map DB row -> UI row
const dbRowToUi = (r) => {
  const m = r.metadata || {};
  const measureTypes = m.selector?.measure_types || [];
  const mt = (measureTypes[0] || '').toLowerCase();

  let type;
  if (mt === 'monetary') type = 'monetary';
  else if (mt === 'qualitative') type = 'qualitative';
  else type = 'count';

  // For monetary/count, use display_suffix (e.g. "$" or "customers")
  // For qualitative, you can keep '%' or blank the unit field in the editor.
  let unit = m.display_suffix || '';
  if (type === 'qualitative' && unit === '%') unit = '%';

  const target = m.target ?? '';

  return {
    id: r.id,
    title: r.name,
    type,
    unit,
    target,
  };
};

// ---------------- component ----------------
export default function Settings() {
  const { orgId } = useOrg();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // UI state
  const [goals, setGoals] = useState([]); // rows from DB mapped to simple UI shape
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // editor state
  const [editingId, setEditingId] = useState(null);
  const [editValues, setEditValues] = useState({});
  const [newGoal, setNewGoal] = useState({ title: '', target: '', unit: '', type: 'monetary' });

  // dark mode persistence
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) setDarkMode(saved === 'true');
    else if (window.matchMedia) setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  // load KPIs
  const load = async () => {
    if (!orgId) { setGoals([]); setLoading(false); return; }
    setLoading(true); setErr('');
    const { data, error } = await rpcSafe('admin_list_kpi_templates', { p_org_id: orgId });
    if (error) {
      setErr(error.message); setGoals([]);
    } else {
      const rows = Array.isArray(data) ? data : [];
      setGoals(rows.map(dbRowToUi));
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [orgId]);

  // actions
  const addGoal = async () => {
    if (!orgId || !newGoal.title.trim()) return;
    setSaving(true); setErr('');
    try {
      const p_unit = toDbUnit(newGoal.type);
      const p_metadata = buildMetadata(newGoal);
      const { error } = await rpcSafe('admin_upsert_kpi_template', {
        p_org_id: orgId,
        p_id: null,                     // create
        p_name: newGoal.title.trim(),
        p_unit,
        p_direction: 'higher_is_better',
        p_metadata
      });
      if (error) throw error;
      setNewGoal({ title: '', target: '', unit: '', type: 'monetary' });
      setToast('KPI created.');
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 1500);
    }
  };

  const startEdit = (goal) => {
    setEditingId(goal.id);
    setEditValues({ ...goal });
  };

  const saveEdit = async () => {
    if (!orgId || !editingId) return;
    setSaving(true); setErr('');
    try {
      const p_unit = toDbUnit(editValues.type);
      const p_metadata = buildMetadata(editValues);
      const { error } = await rpcSafe('admin_upsert_kpi_template', {
        p_org_id: orgId,
        p_id: editingId,                // update
        p_name: (editValues.title || '').trim(),
        p_unit,
        p_direction: 'higher_is_better',
        p_metadata
      });
      if (error) throw error;
      setEditingId(null); setEditValues({});
      setToast('KPI updated.');
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 1500);
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditValues({});
  };

  const deleteGoal = async (id) => {
    if (!orgId || !id) return;
    if (!confirm('Delete this KPI?')) return;
    setSaving(true); setErr('');
    try {
      const { error } = await rpcSafe('admin_delete_kpi_template', { p_org_id: orgId, p_id: id });
      if (error) throw error;
      setToast('KPI deleted.');
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 1500);
    }
  };

  const importStarters = async () => {
    if (!orgId) return;
    setSaving(true); setErr('');
    try {
      for (const g of starterGoals) {
        const p_unit = toDbUnit(g.type);
        const p_metadata = buildMetadata(g);
        const { error } = await rpcSafe('admin_upsert_kpi_template', {
          p_org_id: orgId,
          p_id: null,
          p_name: g.title,
          p_unit,
          p_direction: 'higher_is_better',
          p_metadata
        });
        if (error) throw error;
      }
      setToast('Seeded starter KPIs.');
      await load();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setSaving(false);
      setTimeout(() => setToast(''), 1500);
    }
  };

  // --------------- UI ---------------
  return (
    <div className="flex flex-col h-screen dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar
        onMenuClick={() => setSidebarOpen(o => !o)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(m => !m)}
      />

      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow ml-16 group-hover:ml-64 transition-margin duration-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage Global Settings</p>
        </div>
        <div className="flex gap-2">
          <button
            disabled={saving || loading}
            onClick={importStarters}
            className="px-3 py-1.5 rounded-lg border bg-white dark:bg-gray-800"
            title="Import the hard-coded starter goals into KPI definitions"
          >
            Import starter set
          </button>
        </div>
      </div>

      <main className="flex-1 ml-20 mt-4 mr-4 mb-4 transition-margin duration-200 group-hover:ml-64 px-0 overflow-auto">
        <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium">KPI Templates</h3>
            {toast && <div className="text-sm text-green-600">{toast}</div>}
          </div>

          {err && <div className="mb-3 text-sm text-red-600">{err}</div>}
          {loading ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : goals.length === 0 ? (
            <div className="text-sm text-gray-500">No KPIs yet. Use “Import starter set” or add a new one below.</div>
          ) : (
            <ul className="mb-4 space-y-2">
              {goals.map(goal => (
                <li
                  key={goal.id}
                  className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200/70 dark:border-gray-700 shadow-sm"
                >
                  {editingId === goal.id ? (
                    <div className="flex-1 space-y-2">
                      <input
                        className="w-full px-2 py-1 border rounded"
                        value={editValues.title}
                        onChange={e => setEditValues(ev => ({ ...ev, title: e.target.value }))}
                      />
                      <div className="flex flex-wrap gap-2">
                        <input
                          type="number"
                          className="w-28 px-2 py-1 border rounded"
                          placeholder="Target"
                          value={editValues.target}
                          onChange={e => setEditValues(ev => ({ ...ev, target: e.target.value }))}
                        />
                        <input
                          className="w-28 px-2 py-1 border rounded"
                          placeholder={editValues.type === 'monetary' ? 'Symbol ($)' : (editValues.type === 'qualitative' ? '%' : 'Unit')}
                          disabled={editValues.type === 'qualitative'}
                          value={editValues.unit}
                          onChange={e => setEditValues(ev => ({ ...ev, unit: e.target.value }))}
                        />
                        <select
                          className="px-2 py-1 border rounded"
                          value={editValues.type}
                          onChange={e => setEditValues(ev => ({ ...ev, type: e.target.value }))}
                        >
                          <option value="monetary">Monetary</option>
                          <option value="count">Count</option>
                          <option value="qualitative">Qualitative</option>
                        </select>
                      </div>
                      <div className="flex gap-2">
                        <button
                          disabled={saving}
                          onClick={saveEdit}
                          className="px-3 py-1 bg-green-600 text-white rounded disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button onClick={cancelEdit} className="px-3 py-1 bg-gray-300 rounded">Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1">
                        <span className="font-medium">{goal.title}</span>
                        <span className="ml-2 text-gray-500">
                          ({goal.target || '—'} {goal.type === 'qualitative' ? '%' : goal.unit || ''})
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(goal)}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteGoal(goal.id)}
                          className="text-red-600 hover:underline text-sm"
                        >
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}

          {/* Add new */}
          <div className="flex flex-wrap gap-2 items-center">
            <input
              placeholder="Title"
              value={newGoal.title}
              onChange={e => setNewGoal(n => ({ ...n, title: e.target.value }))}
              className="px-2 py-1 border rounded flex-1 min-w-[200px]"
            />
            <input
              placeholder="Target"
              type="number"
              value={newGoal.target}
              onChange={e => setNewGoal(n => ({ ...n, target: e.target.value }))}
              className="px-2 py-1 border rounded w-28"
            />
            <input
              placeholder={newGoal.type === 'monetary' ? 'Symbol ($)' : (newGoal.type === 'qualitative' ? '%' : 'Unit')}
              disabled={newGoal.type === 'qualitative'}
              value={newGoal.unit}
              onChange={e => setNewGoal(n => ({ ...n, unit: e.target.value }))}
              className="px-2 py-1 border rounded w-28 disabled:opacity-60"
            />
            <select
              value={newGoal.type}
              onChange={e => setNewGoal(n => ({ ...n, type: e.target.value }))}
              className="px-2 py-1 border rounded"
            >
              <option value="monetary">Monetary</option>
              <option value="count">Count</option>
              <option value="qualitative">Qualitative</option>
            </select>
            <button
              disabled={saving || !newGoal.title.trim()}
              onClick={addGoal}
              className="px-3 py-1 bg-purple-600 text-white rounded disabled:opacity-50"
            >
              Add KPI
            </button>
          </div>
        </section>

        {/* Metric Library (stub) */}
        <section className="mb-8 bg-white dark:bg-gray-800 rounded-lg p-6 shadow rounded-xl">
          <h3 className="font-medium mb-2">Metric Library</h3>
          <p className="text-sm text-gray-500">
            Define units and labels here. (Coming soon)
          </p>
        </section>
      </main>
    </div>
  );
}
