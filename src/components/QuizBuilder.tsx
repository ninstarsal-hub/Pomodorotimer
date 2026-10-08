import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, RotateCcw, X } from 'lucide-react';
import { useStore } from '../store';
import { usePersistentState } from '../lib/storage';
import { checkAnswer, deckSections, schedule, sectionLabel } from '../lib/quiz';
import { generateExam, maxQuestions, QTYPE_LABEL, type ExamQuestion, type QType } from '../lib/exam';
import type { Card } from '../lib/types';

const ALL_TYPES: QType[] = ['mcq', 'tf', 'short', 'blank', 'explain'];
const COUNTS = [5, 10, 15, 20, 30, 50];

interface Prefs {
  types: QType[];
  count: number;
  mode: 'practice' | 'exam';
  weakFirst: boolean;
  asBlock: boolean;
}

const key = (deckId: string, section: string) => `${deckId}\u0000${section}`;

export function QuizBuilder({ onClose, onStartBlock }: { onClose: () => void; onStartBlock: () => void }) {
  const { decks, cards, reviews, studyingNow, builderInit } = useStore();
  const [prefs, setPrefs] = usePersistentState<Prefs>('quizPrefs', { types: ALL_TYPES, count: 10, mode: 'practice', weakFirst: false, asBlock: false });
  const [exam, setExam] = useState<{ questions: ExamQuestion[]; mode: Prefs['mode'] } | null>(null);
  // Opened with a preset (e.g. "quiz my weakest sections"): apply it once.
  useEffect(() => {
    if (builderInit?.weakFirst !== undefined || builderInit?.count) setPrefs((p) => ({ ...p, weakFirst: builderInit.weakFirst ?? p.weakFirst, count: builderInit.count ?? p.count }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Default scope: everything you've studied plus what you're studying now.
  const [scope, setScope] = useState<Set<string>>(() => {
    if (builderInit?.scope) return new Set(builderInit.scope);
    const s = new Set<string>();
    for (const d of decks) for (const sec of d.studied ?? []) s.add(key(d.id, sec));
    if (studyingNow) s.add(key(studyingNow.deckId, studyingNow.section));
    return s;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !exam) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, exam]);

  const pool = useMemo(() => cards.filter((c) => scope.has(key(c.deckId, c.section))), [cards, scope]);
  const max = useMemo(() => maxQuestions(pool, prefs.types), [pool, prefs.types]);
  const count = Math.min(prefs.count, max);
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const c of cards) m.set(key(c.deckId, c.section), (m.get(key(c.deckId, c.section)) ?? 0) + 1);
    return m;
  }, [cards]);

  const toggle = (k: string, on: boolean) =>
    setScope((s) => {
      const n = new Set(s);
      if (on) n.add(k);
      else n.delete(k);
      return n;
    });

  const preset = (which: 'studied' | 'current' | 'all' | 'none') => {
    const s = new Set<string>();
    for (const d of decks)
      for (const sec of deckSections(d)) {
        const k = key(d.id, sec);
        if (which === 'all') s.add(k);
        if (which === 'studied' && (d.studied?.includes(sec) || (studyingNow?.deckId === d.id && studyingNow.section === sec))) s.add(k);
        if (which === 'current' && studyingNow?.deckId === d.id && studyingNow.section === sec) s.add(k);
      }
    setScope(s);
  };

  const start = () => {
    const questions = generateExam(pool, reviews, { types: prefs.types, count, weakFirst: prefs.weakFirst });
    if (!questions.length) return;
    if (prefs.asBlock) onStartBlock();
    setExam({ questions, mode: prefs.mode });
  };

  if (exam) {
    return (
      <ExamRunner
        key={exam.questions.map((q) => q.id).join('|')}
        questions={exam.questions}
        mode={exam.mode}
        onClose={onClose}
        onRetry={(qs) => setExam({ questions: qs, mode: exam.mode })}
        onNew={() => setExam(null)}
      />
    );
  }

  const unstudiedSelected = decks.some((d) => deckSections(d).some((sec) => scope.has(key(d.id, sec)) && !d.studied?.includes(sec)));

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Generate a quiz">
      <div className="modal builder">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Practice test</div>
            <h3>Generate a quiz</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        {!decks.length ? (
          <p className="empty-state">Add some notes in the Notes panel first — quizzes are built from them.</p>
        ) : (
          <>
            <div className="builder-section">
              <div className="row between">
                <span className="field-label">What to cover</span>
                <span className="row chips-sm">
                  <button className="chip" onClick={() => preset('studied')}>
                    Studied
                  </button>
                  {studyingNow && (
                    <button className="chip" onClick={() => preset('current')}>
                      Current section
                    </button>
                  )}
                  <button className="chip" onClick={() => preset('all')}>
                    All
                  </button>
                  <button className="chip" onClick={() => preset('none')}>
                    None
                  </button>
                </span>
              </div>
              <div className="scope-list">
                {decks.map((d) => {
                  const secs = deckSections(d);
                  const allOn = secs.every((sec) => scope.has(key(d.id, sec)));
                  const someOn = secs.some((sec) => scope.has(key(d.id, sec)));
                  return (
                    <div key={d.id} className="scope-deck">
                      <label className="section-check deck-check">
                        <input
                          type="checkbox"
                          className="box"
                          checked={allOn}
                          ref={(el) => {
                            if (el) el.indeterminate = someOn && !allOn;
                          }}
                          onChange={(e) => secs.forEach((sec) => toggle(key(d.id, sec), e.target.checked))}
                        />
                        <strong>{d.title}</strong>
                      </label>
                      {secs.length > 1 && (
                        <ul>
                          {secs.map((sec) => {
                            const k = key(d.id, sec);
                            const studied = d.studied?.includes(sec) || (studyingNow?.deckId === d.id && studyingNow.section === sec);
                            return (
                              <li key={k}>
                                <label className="section-check">
                                  <input type="checkbox" className="box" checked={scope.has(k)} onChange={(e) => toggle(k, e.target.checked)} />
                                  <span className="section-name">{sectionLabel(sec, d)}</span>
                                </label>
                                {!studied && <span className="tag">not studied yet</span>}
                                <span className="muted small">{counts.get(k) ?? 0}</span>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })}
              </div>
              {unstudiedSelected && <p className="muted small">Includes sections you haven’t marked as studied — fine for a pre-test, just expect to miss some.</p>}
            </div>

            <div className="builder-section">
              <span className="field-label">Question types</span>
              <div className="row wrap">
                {ALL_TYPES.map((t) => {
                  const on = prefs.types.includes(t);
                  return (
                    <button
                      key={t}
                      className={`chip ${on ? 'is-active' : ''}`}
                      aria-pressed={on}
                      onClick={() => setPrefs((p) => ({ ...p, types: on ? (p.types.length > 1 ? p.types.filter((x) => x !== t) : p.types) : [...p.types, t] }))}
                    >
                      {on && <Check size={12} />} {QTYPE_LABEL[t]}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="builder-section">
              <div className="row between">
                <span className="field-label">Number of questions</span>
                <span className="muted small">{max} possible from this selection</span>
              </div>
              <div className="row wrap">
                {COUNTS.map((n) => (
                  <button key={n} className={`chip ${prefs.count === n ? 'is-active' : ''}`} disabled={n > max && n !== COUNTS[0]} onClick={() => setPrefs((p) => ({ ...p, count: n }))}>
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="builder-section">
              <span className="field-label">Mode</span>
              <div className="segmented">
                <button className={prefs.mode === 'practice' ? 'is-active' : ''} onClick={() => setPrefs((p) => ({ ...p, mode: 'practice' }))}>
                  Practice · feedback after each
                </button>
                <button className={prefs.mode === 'exam' ? 'is-active' : ''} onClick={() => setPrefs((p) => ({ ...p, mode: 'exam' }))}>
                  Exam · score at the end
                </button>
              </div>
              <label className="toggle-row">
                <input type="checkbox" checked={prefs.weakFirst} onChange={(e) => setPrefs((p) => ({ ...p, weakFirst: e.target.checked }))} />
                <span>Focus on questions I’ve gotten wrong before</span>
              </label>
              <label className="toggle-row">
                <input type="checkbox" checked={prefs.asBlock} onChange={(e) => setPrefs((p) => ({ ...p, asBlock: e.target.checked }))} />
                <span>Use a focus block for this quiz (starts the timer)</span>
              </label>
            </div>

            <button className="btn primary wide" disabled={!count} onClick={start}>
              {count ? `Start ${count}-question ${prefs.mode === 'exam' ? 'exam' : 'quiz'}` : 'Select sections with questions'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- running a quiz ---------- */

interface Response {
  given: string;
  /** null = needs self-grading (explain questions in exam mode). */
  correct: boolean | null;
}

function autoGrade(q: ExamQuestion, given: string): boolean | null {
  if (q.type === 'mcq' || q.type === 'tf') return given === q.answer;
  if (q.type === 'explain') return null;
  return checkAnswer(given, q.answer);
}

function ExamRunner({
  questions,
  mode,
  onClose,
  onRetry,
  onNew,
}: {
  questions: ExamQuestion[];
  mode: 'practice' | 'exam';
  onClose: () => void;
  onRetry: (qs: ExamQuestion[]) => void;
  onNew: () => void;
}) {
  const { setReviews, logReview, decks } = useStore();
  const [i, setI] = useState(0);
  const [responses, setResponses] = useState<Record<string, Response>>({});
  const [revealed, setRevealed] = useState(false); // practice: feedback showing for current question
  const [submitted, setSubmitted] = useState(false);
  const recorded = useRef(false);
  const q = questions[i];
  const r = q ? responses[q.id] : undefined;

  const answer = (given: string) => {
    setResponses((rs) => ({ ...rs, [q.id]: { given, correct: autoGrade(q, given) } }));
    if (mode === 'practice') setRevealed(true);
  };
  const grade = (id: string, correct: boolean) => setResponses((rs) => ({ ...rs, [id]: { ...rs[id], given: rs[id]?.given ?? '', correct } }));

  const next = () => {
    setRevealed(false);
    if (i < questions.length - 1) setI(i + 1);
    else finish();
  };

  const finish = () => setSubmitted(true);

  // Unanswered questions count as missed; only answered explain questions need self-grading.
  const allGraded = questions.every((x) => !responses[x.id] || responses[x.id].correct != null);

  // Feed results into spaced repetition once everything is graded.
  useEffect(() => {
    if (!submitted || !allGraded || recorded.current) return;
    recorded.current = true;
    const byCard = new Map<string, boolean>();
    const cardById = new Map(questions.map((x) => [x.card.id, x.card]));
    for (const x of questions) byCard.set(x.card.id, (byCard.get(x.card.id) ?? true) && !!responses[x.id]?.correct);
    setReviews((rv) => {
      const n = { ...rv };
      for (const [id, ok] of byCard) n[id] = schedule(rv[id], ok ? 'good' : 'again');
      return n;
    });
    for (const [id, ok] of byCard) logReview(ok, cardById.get(id));
  }, [submitted, allGraded, questions, responses, setReviews, logReview]);

  const where = (c: Card) => {
    const d = decks.find((x) => x.id === c.deckId);
    if (!d) return '';
    return deckSections(d).length > 1 ? `${d.title} · ${sectionLabel(c.section, d)}` : d.title;
  };

  if (submitted) {
    const correct = questions.filter((x) => responses[x.id]?.correct).length;
    const pct = Math.round((correct / questions.length) * 100);
    const missed = questions.filter((x) => responses[x.id]?.correct === false || !responses[x.id]);
    const bySection = new Map<string, { right: number; total: number }>();
    for (const x of questions) {
      const k = where(x.card);
      const s = bySection.get(k) ?? { right: 0, total: 0 };
      s.total++;
      if (responses[x.id]?.correct) s.right++;
      bySection.set(k, s);
    }
    return (
      <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Quiz results">
        <div className="modal builder">
          <div className="modal-head">
            <div>
              <div className="eyebrow">Results</div>
              <h3>
                {correct} / {questions.length} · {pct}%
              </h3>
            </div>
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
          {!allGraded && <p className="small accent">Mark your “explain” answers below as right or wrong to finish scoring.</p>}
          {bySection.size > 1 && (
            <ul className="subject-list wide">
              {[...bySection].map(([name, s]) => (
                <li key={name}>
                  <span title={name}>{name}</span>
                  <span className="subject-bar">
                    <span style={{ width: `${(s.right / s.total) * 100}%` }} />
                  </span>
                  <span className="muted small">
                    {s.right}/{s.total}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <ol className="review-list">
            {questions.map((x) => {
              const res = responses[x.id];
              return (
                <li key={x.id} className={res?.correct ? 'ok' : res?.correct === false || !res ? 'bad' : ''}>
                  <div className="muted small">
                    {QTYPE_LABEL[x.type]} · {where(x.card)}
                  </div>
                  <div>{x.prompt}</div>
                  {x.detail && <div className="muted small">“{x.detail}”</div>}
                  <div className="small">
                    <span className="muted">You: </span>
                    {res?.given || <em className="muted">no answer</em>}
                  </div>
                  {!res?.correct && (
                    <div className="small">
                      <span className="muted">Answer: </span>
                      {x.answer}
                      {x.explanation && <span className="muted"> — {x.explanation}</span>}
                    </div>
                  )}
                  {(x.type === 'explain' || x.type === 'short' || x.type === 'blank') && res && (
                    <div className="row">
                      <button className={`btn small ${res.correct === true ? 'primary' : ''}`} onClick={() => grade(x.id, true)}>
                        <Check size={12} /> I had it
                      </button>
                      <button className={`btn small ${res.correct === false ? 'danger' : ''}`} onClick={() => grade(x.id, false)}>
                        <X size={12} /> Missed it
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>
          <div className="row wrap">
            {missed.length > 0 && (
              <button className="btn primary" onClick={() => onRetry(missed)}>
                <RotateCcw size={14} /> Retry {missed.length} missed
              </button>
            )}
            <button className="btn" onClick={onNew}>
              New quiz
            </button>
            <button className="btn ghost" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showFeedback = mode === 'practice' && revealed && r;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Quiz">
      <div className="modal quiz">
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              {mode === 'exam' ? 'Exam' : 'Practice'} · {i + 1} of {questions.length}
            </div>
            <div className="muted small">{where(q.card)}</div>
          </div>
          <button className="icon-btn" onClick={() => (Object.keys(responses).length && !confirm('Quit this quiz? Your answers so far won’t be scored.') ? null : onClose())} aria-label="Quit quiz">
            <X size={18} />
          </button>
        </div>
        <div className="quiz-progress">
          <span style={{ width: `${(i / questions.length) * 100}%` }} />
        </div>

        <ExamQuestionView key={q.id} q={q} response={r} locked={!!showFeedback} examMode={mode === 'exam'} onAnswer={answer} />

        {showFeedback && (
          <div className="answer">
            {r.correct === true && (
              <div className="verdict ok">
                <Check size={14} /> Correct
              </div>
            )}
            {r.correct === false && (
              <div className="verdict bad">
                <X size={14} /> Not quite
              </div>
            )}
            {q.type !== 'mcq' && q.type !== 'tf' && (
              <>
                <div className="eyebrow muted">{q.type === 'explain' ? 'Model answer' : 'Answer'}</div>
                <p>{q.answer}</p>
              </>
            )}
            {q.explanation && <p className="muted small">{q.explanation}</p>}
            {(q.type === 'short' || q.type === 'blank' || q.type === 'explain') && (
              <div className="row wrap">
                <span className="muted small">{q.type === 'explain' ? 'Did you cover the key idea?' : 'Override:'}</span>
                <button className={`btn small ${r.correct === true ? 'primary' : ''}`} onClick={() => grade(q.id, true)}>
                  I had it
                </button>
                <button className={`btn small ${r.correct === false ? 'danger' : ''}`} onClick={() => grade(q.id, false)}>
                  Missed it
                </button>
              </div>
            )}
            <button className="btn primary wide" disabled={r.correct == null} onClick={next}>
              {i < questions.length - 1 ? 'Next question' : 'See results'}
            </button>
          </div>
        )}

        {mode === 'exam' && (
          <div className="row between">
            <button className="btn small ghost" disabled={i === 0} onClick={() => setI(i - 1)}>
              <ArrowLeft size={14} /> Back
            </button>
            <span className="muted small">{Object.keys(responses).length} answered</span>
            {i < questions.length - 1 ? (
              <button className="btn small" onClick={() => setI(i + 1)}>
                {r ? 'Next' : 'Skip'} <ArrowRight size={14} />
              </button>
            ) : (
              <button className="btn small primary" onClick={finish}>
                Submit exam
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ExamQuestionView({
  q,
  response,
  locked,
  examMode,
  onAnswer,
}: {
  q: ExamQuestion;
  response?: Response;
  locked: boolean;
  examMode: boolean;
  onAnswer: (given: string) => void;
}) {
  const [text, setText] = useState(response?.given ?? '');
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    ref.current?.focus();
  }, []);
  const isChoice = q.type === 'mcq' || q.type === 'tf';

  return (
    <div className="question">
      <div className="eyebrow muted">
        {QTYPE_LABEL[q.type]}
        {q.lead !== QTYPE_LABEL[q.type] ? ` · ${q.lead}` : ''}
      </div>
      <p className="q-front">{q.prompt}</p>
      {q.detail && <blockquote className="q-detail">{q.detail}</blockquote>}

      {isChoice ? (
        <div className={`choices ${q.type === 'tf' ? 'tf' : ''}`}>
          {q.options!.map((o, idx) => {
            const chosen = response?.given === o;
            const state = locked ? (o === q.answer ? 'is-right' : chosen ? 'is-wrong' : '') : chosen ? 'is-chosen' : '';
            return (
              <button key={o} className={`choice ${state}`} disabled={locked} onClick={() => onAnswer(o)}>
                {q.type === 'mcq' && <span className="choice-letter">{String.fromCharCode(65 + idx)}</span>}
                {o}
              </button>
            );
          })}
        </div>
      ) : (
        !locked && (
          <>
            <textarea
              ref={ref}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={q.type === 'explain' ? 4 : 2}
              placeholder={q.type === 'explain' ? 'Write your explanation…' : 'Type your answer…'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && q.type !== 'explain') {
                  e.preventDefault();
                  onAnswer(text.trim());
                }
              }}
              onBlur={() => examMode && text.trim() && onAnswer(text.trim())}
            />
            {!examMode && (
              <button className="btn primary wide" onClick={() => onAnswer(text.trim())}>
                {text.trim() ? 'Check' : 'Show answer'}
              </button>
            )}
            {examMode && (
              <button className="btn wide" onClick={() => onAnswer(text.trim())} disabled={!text.trim()}>
                {response?.given === text.trim() && text.trim() ? 'Saved ✓' : 'Save answer'}
              </button>
            )}
          </>
        )
      )}
      {locked && !isChoice && response?.given && (
        <p className="small">
          <span className="muted">You wrote: </span>
          {response.given}
        </p>
      )}
    </div>
  );
}
