// src/components/Sidebar.jsx
import { useState } from 'react'
import {
    HomeIcon,
    Cog8ToothIcon,
    UserCircleIcon,
    ClipboardDocumentListIcon,
    CogIcon,
    ChartBarSquareIcon,
    ArrowDownLeftIcon,
    QuestionMarkCircleIcon,
    ArrowRightEndOnRectangleIcon,
} from '@heroicons/react/24/outline'
import { NavLink } from 'react-router-dom';

const navItems = [
    { label: 'Home', href: '/dashboard', Icon: HomeIcon },
    { label: 'Settings', href: '/settings', Icon: Cog8ToothIcon },
    // { label: 'Profile', href: '/profile', Icon: UserCircleIcon },
    { label: 'Goals', href: '/goals', Icon: ClipboardDocumentListIcon },
    { label: 'Goals Tracker', href: '/goalskpitracker', Icon: ChartBarSquareIcon },
    { label: 'Performance Reviews', href: '/performancereviews', Icon: ArrowDownLeftIcon },
    { label: 'Directory', href: '/directory', Icon: UserCircleIcon },
    { label: 'Reports', href: '/reports', Icon: ChartBarSquareIcon },
    { label: 'Admin', href: '/admin', Icon: CogIcon }, // Admin section

]

export default function Sidebar() {
    return (
        <div className="fixed inset-y-0 left-0 z-1000 flex group">
            <aside className="
  flex flex-col h-full
  bg-white dark:bg-gray-800
  shadow-lg overflow-hidden
  transition-all duration-200 ease-in-out
  w-16 group-hover:w-64
  mt-1.5
">
                {/* Logo + nav */}
                <div>
                    <div className="flex items-center justify-center h-16">
                        <img src="/logo.svg" alt="YourApp" className="h-8 w-auto" />
                    </div>
                    <hr className="border-gray-200 dark:border-gray-700" />
                    <nav className="mt-4" aria-label="Sidebar Navigation">
                        <ul className="flex flex-col items-start space-y-2">
                            {navItems.map(item => (
                                <li key={item.href} className="w-full">
                                    <NavLink to={item.href} title={item.label}
                                        className={({ isActive }) => `
                group flex items-center w-full px-4 py-2 transition-colors
                ${isActive
                                                ? 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300'
                                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}
              `}
                                    >
                                        <item.Icon className="w-6 h-6 flex-shrink-0" />
                                        {/* only show on expand */}
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

                {/* spacer pushes this block to the bottom */}
                <div className="mt-auto mb-4 px-2">
                    {[
                        { label: 'Logout', Icon: ArrowRightEndOnRectangleIcon, onClick: () => {/* logout */ } },
                        { label: 'Help & Support', Icon: QuestionMarkCircleIcon, onClick: () => {/* help */ } },
                    ].map(({ label, Icon, onClick }) => (
                        <button
                            key={label}
                            onClick={onClick}
                            className="
                group flex items-center w-full
                px-4 py-2 rounded transition-colors
                text-gray-700 dark:text-gray-300
                hover:bg-gray-200 dark:hover:bg-gray-700
              "
                        >
                            <Icon className="w-6 h-6 flex-shrink-0" />
                            <span className="
                ml-3 text-sm whitespace-nowrap
                opacity-0 group-hover:opacity-100
                transition-opacity duration-200
              ">
                                {label}
                            </span>
                        </button>
                    ))}
                </div>
            </aside>

        </div>
    )
}
