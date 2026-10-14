import type { Session, StudySession, Task } from './types';
import type { ReviewLog } from '../store';
import { dayKey } from './storage';
import { blocksOf, factorLabel } from './studySessions';
import { upcoming } from './assignments';
import type { ExamPlan } from './planner';

/** Monday (YYYY-MM-DD) of the week containing `d`. */
export function weekStart(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

function range(start: Date) {
  const keys: string[] = [];
  for (let i = 0; i < 7; i++) keys.push(dayKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)));
  return keys;
}

export interface WeekStats {
  label: string;
  minutes: number;
  days: number;
  blocks: number;
  sessions: number;
  avgRating: number | null;
  answered: number;
  accuracy: number | null;
  topSubject: string | null;
}

function stats(keys: string[], blocks: Session[], studySessions: StudySession[], log: ReviewLog): WeekStats {
  const set = new Set(keys);
  const wb = blocks.filter((b) => set.has(b.day));
  const ws = studySessions.filter((s) => set.has(dayKey(new Date(s.startedAt))));
  const rated = ws.filter((s) => s.rating);
  let answered = 0;
  let correct = 0;
  for (const k of keys) {
    answered += log[k]?.total ?? 0;
    correct += log[k]?.correct ?? 0;
  }
  const bySubject = new Map<string, number>();
  for (const b of wb) if (b.subject) bySubject.set(b.subject, (bySubject.get(b.subject) ?? 0) + b.minutes);
  const fmt = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };
  return {
    label: `${fmt(keys[0])} – ${fmt(keys[6])}`,
    minutes: wb.reduce((a, b) => a + b.minutes, 0),
    days: new Set(wb.map((b) => b.day)).size,
    blocks: wb.length,
    sessions: ws.length,
    avgRating: rated.length ? rated.reduce((a, s) => a + s.rating!, 0) / rated.length : null,
    answered,
    accuracy: answered ? correct / answered : null,
    topSubject: [...bySubject].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null,
  };
}

export interface Recap {
  week: WeekStats;
  prev: WeekStats;
  best: { title: string; when: string; rating: number; factors: string[] } | null;
  exams: { title: string; daysLeft: number; readiness: number; planned: number }[];
  due: { title: string; label: string; blocksLeft: number }[];
  /** Rough focus blocks per day to stay on track this coming week. */
  suggestedPerDay: number;
}

/** Recap of the most recent full week (Mon–Sun before this one) and a look at the week ahead. */
export function buildRecap(opts: { blocks: Session[]; studySessions: StudySession[]; reviewLog: ReviewLog; plans: ExamPlan[]; tasks: Task[]; current?: boolean }): Recap {
  const thisMon = weekStart();
  const lastMon = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 7);
  const prevMon = new Date(thisMon.getFullYear(), thisMon.getMonth(), thisMon.getDate() - 14);
  const weekKeys = range(opts.current ? thisMon : lastMon);
  const prevKeys = range(opts.current ? lastMon : prevMon);
  const week = stats(weekKeys, opts.blocks, opts.studySessions, opts.reviewLog);
  const prev = stats(prevKeys, opts.blocks, opts.studySessions, opts.reviewLog);

  const set = new Set(weekKeys);
  const best = opts.studySessions
    .filter((s) => s.rating && set.has(dayKey(new Date(s.startedAt))))
    .sort((a, b) => b.rating! - a.rating! || blocksOf(b, opts.blocks).length - blocksOf(a, opts.blocks).length)[0];

  const exams = opts.plans
    .filter((p) => p.daysLeft <= 7)
    .map((p) => ({ title: p.exam.title, daysLeft: p.daysLeft, readiness: p.readiness, planned: p.days.slice(0, 7).reduce((a, d) => a + d.length, 0) }));
  const dueSoon = upcoming(opts.tasks).filter((d) => d.daysLeft <= 7);
  const blocksForDue = dueSoon.reduce((a, d) => a + d.blocksLeft, 0);
  const planItems = opts.plans.reduce((a, p) => a + p.days.slice(0, 7).reduce((x, d) => x + d.length, 0), 0);
  // Each plan item is roughly one focus block.
  const suggestedPerDay = Math.ceil((blocksForDue + planItems) / 7);

  return {
    week,
    prev,
    best: best
      ? {
          title: `${new Date(best.startedAt).toLocaleDateString(undefined, { weekday: 'long' })} session`,
          when: new Date(best.startedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }),
          rating: best.rating!,
          factors: best.factors.map(factorLabel),
        }
      : null,
    exams,
    due: dueSoon.map((d) => ({ title: d.task.title, label: d.label, blocksLeft: d.blocksLeft })),
    suggestedPerDay,
  };
}
