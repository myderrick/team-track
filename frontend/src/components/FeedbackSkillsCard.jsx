export default function FeedbackSkillsCard({ user = {}, skills = [], feedback = {} }) {
  const name = user.full_name || user.name || 'Employee';
  return (
    <div className="card p-4 transition-colors">
      <h5 className="font-semibold">{name}</h5>

      <div className="flex flex-wrap gap-1 my-2">
        {skills.map((s) => (
          <span
            key={s}
            className="px-2 py-1 text-xs rounded-full border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]"
          >
            {s}
          </span>
        ))}
      </div>

      <p className="text-xs italic muted">“{feedback?.note ?? '—'}”</p>
      <p className="text-[10px] muted mt-1">
        {(feedback?.author ?? '—')}, {feedback?.date ?? '—'}
      </p>
    </div>
  );
}
