// src/components/GoalProgressCard.jsx
import { RadialBarChart, RadialBar, Legend } from 'recharts';

export default function GoalProgressCard({ user, progress }) {
    // progress: [{ title, percent }, …]
    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
            <h4 className="font-semibold mb-2">{user.name}’s Goals</h4>
            {progress.map((g, i) => (
                <div key={i} className="flex items-center mb-4">
                    <RadialBarChart width={50} height={50} cx={25} cy={25} innerRadius={15} outerRadius={20} data={[{ name: g.title, value: g.percent }]}>
                        <RadialBar minAngle={15} clockWise dataKey="value" />
                    </RadialBarChart>
                    <div className="ml-3">
                        <p className="text-sm">{g.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{g.percent}% of {g.target}{g.unit}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
