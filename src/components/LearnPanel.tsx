import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BREAK_IDEAS, LONG_AFTER_MIN, LONG_BLOCK_MIN, MOVE_AFTER_MIN, STRATEGIES } from '../lib/content';

export function LearnPanel() {
  const [open, setOpen] = useState<string | null>(STRATEGIES[0].id);
  return (
    <div className="stack">
      <p className="muted small">
        The techniques with the strongest evidence behind them. Focus gets you to the desk; these decide how much you actually remember.
      </p>
      {STRATEGIES.map((s) => (
        <div key={s.id} className={`card strategy ${open === s.id ? 'is-open' : ''}`}>
          <button className="strategy-head" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}>
            <span>
              <strong>{s.title}</strong>
              <span className="tag">{s.tag}</span>
            </span>
            <ChevronDown size={16} />
          </button>
          {open === s.id && (
            <div className="strategy-body">
              <p>{s.why}</p>
              <ul>
                {s.how.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
      <div className="card">
        <div className="eyebrow">Break ideas</div>
        <p className="muted small">What to do with your breaks so you come back sharper. One is suggested each break — tap “Another idea” to shuffle.</p>
        <div className="eyebrow" style={{ marginTop: 12 }}>How breaks are recommended</div>
        <p className="muted small">Your break adapts to what you just did — so mixing 90, 50, 70 and 25-minute blocks works.</p>
        <ol className="break-plan-list">
          <li>
            <strong>Short block, little sitting: a light reset</strong>
            <span>Doodle, rest your eyes or sit quietly — no need to get up yet. Quiet, low-effort breaks right after learning help it stick (Dewar et al., 2012).</span>
          </li>
          <li>
            <strong>Seated ~{MOVE_AFTER_MIN}+ minutes: walk</strong>
            <span>Short, regular walks lift energy and mood and ease fatigue more than staying seated (Bergouignan et al., 2016); 5 minutes every half hour worked best in one lab study (Duran et al., 2023).</span>
          </li>
          <li>
            <strong>Block of {LONG_BLOCK_MIN}+ minutes: rest, then walk</strong>
            <span>About 90 minutes of hard thinking leaves real mental fatigue (Marcora et al., 2009). Restore rather than rev up — quiet rest, then an easy walk, ideally outside (Berman et al., 2008).</span>
          </li>
          <li>
            <strong>~{Math.round((LONG_AFTER_MIN / 60) * 10) / 10} hours of focus: long break</strong>
            <span>However you split it, after about {LONG_AFTER_MIN} minutes of focus the next break becomes a long one — move, eat, refill or nap.</span>
          </li>
          <li>
            <strong>Break length grows with the block</strong>
            <span>About 1 minute of break per 5 of focus (25→5, 50→10, 70→15, 90→20). Longer breaks bring bigger performance gains after demanding work (Albulescu et al., 2022).</span>
          </li>
        </ol>
        <div className="eyebrow" style={{ marginTop: 12 }}>All ideas</div>
        <ul className="break-list">
          {BREAK_IDEAS.map((b) => (
            <li key={b.title}>
              <strong>{b.title}</strong>
              {b.long && <span className="tag">Long break</span>}
              <span>{b.body}</span>
              {b.why && <em>{b.why}</em>}
            </li>
          ))}
        </ul>
      </div>
      <div className="card">
        <div className="eyebrow">Keyboard</div>
        <ul className="kbd-list">
          <li>
            <kbd>Space</kbd> start / pause
          </li>
          <li>
            <kbd>S</kbd> skip phase
          </li>
          <li>
            <kbd>R</kbd> reset
          </li>
          <li>
            <kbd>Z</kbd> zen mode
          </li>
          <li>
            <kbd>Esc</kbd> close panels
          </li>
        </ul>
      </div>
    </div>
  );
}
