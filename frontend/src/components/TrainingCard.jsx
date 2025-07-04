// src/components/TrainingCard.jsx
export default function TrainingCard({ user, records }) {
    const done = records.filter(r => r.status === 'Completed').length;
    const inProg = records.length - done;

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
            <h5 className="font-semibold">{user.name}’s Training</h5>
            <div className="mt-3 text-sm">
                <p>✅ Completed: {done}</p>
                <p>⏳ In Progress: {inProg}</p>
            </div>
        </div>
    );
}
