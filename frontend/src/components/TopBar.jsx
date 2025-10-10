// src/components/TopBar.jsx
import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';
import { Menu, Search, Bell, Star, Globe } from 'lucide-react';
import Avatar from './Avatar';
import { useUserProfile } from '../hooks/useUserProfile';
import DarkModeSwitch from './DarkModeSwitch';

export default function TopBar({ onMenuClick }) {
  const navigate = useNavigate();
  const { loading, user, profile } = useUserProfile();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleDropdownToggle = () => setShowDropdown(v => !v);

  async function handleLogout() {
    await supabase.auth.signOut();
    setShowDropdown(false);
    navigate('/login', { replace: true });
  }

  return (
    <header className="toolbar flex items-center justify-between px-6 py-4 sticky top-0 z-50">
      {/* Left: menu (optional) */}
      {/* <button
        onClick={onMenuClick}
        className="p-2 rounded-xl hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        aria-label="Toggle sidebar"
        type="button"
      >
        <Menu className="w-6 h-6" />
      </button> */}

      {/* Center: search + quick actions */}
      <div className="flex-1 flex items-center gap-4 ml-12">
        {/* Search */}
        <div
          className="relative w-64 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
          role="search"
        >
          <Search className="absolute top-2.5 left-2.5 text-[var(--fg-muted)] w-4 h-4" />
          <input
            type="search"
            placeholder="Search dashboard"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-transparent text-[var(--fg)]
                       placeholder:text-[var(--fg-muted)]
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          />
        </div>

        <DarkModeSwitch />

        {/* Quick actions */}
        <button
          className="p-2 rounded-xl hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          type="button"
          aria-label="Language"
        >
          <Globe className="w-5 h-5" />
        </button>

        <button
          className="p-2 rounded-xl hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          type="button"
          aria-label="Favorites"
        >
          <Star className="w-5 h-5" />
        </button>

        <button
          className="relative p-2 rounded-xl hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          type="button"
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          <span
            className="absolute -top-1 -right-1 inline-flex items-center justify-center
                       h-5 min-w-[1.1rem] px-1.5 text-[10px] leading-none font-semibold
                       text-white bg-red-600 rounded-full"
          >
            9
          </span>
        </button>
      </div>

      {/* Right: user */}
      <div className="relative flex items-center gap-3 ml-4">
        <button
          className="flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] rounded-xl px-1"
          onClick={handleDropdownToggle}
          type="button"
          aria-haspopup="menu"
          aria-expanded={showDropdown}
        >
          <Avatar
            src={
              profile?.avatar_url ||
              'https://ui-avatars.com/api/?background=random&bold=true&size=128&name=' +
              encodeURIComponent(profile?.full_name || user?.email || 'U')
            }
            name={profile?.full_name || user?.email || 'User'}
            size={32}
          />
          <div className="text-sm text-left">
            <div className="font-medium text-[var(--fg)]">
              {loading ? '…' : profile.full_name || 'User'}
            </div>
            <div className="text-xs muted">
              {profile.title || 'Signed in'}
            </div>
          </div>
        </button>

        {showDropdown && (
          <div
            className="absolute right-0 mt-12 w-44 rounded-lg shadow-lg z-50 overflow-hidden
                       border border-[var(--border)] bg-[var(--card)] text-[var(--fg)]"
            role="menu"
            aria-label="User menu"
          >
            <button
              onClick={() => {
                setShowDropdown(false);
                const target = profile?.employeeId
                  ? `/staff/${profile.employeeId}`
                  : (profile?.id ? `/profile/${profile.id}` : '/profile');
                navigate(target);
              }}
              className="block w-full text-left px-4 py-2 hover:opacity-90"
              role="menuitem"
              type="button"
            >
              Profile
            </button>
            <button
              onClick={handleLogout}
              className="block w-full text-left px-4 py-2 hover:opacity-90"
              role="menuitem"
              type="button"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
