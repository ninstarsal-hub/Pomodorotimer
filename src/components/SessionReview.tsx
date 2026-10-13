import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useStore } from '../store';
import { blocksOf, factorEmoji, factorLabel, SESSION_FACTORS, sessionTitle } from '../lib/studySessions';
import { fmtMinutes } from '../lib/storage';

const RATING_LABEL = ['', 'Scattered', 'Distracted', 'Okay', 'Focused', 'Deep focus'];

/** Rate a whole study session and tick what you did — feeds "What works for you". */
export function SessionReview({ id, ending, onDone, onClose }: { id: string; ending: boolean; onDone: () => void; onClose: () => void }) {
  const { studySessions, sessions, tasks, customFactors, setCustomFactors, endStudySession, updateStudySession } = useStore();
  const s = studySessions.find((x) => x.id === id);
  const [rating, setRating] = useState(s?.rating ?? 0);
  const [factors, setFactors] = useState<string[]>(() => (s?.rating ? s.factors : [...new Set([...(s?.factors ?? []), ...(s?.used ?? [])])]));
  const [note, setNote] = useState(s?.note ?? '');
  const [custom, setCustom] = useState('');
  if (!s) return null;

  const blocks = blocksOf(s, sessions);
  const minutes = blocks.reduce((a, b) => a + b.minutes, 0);
  const end = s.endedAt ?? (blocks.length ? blocks[blocks.length - 1].at : Date.now());
  const time = (t: number) => new Date(t).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const toggle = (f: string) => setFactors((fs) => (fs.includes(f) ? fs.filter((x) => x !== f) : [...fs, f]));
  const allFactors = [...SESSION_FACTORS.map((f) => f.id), ...customFactors.map((c) => `custom:${c}`)];

  const addCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const c = custom.trim().slice(0, 40);
    if (!c) return;
    if (!customFactors.includes(c)) setCustomFactors((cs) => [...cs, c]);
    setFactors((fs) => [...new Set([...fs, `custom:${c}`])]);
    setCustom('');
  };

  const save = (withReview: boolean) => {
    const patch = withReview ? { rating: rating || undefined, factors, note: note.trim() || undefined } : {};
    if (ending) endStudySession(id, patch);
    else updateStudySession(id, patch);
    onDone();
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Session review">
      <div className="modal session-review">
        <div className="modal-head">
          <div>
            <div className="eyebrow">{ending ? 'End study session' : 'Rate session'}</div>
            <h3>{sessionTitle(s)}</h3>
            <div className="muted small">
              {new Date(s.startedAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })} · {time(s.startedAt)}–{time(end)} · {blocks.length} block{blocks.length === 1 ? '' : 's'} · {fmtMinutes(minutes)} focused
            </div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {blocks.length > 0 && (
          <ul className="block-list">
            {blocks.map((b, i) => {
              const t = tasks.find((x) => x.id === b.taskId);
              const what = [t?.title, b.section].filter(Boolean).join(' · ') || b.intention || 'Focus block';
              return (
                <li key={b.id}>
                  <span className="muted small">Block {i + 1}</span>
                  <span className="grow truncate">{what}</span>
                  <span className="muted small">{b.rating ? `${b.rating}/5` : '—'}</span>
                </li>
              );
            })}
          </ul>
        )}

        <div className="field-label">Overall, how was your focus?</div>
        <div className="rating-row" role="radiogroup" aria-label="Overall focus">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} role="radio" aria-checked={rating === n} className={`rate ${rating === n ? 'is-active' : ''}`} onClick={() => setRating(n)}>
              <strong>{n}</strong>
              <span>{RATING_LABEL[n]}</span>
            </button>
          ))}
        </div>

        <div className="field-label">What was true this session?</div>
        <p className="muted small">Tick what applies — after a few sessions, Stillpoint shows which habits go with your best focus.{s.used.length ? ' Things Stillpoint saw you use are pre-ticked.' : ''}</p>
        <div className="factor-chips">
          {allFactors.map((f) => (
            <button key={f} className={`chip ${factors.includes(f) ? 'is-active' : ''}`} onClick={() => toggle(f)} aria-pressed={factors.includes(f)}>
              {factorEmoji(f)} {factorLabel(f)}
            </button>
          ))}
        </div>
        <form className="row" onSubmit={addCustom}>
          <input className="grow" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Add your own (e.g. Desk tidy, Studied in bed)" aria-label="Add your own factor" maxLength={40} />
          <button className="btn" type="submit" aria-label="Add factor" disabled={!custom.trim()}>
            <Plus size={14} />
          </button>
        </form>

        <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Anything else? (optional) e.g. roommate was loud, felt great after the walk" aria-label="Session note" />

        <div className="row wrap">
          <button className="btn primary" onClick={() => save(true)} disabled={!rating}>
            {ending ? 'Save & end session' : 'Save'}
          </button>
          {ending && (
            <button className="btn ghost" onClick={() => save(false)}>
              End without rating
            </button>
          )}
        </div>
        {ending && <p className="muted small">Ending resets your block count, so your next block starts a fresh session with its own breaks.</p>}
      </div>
    </div>
  );
}
