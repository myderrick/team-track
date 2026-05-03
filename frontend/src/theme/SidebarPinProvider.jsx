// SidebarPinProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const SidebarPinCtx = createContext(null);

const COLLAPSED_W = '4rem';   // matches w-16
const PINNED_W    = '16rem';  // matches w-64

function getInitial() {
  try {
    const saved = localStorage.getItem('sidebarPinned');
    if (saved !== null) return saved === 'true';
  } catch (_) {}
  return false;
}

function applyVar(pinned) {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty('--sidebar-w', pinned ? PINNED_W : COLLAPSED_W);
}

export function SidebarPinProvider({ children }) {
  const [pinned, setPinned] = useState(getInitial);

  useEffect(() => {
    applyVar(pinned);
    try { localStorage.setItem('sidebarPinned', String(pinned)); } catch (_) {}
  }, [pinned]);

  const value = useMemo(() => ({
    pinned,
    setPinned,
    togglePinned: () => setPinned(p => !p),
  }), [pinned]);

  return <SidebarPinCtx.Provider value={value}>{children}</SidebarPinCtx.Provider>;
}

export function useSidebarPin() {
  const ctx = useContext(SidebarPinCtx);
  if (!ctx) throw new Error('useSidebarPin must be used within <SidebarPinProvider>');
  return ctx;
}
