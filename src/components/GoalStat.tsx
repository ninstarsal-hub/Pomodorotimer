import { fmtMinutes } from '../lib/storage';

/** Footer: today's focus minutes, with a small progress ring toward the daily goal. */
export function GoalStat({ minutes, goal, onClick }: { minutes: number; goal: number; onClick: () => void }) {
  if (!goal) {
    return (
      <button className="footer-stat" onClick={onClick} title="Focused today">
        <span className="dot" /> {fmtMinutes(minutes)} focused today
      </button>
    );
  }
  const pct = Math.min(1, minutes / goal);
  const r = 7;
  const c = 2 * Math.PI * r;
  return (
    <button className={`footer-stat ${pct >= 1 ? 'is-met' : ''}`} onClick={onClick} title="Daily focus goal">
      <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
        <circle cx="9" cy="9" r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="2" />
        <circle cx="9" cy="9" r={r} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)} transform="rotate(-90 9 9)" />
      </svg>
      {pct >= 1 ? (
        <span>Daily goal met · {fmtMinutes(minutes)}</span>
      ) : (
        <span>
          {fmtMinutes(minutes)} / {fmtMinutes(goal)} today
        </span>
      )}
    </button>
  );
}
