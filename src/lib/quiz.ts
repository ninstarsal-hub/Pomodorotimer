import type { Card, Deck, ReviewState } from './types';

/**
 * Turns free-form notes into retrieval-practice cards.
 *
 * Recognised formats (one per line):
 *   Term :: definition
 *   Q: question  /  A: answer          (on consecutive lines)
 *   A question ending in "?"           (answer on the next line)
 *   Term - definition  /  Term: definition   (short term on the left)
 *   A sentence with **bold** or ==highlighted== words  -> fill-in-the-blank
 *   # Heading                          -> "explain it in your own words" prompt
 * Plain sentences can optionally become auto fill-in-the-blank cards.
 */

const STOP = new Set(
  'the a an and or but of to in on at for with from by as is are was were be been being this that these those it its into than then which who whom whose what when where why how not no can could should would may might will shall do does did have has had their there they them he she his her we our you your i also such each other more most some any all very just about over under between through during before after above below up down out off again further once only own same so too'.split(
    ' ',
  ),
);

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

function clean(line: string) {
  return line
    .replace(/^\s*(?:[-*•‣▪]|\d+[.)])\s+/, '')
    .trim();
}

function words(s: string) {
  return s.split(/\s+/).filter(Boolean);
}

function autoClozeTarget(sentence: string): string | null {
  const tokens = words(sentence);
  if (tokens.length < 7) return null;
  const strip = (w: string) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  // 1) numbers / years are great recall targets
  const num = tokens.map(strip).find((w) => /^\d[\d,.%]*$/.test(w) && w.length >= 2);
  if (num) return num;
  // 2) capitalised terms that aren't the first word
  const caps = tokens.slice(1).map(strip).filter((w) => /^\p{Lu}[\p{L}-]{2,}$/u.test(w) && !STOP.has(w.toLowerCase()));
  if (caps.length) return caps.sort((a, b) => b.length - a.length)[0];
  // 3) the longest content word
  const content = tokens.map(strip).filter((w) => w.length >= 7 && !STOP.has(w.toLowerCase()));
  if (content.length) return content.sort((a, b) => b.length - a.length)[0];
  return null;
}

function blank(sentence: string, target: string) {
  const idx = sentence.indexOf(target);
  if (idx < 0) return null;
  return sentence.slice(0, idx) + '_____' + sentence.slice(idx + target.length);
}

export function parseCards(deck: Deck): Card[] {
  const out: Card[] = [];
  const seen = new Set<string>();
  const push = (kind: Card['kind'], front: string, back: string, auto = false) => {
    front = front.trim();
    back = back.trim();
    if (!front || !back) return;
    const id = deck.id + ':' + hash(kind + front);
    if (seen.has(id)) return;
    seen.add(id);
    out.push({ id, deckId: deck.id, kind, front, back, auto });
  };

  const lines = deck.content.split(/\r?\n/);
  let heading: string | null = null;
  let headingBody: string[] = [];
  const flushHeading = () => {
    if (heading && headingBody.length) {
      push('prompt', `Explain “${heading}” in your own words. What are the key ideas and how do they connect?`, headingBody.join(' ').slice(0, 600));
    }
    heading = null;
    headingBody = [];
  };

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const h = raw.match(/^\s*#{1,6}\s+(.+)$/);
    if (h) {
      flushHeading();
      heading = h[1].trim();
      continue;
    }
    const line = clean(raw);
    if (!line) continue;
    if (heading) headingBody.push(line.replace(/\*\*|==/g, ''));

    // Term :: definition
    if (line.includes('::')) {
      const [f, ...rest] = line.split('::');
      push('qa', f, rest.join('::'));
      continue;
    }
    // Q: / A:
    const q = line.match(/^q(?:uestion)?\s*[:.]\s*(.+)$/i);
    if (q) {
      const next = clean(lines[i + 1] ?? '');
      const a = next.match(/^a(?:nswer)?\s*[:.]\s*(.+)$/i);
      if (a) {
        push('qa', q[1], a[1]);
        i++;
        continue;
      }
    }
    // Question? \n answer
    if (line.endsWith('?')) {
      const next = clean(lines[i + 1] ?? '');
      if (next && !next.endsWith('?') && !/^#/.test(lines[i + 1] ?? '')) {
        push('qa', line, next.replace(/^a(?:nswer)?\s*[:.]\s*/i, ''));
        i++;
        continue;
      }
    }
    // Explicit cloze: **x**, ==x==, {{x}}
    const marks = [...line.matchAll(/\*\*(.+?)\*\*|==(.+?)==|\{\{(?:c\d*::)?(.+?)\}\}/g)];
    if (marks.length) {
      const plain = line.replace(/\*\*(.+?)\*\*|==(.+?)==|\{\{(?:c\d*::)?(.+?)\}\}/g, (_m, a, b, c) => a ?? b ?? c);
      for (const m of marks) {
        const target = m[1] ?? m[2] ?? m[3];
        const front = blank(plain, target);
        if (front) push('cloze', front, target);
      }
      continue;
    }
    // Term - definition / Term — definition / Term: definition
    const td = line.match(/^(.{2,60}?)\s+(?:-|–|—|=)\s+(.{4,})$/) ?? line.match(/^([^:]{2,50}):\s+(.{4,})$/);
    if (td && words(td[1]).length <= 6) {
      push('qa', td[1], td[2]);
      continue;
    }
    // Auto cloze from a plain sentence
    if (deck.autoCloze) {
      for (const sentence of line.split(/(?<=[.!?])\s+/)) {
        const target = autoClozeTarget(sentence);
        if (!target) continue;
        const front = blank(sentence, target);
        if (front) push('cloze', front, target, true);
      }
    }
  }
  flushHeading();
  return out;
}

/* ---------- spaced repetition (Leitner-style with SM-2 flavour) ---------- */

const DAY = 86_400_000;
const INTERVALS = [0, 1, 3, 7, 14, 30, 60]; // days per box

export type Grade = 'again' | 'hard' | 'good' | 'easy';

export function schedule(prev: ReviewState | undefined, grade: Grade, now = Date.now()): ReviewState {
  const s: ReviewState = prev ? { ...prev } : { box: 0, due: now, seen: 0, correct: 0, last: 0 };
  s.seen += 1;
  s.last = now;
  if (grade === 'again') {
    s.box = 0;
    s.due = now + 60_000 * 5;
  } else {
    s.correct += 1;
    if (grade === 'hard') s.box = Math.max(1, s.box);
    if (grade === 'good') s.box = Math.min(INTERVALS.length - 1, s.box + 1);
    if (grade === 'easy') s.box = Math.min(INTERVALS.length - 1, s.box + 2);
    const days = INTERVALS[s.box] * (grade === 'hard' ? 0.5 : 1);
    s.due = now + Math.max(days * DAY, 10 * 60_000);
  }
  return s;
}

export function isDue(r: ReviewState | undefined, now = Date.now()) {
  return !r || r.due <= now;
}

export interface QuizItem {
  card: Card;
  type: 'flip' | 'type' | 'choice';
  options?: string[];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Pick n cards: due cards from the preferred decks first, then any due cards,
 * then the least-practised ones. Interleaves question formats.
 */
export function buildQuiz(cards: Card[], reviews: Record<string, ReviewState>, n: number, preferDeckIds: string[] = []): QuizItem[] {
  if (!cards.length) return [];
  const now = Date.now();
  const score = (c: Card) => {
    const r = reviews[c.id];
    let s = 0;
    if (preferDeckIds.includes(c.deckId)) s += 100;
    if (isDue(r, now)) s += 50;
    if (!r) s += 10;
    if (r) s -= r.box * 4 + r.seen;
    if (c.auto) s -= 8; // hand-written cards beat auto-generated ones
    return s + Math.random() * 6;
  };
  const picked = [...cards].sort((a, b) => score(b) - score(a)).slice(0, n);
  return shuffle(picked).map((card) => {
    if (card.kind === 'prompt') return { card, type: 'flip' as const };
    if (card.kind === 'cloze') return { card, type: 'type' as const };
    const sameDeck = cards.filter((c) => c.kind === 'qa' && c.id !== card.id && c.back !== card.back);
    if (sameDeck.length >= 3 && Math.random() < 0.5) {
      const distractors = shuffle(sameDeck)
        .slice(0, 3)
        .map((c) => c.back);
      return { card, type: 'choice' as const, options: shuffle([card.back, ...distractors]) };
    }
    return { card, type: Math.random() < 0.5 ? ('type' as const) : ('flip' as const) };
  });
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\b(the|a|an)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function lev(a: string, b: string) {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

/** Lenient answer check: typo-tolerant for short answers, keyword overlap for long ones. */
export function checkAnswer(given: string, expected: string): boolean {
  const g = norm(given);
  const e = norm(expected);
  if (!g) return false;
  if (g === e) return true;
  if (e.length <= 30) return lev(g, e) <= Math.max(1, Math.floor(e.length * 0.2));
  const keys = e.split(' ').filter((w) => w.length > 3 && !STOP.has(w));
  if (!keys.length) return false;
  const hit = keys.filter((k) => g.includes(k)).length;
  return hit / keys.length >= 0.6;
}
