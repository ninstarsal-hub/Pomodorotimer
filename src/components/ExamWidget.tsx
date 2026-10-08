import { useEffect, useRef, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, EyeOff } from 'lucide-react';
import { useStore } from '../store';
import { usePlans } from './PlanPanel';

const when = (d: number) => (d === 0 ? 'Today' : d === 1 ? 'Tomorrow' : `${d} days`);

/** Compact "next exam" countdown in the top bar; cycle through exams, expand for the full list, or hide it. */
export function ExamWidget({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { settings, setSettings } = useStore();
  const plans = usePlans();
  const [i, setI] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close the dropdown when clicking elsewhere.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [open]);

  if (!plans.length) return null;
  const setShown = (v: boolean) => setSettings((s) => ({ ...s, showExamWidget: v }));

  if (!settings.showExamWidget) {
    return (
      <button className="icon-btn exam-show" onClick={() => setShown(true)} aria-label="Show exam countdown" data-tip="Show exam countdown">
        <CalendarDays size={16} strokeWidth={1.6} />
        <span className="exam-show-count">{plans[0].daysLeft}d</span>
      </button>
    );
  }

  const idx = Math.min(i, plans.length - 1);
  const p = plans[idx];
  const pct = Math.round(p.readiness * 100);
  const step = (d: number) => setI((x) => (Math.min(x, plans.length - 1) + d + plans.length) % plans.length);

  return (
    <div className="exam-widget" ref={ref}>
      {plans.length > 1 && (
        <button className="exam-nav" onClick={() => step(-1)} aria-label="Previous exam">
          <ChevronLeft size={14} />
        </button>
      )}
      <button className="exam-main" onClick={() => setOpen((o) => !o)} aria-expanded={open} title="See all upcoming exams">
        <span className="exam-days">
          <strong>{p.daysLeft === 0 ? '!' : p.daysLeft}</strong>
          <span>{p.daysLeft === 0 ? 'today' : p.daysLeft === 1 ? 'day' : 'days'}</span>
        </span>
        <span className="exam-info">
          <span className="exam-title truncate">{p.exam.title}</span>
          <span className="exam-ready">
            <span className="mini-bar">
              <span style={{ width: `${Math.max(3, pct)}%` }} />
            </span>
            {pct}% ready
          </span>
        </span>
        {plans.length > 1 && (
          <span className="exam-count muted">
            {idx + 1}/{plans.length}
          </span>
        )}
      </button>
      {plans.length > 1 && (
        <button className="exam-nav" onClick={() => step(1)} aria-label="Next exam">
          <ChevronRight size={14} />
        </button>
      )}
      <button className="exam-nav" onClick={() => setShown(false)} aria-label="Hide exam countdown" title="Hide (bring it back with the calendar icon)">
        <EyeOff size={13} />
      </button>

      {open && (
        <div className="exam-dropdown" role="dialog" aria-label="Upcoming exams">
          <div className="eyebrow">Upcoming exams</div>
          <ul>
            {plans.map((x, n) => (
              <li key={x.exam.id}>
                <button
                  className={`exam-row ${n === idx ? 'is-current' : ''}`}
                  onClick={() => {
                    setI(n);
                    setOpen(false);
                  }}
                >
                  <span className="exam-row-days">{when(x.daysLeft)}</span>
                  <span className="exam-row-main">
                    <span className="truncate">{x.exam.title}</span>
                    <span className="muted small">
                      {x.deck.title} · {x.exam.date}
                    </span>
                    <span className="readiness">
                      <span className="subject-bar grow">
                        <span style={{ width: `${Math.max(2, x.readiness * 100)}%` }} />
                      </span>
                      <span className="small">{Math.round(x.readiness * 100)}%</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            className="btn small wide"
            onClick={() => {
              setOpen(false);
              onOpenPlan();
            }}
          >
            Open exam plan
          </button>
        </div>
      )}
    </div>
  );
}
