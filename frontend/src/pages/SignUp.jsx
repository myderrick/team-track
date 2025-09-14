import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit =
    form.email.trim() &&
    form.password.length >= 8 &&
    form.password === form.confirm &&
    !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: '' }
      }
    });

    setBusy(false);
    if (error) return setError(error.message);

    // If your project disables email confirmations, session will exist now:
    if (data.session) {
      navigate('/onboarding', { replace: true });
    } else {
      // Most projects require email confirmation:
      alert('Check your email to confirm your account.');
      navigate('/login', { replace: true });
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md bg-white rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-6 text-gray-900">Create your account</h1>

        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="you@company.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Password (min 8 chars)</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Confirm password</label>
            <input
              type="password"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full rounded-xl border border-gray-300 p-3 focus:outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
          >
            {busy ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 underline">Log in</Link>
        </p>
      </div>
    </div>
  );
}
