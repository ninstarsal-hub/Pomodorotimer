/**
 * Exam planner: turns "exam on date X covering sections A–F" into a day-by-day
 * plan of what to learn and what to review, using spaced repetition timing.
 *
 * The plan is recomputed from today every time, so a missed day simply rolls
 * forward instead of leaving a backlog of overdue tasks.
 */
import type { Card, Deck, Exam, ReviewState } from './types';
import { dayKey } from './storage';
import { deckSections, sectionLabel } from './quiz';

export interface PlanItem {
  examId: string;
  deckId: string;
  section: string;
  label: string;
  /** learn = not studied yet; review = spaced review; final = last-day review */
  kind: 'learn' | 'review' | 'final';
}

export interface ExamPlan {
  exam: Exam;
  deck: Deck;
  daysLeft: number;
  sections: string[];
  /** Plan for each day from today (index 0) up to the day before the exam. */
  days: PlanItem[][];
  /** Share of the exam's questions you know well (box ≥ 3), 0..1. */
  readiness: number;
}

const DAY = 86_400_000;

export function daysUntil(date: string, from = new Date()) {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1, d).getTime();
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  return Math.round((target - today) / DAY);
}

export function addDays(n: number, from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + n);
  return dayKey(d);
}

export function buildPlan(exam: Exam, deck: Deck, cards: Card[], reviews: Record<string, ReviewState>): ExamPlan | null {
  const daysLeft = daysUntil(exam.date);
  if (daysLeft < 0) return null;
  const all = deckSections(deck);
  const sections = exam.sections.length ? all.filter((s) => exam.sections.includes(s)) : all;
  const studied = new Set(deck.studied ?? []);
  // Sections learned today keep their (now completed) "learn" task on today's list.
  const learnedToday = new Set(Object.entries(deck.studiedOn ?? {}).filter(([, d]) => d === dayKey()).map(([s]) => s));
  const days: PlanItem[][] = Array.from({ length: Math.max(daysLeft, 1) }, () => []);
  const item = (section: string, kind: PlanItem['kind']): PlanItem => ({ examId: exam.id, deckId: deck.id, section, label: sectionLabel(section, deck), kind });

  if (daysLeft === 0) {
    // Exam day: one light pass over everything.
    days[0] = sections.map((s) => item(s, 'final'));
  } else {
    const unstudied = sections.filter((s) => !studied.has(s) || learnedToday.has(s));
    // Learn new sections over the first ~60% of the time, leaving room to review them.
    const learnWindow = Math.max(1, Math.floor(daysLeft * 0.6));
    const learnDay = new Map<string, number>();
    // Today's already-learned sections stay on day 0; the rest spread over the window.
    const today0 = unstudied.filter((s) => learnedToday.has(s));
    const rest = unstudied.filter((s) => !learnedToday.has(s));
    today0.forEach((s) => learnDay.set(s, 0));
    // If you already learned something today, new material starts tomorrow.
    const start = today0.length && learnWindow > 1 ? 1 : 0;
    rest.forEach((s, i) => learnDay.set(s, Math.min(learnWindow - 1, start + Math.floor((i * (learnWindow - start)) / rest.length))));
    for (const [s, d] of learnDay) days[d].push(item(s, 'learn'));

    // Spaced reviews counted back from the exam (1, ~3, ~7, ~14 days before), staggered so
    // sections don't all land on the same day.
    sections.forEach((s, i) => {
      const earliest = (learnDay.get(s) ?? -1) + 1;
      const offsets = [1, 3 + (i % 2), 7 + (i % 3), 14 + (i % 4)];
      for (const off of offsets) {
        const d = daysLeft - off;
        if (d < earliest || d < 0) continue;
        const kind = off === 1 ? 'final' : 'review';
        if (!days[d].some((x) => x.section === s)) days[d].push(item(s, kind));
      }
      // Reviewed-before material that has no slot left still gets one review today.
      if (studied.has(s) && !days.some((day) => day.some((x) => x.section === s))) days[0].push(item(s, 'review'));
    });
  }

  const examCards = cards.filter((c) => c.deckId === deck.id && sections.includes(c.section));
  const known = examCards.filter((c) => (reviews[c.id]?.box ?? 0) >= 3).length;
  return { exam, deck, daysLeft, sections, days, readiness: examCards.length ? known / examCards.length : 0 };
}
