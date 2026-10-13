import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../store';
import { dayKey, fmtMinutes } from '../lib/storage';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/** Shade step 0–4 for a day's minutes, relative to the daily goal (or 2h with no goal). */
function level(min: number, goal: number) {
  if (!min) return 0;
  const ref = goal || 120;
  const r = min / ref;
  return r < 0.34 ? 1 : r < 0.67 ? 2 : r < 1 ? 3 : 4;
}

/** Calendar heatmap of focus minutes for one month, with month-to-month navigation and a summary. */
export function MonthHeatmap() {
  const { sessions, settings, today } = useStore();
  const goal = settings.dailyGoalMin;
  const now = new Date();
  const [month, setMonth] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [hover, setHover] = useState<string | null>(null);

  const byDay = useMemo(() => {
    const map = new Map<string, { minutes: number; blocks: number; ratings: number[] }>();
    for (const s of sessions) {
      const d = map.get(s.day) ?? { minutes: 0, blocks: 0, ratings: [] };
      d.minutes += s.minutes;
      d.blocks++;
      if (s.rating) d.ratings.push(s.rating);
      map.set(s.day, d);
    }
    return map;
  }, [sessions]);

  const firstData = sessions.length ? sessions.reduce((a, s) => (s.day < a ? s.day : a), today) : today;
  const [fy, fm] = firstData.split('-').map(Number);
  const canPrev = month.y > fy || (month.y === fy && month.m > fm - 1);
  const canNext = month.y < now.getFullYear() || (month.y === now.getFullYear() && month.m < now.getMonth());
  const shift = (d: number) => setMonth(({ y, m }) => ({ y: y + Math.floor((m + d) / 12), m: (((m + d) % 12) + 12) % 12 }));

  const stats = (y: number, m: number, upTo = 31) => {
    const days = Math.min(upTo, new Date(y, m + 1, 0).getDate());
    let total = 0;
    let active = 0;
    let hit = 0;
    let best: { key: string; minutes: number } | null = null;
    for (let i = 1; i <= days; i++) {
      const key = dayKey(new Date(y, m, i));
      const min = byDay.get(key)?.minutes ?? 0;
      total += min;
      if (min) active++;
      if (goal && min >= goal) hit++;
      if (min && (!best || min > best.minutes)) best = { key, minutes: min };
    }
    return { total, active, hit, best };
  };
  const isCurrent = month.y === now.getFullYear() && month.m === now.getMonth();
  const cur = stats(month.y, month.m);
  // For the month in progress, compare with the same days of last month (1st to today's date).
  const prev = stats(month.m === 0 ? month.y - 1 : month.y, month.m === 0 ? 11 : month.m - 1, isCurrent ? now.getDate() : 31);
  const change = prev.total ? Math.round(((cur.total - prev.total) / prev.total) * 100) : null;

  const first = new Date(month.y, month.m, 1);
  const lead = (first.getDay() + 6) % 7; // weeks start on Monday
  const daysInMonth = new Date(month.y, month.m + 1, 0).getDate();
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => dayKey(new Date(month.y, month.m, i + 1)))];
  while (cells.length % 7) cells.push(null);

  const monthName = first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const prevName = new Date(month.y, month.m - 1, 1).toLocaleDateString(undefined, { month: 'long' });
  const hovered = hover ? byDay.get(hover) : undefined;
  const fmtDay = (k: string) => {
    const [y, m, d] = k.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <section className="card month-heat">
      <div className="row between">
        <div className="eyebrow">Focus by month</div>
        <div className="row month-nav">
          <button className="icon-btn small" onClick={() => shift(-1)} disabled={!canPrev} aria-label="Previous month">
            <ChevronLeft size={15} />
          </button>
          <span className="small">{monthName}</span>
          <button className="icon-btn small" onClick={() => shift(1)} disabled={!canNext} aria-label="Next month">
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="month-stats">
        <div>
          <strong>{fmtMinutes(cur.total)}</strong>
          <span className="muted small">focused</span>
        </div>
        <div>
          <strong>{cur.active}</strong>
          <span className="muted small">days studied</span>
        </div>
        {goal > 0 && (
          <div>
            <strong>{cur.hit}</strong>
            <span className="muted small">goal days</span>
          </div>
        )}
        <div>
          <strong>{cur.active ? fmtMinutes(Math.round(cur.total / cur.active)) : '—'}</strong>
          <span className="muted small">avg / study day</span>
        </div>
      </div>

      <div className="heat-grid" role="grid" aria-label={`Focus minutes per day, ${monthName}`} onMouseLeave={() => setHover(null)}>
        {WEEKDAYS.map((w, i) => (
          <span key={i} className="heat-wd" aria-hidden>
            {w}
          </span>
        ))}
        {cells.map((k, i) => {
          if (!k) return <span key={i} />;
          const d = byDay.get(k);
          const min = d?.minutes ?? 0;
          const future = k > today;
          const metGoal = goal > 0 && min >= goal;
          return (
            <span
              key={k}
              role="gridcell"
              tabIndex={future ? -1 : 0}
              className={`heat-day l${level(min, goal)} ${metGoal ? 'is-goal' : ''} ${k === today ? 'is-today' : ''} ${future ? 'is-future' : ''} ${hover === k ? 'is-hover' : ''}`}
              aria-label={`${fmtDay(k)}: ${min ? fmtMinutes(min) : 'no focus'}${metGoal ? ', goal met' : ''}`}
              onMouseEnter={() => setHover(k)}
              onFocus={() => setHover(k)}
              onBlur={() => setHover(null)}
            >
              {Number(k.slice(8))}
            </span>
          );
        })}
      </div>

      <div className="heat-foot">
        <p className="small heat-detail" aria-live="polite">
          {hover ? (
            <>
              <strong>{fmtDay(hover)}</strong>
              <span className="muted">
                {' '}
                · {hovered ? `${fmtMinutes(hovered.minutes)} · ${hovered.blocks} block${hovered.blocks === 1 ? '' : 's'}` : 'no focus'}
                {hovered?.ratings.length ? ` · focus ${(hovered.ratings.reduce((a, b) => a + b, 0) / hovered.ratings.length).toFixed(1)}/5` : ''}
                {goal && hovered && hovered.minutes >= goal ? ' · goal met ✓' : ''}
              </span>
            </>
          ) : cur.best ? (
            <span className="muted">
              Best day: {fmtDay(cur.best.key)} ({fmtMinutes(cur.best.minutes)})
              {change !== null && (
                <>
                  {' '}
                  · {change >= 0 ? '+' : ''}
                  {change}% vs {isCurrent ? `the same days of ${prevName}` : prevName}
                </>
              )}
            </span>
          ) : (
            <span className="muted">No focus logged this month{isCurrent ? ' yet' : ''}.</span>
          )}
        </p>
        <div className="heat-legend muted small" aria-hidden>
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <i key={l} className={`heat-key l${l}`} />
          ))}
          More{goal > 0 && <span className="heat-ring-key">○ goal met</span>}
        </div>
      </div>
    </section>
  );
}
