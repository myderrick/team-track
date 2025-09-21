// src/pages/Onboarding.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Globe, Loader2, Shield } from 'lucide-react';

const COUNTRIES = ['United States','Canada','United Kingdom','Australia','Germany','France','India','Nigeria','Kenya','Ghana','South Africa'];
const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);
const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase();

async function rpcSafe(name, args) {
  let r = await supabase.rpc(name, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache/i.test(msg) || /Could not find the function/i.test(msg)) {
    r = await supabase.schema('app').rpc(name, args);
  }
  return r;
}

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('United States');
  const [domainHint, setDomainHint] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return navigate('/login', { replace: true });

      // Derive domain hint from user email
      const email = sess.session?.user?.email || '';
      setDomainHint(isEmail(email) ? emailDomain(email) : '');

      // Already in an org? Short-circuit.
      const r = await rpcSafe('user_orgs');
      const rows = Array.isArray(r.data) ? r.data : [];
      if (rows.some(o => o.is_active)) return navigate('/dashboard', { replace: true });

      setLoading(false);
    })();
  }, [navigate]);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      // create_org(name, country, domain?)
      const r1 = await rpcSafe('create_org', {
        p_name: name.trim(),
        p_country: country,
        p_domain: domainHint || null
      });
      if (r1.error) throw r1.error;

      // confirm owner/admin membership
      const r2 = await rpcSafe('user_orgs');
      if (r2.error) throw r2.error;
      const ok = (r2.data || []).some(o => o.is_active && (o.role === 'owner' || o.role === 'admin'));
      if (!ok) throw new Error('Organization created but membership role not assigned correctly.');

      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="max-w-xl mx-auto p-6">Checking your account…</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-b-[2.5rem] bg-gradient-to-br from-gray-900 via-gray-800 to-gray-700 text-white shadow">
        <div className="max-w-3xl mx-auto px-6 py-8 sm:px-8">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-white/80 hover:text-white">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="mt-4">
            <h1 className="text-3xl font-semibold">Create your organization</h1>
            <p className="text-white/80 mt-1 text-sm">
              You don’t belong to an organization yet. Set one up to continue.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 text-xs text-white/80">
              <Shield className="w-4 h-4" /> You’ll be the <span className="font-semibold">owner</span> of this org.
            </div>
          </div>
        </div>
      </div>

      {/* Card */}
      <div className="max-w-3xl mx-auto px-6 -mt-10">
        <div className="rounded-2xl border bg-white p-6 shadow-sm">
          {error && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Organization name</label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  className="w-full rounded-xl border border-gray-300 p-3 pl-9 focus:outline-none focus:ring-2 focus:ring-black/10"
                  placeholder="Acme Inc."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1">Country</label>
              <select
                className="w-full rounded-xl border border-gray-300 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm text-gray-600 mb-1">Email domain (detected)</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  className="w-full rounded-xl border border-gray-300 p-3 pl-9 bg-gray-50"
                  value={domainHint || '—'}
                  disabled
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">We’ll use this to suggest org membership for coworkers.</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 rounded-xl border"
              disabled={busy}
            >
              Skip
            </button>
            <button
              onClick={submit}
              disabled={!name.trim() || busy}
              className="inline-flex items-center gap-2 rounded-xl bg-black text-white px-5 py-2.5 disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {busy ? 'Creating…' : 'Create organization'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
