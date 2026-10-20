import { useEffect } from 'react';
import { RotateCcw, X } from 'lucide-react';
import { dismissUndo, undo, useUndo } from '../lib/undo';

export function UndoToast() {
  const pending = useUndo();

  // Ctrl/Cmd+Z while the toast is up (but not while typing, where it undoes text).
  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pending]);

  if (!pending) return null;
  return (
    <div className="update-toast undo-toast" role="status" key={pending.id}>
      <span className="truncate">{pending.message}</span>
      <button className="btn small" onClick={undo}>
        <RotateCcw size={13} /> Undo
      </button>
      <button className="icon-btn small" onClick={dismissUndo} aria-label="Dismiss">
        <X size={14} />
      </button>
    </div>
  );
}
