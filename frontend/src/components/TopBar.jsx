import React, { useEffect, useState } from 'react';
import { useNavigate } from "react-router-dom";
import { supabase } from '../lib/supabaseClient';
import { Menu, Search, Bell, Star, Globe, Sun, Moon } from 'lucide-react';
import Avatar from './Avatar';
import { useUserProfile } from '../hooks/useUserProfile';

export default function TopBar({ onMenuClick, darkMode, onToggleDark }) {
  const navigate = useNavigate();
  const { loading, user, profile } = useUserProfile();
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleDropdownToggle = () => setShowDropdown(v => !v);

  async function handleLogout() {
    await supabase.auth.signOut();
    setShowDropdown(false);
    navigate('/login', { replace: true });
  }

// console.log('TopBar profile id:', profile?.id);

return (
    <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow sticky top-0 z-50">
        {/* left: menu (optional) */}
        {/* <button onClick={onMenuClick} className="p-2 rounded-md text-gray-600 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
            <Menu className="w-6 h-6" />
        </button> */}

        {/* center: search + quick actions */}
        <div className="flex-1 flex items-center gap-4 ml-12">
            <div className="relative w-64 border rounded-xl border-gray-200 dark:border-gray-600">
                <Search className="absolute top-2 left-2 text-gray-400" />
                <input
                    type="search"
                    placeholder="Search dashboard"
                    className="w-full pl-8 pr-4 py-2 border-gray-50 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <button onClick={onToggleDark} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
            </button>

            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Globe className="w-5 h-5" /></button>
            <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Star className="w-5 h-5" /></button>
            <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-full">
                    9
                </span>
            </button>
        </div>

        {/* right: user */}
        <div className="relative flex items-center gap-3 ml-4">
            <button className="flex items-center gap-2 focus:outline-none" onClick={handleDropdownToggle}>
                 <Avatar
   src={profile?.avatar_url || 'https://ui-avatars.com/api/?background=random&bold=true&size=128&name=' + encodeURIComponent(profile?.full_name || user?.email || 'U')}
   name={profile?.full_name || user?.email || 'User'}
   size={32}
   className=""
/>
                <div className="text-sm text-left">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                        {loading ? '…' : profile.full_name || 'User'}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                        {profile.title || 'Signed in'}
                    </div>
                </div>
            </button>

            {showDropdown && (
                <div className="absolute right-0 mt-12 w-44 bg-white dark:bg-gray-700 rounded-lg shadow-lg z-50 overflow-hidden">
                    <button
                        onClick={() => {
                            setShowDropdown(false);
 const target = profile?.employeeId
         ? `/staff/${profile.employeeId}`
         : (profile?.id ? `/profile/${profile.id}` : '/profile');
                            navigate(target);
                        }}
                        className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                        Profile
                    </button>
                    <button
                        onClick={handleLogout}
                        className="block w-full text-left px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600"
                    >
                        Logout
                    </button>
                </div>
            )}
        </div>
    </header>
);
}
