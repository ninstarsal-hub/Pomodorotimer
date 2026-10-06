import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useStore, type QuizRequest } from '../store';
import { checkAnswer, schedule, type Grade, type QuizItem } from '../lib/quiz';

interface Result {
  item: QuizItem;
  correct: boolean;
}

export function QuizModal({ request, onClose }: { request: QuizRequest; onClose: () => void }) {
  const { setReviews, logReview, decks } = useStore();
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const item = request.items[i];
  const done = i >= request.items.length;

  const grade = (g: Grade) => {
    const correct = g !== 'again';
    setReviews((r) => ({ ...r, [item.card.id]: schedule(r[item.card.id], g) }));
    logReview(correct);
    setResults((rs) => [...rs, { item, correct }]);
    setI((x) => x + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const deckName = item ? decks.find((d) => d.id === item.card.deckId)?.title : undefined;
  const score = results.filter((r) => r.correct).length;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={request.title}>
      <div className="modal quiz">
        <div className="modal-head">
          <div>
            <div className="eyebrow">{request.title}</div>
            {!done && (
              <div className="muted small">
                Question {i + 1} of {request.items.length}
                {deckName ? ` · ${deckName}` : ''}
              </div>
            )}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close quiz">
            <X size={18} />
          </button>
        </div>
        <div className="quiz-progress">
          <span style={{ width: `${(Math.min(i, request.items.length) / request.items.length) * 100}%` }} />
        </div>
        {request.subtitle && i === 0 && !done && <p className="muted small">{request.subtitle}</p>}

        {!done ? (
          <Question key={item.card.id + i} item={item} onGrade={grade} />
        ) : (
          <div className="quiz-done">
            <div className="score">
              {score}/{results.length}
            </div>
            <p>
              {score === results.length
                ? 'Clean sweep. These will come back later, spaced further apart.'
                : 'Misses are the point — the effort of retrieving (and failing) is what makes the next recall stick. Missed cards will return soon.'}
            </p>
            {results.some((r) => !r.correct) && (
              <div className="weak">
                <div className="eyebrow">Revisit</div>
                <ul>
                  {results
                    .filter((r) => !r.correct)
                    .map((r) => (
                      <li key={r.item.card.id}>
                        <span className="muted">{r.item.card.front}</span>
                        <br />
                        {r.item.card.back}
                      </li>
                    ))}
                </ul>
              </div>
            )}
            <button className="btn primary wide" onClick={onClose}>
              Back to focus
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function Question({ item, onGrade }: { item: QuizItem; onGrade: (g: Grade) => void }) {
  const [answer, setAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const [auto, setAuto] = useState<boolean | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { card } = item;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const reveal = () => {
    if (item.type === 'type' && answer.trim()) setAuto(checkAnswer(answer, card.back));
    setRevealed(true);
  };

  const prompt = card.kind === 'cloze' ? 'Fill in the blank' : card.kind === 'prompt' ? 'Explain from memory' : item.type === 'choice' ? 'Choose the answer' : 'Recall the answer';

  return (
    <div className="question">
      <div className="eyebrow muted">
        {prompt}
      </div>
      <p className="q-front">{card.front}</p>

      {item.type === 'choice' && (
        <div className="choices">
          {item.options!.map((o) => {
            const state = picked ? (o === card.back ? 'is-right' : o === picked ? 'is-wrong' : '') : '';
            return (
              <button
                key={o}
                className={`choice ${state}`}
                disabled={!!picked}
                onClick={() => {
                  setPicked(o);
                  setRevealed(true);
                }}
              >
                {o}
              </button>
            );
          })}
        </div>
      )}

      {item.type !== 'choice' && !revealed && (
        <>
          <textarea
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            rows={card.kind === 'prompt' ? 4 : 2}
            placeholder={item.type === 'flip' ? 'Optional: write your answer — writing beats just thinking it.' : 'Type your answer…'}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                reveal();
              }
            }}
          />
          <button className="btn primary wide" onClick={reveal}>
            {answer.trim() ? 'Check' : 'Show answer'}
          </button>
        </>
      )}

      {revealed && (
        <div className="answer">
          {item.type !== 'choice' && (
            <>
              {auto !== null && <div className={`verdict ${auto ? 'ok' : 'bad'}`}>{auto ? <><Check size={14} /> Looks right</> : <><X size={14} /> Not quite</>}</div>}
              <div className="eyebrow muted">Answer</div>
              <p>{card.back}</p>
            </>
          )}
          {item.type === 'choice' ? (
            <button className="btn primary wide" onClick={() => onGrade(picked === card.back ? 'good' : 'again')}>
              Next
            </button>
          ) : (
            <>
              <div className="muted small">How well did you know it?</div>
              <div className="grades">
                <button className="grade again" onClick={() => onGrade('again')}>
                  Again
                </button>
                <button className="grade" onClick={() => onGrade('hard')}>
                  Hard
                </button>
                <button className={`grade ${auto ? 'suggested' : ''}`} onClick={() => onGrade('good')}>
                  Good
                </button>
                <button className="grade" onClick={() => onGrade('easy')}>
                  Easy
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
