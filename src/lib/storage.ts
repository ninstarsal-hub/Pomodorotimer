import { useEffect, useRef, useState } from 'react';

const PREFIX = 'stillpoint:';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    const parsed = JSON.parse(raw);
    // Merge objects with defaults so newly added fields get sensible values.
    if (isPlainObject(fallback) && isPlainObject(parsed)) return { ...fallback, ...parsed } as T;
    return parsed as T;
  } catch {
    return fallback;
  }
}

/* ---------- change tracking (for account sync) ---------- */

/** Keys that describe this device only, never synced. */
export const LOCAL_ONLY = new Set(['timer', 'lastBackup', 'backupSnooze', 'installDismissed', 'syncMeta', 'syncSince', 'syncUser']);
const META = PREFIX + 'syncMeta';

/** When each key last changed on this device (ms). Used to keep the newest copy when syncing. */
export function readMeta(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(META) ?? '{}');
  } catch {
    return {};
  }
}
export function touchKeys(keys: string[], t = Date.now()) {
  const m = readMeta();
  for (const k of keys) m[k] = t;
  try {
    localStorage.setItem(META, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

type SaveListener = (key: string) => void;
const saveListeners = new Set<SaveListener>();
/** Sync subscribes here to hear about local changes. */
export function onLocalSave(l: SaveListener) {
  saveListeners.add(l);
  return () => void saveListeners.delete(l);
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
    if (!LOCAL_ONLY.has(key)) {
      touchKeys([key]);
      saveListeners.forEach((l) => l(key));
    }
  } catch {
    /* quota exceeded or storage blocked — the app keeps working in memory */
  }
}

/** Write values that came from another device, then tell the open app to pick them up (without echoing them back). */
export function applyRemote(entries: Record<string, { v: string; t: number }>) {
  const m = readMeta();
  const changed: string[] = [];
  for (const [k, { v, t }] of Object.entries(entries)) {
    if (LOCAL_ONLY.has(k)) continue;
    try {
      localStorage.setItem(PREFIX + k, v);
      m[k] = t;
      changed.push(k);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.setItem(META, JSON.stringify(m));
  } catch {
    /* ignore */
  }
  if (changed.length) window.dispatchEvent(new CustomEvent('stillpoint:remote', { detail: changed }));
}

export function usePersistentState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => load(key, initial));
  const first = useRef(true);
  const fromRemote = useRef(false);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    // A value that just arrived from another device is already saved — don't re-save it as a new local change.
    if (fromRemote.current) {
      fromRemote.current = false;
      return;
    }
    save(key, value);
  }, [key, value]);
  useEffect(() => {
    const on = (e: Event) => {
      if (!(e as CustomEvent<string[]>).detail.includes(key)) return;
      fromRemote.current = true;
      setValue(load(key, initial));
    };
    window.addEventListener('stillpoint:remote', on);
    return () => window.removeEventListener('stillpoint:remote', on);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return [value, setValue] as const;
}

/* ---------- IndexedDB for large blobs (custom background images) ---------- */

const DB_NAME = 'stillpoint';
const STORE = 'blobs';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

type BlobListener = (key: string, blob: Blob | null) => void;
const blobListeners = new Set<BlobListener>();
/** Sync subscribes here to upload/remove images. */
export function onBlobChange(l: BlobListener) {
  blobListeners.add(l);
  return () => void blobListeners.delete(l);
}

/** Store an image that came from another device (no re-upload). */
export async function putBlobFromRemote(key: string, blob: Blob) {
  await putBlobRaw(key, blob);
  window.dispatchEvent(new CustomEvent('stillpoint:blob', { detail: key }));
}

export async function putBlob(key: string, blob: Blob) {
  await putBlobRaw(key, blob);
  blobListeners.forEach((l) => l(key, blob));
}

async function putBlobRaw(key: string, blob: Blob) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(blob, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getBlob(key: string): Promise<Blob | null> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function deleteBlob(key: string) {
  blobListeners.forEach((l) => l(key, null));
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* nothing to delete */
  }
}

export async function listBlobKeys(): Promise<string[]> {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAllKeys();
      req.onsuccess = () => resolve(req.result.map(String));
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

/* ---------- small helpers ---------- */

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);

export function dayKey(d: Date = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fmtClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function fmtMinutes(min: number) {
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}
