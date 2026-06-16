// src/pages/AddEmployee.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';
import { rpcSafe } from '../utils/rpsSafe';
import {
  ArrowLeft, X, BadgePlus, Building2, Users, Mail, IdCard, Briefcase, MapPin,
  CalendarDays, Loader2, Copy, Check, UserPlus, ShieldCheck,
} from 'lucide-react';

const isEmail = (v = '') => /\S+@\S+\.\S+/.test(v);

function initials(name = '') {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?';
}

function Field({ label, required, hint, children }) {
  return (
    <label className="block">
      <div className="text-sm text-[var(--fg)] mb-1 flex items-center gap-1">
        <span>{label}</span>
        {required && <span className="text-red-500">*</span>}
      </div>
      {children}
      {hint ? <p className="mt-1 text-xs muted">{hint}</p> : null}
    </label>
  );
}

function Section({ title, description, icon, children }) {
  return (
    <section className="card p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="h-8 w-8 rounded-lg bg-[var(--surface)] flex items-center justify-center text-[var(--accent)]">
          {icon}
        </div>
        <div>
          <h2 className="font-semibold leading-tight">{title}</h2>
          {description && <p className="text-xs muted mt-0.5">{description}</p>}
        </div>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

const inputCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 outline-none focus:ring-2 focus:ring-[var(--accent)]/30';
const inputWithIconCls =
  'w-full rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 pl-9 outline-none focus:ring-2 focus:ring-[var(--accent)]/30';

export default function AddEmployee() {
  const nav = useNavigate();
  const { orgId, locations, departments, currentOrg } = useOrg();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    title: '',
    department: '',
    location: '',
    start_date: '',
    employee_id: '',
    manager_id: '',
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null); // { name, email, invited }
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [managerOpts, setManagerOpts] = useState([]);
  const [sendInvite, setSendInvite] = useState(true);

  const [freshJoinCode, setFreshJoinCode] = useState('');
  const [rotating, setRotating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Location choices
  const locationChoices = useMemo(() => {
    const locs = (locations || [])
      .map((l) => l.name || [l.city, l.region, l.country].filter(Boolean).join(', '))
      .filter(Boolean);
    if (locs.length > 0) return locs;
    if (currentOrg?.country) return [currentOrg.country];
    return [];
  }, [locations, currentOrg]);

  useEffect(() => {
    if (!useCustomLocation) {
      const first = locationChoices[0] || '';
      setForm((f) => ({ ...f, location: first }));
    }
  }, [locationChoices, useCustomLocation]);

  // Manager options for org
  useEffect(() => {
    (async () => {
      if (!orgId) return;
      let r = await supabase.rpc('org_employee_options', { p_org_id: orgId });
      if (r.error?.code === 'PGRST202') {
        r = await supabase.schema('app').rpc('org_employee_options', { p_org_id: orgId });
      }
      if (!r.error) setManagerOpts(r.data || []);
    })();
  }, [orgId]);

  const PUBLIC_EMAIL_DOMAINS = new Set([
    'gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'aol.com',
    'live.com', 'me.com', 'msn.com', 'proton.me', 'protonmail.com', 'yandex.com', 'zoho.com', 'mail.com',
  ]);
  const emailDomain = (v = '') => (v.split('@')[1] || '').toLowerCase().trim();

  async function domainBelongsToThisOrg(domain) {
    if (!domain) return false;
    if (PUBLIC_EMAIL_DOMAINS.has(domain)) return false;
    const { data, error } = await supabase.schema('app').rpc('check_org_domain', { p_domain: domain });
    if (error) return false;
    const row = Array.isArray(data) ? data[0] : data;
    return !!row && row.org_id === orgId;
  }

  const [canRotateJoinCode, setCanRotateJoinCode] = useState(false);
  useEffect(() => {
    (async () => {
      if (!orgId) return;
      let r = await supabase.rpc('user_orgs');
      if (r.error?.code === 'PGRST116' || r.error?.code === 'PGRST202' || /not exist/i.test(r.error?.message || '')) {
        r = await supabase.schema('app').rpc('user_orgs');
      }
      const rows = Array.isArray(r.data) ? r.data : [];
      const mine = rows.filter((o) => o.is_active && o.organization_id === orgId);
      const roles = mine.map((o) => (o.role || '').toLowerCase());
      setCanRotateJoinCode(roles.some((rr) => rr === 'owner' || rr === 'admin'));
    })();
  }, [orgId]);

  async function rotateCode() {
    if (!orgId) return;
    setRotating(true);
    setCopied(false);
    try {
      const r = await rpcSafe('rotate_join_code', { p_org_id: orgId, p_len: 8 });
      if (r.error) throw r.error;
      setFreshJoinCode(r.data || '');
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setRotating(false);
    }
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(freshJoinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {}
  }

  function resetForm() {
    setForm({ full_name: '', email: '', title: '', department: '', location: locationChoices[0] || '', start_date: '', employee_id: '', manager_id: '' });
    setError('');
    setSuccess(null);
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    async function getMyOrgRole(p_org_id) {
      try {
        let r = await supabase.rpc('user_orgs');
        if (r.error) r = await supabase.schema('app').rpc('user_orgs');
        const rows = Array.isArray(r.data) ? r.data : [];
        const mine = rows.find((o) => o.is_active && o.organization_id === p_org_id);
        return (mine?.role || '').toLowerCase();
      } catch {
        return '';
      }
    }

    try {
      if (!orgId) throw new Error('No organization selected.');

      const myRole = await getMyOrgRole(orgId);
      if (!['owner', 'admin'].includes(myRole)) {
        throw new Error('You do not have permission to add or invite employees for this organization.');
      }

      if (form.email) {
        const dom = emailDomain(form.email);
        if (PUBLIC_EMAIL_DOMAINS.has(dom)) {
          throw new Error('Please use a company email (personal email domains are not allowed).');
        }
        const ok = await domainBelongsToThisOrg(dom);
        if (!ok) {
          throw new Error(`“${dom}” is not a registered domain for this organization.`);
        }
      }

      const { error: saveErr } = await supabase.rpc('add_employee_with_org', {
        p_org_id: orgId,
        p_full_name: form.full_name.trim(),
        p_email: isEmail(form.email) ? form.email.trim() : null,
        p_title: form.title.trim() || null,
        p_department: form.department || null,
        p_location: form.location || null,
        p_start_date: form.start_date || null,
        p_employee_code: form.employee_id || null,
        p_manager_id: form.manager_id || null,
      });

      if (saveErr) {
        if (saveErr.code === '23505' || /duplicate key/i.test(saveErr.message || '')) {
          throw new Error('An employee with this email already exists in this organization.');
        }
        throw saveErr;
      }

      let invited = false;
      if (isEmail(form.email) && sendInvite) {
        try {
          const { error } = await supabase.functions.invoke('invite-staff', {
            body: {
              email: form.email.trim(),
              full_name: form.full_name.trim(),
              org_id: orgId,
              title: form.title || null,
              join_code: freshJoinCode || undefined,
            },
          });
          if (error) throw error;
          invited = true;
        } catch {
          invited = false;
        }
      }

      setSuccess({ name: form.full_name.trim(), email: form.email.trim(), invited, emailProvided: isEmail(form.email) });
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  if (!orgId) {
    return (
      <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] p-6">
        <EmptyState title="No organization selected" subtitle="Switch to an organization or create one first." />
      </div>
    );
  }

  const emailInvalid = !!form.email && !isEmail(form.email);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      {/* Top bar */}
      <div className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <button onClick={() => nav(-1)} className="inline-flex items-center gap-2 text-sm muted hover:text-[var(--fg)] transition">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] px-3 py-1 text-xs">
            <BadgePlus className="w-3.5 h-3.5 text-[var(--accent)]" /> New team member
          </span>
          <button onClick={() => nav('/directory')} className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-[var(--surface)] transition" aria-label="Close">
            <X className="w-5 h-5 muted" />
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Add employee</h1>
          <p className="muted text-sm mt-1">
            Add someone to {currentOrg?.name ? <span className="font-medium text-[var(--fg)]">{currentOrg.name}</span> : 'your organization'}
            {' '}— optionally send them an invite to join.
          </p>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 dark:bg-transparent p-3 text-sm text-red-700 dark:text-red-400">
            {error}
          </div>
        )}

        {success ? (
          <div className="card p-8 text-center max-w-xl mx-auto">
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-100 dark:bg-transparent border border-emerald-300 flex items-center justify-center text-emerald-600 mb-3">
              <Check className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-semibold">{success.name} added</h2>
            <p className="muted text-sm mt-1">
              {success.emailProvided
                ? success.invited
                  ? `An invite email was sent to ${success.email}.`
                  : `Saved, but the invite email couldn't be sent — share a join code instead, or resend later.`
                : 'Employee record created. They can join later with a company join code.'}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button onClick={resetForm} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                <UserPlus className="w-4 h-4" /> Add another
              </button>
              <button onClick={() => nav('/directory')} className="px-4 py-2 rounded-xl bg-[var(--accent)] text-white hover:brightness-90">
                View directory
              </button>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_320px] items-start">
            {/* Form */}
            <form onSubmit={submit} className="grid gap-6">
              <Section title="Basic info" description="Who they are." icon={<Users className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Full name" required>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 muted w-4 h-4" />
                      <input className={inputWithIconCls} value={form.full_name} onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))} required placeholder="Jane Doe" />
                    </div>
                  </Field>

                  <Field label="Email" hint="Company email — required to send an invite.">
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 muted w-4 h-4" />
                      <input type="email" className={inputWithIconCls} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} placeholder="jane@company.com" />
                    </div>
                    {emailInvalid && <p className="mt-1 text-xs text-red-600">Enter a valid email.</p>}
                  </Field>

                  <Field label="Title">
                    <div className="relative">
                      <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 muted w-4 h-4" />
                      <input className={inputWithIconCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Product Manager" />
                    </div>
                  </Field>

                  <Field label="Employee ID">
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 muted w-4 h-4" />
                      <input className={inputWithIconCls} value={form.employee_id} onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))} placeholder="e.g., 12345" />
                    </div>
                  </Field>
                </div>
              </Section>

              <Section title="Placement" description="Where they sit and who they report to." icon={<Building2 className="w-4 h-4" />}>
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Department" hint="Pick an existing one or type a new department.">
                    <div className="relative">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 muted w-4 h-4" />
                      <input
                        list="dept-options"
                        className={inputWithIconCls}
                        value={form.department}
                        onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                        placeholder="e.g., Sales"
                      />
                      <datalist id="dept-options">
                        {(departments || []).map((d) => <option key={d} value={d} />)}
                      </datalist>
                    </div>
                  </Field>

                  <Field label="Manager">
                    <select className={inputCls} value={form.manager_id || ''} onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value || '' }))}>
                      <option value="">— None —</option>
                      {managerOpts.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                  </Field>

                  <Field label="Location">
                    {!useCustomLocation ? (
                      <div className="flex gap-2">
                        <select className={inputCls} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} disabled={locationChoices.length === 0}>
                          {locationChoices.length === 0 ? (
                            <option value="">No locations — use custom</option>
                          ) : (
                            locationChoices.map((v) => <option key={v} value={v}>{v}</option>)
                          )}
                        </select>
                        <button type="button" className="shrink-0 px-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm" onClick={() => setUseCustomLocation(true)}>Custom</button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 muted w-4 h-4" />
                          <input className={inputWithIconCls} value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder={currentOrg?.country ? `e.g., ${currentOrg.country}` : 'City / Region / Country'} />
                        </div>
                        <button type="button" className="shrink-0 px-3 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm" onClick={() => setUseCustomLocation(false)}>Select</button>
                      </div>
                    )}
                  </Field>

                  <Field label="Start date">
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 muted w-4 h-4" />
                      <input type="date" className={inputWithIconCls} value={form.start_date} onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))} />
                    </div>
                  </Field>
                </div>
              </Section>

              <Section title="Invite & access" description="How they'll get into Team Track." icon={<ShieldCheck className="w-4 h-4" />}>
                <label className={`flex items-start gap-3 rounded-xl border p-3 cursor-pointer ${isEmail(form.email) ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-60'}`}>
                  <input type="checkbox" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" checked={sendInvite && isEmail(form.email)} disabled={!isEmail(form.email)} onChange={(e) => setSendInvite(e.target.checked)} />
                  <span>
                    <span className="text-sm font-medium">Send an invite email</span>
                    <span className="block text-xs muted">
                      {isEmail(form.email) ? `We'll email ${form.email} a link to set up their account.` : 'Add a valid company email above to enable invites.'}
                    </span>
                  </span>
                </label>

                {canRotateJoinCode && (
                  <div className="rounded-xl border border-[var(--border)] p-4">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div>
                        <div className="font-medium text-sm">Company join code</div>
                        <div className="text-xs muted">Rotate to issue a fresh single code new hires can use to self-join.</div>
                      </div>
                      <button type="button" onClick={rotateCode} disabled={rotating} className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] text-sm disabled:opacity-50">
                        {rotating ? 'Generating…' : 'Generate / Rotate'}
                      </button>
                    </div>
                    {!!freshJoinCode && (
                      <div className="mt-3 flex items-center gap-3 flex-wrap">
                        <code className="px-3 py-1.5 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-sm tracking-widest">{freshJoinCode}</code>
                        <button type="button" onClick={copyCode} className="inline-flex items-center gap-1.5 text-sm text-[var(--accent)]">
                          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : 'Copy'}
                        </button>
                        <span className="text-xs muted">Shown once — the previous code is now invalid.</span>
                      </div>
                    )}
                  </div>
                )}
              </Section>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => nav(-1)} className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)]" disabled={busy}>Cancel</button>
                <button type="submit" disabled={busy || !form.full_name.trim() || emailInvalid} className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent)] text-white px-5 py-2.5 disabled:opacity-50 hover:brightness-90">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {busy ? 'Saving…' : 'Save employee'}
                </button>
              </div>
            </form>

            {/* Live preview */}
            <aside className="lg:sticky lg:top-20">
              <div className="card p-5">
                <div className="text-xs uppercase tracking-wide muted mb-3">Preview</div>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-[var(--surface)] flex items-center justify-center text-base font-semibold text-[var(--accent)]">
                    {initials(form.full_name)}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{form.full_name || 'New employee'}</div>
                    <div className="text-sm muted truncate">{form.title || 'No title yet'}</div>
                  </div>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <Row label="Department" value={form.department} />
                  <Row label="Location" value={form.location} />
                  <Row label="Manager" value={managerOpts.find((m) => m.id === form.manager_id)?.full_name} />
                  <Row label="Email" value={form.email} />
                  <Row label="Start date" value={form.start_date} />
                </dl>

                <div className="mt-4 pt-3 border-t border-[var(--border)] text-xs muted">
                  {isEmail(form.email) && sendInvite
                    ? '✉️ Will receive an invite email on save.'
                    : 'No invite — they can self-join with a join code.'}
                </div>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="muted">{label}</dt>
      <dd className={`truncate text-right ${value ? '' : 'muted'}`}>{value || '—'}</dd>
    </div>
  );
}
