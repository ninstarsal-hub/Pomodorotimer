import { useEffect, useRef, useState } from 'react';
import { MathText } from './MathText';
import { DiagramView } from './Diagrams';
import { Check, X } from 'lucide-react';
import { useStore, type QuizRequest } from '../store';
import { answerFeedback, deckSections, schedule, sectionLabel, type AnswerFeedback, type Grade, type QuizItem } from '../lib/quiz';

interface Result {
  item: QuizItem;
  correct: boolean;
}

export function QuizModal({ request, onClose }: { request: QuizRequest; onClose: () => void }) {
  const { setReviews, logReview, decks } = useStore();
  const [i, setI] = useState(0);
  const [results, setResults] = useState<Result[]>([]);
  const [queue, setQueue] = useState(request.items);
  const item = queue[i];
  const done = i >= queue.length;

  const grade = (g: Grade) => {
    const correct = g !== 'again';
    setReviews((r) => ({ ...r, [item.card.id]: schedule(r[item.card.id], g) }));
    logReview(correct, item.card);
    setResults((rs) => [...rs, { item, correct }]);
    if (!correct && request.repeatMissed && queue.filter((q) => q.card.id === item.card.id).length < 4) setQueue((q) => [...q, item]);
    setI((x) => x + 1);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const deck = item ? decks.find((d) => d.id === item.card.deckId) : undefined;
  const deckName = deck ? [deck.title, deck && deckSections(deck).length > 1 ? sectionLabel(item.card.section, deck) : ''].filter(Boolean).join(' · ') : undefined;
  // Cram: count each question once — did you get it by the end?
  const finalByCard = new Map(results.map((r) => [r.item.card.id, r]));
  const final = request.repeatMissed ? [...finalByCard.values()] : results;
  const score = final.filter((r) => r.correct).length;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={request.title}>
      <div className="modal quiz">
        <div className="modal-head">
          <div>
            <div className="eyebrow">{request.title}</div>
            {!done && (
              <div className="muted small">
                Question {i + 1} of {queue.length}
                {deckName ? ` · ${item.earlier ? 'Review: ' : ''}${deckName}` : ''}
              </div>
            )}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close quiz">
            <X size={18} />
          </button>
        </div>
        <div className="quiz-progress">
          <span style={{ width: `${(Math.min(i, queue.length) / queue.length) * 100}%` }} />
        </div>
        {request.subtitle && i === 0 && !done && <p className="muted small">{request.subtitle}</p>}

        {!done ? (
          <Question key={item.card.id + i} item={item} onGrade={grade} />
        ) : (
          <div className="quiz-done">
            <div className="score">
              {score}/{final.length}
            </div>
            {request.repeatMissed && <p className="muted small">{score === final.length ? 'Every question cleared by the end of the round.' : `${final.length - score} still shaky — look these over once more tonight.`}</p>}
            <p>
              {score === final.length
                ? 'Clean sweep. These will come back later, spaced further apart.'
                : 'Misses are the point — the effort of retrieving (and failing) is what makes the next recall stick. Missed cards will return soon.'}
            </p>
            {final.some((r) => !r.correct) && (
              <div className="weak">
                <div className="eyebrow">Revisit</div>
                <ul>
                  {final
                    .filter((r) => !r.correct)
                    .map((r) => (
                      <li key={r.item.card.id}>
                        <MathText className="muted" text={r.item.card.front} />
                        <br />
                        <MathText text={r.item.card.back} />
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
  const [fb, setFb] = useState<AnswerFeedback | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { card } = item;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const reveal = () => {
    if (item.type === 'type' && answer.trim()) setFb(answerFeedback(answer, card.back));
    setRevealed(true);
  };

  // Suggested grade from the automatic check (you can always pick another).
  const suggested: Grade | null = !fb ? null : fb.verdict === 'right' ? 'good' : fb.verdict === 'close' ? (fb.hit.length / (fb.hit.length + fb.missed.length) >= 0.75 ? 'good' : 'hard') : null;

  // Keyboard: 1–4 pick an option (multiple choice) or a grade; Enter goes on after a multiple-choice pick.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('textarea, input') || e.metaKey || e.ctrlKey || e.altKey) return;
      const n = Number(e.key);
      if (item.type === 'choice') {
        if (!picked && n >= 1 && n <= item.options!.length) {
          setPicked(item.options![n - 1]);
          setRevealed(true);
        } else if (picked && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onGrade(picked === card.back ? 'good' : 'again');
        }
      } else if (revealed && n >= 1 && n <= 4) {
        onGrade((['again', 'hard', 'good', 'easy'] as const)[n - 1]);
      } else if (!revealed && e.key === 'Enter') {
        e.preventDefault();
        reveal();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const prompt = card.kind === 'cloze' ? 'Fill in the blank' : card.kind === 'prompt' ? 'Explain from memory' : item.type === 'choice' ? 'Choose the answer' : 'Recall the answer';

  return (
    <div className="question">
      <div className="eyebrow muted">
        {prompt}
      </div>
      {card.image ? <DiagramView diagramId={card.image.diagramId} boxId={card.image.boxId} reveal={revealed} /> : <MathText as="p" className="q-front" text={card.front} />}

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
                <kbd className="choice-key">{item.options!.indexOf(o) + 1}</kbd>
                <MathText text={o} />
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
              {fb && <Feedback fb={fb} />}
              <div className="eyebrow muted">Answer</div>
              <MathText as="p" text={card.back} />
            </>
          )}
          {item.type === 'choice' ? (
            <button className="btn primary wide" onClick={() => onGrade(picked === card.back ? 'good' : 'again')}>
              Next
            </button>
          ) : (
            <>
              <div className="muted small">How well did you know it? {fb && fb.verdict !== 'wrong' ? 'Your pick counts, not the automatic check.' : ''}</div>
              <div className="grades">
                {(['again', 'hard', 'good', 'easy'] as const).map((g, i) => (
                  <button key={g} className={`grade ${g === 'again' ? 'again' : ''} ${suggested === g ? 'suggested' : ''}`} onClick={() => onGrade(g)}>
                    {g[0].toUpperCase() + g.slice(1)}
                    <kbd>{i + 1}</kbd>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/** "Looks right" / "Close" / "Not quite", plus which key words you got and missed. */
export function Feedback({ fb }: { fb: AnswerFeedback }) {
  return (
    <div className="feedback">
      <div className={`verdict ${fb.verdict === 'right' ? 'ok' : fb.verdict === 'close' ? 'close' : 'bad'}`}>
        {fb.verdict === 'right' ? (
          <>
            <Check size={14} /> Looks right
          </>
        ) : fb.verdict === 'close' ? (
          <>≈ Close — you have most of the key ideas</>
        ) : (
          <>
            <X size={14} /> Not quite
          </>
        )}
      </div>
      {fb.verdict !== 'right' && fb.hit.length + fb.missed.length > 1 && (
        <div className="keywords small">
          {fb.hit.map((w) => (
            <span key={w} className="kw hit">
              ✓ {w}
            </span>
          ))}
          {fb.missed.map((w) => (
            <span key={w} className="kw miss">
              {w}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
