import { useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, CalendarDays, Sparkles, X } from 'lucide-react';
import { useStore } from '../store';
import { buildRecap, weekStart, type Recap } from '../lib/recap';
import { fmtMinutes, dayKey, usePersistentState } from '../lib/storage';
import { usePlans } from './PlanPanel';

function Delta({ now, before, fmt = (n: number) => String(n) }: { now: number; before: number; fmt?: (n: number) => string }) {
  if (!before && !now) return null;
  const diff = now - before;
  if (!diff) return <span className="muted small"> · same as the week before</span>;
  return (
    <span className={`small delta ${diff > 0 ? 'up' : 'down'}`}>
      {diff > 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {fmt(Math.abs(diff))} vs the week before
    </span>
  );
}

function RecapBody({ r }: { r: Recap }) {
  return (
    <>
      <div className="recap-stats">
        <div>
          <strong>{fmtMinutes(r.week.minutes)}</strong>
          <span className="muted small">focused</span>
          <Delta now={r.week.minutes} before={r.prev.minutes} fmt={fmtMinutes} />
        </div>
        <div>
          <strong>{r.week.days}/7</strong>
          <span className="muted small">days studied</span>
          <Delta now={r.week.days} before={r.prev.days} fmt={(n) => `${n} day${n === 1 ? '' : 's'}`} />
        </div>
        <div>
          <strong>{r.week.answered}</strong>
          <span className="muted small">questions answered{r.week.accuracy !== null ? ` · ${Math.round(r.week.accuracy * 100)}% right` : ''}</span>
          <Delta now={r.week.answered} before={r.prev.answered} />
        </div>
        <div>
          <strong>{r.week.avgRating !== null ? `${r.week.avgRating.toFixed(1)}/5` : '—'}</strong>
          <span className="muted small">average session focus</span>
        </div>
      </div>
      {r.week.topSubject && <p className="small">Most time on <strong>{r.week.topSubject}</strong>.</p>}
      {r.best && (
        <p className="small recap-best">
          <Sparkles size={13} /> Best session: <strong>{r.best.title}</strong> at {r.best.when} ({r.best.rating}/5)
          {r.best.factors.length > 0 && <span className="muted"> — you’d ticked {r.best.factors.slice(0, 4).join(', ').toLowerCase()}. Worth repeating.</span>}
        </p>
      )}
      <div className="field-label">The week ahead</div>
      {r.exams.length === 0 && r.due.length === 0 ? (
        <p className="muted small">No exams or deadlines in the next 7 days. A good week to get ahead on reviews.</p>
      ) : (
        <ul className="recap-ahead small">
          {r.exams.map((e) => (
            <li key={e.title}>
              <CalendarDays size={13} /> <strong>{e.title}</strong> {e.daysLeft === 0 ? 'today' : `in ${e.daysLeft} day${e.daysLeft === 1 ? '' : 's'}`} · {Math.round(e.readiness * 100)}% ready · {e.planned} planned task
              {e.planned === 1 ? '' : 's'}
            </li>
          ))}
          {r.due.map((d) => (
            <li key={d.title}>
              <i className="due-mark" /> <strong>{d.title}</strong> {d.label}
              {d.blocksLeft ? ` · ${d.blocksLeft} block${d.blocksLeft === 1 ? '' : 's'} left` : ''}
            </li>
          ))}
        </ul>
      )}
      {r.suggestedPerDay > 0 && (
        <p className="small accent">
          To stay on track: about {r.suggestedPerDay} focus block{r.suggestedPerDay === 1 ? '' : 's'} a day this week.
        </p>
      )}
    </>
  );
}

function useRecap(current: boolean) {
  const { sessions, studySessions, reviewLog, tasks } = useStore();
  const plans = usePlans();
  return useMemo(() => buildRecap({ blocks: sessions, studySessions, reviewLog, plans, tasks, current }), [sessions, studySessions, reviewLog, plans, tasks, current]);
}

/** Progress card: this week so far, or last week. */
export function WeeklyRecapCard() {
  const [current, setCurrent] = useState(true);
  const r = useRecap(current);
  return (
    <section className="card recap">
      <div className="row between">
        <div className="eyebrow">Weekly recap · {r.week.label}</div>
        <div className="segmented mini">
          <button className={current ? 'is-active' : ''} onClick={() => setCurrent(true)}>
            This week
          </button>
          <button className={!current ? 'is-active' : ''} onClick={() => setCurrent(false)}>
            Last week
          </button>
        </div>
      </div>
      <RecapBody r={r} />
    </section>
  );
}

/** Once a week (first visit from Monday on), a recap of last week — if there was anything to recap. */
export function WeeklyRecapPrompt({ onOpenPlan }: { onOpenPlan: () => void }) {
  const r = useRecap(false);
  const thisWeek = dayKey(weekStart());
  const [seen, setSeen] = usePersistentState<string>('recapSeen', '');
  if (seen === thisWeek || r.week.blocks === 0) return null;
  const close = () => setSeen(thisWeek);
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Your week in review">
      <div className="modal recap">
        <div className="modal-head">
          <div>
            <div className="eyebrow">Your week in review · {r.week.label}</div>
            <h3>{r.week.minutes >= r.prev.minutes && r.prev.minutes ? 'Up on the week before — nice.' : 'Here’s how last week went'}</h3>
          </div>
          <button className="icon-btn" onClick={close} aria-label="Close">
            <X size={18} />
          </button>
        </div>
        <RecapBody r={r} />
        <div className="row">
          <button
            className="btn primary"
            onClick={() => {
              close();
              onOpenPlan();
            }}
          >
            Open my plan
          </button>
          <button className="btn ghost" onClick={close}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
