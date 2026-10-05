import { useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';

const RATINGS = ['Scattered', 'Distracted', 'Okay', 'Focused', 'Locked in'];

export function ReflectionModal({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const { sessions, setSessions, tasks, setTasks } = useStore();
  const session = sessions.find((s) => s.id === sessionId);
  const task = tasks.find((t) => t.id === session?.taskId);
  const [rating, setRating] = useState<number | null>(null);
  const [summary, setSummary] = useState('');
  const [finished, setFinished] = useState(false);

  if (!session) return null;

  const save = () => {
    setSessions((ss) => ss.map((s) => (s.id === sessionId ? { ...s, rating: rating ?? undefined, recall: [s.recall, summary.trim()].filter(Boolean).join('\n') || undefined } : s)));
    if (finished && task) setTasks((ts) => ts.map((t) => (t.id === task.id ? { ...t, done: true } : t)));
    onClose();
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Reflect on this block">
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Block complete · {session.minutes} min</div>
            <h3>Quick reflection</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Skip reflection">
            <X size={18} />
          </button>
        </div>
        {session.intention && (
          <p className="muted small">
            You set out to: <em>“{session.intention}”</em>
          </p>
        )}
        <div className="field-label">How focused were you?</div>
        <div className="rating">
          {RATINGS.map((r, i) => (
            <button key={r} className={`rate ${rating === i + 1 ? 'is-active' : ''}`} onClick={() => setRating(i + 1)}>
              <span className="rate-dot" style={{ opacity: 0.25 + i * 0.18 }} />
              {r}
            </button>
          ))}
        </div>
        <label className="field-label" htmlFor="summary">
          In one or two sentences, what did you just learn? <span className="muted">(without looking)</span>
        </label>
        <textarea id="summary" rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Summarising from memory is a mini recall test — it locks in what you studied." />
        {task && !task.done && (
          <label className="toggle-row">
            <input type="checkbox" checked={finished} onChange={(e) => setFinished(e.target.checked)} />
            <span>I finished “{task.title}”</span>
          </label>
        )}
        <button className="btn primary wide" onClick={save}>
          Save & take a break
        </button>
      </div>
    </div>
  );
}

export function RecallModal({ initial, onSave, onClose }: { initial: string; onSave: (v: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Brain dump">
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Recall checkpoint</div>
            <h3>Brain dump</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <p className="muted small">Without looking at your material, write down everything you remember from this block so far — key ideas, terms, how they connect. Then glance back to see what you missed. The timer keeps running.</p>
        <textarea rows={7} autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="• …" />
        <button className="btn primary wide" onClick={() => onSave(text)}>
          Save & back to work
        </button>
      </div>
    </div>
  );
}
