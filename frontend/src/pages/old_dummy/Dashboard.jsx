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
import IndividualLeaderboard from '../components/IndividualLeaderBoard';
import RecentActivity from '../components/RecentActivity';
import AiCoaching from '../components/AiCoaching';
import TopPerformersCard from '../components/TopPerformersCard';

// Filter options
const quarterOptions = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
const deptOptions = ['All Departments', 'Sales', 'IT', 'Operations'];
const locationOptions = ['All Locations', 'Ghana', 'Nigeria', 'Rest of the World'];

// Recent Activity data
 const recentActivities = [
  { id: '1', type: 'goal_completed', actor: 'Maria', target: 'UI Design System', timestamp: '2025-07-06T14:00:00Z' },
   { id: '2', type: 'new_goal_created', actor: 'Alex',  target: 'Code Performance Optimization', timestamp: '2025-07-05T09:30:00Z' },
  { id: '3', type: 'achievement_unlocked', actor: 'Team', target: 'Sprint Champion badge', timestamp: '2025-07-04T16:45:00Z' },
 ];

// KPI data
const kpis = [
    { id: 1, title: 'Revenue Overview', value: '$4.28M', trend: '+12.5%', trendType: 'up', percent: 75 },
    { id: 2, title: 'Customer Acquisition', value: '1,842', trend: '+8.3%', trendType: 'up', percent: 60 },
    { id: 3, title: 'Project Efficiency', value: '92.7%', trend: '+3.2%', trendType: 'up', percent: 93 },
    // { id: 4, title: 'Team Performance', value: '84.5%', trend: '-2.1%', trendType: 'down', percent: 85 }
];

// AI Insights data
const aiInsights = [
    { id: '1', text: 'Your team’s avg. performance is 82%, slightly below the 85% target—consider 1:1 check-ins with underperformers.' },
    { id: '2', text: 'Carol and Hank have incomplete training—schedule them for “Process Mapping” and “CI/CD with Cloud” sessions.' },
    { id: '3', text: 'Customer Satisfaction dropped by 5% last week—review support tickets to identify pain points.' },
  ];

   const topPerformers = [
  { id: 'u128', name: 'Frank Implementation Manager', avatar: 'https://i.pravatar.cc/32', scorePct: 96 },
   { id: 'u125', name: 'Carol Business Analyst',       avatar: 'https://ui-avatars.com/api/?background=0D8ABC&color=fff', scorePct: 92 },
   { id: 'u130', name: 'Hank DevOps Engineer',         avatar: 'https://ui-avatars.com/api/?name=Debbie+Boe?background=0D8ABC&color=fff',  scorePct: 89 },
 ];

export default function Dashboard() {
    const [view, setView] = useState('individual'); // 'team' or 'individual'

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
                    <div className="flex items-center gap-2">
                        <button
                            className={`px-3 py-1 rounded-l-lg ${view === 'team' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setView('team')}
                        >
                            Team View
                        </button>
                        <button
                            className={`px-3 py-1 rounded-r-lg ${view === 'individual' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
                            onClick={() => setView('individual')}
                        >
                            Individual View
                        </button>

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
        ">
                    {view === 'individual' ? (

                        <div className="overflow-auto">
                            <IndividualLeaderboard
                                quarter={quarter}
                                department={department}
                                location={location}
                            />
                        </div>
                    ) : (
                        <>
                            {/* KPI Cards Grid */}
                            <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                                 {/* Staff Top 3 performers */}
                            <TopPerformersCard performers={topPerformers} />
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
                            {/* Recent & Alerts full-bleed and AI Coaching */}
                            <div className="-mx-6 px-6 mb-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                            <RecentActivity activities={recentActivities} className="h-full" />
          <SmartAlerts className="h-full" />
         <AiCoaching insights={aiInsights} className="h-full" />
                                </div>
                            </div>
                            

                        </>
                    )}
                </main>

            </div>
        </div>
    );
}
