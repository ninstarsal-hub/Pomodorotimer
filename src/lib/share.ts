import type { Deck } from './types';
import { uid } from './storage';

/*
 * Share a set of notes as a link. Everything lives in the URL itself (after #, which browsers never send
 * to a server), compressed — no account, no database, nothing stored online.
 */

interface SharedDeck {
  v: 1;
  title: string;
  subject: string;
  content: string;
  autoCloze: boolean;
  /** Question edits, keyed by the id *without* the original deck prefix. */
  edits?: Deck['edits'];
  custom?: Deck['custom'];
}

const b64url = (bytes: Uint8Array) => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const out = new Response(new Blob([bytes as BlobPart]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
}

export function toShared(deck: Deck): SharedDeck {
  const prefix = deck.id + ':';
  const edits = deck.edits ? Object.fromEntries(Object.entries(deck.edits).map(([k, v]) => [k.startsWith(prefix) ? k.slice(prefix.length) : k, v])) : undefined;
  return { v: 1, title: deck.title, subject: deck.subject, content: deck.content, autoCloze: deck.autoCloze, edits, custom: deck.custom?.map((c) => ({ ...c, deckId: '' })) };
}

export function fromShared(s: SharedDeck): Deck {
  const id = uid();
  const edits = s.edits ? Object.fromEntries(Object.entries(s.edits).map(([k, v]) => [`${id}:${k}`, v])) : undefined;
  return {
    id,
    title: s.title,
    subject: s.subject ?? '',
    content: s.content ?? '',
    autoCloze: s.autoCloze ?? true,
    createdAt: Date.now(),
    edits,
    custom: s.custom?.map((c) => ({ ...c, id: uid(), deckId: id })),
  };
}

export async function shareLink(deck: Deck) {
  const json = new TextEncoder().encode(JSON.stringify(toShared(deck)));
  const packed = await pipe(json, new CompressionStream('deflate-raw'));
  return `${location.origin}/#share=${b64url(packed)}`;
}

export async function readShareCode(code: string): Promise<SharedDeck> {
  const json = await pipe(fromB64url(code), new DecompressionStream('deflate-raw'));
  const parsed = JSON.parse(new TextDecoder().decode(json)) as SharedDeck;
  if (parsed?.v !== 1 || typeof parsed.content !== 'string') throw new Error('bad share');
  return parsed;
}

/** A file version for big notes (or apps that cut long links). */
export function downloadShared(deck: Deck) {
  const blob = new Blob([JSON.stringify({ app: 'stillpoint-notes', ...toShared(deck) })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deck.title.replace(/[^\w\- ]+/g, '').trim() || 'notes'}.stillpoint.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readSharedFile(file: File): Promise<SharedDeck> {
  const parsed = JSON.parse(await file.text());
  if (parsed?.app !== 'stillpoint-notes' || typeof parsed.content !== 'string') throw new Error('That file isn’t a shared Stillpoint notes file.');
  return parsed as SharedDeck;
}

export type { SharedDeck };
