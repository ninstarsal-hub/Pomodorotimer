import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ImagePlus, Pencil, Trash2, X } from 'lucide-react';
import { useStore } from '../store';
import type { Deck, Diagram } from '../lib/types';
import { deckSections, sectionLabel } from '../lib/quiz';
import { deleteBlob, getBlob, putBlob, uid } from '../lib/storage';
import { diagramBlobKey } from '../lib/diagrams';

/* ---------- image loading (object URLs cached per diagram) ---------- */

const urls = new Map<string, string>();

function useDiagramUrl(id: string) {
  const [url, setUrl] = useState(() => urls.get(id) ?? null);
  const [arrived, setArrived] = useState(0);
  useEffect(() => {
    // An image synced from another device can land after this mounts.
    const on = (e: Event) => (e as CustomEvent<string>).detail === diagramBlobKey(id) && setArrived((n) => n + 1);
    window.addEventListener('stillpoint:blob', on);
    return () => window.removeEventListener('stillpoint:blob', on);
  }, [id]);
  useEffect(() => {
    if (urls.has(id)) return setUrl(urls.get(id)!);
    let live = true;
    void getBlob(diagramBlobKey(id)).then((b) => {
      if (!b || !live) return;
      const u = URL.createObjectURL(b);
      urls.set(id, u);
      setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [id, arrived]);
  return url;
}

/** The diagram with every label covered; the asked-about one is highlighted, and uncovered once revealed. */
export function DiagramView({ diagramId, boxId, reveal }: { diagramId: string; boxId: string; reveal: boolean }) {
  const { diagrams } = useStore();
  const d = diagrams.find((x) => x.id === diagramId);
  const url = useDiagramUrl(diagramId);
  if (!d) return null;
  return (
    <div className="diagram-view">
      {url ? <img src={url} alt={d.title} draggable={false} /> : <div className="diagram-loading muted small">Loading diagram…</div>}
      {url &&
        d.boxes.map((b) => {
          const target = b.id === boxId;
          return (
            <span
              key={b.id}
              className={`dmask ${target ? 'is-target' : ''} ${target && reveal ? 'is-revealed' : ''}`}
              style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
            >
              {target && !reveal ? '?' : ''}
            </span>
          );
        })}
    </div>
  );
}

/* ---------- list + editor inside a notes set ---------- */

export function DiagramList({ deck }: { deck: Deck }) {
  const { diagrams, setDiagrams } = useStore();
  const mine = diagrams.filter((d) => d.deckId === deck.id);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState<{ diagram: Diagram; isNew: boolean } | null>(null);
  const [error, setError] = useState('');

  const add = async (file: File) => {
    setError('');
    if (!file.type.startsWith('image/')) return setError('Choose an image (PNG, JPG, WebP…). For a PDF page, take a screenshot of it first.');
    if (file.size > 12 * 1024 * 1024) return setError('Please choose an image under 12 MB.');
    const id = uid();
    try {
      await putBlob(diagramBlobKey(id), file);
    } catch {
      return setError('Couldn’t save that image in this browser.');
    }
    const sections = deckSections(deck);
    setEditing({ diagram: { id, deckId: deck.id, section: sections[0] ?? '', title: file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' '), boxes: [], createdAt: Date.now() }, isNew: true });
  };

  const remove = (d: Diagram) => {
    if (!confirm(`Delete the diagram “${d.title}” and its questions?`)) return;
    setDiagrams((ds) => ds.filter((x) => x.id !== d.id));
    void deleteBlob(diagramBlobKey(d.id));
    urls.delete(d.id);
  };

  return (
    <div className="diagram-list">
      <div className="row between">
        <span className="field-label">Diagrams</span>
        <button className="btn small" onClick={() => fileRef.current?.click()}>
          <ImagePlus size={13} /> Add diagram
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void add(f);
            e.target.value = '';
          }}
        />
      </div>
      {mine.length === 0 ? (
        <p className="muted small">Upload a labelled diagram (a cell, a map, an anatomy chart), draw boxes over the labels, and Stillpoint quizzes you on each hidden part.</p>
      ) : (
        <ul className="task-list">
          {mine.map((d) => (
            <li key={d.id} className="task">
              <span className="task-title">
                {d.title} <span className="muted small">· {d.boxes.filter((b) => b.label.trim()).length} labels{d.section ? ` · ${sectionLabel(d.section, deck)}` : ''}</span>
              </span>
              <button className="icon-btn small" onClick={() => setEditing({ diagram: d, isNew: false })} aria-label="Edit diagram">
                <Pencil size={13} />
              </button>
              <button className="icon-btn small" onClick={() => remove(d)} aria-label="Delete diagram">
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p className="error small">{error}</p>}
      {editing &&
        createPortal(
        <DiagramEditor
          deck={deck}
          initial={editing.diagram}
          onCancel={() => {
            if (editing.isNew) void deleteBlob(diagramBlobKey(editing.diagram.id));
            setEditing(null);
          }}
          onSave={(d) => {
            setDiagrams((ds) => (ds.some((x) => x.id === d.id) ? ds.map((x) => (x.id === d.id ? d : x)) : [...ds, d]));
            setEditing(null);
          }}
        />,
          document.body,
        )}
    </div>
  );
}

type Box = Diagram['boxes'][number];

function DiagramEditor({ deck, initial, onCancel, onSave }: { deck: Deck; initial: Diagram; onCancel: () => void; onSave: (d: Diagram) => void }) {
  const [d, setD] = useState(initial);
  const [draft, setDraft] = useState<Box | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const start = useRef<{ x: number; y: number } | null>(null);
  const area = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLInputElement>());
  const url = useDiagramUrl(d.id);
  const sections = deckSections(deck);

  const pt = (e: React.PointerEvent) => {
    const r = area.current!.getBoundingClientRect();
    return { x: Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)), y: Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)) };
  };
  const down = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('.dbox')) return;
    area.current!.setPointerCapture(e.pointerId);
    start.current = pt(e);
    setDraft({ id: uid(), x: start.current.x, y: start.current.y, w: 0, h: 0, label: '' });
  };
  const move = (e: React.PointerEvent) => {
    if (!start.current) return;
    const p = pt(e);
    const s = start.current;
    setDraft((b) => b && { ...b, x: Math.min(s.x, p.x), y: Math.min(s.y, p.y), w: Math.abs(p.x - s.x), h: Math.abs(p.y - s.y) });
  };
  const up = () => {
    start.current = null;
    if (draft && draft.w > 0.01 && draft.h > 0.01) {
      setD((x) => ({ ...x, boxes: [...x.boxes, draft] }));
      setSelected(draft.id);
      setTimeout(() => labelRefs.current.get(draft.id)?.focus(), 30);
    }
    setDraft(null);
  };
  const setBox = (id: string, patch: Partial<Box>) => setD((x) => ({ ...x, boxes: x.boxes.map((b) => (b.id === id ? { ...b, ...patch } : b)) }));
  const removeBox = (id: string) => setD((x) => ({ ...x, boxes: x.boxes.filter((b) => b.id !== id) }));
  const labelled = d.boxes.filter((b) => b.label.trim()).length;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Diagram editor">
      <div className="modal diagram-editor">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Diagram</div>
            <h3>Cover the labels</h3>
          </div>
          <button className="icon-btn" onClick={onCancel} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <div className="row">
          <input className="grow" value={d.title} onChange={(e) => setD({ ...d, title: e.target.value })} placeholder="Title (e.g. Animal cell)" aria-label="Diagram title" />
          {sections.length > 1 && (
            <select value={d.section} onChange={(e) => setD({ ...d, section: e.target.value })} aria-label="Section">
              {sections.map((s) => (
                <option key={s} value={s}>
                  {sectionLabel(s, deck)}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="muted small">Drag on the image to draw a box over each label, then type what it says. Each box becomes a question.</p>
        <div className="diagram-canvas" ref={area} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
          {url ? <img src={url} alt="" draggable={false} /> : <div className="diagram-loading muted small">Loading…</div>}
          {d.boxes.map((b, i) => (
            <span
              key={b.id}
              className={`dbox ${selected === b.id ? 'is-selected' : ''} ${b.label.trim() ? '' : 'is-empty'}`}
              style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%` }}
              onPointerDown={() => {
                setSelected(b.id);
                labelRefs.current.get(b.id)?.focus();
              }}
            >
              {i + 1}
            </span>
          ))}
          {draft && <span className="dbox is-draft" style={{ left: `${draft.x * 100}%`, top: `${draft.y * 100}%`, width: `${draft.w * 100}%`, height: `${draft.h * 100}%` }} />}
        </div>
        {d.boxes.length > 0 && (
          <ol className="dbox-list">
            {d.boxes.map((b, i) => (
              <li key={b.id} className={selected === b.id ? 'is-selected' : ''}>
                <span className="muted small">{i + 1}</span>
                <input
                  ref={(el) => {
                    if (el) labelRefs.current.set(b.id, el);
                    else labelRefs.current.delete(b.id);
                  }}
                  className="grow"
                  value={b.label}
                  onFocus={() => setSelected(b.id)}
                  onChange={(e) => setBox(b.id, { label: e.target.value })}
                  placeholder="What's under this box?"
                  aria-label={`Label ${i + 1}`}
                />
                <button className="icon-btn small" onClick={() => removeBox(b.id)} aria-label={`Remove box ${i + 1}`}>
                  <Trash2 size={13} />
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className="row">
          <button className="btn primary" disabled={!labelled || !d.title.trim()} onClick={() => onSave({ ...d, title: d.title.trim(), boxes: d.boxes.filter((b) => b.label.trim()) })}>
            Save {labelled ? `${labelled} question${labelled === 1 ? '' : 's'}` : 'diagram'}
          </button>
          <button className="btn ghost" onClick={onCancel}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
