// src/pages/AddEmployee.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';
import { rpcSafe } from '../utils/rpsSafe';
import { ArrowLeft, X, BadgePlus, Building2, Users, Mail, IdCard, Briefcase, MapPin, CalendarDays, Loader2, Copy } from 'lucide-react';

const isEmail = (v = '') => /\S+@\S+\.\S+/.test(v);

function Field({ label, children, hint }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1 flex items-center gap-2">
        <span>{label}</span>
      </div>
      {children}
      {hint ? <p className="mt-1 text-xs text-gray-500">{hint}</p> : null}
    </label>
  );
}

function Section({ title, icon, children }) {
  return (
    <section>
      <div className="mb-4 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold">{title}</h2>
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

export default function AddEmployee() {
  const nav = useNavigate();
  const { orgId, locations, currentOrg } = useOrg();

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
  const [okMsg, setOkMsg] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [managerOpts, setManagerOpts] = useState([]);

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

  if (!orgId) {
    return (
      <div className="p-6">
        <EmptyState title="No organization selected" subtitle="Switch to an organization or create one first." />
      </div>
    );
  }

  async function rotateCode() {
    if (!orgId) return;
    setRotating(true);
    setCopied(false);
    try {
      const r = await rpcSafe('rotate_join_code', { p_org_id: orgId, p_len: 8 }); // returns plaintext
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

  const PUBLIC_EMAIL_DOMAINS = new Set([
    'gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','aol.com',
    'live.com','me.com','msn.com','proton.me','protonmail.com','yandex.com','zoho.com','mail.com'
  ]);
  const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase().trim();

  async function domainBelongsToThisOrg(domain) {
    if (!domain) return false;
    if (PUBLIC_EMAIL_DOMAINS.has(domain)) return false;
    const { data, error } = await supabase.schema('app').rpc('check_org_domain', { p_domain: domain });
    if (error) return false;
    const row = Array.isArray(data) ? data[0] : data;
    return !!row && row.org_id === orgId;  // ensure the domain maps to THIS org
}

const [canRotateJoinCode, setCanRotateJoinCode] = useState(false);
useEffect(() => {
  (async () => {
    if (!orgId) return;
    const r = await rpcSafe('user_orgs');
    const rows = Array.isArray(r.data) ? r.data : [];
    const mine = rows.filter(o => o.is_active && o.organization_id === orgId);
    const roles = mine.map(o => (o.role || '').toLowerCase());
    setCanRotateJoinCode(roles.some(r => r === 'owner' || r === 'admin')); // owner/admin only
  })();
}, [orgId]);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setOkMsg('');

    try {

       // Soft email validation rules when email is provided
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

      // Save employee row
      const { error } = await supabase.rpc('app.add_employee_with_org', {
        p_org_id: orgId,
        p_full_name: form.full_name.trim(),
        p_email: isEmail(form.email) ? form.email.trim() : null,
        p_title: form.title.trim() || null,
        p_department: form.department || null,
        p_location: form.location || null,
        p_start_date: form.start_date || null,
        // If your RPC supports it:
        // p_employee_code: form.employee_id || null,
        p_manager_id: form.manager_id || null,
      });
if (error) {
      // Nice duplicate message on unique violations
      if (error.code === '23505' || /duplicate key/i.test(error.message || '')) {
        throw new Error('An employee with this email already exists in this organization.');
      }
      throw error;
    }
      // (Optional) Invite email
      if (isEmail(form.email)) {
        try {
          const resp = await fetch('/functions/v1/invite-employee', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: form.email.trim(),
              full_name: form.full_name.trim(),
              org_id: orgId,
              title: form.title || null,
              join_code: freshJoinCode || undefined, // include if generated now
            }),
          });
          const payload = await resp.json();
          if (!resp.ok) throw new Error(payload?.error || 'Invite failed');
          setOkMsg(`Saved. Invite email sent to ${form.email}.`);
        } catch (e) {
          setOkMsg(
            `Saved. Could not send invite: ${String(e.message || e)}. You can resend from People later.`
          );
        }
      } else {
        setOkMsg('Employee saved.');
      }

      setTimeout(() => nav('/dashboard', { replace: true }), 700);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header / Hero */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-6 sm:px-8 sm:py-8">
          <div className="flex items-center justify-between">
            <button
              onClick={() => nav(-1)}
              className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
            <button
              onClick={() => nav('/dashboard')}
              className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-white/10 transition"
              aria-label="Close"
              title="Close"
            >
              <X className="w-5 h-5 text-white/90" />
            </button>
          </div>

          <div className="mt-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 ring-1 ring-white/20 px-3 py-1 text-xs">
              <BadgePlus className="w-3.5 h-3.5" />
              New team member
            </div>
            <h1 className="text-3xl font-semibold mt-3">Add employee</h1>
            <p className="text-white/80 mt-1 text-sm">
              This employee will be added to your selected organization.
            </p>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-3xl mx-auto px-6 -mt-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {/* Alerts */}
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
          {okMsg && (
            <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
              {okMsg}
            </div>
          )}

          <form onSubmit={submit} className="grid grid-cols-1 gap-8">
            {/* Basic Info */}
            <Section
              title="Basic info"
              icon={<Users className="w-4 h-4 text-gray-400" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name">
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      className="w-full rounded-xl border border-gray-300 p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-black/10"
                      value={form.full_name}
                      onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                      required
                      placeholder="Jane Doe"
                    />
                  </div>
                </Field>

                <Field label="Email (optional)">
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="email"
                      className="w-full rounded-xl border border-gray-300 p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-black/10"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      placeholder="jane@company.com"
                    />
                  </div>
                  {!!form.email && !isEmail(form.email) && (
                    <p className="mt-1 text-xs text-red-600">Enter a valid email.</p>
                  )}
                </Field>

                <Field label="Title">
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      className="w-full rounded-xl border border-gray-300 p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-black/10"
                      value={form.title}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                      placeholder="Product Manager"
                    />
                  </div>
                </Field>

                <Field label="Department">
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      className="w-full rounded-xl border border-gray-300 p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-black/10"
                      value={form.department}
                      onChange={(e) => setForm((f) => ({ ...f, department: e.target.value }))}
                      placeholder="e.g., Sales"
                    />
                  </div>
                </Field>

                <Field label="Employee ID">
                  <div className="relative">
                    <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      className="w-full rounded-xl border border-gray-300 p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-black/10"
                      value={form.employee_id}
                      onChange={(e) => setForm((f) => ({ ...f, employee_id: e.target.value }))}
                      placeholder="e.g., 12345"
                    />
                  </div>
                </Field>

                <Field label="Manager (optional)">
                  <select
                    className="w-full rounded-xl border border-gray-300 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                    value={form.manager_id || ''}
                    onChange={(e) => setForm((f) => ({ ...f, manager_id: e.target.value || '' }))}
                  >
                    <option value="">— None —</option>
                    {managerOpts.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.full_name}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
            </Section>

            {/* Location & Dates */}
            <Section
              title="Location & dates"
              icon={<MapPin className="w-4 h-4 text-gray-400" />}
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Location">
                  {!useCustomLocation ? (
                    <div className="flex gap-3">
                      <select
                        className="w-full rounded-xl border border-gray-300 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        disabled={locationChoices.length === 0}
                      >
                        {locationChoices.length === 0 ? (
                          <option value="">No locations (add in Settings or use custom)</option>
                        ) : (
                          locationChoices.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))
                        )}
                      </select>
                      <button
                        type="button"
                        className="px-3 rounded-lg border"
                        onClick={() => setUseCustomLocation(true)}
                      >
                        Custom…
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <input
                        className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                        value={form.location}
                        onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                        placeholder={
                          currentOrg?.country ? `e.g., ${currentOrg.country}` : 'City / Region / Country'
                        }
                      />
                      <button
                        type="button"
                        className="px-3 rounded-lg border"
                        onClick={() => setUseCustomLocation(false)}
                      >
                        Select
                      </button>
                    </div>
                  )}
                </Field>

                <Field label="Start date">
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-300 p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-black/10"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                    />
                  </div>
                </Field>
              </div>
            </Section>

            {/* Join Code tools (ideal: owner/admin only) */}
            {canRotateJoinCode && (
              <Section title="Company join code" icon={<BadgePlus className="w-4 h-4 text-gray-400" />}>
                <div className="rounded-xl border p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Generate & share a new code</div>
                    <div className="text-sm text-gray-500">
                      Rotate to issue a fresh, single code for new hires.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={rotateCode}
                    disabled={rotating}
                    className="px-3 py-2 rounded-lg border disabled:opacity-50"
                  >
                    {rotating ? 'Generating…' : 'Generate / Rotate'}
                  </button>
                </div>

                {!!freshJoinCode && (
                  <div className="mt-3 flex items-center gap-3">
                    <code className="px-3 py-1.5 rounded bg-gray-100 border text-sm">
                      {freshJoinCode}
                    </code>
                    <button
                      type="button"
                      onClick={copyCode}
                      className="inline-flex items-center gap-1.5 text-sm underline"
                      title="Copy"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <span className="text-xs text-gray-500">
                      Shown once — previous code is now invalid.
                    </span>
                  </div>
                )}
              </div>
            </Section>
          )}
            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => nav(-1)}
                  className="px-4 py-2 rounded-xl border"
                  disabled={busy}
                >
                  Cancel
                </button>
              </div>

              <button
                type="submit"
                disabled={busy || !form.full_name.trim() || (!!form.email && !isEmail(form.email))}
                className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-5 py-2.5 disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {busy ? 'Saving…' : 'Save employee'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
