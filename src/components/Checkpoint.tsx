import { useEffect, useRef } from 'react';
import { Brain, X } from 'lucide-react';

interface Props {
  minutes: number;
  hasCards: boolean;
  onQuiz: () => void;
  onRecall: () => void;
  onDismiss: () => void;
}

export function Checkpoint({ minutes, hasCards, onQuiz, onRecall, onDismiss }: Props) {
  // The parent re-renders every tick, so hold the latest callback in a ref.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;
  useEffect(() => {
    const id = window.setTimeout(() => dismissRef.current(), 90_000);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <div className="toast" role="status">
      <Brain size={20} className="accent" />
      <div className="toast-body">
        <strong>{minutes} minutes in — check your understanding</strong>
        <span className="muted small">60 seconds of retrieval now beats 10 more minutes of re-reading.</span>
        <div className="row wrap">
          {hasCards && (
            <button className="btn primary small" onClick={onQuiz}>
              Quiz me (3 Qs)
            </button>
          )}
          <button className={`btn small ${hasCards ? '' : 'primary'}`} onClick={onRecall}>
            Brain dump
          </button>
          <button className="btn small ghost" onClick={onDismiss}>
            Not now
          </button>
        </div>
      </div>
      <button className="icon-btn small" onClick={onDismiss} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
