/**
 * Builds custom practice tests from note cards, entirely offline.
 *
 * Each card can be asked several ways (forward, reversed, as a statement to
 * judge, with look-alike options), and prompts are reworded from a set of
 * exam-style templates — so you have to understand the idea, not just
 * recognise the exact sentence from your notes.
 */
import type { Card, ReviewState } from './types';
import { hasMath, shuffle } from './quiz';

export type QType = 'mcq' | 'tf' | 'short' | 'blank' | 'explain';

export const QTYPE_LABEL: Record<QType, string> = {
  mcq: 'Multiple choice',
  tf: 'True / false',
  short: 'Short answer',
  blank: 'Fill in the blank',
  explain: 'Explain',
};

export interface ExamQuestion {
  id: string;
  card: Card;
  type: QType;
  /** Small instruction line above the question, e.g. "Choose the best answer". */
  lead: string;
  prompt: string;
  /** Optional statement block (true/false) or definition shown under the prompt. */
  detail?: string;
  options?: string[];
  /** Correct option text (mcq), "True"/"False" (tf), or expected typed answer. */
  answer: string;
  /** Shown after answering, e.g. the correct pairing for a false statement. */
  explanation?: string;
}

export interface ExamOptions {
  types: QType[];
  count: number;
  /** Put questions you've missed before first. */
  weakFirst: boolean;
}

/* ---------- helpers ---------- */

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function stripEnd(s: string) {
  return s.trim().replace(/[.;:,\s]+$/, '');
}

function isQuestion(s: string) {
  return /\?\s*$/.test(s);
}

/** Rough "shape" so distractors look plausible: numbers with numbers, short terms with short terms. */
function shape(s: string) {
  if (/^[\d\s.,%$°+\-–/]+$/.test(s.trim())) return 'num';
  const w = s.trim().split(/\s+/).length;
  return w <= 3 ? 'term' : w <= 10 ? 'phrase' : 'sentence';
}

function distractors(correct: string, pool: string[], n: number) {
  const norm = (x: string) => x.trim().toLowerCase();
  const c = norm(correct);
  const sh = shape(correct);
  const unique = [...new Map(pool.filter((p) => norm(p) !== c && p.trim()).map((p) => [norm(p), p])).values()];
  const ranked = unique
    .map((p) => ({ p, score: (shape(p) === sh ? 0 : 50) + Math.abs(p.length - correct.length) / Math.max(4, correct.length) * 10 + Math.random() * 6 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, Math.max(n + 3, 6));
  return shuffle(ranked).slice(0, n).map((r) => r.p);
}

/** How a card could be asked, given the rest of the material. */
function eligibleTypes(card: Card, ctx: Ctx): QType[] {
  const t: QType[] = [];
  if (card.kind === 'prompt') return ['explain'];
  if (card.kind === 'qa') {
    const asked = card.ask || isQuestion(card.front);
    const mathy = hasMath(card.front) || hasMath(card.back);
    t.push('short');
    if (!asked && !mathy) t.push('blank');
    if (ctx.qaBacks.length >= 4 || ctx.qaFronts.length >= 4) t.push('mcq');
    if (ctx.qaBacks.length >= 2) t.push('tf');
    if (!mathy && card.back.split(/\s+/).length >= 5) t.push('explain');
  } else {
    t.push('blank');
    if (ctx.clozeAnswers.length + ctx.qaFronts.length >= 4) t.push('mcq');
    if (ctx.clozeAnswers.length + ctx.qaFronts.length >= 2) t.push('tf');
  }
  return t;
}

interface Ctx {
  qaBacks: string[];
  qaFronts: string[];
  clozeAnswers: string[];
}

function makeCtx(cards: Card[]): Ctx {
  return {
    qaBacks: cards.filter((c) => c.kind === 'qa').map((c) => c.back),
    qaFronts: cards.filter((c) => c.kind === 'qa' && !c.ask && !isQuestion(c.front)).map((c) => c.front),
    clozeAnswers: cards.filter((c) => c.kind === 'cloze').map((c) => c.back),
  };
}

/* ---------- question writers ---------- */

function writeQuestion(card: Card, type: QType, ctx: Ctx, deckCtx: Ctx, n: number): ExamQuestion | null {
  const id = `${card.id}:${type}:${n}`;
  const term = stripEnd(card.front);
  const def = stripEnd(card.back);
  // Prefer distractors from the same class; fall back to everything selected.
  const near = (key: keyof Ctx) => (deckCtx[key].length >= 4 ? deckCtx[key] : [...deckCtx[key], ...ctx[key]]);

  if (card.kind === 'qa') {
    const asked = card.ask || isQuestion(card.front);
    // Formulas only make sense asked forward ("derivative of sin x = ?"), not reversed.
    const mathy = hasMath(card.front) || hasMath(card.back);
    const reverse = !asked && !mathy && Math.random() < 0.5;
    switch (type) {
      case 'mcq': {
        if (reverse && near('qaFronts').length >= 4) {
          const opts = distractors(term, near('qaFronts'), 3);
          if (opts.length === 3) {
            return {
              id, card, type, lead: 'Choose the best answer',
              prompt: pick(['Which term best matches this description?', 'Which concept is being described?', 'This describes which of the following?']),
              detail: def, options: shuffle([term, ...opts]), answer: term,
            };
          }
        }
        const opts = distractors(def, near('qaBacks'), 3);
        if (opts.length < 3) return null;
        return {
          id, card, type, lead: 'Choose the best answer',
          prompt: asked ? card.front : mathy ? pick([`Which of these is ${term}?`, `${term} = ?`]) : pick([`Which of the following best describes ${term}?`, `What best defines “${term}”?`, `Which statement about ${term} is correct?`]),
          options: shuffle([def, ...opts]), answer: def,
        };
      }
      case 'tf': {
        const truth = Math.random() < 0.5;
        const wrong = distractors(def, near('qaBacks'), 1)[0];
        if (!truth && !wrong) return null;
        const shown = truth ? def : wrong;
        return {
          id, card, type, lead: 'True or false?',
          prompt: asked ? `Is this a correct answer to: ${card.front}` : mathy ? `True or false: ${term} is` : pick([`This correctly describes ${term}:`, `${term} can be described as:`, `The following is true of ${term}:`]),
          detail: shown, options: ['True', 'False'], answer: truth ? 'True' : 'False',
          explanation: truth ? undefined : `Correct: ${def}`,
        };
      }
      case 'short': {
        if (reverse) {
          return {
            id, card, type, lead: 'Short answer',
            prompt: pick(['Name the term described here.', 'What term or concept is this?', 'Identify the concept being described.']),
            detail: def, answer: term,
          };
        }
        return {
          id, card, type, lead: 'Short answer',
          prompt: asked ? card.front : mathy ? pick([`What is ${term}?`, `${term} = ?`, `Write down ${term}.`]) : pick([`Define ${term}.`, `What does “${term}” refer to?`, `In a sentence, what does “${term}” mean?`, `Briefly describe ${term}.`]),
          answer: def,
        };
      }
      case 'blank': {
        return {
          id, card, type, lead: 'Fill in the blank',
          prompt: `_____ — ${def}`,
          answer: term,
        };
      }
      case 'explain': {
        return {
          id, card, type, lead: 'Explain in your own words',
          prompt: asked
            ? card.front.replace(/\?\s*$/, '') + '? Explain your reasoning.'
            : pick([`Explain ${term} and why it matters.`, `Explain ${term} as if teaching a classmate, with an example.`, `How would you explain ${term} to someone who missed class?`]),
          answer: def,
        };
      }
    }
    return null;
  }

  if (card.kind === 'cloze') {
    const sentence = card.front;
    const pool = [...near('clozeAnswers'), ...near('qaFronts')];
    switch (type) {
      case 'blank':
        return { id, card, type, lead: 'Fill in the blank', prompt: sentence, answer: card.back };
      case 'mcq': {
        const opts = distractors(card.back, pool, 3);
        if (opts.length < 3) return null;
        return { id, card, type, lead: 'Choose the word that completes the statement', prompt: sentence, options: shuffle([card.back, ...opts]), answer: card.back };
      }
      case 'tf': {
        const truth = Math.random() < 0.5;
        const wrong = distractors(card.back, pool, 1)[0];
        if (!truth && !wrong) return null;
        return {
          id, card, type, lead: 'True or false?', prompt: 'Is this statement correct?',
          detail: sentence.replace('_____', truth ? card.back : wrong), options: ['True', 'False'], answer: truth ? 'True' : 'False',
          explanation: truth ? undefined : `Correct: ${sentence.replace('_____', card.back)}`,
        };
      }
    }
    return null;
  }

  // prompt / explain card
  return { id, card, type: 'explain', lead: 'Explain in your own words', prompt: card.front, answer: card.back };
}

/* ---------- assembly ---------- */

function weakness(r: ReviewState | undefined) {
  if (!r || !r.seen) return 0.4; // unseen: medium priority
  return 1 - r.correct / r.seen + (r.box === 0 ? 0.3 : 0);
}

/**
 * Build a test of `count` questions from `cards`, spread evenly across sections,
 * balancing the requested question types.
 */
export function generateExam(cards: Card[], reviews: Record<string, ReviewState>, opts: ExamOptions): ExamQuestion[] {
  if (!cards.length || !opts.types.length) return [];
  const ctx = makeCtx(cards);
  const deckCtx = new Map<string, Ctx>();
  for (const id of new Set(cards.map((c) => c.deckId))) deckCtx.set(id, makeCtx(cards.filter((c) => c.deckId === id)));

  // Order cards: weakest first if asked, otherwise round-robin across sections so the test covers everything.
  let ordered: Card[];
  if (opts.weakFirst) {
    ordered = [...cards].sort((a, b) => weakness(reviews[b.id]) - weakness(reviews[a.id]) + (Math.random() - 0.5) * 0.2);
  } else {
    const groups = new Map<string, Card[]>();
    for (const c of shuffle(cards)) {
      const k = c.deckId + '\u0000' + c.section;
      groups.set(k, [...(groups.get(k) ?? []), c]);
    }
    const lists = shuffle([...groups.values()]);
    ordered = [];
    for (let i = 0; ordered.length < cards.length; i++) for (const l of lists) if (l[i]) ordered.push(l[i]);
  }

  const out: ExamQuestion[] = [];
  const typeCount = Object.fromEntries(opts.types.map((t) => [t, 0])) as Record<QType, number>;
  // Pass 1 uses each card once; later passes reuse cards with a different question type.
  for (let pass = 0; pass < 5 && out.length < opts.count; pass++) {
    for (const card of ordered) {
      if (out.length >= opts.count) break;
      const used = new Set(out.filter((q) => q.card.id === card.id).map((q) => q.type));
      if (pass === 0 && used.size) continue;
      const options = eligibleTypes(card, ctx).filter((t) => opts.types.includes(t) && !used.has(t));
      if (!options.length) continue;
      // Choose the least-used type so the mix stays balanced.
      const min = Math.min(...options.map((t) => typeCount[t]));
      const type = pick(options.filter((t) => typeCount[t] === min));
      const q = writeQuestion(card, type, ctx, deckCtx.get(card.deckId)!, pass);
      if (!q) continue;
      out.push(q);
      typeCount[type]++;
    }
  }
  // Don't put a card's two versions back-to-back.
  return shuffle(out);
}

/** How many questions are possible at most, for the count slider. */
export function maxQuestions(cards: Card[], types: QType[]) {
  const ctx = makeCtx(cards);
  return cards.reduce((n, c) => n + eligibleTypes(c, ctx).filter((t) => types.includes(t)).length, 0);
}
