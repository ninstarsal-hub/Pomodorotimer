import { CalendarDays, RotateCcw } from 'lucide-react';
import { useStore } from '../store';
import { buildQuiz } from '../lib/quiz';
import { PlanItemRow, dueSummary, usePlanActions, usePlans } from './PlanPanel';

/** Main-screen "what to do today": due reviews + today's exam-plan tasks. */
export function Agenda({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { unlocked, reviews, setQuiz } = useStore();
  const plans = usePlans();
  const { isDone } = usePlanActions();
  const { due, minutes } = dueSummary(unlocked, reviews);

  const todays = plans.flatMap((p) => p.days[0].map((it) => ({ it, plan: p })));
  const open = todays.filter((t) => !isDone(t.it));
  const next = plans[0];
  if (!due.length && !next) return null;

  return (
    <div className="agenda fade-zen">
      {due.length > 0 && (
        <div className="agenda-row">
          <RotateCcw size={14} className="accent" />
          <span className="grow">
            <strong>{due.length}</strong> question{due.length === 1 ? '' : 's'} due for review <span className="muted">· ~{minutes} min</span>
          </span>
          <button
            className="btn small primary"
            onClick={() => {
              const items = buildQuiz(due, reviews, Math.min(10, due.length));
              if (items.length) setQuiz({ items, title: 'Due reviews', subtitle: due.length > 10 ? `First 10 of ${due.length} due — come back for the rest.` : 'Reviewing right before you’d forget makes memories last longest.' });
            }}
          >
            Review {Math.min(10, due.length)}
          </button>
        </div>
      )}
      {next && (
        <>
          <button className="agenda-row agenda-exam" onClick={onOpenPlan}>
            <CalendarDays size={14} className="accent" />
            <span className="grow">
              <strong>{next.exam.title}</strong>{' '}
              <span className="muted">
                · {next.daysLeft === 0 ? 'today' : next.daysLeft === 1 ? 'tomorrow' : `in ${next.daysLeft} days`} · {Math.round(next.readiness * 100)}% ready
              </span>
            </span>
            <span className="muted small">{open.length ? `${todays.length - open.length}/${todays.length} done today` : todays.length ? 'All done today ✓' : 'Plan →'}</span>
          </button>
          {open.length > 0 && (
            <ul className="plan-list compact">
              {open.slice(0, 3).map(({ it }) => (
                <PlanItemRow key={it.examId + it.section + it.kind} it={it} compact />
              ))}
              {open.length > 3 && (
                <li>
                  <button className="link-btn small" onClick={onOpenPlan}>
                    +{open.length - 3} more in your plan
                  </button>
                </li>
              )}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
