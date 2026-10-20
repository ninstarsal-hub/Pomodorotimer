import { CalendarClock, CalendarDays, Check, ChevronDown, Headphones, ListTodo, Repeat, RotateCcw } from 'lucide-react';
import { upcoming } from '../lib/assignments';
import { useDueProblems } from './PracticePanel';
import { useStore } from '../store';
import { usePersistentState } from '../lib/storage';
import { buildQuiz } from '../lib/quiz';
import { CramButton, PlanItemRow, canCram, dueSummary, usePlanActions, usePlans } from './PlanPanel';

/** Main-screen "Today" card: due reviews, assignments due soon, today's exam-plan tasks and to-dos, with progress. */
export function Agenda({ onOpenPlan, onOpenToday }: { onOpenPlan: () => void; onOpenToday: () => void }) {
  const { unlocked, reviews, setQuiz, setPracticeRun, tasks, setActiveTaskId, activeTaskId, setListenOpen, today, reviewLog } = useStore();
  const [collapsed, setCollapsed] = usePersistentState('todayCollapsed', false);
  const dueProblems = useDueProblems();
  const plans = usePlans();
  const { isDone } = usePlanActions();
  const { due, minutes } = dueSummary(unlocked, reviews);

  const todays = plans.flatMap((p) => p.days[0].map((it) => ({ it, plan: p })));
  const open = todays.filter((t) => !isDone(t.it));
  const next = plans[0];
  const dueSoon = upcoming(tasks).filter((d) => d.daysLeft <= 2);
  // To-dos for today that aren't already listed as assignments due soon.
  const shown = new Set(dueSoon.map((d) => d.task.id));
  const todos = tasks.filter((t) => !t.done && t.day === today && !shown.has(t.id));
  const doneTodos = tasks.filter((t) => t.done && t.doneDay === today).length;
  const reviewedToday = reviewLog[today]?.total ?? 0;

  // Progress: each plan task, assignment and to-do counts once; "due reviews" and "re-solve" count as one each.
  const left = open.length + dueSoon.length + todos.length + (due.length ? 1 : 0) + (dueProblems.length ? 1 : 0);
  const done = todays.length - open.length + doneTodos + (!due.length && reviewedToday ? 1 : 0);
  const total = left + done;
  if (!total && !next) return null;

  const allDone = left === 0;
  const summary = allDone
    ? 'All caught up ✓'
    : `${done} of ${total} done${reviewedToday ? ` · ${reviewedToday} reviewed` : ''}`;

  return (
    <div className={`agenda today-card fade-zen ${collapsed ? 'is-collapsed' : ''}`}>
      <button className="today-head" onClick={() => setCollapsed((c) => !c)} aria-expanded={!collapsed}>
        <span className="eyebrow">Today</span>
        <span className={`small grow ${allDone ? 'accent' : 'muted'}`}>{summary}</span>
        {total > 0 && (
          <span className="today-progress" aria-hidden>
            <span style={{ width: `${Math.round((done / total) * 100)}%` }} />
          </span>
        )}
        <ChevronDown size={14} className="today-chevron" />
      </button>
      {!collapsed && allDone && total > 0 && (
        <div className="agenda-row today-clear">
          <Check size={14} className="accent" />
          <span className="grow small">
            Everything planned for today is done
            {reviewedToday ? ` — and ${reviewedToday} question${reviewedToday === 1 ? '' : 's'} reviewed` : ''}. Anything more is a head start on tomorrow.
          </span>
        </div>
      )}
      {!collapsed && (
        <>
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
              <button className="icon-btn small" onClick={() => setListenOpen(true)} aria-label="Listen mode" title="Listen mode — hear your reviews read aloud (great on a walk)">
                <Headphones size={14} />
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
          {todos.length > 0 && (
            <button className="agenda-row agenda-exam" onClick={onOpenToday}>
              <ListTodo size={14} className="accent" />
              <span className="grow">
                <strong>{todos.length}</strong> to-do{todos.length === 1 ? '' : 's'} on today’s list{' '}
                <span className="muted">· {todos.slice(0, 2).map((t) => t.title).join(', ')}{todos.length > 2 ? '…' : ''}</span>
              </span>
              <span className="muted small">Open →</span>
            </button>
          )}
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
        </>
      )}
    </div>
  );
}
