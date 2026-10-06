import { useMemo, useRef, useState } from 'react';
import { Brain, ChevronDown, FileUp, ListChecks, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { buildQuiz, deckSections, isDue, sectionLabel } from '../lib/quiz';
import { uid } from '../lib/storage';
import { SAMPLE_NOTES } from '../lib/content';
import { ACCEPTED_FILES, ImportError, extractText, titleFromFile } from '../lib/importers';
import type { Deck } from '../lib/types';

export function NotesPanel() {
  const { decks, setDecks, cards, unlocked, reviews, setTasks, setQuiz, setBuilderOpen } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // "Due" and quizzes only count sections you've studied (or are studying now).
  const stats = useMemo(() => {
    const m: Record<string, { total: number; unlocked: number; due: number; mastered: number }> = {};
    for (const c of cards) {
      const s = (m[c.deckId] ??= { total: 0, unlocked: 0, due: 0, mastered: 0 });
      s.total++;
      if ((reviews[c.id]?.box ?? 0) >= 3) s.mastered++;
    }
    for (const c of unlocked) {
      const s = m[c.deckId];
      s.unlocked++;
      if (isDue(reviews[c.id])) s.due++;
    }
    return m;
  }, [cards, unlocked, reviews]);

  const totalDue = Object.values(stats).reduce((a, s) => a + s.due, 0);

  const quiz = (pool: typeof cards, n: number, title: string, subtitle?: string) => {
    const items = buildQuiz(pool, reviews, n);
    if (items.length) setQuiz({ items, title, subtitle });
  };

  const create = (content = '', title = 'Untitled notes', subject = '', open = true) => {
    const d: Deck = { id: uid(), title, subject, content, autoCloze: true, createdAt: Date.now() };
    setDecks((ds) => [d, ...ds]);
    if (open) setEditing(d.id);
    return d;
  };

  const importFiles = async (files: FileList | File[]) => {
    setImportError('');
    const errors: string[] = [];
    for (const file of Array.from(files)) {
      setImporting(file.name);
      try {
        const text = await extractText(file);
        if (!text) throw new ImportError('No text found in this file.');
        create(text, titleFromFile(file), '', false);
      } catch (e) {
        errors.push(`${file.name}: ${e instanceof ImportError ? e.message : 'couldn’t read this file.'}`);
      }
    }
    setImporting(null);
    setImportError(errors.join('\n'));
  };

  const remove = (id: string) => {
    if (!confirm('Delete these notes and their questions?')) return;
    setDecks((ds) => ds.filter((d) => d.id !== id));
    setTasks((ts) => ts.map((t) => (t.deckId === id ? { ...t, deckId: undefined } : t)));
    if (editing === id) setEditing(null);
  };

  return (
    <div
      className={`stack drop-target ${dragging ? 'is-dragging' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (e.dataTransfer.files.length) void importFiles(e.dataTransfer.files);
      }}
    >
      <p className="muted small">
        Upload your notes, slides or study guide (PDF, Word, PowerPoint or text), or paste them in. Stillpoint turns them into review questions, quizzes you at checkpoints, and brings each question back
        just before you’d forget it. Quizzes only cover sections you’ve checked off as studied, plus the one you pick under the timer.
      </p>

      <div className="row wrap">
        <button className="btn primary" onClick={() => fileRef.current?.click()} disabled={!!importing}>
          <FileUp size={16} /> {importing ? 'Importing…' : 'Upload files'}
        </button>
        <button className="btn" onClick={() => create()}>
          <Plus size={16} /> Paste notes
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPTED_FILES}
          hidden
          onChange={(e) => {
            if (e.target.files?.length) void importFiles(e.target.files);
            e.target.value = '';
          }}
        />
        {cards.length > 0 && (
          <button className="btn" onClick={() => setBuilderOpen(true)}>
            <ListChecks size={16} /> Generate quiz
          </button>
        )}
        {unlocked.length > 0 && (
          <button
            className="btn"
            onClick={() =>
              quiz(unlocked, Math.min(10, Math.max(5, totalDue)), 'Review session', totalDue ? `${totalDue} question${totalDue === 1 ? '' : 's'} due from sections you’ve studied.` : 'Nothing due — extra practice on sections you’ve studied.')
            }
          >
            <Shuffle size={16} /> Review {totalDue ? `${totalDue} due` : 'all'}
          </button>
        )}
      </div>
      {importing && <p className="muted small">Reading {importing}…</p>}
      {importError && <p className="error small pre">{importError}</p>}
      <p className="muted small drop-hint">Tip: you can also drag files onto this panel.</p>

      {decks.length === 0 && (
        <div className="card empty-card">
          <p>No notes yet.</p>
          <button className="link-btn" onClick={() => create(SAMPLE_NOTES, 'Example: Biology', 'Biology')}>
            Try it with example biology notes →
          </button>
        </div>
      )}

      {decks.map((d) => {
        const s = stats[d.id] ?? { total: 0, unlocked: 0, due: 0, mastered: 0 };
        const sections = deckSections(d);
        const studiedCount = sections.filter((x) => d.studied?.includes(x)).length;
        const open = editing === d.id;
        return (
          <div key={d.id} className={`card deck ${open ? 'is-open' : ''}`}>
            <div className="row between">
              <button className="deck-head" onClick={() => setEditing(open ? null : d.id)}>
                <strong>{d.title}</strong>
                <span className="muted small">
                  {d.subject && <span className="tag">{d.subject}</span>}
{' '}
                  {sections.length > 1 && `${studiedCount}/${sections.length} sections studied · `}
                  {s.total} question{s.total === 1 ? '' : 's'} · {s.due} due · {s.mastered} mastered
                </span>
              </button>
              <div className="row">
                <button
                  className="btn small"
                  disabled={!s.unlocked}
                  title={s.unlocked ? 'Quiz on the sections you’ve studied' : 'Mark a section as studied first'}
                  onClick={() => quiz(unlocked.filter((c) => c.deckId === d.id), 5, `Quiz · ${d.title}`, 'Only sections you’ve studied.')}
                >
                  <Brain size={14} /> Quiz
                </button>
                <button className="icon-btn small" onClick={() => setEditing(open ? null : d.id)} aria-label="Edit notes">
                  {open ? <ChevronDown size={14} /> : <Pencil size={14} />}
                </button>
              </div>
            </div>
            {open ? (
              <DeckEditor deck={d} onRemove={() => remove(d.id)} />
            ) : (
              !s.unlocked &&
              s.total > 0 && (
                <button className="link-btn small" onClick={() => setEditing(d.id)}>
                  Mark what you’ve studied to start quizzing →
                </button>
              )
            )}
            {s.total > 0 && (
              <div className="mastery" title={`${s.mastered} of ${s.total} mastered`}>
                <span style={{ width: `${(s.mastered / s.total) * 100}%` }} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function DeckEditor({ deck, onRemove }: { deck: Deck; onRemove: () => void }) {
  const { setDecks, cards } = useStore();
  const shown = cards.filter((c) => c.deckId === deck.id);
  const [showCards, setShowCards] = useState(false);
  const update = (patch: Partial<Deck>) => setDecks((ds) => ds.map((d) => (d.id === deck.id ? { ...d, ...patch } : d)));

  return (
    <div className="deck-editor stack-sm">
      <SectionList deck={deck} />
      <div className="row">
        <input className="grow" value={deck.title} onChange={(e) => update({ title: e.target.value })} aria-label="Title" placeholder="Title" />
        <input value={deck.subject} onChange={(e) => update({ subject: e.target.value })} aria-label="Subject" placeholder="Subject" style={{ width: 120 }} />
      </div>
      <textarea value={deck.content} onChange={(e) => update({ content: e.target.value })} rows={12} placeholder="Paste or write notes here…" aria-label="Notes" spellCheck />

      <details className="format-help">
        <summary>Formatting tips for better questions</summary>
        <ul>
          <li>
            <code>Term :: definition</code> → flashcard
          </li>
          <li>
            <code>Q: …</code> then <code>A: …</code> on the next line → question
          </li>
          <li>A line ending in <code>?</code> with the answer on the next line → question</li>
          <li>
            <code>Term - definition</code> or <code>Term: definition</code> → flashcard
          </li>
          <li>
            Wrap key words in <code>**bold**</code> or <code>==highlight==</code> → fill-in-the-blank
          </li>
          <li>
            <code># Heading</code> → “explain it in your own words” prompt
          </li>
          <li>Instructions like “Read chapter 4” or “Due Friday” are skipped automatically.</li>
        </ul>
      </details>
      <label className="toggle-row">
        <input type="checkbox" checked={deck.autoCloze} onChange={(e) => update({ autoCloze: e.target.checked })} />
        <span>Also auto-generate fill-in-the-blanks from plain sentences</span>
      </label>

      <div className="row between wrap">
        <button className="link-btn" onClick={() => setShowCards((s) => !s)}>
          {showCards ? 'Hide' : 'Preview'} {shown.length} questions
        </button>
        <div className="row">
          <button className="btn small danger" onClick={onRemove}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
      {showCards && (
        <ul className="card-preview">
          {shown.map((c) => (
            <li key={c.id}>
              <span className="row wrap">
                <span className="tag">{c.kind === 'qa' ? 'Short answer' : c.kind === 'cloze' ? (c.auto ? 'Blank · auto' : 'Fill in the blank') : 'Explain'}</span>
              </span>
              <div>{c.front}</div>
              <div className="muted small">
                → {c.back.length > 160 ? c.back.slice(0, 160) + '…' : c.back}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Checklist of a deck's sections: what you've studied, and which one you're on now. */
function SectionList({ deck }: { deck: Deck }) {
  const { cards, studyingNow, setStudyingNow, setStudied } = useStore();
  const sections = deckSections(deck);
  const counts = new Map<string, number>();
  for (const c of cards) if (c.deckId === deck.id) counts.set(c.section, (counts.get(c.section) ?? 0) + 1);
  const single = sections.length === 1;

  return (
    <div className="sections">
      <div className="row between">
        <span className="field-label">{single ? 'Quizzing' : 'Sections'}</span>
        {!single && <span className="muted small">Only checked sections are quizzed</span>}
      </div>
      <ul>
        {sections.map((sec) => {
          const studied = deck.studied?.includes(sec) ?? false;
          const now = studyingNow?.deckId === deck.id && studyingNow.section === sec;
          const n = counts.get(sec) ?? 0;
          return (
            <li key={sec || '__none'} className={now ? 'is-now' : ''}>
              <label className="section-check">
                <input type="checkbox" className="box" checked={studied || now} disabled={now} onChange={(e) => setStudied(deck.id, sec, e.target.checked)} />
                <span className="section-name">{single && !sec ? 'I’ve studied these notes' : sectionLabel(sec, deck)}</span>
              </label>
              <span className="muted small">{n}q</span>
              {now ? (
                <span className="tag now-tag">Studying now</span>
              ) : (
                <button className="btn small ghost" onClick={() => setStudyingNow({ deckId: deck.id, section: sec })} title="Set as the section you're studying now">
                  Study now
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {single && <p className="muted small">Tip: split notes into sections with headings like “# Session 3” or a line like “Lecture 5: Genetics”.</p>}
    </div>
  );
}
