// src/components/Sidebar.jsx
import { useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import {
  HomeIcon, Cog8ToothIcon, UserCircleIcon, ClipboardDocumentListIcon, CogIcon,
  ChartBarSquareIcon, ArrowDownLeftIcon, QuestionMarkCircleIcon, ArrowRightEndOnRectangleIcon,
  PencilSquareIcon, ChevronDoubleLeftIcon, ChevronDoubleRightIcon, ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { useSidebarPin } from '@/theme/SidebarPinProvider';
import { useDarkMode } from '@/theme/DarkModeProvider';
import { useOrg } from '@/context/OrgContext';

const ORG_ITEMS = [
  { label: 'Home', href: '/dashboard', Icon: HomeIcon },
  { label: 'Settings', href: '/settings', Icon: Cog8ToothIcon },
  { label: 'Goals', href: '/goals', Icon: ClipboardDocumentListIcon },
  { label: 'Goals Tracker', href: '/goalskpitracker', Icon: ChartBarSquareIcon },
  { label: 'Manager Reviews', href: '/manager/reviews', Icon: PencilSquareIcon },
  { label: '1-on-1s', href: '/one-on-ones', Icon: ChatBubbleLeftRightIcon },
  { label: 'Performance Reviews', href: '/performancereviews', Icon: ArrowDownLeftIcon },
  { label: 'Directory', href: '/directory', Icon: UserCircleIcon },
  { label: 'Reports', href: '/reports', Icon: ChartBarSquareIcon },
  { label: 'Admin', href: '/admin', Icon: CogIcon },
];

const STAFF_ITEMS = [
  { label: 'My Dashboard', href: '/staff', Icon: HomeIcon },
  { label: 'My Goals', href: '/staff/goals', Icon: ClipboardDocumentListIcon },
  { label: 'Self-Review', href: '/staff/self-review', Icon: PencilSquareIcon },
  { label: '1-on-1s', href: '/staff/one-on-ones', Icon: ChatBubbleLeftRightIcon },
  { label: 'Settings', href: '/staff/settings', Icon: Cog8ToothIcon },
];

export default function Sidebar({ variant }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  async function handleLogout() {
    try { await supabase.auth.signOut(); } catch (_) {}
    navigate('/login', { replace: true });
  }

  const { pinned, togglePinned } = useSidebarPin();
  const { isDark } = useDarkMode();
  const { myActiveRole } = useOrg();
  const logo = isDark ? '/teamtrack-reversed-white.svg' : '/teamtrack-mono-black.svg';
  const icon = '/teamtrack-icon-cobalt.svg';
  const mode = useMemo(() => (variant ? variant : pathname.startsWith('/staff') ? 'staff' : 'org'), [variant, pathname]);
  const isAdmin = myActiveRole === 'owner' || myActiveRole === 'admin';
  const isPrivileged = isAdmin || myActiveRole === 'manager';
  const navItems = useMemo(() => {
    const base = mode === 'staff' ? STAFF_ITEMS : ORG_ITEMS;
    // Owner/admin-only items; manager+ ("leader") items.
    const ADMIN_ONLY = new Set(['/admin', '/performancereviews']);
    const LEADER_ONLY = new Set(['/reports']);
    return base.filter((item) => {
      if (ADMIN_ONLY.has(item.href)) return isAdmin;
      if (LEADER_ONLY.has(item.href)) return isPrivileged;
      return true;
    });
  }, [mode, isAdmin, isPrivileged]);

  // When pinned: stay expanded. When not: collapsed with hover-expand overlay.
  const widthCls = pinned ? 'w-64' : 'w-16 group-hover:w-64';
  const labelCls = pinned
    ? 'opacity-100'
    : 'opacity-0 group-hover:opacity-100 transition-opacity duration-200';
  const PinIcon = pinned ? ChevronDoubleLeftIcon : ChevronDoubleRightIcon;

  return (
    <div className="fixed inset-y-0 left-0 z-[1000] flex group">
      <aside
        className={`
          flex flex-col h-full overflow-hidden shadow-lg transition-all duration-200 ease-in-out
          ${widthCls} mt-1.5
          bg-[var(--card)] text-[var(--fg)] border-r border-[var(--border)]
        `}
      >
        {/* Header: logo + pin toggle */}
        <div className="relative flex items-center justify-center h-16">
          {pinned ? (
            <img src={logo} alt="Team Track" className="h-11 w-auto" />
          ) : (
            <>
              <img src={icon} alt="Team Track" className="h-10 w-auto group-hover:hidden" />
              <img src={logo} alt="Team Track" className="h-11 w-auto hidden group-hover:block" />
            </>
          )}
          <button
            type="button"
            onClick={togglePinned}
            title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            aria-pressed={pinned}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded
              text-[var(--fg-muted)] hover:text-[var(--accent)] hover:bg-[var(--surface)]
              focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
              transition-opacity
              ${pinned ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
            `}
          >
            <PinIcon className="w-4 h-4" />
          </button>
        </div>
        <hr className="border-[var(--border)]" />

        {/* Nav */}
        <nav className="mt-4" aria-label="Sidebar Navigation">
          <ul className="flex flex-col items-start space-y-1">
            {navItems.map(item => (
              <li key={item.href} className="w-full">
                <NavLink
                  to={item.href}
                  title={item.label}
                  className={({ isActive }) => [
                    'flex items-center w-full px-4 py-2 transition-colors rounded-r-xl',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]',
                    isActive
                      ? 'bg-[color-mix(in oklab,var(--accent) 16%, transparent)] text-[var(--accent)]'
                      : 'hover:bg-[var(--surface)] text-[var(--fg)]'
                  ].join(' ')}
                >
                  <item.Icon className="w-6 h-6 flex-shrink-0" />
                  <span className={`ml-3 text-sm whitespace-nowrap ${labelCls}`}>
                    {item.label}
                  </span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        {/* Footer actions */}
        <div className="mt-auto mb-4 px-2">
          {[
            { label: 'Logout', Icon: ArrowRightEndOnRectangleIcon, onClick: handleLogout },
            { label: 'Help & Support', Icon: QuestionMarkCircleIcon, onClick: () => {/* open support */} },
          ].map(({ label, Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="
                flex items-center w-full px-4 py-2 rounded transition-colors
                text-[var(--fg)] hover:bg-[var(--surface)]
                focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]
              "
              type="button"
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              <span className={`ml-3 text-sm whitespace-nowrap ${labelCls}`}>
                {label}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
