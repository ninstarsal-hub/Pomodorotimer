import { getBlob, listBlobKeys, putBlob, touchKeys } from './storage';

/* Backup = every `stillpoint:` localStorage entry plus the custom background image, in one JSON file. */

const PREFIX = 'stillpoint:';
const LAST_BACKUP = PREFIX + 'lastBackup';

interface BackupFile {
  app: 'stillpoint';
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
  background?: string; // data: URL
  /** Other stored images (diagrams), by key, as data: URLs. */
  blobs?: Record<string, string>;
}

const blobToDataUrl = (b: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });

export async function exportBackup() {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)!;
    if (k.startsWith(PREFIX) && k !== LAST_BACKUP) data[k.slice(PREFIX.length)] = localStorage.getItem(k)!;
  }
  const file: BackupFile = { app: 'stillpoint', version: 1, exportedAt: new Date().toISOString(), data };
  const bg = await getBlob('background');
  if (bg) file.background = await blobToDataUrl(bg);
  const blobs: Record<string, string> = {};
  for (const key of await listBlobKeys()) {
    if (key === 'background') continue;
    const b = await getBlob(key);
    if (b) blobs[key] = await blobToDataUrl(b);
  }
  if (Object.keys(blobs).length) file.blobs = blobs;

  const url = URL.createObjectURL(new Blob([JSON.stringify(file)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = `stillpoint-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  localStorage.setItem(LAST_BACKUP, String(Date.now()));
}

const SNOOZE = PREFIX + 'backupSnooze';

/** Nudge people who have real data and haven't backed up in a week. */
export function backupDue(): boolean {
  try {
    const hasData = (localStorage.getItem(PREFIX + 'decks') ?? '[]').length > 2 || (localStorage.getItem(PREFIX + 'sessions') ?? '[]').length > 200;
    if (!hasData) return false;
    const last = Math.max(lastBackupAt() ?? 0, Number(localStorage.getItem(SNOOZE)) || 0);
    return Date.now() - last > 7 * 86_400_000;
  } catch {
    return false;
  }
}

export function snoozeBackup() {
  localStorage.setItem(SNOOZE, String(Date.now()));
}

export function lastBackupAt(): number | null {
  const v = Number(localStorage.getItem(LAST_BACKUP));
  return v > 0 ? v : null;
}

/** Validate a backup file. Returns a short summary for the confirmation prompt. */
export async function readBackup(file: File) {
  let parsed: BackupFile;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error('That file isn’t a Stillpoint backup (it isn’t valid JSON).');
  }
  // Older backups were a flat { "stillpoint:key": value } object.
  if (parsed && (parsed as { app?: string }).app === undefined && typeof parsed === 'object') {
    const legacy = parsed as unknown as Record<string, unknown>;
    const keys = Object.keys(legacy).filter((k) => k.startsWith(PREFIX));
    if (keys.length) parsed = { app: 'stillpoint', version: 1, exportedAt: '', data: Object.fromEntries(keys.map((k) => [k.slice(PREFIX.length), JSON.stringify(legacy[k])])) };
  }
  if (parsed?.app !== 'stillpoint' || typeof parsed.data !== 'object') throw new Error('That file isn’t a Stillpoint backup.');
  const count = (key: string) => {
    try {
      const v = JSON.parse(parsed.data[key] ?? '[]');
      return Array.isArray(v) ? v.length : 0;
    } catch {
      return 0;
    }
  };
  return { backup: parsed, summary: { notes: count('decks'), exams: count('exams'), sessions: count('sessions'), date: parsed.exportedAt?.slice(0, 10) ?? '' } };
}

/** Replace everything in this browser with the backup, then reload. */
export async function restoreBackup(backup: BackupFile) {
  const keep = localStorage.getItem(LAST_BACKUP) ?? String(Date.now());
  Object.keys(localStorage)
    .filter((k) => k.startsWith(PREFIX))
    .forEach((k) => localStorage.removeItem(k));
  for (const [k, v] of Object.entries(backup.data)) localStorage.setItem(PREFIX + k, v);
  localStorage.setItem(LAST_BACKUP, keep);
  // A restore is a deliberate change: mark it newest so account sync keeps it over older cloud copies.
  touchKeys(Object.keys(backup.data).filter((k) => !['syncMeta', 'syncSince', 'syncUser'].includes(k)));
  if (backup.background) {
    const blob = await (await fetch(backup.background)).blob();
    await putBlob('background', blob);
  }
  for (const [key, data] of Object.entries(backup.blobs ?? {})) await putBlob(key, await (await fetch(data)).blob());
  location.reload();
}
