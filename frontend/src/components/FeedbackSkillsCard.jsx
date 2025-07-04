// src/components/FeedbackSkillsCard.jsx
export default function FeedbackSkillsCard({ user, skills, feedback }) {
    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
            <h5 className="font-semibold">{user.name}</h5>
            <div className="flex flex-wrap gap-1 my-2">
                {skills.map(s => (
                    <span key={s} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 rounded-full">{s}</span>
                ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 italic">“{feedback.note}”</p>
            <p className="text-[10px] text-gray-500">{feedback.author}, {feedback.date}</p>
        </div>
    );
}
