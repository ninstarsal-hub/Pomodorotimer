import { useMemo, useRef, useState } from 'react';
import { Brain, ChevronDown, FileUp, Pencil, Plus, Shuffle, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { isDue } from '../lib/quiz';
import { uid } from '../lib/storage';
import { SAMPLE_NOTES } from '../lib/content';
import { ACCEPTED_FILES, ImportError, extractText, titleFromFile } from '../lib/importers';
import type { Deck } from '../lib/types';

interface Props {
  onQuiz: (n: number, title: string, subtitle?: string, deckIds?: string[]) => boolean;
}

export function NotesPanel({ onQuiz }: Props) {
  const { decks, setDecks, cards, reviews, setTasks } = useStore();
  const [editing, setEditing] = useState<string | null>(null);
  const [importing, setImporting] = useState<string | null>(null);
  const [importError, setImportError] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    const m: Record<string, { total: number; due: number; mastered: number }> = {};
    for (const c of cards) {
      const s = (m[c.deckId] ??= { total: 0, due: 0, mastered: 0 });
      s.total++;
      if (isDue(reviews[c.id])) s.due++;
      if ((reviews[c.id]?.box ?? 0) >= 3) s.mastered++;
    }
    return m;
  }, [cards, reviews]);

  const totalDue = Object.values(stats).reduce((a, s) => a + s.due, 0);

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
        just before you’d forget it. Link a set of notes to a task in Today so the checkpoint quizzes match what you’re working on.
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
          <button className="btn" onClick={() => onQuiz(Math.min(10, Math.max(5, totalDue)), 'Review session', totalDue ? `${totalDue} question${totalDue === 1 ? '' : 's'} due across all notes.` : 'Nothing due — extra practice.')}>
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
        const s = stats[d.id] ?? { total: 0, due: 0, mastered: 0 };
        const open = editing === d.id;
        return (
          <div key={d.id} className={`card deck ${open ? 'is-open' : ''}`}>
            <div className="row between">
              <button className="deck-head" onClick={() => setEditing(open ? null : d.id)}>
                <strong>{d.title}</strong>
                <span className="muted small">
                  {d.subject && <span className="tag">{d.subject}</span>}
{' '}
                  {s.total} question{s.total === 1 ? '' : 's'} · {s.due} due · {s.mastered} mastered
                </span>
              </button>
              <div className="row">
                <button className="btn small" disabled={!s.total} onClick={() => onQuiz(5, `Quiz · ${d.title}`, undefined, [d.id])}>
                  <Brain size={14} /> Quiz
                </button>
                <button className="icon-btn small" onClick={() => setEditing(open ? null : d.id)} aria-label="Edit notes">
                  {open ? <ChevronDown size={14} /> : <Pencil size={14} />}
                </button>
              </div>
            </div>
            {open && <DeckEditor deck={d} onRemove={() => remove(d.id)} />}
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
