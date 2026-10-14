import { useMemo, useState } from 'react';
import { ChevronDown, Lightbulb, Pencil } from 'lucide-react';
import { useStore } from '../store';
import { blocksOf, factorEmoji, factorLabel, isLive, MIN_RATED, sessionInsights, sessionTitle } from '../lib/studySessions';
import { fmtMinutes } from '../lib/storage';
import { SessionReview } from './SessionReview';

/** Patterns from your rated sessions: best time of day, habits that go with better focus, when focus fades. */
export function InsightsCard() {
  const { studySessions, sessions } = useStore();
  const insights = useMemo(() => sessionInsights(studySessions, sessions), [studySessions, sessions]);
  const rated = studySessions.filter((s) => s.rating).length;
  return (
    <section className="card">
      <div className="eyebrow">What works for you</div>
      {rated < MIN_RATED ? (
        <p className="muted small">
          End and rate {MIN_RATED - rated} more study session{MIN_RATED - rated === 1 ? '' : 's'} to start seeing patterns — like which time of day, habits or break activities go with your best focus. Use{' '}
          <strong>End session</strong> at the bottom of the main screen when you finish a sitting.
        </p>
      ) : insights.length === 0 ? (
        <p className="muted small">No clear patterns yet across your {rated} rated sessions. Keep ticking what you did — differences show up once you’ve tried a few things both ways.</p>
      ) : (
        <>
          <ul className="insights">
            {insights.map((i) => (
              <li key={i.text} className={`insight kind-${i.kind}`}>
                <Lightbulb size={14} />
                <span>
                  <strong>{i.text}</strong>
                  {i.detail && <span className="muted small">{i.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
          <p className="muted small">Based on {rated} rated sessions. These are patterns, not proof — try a change for a week and see if it holds.</p>
        </>
      )}
    </section>
  );
}

/** Recent study sessions: when, how long, what you worked on, your ratings and what you ticked. */
export function SessionHistory() {
  const { studySessions, sessions, tasks } = useStore();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const list = [...studySessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 15);

  return (
    <section className="card">
      <div className="eyebrow">Study sessions</div>
      {list.length === 0 ? (
        <p className="empty-state">Your study sessions will appear here — each one groups the focus blocks from one sitting.</p>
      ) : (
        <ul className="study-sessions">
          {list.map((s) => {
            const blocks = blocksOf(s, sessions);
            const minutes = blocks.reduce((a, b) => a + b.minutes, 0);
            const live = isLive(s);
            const expanded = open === s.id;
            const day = new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            return (
              <li key={s.id} className={expanded ? 'is-open' : ''}>
                <button className="ss-head" onClick={() => setOpen(expanded ? null : s.id)} aria-expanded={expanded}>
                  <span className="grow">
                    <strong>{sessionTitle(s)}</strong>
                    <span className="muted small">
                      {' '}
                      · {day} · {blocks.length} block{blocks.length === 1 ? '' : 's'} · {fmtMinutes(minutes)}
                    </span>
                    {s.factors.length > 0 && (
                      <span className="ss-emojis" aria-label={s.factors.map(factorLabel).join(', ')}>
                        {s.factors.slice(0, 8).map((f) => (
                          <span key={f} title={factorLabel(f)}>
                            {factorEmoji(f)}
                          </span>
                        ))}
                      </span>
                    )}
                  </span>
                  {live ? <span className="tag">In progress</span> : s.rating ? <span className={`ss-rating r${s.rating}`}>{s.rating}/5</span> : <span className="muted small">Not rated</span>}
                  <ChevronDown size={14} />
                </button>
                {expanded && (
                  <div className="ss-body">
                    {blocks.length ? (
                      <ul className="block-list">
                        {blocks.map((b, i) => {
                          const t = tasks.find((x) => x.id === b.taskId);
                          return (
                            <li key={b.id}>
                              <span className="muted small">Block {i + 1}</span>
                              <span className="grow">
                                {[t?.title, b.section].filter(Boolean).join(' · ') || b.intention || 'Focus block'}
                                {b.recall && <span className="muted small recall-note"> — “{b.recall}”</span>}
                              </span>
                              {b.away && <span className={`muted small away-tag ${b.away.kind ?? ''}`}>{b.away.kind === 'study' ? 'other apps' : 'away'} {Math.round(b.away.ms / 60_000)}m</span>}
                              <span className="muted small">{b.rating ? `${b.rating}/5` : '—'}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : (
                      <p className="muted small">No finished blocks in this session.</p>
                    )}
                    {s.factors.length > 0 && <p className="small">{s.factors.map((f) => `${factorEmoji(f)} ${factorLabel(f)}`).join('   ')}</p>}
                    {s.note && <p className="muted small">“{s.note}”</p>}
                    {!live && (
                      <button className="btn small" onClick={() => setEditing(s.id)}>
                        <Pencil size={12} /> {s.rating ? 'Edit rating' : 'Rate this session'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {editing && <SessionReview id={editing} ending={false} onClose={() => setEditing(null)} onDone={() => setEditing(null)} />}
    </section>
  );
}
