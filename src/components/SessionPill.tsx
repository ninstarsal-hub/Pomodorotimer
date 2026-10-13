import { Flag } from 'lucide-react';

/** "Morning session · 3 blocks · End session" in the footer while a session is live and the timer is stopped. */
export function SessionPill({ title, blocks, onEnd }: { title: string; blocks: number; onEnd: () => void }) {
  return (
    <div className="session-pill">
      <span className="muted small">
        {title} · {blocks} block{blocks === 1 ? '' : 's'}
      </span>
      <button className="btn small" onClick={onEnd} title="Rate this session and reset your block count for a fresh start">
        <Flag size={12} /> End session
      </button>
    </div>
  );
}
