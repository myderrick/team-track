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
import TeamPerformanceChart from '../components/TeamPerformanceChart';
import GoalProgress from '../components/GoalProgress';
import KpiCard from '../components/KpiCard';
import StrategySnapshot from '../components/StrategySnapshot';
import SmartAlerts from '../components/SmartAlerts';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';

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
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Performance overview for May 4, 2025</p>
                    </div>
                    <div className="mt-4 md:mt-0 flex flex-wrap gap-6 items-center">
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
        ">                    {/* KPI Cards Grid */}
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">

                        {kpis.map(k => <KpiCard key={k.id} {...k} />)}
                    </div>

                    {/* Performance & Goal Sections */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 items-stretch">
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
