// DarkModeSwitch.jsx
import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useDarkMode } from '@/theme/DarkModeProvider';

export default function DarkModeSwitch({ className = '' }) {
  const { isDark, toggleDark } = useDarkMode();

return (
    <button
        type="button"
        onClick={toggleDark}
        aria-pressed={isDark}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 transition border shadow-sm
            bg-gray-100 hover:bg-gray-200 text-gray-900 border-gray-200
            dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-100 dark:border-gray-700
            focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500 dark:focus-visible:ring-offset-gray-900
            ${className}`}
    >
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
        <span className="text-sm">{isDark ? 'Dark' : 'Light'}</span>
    </button>
);
}
