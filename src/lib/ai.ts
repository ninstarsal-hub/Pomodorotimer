import type { Card, Deck } from './types';
import { hash } from './quiz';

interface AiCard {
  type: 'qa' | 'cloze' | 'explain';
  question: string;
  answer: string;
  topic: string;
  fromNotes: boolean;
}

/** A short fingerprint of the notes, to tell when AI questions are out of date. */
export function contentHash(text: string) {
  return hash(text.trim());
}

export async function generateAiCards(deck: Deck, accessCode: string): Promise<Card[]> {
  let res: Response;
  try {
    res = await fetch('/api/generate-cards', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(accessCode ? { 'x-access-code': accessCode } : {}) },
      body: JSON.stringify({ title: deck.title, subject: deck.subject, notes: deck.content }),
    });
  } catch {
    throw new Error('Couldn’t reach the server. Check your connection.');
  }
  let data: { cards?: AiCard[]; error?: string } = {};
  try {
    data = await res.json();
  } catch {
    /* non-JSON error page */
  }
  if (!res.ok || !data.cards) {
    if (res.status === 404) throw new Error('AI isn’t available on this deployment (no /api route). Deploy on Vercel to use it.');
    throw new Error(data.error ?? `AI request failed (${res.status}).`);
  }
  const seen = new Set<string>();
  return data.cards.flatMap((c) => {
    const id = `${deck.id}:ai:${hash(c.type + c.question)}`;
    if (seen.has(id) || !c.question.trim() || !c.answer.trim()) return [];
    seen.add(id);
    const card: Card = {
      id,
      deckId: deck.id,
      kind: c.type === 'explain' ? 'prompt' : c.type === 'cloze' && c.question.includes('_') ? 'cloze' : 'qa',
      front: c.question.trim(),
      back: c.answer.trim(),
      topic: c.topic,
      ai: true,
      fromNotes: c.fromNotes,
    };
    return [card];
  });
}
