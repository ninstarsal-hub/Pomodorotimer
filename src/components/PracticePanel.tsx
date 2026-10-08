import { useMemo, useState } from 'react';
import { Pencil, Plus, Repeat, Shuffle, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { uid } from '../lib/storage';
import { deckSections, sectionLabel } from '../lib/quiz';
import { lastResult, parseRange, pickMixed, status, type Problem, type ProblemSet } from '../lib/problems';
import { MathText } from './MathText';

/** Problems due for a re-solve across all sets. */
export function useDueProblems() {
  const { problemSets } = useStore();
  return useMemo(() => {
    const now = Date.now();
    return problemSets.flatMap((s) => s.problems.filter((p) => status(p, now) === 'due').map((p) => ({ setId: s.id, problemId: p.id })));
  }, [problemSets]);
}

const newProblem = (label: string): Problem => ({ id: uid(), label, attempts: [], streak: 0, due: null });

export function PracticePanel() {
  const { problemSets, setProblemSets, decks, setPracticeRun, studyingNow } = useStore();
  const due = useDueProblems();
  const [mixN, setMixN] = useState(5);
  const [mixSets, setMixSets] = useState<string[] | null>(null); // null = all
  const [form, setForm] = useState({ title: '', range: '', deckId: studyingNow?.deckId ?? '', section: studyingNow?.section ?? '' });
  const deck = decks.find((d) => d.id === form.deckId);
  // The chosen section, or the deck's first one if the stored value doesn't belong to this deck.
  const section = deck ? (deckSections(deck).includes(form.section) ? form.section : deckSections(deck)[0]) : undefined;
  const preview = parseRange(form.range);

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!preview.length) return;
    const set: ProblemSet = {
      id: uid(),
      title: form.title.trim() || (deck ? `${deck.title} problems` : 'Practice problems'),
      deckId: deck?.id,
      section,
      problems: preview.map(newProblem),
      createdAt: Date.now(),
    };
    setProblemSets((ss) => [set, ...ss]);
    setForm((f) => ({ ...f, title: '', range: '' }));
  };

  const chosen = problemSets.filter((s) => !mixSets || mixSets.includes(s.id));
  const startMixed = () => {
    let refs = pickMixed(chosen, mixN);
    if (!refs.length) refs = pickMixed(chosen, mixN, true);
    if (refs.length) setPracticeRun({ refs, title: 'Mixed practice' });
  };

  return (
    <div className="stack">
      <p className="muted small">
        For math, physics, chem — anything you learn by solving problems. Log textbook or worksheet problems, mark each one right, wrong or “needed help”, and tag what went wrong. Missed problems come back to re-solve after 1, 3 and 7 days until you get them right three times in a row.
      </p>

      {due.length > 0 && (
        <button className="btn primary" onClick={() => setPracticeRun({ refs: due, title: 'Re-solve' })}>
          <Repeat size={16} /> Re-solve {due.length} missed problem{due.length === 1 ? '' : 's'}
        </button>
      )}

      {problemSets.length > 0 && (
        <section className="card">
          <div className="eyebrow">Mixed practice</div>
          <p className="muted small">Problems drawn across sets in random order, so you practise recognising which method to use — the skill exams actually test.</p>
          {problemSets.length > 1 && (
            <div className="row wrap">
              {problemSets.map((s) => {
                const on = !mixSets || mixSets.includes(s.id);
                return (
                  <button
                    key={s.id}
                    className={`chip ${on ? 'is-active' : ''}`}
                    onClick={() => {
                      const cur = mixSets ?? problemSets.map((x) => x.id);
                      const next = on ? cur.filter((x) => x !== s.id) : [...cur, s.id];
                      setMixSets(next.length === problemSets.length ? null : next);
                    }}
                  >
                    {s.title}
                  </button>
                );
              })}
            </div>
          )}
          <div className="row">
            {[3, 5, 10, 15].map((n) => (
              <button key={n} className={`chip ${mixN === n ? 'is-active' : ''}`} onClick={() => setMixN(n)}>
                {n}
              </button>
            ))}
            <span className="grow" />
            <button className="btn" disabled={!chosen.length} onClick={startMixed}>
              <Shuffle size={14} /> Start
            </button>
          </div>
        </section>
      )}

      <form className="card stack-sm" onSubmit={create}>
        <div className="eyebrow">Add a problem set</div>
        <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Name, e.g. Ch 3 practice / Worksheet 5" aria-label="Problem set name" />
        <input value={form.range} onChange={(e) => setForm((f) => ({ ...f, range: e.target.value }))} placeholder="Problems, e.g. 1-29 odd, 34, 40-45" aria-label="Problem numbers" />
        <span className="muted small">{preview.length ? `${preview.length} problems: ${preview.slice(0, 8).join(', ')}${preview.length > 8 ? '…' : ''}` : 'Ranges, odd/even, single numbers and letters like 4a-4d all work.'}</span>
        <div className="row">
          <select className="grow" value={form.deckId} onChange={(e) => setForm((f) => ({ ...f, deckId: e.target.value, section: '' }))} aria-label="Class">
            <option value="">No class / notes</option>
            {decks.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
          {deck && deckSections(deck).length > 1 && (
            <select className="grow" value={section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} aria-label="Section">
              {deckSections(deck).map((s) => (
                <option key={s || '__none'} value={s}>
                  {sectionLabel(s, deck)}
                </option>
              ))}
            </select>
          )}
        </div>
        <button className="btn primary" type="submit" disabled={!preview.length}>
          <Plus size={14} /> Add {preview.length || ''} problems
        </button>
      </form>

      {problemSets.map((s) => (
        <SetCard key={s.id} set={s} />
      ))}
      {!problemSets.length && <p className="empty-state">No problem sets yet. Add the problems you’re assigned (or choose to do) above.</p>}
    </div>
  );
}

function SetCard({ set }: { set: ProblemSet }) {
  const { setProblemSets, setPracticeRun, decks } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [more, setMore] = useState('');
  const now = Date.now();
  const counts = { new: 0, mastered: 0, due: 0, scheduled: 0 };
  for (const p of set.problems) counts[status(p, now)]++;
  const tried = set.problems.filter((p) => p.attempts.length);
  const firstTry = tried.filter((p) => p.attempts[0].result === 'right').length;
  const deck = decks.find((d) => d.id === set.deckId);
  const update = (patch: Partial<ProblemSet>) => setProblemSets((ss) => ss.map((x) => (x.id === set.id ? { ...x, ...patch } : x)));
  const editP = set.problems.find((p) => p.id === editing);

  const chipClass = (p: Problem) => {
    const st = status(p, now);
    if (st === 'new') return 'new';
    if (st === 'due') return 'due';
    if (st === 'mastered') return 'right';
    return lastResult(p) === 'right' ? 'improving' : lastResult(p) === 'help' ? 'help' : 'wrong';
  };

  return (
    <div className="card set-card">
      <div className="row between">
        <div>
          <strong>{set.title}</strong>
          <div className="muted small">
            {[deck?.title, deck && set.section !== undefined && deckSections(deck).length > 1 ? sectionLabel(set.section, deck) : ''].filter(Boolean).join(' · ') || 'No class'} · {tried.length}/{set.problems.length} attempted
            {tried.length > 0 && ` · ${Math.round((firstTry / tried.length) * 100)}% right first try`}
          </div>
        </div>
        <button className="icon-btn small" onClick={() => confirm(`Delete “${set.title}” and its history?`) && setProblemSets((ss) => ss.filter((x) => x.id !== set.id))} aria-label="Delete set">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="problem-grid">
        {set.problems.map((p) => (
          <button
            key={p.id}
            className={`pchip ${chipClass(p)} ${editing === p.id ? 'is-selected' : ''}`}
            onClick={() => setPracticeRun({ refs: [{ setId: set.id, problemId: p.id }], title: 'Practice' })}
            onContextMenu={(e) => {
              e.preventDefault();
              setEditing(p.id);
            }}
            title={`${p.label} — ${chipClass(p) === 'new' ? 'not tried' : chipClass(p) === 'due' ? 're-solve due' : chipClass(p) === 'right' ? 'done' : chipClass(p) === 'improving' ? 'right on re-solve, coming back' : 'missed, coming back'}`}
          >
            {p.label.replace(/^.*#/, '')}
          </button>
        ))}
      </div>
      <div className="legend small muted">
        <span>
          <i className="pchip-dot new" /> not tried
        </span>
        <span>
          <i className="pchip-dot right" /> done
        </span>
        <span>
          <i className="pchip-dot wrong" /> missed
        </span>
        <span>
          <i className="pchip-dot due" /> re-solve due
        </span>
      </div>
      <div className="row wrap">
        {counts.new > 0 && (
          <button className="btn small" onClick={() => setPracticeRun({ refs: set.problems.filter((p) => status(p, now) === 'new').map((p) => ({ setId: set.id, problemId: p.id })), title: set.title })}>
            Work through {counts.new} new
          </button>
        )}
        {counts.due > 0 && (
          <button className="btn small primary" onClick={() => setPracticeRun({ refs: set.problems.filter((p) => status(p, now) === 'due').map((p) => ({ setId: set.id, problemId: p.id })), title: 'Re-solve' })}>
            <Repeat size={12} /> Re-solve {counts.due}
          </button>
        )}
        <button className="btn small ghost" onClick={() => setEditing(editing ? null : set.problems[0]?.id ?? null)}>
          <Pencil size={12} /> {editing ? 'Done editing' : 'Add problem text / answers'}
        </button>
      </div>

      {editing && editP && (
        <div className="stack-sm problem-edit">
          <div className="row">
            <select className="grow" value={editing} onChange={(e) => setEditing(e.target.value)} aria-label="Problem to edit">
              {set.problems.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                  {p.prompt ? ' ✎' : ''}
                </option>
              ))}
            </select>
            <button
              className="btn small ghost"
              onClick={() => {
                update({ problems: set.problems.filter((p) => p.id !== editing) });
                setEditing(null);
              }}
            >
              <Trash2 size={12} /> Remove
            </button>
          </div>
          <textarea
            rows={3}
            value={editP.prompt ?? ''}
            onChange={(e) => update({ problems: set.problems.map((p) => (p.id === editing ? { ...p, prompt: e.target.value || undefined } : p)) })}
            placeholder="Problem text (optional). Math works with $…$, e.g. Solve $x^2 - 5x + 6 = 0$"
            aria-label="Problem text"
          />
          {editP.prompt && <MathText as="div" className="math-preview" text={editP.prompt} />}
          <input
            value={editP.answer ?? ''}
            onChange={(e) => update({ problems: set.problems.map((p) => (p.id === editing ? { ...p, answer: e.target.value || undefined } : p)) })}
            placeholder="Final answer (optional) — checked automatically, e.g. x = 2, 3"
            aria-label="Problem answer"
          />
          {editP.attempts.length > 0 && (
            <ul className="attempt-list small">
              {editP.attempts.map((a, k) => (
                <li key={k}>
                  <span className={`att ${a.result}`}>{a.result === 'right' ? 'Right' : a.result === 'wrong' ? 'Wrong' : 'Needed help'}</span>
                  <span className="muted">{new Date(a.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                  {a.mistake && <span className="tag">{a.mistake}</span>}
                  {a.note && <span className="muted">“{a.note}”</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const labels = parseRange(more).filter((l) => !set.problems.some((p) => p.label === l));
          if (!labels.length) return;
          update({ problems: [...set.problems, ...labels.map(newProblem)] });
          setMore('');
        }}
      >
        <input className="grow" value={more} onChange={(e) => setMore(e.target.value)} placeholder="Add more problems, e.g. 31-35" aria-label="Add problems" />
        <button className="btn small" type="submit" disabled={!parseRange(more).length}>
          <Plus size={12} /> Add
        </button>
      </form>
    </div>
  );
}
