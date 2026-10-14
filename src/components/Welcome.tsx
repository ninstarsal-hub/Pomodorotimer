import { BookOpen, CalendarDays, Timer } from 'lucide-react';
import { useStore } from '../store';
import { SAMPLE_NOTES } from '../lib/content';
import { deckSections } from '../lib/quiz';
import { addDays } from '../lib/planner';
import { uid, usePersistentState } from '../lib/storage';
import type { Deck } from '../lib/types';

const STEPS = [
  { icon: Timer, title: 'Focus in blocks', body: 'Start a Pomodoro, pick focus sounds, and take breaks that actually recharge you.' },
  { icon: BookOpen, title: 'Turn notes into quizzes', body: 'Paste or upload your notes (PDF, Word, slides). Stillpoint writes questions from them and quizzes you while you study.' },
  { icon: CalendarDays, title: 'Plan for exams', body: 'Add an exam date and get a day-by-day plan of what to learn and review, plus a readiness score.' },
];

/** First-visit intro. Shown once, only to people with nothing in Stillpoint yet. */
export function Welcome({ onOpen }: { onOpen: (panel: 'notes' | 'plan') => void }) {
  const { decks, sessions, tasks, setDecks, setExams } = useStore();
  const [seen, setSeen] = usePersistentState('welcomed', false);
  if (seen || decks.length || sessions.length || tasks.length) return null;

  const trySample = () => {
    const deck: Deck = { id: uid(), title: 'Example: Biology', subject: 'Biology', content: SAMPLE_NOTES, autoCloze: true, createdAt: Date.now() };
    deck.studied = deckSections(deck);
    setDecks((ds) => [deck, ...ds]);
    setExams((xs) => [...xs, { id: uid(), title: 'Example: Biology test', date: addDays(10), deckId: deck.id, sections: [] }]);
    setSeen(true);
    onOpen('plan');
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Welcome to Stillpoint">
      <div className="modal welcome">
        <div className="eyebrow">Welcome</div>
        <h2>Stillpoint</h2>
        <p className="muted">A calm place to study — free, no account, and everything stays in your browser.</p>
        {window.innerWidth < 700 && <p className="small welcome-phone">📱 Works on your phone — but it’s at its best on a laptop, where you can keep it open beside your notes while you study.</p>}
        <ol className="welcome-steps">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <li key={title}>
              <span className="welcome-icon">
                <Icon size={16} />
              </span>
              <span>
                <strong>
                  {i + 1}. {title}
                </strong>
                <span className="muted small">{body}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="welcome-actions">
          <button className="btn primary" onClick={trySample}>
            Try it with example notes
          </button>
          <button
            className="btn"
            onClick={() => {
              setSeen(true);
              onOpen('notes');
            }}
          >
            Add my own notes
          </button>
          <button className="link-btn small" onClick={() => setSeen(true)}>
            Just the timer for now
          </button>
        </div>
        <p className="muted small">Tip: back up from Settings now and then — your data lives only in this browser.</p>
      </div>
    </div>
  );
}
