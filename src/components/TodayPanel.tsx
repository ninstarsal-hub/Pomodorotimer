import { useState } from 'react';
import { ArrowRight, Check, Plus, Target, Trash2 } from 'lucide-react';
import { useStore } from '../store';
import { uid } from '../lib/storage';
import type { Task } from '../lib/types';

export function TodayPanel() {
  const { tasks, setTasks, activeTaskId, setActiveTaskId, decks, today, distractions, setDistractions } = useStore();
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [estimate, setEstimate] = useState(2);

  const todays = tasks.filter((t) => t.day === today);
  const carry = tasks.filter((t) => t.day < today && !t.done);
  const open = todays.filter((t) => !t.done);
  const done = todays.filter((t) => t.done);
  const planned = open.reduce((a, t) => a + Math.max(0, t.estimate - t.pomos), 0);
  const subjects = [...new Set(tasks.map((t) => t.subject).filter(Boolean))];

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const t: Task = { id: uid(), title: title.trim(), subject: subject.trim(), estimate, pomos: 0, done: false, day: today, createdAt: Date.now() };
    const deck = decks.find((d) => d.subject && d.subject.toLowerCase() === t.subject.toLowerCase());
    if (deck) t.deckId = deck.id;
    setTasks((ts) => [...ts, t]);
    if (!activeTaskId) setActiveTaskId(t.id);
    setTitle('');
  };

  const update = (id: string, patch: Partial<Task>) => setTasks((ts) => ts.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const remove = (id: string) => {
    setTasks((ts) => ts.filter((t) => t.id !== id));
    if (activeTaskId === id) setActiveTaskId(null);
  };

  const openDistractions = distractions.filter((d) => !d.done);

  return (
    <div className="stack">
      <form className="card add-task" onSubmit={add}>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Add an assignment or task…" aria-label="Task title" />
        <div className="row">
          <input list="subjects" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" aria-label="Subject" className="grow" />
          <datalist id="subjects">
            {subjects.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <label className="estimate" title="Estimated focus blocks">
            <span className="muted small">Blocks</span>
            <input type="number" min={1} max={12} value={estimate} onChange={(e) => setEstimate(Math.max(1, Math.min(12, Number(e.target.value) || 1)))} />
          </label>
          <button className="btn primary" type="submit" aria-label="Add task">
            <Plus size={16} />
          </button>
        </div>
      </form>

      {open.length > 0 && (
        <p className="muted small">
          {open.length} open · ~{planned} focus block{planned === 1 ? '' : 's'} left. Tip: put the hardest task first, while your attention is freshest — and alternate subjects to get the benefits of interleaving.
        </p>
      )}

      <ul className="task-list">
        {open.map((t) => (
          <TaskRow key={t.id} task={t} active={t.id === activeTaskId} decks={decks} onActivate={() => setActiveTaskId(t.id)} onUpdate={(p) => update(t.id, p)} onRemove={() => remove(t.id)} />
        ))}
      </ul>
      {!todays.length && <p className="empty-state">Nothing planned yet. Break big assignments into pieces you can finish in 1–4 focus blocks.</p>}

      {carry.length > 0 && (
        <>
          <h4 className="section-title">From earlier</h4>
          <ul className="task-list">
            {carry.map((t) => (
              <li key={t.id} className="task is-carry">
                <span className="task-title">{t.title}</span>
                <button className="btn small" onClick={() => update(t.id, { day: today })}>
                  Move to today <ArrowRight size={14} />
                </button>
                <button className="icon-btn small" onClick={() => remove(t.id)} aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {done.length > 0 && (
        <>
          <h4 className="section-title">Done today · {done.length}</h4>
          <ul className="task-list">
            {done.map((t) => (
              <TaskRow key={t.id} task={t} active={false} decks={decks} onActivate={() => {}} onUpdate={(p) => update(t.id, p)} onRemove={() => remove(t.id)} />
            ))}
          </ul>
        </>
      )}

      <h4 className="section-title">Parking lot</h4>
      <p className="muted small">Thoughts that popped up mid-focus. Deal with them on a break, not now.</p>
      {openDistractions.length === 0 ? (
        <p className="empty-state">Empty — nice. Use the box at the bottom of the screen to capture stray thoughts.</p>
      ) : (
        <ul className="task-list">
          {openDistractions.map((d) => (
            <li key={d.id} className="task">
              <button className="check" onClick={() => setDistractions((ds) => ds.map((x) => (x.id === d.id ? { ...x, done: true } : x)))} aria-label="Mark handled">
                <Check size={12} />
              </button>
              <span className="task-title">{d.text}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TaskRow({
  task,
  active,
  decks,
  onActivate,
  onUpdate,
  onRemove,
}: {
  task: Task;
  active: boolean;
  decks: { id: string; title: string }[];
  onActivate: () => void;
  onUpdate: (p: Partial<Task>) => void;
  onRemove: () => void;
}) {
  return (
    <li className={`task ${active ? 'is-active' : ''} ${task.done ? 'is-done' : ''}`}>
      <button className={`check ${task.done ? 'is-checked' : ''}`} onClick={() => onUpdate({ done: !task.done })} aria-label={task.done ? 'Mark not done' : 'Mark done'}>
        {task.done && <Check size={12} />}
      </button>
      <div className="task-main" onClick={task.done ? undefined : onActivate}>
        <div className="task-title">{task.title}</div>
        <div className="task-meta">
          {task.subject && <span className="tag">{task.subject}</span>}
          <span className="pips" title={`${task.pomos} of ${task.estimate} focus blocks`}>
            {Array.from({ length: Math.max(task.estimate, task.pomos) }, (_, i) => (
              <span key={i} className={i < task.pomos ? (i >= task.estimate ? 'is-over' : 'is-done') : ''} />
            ))}
          </span>
          {!task.done && decks.length > 0 && (
            <select className="deck-link" value={task.deckId ?? ''} onClick={(e) => e.stopPropagation()} onChange={(e) => onUpdate({ deckId: e.target.value || undefined })} title="Quiz from these notes">
              <option value="">No notes linked</option>
              {decks.map((d) => (
                <option key={d.id} value={d.id}>
                  📓 {d.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>
      {!task.done && (
        <button className={`icon-btn small ${active ? 'is-active' : ''}`} onClick={onActivate} aria-label="Work on this" title="Work on this">
          <Target size={14} />
        </button>
      )}
      <button className="icon-btn small" onClick={onRemove} aria-label="Delete">
        <Trash2 size={14} />
      </button>
    </li>
  );
}
