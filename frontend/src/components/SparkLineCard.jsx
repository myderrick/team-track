// src/components/SparklineCard.jsx
import { LineChart, Line } from 'recharts';

export default function SparklineCard({ user, series }) {
    // series: [{ date, value }, …]
    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
            <h5 className="text-sm font-medium">{user.name}</h5>
            <LineChart width={120} height={50} data={series}>
                <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2} />
            </LineChart>
        </div>
    );
}
