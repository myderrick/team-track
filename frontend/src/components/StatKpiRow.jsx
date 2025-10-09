// src/components/StatKpiRow.jsx
import React from 'react';
import { TrendingUp, AlertTriangle, Users, Target } from 'lucide-react';

function StatCard({ icon: Icon, label, value, sub, iconColor }) {
    return (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur p-4 shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-700">
                    <Icon className="w-5 h-5" color={iconColor} />
                </div>
                <div className="min-w-0">
                    <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
                    <div className="text-xl font-semibold leading-6">{value}</div>
                    {sub && <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{sub}</div>}
                </div>
            </div>
        </div>
    );
}

export default function StatKpiRow({ metrics }) {
    // metrics = { headcount, goalsOnTrackPct, openAlerts, trendPct }
    const m = metrics || {};
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
            <StatCard icon={Users} iconColor="#2563eb" label="Active employees" value={m.headcount ?? '—'} sub="This org" />
            <StatCard icon={Target} iconColor="#22c55e" label="Goals on track" value={m.goalsOnTrackPct ?? '—'} sub="On/Above trajectory" />
            <StatCard icon={AlertTriangle} iconColor="#f59e42" label="Open alerts" value={m.openAlerts ?? '—'} sub="Needs attention" />
            <StatCard icon={TrendingUp} iconColor="#a21caf" label="Performance trend" value={m.trendPct ?? '—'} sub="vs prior period" />
        </div>
    );
}
