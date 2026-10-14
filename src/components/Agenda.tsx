import { CalendarClock, CalendarDays, Repeat, RotateCcw } from 'lucide-react';
import { upcoming } from '../lib/assignments';
import { useDueProblems } from './PracticePanel';
import { useStore } from '../store';
import { buildQuiz } from '../lib/quiz';
import { CramButton, PlanItemRow, canCram, dueSummary, usePlanActions, usePlans } from './PlanPanel';

/** Main-screen "what to do today": due reviews + today's exam-plan tasks. */
export function Agenda({ onOpenPlan }: { onOpenPlan: () => void }) {
  const { unlocked, reviews, setQuiz, setPracticeRun, tasks, setActiveTaskId, activeTaskId } = useStore();
  const dueProblems = useDueProblems();
  const plans = usePlans();
  const { isDone } = usePlanActions();
  const { due, minutes } = dueSummary(unlocked, reviews);

  const todays = plans.flatMap((p) => p.days[0].map((it) => ({ it, plan: p })));
  const open = todays.filter((t) => !isDone(t.it));
  const next = plans[0];
  const dueSoon = upcoming(tasks).filter((d) => d.daysLeft <= 2);
  if (!due.length && !next && !dueProblems.length && !dueSoon.length) return null;

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
      {dueSoon.map((d) => (
        <div key={d.task.id} className={`agenda-row due-soon ${d.daysLeft < 0 ? 'is-overdue' : ''}`}>
          <CalendarClock size={14} className="accent" />
          <span className="grow">
            <strong>{d.task.title}</strong>{' '}
            <span className="muted">
              · {d.label}
              {d.blocksLeft > 0 ? ` · ${d.blocksLeft} block${d.blocksLeft === 1 ? '' : 's'} left` : ''}
            </span>
          </span>
          {d.task.id !== activeTaskId && d.blocksLeft > 0 && (
            <button className="btn small" onClick={() => setActiveTaskId(d.task.id)}>
              Work on it
            </button>
          )}
        </div>
      ))}
      {dueProblems.length > 0 && (
        <div className="agenda-row">
          <Repeat size={14} className="accent" />
          <span className="grow">
            <strong>{dueProblems.length}</strong> missed problem{dueProblems.length === 1 ? '' : 's'} to re-solve
          </span>
          <button className="btn small" onClick={() => setPracticeRun({ refs: dueProblems, title: 'Re-solve' })}>
            Re-solve
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
          {canCram(next) && (
            <div className="agenda-row">
              <span className="grow small">{next.daysLeft === 0 ? 'Exam today' : next.daysLeft === 1 ? 'Exam tomorrow' : 'Exam in 2 days'} — drill your shakiest questions.</span>
              <CramButton plan={next} label="Cram" />
            </div>
          )}
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
