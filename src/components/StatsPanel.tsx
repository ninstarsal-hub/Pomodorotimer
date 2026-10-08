import { useMemo } from 'react';
import { Target } from 'lucide-react';
import { useStore, sectionKey } from '../store';
import { dayKey, fmtMinutes } from '../lib/storage';
import { deckSections, sectionLabel } from '../lib/quiz';

export function StatsPanel() {
  const { sessions, reviewLog, tasks, today, settings } = useStore();
  const goal = settings.dailyGoalMin;

  const data = useMemo(() => {
    const byDay: Record<string, number> = {};
    for (const s of sessions) byDay[s.day] = (byDay[s.day] ?? 0) + s.minutes;

    const week = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      const key = dayKey(d);
      return { key, label: d.toLocaleDateString(undefined, { weekday: 'short' }), minutes: byDay[key] ?? 0 };
    });

    // A day counts toward the streak when it hits the daily goal (or has any focus if there's no goal).
    const counts = (k: string) => (byDay[k] ?? 0) >= Math.max(1, goal);
    let streak = 0;
    const d = new Date();
    if (!counts(dayKey(d))) d.setDate(d.getDate() - 1); // today isn't over yet, so it can't break the streak
    while (counts(dayKey(d))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    const weekKeys = new Set(week.map((w) => w.key));
    const weekSessions = sessions.filter((s) => weekKeys.has(s.day));
    const bySubject: Record<string, number> = {};
    for (const s of weekSessions) bySubject[s.subject || 'Unlabelled'] = (bySubject[s.subject || 'Unlabelled'] ?? 0) + s.minutes;
    const subjects = Object.entries(bySubject).sort((a, b) => b[1] - a[1]);

    const rated = weekSessions.filter((s) => s.rating);
    const avgRating = rated.length ? rated.reduce((a, s) => a + (s.rating ?? 0), 0) / rated.length : null;

    // Calendar week (Monday to today) for the weekly goal.
    const monday = new Date();
    monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
    let calWeek = 0;
    for (const x = new Date(monday); dayKey(x) <= today; x.setDate(x.getDate() + 1)) calWeek += byDay[dayKey(x)] ?? 0;

    const todaySessions = sessions.filter((s) => s.day === today);
    const total = sessions.reduce((a, s) => a + s.minutes, 0);
    return { week, streak, subjects, avgRating, todaySessions, total, calWeek, weekTotal: weekSessions.reduce((a, s) => a + s.minutes, 0) };
  }, [sessions, today, goal]);

  const todayReviews = reviewLog[today] ?? { total: 0, correct: 0 };
  const max = Math.max(60, goal, ...data.week.map((w) => w.minutes));
  const todayMinutes = data.todaySessions.reduce((a, s) => a + s.minutes, 0);
  const doneToday = tasks.filter((t) => t.day === today && t.done).length;
  const recent = [...sessions].reverse().slice(0, 8);

  return (
    <div className="stack">
      <div className="tiles">
        <Tile label="Focused today" value={fmtMinutes(todayMinutes)} sub={`${data.todaySessions.length} block${data.todaySessions.length === 1 ? '' : 's'}`} />
        <Tile label="Streak" value={`${data.streak} day${data.streak === 1 ? '' : 's'}`} sub={goal ? `days hitting ${fmtMinutes(goal)}` : data.streak ? 'Keep it alive' : 'Start one today'} />
        <Tile label="Recall today" value={todayReviews.total ? `${Math.round((todayReviews.correct / todayReviews.total) * 100)}%` : '—'} sub={`${todayReviews.total} questions`} />
        <Tile label="Tasks done" value={String(doneToday)} sub="today" />
      </div>

      {(goal > 0 || settings.weeklyGoalMin > 0) && (
        <section className="card">
          <div className="eyebrow">Goals</div>
          {goal > 0 && <GoalBar label="Today" value={todayMinutes} goal={goal} />}
          {settings.weeklyGoalMin > 0 && <GoalBar label="This week" value={data.calWeek} goal={settings.weeklyGoalMin} />}
          <p className="muted small">Change your goals in Settings.</p>
        </section>
      )}

      <MasteryCard />

      <section className="card">
        <div className="row between">
          <div className="eyebrow">Focus minutes · last 7 days</div>
          <span className="muted small">
            {fmtMinutes(data.weekTotal)} total{goal > 0 ? ' · dashed line = daily goal' : ''}
          </span>
        </div>
        <div className="bars" role="table" aria-label="Focus minutes per day">
          {data.week.map((w) => (
            <div key={w.key} className={`bar-col ${w.key === today ? 'is-today' : ''}`} role="row">
              <div className="bar-track">
                {goal > 0 && <span className="goal-tick" style={{ bottom: `${(goal / max) * 100}%` }} aria-hidden />}
                <div className="bar" style={{ height: `${(w.minutes / max) * 100}%` }} data-tip={`${w.label}: ${fmtMinutes(w.minutes)}`} role="cell" aria-label={`${w.label}: ${w.minutes} minutes`} />
              </div>
              <span className="bar-label" role="rowheader">
                {w.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {data.subjects.length > 0 && (
        <section className="card">
          <div className="eyebrow">By subject · this week</div>
          <ul className="subject-list">
            {data.subjects.map(([name, min]) => (
              <li key={name}>
                <span>{name}</span>
                <span className="subject-bar">
                  <span style={{ width: `${(min / data.subjects[0][1]) * 100}%` }} />
                </span>
                <span className="muted small">{fmtMinutes(min)}</span>
              </li>
            ))}
          </ul>
          <p className="muted small">Spreading time across subjects (rather than one marathon) gives you spacing and interleaving for free.</p>
        </section>
      )}

      {data.avgRating !== null && (
        <section className="card">
          <div className="eyebrow">Self-rated focus · this week</div>
          <p className="big-number">
            {data.avgRating.toFixed(1)} <span className="muted small">/ 5</span>
          </p>
          <p className="muted small">Compare weeks when you change something — a sound preset, timer length, or studying at a different time of day.</p>
        </section>
      )}

      <section className="card">
        <div className="eyebrow">Recent blocks</div>
        {recent.length === 0 ? (
          <p className="empty-state">Your completed focus blocks will appear here.</p>
        ) : (
          <ul className="session-list">
            {recent.map((s) => {
              const t = tasks.find((x) => x.id === s.taskId);
              return (
                <li key={s.id}>
                  <div className="row between">
                    <span>{t?.title ?? s.intention ?? 'Focus block'}</span>
                    <span className="muted small">
                      {new Date(s.at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {s.minutes}m{s.rating ? ` · ${s.rating}/5` : ''}
                    </span>
                  </div>
                  {s.recall && <p className="muted small recall-note">{s.recall}</p>}
                </li>
              );
            })}
          </ul>
        )}
        <p className="muted small">All-time: {fmtMinutes(data.total)}</p>
      </section>
    </div>
  );
}

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="tile">
      <span className="tile-label">{label}</span>
      <span className="tile-value">{value}</span>
      <span className="tile-sub">{sub}</span>
    </div>
  );
}

function GoalBar({ label, value, goal }: { label: string; value: number; goal: number }) {
  const pct = Math.min(1, value / goal);
  return (
    <div className="goal-bar">
      <div className="row between small">
        <span>{label}</span>
        <span className={pct >= 1 ? 'accent' : 'muted'}>
          {fmtMinutes(value)} / {fmtMinutes(goal)}
          {pct >= 1 ? ' ✓' : ''}
        </span>
      </div>
      <span className="subject-bar">
        <span style={{ width: `${pct * 100}%` }} />
      </span>
    </div>
  );
}

/** How well you know each studied section, weakest first, with a one-click quiz on the weakest. */
function MasteryCard() {
  const { decks, cards, reviews, setBuilderOpen } = useStore();
  const rows = useMemo(() => {
    const out: { key: string; deck: string; label: string; score: number; seen: number; total: number }[] = [];
    for (const d of decks) {
      const studied = new Set(d.studied ?? []);
      for (const sec of deckSections(d)) {
        if (!studied.has(sec)) continue;
        const cs = cards.filter((c) => c.deckId === d.id && c.section === sec);
        if (!cs.length) continue;
        let score = 0;
        let seen = 0;
        for (const c of cs) {
          const r = reviews[c.id];
          if (!r?.seen) continue;
          seen++;
          score += Math.min(1, r.box / 4) * 0.6 + (r.correct / r.seen) * 0.4;
        }
        out.push({ key: sectionKey(d.id, sec), deck: d.title, label: sectionLabel(sec, d), score: score / cs.length, seen, total: cs.length });
      }
    }
    return out.sort((a, b) => a.score - b.score);
  }, [decks, cards, reviews]);

  if (!rows.length) return null;
  const level = (s: number) => (s < 0.35 ? 'Weak' : s < 0.7 ? 'Okay' : 'Strong');
  const weakest = rows.slice(0, 3);

  return (
    <section className="card">
      <div className="row between">
        <div className="eyebrow">Mastery by section</div>
        <span className="muted small">weakest first</span>
      </div>
      <ul className="mastery-list">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="row between small">
              <span className="truncate" title={`${r.deck} · ${r.label}`}>
                {r.label} <span className="muted">· {r.deck}</span>
              </span>
              <span className={`level level-${level(r.score).toLowerCase()}`}>
                {level(r.score)} · {Math.round(r.score * 100)}%
              </span>
            </div>
            <span className="subject-bar">
              <span style={{ width: `${Math.max(2, r.score * 100)}%`, opacity: 0.35 + r.score * 0.65 }} />
            </span>
            <span className="muted small">
              {r.seen}/{r.total} questions practised
            </span>
          </li>
        ))}
      </ul>
      <button className="btn primary" onClick={() => setBuilderOpen(true, { scope: weakest.map((w) => w.key), weakFirst: true, count: 10 })}>
        <Target size={14} /> Quiz my {weakest.length === 1 ? 'weakest section' : `${weakest.length} weakest sections`}
      </button>
    </section>
  );
}
