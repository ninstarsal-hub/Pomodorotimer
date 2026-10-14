import { addDays, type ExamPlan } from './planner';
import type { Task } from './types';

/* Export exam plans as an .ics calendar file (Google Calendar, Apple Calendar, Outlook). */

const KIND = { learn: 'Learn', review: 'Review', final: 'Final review' } as const;

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const compact = (d: string) => d.replace(/-/g, '');
const nextDay = (d: string) => {
  const [y, m, day] = d.split('-').map(Number);
  const n = new Date(y, m - 1, day + 1);
  return `${n.getFullYear()}${String(n.getMonth() + 1).padStart(2, '0')}${String(n.getDate()).padStart(2, '0')}`;
};

/** Fold lines longer than 75 octets, as the spec asks. */
const fold = (line: string) => {
  const out: string[] = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
};

export function buildIcs(plans: ExamPlan[], tasks: Task[] = []) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events: string[][] = [];
  const allDay = (uid: string, date: string, summary: string, description: string, remind: boolean) => {
    const ev = [
      'BEGIN:VEVENT',
      `UID:${uid}@stillpoint`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(date)}`,
      `DTEND;VALUE=DATE:${nextDay(date)}`,
      `SUMMARY:${esc(summary)}`,
      `DESCRIPTION:${esc(description)}`,
      'TRANSP:TRANSPARENT',
    ];
    // Reminder at 9am on the day.
    if (remind) ev.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${esc(summary)}`, 'TRIGGER;RELATED=START:PT9H', 'END:VALARM');
    ev.push('END:VEVENT');
    events.push(ev);
  };

  for (const p of plans) {
    p.days.forEach((items, i) => {
      if (!items.length) return;
      const date = addDays(i);
      const lines = items.map((it) => `${KIND[it.kind]}: ${it.label}`);
      const summary = items.length === 1 ? `${lines[0]} (${p.exam.title})` : `Study for ${p.exam.title}: ${items.length} tasks`;
      allDay(`${p.exam.id}-${date}`, date, summary, `${lines.join('\n')}\n\nPlanned by Stillpoint. Open Stillpoint to start these.`, true);
    });
    allDay(`${p.exam.id}-exam`, p.exam.date, `📝 ${p.exam.title}`, 'Exam day. Good luck!', true);
  }
  for (const t of tasks) if (t.due && !t.done) allDay(`${t.id}-due`, t.due, `📌 Due: ${t.title}`, `${t.subject ? t.subject + ' · ' : ''}Assignment due. Tracked in Stillpoint.`, true);

  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Stillpoint//Study plan//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:Stillpoint study plan', ...events.flat(), 'END:VCALENDAR'].map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(plans: ExamPlan[], tasks: Task[] = []) {
  const url = URL.createObjectURL(new Blob([buildIcs(plans, tasks)], { type: 'text/calendar;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'stillpoint-study-plan.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
