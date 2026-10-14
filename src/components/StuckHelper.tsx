import { useState } from 'react';
import { LifeBuoy, X } from 'lucide-react';
import { useStore } from '../store';
import { uid } from '../lib/storage';

const MOVES = [
  { title: 'Explain it out loud', body: 'Say what you DO understand, as if teaching a friend. The exact spot where you trail off is the real question.' },
  { title: 'Find a worked example', body: 'Look for a solved example of the same kind of problem in your notes, textbook or slides, and follow it step by step.' },
  { title: 'Shrink the problem', body: 'Break it into the smallest next step you can do right now — even just writing down what’s given and what’s asked.' },
  { title: 'Move on, come back', body: 'Skip it for now and do something you can make progress on. Your brain keeps working on it in the background (incubation).' },
  { title: '2-minute reset', body: 'Stand up, stretch, drink some water. A short break often unsticks a problem faster than staring at it.' },
];

/** "I'm stuck" during a focus block: strategies, plus a place to park the exact question to ask later. */
export function StuckHelper() {
  const { setDistractions, cards, setBuilderOpen } = useStore();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [saved, setSaved] = useState(false);

  if (!open)
    return (
      <button className="link-btn small stuck-link" onClick={() => setOpen(true)}>
        <LifeBuoy size={12} /> Stuck?
      </button>
    );

  return (
    <div className="stuck card">
      <div className="row between">
        <div className="eyebrow">When you’re stuck</div>
        <button className="icon-btn small" onClick={() => setOpen(false)} aria-label="Close">
          <X size={14} />
        </button>
      </div>
      <ol className="stuck-moves">
        {MOVES.map((m) => (
          <li key={m.title}>
            <strong>{m.title}.</strong> <span className="muted">{m.body}</span>
          </li>
        ))}
      </ol>
      {cards.length > 0 && (
        <button className="btn small" onClick={() => setBuilderOpen(true)}>
          Quiz yourself on what you’ve covered instead
        </button>
      )}
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          if (!question.trim()) return;
          setDistractions((ds) => [...ds, { id: uid(), text: `❓ Ask later: ${question.trim()}`, at: Date.now(), done: false }]);
          setQuestion('');
          setSaved(true);
        }}
      >
        <input className="grow" value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Write the exact question you’re stuck on…" aria-label="Question to ask later" />
        <button className="btn small" type="submit" disabled={!question.trim()}>
          Save
        </button>
      </form>
      <p className="muted small">{saved ? 'Saved to your parking lot (Today panel) — ask your teacher, a classmate or an AI tutor later.' : 'Saved questions go to your parking lot so you can ask a teacher, classmate or AI tutor later.'}</p>
    </div>
  );
}
