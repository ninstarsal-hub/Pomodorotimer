import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import { daysUntil } from '../lib/planner';
import { buildQuiz, deckSections, sectionLabel } from '../lib/quiz';
import { usePersistentState } from '../lib/storage';
import type { Exam, ExamResult } from '../lib/types';

export const FEELINGS: { v: ExamResult['feeling']; emoji: string; label: string }[] = [
  { v: 1, emoji: '😣', label: 'Rough' },
  { v: 2, emoji: '😕', label: 'Meh' },
  { v: 3, emoji: '😐', label: 'OK' },
  { v: 4, emoji: '🙂', label: 'Good' },
  { v: 5, emoji: '🤩', label: 'Great' },
];

/** Open the wrap-up for a specific exam (e.g. from Past exams). */
export const openWrapUp = (examId: string) => window.dispatchEvent(new CustomEvent('stillpoint:wrapUp', { detail: examId }));

/**
 * The day after an exam (for up to a week): how did it go, and which parts felt shaky?
 * Shaky sections can go straight back into your reviews, ready for the final.
 * Renders `fallback` when there's nothing to ask, so it never stacks with other prompts.
 */
export function ExamWrapUp({ fallback }: { fallback?: React.ReactNode }) {
  const { exams, decks, today } = useStore();
  const [snoozed, setSnoozed] = usePersistentState<Record<string, string>>('wrapSnooze', {});
  // The exam being asked about stays open until closed, even once it has a result.
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const on = (e: Event) => setOpenId((e as CustomEvent<string>).detail);
    window.addEventListener('stillpoint:wrapUp', on);
    return () => window.removeEventListener('stillpoint:wrapUp', on);
  }, []);

  const hasDeck = (e: Exam) => decks.some((d) => d.id === e.deckId);
  const candidate = exams.find((e) => {
    const d = daysUntil(e.date);
    return d < 0 && d >= -7 && !e.result && !e.wrapSkipped && snoozed[e.id] !== today && hasDeck(e);
  });
  useEffect(() => {
    if (!openId && candidate) setOpenId(candidate.id);
  }, [openId, candidate]);

  const exam = exams.find((e) => e.id === (openId ?? candidate?.id) && hasDeck(e));
  if (!exam) return <>{fallback}</>;
  return (
    <WrapUpModal
      key={exam.id}
      exam={exam}
      onClose={(how) => {
        if (how === 'later') setSnoozed((s) => ({ ...s, [exam.id]: today }));
        setOpenId(null);
      }}
    />
  );
}

function WrapUpModal({ exam, onClose }: { exam: Exam; onClose: (how: 'later' | 'done') => void }) {
  const { decks, cards, reviews, setReviews, setExams, setQuiz } = useStore();
  const deck = decks.find((d) => d.id === exam.deckId)!;
  const all = deckSections(deck);
  const sections = exam.sections.length ? all.filter((s) => exam.sections.includes(s)) : all;
  const [feeling, setFeeling] = useState<ExamResult['feeling'] | null>(exam.result?.feeling ?? null);
  const [shaky, setShaky] = useState<string[]>(exam.result?.shaky ?? []);
  const [score, setScore] = useState(exam.result?.score ?? '');
  const [saved, setSaved] = useState(false);
  const [requeued, setRequeued] = useState<number | null>(null);

  const shakyCards = cards.filter((c) => c.deckId === deck.id && shaky.includes(c.section));
  const update = (patch: Partial<Exam>) => setExams((xs) => xs.map((x) => (x.id === exam.id ? { ...x, ...patch } : x)));

  const save = () => {
    if (!feeling) return;
    update({ result: { feeling, shaky, score: score.trim() || undefined, at: Date.now() }, wrapSkipped: undefined });
    setSaved(true);
  };

  // Bring shaky sections' questions back into due reviews (and a step down the ladder, so they come back sooner).
  const requeue = () => {
    const seen = shakyCards.filter((c) => reviews[c.id]).map((c) => c.id);
    setReviews((rs) => {
      const next = { ...rs };
      for (const id of seen) if (next[id]) next[id] = { ...next[id], due: Date.now(), box: Math.max(0, next[id].box - 1) };
      return next;
    });
    setRequeued(seen.length);
  };

  const quizMe = () => {
    const items = buildQuiz(shakyCards, reviews, Math.min(10, shakyCards.length));
    if (!items.length) return;
    onClose('done');
    setQuiz({ items, title: `${exam.title} — shaky parts`, subtitle: 'Locking these in now pays off on the final.' });
  };

  const when = -daysUntil(exam.date);
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Exam wrap-up">
      <div className="modal wrapup">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Exam wrap-up · {when === 1 ? 'yesterday' : `${when} days ago`}</div>
            <h3>{saved ? 'Saved — thanks.' : `How did ${exam.title} go?`}</h3>
          </div>
          <button className="icon-btn" onClick={() => onClose(saved ? 'done' : 'later')} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!saved ? (
          <>
            <div className="feelings" role="radiogroup" aria-label="How it went">
              {FEELINGS.map((f) => (
                <button key={f.v} role="radio" aria-checked={feeling === f.v} className={`feeling ${feeling === f.v ? 'is-active' : ''}`} onClick={() => setFeeling(f.v)}>
                  <span className="feeling-emoji">{f.emoji}</span>
                  <span className="small">{f.label}</span>
                </button>
              ))}
            </div>

            {sections.length > 1 && (
              <>
                <div className="field-label">Any parts that felt shaky? (optional)</div>
                <div className="chips wrap">
                  {sections.map((s) => (
                    <button key={s} className={`chip ${shaky.includes(s) ? 'is-active' : ''}`} onClick={() => setShaky((xs) => (xs.includes(s) ? xs.filter((x) => x !== s) : [...xs, s]))}>
                      {sectionLabel(s, deck)}
                    </button>
                  ))}
                </div>
              </>
            )}

            <label className="field-label" htmlFor="wrap-score">
              Grade or score, if you have it (optional)
            </label>
            <input id="wrap-score" value={score} maxLength={12} onChange={(e) => setScore(e.target.value)} placeholder="e.g. 84% or B+" />

            <div className="row">
              <button className="btn primary" disabled={!feeling} onClick={save}>
                Save
              </button>
              <button className="btn ghost" onClick={() => onClose('later')}>
                Not now
              </button>
              <button
                className="link-btn small"
                onClick={() => {
                  update({ wrapSkipped: true });
                  onClose('done');
                }}
              >
                Don’t ask for this exam
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="small">
              {feeling! <= 2
                ? 'Rough ones happen — and now you know exactly where to aim. '
                : feeling === 3
                  ? 'Solid. '
                  : 'Nice work — the studying paid off. '}
              {shaky.length
                ? `You flagged ${shaky.length} shaky part${shaky.length === 1 ? '' : 's'}. Keeping them fresh now makes the final much easier.`
                : 'Your notes and questions stay, so you can keep reviewing for the final.'}
            </p>
            {shaky.length > 0 && shakyCards.length > 0 && (
              <div className="row">
                <button className="btn primary" onClick={quizMe}>
                  Quiz me on them now
                </button>
                {shakyCards.some((c) => reviews[c.id]) && (
                  <button className="btn" disabled={requeued !== null} onClick={requeue}>
                    {requeued !== null ? `✓ ${requeued} back in your reviews` : 'Put them back in my reviews'}
                  </button>
                )}
              </div>
            )}
            {shaky.length > 0 && !shakyCards.length && <p className="muted small">Those parts don’t have questions yet — add some in Notes to review them.</p>}
            <div className="row">
              <button className="btn ghost" onClick={() => onClose('done')}>
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
