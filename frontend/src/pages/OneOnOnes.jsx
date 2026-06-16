// src/pages/OneOnOnes.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import { Plus, X, Loader2, Calendar, MapPin } from 'lucide-react';

const FN_MISSING_RE = /(schema cache|Could not find the function|does not exist|No function matches)/i;
const isFnMissing = (err) => err?.code === 'PGRST202' || FN_MISSING_RE.test(String(err?.message || ''));

const STATUS_META = {
  scheduled: { label: 'Scheduled', cls: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-transparent' },
  completed: { label: 'Completed', cls: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-transparent' },
  cancelled: { label: 'Cancelled', cls: 'border-gray-300 text-gray-500 bg-gray-50 dark:bg-transparent' },
};

// ISO <-> <input type="datetime-local"> (local time, no seconds)
function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fromLocalInput(val) {
  if (!val) return null;
  const d = new Date(val);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
function fmtWhen(iso) {
  if (!iso) return 'No date set';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 'No date set';
  return d.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const emptyDraft = () => ({
  id: null,
  employee_id: '',
  scheduled_at: '',
  location: '',
  agenda: '',
  notes: '',
  status: 'scheduled',
});

export default function OneOnOnes() {
  const { orgId, isPrivileged } = useOrg();

  const [, setSidebarOpen] = useState(false);
  const [rows, setRows] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const [toast, setToast] = useState('');

  const [draft, setDraft] = useState(null); // null = modal closed
  const [saving, setSaving] = useState(false);

  const flash = useCallback((m) => { setToast(m); setTimeout(() => setToast(''), 1800); }, []);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setErr('');
    setUnavailable(false);
    const { data, error } = await supabase.rpc('list_one_on_ones', { p_org_id: orgId });
    if (error) {
      if (isFnMissing(error)) setUnavailable(true);
      else setErr(error.message || String(error));
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(data || []);
    setLoading(false);
  }, [orgId]);

  const loadTeam = useCallback(async () => {
    if (!orgId || !isPrivileged) return;
    const { data, error } = await supabase.rpc('list_managed_employees_with_review_status', { p_org_id: orgId });
    if (!error) setTeam(data || []);
  }, [orgId, isPrivileged]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTeam(); }, [loadTeam]);

  const { upcoming, past } = useMemo(() => {
    const now = Date.now();
    const up = [];
    const pa = [];
    rows.forEach((r) => {
      const t = r.scheduled_at ? new Date(r.scheduled_at).getTime() : null;
      if (r.status === 'scheduled' && (t === null || t >= now)) up.push(r);
      else pa.push(r);
    });
    up.sort((a, b) => (new Date(a.scheduled_at || 0)) - (new Date(b.scheduled_at || 0)));
    return { upcoming: up, past: pa };
  }, [rows]);

  function openCreate() { setDraft(emptyDraft()); }
  function openEdit(r) {
    setDraft({
      id: r.id,
      employee_id: r.employee_id,
      scheduled_at: toLocalInput(r.scheduled_at),
      location: r.location || '',
      agenda: r.agenda || '',
      notes: r.notes || '',
      status: r.status || 'scheduled',
    });
  }

  async function save() {
    if (!draft) return;
    if (!draft.employee_id) { setErr('Choose a team member.'); return; }
    setSaving(true);
    setErr('');
    const { error } = await supabase.rpc('upsert_one_on_one', {
      p_id: draft.id,
      p_org_id: orgId,
      p_employee_id: draft.employee_id,
      p_scheduled_at: fromLocalInput(draft.scheduled_at),
      p_agenda: draft.agenda || null,
      p_location: draft.location || null,
      p_status: draft.status || 'scheduled',
      p_notes: draft.notes || null,
    });
    setSaving(false);
    if (error) { setErr(error.message || String(error)); return; }
    setDraft(null);
    flash(draft.id ? '1-on-1 updated.' : '1-on-1 scheduled.');
    load();
  }

  async function quickStatus(r, status) {
    const { error } = await supabase.rpc('upsert_one_on_one', {
      p_id: r.id,
      p_org_id: orgId,
      p_employee_id: r.employee_id,
      p_scheduled_at: r.scheduled_at,
      p_agenda: r.agenda || null,
      p_location: r.location || null,
      p_status: status,
      p_notes: r.notes || null,
    });
    if (error) { setErr(error.message || String(error)); return; }
    flash(status === 'completed' ? 'Marked complete.' : 'Cancelled.');
    load();
  }

  async function remove(r) {
    if (!confirm('Delete this 1-on-1?')) return;
    const { error } = await supabase.rpc('delete_one_on_one', { p_id: r.id });
    if (error) { setErr(error.message || String(error)); return; }
    flash('1-on-1 deleted.');
    load();
  }

  function Card({ r }) {
    const sm = STATUS_META[r.status] || STATUS_META.scheduled;
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="font-medium truncate">{r.employee_name}</div>
            <div className="text-xs muted truncate">with {r.manager_name || '—'}</div>
          </div>
          <span className={`shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${sm.cls}`}>
            {sm.label}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <span className="inline-flex items-center gap-1.5 muted"><Calendar className="w-4 h-4" /> {fmtWhen(r.scheduled_at)}</span>
          {r.location && <span className="inline-flex items-center gap-1.5 muted"><MapPin className="w-4 h-4" /> {r.location}</span>}
        </div>

        {r.agenda && <p className="mt-2 text-sm whitespace-pre-wrap">{r.agenda}</p>}

        {r.can_manage && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => openEdit(r)} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm">Edit</button>
            {r.status !== 'completed' && (
              <button onClick={() => quickStatus(r, 'completed')} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm">Mark complete</button>
            )}
            {r.status !== 'cancelled' && (
              <button onClick={() => quickStatus(r, 'cancelled')} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm">Cancel</button>
            )}
            <button onClick={() => remove(r)} className="px-2.5 py-1 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm text-red-600">Delete</button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-[var(--fg)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />

        <div className="flex items-center justify-between px-6 py-4 toolbar sticky top-14 z-10 shadow ml-[var(--sidebar-w)] transition-[margin] duration-200">
          <div>
            <h1 className="text-2xl font-bold">1-on-1s</h1>
            <p className="text-sm muted">Schedule and track your check-ins.</p>
          </div>
          {isPrivileged && (
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--accent)] text-white hover:brightness-90"
            >
              <Plus className="w-4 h-4" /> Schedule 1-on-1
            </button>
          )}
        </div>

        <main className="flex-1 ml-[var(--sidebar-w)] mt-4 mr-4 mb-4 px-6 overflow-auto transition-[margin] duration-200">
          {loading ? (
            <div className="p-6 text-sm muted">Loading…</div>
          ) : unavailable ? (
            <div className="p-6">
              <EmptyState title="1-on-1s backend not deployed yet" subtitle="Once the 1-on-1 RPCs are applied to Supabase, your check-ins will appear here." />
            </div>
          ) : err && rows.length === 0 ? (
            <div className="p-6"><EmptyState title="Unable to load" subtitle={err} /></div>
          ) : (
            <>
              {toast && <div className="mb-3 text-sm text-green-600">{toast}</div>}
              {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

              <section className="mb-6">
                <div className="text-lg font-semibold mb-3">Upcoming</div>
                {upcoming.length === 0 ? (
                  <EmptyState title="No upcoming 1-on-1s" subtitle={isPrivileged ? 'Schedule one with a team member.' : 'Your manager hasn’t scheduled any yet.'} />
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {upcoming.map((r) => <Card key={r.id} r={r} />)}
                  </div>
                )}
              </section>

              {past.length > 0 && (
                <section className="mb-6">
                  <div className="text-lg font-semibold mb-3">Past & closed</div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {past.map((r) => <Card key={r.id} r={r} />)}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* Schedule / edit modal */}
      {draft && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="w-full max-w-lg card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="text-lg font-semibold">{draft.id ? 'Edit 1-on-1' : 'Schedule 1-on-1'}</div>
              <button onClick={() => setDraft(null)} className="muted hover:opacity-80"><X className="w-5 h-5" /></button>
            </div>

            {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Team member</label>
                <select
                  className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)] disabled:opacity-60"
                  value={draft.employee_id}
                  disabled={!!draft.id}
                  onChange={(e) => setDraft((d) => ({ ...d, employee_id: e.target.value }))}
                >
                  <option value="">Select…</option>
                  {team.map((t) => (
                    <option key={t.employee_id} value={t.employee_id}>{t.full_name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm mb-1">Date &amp; time</label>
                  <input
                    type="datetime-local"
                    className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]"
                    value={draft.scheduled_at}
                    onChange={(e) => setDraft((d) => ({ ...d, scheduled_at: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-1">Location / link</label>
                  <input
                    className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]"
                    placeholder="Office, Zoom, …"
                    value={draft.location}
                    onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1">Agenda</label>
                <textarea
                  rows={3}
                  className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]"
                  placeholder="Topics to cover…"
                  value={draft.agenda}
                  onChange={(e) => setDraft((d) => ({ ...d, agenda: e.target.value }))}
                />
              </div>

              {draft.id && (
                <div>
                  <label className="block text-sm mb-1">Status</label>
                  <select
                    className="w-full border border-[var(--border)] rounded-lg p-2 bg-[var(--card)]"
                    value={draft.status}
                    onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))}
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              )}
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)]" onClick={() => setDraft(null)}>Cancel</button>
              <button
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-white disabled:opacity-50"
                onClick={save}
                disabled={saving || !draft.employee_id}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {saving ? 'Saving…' : draft.id ? 'Save changes' : 'Schedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
