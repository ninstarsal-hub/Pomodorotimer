import { useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { LATEST_RELEASE, RELEASES } from '../lib/changelog';
import { usePersistentState } from '../lib/storage';
import { useStore } from '../store';

/** Once per release: a small card with what's new. Never shown to brand-new people (they get the welcome instead). */
// Stays mounted while hidden, so "seen" is saved even when closing it opens a panel.
export function WhatsNewCard({ hidden, onSeeAll }: { hidden: boolean; onSeeAll: () => void }) {
  const { decks, sessions, tasks } = useStore();
  const [seen, setSeen] = usePersistentState('seenRelease', '');
  const isNew = localStorage.getItem('stillpoint:welcomed') !== 'true' && !decks.length && !sessions.length && !tasks.length;

  useEffect(() => {
    if (isNew && seen !== LATEST_RELEASE) setSeen(LATEST_RELEASE);
  }, [isNew, seen, setSeen]);

  const unseen = RELEASES.filter((r) => r.id > seen);
  if (hidden || isNew || !unseen.length) return null;
  const [latest, ...older] = unseen;
  const close = () => setSeen(LATEST_RELEASE);

  return (
    <aside className="whats-new" role="status" aria-label="What’s new in Stillpoint">
      <div className="row between">
        <div className="eyebrow">
          <Sparkles size={12} /> What’s new
        </div>
        <button className="icon-btn small" onClick={close} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <h4>{latest.title}</h4>
      <ul>
        {latest.items.map((it) => (
          <li key={it.title}>
            <strong>{it.title}</strong> <span className="muted">— {it.body}</span>
          </li>
        ))}
      </ul>
      {older.length > 0 && <p className="small muted">Also new: {older.map((r) => r.title).join(' · ')}</p>}
      <div className="row">
        <button className="btn small primary" onClick={close}>
          Got it
        </button>
        <button
          className="btn small ghost"
          onClick={() => {
            close();
            onSeeAll();
          }}
        >
          See all updates
        </button>
      </div>
    </aside>
  );
}

/** Settings: every release, newest first. */
export function WhatsNewSection() {
  const fmt = (id: string) => {
    const [y, m, d] = id.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };
  return (
    <section className="card" id="whats-new">
      <div className="eyebrow">What’s new</div>
      {RELEASES.map((r, i) => (
        <details key={r.id} className="release" open={i === 0}>
          <summary>
            <strong>{r.title}</strong> <span className="muted small">· {fmt(r.id)}</span>
          </summary>
          <ul className="small">
            {r.items.map((it) => (
              <li key={it.title}>
                <strong>{it.title}</strong> <span className="muted">— {it.body}</span>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </section>
  );
}
