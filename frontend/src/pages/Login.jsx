import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const location = useLocation();

  // Where did the user try to go before being bounced to /login?
  const rawFrom = location.state?.from?.pathname || '/dashboard';
  const from = ['/login', '/signup', '/auth/callback'].includes(rawFrom) ? '/dashboard' : rawFrom;

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);

    // Check org membership
    const userId = data.session.user.id;
    const { data: orgs, error: orgError } = await supabase.rpc('user_has_org');
    if(orgError) {
      return setError('Organization check failed: ' + orgError.message);
    }
    if (!orgs || orgs.length === 0) {
      return navigate('/onboarding', { replace: true });
    }
  }

  const cameFromProtected = Boolean(location.state?.from);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Welcome back</h1>

        {cameFromProtected && (
          <p className="mb-3 text-sm text-gray-600">Please sign in to continue</p>
        )}
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={signIn} className="space-y-4">
          <input
            type="email"
            className="w-full rounded-xl border border-gray-300 p-3"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            className="w-full rounded-xl border border-gray-300 p-3"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
          >
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          New here? <Link className="text-gray-900 underline" to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
