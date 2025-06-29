import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, LineChart, Tooltip, ResponsiveContainer, ReferenceLine,
    PieChart, Line, Legend, XAxis
} from 'recharts';
import { PieChart as MinimalPieChart } from 'react-minimal-pie-chart';
import TopBar from '../components/TopBar';
import Sidebar from '../components/Sidebar';
import { addDays, startOfMonth, startOfQuarter, endOfToday } from 'date-fns';
import { format } from 'date-fns/format';
import { CheckCircle, Clock, XCircle } from 'lucide-react'; // icons for goal status
const statusPct = 85; // Example percentage for goal status
const currentUser = {
    id: 'u123',
    name: 'Alice Manager',
    role: 'manager',
    team: 'Sales'
};

const iconMap = {
    Achieved: <CheckCircle className="w-4 h-4 text-green-500" />,
    'On Course': <Clock className="w-4 h-4 text-yellow-500" />,
    'Not Started': <XCircle className="w-4 h-4 text-red-500" />
};
const allGoals = [
    { id: 'g1', title: 'Monthly Sales Target', target: 500000, unit: '$', type: 'monetary' },
    { id: 'g2', title: 'New Customers', target: 200, unit: 'customers', type: 'count' },
    { id: 'g3', title: 'Customer Satisfaction', target: 90, unit: '%', type: 'qualitative' },
    { id: 'g4', title: 'Team Training Completed', target: 5, unit: 'sessions', type: 'qualitative' },
    { id: 'g5', title: 'Survey Follow-Up Calls', target: 50, unit: 'calls', type: 'qualitative' },
];

const performanceData = [
    { userId: 'u123', goalId: 'g1', value: 425000, date: '2025-06-01' },
    { userId: 'u123', goalId: 'g2', value: 160, date: '2025-06-03' },
    { userId: 'u123', goalId: 'g3', value: 85, date: '2025-06-05' },
    { userId: 'u124', name: 'Bob', team: 'Sales', goalId: 'g1', value: 300000, date: '2025-06-02' },
    { userId: 'u125', name: 'Carol', team: 'Sales', goalId: 'g1', value: 450000, date: '2025-06-04' },
    { userId: 'u124', name: 'Bob', team: 'Sales', goalId: 'g2', value: 120, date: '2025-06-06' },
    { userId: 'u125', name: 'Carol', team: 'Sales', goalId: 'g2', value: 190, date: '2025-06-07' }
];

export default function GoalsKpiTracker() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [darkMode, setDarkMode] = useState(false);

    // Filters
    const departmentOptions = ['All Departments', 'Sales', 'IT', 'Operations'];
    const [department, setDepartment] = useState(departmentOptions[0]);

    const rawNames = performanceData.filter(d => d.team === currentUser.team && d.name).map(d => d.name);
    const uniqueNames = Array.from(new Set(rawNames));
    const teamOptions = ['All', `${currentUser.team} Team`, ...uniqueNames];
    const [teamFilter, setTeamFilter] = useState(teamOptions[0]);

    const goalTypeOptions = ['All Goals', ...allGoals.map(g => g.title)];
    const [goalType, setGoalType] = useState(goalTypeOptions[0]);

    const datePresets = [
        { label: 'Month to date', value: 'MTD' },
        { label: 'Quarter to date', value: 'QTD' },
        { label: 'Last 7 days', value: '7D' },
        { label: 'Last 30 days', value: '30D' },
        { label: 'Last 90 days', value: '90D' },
        { label: 'Custom range', value: 'CUSTOM' },
    ];
    const [timeline, setTimeline] = useState('30D');
    // only used when timeline==='CUSTOM'
    const [customRange, setCustomRange] = useState({
        start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
        end: format(endOfToday(), 'yyyy-MM-dd')
    });


    const [view, setView] = useState('individual');
    const [expandedUser, setExpandedUser] = useState(null);

    // Persist dark mode
    useEffect(() => {
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) setDarkMode(saved === 'true');
        else if (window.matchMedia)
            setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
    }, []);
    useEffect(() => {
        document.documentElement.classList.toggle('dark', darkMode);
        localStorage.setItem('darkMode', darkMode);
    }, [darkMode]);

    // Group goals
    const goalsByType = useMemo(() =>
        allGoals.reduce((acc, g) => {
            (acc[g.type] = acc[g.type] || []).push(g);
            return acc;
        }, {}), []
    );

    // Filter data
    const filteredData = useMemo(() =>
        performanceData.filter(item => {
            if (department !== 'All Departments' && item.team !== department) return false;
            if (teamFilter === `${currentUser.team} Team`) {
                if (item.team !== currentUser.team) return false;
            } else if (teamFilter !== 'All') {
                if (item.name !== teamFilter) return false;
            }
            if (goalType !== 'All Goals') {
                const g = allGoals.find(x => x.id === item.goalId);
                if (g?.title !== goalType) return false;
            }
            // 1) parse item date
            const d = new Date(item.date);

            // 2) figure out start/end
            let rangeStart, rangeEnd = endOfToday();
            switch (timeline) {
                case 'MTD': rangeStart = startOfMonth(new Date()); break;
                case 'QTD': rangeStart = startOfQuarter(new Date()); break;
                case '7D': rangeStart = addDays(new Date(), -7); break;
                case '30D': rangeStart = addDays(new Date(), -30); break;
                case '90D': rangeStart = addDays(new Date(), -90); break;
                case 'CUSTOM':
                    rangeStart = new Date(customRange.start);
                    rangeEnd = new Date(customRange.end);
                    break;
                default:
                    rangeStart = addDays(new Date(), -30);
            }
            // 3) drop if outside
            if (d < rangeStart || d > rangeEnd) return false;

            // 4) finally the view filter
            if (view === 'individual') return item.userId === currentUser.id;
            if (view === 'team') return item.team === currentUser.team;
            if (view === 'department') return item.team === currentUser.team;

            return true;
        }),
        [department, teamFilter, goalType, view, timeline, customRange]
    );
    // KPI card values
    const totalKPIs = filteredData.length;
    const onTrack = filteredData.filter(d => d.value / allGoals.find(g => g.id === d.goalId).target >= 1).length;
    const atRisk = filteredData.filter(d => {
        const pct = d.value / allGoals.find(g => g.id === d.goalId).target;
        return pct >= 0.75 && pct < 1;
    }).length;
    const offTrack = filteredData.filter(d => d.value / allGoals.find(g => g.id === d.goalId).target < 0.75).length;

    // Helper: get an employee’s avg completion %
    const getCompletionPct = name => {
        const entries = performanceData.filter(d => d.name === name);
        if (!entries.length) return 0;
        // sum each goal’s percent (value / target), then average
        const totalPct = entries.reduce((sum, d) => {
            const goal = allGoals.find(g => g.id === d.goalId);
            return sum + (d.value / goal.target);
        }, 0);
        return Math.round((totalPct / entries.length) * 100);
    };

    // after your getCompletionPct() helper…
    const allCompletion = uniqueNames.map(name => ({
        name,
        pct: getCompletionPct(name)
    }));
    // sort descending
    allCompletion.sort((a, b) => b.pct - a.pct);

    const topPerformers = allCompletion.slice(0, 3);
    const bottomPerformers = allCompletion.slice(-3).reverse();


    return (
        <div className="flex flex-col h-screen dark:bg-gray-900 text-gray-800 dark:text-gray-200">
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <TopBar
                onMenuClick={() => setSidebarOpen(o => !o)}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(m => !m)}
            />
            {/* filter bar */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow
                ml-16                          /* collapsed sidebar width */
                group-hover:ml-64              /* expanded sidebar width */">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goals and KPIs</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Performance overview for May 4, 2025</p>
                </div>
                <div className="flex items-center space-x-4">
                    <select
                        value={department}
                        onChange={e => setDepartment(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {departmentOptions.map(dep => (
                            <option key={dep} value={dep}>{dep}</option>
                        ))}
                    </select>
                    <select
                        value={teamFilter}
                        onChange={e => setTeamFilter(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {teamOptions.map(team => (
                            <option key={team} value={team}>{team}</option>
                        ))}
                    </select>
                    <select
                        value={goalType}
                        onChange={e => setGoalType(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {goalTypeOptions.map(type => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>
                    <select
                        value={timeline}
                        onChange={e => setTimeline(e.target.value)}
                        className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-700
                        dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                        {datePresets.map(preset => (
                            <option key={preset.value} value={preset.value}>{preset.label}</option>
                        ))}
                    </select>
                    {timeline === 'CUSTOM' && (
                        <div className="flex space-x-2">
                            <input
                                type="date"
                                value={customRange.start}
                                onChange={e => setCustomRange({ ...customRange, start: e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-700
                                dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <input
                                type="date"
                                value={customRange.end}
                                onChange={e => setCustomRange({ ...customRange, end: e.target.value })}
                                className="px-3 py-2 border border-gray-200 rounded-lg bg-white dark:bg-gray-700
                                dark:border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    )}
                    {/* <button
                        onClick={() => setView(v => v === 'individual' ? 'team' : v === 'team' ? 'department' : 'individual')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
                    >
                        {view === 'individual' ? 'View Team' : view === 'team' ? 'View Department' : 'View Individual'}
                    </button> */}


                </div>

            </div>
            <main className="
          flex-1
          ml-20                          /* collapsed sidebar width */
          mt-4
          mr-4
          mb-4
          transition-margin duration-200
          group-hover:ml-64              /* expanded sidebar width */
          px-0
          overflow-auto
        ">                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">                    {[
                    { title: 'Total KPIs', value: totalKPIs, sparkData: [5, 7, 8, 6, 7, 9, totalKPIs], color: '#6c63ff' },
                    { title: 'On Track', value: onTrack, sparkData: [2, 3, 4, 3, 5, 5, onTrack], color: '#10b981' },
                    { title: 'At Risk', value: atRisk, sparkData: [1, 2, 2, 3, 2, 4, atRisk], color: '#f59e0b' },
                    { title: 'Off Track', value: offTrack, sparkData: [0, 1, 1, 1, 2, 0, offTrack], color: '#ef4444' },
                ].map(c => (
                    <div key={c.title} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 flex flex-col">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-500 dark:text-gray-400">{c.title}</span>
                            {c.icon && <span>{c.icon}</span>}
                        </div>

                        {/* Big number */}
                        <div className="text-2xl font-bold mb-2">{c.value}</div>

                        {/* Sparkline */}
                        <div className="w-full h-6">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={c.sparkData.map((v, i) => ({ day: i, value: v }))}>
                                    <Line
                                        type="monotone"
                                        dataKey="value"
                                        stroke={c.color}
                                        strokeWidth={2}
                                        dot={false}
                                    />
                                    <XAxis dataKey="day" hide />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                ))}
                </div>

                {/* Goals in one row */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                    {/* Monetary - Bar */}

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm shadow-gray-300/50 p-6 flex flex-col h-full">
                        <h3 className="text-lg font-medium mb-4">Monetary Goals</h3>
                        {goalsByType.monetary.map(goal => {
                            const entries = filteredData.filter(d => d.goalId === goal.id);
                            const total = entries.reduce((s, d) => s + d.value, 0);
                            const avg = entries.length ? total / entries.length : 0;
                            return (
                                <div key={goal.id} className="flex-1 mb-6">
                                    <h4 className="font-semibold mb-2">{goal.title}</h4>
                                    <ResponsiveContainer width="100%" height={100}>
                                        <BarChart data={[{ value: avg }]}>
                                            <Bar dataKey="value" fill="#6c63ff" />
                                            <ReferenceLine y={goal.target} stroke="#8884d8" strokeDasharray="3 3" />
                                            <Tooltip formatter={v => `${v.toLocaleString()}${goal.unit}`} />
                                            <XAxis hide />
                                        </BarChart>
                                    </ResponsiveContainer>
                                    <div className="mt-2 text-sm">
                                        <div>Current: <strong>${avg.toLocaleString()}</strong></div>
                                        <div>Target:  <strong>${goal.target.toLocaleString()}</strong></div>
                                    </div>
                                </div>
                            );
                        })}
                        {statusPct < 100 && (
                            <button className="mt-2 text-sm text-blue-600 hover:underline">
                                Update Goal
                            </button>
                        )}
                    </div>

                    {/* Monetary - Donut */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm shadow-gray-300/50 p-6 flex flex-col items-center h-full">
                        <h3 className="text-lg font-medium mb-4">Monthly Sales Target</h3>
                        <MinimalPieChart
                            data={[{ value: 85, color: '#6c63ff' }]}
                            totalValue={100}
                            lineWidth={15}
                            label={() => `85%`}
                            labelStyle={{ fontSize: '20px', fill: '#6c63ff', fontWeight: 600 }}
                            background="lightgray"
                            animate
                            style={{ height: '150px', width: '150px' }}
                        />
                        <div className="mt-4 text-sm text-center">
                            <div>Current: <strong>$425,000</strong></div>
                            <div>Target:  <strong>$500,000</strong></div>
                        </div>
                    </div>

                    {/* Qualitative */}
                    {/* Qualitative Goals */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-6 flex flex-col h-full">
                        <h3 className="text-lg font-semibold mb-4">Qualitative Goals</h3>
                        <ul className="grid gap-2 divide-y divide-gray-200 dark:divide-gray-700">
                            {goalsByType.qualitative.map(goal => {
                                // sum up all the performanceData for this goal
                                const total = filteredData
                                    .filter(d => d.goalId === goal.id)
                                    .reduce((sum, d) => sum + d.value, 0);

                                // decide status
                                let status, bgClass;
                                if (total === 0) {
                                    status = 'Not Started';
                                    bgClass = 'bg-red-50 text-red-800';
                                } else if (total >= goal.target) {
                                    status = 'Completed';
                                    bgClass = 'bg-green-50 text-green-800';
                                } else {
                                    status = 'In Progress';
                                    bgClass = 'bg-yellow-50 text-yellow-800';
                                }

                                return (
                                    <li key={goal.id} className="py-2 flex justify-between items-center">
                                        <span className="text-gray-700 dark:text-gray-200">{goal.title}</span>
                                        <span
                                            className={`${bgClass} text-sm font-medium px-3 py-1 rounded-full`}
                                        >
                                            {status}
                                        </span>
                                    </li>
                                )
                            })}
                        </ul>
                    </div>


                </div>
                {/* Top & Bottom Highlight */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Top 3 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                        <h4 className="text-md font-semibold mb-2">🏅 Top Performers</h4>
                        <ul className="space-y-1">
                            {topPerformers.map(p => (
                                <li key={p.name} className="flex justify-between">
                                    <span>{p.name}</span>
                                    <span className="font-medium">{p.pct}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* Bottom 3 */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                        <h4 className="text-md font-semibold mb-2">⚠️ Needs Improvement</h4>
                        <ul className="space-y-1">
                            {bottomPerformers.map(p => (
                                <li key={p.name} className="flex justify-between">
                                    <span>{p.name}</span>
                                    <span className="font-medium">{p.pct}%</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                {/* Employees table + filters */}
                {/* Mobile: accordion view */}
                <div className="md:hidden space-y-4 mb-6">
                    {uniqueNames.map(name => {
                        const pct = getCompletionPct(name);
                        return (
                            <div key={name} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
                                <button
                                    className="w-full text-left px-4 py-3 flex justify-between items-center"
                                    onClick={() => setExpandedUser(expandedUser === name ? null : name)}
                                >
                                    <span className="font-medium">{name}</span>
                                    <span>{pct}% ▸</span>
                                </button>
                                {expandedUser === name && (
                                    <div className="px-4 pb-4">
                                        {/* reuse your expanded‐row content here */}
                                        <ul className="space-y-1">
                                            {allGoals.map(goal => {
                                                const e = performanceData.find(d => d.name === name && d.goalId === goal.id);
                                                if (!e) return null;
                                                const statusPct = Math.round(e.value / goal.target * 100);
                                                let status = 'Not Started', bg = 'text-red-600';
                                                if (statusPct >= 100) { status = 'Achieved'; bg = 'text-green-600' }
                                                else if (statusPct >= 75) { status = 'On Course'; bg = 'text-yellow-600' }
                                                return (
                                                    <li key={goal.id} className="flex justify-between text-sm">
                                                        <span>{goal.title}</span>
                                                        <span className={bg}>{status}</span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
                {/* Desktop: full table */}
                <div className="hidden md:block">
                    <section>
                        <div className="flex flex-wrap items-center gap-4 mb-4">
                            <h3 className="text-lg font-medium flex-1">Employees Performance</h3>
                            <select className="px-3 py-1 border rounded-lg bg-white dark:bg-gray-700">
                                <option>Select department</option>
                            </select>
                            <select className="px-3 py-1 border rounded-lg bg-white dark:bg-gray-700">
                                <option>Select score range</option>
                            </select>
                            <input
                                type="text"
                                placeholder="Search employee"
                                className="px-3 py-1 border rounded-lg bg-white dark:bg-gray-700 flex-1 max-w-xs"
                            />
                        </div>
                        <table className="min-w-full bg-white dark:bg-gray-800 rounded-lg overflow-hidden divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    {['# ID', 'Name', 'Department', 'Score', 'Strength', 'Completion', 'Last Review'].map(col => (
                                        <th key={col} className="px-4 py-2 text-left text-sm font-medium text-gray-600 dark:text-gray-300">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {uniqueNames.map((name, i) => (
                                    <React.Fragment key={name}>
                                        <tr
                                            className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                                            onClick={() => setExpandedUser(expandedUser === name ? null : name)}
                                        >
                                            <td className="px-4 py-3 text-sm">#E1{i + 1}</td>
                                            <td className="px-4 py-3 text-sm">{name}</td>
                                            <td className="px-4 py-3 text-sm">Sales</td>
                                            <td className="px-4 py-3 text-sm">4.{i + 2}</td>
                                            <td className="px-4 py-3 text-sm">Innovation, Problem-Solving</td>
                                            <td className="px-4 py-3">
                                                {/* container */}
                                                <div className="flex items-center">
                                                    {/* track */}
                                                    <div className="relative flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                        {/* fill */}
                                                        <div
                                                            className="absolute top-0 left-0 h-2 bg-green-500"
                                                            style={{ width: `${getCompletionPct(name)}%` }}
                                                        />
                                                    </div>
                                                    {/* label */}
                                                    <span className="ml-2 text-sm font-medium">
                                                        {getCompletionPct(name)}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm">Dec 20, 2024</td>
                                        </tr>

                                        {expandedUser === name && (
                                            <tr className="bg-gray-50 dark:bg-gray-700">
                                                <td colSpan={7} className="px-4 py-4">
                                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow">
                                                        <h4 className="font-medium mb-2">{name}’s Goals</h4>
                                                        <ul className="list-disc list-inside space-y-1 text-sm">
                                                            {allGoals.map(goal => {
                                                                const e = performanceData.find(d => d.name === name && d.goalId === goal.id);
                                                                if (!e) return null;
                                                                const pct = e.value / goal.target;
                                                                let st = 'Not Started', clr = 'text-red-600';
                                                                if (pct >= 1) { st = 'Achieved'; clr = 'text-green-600'; }
                                                                else if (pct >= 0.75) { st = 'On Course'; clr = 'text-yellow-600'; }
                                                                return (
                                                                    <li key={goal.id}>
                                                                        <span className="font-medium">{goal.title}:</span>
                                                                        <span className={`${clr} ml-2`}>{st}</span>
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </section>
                </div>
            </main>
        </div>
    );
}
