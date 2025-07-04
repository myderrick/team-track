// src/components/LagIndicatorCard.jsx
export default function LagIndicatorCard({ user, lagDays }) {
    const status = lagDays > 0 ? 'Behind' : 'On Track';
    const badgeColor = lagDays > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow flex items-center">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColor}`}>
                {status}
            </div>
            {lagDays > 0 && <span className="ml-auto text-sm">+{lagDays}d</span>}
        </div>
    );
}
