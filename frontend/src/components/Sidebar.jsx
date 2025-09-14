// src/components/Sidebar.jsx
import { useMemo } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  HomeIcon, Cog8ToothIcon, UserCircleIcon, ClipboardDocumentListIcon, CogIcon,
  ChartBarSquareIcon, ArrowDownLeftIcon, QuestionMarkCircleIcon, ArrowRightEndOnRectangleIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';
import logo from '../assets/teamtrack.png';

const ORG_ITEMS = [
  { label: 'Home', href: '/dashboard', Icon: HomeIcon },
  { label: 'Settings', href: '/settings', Icon: Cog8ToothIcon },
  { label: 'Goals', href: '/goals', Icon: ClipboardDocumentListIcon },
  { label: 'Goals Tracker', href: '/goalskpitracker', Icon: ChartBarSquareIcon },
  { label: 'Performance Reviews', href: '/performancereviews', Icon: ArrowDownLeftIcon },
  { label: 'Directory', href: '/directory', Icon: UserCircleIcon },
  { label: 'Reports', href: '/reports', Icon: ChartBarSquareIcon },
  { label: 'Admin', href: '/admin', Icon: CogIcon },
];

const STAFF_ITEMS = [
  { label: 'My Dashboard', href: '/staff', Icon: HomeIcon },
  { label: 'My Goals', href: '/staff/goals', Icon: ClipboardDocumentListIcon },
  { label: 'Self-Review', href: '/staff/self-review', Icon: PencilSquareIcon },
  { label: 'Feedback', href: '/staff/feedback', Icon: QuestionMarkCircleIcon },
  { label: 'Settings', href: '/staff/settings', Icon: Cog8ToothIcon },
];

export default function Sidebar({ variant }) {
  const { pathname } = useLocation();
  const mode = useMemo(() => {
    if (variant) return variant;
    return pathname.startsWith('/staff') ? 'staff' : 'org';
  }, [variant, pathname]);

  const navItems = mode === 'staff' ? STAFF_ITEMS : ORG_ITEMS;

  return (
    <div className="fixed inset-y-0 left-0 z-[1000] flex group">
      <aside className="
        flex flex-col h-full bg-white dark:bg-gray-800 shadow-lg overflow-hidden
        transition-all duration-200 ease-in-out w-16 group-hover:w-64 mt-1.5
      ">
        <div>
          <div className="flex items-center justify-center h-16">
            <img src={logo} alt="Team Track" className="h-18 w-auto" />
          </div>
          <hr className="border-gray-200 dark:border-gray-700" />
          <nav className="mt-4" aria-label="Sidebar Navigation">
            <ul className="flex flex-col items-start space-y-2">
              {navItems.map(item => (
                <li key={item.href} className="w-full">
                  <NavLink
                    to={item.href}
                    title={item.label}
                    className={({ isActive }) => `
                      group flex items-center w-full px-4 py-2 transition-colors
                      ${isActive
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
                    `}
                  >
                    <item.Icon className="w-6 h-6 flex-shrink-0" />
                    <span className="
                      ml-3 text-sm whitespace-nowrap
                      opacity-0 group-hover:opacity-100
                      transition-opacity duration-200
                    ">
                      {item.label}
                    </span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-auto mb-4 px-2">
          {[
            { label: 'Logout', Icon: ArrowRightEndOnRectangleIcon, onClick: () => {/* wire supabase.auth.signOut() */} },
            { label: 'Help & Support', Icon: QuestionMarkCircleIcon, onClick: () => {/* open support */} },
          ].map(({ label, Icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="group flex items-center w-full px-4 py-2 rounded transition-colors
                         text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            >
              <Icon className="w-6 h-6 flex-shrink-0" />
              <span className="ml-3 text-sm whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                {label}
              </span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
