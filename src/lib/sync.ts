import { useEffect, useState } from 'react';
import { applyRemote, getBlob, listBlobKeys, LOCAL_ONLY, onBlobChange, onLocalSave, putBlobFromRemote, readMeta, touchKeys } from './storage';

/*
 * Account sync (optional): sign in with Google and every saved key is mirrored to your Supabase row,
 * newest change wins per key. Images (diagrams, background) go to Supabase Storage.
 * Off unless VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set at build time.
 */

const PREFIX = 'stillpoint:';
type Entry = { v: string; t: number };
type Entries = Record<string, Entry>;

export interface SyncUser {
  id: string;
  email: string;
}

/** Everything sync needs from a server — Supabase in production, a stand-in in tests. */
export interface SyncBackend {
  getUser(): Promise<SyncUser | null>;
  onAuthChange(cb: (u: SyncUser | null) => void): void;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  /** Save newer entries; returns entries changed on the server since `since`, plus a new cursor. */
  merge(patch: Entries, since: number): Promise<{ entries: Entries; cursor: number }>;
  listFiles(uid: string): Promise<string[]>;
  upload(uid: string, key: string, blob: Blob): Promise<void>;
  download(uid: string, key: string): Promise<Blob | null>;
  removeFiles(uid: string, keys: string[]): Promise<void>;
  deleteAccount(): Promise<void>;
}

// Accept the URL with or without the /rest/v1/ ending Supabase shows on its Data API page.
const URL_ = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const KEY_ = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();
type MockFactory = () => SyncBackend;
const mock = (globalThis as { __STILLPOINT_SYNC_MOCK__?: MockFactory }).__STILLPOINT_SYNC_MOCK__;

export const syncAvailable = !!mock || (!!URL_ && !!KEY_);

/** Supabase is only downloaded once sync is actually used. */
async function supabaseBackend(): Promise<SyncBackend> {
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(URL_!, KEY_!, { auth: { persistSession: true, detectSessionInUrl: true, flowType: 'pkce' } });
  const toUser = (u: { id: string; email?: string } | null | undefined): SyncUser | null => (u ? { id: u.id, email: u.email ?? '' } : null);
  const BUCKET = 'user-files';
  const path = (uid: string, key: string) => `${uid}/${encodeURIComponent(key)}`;
  return {
    async getUser() {
      const { data } = await sb.auth.getSession();
      return toUser(data.session?.user);
    },
    onAuthChange(cb) {
      sb.auth.onAuthStateChange((_e, session) => cb(toUser(session?.user)));
    },
    async signIn() {
      const { error } = await sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: location.origin + '/' } });
      if (error) throw error;
    },
    async signOut() {
      await sb.auth.signOut();
    },
    async merge(patch, since) {
      const { data, error } = await sb.rpc('merge_user_data', { patch, since });
      if (error) throw error;
      return data as { entries: Entries; cursor: number };
    },
    async listFiles(uid) {
      const { data, error } = await sb.storage.from(BUCKET).list(uid, { limit: 1000 });
      if (error) throw error;
      return (data ?? []).map((f) => decodeURIComponent(f.name));
    },
    async upload(uid, key, blob) {
      const { error } = await sb.storage.from(BUCKET).upload(path(uid, key), blob, { upsert: true, contentType: blob.type || 'application/octet-stream' });
      if (error) throw error;
    },
    async download(uid, key) {
      const { data } = await sb.storage.from(BUCKET).download(path(uid, key));
      return data ?? null;
    },
    async removeFiles(uid, keys) {
      if (keys.length) await sb.storage.from(BUCKET).remove(keys.map((k) => path(uid, k)));
    },
    async deleteAccount() {
      const { error } = await sb.rpc('delete_my_account');
      if (error) throw error;
    },
  };
}

/* ---------- state ---------- */

export type SyncStatus = 'off' | 'signed-out' | 'syncing' | 'synced' | 'error' | 'needs-choice';
interface State {
  status: SyncStatus;
  user: SyncUser | null;
  lastSync: number | null;
  error: string;
  /** First sign-in on a device that already has data, while the account has data too. */
  choice: { remoteCount: number } | null;
}
let state: State = { status: syncAvailable ? 'signed-out' : 'off', user: null, lastSync: null, error: '', choice: null };
const listeners = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function useSync() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

let backend: SyncBackend | null = null;
let pendingRemote: Entries | null = null;
const getLocal = (k: string) => localStorage.getItem(PREFIX + k);
const lsGet = getLocal;
const lsSet = (k: string, v: string) => localStorage.setItem(PREFIX + k, v);

function syncableKeys() {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(PREFIX) && !LOCAL_ONLY.has(k.slice(PREFIX.length))) keys.push(k.slice(PREFIX.length));
  }
  return keys;
}

function entriesFor(keys: string[], tOverride?: number): Entries {
  const meta = readMeta();
  const out: Entries = {};
  for (const k of keys) {
    const v = getLocal(k);
    if (v != null) out[k] = { v, t: tOverride ?? meta[k] ?? 1 };
  }
  return out;
}

/** Apply only what's actually newer than this device's copy. */
function applyNewer(entries: Entries) {
  const meta = readMeta();
  const newer: Entries = {};
  for (const [k, e] of Object.entries(entries)) if (!LOCAL_ONLY.has(k) && (meta[k] ?? 0) < e.t && getLocal(k) !== e.v) newer[k] = e;
  applyRemote(newer);
}

const hasRealData = () => ['decks', 'sessions', 'tasks', 'exams'].some((k) => (getLocal(k) ?? '[]').length > 2);

/* ---------- syncing ---------- */

const pending = new Set<string>();
let pushTimer: number | null = null;
let busy = false;

async function exchange(patch: Entries) {
  if (!backend || !state.user) return;
  const since = Number(lsGet('syncSince') ?? 0);
  const res = await backend.merge(patch, since);
  applyNewer(res.entries);
  lsSet('syncSince', String(res.cursor));
}

async function syncFiles() {
  if (!backend || !state.user) return;
  const uid = state.user.id;
  const remote = new Set(await backend.listFiles(uid));
  const local = new Set(await listBlobKeys());
  for (const k of remote)
    if (!local.has(k)) {
      const b = await backend.download(uid, k);
      if (b) await putBlobFromRemote(k, b);
    }
  for (const k of local)
    if (!remote.has(k)) {
      const b = await getBlob(k);
      if (b) await backend.upload(uid, k, b);
    }
}

/** Push local changes and pull everything newer. */
export async function syncNow() {
  if (!backend || !state.user || state.status === 'needs-choice' || busy) return;
  busy = true;
  set({ status: 'syncing', error: '' });
  try {
    const keys = [...pending];
    pending.clear();
    await exchange(entriesFor(keys));
    await syncFiles();
    set({ status: 'synced', lastSync: Date.now() });
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : 'Sync failed' });
  } finally {
    busy = false;
  }
}

function schedulePush() {
  if (pushTimer) window.clearTimeout(pushTimer);
  pushTimer = window.setTimeout(() => void syncNow(), 2500);
}

/** First sync of this account on this device. */
async function firstSync(user: SyncUser) {
  set({ status: 'syncing' });
  const res = await backend!.merge({}, 0);
  const remoteCount = Object.keys(res.entries).length;
  if (!remoteCount) {
    // Empty account: this device's data becomes the account's.
    const r = await backend!.merge(entriesFor(syncableKeys()), 0);
    lsSet('syncSince', String(r.cursor));
  } else if (!hasRealData()) {
    // Fresh device: just take the account's data.
    applyRemote(res.entries);
    lsSet('syncSince', String(res.cursor));
  } else {
    pendingRemote = res.entries;
    lsSet('syncSince', String(res.cursor));
    set({ status: 'needs-choice', choice: { remoteCount } });
    return;
  }
  lsSet('syncUser', user.id);
  await syncFiles();
  set({ status: 'synced', lastSync: Date.now() });
}

/** Device and account both had data: keep one side. */
export async function resolveChoice(keep: 'account' | 'device') {
  if (!backend || !state.user) return;
  set({ status: 'syncing', choice: null });
  try {
    if (keep === 'account') {
      applyRemote(pendingRemote ?? {});
      // Anything only this device has (e.g. settings never synced) still goes up.
      const remoteKeys = new Set(Object.keys(pendingRemote ?? {}));
      await exchange(entriesFor(syncableKeys().filter((k) => !remoteKeys.has(k))));
    } else {
      const now = Date.now();
      touchKeys(syncableKeys(), now);
      await exchange(entriesFor(syncableKeys(), now));
    }
    pendingRemote = null;
    lsSet('syncUser', state.user.id);
    await syncFiles();
    set({ status: 'synced', lastSync: Date.now() });
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : 'Sync failed' });
  }
}

async function onUser(user: SyncUser | null) {
  if (!user) {
    set({ status: 'signed-out', user: null, choice: null });
    return;
  }
  if (state.user?.id === user.id && state.status !== 'signed-out') return;
  set({ user });
  try {
    if (lsGet('syncUser') === user.id) await syncNow();
    else await firstSync(user);
  } catch (e) {
    set({ status: 'error', error: e instanceof Error ? e.message : 'Sync failed' });
  }
}

let started = false;
/** Called once at startup; does nothing unless sync is configured. */
export async function startSync() {
  if (!syncAvailable || started) return;
  started = true;
  backend = mock ? mock() : await supabaseBackend();
  onLocalSave((k) => {
    if (!state.user) return;
    pending.add(k);
    schedulePush();
  });
  onBlobChange((key, blob) => {
    if (!backend || !state.user || state.status === 'needs-choice') return;
    const uid = state.user.id;
    void (blob ? backend.upload(uid, key, blob) : backend.removeFiles(uid, [key])).catch(() => {});
  });
  backend.onAuthChange((u) => void onUser(u));
  await onUser(await backend.getUser());
  // Pick up changes from other devices when you come back to the tab, and every few minutes.
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void syncNow());
  window.addEventListener('online', () => void syncNow());
  window.setInterval(() => document.visibilityState === 'visible' && void syncNow(), 3 * 60_000);
}

export async function signIn() {
  if (!backend) await startSync();
  await backend!.signIn();
}

export async function signOut() {
  if (!backend) return;
  await backend.signOut();
  localStorage.removeItem(PREFIX + 'syncUser');
  localStorage.removeItem(PREFIX + 'syncSince');
  set({ status: 'signed-out', user: null, lastSync: null, choice: null });
}

/** Delete the cloud copy and the account. Notes on this device stay. */
export async function deleteAccount() {
  if (!backend || !state.user) return;
  const uid = state.user.id;
  await backend.removeFiles(uid, await backend.listFiles(uid));
  await backend.deleteAccount();
  await signOut();
}
