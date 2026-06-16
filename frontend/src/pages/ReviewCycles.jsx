// src/pages/ReviewCycles.jsx — admin/owner management of review cycles (app.cycles)
import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import { Plus, X, Loader2 } from 'lucide-react';

const FN_MISSING_RE = /(schema cache|Could not find the function|does not exist|No function matches)/i;
const isFnMissing = (err) => err?.code === 'PGRST202' || FN_MISSING_RE.test(String(err?.message || ''));

const STATUS_META = {
  draft: { label: 'Draft', cls: 'border-gray-300 text-gray-600 bg-gray-50 dark:bg-transparent' },
  open: { label: 'Open', cls: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-transparent' },
  closed: { label: 'Closed', cls: 'border-gray-300 text-gray-500 bg-gray-50 dark:bg-transparent' },
};

const fmtDate = (d) => (d ? new Date(d + 'T00:00:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '—');

const emptyDraft = () => ({ id: null, title: '', start_date: '', end_date: '', status: 'draft' });

export default function ReviewCycles() {
  const { orgId, myActiveRole } = useOrg();
  const isAdmin = myActiveRole === 'owner' || myActiveRole === 'admin';

  const [, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [toast, setToast] = useState('');
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 1800); }, []);

  const load = useCallback(async () => {
    if (!orgId || !isAdmin) return;
    setLoading(true);
    setErr('');
    setUnavailable(false);
    const { data, error } = await supabase.rpc('admin_list_cycles', { p_org_id: orgId });
    if (error) {
      if (isFnMissing(error)) setUnavailable(true);
      else setErr(error.message || String(error));
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(data || []);
    setLoading(false);
  }, [orgId, isAdmin]);

  useEffect(() => { load(); }, [load]);

  async function save() {
    if (!draft) return;
    setSaving(true);
    setErr('');
    const { error } = await supabase.rpc('admin_upsert_cycle', {
      p_id: draft.id,
      p_org_id: orgId,
      p_title: draft.title,
      p_start_date: draft.start_date || null,
      p_end_date: draft.end_date || null,
      p_status: draft.status,
    });
    setSaving(false);
    if (error) { setErr(error.message || String(error)); return; }
    setDraft(null);
    flash(draft.id ? 'Cycle updated.' : 'Cycle created.');
    load();
  }

  async function setStatus(row, status) {
    setBusyId(row.id);
    setErr('');
    const { error } = await supabase.rpc('admin_set_cycle_status', { p_id: row.id, p_org_id: orgId, p_status: status });
    setBusyId(null);
    if (error) { setErr(error.message || String(error)); return; }
    flash(`Cycle ${status === 'open' ? 'opened' : status === 'closed' ? 'closed' : 'set to draft'}.`);
    load();
  }

  async function remove(row) {
    if (!confirm(`Delete cycle "${row.title}"?`)) return;
    setBusyId(row.id);
    setErr('');
    const { error } = await supabase.rpc('admin_delete_cycle', { p_id: row.id, p_org_id: orgId });
    setBusyId(null);
    if (error) { setErr(error.message || String(error)); return; }
    flash('Cycle deleted.');
    load();
  }

  return (
    <div className="flex h-screen overflow-hidden text-[var(--fg)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />

        <div className="flex items-center justify-between px-6 py-4 toolbar sticky top-14 z-10 shadow ml-[var(--sidebar-w)] transition-[margin] duration-200">
          <div>
            <h1 className="text-2xl font-bold">Review Cycles</h1>
            <p className="text-sm muted">
              Define the review periods managers evaluate against. <Link to="/admin" className="text-[var(--accent)] hover:underline">Back to users</Link>
            </p>
          </div>
          {isAdmin && (
            <button onClick={() => setDraft(emptyDraft())} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent)] text-white hover:brightness-90">
              <Plus className="w-4 h-4" /> New cycle
            </button>
          )}
        </div>

        <main className="flex-1 ml-[var(--sidebar-w)] mt-4 mr-4 mb-4 px-6 overflow-auto transition-[margin] duration-200">
          {!isAdmin ? (
            <div className="p-6"><EmptyState title="Not authorized" subtitle="You need an Owner or Admin role to manage review cycles." /></div>
          ) : loading ? (
            <div className="p-6 text-sm muted">Loading…</div>
          ) : unavailable ? (
            <div className="p-6"><EmptyState title="Cycles backend not deployed yet" subtitle="Apply the review-cycles migration to manage cycles here." /></div>
          ) : err && rows.length === 0 ? (
            <div className="p-6"><EmptyState title="Unable to load" subtitle={err} /></div>
          ) : (
            <>
              {toast && <div className="mb-3 text-sm text-green-600">{toast}</div>}
              {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

              <section className="card p-5">
                {rows.length === 0 ? (
                  <EmptyState title="No review cycles yet" subtitle="Create your first cycle (e.g. “Q3 2026”) to start reviews." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left muted">
                        <tr>
                          <th className="py-2 pr-3">Cycle</th>
                          <th className="py-2 pr-3">Period</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">Reviewed</th>
                          <th className="py-2 pr-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((c) => {
                          const sm = STATUS_META[c.status] || STATUS_META.draft;
                          const busy = busyId === c.id;
                          return (
                            <tr key={c.id} className="border-t border-[var(--border)]">
                              <td className="py-2 pr-3">
                                <div className="font-medium flex items-center gap-2">
                                  {c.title}
                                  {c.is_current && (
                                    <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-[var(--accent)] text-white">Current</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 pr-3 muted">{fmtDate(c.start_date)} – {fmtDate(c.end_date)}</td>
                              <td className="py-2 pr-3">
                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${sm.cls}`}>{sm.label}</span>
                              </td>
                              <td className="py-2 pr-3">{c.reviewed_count || 0}</td>
                              <td className="py-2 pr-3">
                                <div className="flex gap-2 justify-end">
                                  <button disabled={busy} onClick={() => setDraft({ id: c.id, title: c.title, start_date: c.start_date || '', end_date: c.end_date || '', status: c.status })} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm disabled:opacity-50">Edit</button>
                                  {c.status !== 'open' ? (
                                    <button disabled={busy} onClick={() => setStatus(c, 'open')} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm disabled:opacity-50">Open</button>
                                  ) : (
                                    <button disabled={busy} onClick={() => setStatus(c, 'closed')} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm disabled:opacity-50">Close</button>
                                  )}
                                  <button disabled={busy} onClick={() => remove(c)} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-red-600 disabled:opacity-50">Delete</button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>

              <p className="text-xs muted mt-3">
                The “Current” cycle is the open one whose dates include today — that’s what new manager reviews attach to.
              </p>
            </>
          )}
        </main>
      </div>

      {draft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-md card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{draft.id ? 'Edit cycle' : 'New cycle'}</div>
              <button onClick={() => setDraft(null)} className="muted hover:opacity-80"><X className="w-5 h-5" /></button>
            </div>

            {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Title</label>
                <input
                  className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]"
                  placeholder="e.g. Q3 2026"
                  value={draft.title}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Start date</label>
                  <input type="date" className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]" value={draft.start_date} onChange={(e) => setDraft((d) => ({ ...d, start_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm mb-1">End date</label>
                  <input type="date" className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]" value={draft.end_date} onChange={(e) => setDraft((d) => ({ ...d, end_date: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1">Status</label>
                <select className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}>
                  <option value="draft">Draft</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)]" onClick={() => setDraft(null)}>Cancel</button>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50"
                onClick={save}
                disabled={saving || !draft.title.trim() || !draft.start_date || !draft.end_date}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Create cycle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
