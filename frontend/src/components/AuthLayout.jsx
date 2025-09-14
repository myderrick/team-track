import React from 'react';
import { Link } from 'react-router-dom';

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-sky-50 via-white to-sky-100 relative overflow-hidden">
      {/* subtle orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-sky-200 blur-3xl opacity-40" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-indigo-200 blur-3xl opacity-40" />

      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* top brand row */}
        <div className="flex items-center justify-between mb-10">
          <Link to="/" className="flex items-center gap-2">
            {/* drop your logo here */}
            <div className="h-8 w-8 rounded-xl bg-purple-500" />
            <span className="font-semibold tracking-tight">Team-Track</span>
          </Link>
        </div>

        {/* center card */}
        <div className="mx-auto max-w-lg">
          <div className="rounded-3xl border border-black/5 bg-white/80 shadow-xl backdrop-blur supports-[backdrop-filter]:bg-white/60">
            <div className="p-8 sm:p-10">
              <div className="mb-6">
                <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">{title}</h1>
                {subtitle && <p className="mt-2 text-sm text-gray-600">{subtitle}</p>}
              </div>

              {children}
            </div>
          </div>

          {/* footer mini text */}
          <p className="mt-8 text-center text-xs text-gray-500">
            Protected by reCAPTCHA &amp; our{' '}
            <a href="/terms" className="underline">Terms</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
