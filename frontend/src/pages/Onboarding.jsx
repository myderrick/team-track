import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const COUNTRIES = ['United States','Canada','United Kingdom','Australia','Germany','France','India','Nigeria','Kenya','Ghana','South Africa'];

const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);
const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase();

export default function Onboarding() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [hasOrg, setHasOrg] = useState(false);
  const [name, setName] = useState('');
  const [country, setCountry] = useState('United States');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return navigate('/login', { replace: true });

      // Already in an org?
      const { data, error } = await supabase.rpc('user_orgs'); // returns role too
      if (!error && Array.isArray(data) && data.some(r => r.is_active)) {
        setHasOrg(true);
        navigate('/dashboard', { replace: true });
        return;
      }
      setLoading(false);
    })();
  }, [navigate]);

  async function submit() {
    setError('');
    setBusy(true);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const email = sess.session?.user?.email || '';
      const domain = isEmail(email) ? emailDomain(email) : null;

      // Call create_org(name, country, domain?)
      const { error: rpcErr } = await supabase.rpc('create_org', {
        p_name: name.trim(),
        p_country: country,
        p_domain: domain // can be null; backend derives when null
      });
      if (rpcErr) throw rpcErr;

      // Optional verification (confirms owner/admin assignment)
      const { data: orgs, error: orgErr } = await supabase.rpc('user_orgs');
      if (orgErr) throw orgErr;

      const ownerOrAdmin = (orgs || []).find(r => r.is_active && (r.role === 'owner' || r.role === 'admin'));
      if (!ownerOrAdmin) {
        throw new Error('Organization created but membership role not assigned correctly.');
      }

      navigate('/dashboard', { replace: true });
    } catch (e) {
      setError(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6">Checking your account…</div>;
  if (hasOrg) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2 text-gray-900">Create your organization</h1>
        <p className="text-sm text-gray-600 mb-6">You don’t belong to an organization yet. Create one to continue.</p>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Organization name</label>
            <input
              className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="Acme Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Country</label>
            <select
              className="w-full rounded-xl border border-gray-300 p-3 bg-white focus:outline-none focus:ring-2 focus:ring-black/10"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
            >
              {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <button
            onClick={submit}
            disabled={!name.trim() || busy}
            className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create organization'}
          </button>
        </div>
      </div>
    </div>
  );
}
