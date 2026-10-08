import { useMemo, useState } from 'react';
import { BookOpen, Check, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { useStore, sectionKey } from '../store';
import { buildPlan, addDays, type ExamPlan, type PlanItem } from '../lib/planner';
import { buildQuiz, deckSections, isDue, sectionLabel } from '../lib/quiz';
import { uid } from '../lib/storage';

/** All upcoming exam plans, soonest first. */
export function usePlans(): ExamPlan[] {
  const { exams, decks, cards, reviews } = useStore();
  return useMemo(
    () =>
      exams
        .map((e) => {
          const deck = decks.find((d) => d.id === e.deckId);
          return deck ? buildPlan(e, deck, cards, reviews) : null;
        })
        .filter((p): p is ExamPlan => !!p)
        .sort((a, b) => a.daysLeft - b.daysLeft),
    [exams, decks, cards, reviews],
  );
}

/** Actions + completion state for plan items, shared by the panel and the main-screen card. */
export function usePlanActions() {
  const { cards, reviews, setQuiz, setStudyingNow, sectionLog, today, decks } = useStore();
  const answeredToday = (it: PlanItem) => sectionLog[today]?.[sectionKey(it.deckId, it.section)] ?? 0;
  const isDone = (it: PlanItem) =>
    it.kind === 'learn' ? !!decks.find((d) => d.id === it.deckId)?.studied?.includes(it.section) : answeredToday(it) >= 3;
  const run = (it: PlanItem) => {
    if (it.kind === 'learn') {
      setStudyingNow({ deckId: it.deckId, section: it.section });
      return;
    }
    const pool = cards.filter((c) => c.deckId === it.deckId && c.section === it.section);
    const items = buildQuiz(pool, reviews, it.kind === 'final' ? 8 : 6);
    if (items.length) setQuiz({ items, title: `${it.kind === 'final' ? 'Final review' : 'Review'} · ${it.label}`, subtitle: 'Planned review for your exam.' });
  };
  return { isDone, run, answeredToday };
}

export function dueSummary(cards: ReturnType<typeof useStore>['unlocked'], reviews: ReturnType<typeof useStore>['reviews']) {
  const due = cards.filter((c) => isDue(reviews[c.id]));
  return { due, minutes: Math.max(1, Math.round(due.length * 0.3)) };
}

export function PlanItemRow({ it, compact = false }: { it: PlanItem; compact?: boolean }) {
  const { isDone, run, answeredToday } = usePlanActions();
  const done = isDone(it);
  const verb = it.kind === 'learn' ? 'Learn' : it.kind === 'final' ? 'Final review' : 'Review';
  return (
    <li className={`plan-item ${done ? 'is-done' : ''}`}>
      <span className={`plan-check ${done ? 'is-checked' : ''}`} aria-hidden>
        {done && <Check size={10} />}
      </span>
      <span className="plan-text">
        <span className={`plan-kind kind-${it.kind}`}>{verb}</span> {it.label}
        {!compact && it.kind !== 'learn' && !done && answeredToday(it) > 0 && <span className="muted small"> · {answeredToday(it)}/3 answered</span>}
      </span>
      {!done && (
        <button className="btn small" onClick={() => run(it)}>
          {it.kind === 'learn' ? (
            <>
              <BookOpen size={12} /> Study
            </>
          ) : (
            <>
              <RotateCcw size={12} /> Quiz
            </>
          )}
        </button>
      )}
    </li>
  );
}

export function PlanPanel() {
  const { decks, exams, setExams } = useStore();
  const plans = usePlans();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(addDays(14));
  const [deckId, setDeckId] = useState(decks[0]?.id ?? '');
  const [sections, setSections] = useState<string[] | null>(null); // null = all
  const deck = decks.find((d) => d.id === deckId);
  const deckSecs = deck ? deckSections(deck) : [];

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deck || !date) return;
    setExams((xs) => [...xs, { id: uid(), title: title.trim() || `${deck.title} exam`, date, deckId: deck.id, sections: sections ?? [] }]);
    setTitle('');
    setSections(null);
  };

  const past = exams.filter((e) => !plans.some((p) => p.exam.id === e.id));

  return (
    <div className="stack">
      <p className="muted small">
        Add an exam and the sections it covers. Stillpoint plans when to learn each section and when to review it — spaced out and getting closer together near the exam — and puts today’s tasks on the main screen.
      </p>

      {!decks.length ? (
        <p className="empty-state">Add your notes in the Notes panel first, then plan exams for them here.</p>
      ) : (
        <form className="card stack-sm" onSubmit={add}>
          <div className="eyebrow">Add an exam</div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Biology midterm" aria-label="Exam name" />
          <div className="row">
            <select className="grow" value={deckId} onChange={(e) => (setDeckId(e.target.value), setSections(null))} aria-label="Notes">
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.title}
                </option>
              ))}
            </select>
            <input type="date" value={date} min={addDays(0)} onChange={(e) => setDate(e.target.value)} aria-label="Exam date" />
          </div>
          {deckSecs.length > 1 && (
            <div className="sections">
              <div className="row between">
                <span className="field-label">Sections on the exam</span>
                <button type="button" className="link-btn small" onClick={() => setSections(sections === null ? [] : null)}>
                  {sections === null ? 'Choose specific' : 'All sections'}
                </button>
              </div>
              {sections !== null && (
                <ul>
                  {deckSecs.map((s) => (
                    <li key={s || '__none'}>
                      <label className="section-check">
                        <input
                          type="checkbox"
                          className="box"
                          checked={sections.includes(s)}
                          onChange={(e) => setSections((xs) => (e.target.checked ? [...(xs ?? []), s] : (xs ?? []).filter((x) => x !== s)))}
                        />
                        <span className="section-name">{sectionLabel(s, deck!)}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
          <button className="btn primary" type="submit" disabled={sections !== null && !sections.length}>
            <Plus size={14} /> Add exam & build plan
          </button>
        </form>
      )}

      {plans.map((p) => (
        <ExamCard key={p.exam.id} plan={p} onRemove={() => setExams((xs) => xs.filter((x) => x.id !== p.exam.id))} />
      ))}

      {past.length > 0 && (
        <>
          <h4 className="section-title">Past exams</h4>
          <ul className="task-list">
            {past.map((e) => (
              <li key={e.id} className="task is-carry">
                <span className="task-title">
                  {e.title} <span className="muted small">· {e.date}</span>
                </span>
                <button className="icon-btn small" onClick={() => setExams((xs) => xs.filter((x) => x.id !== e.id))} aria-label="Delete exam">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function ExamCard({ plan, onRemove }: { plan: ExamPlan; onRemove: () => void }) {
  const { exam, daysLeft, days, readiness, sections } = plan;
  const [showAll, setShowAll] = useState(false);
  const upcoming = days.map((items, i) => ({ i, items })).filter((d) => d.i > 0 && d.items.length);
  const when = daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `In ${daysLeft} days`;
  const dayName = (i: number) => {
    const [y, m, d] = addDays(i).split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="card exam-card">
      <div className="row between">
        <div>
          <strong>{exam.title}</strong>
          <div className="muted small">
            {when} · {exam.date} · {sections.length} section{sections.length === 1 ? '' : 's'}
          </div>
        </div>
        <button className="icon-btn small" onClick={() => confirm('Delete this exam and its plan?') && onRemove()} aria-label="Delete exam">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="readiness" title="Share of this exam's questions you know well">
        <span className="muted small">Readiness</span>
        <span className="subject-bar grow">
          <span style={{ width: `${readiness * 100}%` }} />
        </span>
        <span className="small">{Math.round(readiness * 100)}%</span>
      </div>
      <div className="field-label">Today</div>
      {days[0].length ? (
        <ul className="plan-list">
          {days[0].map((it) => (
            <PlanItemRow key={it.section + it.kind} it={it} />
          ))}
        </ul>
      ) : (
        <p className="muted small">Nothing planned for this exam today — rest or get ahead with a review.</p>
      )}
      {upcoming.length > 0 && (
        <>
          <button className="link-btn small" onClick={() => setShowAll((s) => !s)}>
            {showAll ? 'Hide schedule' : `Show full schedule (${upcoming.length} more days)`}
          </button>
          {showAll && (
            <ul className="schedule">
              {upcoming.map(({ i, items }) => (
                <li key={i}>
                  <span className="muted small schedule-day">{dayName(i)}</span>
                  <span className="small">
                    {items.map((it) => `${it.kind === 'learn' ? 'Learn' : it.kind === 'final' ? 'Final review' : 'Review'} ${it.label}`).join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
