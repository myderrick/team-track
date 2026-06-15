// frontend/src/pages/ResetPassword.jsx
import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, LockIcon, EyeIcon, EyeOffIcon } from '../components/AuthBits';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);

  // Consume the recovery token directly on this page. Supabase appends auth
  // params either as a query (?code=… / ?error=…) for the PKCE flow or in the
  // URL hash (#access_token=… / #error=…) for the implicit flow, so read both.
  useEffect(() => {
    let active = true;
    let settled = false;
    const finish = (ok) => {
      if (!active || settled) return;
      settled = true;
      setHasSession(ok);
      setChecking(false);
    };

    // detectSessionInUrl consumes a hash token asynchronously and fires this.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN')) {
        finish(true);
      }
    });

    (async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const errDesc =
        params.get('error_description') || params.get('error') ||
        hash.get('error_description') || hash.get('error');
      if (errDesc) return finish(false);

      // PKCE flow: exchange the code in the URL for a recovery session.
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        return finish(!error);
      }

      // Session may already be present (hash consumed on load, or arrived here
      // with a live recovery session).
      const { data: { session } } = await supabase.auth.getSession();
      if (session) return finish(true);

      // Otherwise give the hash-detection listener a brief moment before failing.
      setTimeout(() => finish(false), 2000);
    })();

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, [params]);

  async function updatePassword(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setBusy(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setBusy(false);

    if (updErr) {
      setError(updErr.message);
      return;
    }
    setDone(true);
    // Sign out the recovery session so the user logs in with the new password.
    await supabase.auth.signOut().catch(() => {});
    const next = params.get('next') || '/login';
    setTimeout(() => navigate(next, { replace: true }), 1500);
  }

  if (checking) {
    return (
      <AuthLayout title="Reset password" subtitle="Verifying your reset link…">
        <div className="p-2 text-sm text-gray-600">Please wait…</div>
      </AuthLayout>
    );
  }

  if (!hasSession) {
    return (
      <AuthLayout title="Link expired" subtitle="This password reset link is invalid or has expired">
        <ErrorBanner message="Please request a new password reset link." />
        <p className="text-sm text-gray-600 text-center">
          <Link className="text-gray-900 underline" to="/forgot-password">Request a new link</Link>
        </p>
      </AuthLayout>
    );
  }

  if (done) {
    return (
      <AuthLayout title="Password updated" subtitle="You can now sign in with your new password">
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          Your password has been updated. Redirecting you to sign in…
        </div>
        <p className="text-sm text-gray-600 text-center">
          <Link className="text-gray-900 underline" to="/login">Go to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Set a new password" subtitle="Choose a strong password for your account">
      <ErrorBanner message={error} />

      <form onSubmit={updatePassword} className="space-y-4">
        <Field label="New password">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
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

        <Field label="Confirm new password">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>
        </Field>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Updating…' : 'Update password'}
        </button>

        <p className="text-sm text-gray-600 text-center">
          <Link className="text-gray-900 underline" to="/login">Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
