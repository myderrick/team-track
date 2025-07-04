// src/pages/IndividualLeaderboard.jsx
import React, { useMemo } from 'react';
import { Disclosure } from '@headlessui/react';
import {
    users as allUsers,
    performanceData,
    allGoals,
    feedbackNotes,
    trainingRecords,
} from '../data';
import IndividualKpiCard from '../components/IndividualKpiCard';
import GoalProgressCard from '../components/GoalProgressCard';
import LagIndicatorCard from '../components/LagIndicatorCard';
import SparklineCard from '../components/SparkLineCard';
import FeedbackSkillsCard from '../components/FeedbackSkillsCard';
import TrainingCard from '../components/TrainingCard';

export default function IndividualLeaderboard({ quarter, department, location }) {
    // 1. Filter your staff
    const users = useMemo(() =>
        allUsers.filter(u =>
            (department === 'All Departments' || u.team === department) &&
            (location === 'All Locations' || true) &&
            // only show actual staff, not leads/managers
            !['support_lead', 'implementation_manager'].includes(u.role)
        ), [department, location]
    );

    // 2. Same perf‐compute as before
    function computeUserPerf(userId) {
        const userPerf = performanceData.filter(p => p.userId === userId);
        const now = new Date();

        // overall %
        const goalPercents = userPerf.map(p => {
            const goal = allGoals.find(g => g.id === p.goalId);
            return Math.min(100, Math.round((p.value / goal.target) * 100));
        });
        const scorePct = goalPercents.length
            ? Math.round(goalPercents.reduce((a, b) => a + b, 0) / goalPercents.length)
            : 0;

        // trend
        let trend = '0%', trendType = 'up';
        if (goalPercents.length >= 2) {
            const diff = goalPercents.at(-1) - goalPercents.at(-2);
            trendType = diff >= 0 ? 'up' : 'down';
            trend = `${diff >= 0 ? '+' : ''}${diff}%`;
        }

        // lag days
        const lagDays = userPerf.reduce((max, p) => {
            const goal = allGoals.find(g => g.id === p.goalId);
            if (p.value < goal.target) {
                const days = Math.floor((now - new Date(p.date)) / (1000 * 60 * 60 * 24));
                return Math.max(max, days);
            }
            return max;
        }, 0);

        // sparkline series
        const series = userPerf
            .map(p => ({
                date: p.date,
                value: (allGoals.find(g => g.id === p.goalId).type === 'monetary')
                    ? p.value / 10000
                    : p.value
            }))
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .slice(-7);

        // top‐3 goals
        const goals = allGoals
            .map(g => {
                const entry = userPerf.find(p => p.goalId === g.id);
                const percent = entry
                    ? Math.min(100, Math.round((entry.value / g.target) * 100))
                    : 0;
                return { title: g.title, percent, target: g.target, unit: g.unit };
            })
            .filter(g => g.percent > 0)
            .slice(0, 3);

        // latest feedback
        const feedback = feedbackNotes
            .filter(f => f.userId === userId)
            .sort((a, b) => new Date(b.date) - new Date(a.date))[0]
            || { note: '—', author: '—', date: '—' };

        // training
        const training = trainingRecords.filter(r => r.userId === userId);

        return { overall: { scorePct, trend, trendType }, lagDays, series, goals, feedback, training };
    }

    return (

        <div className="space-y-4 p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Individual Leaderboard
            </h2>
            {/* <p className="text-sm text-gray-500 dark:text-gray-400">
                Performance overview for {quarter} {department !== 'All Departments' ? `in ${department}` : ''}.
            </p> */}
            {users.map(u => {
                const perf = computeUserPerf(u.id);
                return (
                    <Disclosure key={u.id} as="div" className="border border-gray-200 rounded-xl overflow-hidden shadow-sm dark:bg-gray-800 dark:border-gray-700">
                        {({ open }) => (
                            <>
                                <Disclosure.Button className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                                    <div>
                                        <span className="font-medium">{u.name}</span>
                                        <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{u.team}</span>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-lg font-bold">{perf.overall.scorePct}%</span>
                                        <span className={`text-sm ${perf.overall.trendType === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                                            {perf.overall.trend}
                                        </span>
                                        <span className="text-xl">{open ? '▾' : '▸'}</span>
                                    </div>
                                </Disclosure.Button>

                                <Disclosure.Panel className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-gray-800">
                                    <IndividualKpiCard user={u} {...perf.overall} />
                                    <GoalProgressCard user={u} progress={perf.goals} />
                                    <LagIndicatorCard user={u} lagDays={perf.lagDays} />
                                    <SparklineCard user={u} series={perf.series} />
                                    <FeedbackSkillsCard user={u} skills={u.skills} feedback={perf.feedback} />
                                    <TrainingCard user={u} records={perf.training} />
                                </Disclosure.Panel>
                            </>
                        )}
                    </Disclosure>
                );
            })}
        </div>
    );
}
