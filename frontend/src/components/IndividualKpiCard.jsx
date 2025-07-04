// src/components/IndividualKpiCard.jsx
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function IndividualKpiCard({ user, scorePct, trend, trendType }) {
    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">{user.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.team}</p>
                </div>
                <div className="text-2xl font-bold">{scorePct}%</div>
            </div>
            <div className="mt-2 flex items-center text-sm">
                {trendType === 'up'
                    ? <ArrowUp className="w-4 h-4 text-green-500" />
                    : <ArrowDown className="w-4 h-4 text-red-500" />
                }
                <span className={`ml-1 ${trendType === 'up' ? 'text-green-500' : 'text-red-500'}`}>
                    {trend}
                </span>
            </div>
        </div>
    );
}
