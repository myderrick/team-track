import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import { Plus } from 'lucide-react';

// dummy userfs from index.js in src/data/index.js
import { users } from '../data';

// Filter options
const quarterOptions = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
const deptOptions = ['All Departments', 'Sales', 'IT', 'Operations'];
const locationOptions = ['All Locations', 'Ghana', 'Nigeria', 'Rest of the World'];

export default function Directory() {
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('All');
    const [teamFilter, setTeamFilter] = useState('All');


    const roles = ['All', ...new Set(users.map(u => u.role))];
    const teams = ['All', ...new Set(users.map(u => u.team))];

    const filtered = useMemo(() => users.filter(u => {
        if (roleFilter !== 'All' && u.role !== roleFilter) return false;
        if (teamFilter !== 'All' && u.team !== teamFilter) return false;
        return u.name.toLowerCase().includes(search.toLowerCase());
    }), [search, roleFilter, teamFilter]);

    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(() => {
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) return saved === 'true';
        return window.matchMedia('(prefers-color-scheme: dark)').matches;
    });
    const [quarter, setQuarter] = useState(quarterOptions[1]);
    const [department, setDepartment] = useState(deptOptions[0]);
    const [location, setLocation] = useState(locationOptions[0]);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    return (
        <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <TopBar
                    onMenuClick={() => setSidebarOpen(o => !o)}
                    darkMode={darkMode}
                    onToggleDark={() => setDarkMode(m => !m)}
                />
                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 
                                group-hover:ml-64 transition-margin duration-200">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team Directory</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Team Directory as at May 4, 2025</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-wrap gap-6 items-center">
                        <select value={quarter} onChange={e => setQuarter(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {quarterOptions.map(q => <option key={q}>{q}</option>)}
                        </select>
                        <select value={department} onChange={e => setDepartment(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {deptOptions.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <select value={location} onChange={e => setLocation(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {locationOptions.map(l => <option key={l}>{l}</option>)}
                        </select>
                        {/* <button className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                            <Plus className="w-4 h-4" /> Add Widget
                        </button> */}
                    </div>
                </div>

                {/* Main Content */}
                <main className="
                  flex-1
                  ml-16                         /* collapsed sidebar width */
                  mt-4
                  mr-4
                  mb-4
                  transition-margin duration-200
                  group-hover:ml-64              /* expanded sidebar width */
                  px-6
                  overflow-auto
                ">

                    <div className="p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                        {/* <h2 className="text-2xl font-semibold mb-4">Team Directory</h2> */}

                        <div className="flex flex-wrap gap-4 mb-6 ">
                            <input
                                type="search" placeholder="Search name…"
                                value={search} onChange={e => setSearch(e.target.value)}
                                className="px-3 py-2 border rounded-lg flex-1 "
                            />
                            <select
                                value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                                className="px-3 py-2 border rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none"
                            >
                                {roles.map(r => <option key={r}>{r}</option>)}
                            </select>
                            <select
                                value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                                className="px-3 py-2 border rounded-lg border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 focus:outline-none"
                            >
                                {teams.map(t => <option key={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filtered.map(u => (
                                <Link
                                    key={u.id}
                                    to={`/profile/${u.id}`}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition"
                                >
                                    <div className="font-medium">{u.name}</div>
                                    <div className="text-sm text-gray-500">{u.role} — {u.team}</div>
                                    <div className="mt-2 text-xs text-gray-400">Skills: {u.skills.join(', ')}</div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
}
