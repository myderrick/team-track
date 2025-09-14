// frontend/src/components/SparklineCard.jsx
import React from 'react';
import { LineChart, Line } from 'recharts';

export default function SparklineCard({ user = {}, series = [] }) {
  const name = user.full_name || user.name || 'Employee';

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
      <h5 className="text-sm font-medium">{name}</h5>
      {series.length === 0 ? (
        <div className="text-xs text-gray-500 mt-2">No data</div>
      ) : (
        <LineChart width={120} height={50} data={series}>
          <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} strokeWidth={2} />
        </LineChart>
      )}
    </div>
  );
}
