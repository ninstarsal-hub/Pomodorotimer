import { useEffect, useState } from 'react';

/*
 * Undo for deletes: the item disappears at once, and a toast offers to bring it back for a few seconds.
 * Anything that can't be taken back (deleting a stored image) waits in `commit` until the chance to undo has passed.
 */

interface Pending {
  id: number;
  message: string;
  restore: () => void;
  commit?: () => void;
}

const UNDO_MS = 7000;
let current: Pending | null = null;
let timer = 0;
let seq = 0;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function finish() {
  if (!current) return;
  window.clearTimeout(timer);
  const c = current;
  current = null;
  c.commit?.();
  emit();
}

export function offerUndo(message: string, restore: () => void, commit?: () => void) {
  finish();
  current = { id: ++seq, message, restore, commit };
  timer = window.setTimeout(finish, UNDO_MS);
  emit();
}

export function undo() {
  if (!current) return;
  window.clearTimeout(timer);
  const c = current;
  current = null;
  c.restore();
  emit();
}

export const dismissUndo = finish;

if (typeof window !== 'undefined') window.addEventListener('pagehide', finish);

export function useUndo() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return current;
}

/** Put an item back where it was (unless it's already there). */
export function insertAt<T extends { id: string }>(list: T[], item: T, index: number): T[] {
  if (list.some((x) => x.id === item.id)) return list;
  const i = Math.max(0, Math.min(index, list.length));
  return [...list.slice(0, i), item, ...list.slice(i)];
}
