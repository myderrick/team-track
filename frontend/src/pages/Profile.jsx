// src/pages/Profile.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Mail, Building2, Shield, Globe, Save, Loader2, Pencil
} from 'lucide-react';
import AvatarUploader from '@/components/AvatarUploader';

function AvatarCircle({ name, src }) {
  const initials = (name || 'U').split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase();
  return (
    <div className="relative">
      {src ? (
        <img src={src} alt="avatar" className="h-16 w-16 rounded-full ring-2 ring-white/30 object-cover" />
      ) : (
        <div className="h-16 w-16 rounded-full bg-white/10 ring-1 ring-white/20 flex items-center justify-center text-2xl font-semibold">
          {initials}
        </div>
      )}
      <div className="absolute -bottom-1 -right-1">
        {/* reserved for the edit button placement in parent */}
      </div>
    </div>
  );
}
function Card({ children, className='' }) {
  return <div className={`rounded-2xl border bg-white p-5 shadow-sm ${className}`}>{children}</div>;
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
function Chip({ children, icon }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full bg-white/10 ring-1 ring-white/20">
      {icon} {children}
    </span>
  );
}
function Skeleton() {
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6 animate-pulse">
      <div className="h-36 rounded-3xl bg-gray-200" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-48 rounded-2xl bg-gray-200" />
        <div className="h-48 rounded-2xl bg-gray-200" />
        <div className="h-48 rounded-2xl bg-gray-200 lg:col-span-2" />
      </div>
    </div>
  );
}
async function rpcSafe(name, args) {
  let r = await supabase.rpc(name, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache/i.test(msg) || /Could not find the function/i.test(msg)) {
    r = await supabase.schema('app').rpc(name, args);
  }
  return r;
}
function normalizeOrg(row = {}) {
  return {
    id: row.id ?? row.organization_id ?? null,
    name: row.name ?? row.org_name ?? '',
    domain: row.domain ?? row.org_domain ?? '',
    country: row.country ?? row.org_country ?? '',
    role: row.role ?? '',
    is_active: row.is_active ?? false,
  };
}

export default function Profile() {
  const nav = useNavigate();

  const [loading, setLoading] = useState(true);
  const [acct, setAcct] = useState({ email: '', name: '', avatar_url: '' });
  const [pw, setPw] = useState({ a:'', b:'' });
  const [savingName, setSavingName] = useState(false);
  const [changingPw, setChangingPw] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [avatarOpen, setAvatarOpen] = useState(false);

  const [orgs, setOrgs] = useState([]);
  const activeOrg = useMemo(() => orgs.find(o => o.is_active) || orgs[0] || null, [orgs]);

  const [initialName, setInitialName] = useState('');
  const isDirty = useMemo(() => acct.name.trim() !== initialName.trim(), [acct.name, initialName]);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return nav('/login', { replace: true });

      const email = sess.session.user.email || '';
      const name = sess.session.user.user_metadata?.full_name || '';
      const avatar_url = sess.session.user.user_metadata?.avatar_url || '';
      setAcct({ email, name, avatar_url });
      setInitialName(name);

      const r = await rpcSafe('user_orgs');
      const rows = Array.isArray(r.data) ? r.data.map(normalizeOrg) : [];
      setOrgs(rows);
      setLoading(false);
    })();
  }, [nav]);

  async function saveName() {
    setErr(''); setMsg('');
    if (!acct.name.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { full_name: acct.name.trim() } });
      if (error) throw error;
      setMsg('Name updated.');
      setInitialName(acct.name.trim());
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword() {
    setErr(''); setMsg('');
    if (pw.a.length < 6 || pw.a !== pw.b) {
      setErr('Passwords must match and be at least 6 characters.');
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.a });
      if (error) throw error;
      setMsg('Password changed.');
      setPw({ a:'', b:'' });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setChangingPw(false);
    }
  }

  async function setActiveOrg(id) {
    const r = await rpcSafe('set_active_org', { p_org_id: id });
    if (r.error) return setErr(r.error.message);
    const r2 = await rpcSafe('user_orgs');
    const rows = Array.isArray(r2.data) ? r2.data.map(normalizeOrg) : [];
    setOrgs(rows);
    setMsg('Active organization updated.');
  }

  async function leaveOrg(id) {
    if (!confirm('Are you sure you want to leave this organization?')) return;
    const r = await rpcSafe('leave_org', { p_org_id: id });
    if (r.error) return setErr(r.error.message);
    const r2 = await rpcSafe('user_orgs');
    const rows = Array.isArray(r2.data) ? r2.data.map(normalizeOrg) : [];
    setOrgs(rows);
    setMsg('You left the organization.');
  }

  if (loading) return <Skeleton />;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white shadow">
        <div className="px-6 py-6 sm:px-8 sm:py-8">
          <button
            onClick={() => nav(-1)}
            className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="mt-4 flex items-center gap-5">
            <div className="relative">
              <AvatarCircle name={acct.name || acct.email} src={acct.avatar_url} />
              <button
                onClick={()=>setAvatarOpen(true)}
                className="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-white/90 text-gray-800 shadow hover:bg-white"
                title="Edit avatar"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-semibold">{acct.name || 'Your profile'}</h1>
                {activeOrg?.role && <Chip icon={<Shield className="w-3.5 h-3.5" />}>{activeOrg.role}</Chip>}
                {activeOrg?.name && <Chip icon={<Building2 className="w-3.5 h-3.5" />}>{activeOrg.name}</Chip>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-white/80">
                {acct.email && (
                  <span className="inline-flex items-center gap-1.5"><Mail className="w-4 h-4" /> {acct.email}</span>
                )}
                {activeOrg?.domain && (
                  <span className="inline-flex items-center gap-1.5"><Globe className="w-4 h-4" /> {activeOrg.domain}</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <Section title="Account" subtitle="Update your display name. Email is managed by your authentication provider.">
            <Field label="Name">
              <input
                className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                value={acct.name}
                onChange={(e)=>setAcct(a=>({...a, name: e.target.value}))}
                placeholder="Your name"
              />
            </Field>
            <Field label="Email">
              <input className="w-full rounded-xl border p-3 bg-gray-50" value={acct.email} disabled />
            </Field>
          </Section>
        </Card>

        <Card>
          <Section title="Organization" subtitle="Your current organization and role.">
            {activeOrg ? (
              <div className="grid gap-4">
                <div className="rounded-xl border p-4">
                  <div className="text-xs text-gray-500">Organization</div>
                  <div className="mt-1 font-medium">{activeOrg.name || '—'}</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">Domain</div>
                    <div className="mt-1 font-medium">{activeOrg.domain || '—'}</div>
                  </div>
                  <div className="rounded-xl border p-4">
                    <div className="text-xs text-gray-500">Role</div>
                    <div className="mt-1 font-medium">{activeOrg.role || '—'}</div>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-600">You aren’t in any organization yet.</p>
            )}
          </Section>
        </Card>

        {/* Manage organizations */}
        <Card className="lg:col-span-2">
          <Section
            title="Manage organizations"
            subtitle="Switch your active organization or leave one you no longer belong to."
          >
            {orgs.length === 0 ? (
              <p className="text-sm text-gray-600">No organizations found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-gray-500">
                      <th className="py-2">Name</th>
                      <th className="py-2">Domain</th>
                      <th className="py-2">Role</th>
                      <th className="py-2">Active</th>
                      <th className="py-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgs.map(o => (
                      <tr key={o.id} className="border-t">
                        <td className="py-2">{o.name}</td>
                        <td className="py-2 text-gray-500">{o.domain || '—'}</td>
                        <td className="py-2">{o.role || '—'}</td>
                        <td className="py-2">{o.is_active ? 'Yes' : 'No'}</td>
                        <td className="py-2 text-right space-x-2">
                          {!o.is_active && (
                            <button onClick={()=>setActiveOrg(o.id)} className="px-3 py-1.5 rounded-lg border">Make active</button>
                          )}
                          {o.role !== 'owner' && (
                            <button onClick={()=>leaveOrg(o.id)} className="px-3 py-1.5 rounded-lg border text-red-600">Leave</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        </Card>

        <Card className="lg:col-span-2">
          <Section title="Change password" subtitle="Use a strong password you don’t reuse elsewhere.">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="New password">
                <input
                  type="password"
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={pw.a}
                  onChange={(e)=>setPw(p=>({...p, a: e.target.value}))}
                />
              </Field>
              <Field label="Confirm password">
                <input
                  type="password"
                  className="w-full rounded-xl border p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
                  value={pw.b}
                  onChange={(e)=>setPw(p=>({...p, b: e.target.value}))}
                />
              </Field>
            </div>
            <div className="mt-2">
              <button
                onClick={changePassword}
                disabled={changingPw}
                className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-4 py-2 disabled:opacity-50"
              >
                {changingPw ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {changingPw ? 'Updating…' : 'Update password'}
              </button>
            </div>
          </Section>
        </Card>
      </div>

      {/* Sticky save bar (for name change) */}
      <div className={`fixed inset-x-0 bottom-4 sm:bottom-6 flex justify-center pointer-events-none ${isDirty ? 'opacity-100' : 'opacity-0'} transition`}>
        <div className="pointer-events-auto bg-white/90 backdrop-blur rounded-2xl shadow-lg px-4 py-3 border flex items-center gap-3">
          <span className="text-sm">{isDirty ? 'You have unsaved changes' : 'All changes saved'}</span>
          <button
            onClick={async () => {
              const { data: sess } = await supabase.auth.getSession();
              const name = sess.session?.user?.user_metadata?.full_name || '';
              setAcct(a => ({ ...a, name }));
            }}
            disabled={!isDirty || savingName}
            className="px-3 py-2 rounded-lg border text-sm disabled:opacity-50"
          >
            Reset
          </button>
          <button
            onClick={saveName}
            disabled={!isDirty || savingName}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-black text-white text-sm disabled:opacity-50"
          >
            {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {savingName ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Avatar modal */}
      <AvatarUploader
        open={avatarOpen}
        onClose={()=>setAvatarOpen(false)}
        onUploaded={(url)=>setAcct(a=>({...a, avatar_url: url}))}
      />
    </div>
  );
}
