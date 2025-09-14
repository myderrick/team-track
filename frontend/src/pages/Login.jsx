import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/AuthBits';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true); // UI only; supabase-js persists by default

  const navigate = useNavigate();
  const location = useLocation();

  const rawFrom = location.state?.from?.pathname || '/dashboard';
  const from = ['/login', '/signup', '/auth/callback'].includes(rawFrom) ? '/dashboard' : rawFrom;
  const cameFromProtected = Boolean(location.state?.from);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return setError(error.message);

    // Optional: adapt persistence if you want the checkbox to actually control storage.
    // If you have your client created with localStorage, this is enough as UI.
    // You could store a flag for future use:
    try { localStorage.setItem('remember_me', remember ? '1' : '0'); } catch {}

    // org membership check
    const userId = data.session?.user?.id;
    if (!userId) return navigate('/login', { replace: true });

    const { data: orgs, error: orgError } = await supabase.rpc('user_has_org');
    if (orgError) return setError('Organization check failed: ' + orgError.message);

    if (!orgs || orgs.length === 0) {
      return navigate('/onboarding', { replace: true });
    }
    navigate(from, { replace: true });
  }

  async function signInWithGoogle() {
    setError('');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) setError(error.message);
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={cameFromProtected ? 'Please sign in to continue' : 'Enter your details to access your account'}
    >
      <ErrorBanner message={error} />

      <form onSubmit={signIn} className="space-y-4">
        <Field label="Email">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MailIcon /></span>
            <input
              type="email"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </Field>

        <Field label="Password">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black/20"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-gray-700 hover:underline">Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium hover:bg-gray-50"
        >
          Sign in with Google
        </button>

        <p className="text-sm text-gray-600 text-center">
          Don’t have an account?{' '}
          <Link className="text-gray-900 underline" to="/signup">Sign Up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
