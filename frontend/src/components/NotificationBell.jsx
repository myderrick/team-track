// src/components/NotificationBell.jsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const FN_MISSING_RE = /(schema cache|Could not find the function|does not exist|No function matches)/i;
const isFnMissing = (err) => err?.code === 'PGRST202' || FN_MISSING_RE.test(String(err?.message || ''));

function timeAgo(iso) {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false); // RPC not deployed
  const ref = useRef(null);

  const refreshCount = useCallback(async () => {
    const { data, error } = await supabase.rpc('notification_unread_count');
    if (error) {
      if (isFnMissing(error)) setDisabled(true);
      return;
    }
    setCount(typeof data === 'number' ? data : 0);
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('list_notifications', { p_limit: 20 });
    setLoading(false);
    if (error) {
      if (isFnMissing(error)) setDisabled(true);
      return;
    }
    setItems(data || []);
  }, []);

  // initial + periodic unread count
  useEffect(() => {
    refreshCount();
    const t = setInterval(refreshCount, 60000);
    return () => clearInterval(t);
  }, [refreshCount]);

  // close on outside click
  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  }

  async function openItem(n) {
    if (!n.is_read) {
      setItems((xs) => xs.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setCount((c) => Math.max(0, c - 1));
      await supabase.rpc('mark_notification_read', { p_id: n.id });
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  }

  async function markAll() {
    setItems((xs) => xs.map((x) => ({ ...x, is_read: true })));
    setCount(0);
    await supabase.rpc('mark_all_notifications_read');
  }

  return (
    <div className="relative" ref={ref}>
      <button
        className="relative p-2 rounded-xl hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        type="button"
        aria-label="Notifications"
        onClick={toggle}
      >
        <Bell className="w-5 h-5" />
        {!disabled && count > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center h-5 min-w-[1.1rem] px-1.5 text-[10px] leading-none font-semibold text-white bg-red-600 rounded-full">
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-[26rem] overflow-auto rounded-xl shadow-lg z-50 border border-[var(--border)] bg-[var(--card)] text-[var(--fg)]">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--border)] sticky top-0 bg-[var(--card)]">
            <span className="font-semibold text-sm">Notifications</span>
            {items.some((n) => !n.is_read) && (
              <button onClick={markAll} className="text-xs text-[var(--accent)] hover:underline">Mark all read</button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 px-4 py-6 text-sm muted"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
          ) : disabled ? (
            <div className="px-4 py-6 text-sm muted">Notifications aren’t available yet.</div>
          ) : items.length === 0 ? (
            <div className="px-4 py-6 text-sm muted">You’re all caught up.</div>
          ) : (
            <ul>
              {items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--surface)] ${!n.is_read ? 'bg-[color-mix(in_oklab,var(--accent)_8%,transparent)]' : ''}`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.is_read && <span className="mt-1.5 h-2 w-2 rounded-full bg-[var(--accent)] shrink-0" />}
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{n.title}</div>
                        {n.body && <div className="text-xs muted line-clamp-2">{n.body}</div>}
                        <div className="text-[11px] muted mt-0.5">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
