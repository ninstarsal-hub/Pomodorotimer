import type { Task } from './types';
import { daysUntil } from './planner';

/** Shows on today's list: planned for today, or an unfinished assignment with a due date. */
export const isOnToday = (t: Task, today: string) => t.day === today || (!!t.due && !t.done);

export interface DueInfo {
  task: Task;
  daysLeft: number;
  blocksLeft: number;
  /** Suggested focus blocks per day to finish on time (including today). */
  perDay: number;
  label: string;
  urgent: boolean;
}

export function dueInfo(t: Task): DueInfo {
  const daysLeft = daysUntil(t.due!);
  const blocksLeft = Math.max(0, t.estimate - t.pomos);
  const perDay = blocksLeft ? Math.ceil(blocksLeft / Math.max(1, daysLeft + (daysLeft >= 0 ? 0 : 1))) : 0;
  const label = daysLeft < 0 ? `${-daysLeft} day${daysLeft === -1 ? '' : 's'} overdue` : daysLeft === 0 ? 'due today' : daysLeft === 1 ? 'due tomorrow' : `due in ${daysLeft} days`;
  return { task: t, daysLeft, blocksLeft, perDay, label, urgent: daysLeft <= 1 };
}

/** Unfinished assignments with due dates, soonest first. */
export function upcoming(tasks: Task[]) {
  return tasks
    .filter((t) => t.due && !t.done)
    .map(dueInfo)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

export function fmtDue(date: string) {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}
