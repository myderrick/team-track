// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
    Menu,
    Search,
    Bell,
    Star,
    Globe,
    Plus,
    Sun,
    Moon
} from 'lucide-react';
import Sidebar from '../components/Sidebar';
import TeamPerformanceChart from '../components/TeamPerformanceChart';
import GoalProgress from '../components/GoalProgress';
import KpiCard from '../components/KpiCard';
import StrategySnapshot from '../components/StrategySnapshot';
import SmartAlerts from '../components/SmartAlerts';

// Filter options
const quarterOptions = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
const deptOptions = ['All Departments', 'Sales', 'IT', 'Operations'];
const locationOptions = ['All Locations', 'Ghana', 'Nigeria', 'Rest of the World'];

// KPI data
const kpis = [
    { id: 1, title: 'Revenue Overview', value: '$4.28M', trend: '+12.5%', trendType: 'up', percent: 75 },
    { id: 2, title: 'Customer Acquisition', value: '1,842', trend: '+8.3%', trendType: 'up', percent: 60 },
    { id: 3, title: 'Project Efficiency', value: '92.7%', trend: '+3.2%', trendType: 'up', percent: 93 },
    { id: 4, title: 'Team Performance', value: '84.5%', trend: '-2.1%', trendType: 'down', percent: 85 }
];

export default function Dashboard() {
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
        <div className="flex h-screen overflow-hidden bg-[#d2eaff] text-gray-800 dark:text-gray-100">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col">
                {/* Top Bar */}
                <header className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 shadow sticky top-0 z-10">
                    <button onClick={() => setSidebarOpen(o => !o)} className="p-2 lg:hidden">
                        <Menu className="w-6 h-6 text-gray-700 dark:text-gray-200" />
                    </button>
                    <div className="flex-1 flex items-center gap-4 ml-4">
                        <div className="relative w-64">
                            <Search className="absolute top-2 left-2 text-gray-400" />
                            <input
                                type="search"
                                placeholder="Search dashboard"
                                className="w-full pl-8 pr-4 py-2 border rounded-lg bg-gray-50 dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <button onClick={() => setDarkMode(m => !m)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            {darkMode ? <Sun className="w-5 h-5 text-yellow-400" /> : <Moon className="w-5 h-5 text-gray-600" />}
                        </button>
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Globe className="w-5 h-5" /></button>
                        <button className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><Star className="w-5 h-5" /></button>
                        <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-semibold text-white bg-red-600 rounded-full">9</span>
                        </button>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                        <img src="https://via.placeholder.com/32" alt="User avatar" className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-700" />
                        <div className="text-sm">
                            <div className="font-medium text-gray-900 dark:text-gray-100">John Doe</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Operations Director</div>
                        </div>
                    </div>
                </header>

                {/* Filter Bar */}
                <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Performance overview for May 4, 2025</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center">
                        <select value={quarter} onChange={e => setQuarter(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {quarterOptions.map(q => <option key={q}>{q}</option>)}
                        </select>
                        <select value={department} onChange={e => setDepartment(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {deptOptions.map(d => <option key={d}>{d}</option>)}
                        </select>
                        <select value={location} onChange={e => setLocation(e.target.value)} className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none">
                            {locationOptions.map(l => <option key={l}>{l}</option>)}
                        </select>
                        <button className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
                            <Plus className="w-4 h-4" /> Add Widget
                        </button>
                    </div>
                </div>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-y-auto bg-[#d2eaff] dark:bg-gray-900">
                    {/* KPI Cards Grid */}
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">

                        {kpis.map(k => <KpiCard key={k.id} {...k} />)}
                    </div>

                    {/* Performance & Goal Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6 items-stretch">
                        <div className="h-full">
                            <TeamPerformanceChart />
                        </div>
                        <div className="h-full">
                            <GoalProgress quarter={quarter} />
                        </div>
                    </div>
                    {/* Strategy & Alerts full-bleed */}
                    <div className="-mx-6 px-6 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                            <div className="md:col-span-2">
                                <StrategySnapshot quarter={quarter} className="h-full" />
                            </div>
                            <div>
                                <SmartAlerts className="h-full" />
                            </div>
                        </div>
                    </div>


                </main>

            </div>
        </div>
    );
}
