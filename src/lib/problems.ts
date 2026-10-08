/**
 * Practice problems (e.g. textbook exercises). The core loop:
 * solve → log right / wrong / needed help → missed problems come back to
 * re-solve after 1, 3 and 7 days until you get them right three times.
 */
import { shuffle } from './quiz';

export type ProblemResult = 'right' | 'wrong' | 'help';
export type MistakeType = 'concept' | 'setup' | 'algebra' | 'careless' | 'other';

export const MISTAKES: { id: MistakeType; label: string; hint: string }[] = [
  { id: 'concept', label: 'Concept', hint: 'Didn’t understand the idea or which method to use' },
  { id: 'setup', label: 'Setup', hint: 'Knew the topic but set the problem up wrong' },
  { id: 'algebra', label: 'Algebra / arithmetic', hint: 'Right approach, slipped in the working' },
  { id: 'careless', label: 'Careless', hint: 'Misread, copied wrong, sign or unit slip' },
  { id: 'other', label: 'Other', hint: 'Ran out of time, something else' },
];

export interface Attempt {
  at: number;
  result: ProblemResult;
  mistake?: MistakeType;
  note?: string;
}

export interface Problem {
  id: string;
  label: string;
  /** Optional problem text (supports $math$). */
  prompt?: string;
  /** Optional final answer, checked automatically when given. */
  answer?: string;
  attempts: Attempt[];
  /** Correct re-solves in a row since the last miss. */
  streak: number;
  /** When to re-solve next; null = nothing scheduled (new or mastered). */
  due: number | null;
}

export interface ProblemSet {
  id: string;
  title: string;
  deckId?: string;
  section?: string;
  problems: Problem[];
  createdAt: number;
}

export type ProblemStatus = 'new' | 'mastered' | 'due' | 'scheduled';

const DAY = 86_400_000;
const RESOLVE_DAYS = [1, 3, 7];

export function status(p: Problem, now = Date.now()): ProblemStatus {
  if (!p.attempts.length) return 'new';
  if (p.due === null) return 'mastered';
  return p.due <= now ? 'due' : 'scheduled';
}

export function lastResult(p: Problem): ProblemResult | null {
  return p.attempts.length ? p.attempts[p.attempts.length - 1].result : null;
}

/** Record an attempt and schedule the next re-solve. */
export function logAttempt(p: Problem, attempt: Attempt): Problem {
  const attempts = [...p.attempts, attempt];
  if (attempt.result === 'right') {
    // Right first time: done. Right on a re-solve: space it further, retire after 3 in a row.
    if (attempts.length === 1) return { ...p, attempts, streak: 0, due: null };
    const streak = p.streak + 1;
    if (streak >= RESOLVE_DAYS.length) return { ...p, attempts, streak, due: null };
    return { ...p, attempts, streak, due: startOfDay(attempt.at) + RESOLVE_DAYS[streak] * DAY };
  }
  return { ...p, attempts, streak: 0, due: startOfDay(attempt.at) + RESOLVE_DAYS[0] * DAY };
}

function startOfDay(t: number) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/**
 * "1-10, 15, 20-30 even" → ["#1", …]. A prefix like "3.2:" labels them "3.2 #1".
 * Also accepts "odd"/"even" per range and letters ("4a-4d").
 */
export function parseRange(input: string): string[] {
  let text = input.trim();
  let prefix = '';
  const pm = text.match(/^([^:]{1,20}):\s*(.*)$/);
  if (pm && /\d/.test(pm[2])) {
    prefix = pm[1].trim() + ' ';
    text = pm[2];
  }
  const out: string[] = [];
  for (const part of text.split(/\s*[,;]\s*|\s+and\s+/i)) {
    if (!part) continue;
    const parity = /\bodd\b/i.test(part) ? 1 : /\beven\b/i.test(part) ? 0 : null;
    const core = part.replace(/\b(odd|even|only)\b/gi, '').trim();
    const num = core.match(/^#?(\d+)\s*(?:-|–|to)\s*#?(\d+)$/i);
    const letters = core.match(/^(\d*)([a-z])\s*(?:-|–|to)\s*\1?([a-z])$/i);
    if (num) {
      const [a, b] = [Number(num[1]), Number(num[2])].sort((x, y) => x - y);
      for (let n = a; n <= b && out.length < 400; n++) if (parity === null || n % 2 === parity) out.push(`${prefix}#${n}`);
    } else if (letters) {
      const [a, b] = [letters[2].toLowerCase().charCodeAt(0), letters[3].toLowerCase().charCodeAt(0)].sort((x, y) => x - y);
      for (let c = a; c <= b; c++) out.push(`${prefix}#${letters[1]}${String.fromCharCode(c)}`);
    } else if (core) {
      const bare = core.replace(/^#/, '');
      out.push(`${prefix}${/^\d/.test(bare) ? '#' : ''}${bare}`);
    }
  }
  return [...new Set(out)];
}

export interface ProblemRef {
  setId: string;
  problemId: string;
}

/** Pick problems for mixed practice: due re-solves first, then untried ones, interleaved across sets. */
export function pickMixed(sets: ProblemSet[], n: number, includeMastered = false): ProblemRef[] {
  const now = Date.now();
  const rank = (p: Problem) => {
    const s = status(p, now);
    return s === 'due' ? 0 : s === 'new' ? 1 : s === 'scheduled' ? 2 : 3;
  };
  // Per set, shuffled within each priority level.
  const queues = sets.map((set) =>
    shuffle(set.problems)
      .filter((p) => includeMastered || status(p, now) !== 'mastered')
      .sort((a, b) => rank(a) - rank(b))
      .map((p) => ({ setId: set.id, problemId: p.id, r: rank(p) })),
  );
  const out: (ProblemRef & { r: number })[] = [];
  // Round-robin so consecutive problems come from different sets (interleaving).
  for (let i = 0; out.length < n; i++) {
    let added = false;
    for (const q of shuffle(queues)) {
      if (q[i] && out.length < n) {
        out.push(q[i]);
        added = true;
      }
    }
    if (!added) break;
  }
  // Keep due problems first but otherwise mixed.
  return [...out.filter((x) => x.r === 0), ...shuffle(out.filter((x) => x.r !== 0))].map(({ setId, problemId }) => ({ setId, problemId }));
}
