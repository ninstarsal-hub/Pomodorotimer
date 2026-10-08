import { useEffect, useMemo, useState } from 'react';
import { Check, HelpCircle, X } from 'lucide-react';
import { useStore } from '../store';
import { checkAnswer, deckSections, sectionLabel } from '../lib/quiz';
import { MISTAKES, logAttempt, type MistakeType, type ProblemResult } from '../lib/problems';
import { MathText } from './MathText';

/** Work through practice problems one at a time: solve on paper, log the result, tag mistakes. */
export function PracticeRunner() {
  const { practiceRun, setPracticeRun, problemSets, updateProblem, decks } = useStore();
  const refs = practiceRun?.refs ?? [];
  const [i, setI] = useState(0);
  const [results, setResults] = useState<ProblemResult[]>([]);
  const [result, setResult] = useState<ProblemResult | null>(null);
  const [mistake, setMistake] = useState<MistakeType | null>(null);
  const [note, setNote] = useState('');
  const [given, setGiven] = useState('');
  const [checked, setChecked] = useState<boolean | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  const close = () => setPracticeRun(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const current = useMemo(() => {
    const ref = refs[i];
    if (!ref) return null;
    const set = problemSets.find((s) => s.id === ref.setId);
    const problem = set?.problems.find((p) => p.id === ref.problemId);
    return set && problem ? { set, problem } : null;
  }, [refs, i, problemSets]);

  if (!practiceRun) return null;
  const done = i >= refs.length;

  const reset = () => {
    setResult(null);
    setMistake(null);
    setNote('');
    setGiven('');
    setChecked(null);
    setShowAnswer(false);
  };

  const save = () => {
    if (!current || !result) return;
    updateProblem(current.set.id, current.problem.id, (p) =>
      logAttempt(p, { at: Date.now(), result, mistake: result === 'right' ? undefined : (mistake ?? undefined), note: note.trim() || undefined }),
    );
    setResults((r) => [...r, result]);
    reset();
    setI((x) => x + 1);
  };

  const where = (setTitle: string, deckId?: string, section?: string) => {
    const d = decks.find((x) => x.id === deckId);
    const sec = d && section !== undefined && deckSections(d).length > 1 ? sectionLabel(section, d) : '';
    return [setTitle, d?.title, sec].filter(Boolean).join(' · ');
  };

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label={practiceRun.title}>
      <div className="modal quiz practice">
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              {practiceRun.title}
              {!done && refs.length > 1 ? ` · ${i + 1} of ${refs.length}` : ''}
            </div>
            {current && <div className="muted small">{where(current.set.title, current.set.deckId, current.set.section)}</div>}
          </div>
          <button className="icon-btn" onClick={close} aria-label="Close practice">
            <X size={18} />
          </button>
        </div>
        {refs.length > 1 && (
          <div className="quiz-progress">
            <span style={{ width: `${(Math.min(i, refs.length) / refs.length) * 100}%` }} />
          </div>
        )}

        {done || !current ? (
          <div className="quiz-done">
            <div className="score">
              {results.filter((r) => r === 'right').length}/{results.length}
            </div>
            <p>
              {results.every((r) => r === 'right')
                ? 'All right. Problems you get right on a re-solve come back less often until they’re retired.'
                : 'Missed problems come back tomorrow to re-solve without looking at the solution — that’s where the learning happens.'}
            </p>
            <button className="btn primary wide" onClick={close}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="problem-head">
              <span className="problem-label">{current.problem.label}</span>
              {current.problem.attempts.length > 0 && (
                <span className="muted small">
                  Attempt {current.problem.attempts.length + 1} · last: {current.problem.attempts[current.problem.attempts.length - 1].result === 'right' ? 'right' : 'missed'}
                </span>
              )}
            </div>
            {current.problem.prompt ? (
              <MathText as="p" className="q-front" text={current.problem.prompt} />
            ) : (
              <p className="muted">Solve this problem from your textbook or worksheet on paper — without looking at the solution — then log how it went.</p>
            )}

            {current.problem.answer && (
              <div className="stack-sm">
                <div className="row">
                  <input
                    className="grow"
                    value={given}
                    onChange={(e) => {
                      setGiven(e.target.value);
                      setChecked(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && given.trim()) {
                        const ok = checkAnswer(given, current.problem.answer!);
                        setChecked(ok);
                        setResult(ok ? 'right' : 'wrong');
                      }
                    }}
                    placeholder="Your final answer (e.g. 3/4, 2x+1, x = -2)"
                    aria-label="Your answer"
                  />
                  <button
                    className="btn"
                    disabled={!given.trim()}
                    onClick={() => {
                      const ok = checkAnswer(given, current.problem.answer!);
                      setChecked(ok);
                      setResult(ok ? 'right' : 'wrong');
                    }}
                  >
                    Check
                  </button>
                </div>
                {checked !== null && (
                  <div className={`verdict ${checked ? 'ok' : 'bad'}`}>
                    {checked ? <Check size={14} /> : <X size={14} />} {checked ? 'Matches the answer' : 'Doesn’t match'}
                  </div>
                )}
                {(checked !== null || showAnswer) && (
                  <div className="small">
                    <span className="muted">Answer: </span>
                    <MathText text={current.problem.answer} />
                  </div>
                )}
                {checked === null && !showAnswer && (
                  <button className="link-btn small" onClick={() => setShowAnswer(true)}>
                    Show answer
                  </button>
                )}
              </div>
            )}

            <div className="field-label">How did it go?</div>
            <div className="result-row">
              <button className={`result-btn ok ${result === 'right' ? 'is-active' : ''}`} onClick={() => setResult('right')}>
                <Check size={16} /> Got it right
              </button>
              <button className={`result-btn bad ${result === 'wrong' ? 'is-active' : ''}`} onClick={() => setResult('wrong')}>
                <X size={16} /> Got it wrong
              </button>
              <button className={`result-btn help ${result === 'help' ? 'is-active' : ''}`} onClick={() => setResult('help')}>
                <HelpCircle size={16} /> Needed help
              </button>
            </div>

            {result && result !== 'right' && (
              <div className="stack-sm">
                <div className="field-label">What went wrong?</div>
                <div className="row wrap">
                  {MISTAKES.map((m) => (
                    <button key={m.id} className={`chip ${mistake === m.id ? 'is-active' : ''}`} title={m.hint} onClick={() => setMistake(m.id)}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note to future you (e.g. “forgot the chain rule on the inner function”)" aria-label="Mistake note" />
              </div>
            )}

            <button className="btn primary wide" disabled={!result} onClick={save}>
              {i < refs.length - 1 ? 'Save & next problem' : 'Save'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
