// src/pages/StaffProfile.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Mail, Calendar, Building2, Briefcase, IdCard, Users, MapPin, User, Save, Loader2
} from 'lucide-react';

function ymd(d){ if(!d) return ''; const s = typeof d==='string'? d : new Date(d).toISOString(); return s.slice(0,10); }
async function rpcSafe(fn, args) {
  let r = await supabase.rpc(fn, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache/i.test(msg) || /Could not find the function/i.test(msg)) {
    r = await supabase.schema('app').rpc(fn, args);
  }
  return r;
}

export default function StaffProfile() {
  const nav = useNavigate();
  const { employeeId } = useParams();
  const [linkBusy, setLinkBusy] = useState(false);
const [linkEmail, setLinkEmail] = useState('');


  const [initial, setInitial] = useState(null); // for dirty check
  const [form, setForm] = useState({
    full_name: '', email: '', start_date: '',
    organization: '', organization_id: null,
    employee_code: '', department: '', title: '',
    manager_name: '', manager_id: '', location: ''
  });

  const [managerOpts, setManagerOpts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');

  const isDirty = useMemo(() => {
    if (!initial) return false;
    return JSON.stringify(initial) !== JSON.stringify(form);
  }, [initial, form]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return nav('/login', { replace: true });

      setErr(''); setMsg('');

      const { data, error } = await rpcSafe('employee_detail', { p_employee_id: employeeId });
      if (error) { setErr(error.message); setLoading(false); return; }
      if (!data || !data.length) { setErr('Employee not found'); setLoading(false); return; }

      const e = data[0];
      const next = {
        full_name: e.full_name || '',
        email: e.email || '',
        start_date: ymd(e.start_date),
        organization: e.org_name || '',
        organization_id: e.organization_id || null,
        employee_code: e.employee_code || '',
        department: e.department || '',
        title: e.title || '',
        manager_name: e.manager_name || '',
        manager_id: e.manager_id || '',
        location: e.location || '',
        linked_user_id: e.linked_user_id || null,   // <— add
      };
      setForm(next);
      setInitial(next);

      // prefill linking email
setLinkEmail(e.email || '');

      if (e.organization_id) {
        const r2 = await rpcSafe('org_manager_options', {
          p_org_id: e.organization_id,
          p_exclude_employee_id: employeeId
        });
        if (!r2.error) setManagerOpts(r2.data || []);
      }

      setLoading(false);
    })();
  }, [employeeId, nav]);

  function updateField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  async function linkNow() {
  setErr(''); setMsg('');
  if (!linkEmail.trim()) { setErr('Enter an email to link.'); return; }
  setLinkBusy(true);
  try {
    // try public wrapper first
    let r = await supabase.rpc('link_user_to_employee_admin', {
      p_employee_id: employeeId,
      p_user_email: linkEmail.trim(),
    });

    // if schema cache error, try calling the app schema directly
    if (r.error?.code === 'PGRST202' || /schema cache|Could not find the function/i.test(r.error?.message || '')) {
      r = await supabase.schema('app').rpc('link_user_to_employee_admin', {
        p_employee_id: employeeId,
        p_user_email: linkEmail.trim(),
      });
    }

    if (r.error) throw r.error;

    setMsg('Linked to account and activated org membership.');
    // Re-fetch detail so UI reflects the link
    const d = await rpcSafe('employee_detail', { p_employee_id: employeeId });
    if (!d.error && Array.isArray(d.data) && d.data[0]) {
      const e = d.data[0];
      setForm(f => ({ ...f, linked_user_id: e.linked_user_id || 'linked' }));
      setInitial(i => ({ ...i, linked_user_id: e.linked_user_id || 'linked' }));
    } else {
      setForm(f => ({ ...f, linked_user_id: 'linked' }));
    }
  } catch (e) {
    setErr(String(e?.message || e));
  } finally {
    setLinkBusy(false);
  }
}


async function unlinkNow() {
  setErr(''); setMsg('');
  setLinkBusy(true);
  try {
    const r = await rpcSafe('unlink_user_from_employee', { p_employee_id: employeeId });
    if (r.error) throw r.error;
    setMsg('Unlinked from account.');
    setForm(f => ({ ...f, linked_user_id: null }));
  } catch (e) {
    setErr(String(e?.message || e));
  } finally {
    setLinkBusy(false);
  }
}


  async function save() {
    setErr(''); setMsg('');
    setSaving(true);
    try {
      const payload = {
        p_employee_id: employeeId,
        p_full_name: form.full_name.trim(),
        p_department: form.department || null,
        p_title: form.title || null,
        p_manager_id: form.manager_id || null,
        p_employee_code: form.employee_code || null,
        p_start_date: form.start_date || null,
        p_email: form.email || null,
        p_location: form.location || null,
      };
      const r = await rpcSafe('update_employee_profile', payload);
      if (r.error) throw r.error;

      setMsg('Profile updated.');
      setInitial(form);
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Skeleton />;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white shadow">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <button
            onClick={()=>nav(-1)}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="mt-4 flex items-center gap-5">
            <AvatarCircle name={form.full_name || form.email} />
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-semibold">{form.full_name || 'Unnamed'}</h1>
                {form.title && <Chip icon={<Briefcase className="w-3.5 h-3.5" />}>{form.title}</Chip>}
                {form.department && <Chip icon={<Building2 className="w-3.5 h-3.5" />}>{form.department}</Chip>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/80">
                {form.email && (
                  <span className="inline-flex items-center gap-1.5"><Mail className="w-4 h-4" /> {form.email}</span>
                )}
                {form.start_date && (
                  <span className="inline-flex items-center gap-1.5"><Calendar className="w-4 h-4" /> Started {form.start_date}</span>
                )}
                {form.location && (
                  <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" /> {form.location}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {(err || msg) && (
        <div className={`rounded-2xl p-4 text-sm shadow ${err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {err || msg}
        </div>
      )}

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <Card className="lg:col-span-2">
          <Section title="Basic info" subtitle="Core identity fields for this employee.">
            <Field label="Full name">
              <input
                className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                value={form.full_name}
                onChange={e=>updateField('full_name', e.target.value)}
                placeholder="Jane Doe"
              />
            </Field>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Email">
                <input
                  type="email"
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={form.email}
                  onChange={e=>updateField('email', e.target.value)}
                  placeholder="jane@company.com"
                />
              </Field>
              <Field label="Start date">
                <input
                  type="date"
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={form.start_date || ''}
                  onChange={e=>updateField('start_date', e.target.value)}
                />
              </Field>
            </div>
          </Section>

          <div className="h-px bg-gray-100 my-6" />

          <Section title="Organization & role" subtitle="Role details and reporting line within the organization.">
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Organization">
                <input className="w-full rounded-xl border p-3 bg-gray-50" value={form.organization} disabled />
              </Field>
              <Field label="Employee ID">
                <input
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={form.employee_code}
                  onChange={e=>updateField('employee_code', e.target.value)}
                  placeholder="e.g., 12345"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Department">
                <input
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={form.department}
                  onChange={e=>updateField('department', e.target.value)}
                  placeholder="e.g., Sales"
                />
              </Field>
              <Field label="Title">
                <input
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={form.title}
                  onChange={e=>updateField('title', e.target.value)}
                  placeholder="Product Manager"
                />
              </Field>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Manager">
                <div className="relative">
                  <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    className="w-full rounded-xl border p-3 pl-10 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                    value={form.manager_id || ''}
                    onChange={e => {
                      const id = e.target.value || '';
                      const m = (managerOpts || []).find(x => x.id === id);
                      setForm(f => ({ ...f, manager_id: id, manager_name: m?.full_name || '' }));
                    }}
                  >
                    <option value="">— None —</option>
                    {managerOpts.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Selecting a manager will also ensure they have the <span className="font-medium">manager</span> role for this org.
                </p>
              </Field>

              <Field label="Location">
                <input
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={form.location}
                  onChange={e=>updateField('location', e.target.value)}
                  placeholder="City / Region / Country"
                />
              </Field>
            </div>
          </Section>
        </Card>

        {/* Right column */}
        <div className="space-y-6">
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <IdCard className="w-4 h-4 text-gray-500" />
              <h3 className="font-medium">Quick summary</h3>
            </div>
            <SummaryRow icon={<User className="w-4 h-4" />} label="Name" value={form.full_name || '—'} />
            <SummaryRow icon={<Mail className="w-4 h-4" />} label="Email" value={form.email || '—'} />
            <SummaryRow icon={<Calendar className="w-4 h-4" />} label="Start date" value={form.start_date || '—'} />
            <SummaryRow icon={<Building2 className="w-4 h-4" />} label="Organization" value={form.organization || '—'} />
            <SummaryRow icon={<Briefcase className="w-4 h-4" />} label="Title" value={form.title || '—'} />
            <SummaryRow icon={<Users className="w-4 h-4" />} label="Manager" value={form.manager_name || '—'} />
            <SummaryRow icon={<MapPin className="w-4 h-4" />} label="Location" value={form.location || '—'} />
          </Card>
<Card>
  <div className="flex items-center gap-2 mb-3">
    <IdCard className="w-4 h-4 text-gray-500" />
    <h3 className="font-medium">Account link</h3>
  </div>

  {!form.linked_user_id ? (
    <>
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 mb-3">
        This employee is not linked to a user account. Link them so they can access the staff dashboard.
      </div>
      <label className="block mb-2">
        <div className="text-sm text-gray-600 mb-1">User email</div>
        <input
          type="email"
          className="w-full rounded-xl border p-3"
          value={linkEmail}
          onChange={e => setLinkEmail(e.target.value)}
          placeholder="user@company.com"
        />
      </label>
      <button
        onClick={linkNow}
        disabled={linkBusy || !linkEmail.trim()}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
      >
        {linkBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        {linkBusy ? 'Linking…' : 'Link account'}
      </button>
    </>
  ) : (
    <>
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 mb-3">
        This employee is linked to a user account and can access staff features.
      </div>
      <button
        onClick={unlinkNow}
        disabled={linkBusy}
        className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
      >
        {linkBusy ? 'Unlinking…' : 'Unlink'}
      </button>
    </>
  )}
</Card>

          <Card>
            <h3 className="font-medium mb-2">Tips</h3>
            <ul className="text-sm text-gray-600 list-disc ml-5 space-y-1">
              <li>Use a work email to enable SSO and invites.</li>
              <li>Setting a manager auto-promotes their membership role.</li>
              <li>Keep titles consistent for better directory filtering.</li>
            </ul>
          </Card>
        </div>
      </div>

      {/* Sticky action bar */}
      <div className={`fixed inset-x-0 bottom-4 sm:bottom-6 flex justify-center pointer-events-none ${isDirty ? 'opacity-100' : 'opacity-0'} transition`}>
        <div className="pointer-events-auto bg-white/90 backdrop-blur rounded-2xl shadow-lg px-4 py-3 border flex items-center gap-3">
          <span className="text-sm">{isDirty ? 'You have unsaved changes' : 'All changes saved'}</span>
          <button
            onClick={()=>setForm(initial)}
            disabled={!isDirty || saving}
            className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={save}
            disabled={!isDirty || saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- small UI helpers ---------- */

function Card({ children, className='' }) {
  return (
    <div className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function Section({ title, subtitle, children }) {
  return (
    <section>
      <div className="mb-4">
        <h2 className="font-semibold">{title}</h2>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}

function SummaryRow({ icon, label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <div className="flex items-center gap-2 text-gray-600">
        <span>{icon}</span>
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  );
}

function Chip({ children, icon }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-white/10 ring-1 ring-white/20">
      {icon} {children}
    </span>
  );
}

function AvatarCircle({ name }) {
  const initials = (name || 'U')
    .split(/\s+/).slice(0,2).map(s=>s[0]).join('').toUpperCase();
  return (
    <div className="h-14 w-14 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-xl font-semibold">
      {initials}
    </div>
  );
}

function Skeleton() {
  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-36 rounded-3xl bg-gray-200" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="h-40 rounded-2xl bg-gray-200" />
          <div className="h-40 rounded-2xl bg-gray-200" />
        </div>
        <div className="space-y-4">
          <div className="h-40 rounded-2xl bg-gray-200" />
          <div className="h-40 rounded-2xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
