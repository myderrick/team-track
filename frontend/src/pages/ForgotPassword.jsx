// frontend/src/pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, MailIcon } from '../components/AuthBits';

const isEmail = (v = '') => /\S+@\S+\.\S+/.test(v);

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function sendReset(e) {
    e.preventDefault();
    setError('');

    if (!isEmail(email)) {
      setError('Please enter a valid email.');
      return;
    }

    setBusy(true);
    const redirectTo = `${window.location.origin}/auth/callback?type=recovery`;
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    setBusy(false);

    if (resetErr) {
      setError(resetErr.message);
      return;
    }
    // Always show success — don't reveal whether the email exists.
    setSent(true);
  }

  if (sent) {
    return (
      <AuthLayout title="Check your email" subtitle="We’ve sent you a password reset link">
        <div className="mb-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          If an account exists for <span className="font-medium">{email}</span>, you’ll receive an
          email with a link to reset your password. The link expires shortly, so use it soon.
        </div>
        <p className="text-sm text-gray-600 text-center">
          <Link className="text-gray-900 underline" to="/login">Back to sign in</Link>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot password?" subtitle="Enter your email and we’ll send you a reset link">
      <ErrorBanner message={error} />

      <form onSubmit={sendReset} className="space-y-4">
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

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Sending…' : 'Send reset link'}
        </button>

        <p className="text-sm text-gray-600 text-center">
          Remembered it?{' '}
          <Link className="text-gray-900 underline" to="/login">Back to sign in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
