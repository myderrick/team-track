// DarkModeProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const DarkModeCtx = createContext(null);

function getInitial() {
  try {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
  } catch (_) {}
  // Fallback to system preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return false;
}

function applyHtmlClass(isDark) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', !!isDark);
}

export function DarkModeProvider({ children }) {
  const [isDark, setIsDark] = useState(getInitial);

  // Apply class & persist
  useEffect(() => {
    applyHtmlClass(isDark);
    try { localStorage.setItem('darkMode', String(isDark)); } catch (_) {}
  }, [isDark]);

  // Optional: react to system changes IF the user never chose manually
  useEffect(() => {
    if (!window?.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => {
      const saved = localStorage.getItem('darkMode');
      if (saved === null) {         // only follow system if user hasn't chosen
        setIsDark(e.matches);
      }
    };
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);

  const value = useMemo(() => ({
    isDark,
    setDark: setIsDark,
    toggleDark: () => setIsDark(d => !d),
  }), [isDark]);

  return <DarkModeCtx.Provider value={value}>{children}</DarkModeCtx.Provider>;
}

export function useDarkMode() {
  const ctx = useContext(DarkModeCtx);
  if (!ctx) throw new Error('useDarkMode must be used within <DarkModeProvider>');
  return ctx;
}
