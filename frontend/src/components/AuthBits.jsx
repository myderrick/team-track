import React from 'react';

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
      {message}
    </div>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-gray-700">{label}</span>
      {children}
    </label>
  );
}

/** simple icon wrappers */
export function MailIcon(props){return(
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" {...props}>
    <path d="M4 6h16v12H4z" stroke="currentColor" strokeWidth="1.5" />
    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.5" />
  </svg>
)}
export function LockIcon(props){return(
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" {...props}>
    <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)}
export function EyeIcon(props){return(
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" {...props}>
    <path d="M1.5 12S5 5.5 12 5.5 22.5 12 22.5 12 19 18.5 12 18.5 1.5 12 1.5 12Z" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)}
export function EyeOffIcon(props){return(
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" {...props}>
    <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M1.5 12S5 5.5 12 5.5c2.2 0 4.1.6 5.7 1.5M22.5 12S19 18.5 12 18.5c-2.2 0-4.1-.6-5.7-1.5" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
)}
