import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { BREAK_IDEAS, STRATEGIES } from '../lib/content';

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
