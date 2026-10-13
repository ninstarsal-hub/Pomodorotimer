import { useMemo, useState } from 'react';
import { CalendarPlus, ChevronLeft, ChevronRight, Flag } from 'lucide-react';
import { downloadIcs } from '../lib/ics';
import { addDays, type ExamPlan, type PlanItem } from '../lib/planner';
import { dayKey } from '../lib/storage';
import { PlanItemRow } from './PlanPanel';

interface DayInfo {
  items: (PlanItem & { examTitle: string })[];
  exams: string[];
}

const KIND_LABEL: Record<PlanItem['kind'], string> = { learn: 'Learn', review: 'Review', final: 'Final review' };
const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Month view of every exam plan: what to learn or review on which day, and when each exam is. */
export function PlanCalendar({ plans }: { plans: ExamPlan[] }) {
  const today = dayKey();
  const [selected, setSelected] = useState(today);
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });

  // date -> what's planned
  const byDay = useMemo(() => {
    const map = new Map<string, DayInfo>();
    const get = (k: string) => {
      if (!map.has(k)) map.set(k, { items: [], exams: [] });
      return map.get(k)!;
    };
    for (const p of plans) {
      p.days.forEach((items, i) => {
        if (items.length) get(addDays(i)).items.push(...items.map((it) => ({ ...it, examTitle: p.exam.title })));
      });
      get(p.exam.date).exams.push(p.exam.title);
    }
    return map;
  }, [plans]);

  const lastExam = plans.reduce((max, p) => (p.exam.date > max ? p.exam.date : max), today);
  const [ly, lm] = lastExam.split('-').map(Number);
  const canPrev = month.y > now.getFullYear() || (month.y === now.getFullYear() && month.m > now.getMonth());
  const canNext = month.y < ly || (month.y === ly && month.m < lm - 1);
  const shift = (d: number) => setMonth(({ y, m }) => ({ y: y + Math.floor((m + d) / 12), m: (((m + d) % 12) + 12) % 12 }));

  const first = new Date(month.y, month.m, 1);
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(month.y, month.m, i + 1)))];
  while (cells.length % 7) cells.push(null);

  const sel = byDay.get(selected);
  const [sy, sm, sd] = selected.split('-').map(Number);
  const selDate = new Date(sy, sm - 1, sd);

  return (
    <div className="card plan-cal">
      <div className="row between">
        <button className="icon-btn small" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month">
          <ChevronLeft size={16} />
        </button>
        <strong className="cal-month">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</strong>
        <button className="icon-btn small" onClick={() => shift(1)} disabled={!canNext} aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="cal-grid" role="grid">
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="cal-wd">
            {w}
          </span>
        ))}
        {cells.map((k, i) => {
          if (!k) return <span key={i} />;
          const info = byDay.get(k);
          const kinds = new Set(info?.items.map((x) => x.kind));
          const past = k < today;
          return (
            <button
              key={k}
              className={`cal-day ${k === today ? 'is-today' : ''} ${k === selected ? 'is-selected' : ''} ${past ? 'is-past' : ''} ${info?.exams.length ? 'is-exam' : ''}`}
              onClick={() => setSelected(k)}
              aria-label={`${k}${info?.exams.length ? `, exam: ${info.exams.join(', ')}` : ''}${info?.items.length ? `, ${info.items.length} planned` : ''}`}
            >
              <span className="cal-num">{Number(k.slice(8))}</span>
              <span className="cal-dots">
                {info?.exams.length ? <Flag size={9} className="cal-flag" /> : null}
                {(['learn', 'review', 'final'] as const).filter((x) => kinds.has(x)).map((x) => (
                  <i key={x} className={`dot kind-${x}`} />
                ))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="cal-legend muted small">
        <span>
          <i className="dot kind-learn" /> Learn
        </span>
        <span>
          <i className="dot kind-review" /> Review
        </span>
        <span>
          <i className="dot kind-final" /> Final review
        </span>
        <span>
          <Flag size={10} className="cal-flag" /> Exam
        </span>
      </div>

      <div className="cal-detail">
        <div className="field-label">
          {selected === today ? 'Today' : selDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
        </div>
        {sel?.exams.map((t) => (
          <p key={t} className="cal-exam">
            <Flag size={12} /> {t}
          </p>
        ))}
        {sel?.items.length ? (
          <ul className="plan-list">
            {sel.items.map((it, i) =>
              selected === today ? (
                <PlanItemRow key={i} it={it} />
              ) : (
                <li key={i} className="plan-item">
                  <span className="plan-text">
                    <span className={`plan-kind kind-${it.kind}`}>{KIND_LABEL[it.kind]}</span> {it.label} <span className="muted small">· {it.examTitle}</span>
                  </span>
                </li>
              ),
            )}
          </ul>
        ) : (
          !sel?.exams.length && <p className="muted small">{selected < today ? 'Past day.' : 'Nothing planned — a free day, or a good one to get ahead.'}</p>
        )}
        {selected > today && sel?.items.length ? <p className="muted small">The plan updates every day as you study, so future days can shift a little.</p> : null}
      </div>

      <div className="cal-export">
        <button className="btn small" onClick={() => downloadIcs(plans)}>
          <CalendarPlus size={13} /> Add to Google / Apple Calendar
        </button>
        <p className="muted small">
          Downloads a calendar file with your study days and exams — open it, or import it in Google Calendar (Settings → Import). It’s a snapshot: download again if your plan changes a lot.
        </p>
      </div>
    </div>
  );
}
