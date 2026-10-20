import { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Crown, Flame, LogOut, RefreshCw, Settings2, UserMinus, Users, X } from 'lucide-react';
import { blockNames, boardRows, circlesApi, joinTogether, lastWeekKey, refreshCircles, startTogether, useCircles, weekWrap, wrapUpWindow, type BoardRow, type Circle, type GroupBlock, type GroupRef } from '../lib/circles';
import { signIn, useSync } from '../lib/sync';
import { fmtClock, fmtMinutes, usePersistentState } from '../lib/storage';
import { useStore } from '../store';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const inviteLink = (code: string) => `${location.origin}/#join=${code}`;
const errMsg = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

export function CirclesPanel() {
  const sync = useSync();
  const data = useCircles();
  const [selected, setSelected] = usePersistentState<string | null>('circleSel', null);
  const [pending, setPending] = useState(() => localStorage.getItem('stillpoint:pendingJoin'));
  useEffect(() => {
    const on = () => setPending(localStorage.getItem('stillpoint:pendingJoin'));
    window.addEventListener('stillpoint:pendingJoin', on);
    return () => window.removeEventListener('stillpoint:pendingJoin', on);
  }, []);

  useEffect(() => {
    if (sync.user) void refreshCircles();
  }, [sync.user]);
  // Keep the board fresh while it's open.
  useEffect(() => {
    if (!sync.user) return;
    const id = window.setInterval(() => document.visibilityState === 'visible' && void refreshCircles(), 20_000);
    return () => window.clearInterval(id);
  }, [sync.user]);

  if (!sync.user) {
    return (
      <div className="stack">
        <section className="card circles-intro">
          <div className="eyebrow">Study circles</div>
          <h3>Study alongside your friends</h3>
          <p className="muted small">
            Make a small private circle, invite friends with a link, and see each other’s week: which days you studied, focus time, streaks, and who’s in a focus block right now. Only those numbers are shared — never
            your notes, subjects or quiz results.
          </p>
          {pending && <p className="small accent">You’ve been invited to a circle — sign in to join it.</p>}
          <button className="btn primary" onClick={() => void signIn().catch(() => {})}>
            Sign in with Google to use circles
          </button>
        </section>
      </div>
    );
  }

  const me = sync.user.id;
  const circle = data.circles.find((c) => c.id === selected) ?? data.circles[0];

  return (
    <div className="stack">
      {pending && (
        <JoinCard
          code={pending}
          defaultName={sync.user.name || sync.user.email.split('@')[0]}
          onDone={(id) => {
            localStorage.removeItem('stillpoint:pendingJoin');
            setPending(null);
            if (id) setSelected(id);
          }}
        />
      )}

      {data.circles.length > 1 && (
        <div className="circle-tabs" role="tablist">
          {data.circles.map((c) => (
            <button key={c.id} role="tab" aria-selected={c.id === circle?.id} className={`chip ${c.id === circle?.id ? 'is-active' : ''}`} onClick={() => setSelected(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
      )}

      {circle ? (
        <Board circle={circle} me={me} />
      ) : (
        data.loadedAt > 0 && (
          <section className="card">
            <div className="eyebrow">Study circles</div>
            <p className="muted small">You’re not in a circle yet. Make one and share the invite link, or open a friend’s invite link to join theirs.</p>
          </section>
        )
      )}

      <NewCircle defaultName={sync.user.name || sync.user.email.split('@')[0]} onCreated={(id) => setSelected(id)} />

      {data.error && <p className="error small">{data.error}</p>}
      <MySharing />
    </div>
  );
}

function Board({ circle, me }: { circle: Circle; me: string }) {
  const data = useCircles();
  const members = data.members.filter((m) => m.circleId === circle.id);
  const rows = useMemo(() => boardRows(members, data.stats, me), [members, data.stats, me]);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const isOwner = circle.owner === me;
  const total = rows.reduce((a, r) => a + r.minutes, 0);
  const top = rows[0] && rows[0].days > 0 ? rows[0].userId : null;
  const today = new Date().toISOString().slice(0, 10);
  const cheeredToday = new Set(data.cheers.filter((c) => c.from === me && c.circleId === circle.id && c.day === today).map((c) => c.to));
  const cheersFor = (uid: string) => data.cheers.filter((c) => c.to === uid && c.circleId === circle.id && c.day === today).length;
  const studying = rows.filter((r) => r.studyingNow && !r.isMe).length;

  const act = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    setError('');
    try {
      await fn();
      await refreshCircles();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy('');
    }
  };

  const copyInvite = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink(circle.inviteCode));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setError('Couldn’t copy — long-press the link below instead.');
    }
  };

  return (
    <section className="card board">
      <div className="row between">
        <div>
          <div className="eyebrow">This week · Mon–Sun</div>
          <h3 className="board-title">{circle.name}</h3>
          <div className="muted small">
            {rows.length} member{rows.length === 1 ? '' : 's'}
            {studying > 0 && (
              <span className="studying-note">
                {' '}
                · <i className="live-dot" /> {studying} studying now
              </span>
            )}
          </div>
        </div>
        <div className="row">
          <button className="icon-btn small" onClick={() => void refreshCircles()} aria-label="Refresh" title="Refresh">
            <RefreshCw size={13} />
          </button>
          <button className={`icon-btn small ${showSettings ? 'is-active' : ''}`} onClick={() => setShowSettings((s) => !s)} aria-label="Circle settings" title="Circle settings">
            <Settings2 size={14} />
          </button>
        </div>
      </div>

      <WeekWrapCard circle={circle} />

      {circle.weeklyGoalMin > 0 && (
        <div className="goal-bar circle-goal">
          <div className="row between small">
            <span>Circle goal</span>
            <span className={total >= circle.weeklyGoalMin ? 'accent' : 'muted'}>
              {fmtMinutes(total)} / {fmtMinutes(circle.weeklyGoalMin)}
              {total >= circle.weeklyGoalMin ? ' ✓' : ''}
            </span>
          </div>
          <span className="subject-bar">
            <span style={{ width: `${Math.min(100, (total / circle.weeklyGoalMin) * 100)}%` }} />
          </span>
        </div>
      )}

      {data.togetherReady ? (
        <Together circle={circle} me={me} />
      ) : (
        data.loadedAt > 0 && <p className="muted small">Study together isn’t switched on for this site yet (supabase/circles-together.sql).</p>
      )}

      <ol className="board-list">
        {rows.map((r) => (
          <BoardItem
            key={r.userId}
            r={r}
            top={r.userId === top}
            cheers={cheersFor(r.userId)}
            cheered={cheeredToday.has(r.userId)}
            busy={busy === `cheer:${r.userId}`}
            onCheer={() => void act(`cheer:${r.userId}`, async () => (await circlesApi()).cheer(circle.id, r.userId))}
          />
        ))}
      </ol>
      <p className="muted small">Ranked by days studied this week, then focus time — showing up often beats one long cram. Only finished focus blocks count.</p>

      <div className="invite-row">
        <button className="btn small primary" onClick={() => void copyInvite()}>
          <Copy size={13} /> {copied ? 'Invite link copied' : 'Copy invite link'}
        </button>
        <span className="muted small">Anyone with the link can join (up to 12 people).</span>
      </div>

      {showSettings && (
        <div className="circle-settings">
          {isOwner && <OwnerSettings circle={circle} busy={busy} act={act} members={rows.filter((r) => !r.isMe)} />}
          <button
            className="btn small danger"
            disabled={!!busy}
            onClick={() => confirm(`Leave “${circle.name}”?${isOwner ? ' The next member becomes its owner.' : ''}`) && void act('leave', async () => (await circlesApi()).leave(circle.id))}
          >
            <LogOut size={13} /> Leave circle
          </button>
        </div>
      )}
      {error && <p className="error small">{error}</p>}
    </section>
  );
}

function BoardItem({ r, top, cheers, cheered, busy, onCheer }: { r: BoardRow; top: boolean; cheers: number; cheered: boolean; busy: boolean; onCheer: () => void }) {
  return (
    <li className={`board-row ${r.isMe ? 'is-me' : ''}`}>
      <span className="avatar" aria-hidden>
        {r.name.slice(0, 1).toUpperCase()}
        {r.studyingNow && <i className="live-dot" title="In a focus block now" />}
      </span>
      <span className="board-main">
        <span className="board-name">
          {r.name}
          {r.isMe && <span className="muted small"> (you)</span>}
          {top && (
            <span className="crown" title="Most consistent this week">
              <Crown size={12} />
            </span>
          )}
          {r.studyingNow && <span className="studying-tag">studying now</span>}
        </span>
        {r.hidden ? (
          <span className="muted small">Keeps their stats private</span>
        ) : (
          <span className="board-days" aria-label={`Studied ${r.days} of 7 days this week`}>
            {DAYS.map((d, i) => (
              <i key={i} className={r.dayMask & (1 << i) ? 'on' : ''} title={d}>
                {d}
              </i>
            ))}
          </span>
        )}
      </span>
      {!r.hidden && (
        <span className="board-nums">
          <strong>{fmtMinutes(r.minutes)}</strong>
          <span className="muted small">
            {r.days}/7 days
            {r.streak > 1 && (
              <>
                {' '}
                · <Flame size={11} className="flame" />
                {r.streak}
              </>
            )}
          </span>
        </span>
      )}
      {r.isMe ? (
        <span className="cheer-count muted small" title="Cheers you got today">
          {cheers > 0 ? `👏 ${cheers}` : ''}
        </span>
      ) : (
        <button className={`cheer-btn ${cheered ? 'is-done' : ''}`} onClick={onCheer} disabled={cheered || busy} aria-label={cheered ? `You cheered ${r.name} today` : `Cheer ${r.name} on`} title={cheered ? 'Cheered today' : 'Send a cheer'}>
          👏{cheers > 0 && <span>{cheers}</span>}
        </button>
      )}
    </li>
  );
}

function OwnerSettings({ circle, members, busy, act }: { circle: Circle; members: BoardRow[]; busy: string; act: (k: string, fn: () => Promise<unknown>) => Promise<void> }) {
  const [name, setName] = useState(circle.name);
  const [goalH, setGoalH] = useState(String(Math.round(circle.weeklyGoalMin / 60)));
  return (
    <div className="stack-sm">
      <div className="row">
        <input className="grow" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} aria-label="Circle name" />
        <label className="estimate" title="Shared weekly goal for the whole circle (0 = none)">
          <span className="muted small">Goal h/wk</span>
          <input type="number" min={0} max={300} value={goalH} onChange={(e) => setGoalH(e.target.value)} aria-label="Circle weekly goal in hours" />
        </label>
        <button className="btn small" disabled={!!busy || !name.trim()} onClick={() => void act('update', async () => (await circlesApi()).update(circle.id, name.trim(), Math.round((Number(goalH) || 0) * 60)))}>
          Save
        </button>
      </div>
      <button
        className="btn small ghost"
        disabled={!!busy}
        onClick={() => confirm('Make a new invite link? The old one will stop working.') && void act('invite', async () => (await circlesApi()).newInvite(circle.id))}
      >
        New invite link (old one stops working)
      </button>
      {members.length > 0 && (
        <details className="small">
          <summary className="muted">Remove someone</summary>
          <ul className="remove-list">
            {members.map((m) => (
              <li key={m.userId}>
                <span>{m.name}</span>
                <button className="icon-btn small" disabled={!!busy} aria-label={`Remove ${m.name}`} onClick={() => confirm(`Remove ${m.name} from the circle?`) && void act(`rm:${m.userId}`, async () => (await circlesApi()).remove(circle.id, m.userId))}>
                  <UserMinus size={13} />
                </button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function NewCircle({ defaultName, onCreated }: { defaultName: string; onCreated: (id: string) => void }) {
  const data = useCircles();
  const uid = useSync().user?.id;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const myName = data.members.find((m) => m.userId === uid)?.name ?? defaultName;

  if (!open && data.circles.length > 0)
    return (
      <button className="link-btn small" onClick={() => setOpen(true)}>
        <Users size={12} /> Make another circle
      </button>
    );

  return (
    <form
      className="card stack-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!name.trim()) return;
        setBusy(true);
        setError('');
        try {
          const id = await (await circlesApi()).create(name.trim(), myName.slice(0, 30));
          await refreshCircles();
          onCreated(id);
          setName('');
          setOpen(false);
        } catch (err) {
          setError(errMsg(err));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="eyebrow">New circle</div>
      <div className="row">
        <input className="grow" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} placeholder="e.g. COMM 320 study group" aria-label="New circle name" />
        <button className="btn primary" type="submit" disabled={busy || !name.trim()}>
          Create
        </button>
      </div>
      <p className="muted small">Then copy the invite link and send it to friends.</p>
      {error && <p className="error small">{error}</p>}
    </form>
  );
}

function JoinCard({ code, defaultName, onDone }: { code: string; defaultName: string; onDone: (id: string | null) => void }) {
  const [preview, setPreview] = useState<{ name: string; members: number } | null | undefined>(undefined);
  const [name, setName] = useState(defaultName);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    void circlesApi()
      .then((a) => a.preview(code))
      .then(setPreview)
      .catch(() => setPreview(null));
  }, [code]);
  return (
    <section className="card join-card">
      <div className="eyebrow">Invitation</div>
      {preview === undefined ? (
        <p className="muted small">Checking the invite…</p>
      ) : preview === null ? (
        <>
          <p className="small">This invite link isn’t valid any more. Ask your friend for a new one.</p>
          <button className="btn small" onClick={() => onDone(null)}>
            OK
          </button>
        </>
      ) : (
        <>
          <h3>Join “{preview.name}”?</h3>
          <p className="muted small">
            {preview.members} member{preview.members === 1 ? '' : 's'}. They’ll see your weekly focus numbers (not your notes), and you’ll see theirs.
          </p>
          <label className="small muted" htmlFor="join-name">
            Your name in the circle
          </label>
          <input id="join-name" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} />
          <div className="row">
            <button
              className="btn primary"
              disabled={busy || !name.trim()}
              onClick={async () => {
                setBusy(true);
                setError('');
                try {
                  const id = await (await circlesApi()).join(code, name.trim());
                  await refreshCircles();
                  onDone(id);
                } catch (e) {
                  setError(errMsg(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Join circle
            </button>
            <button className="btn ghost" onClick={() => onDone(null)}>
              No thanks
            </button>
          </div>
          {error && <p className="error small">{error}</p>}
        </>
      )}
    </section>
  );
}

/** Your name and whether your numbers are shared. */
function MySharing() {
  const { settings, setSettings } = useStore();
  const sync = useSync();
  const data = useCircles();
  const current = data.members.find((m) => m.userId === sync.user?.id)?.name ?? '';
  const [name, setName] = useState(current);
  const [saved, setSaved] = useState(false);
  useEffect(() => setName(current), [current]);
  if (!data.circles.length) return null;
  return (
    <section className="card stack-sm">
      <div className="eyebrow">You in circles</div>
      <div className="row">
        <input className="grow" value={name} maxLength={30} onChange={(e) => (setName(e.target.value), setSaved(false))} aria-label="Your name in circles" />
        <button
          className="btn small"
          disabled={!name.trim() || name.trim() === current}
          onClick={async () => {
            await (await circlesApi()).setName(name.trim()).catch(() => {});
            await refreshCircles();
            setSaved(true);
          }}
        >
          {saved ? 'Saved' : 'Save name'}
        </button>
      </div>
      <label className="toggle-row">
        <input type="checkbox" checked={settings.shareCircleStats} onChange={(e) => setSettings((s) => ({ ...s, shareCircleStats: e.target.checked }))} />
        <span>Share my weekly numbers with my circles</span>
      </label>
      <p className="muted small">Shared: focus minutes this week, which days you studied, your streak, and whether you’re in a focus block right now. Never your notes, subjects, quiz results or ratings.</p>
    </section>
  );
}

const weekLabel = (start: string) => {
  const [y, m, d] = start.split('-').map(Number);
  const a = new Date(y, m - 1, d);
  const b = new Date(y, m - 1, d + 6);
  const f = (x: Date) => x.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${f(a)} – ${f(b)}`;
};

/** Monday–Wednesday: how last week went for the whole circle. Dismissible per circle, per week. */
function WeekWrapCard({ circle }: { circle: Circle }) {
  const data = useCircles();
  const [seen, setSeen] = usePersistentState<Record<string, string>>('circleWrapSeen', {});
  const week = lastWeekKey();
  if (!wrapUpWindow() || seen[circle.id] === week) return null;
  const wrap = weekWrap(
    data.members.filter((m) => m.circleId === circle.id),
    data.stats,
  );
  if (!wrap) return null;
  const goal = circle.weeklyGoalMin;
  const podium = wrap.rows.filter((r) => r.minutes > 0).slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];
  return (
    <div className="week-wrap">
      <div className="row between">
        <div className="eyebrow">Last week · {weekLabel(wrap.weekStart)}</div>
        <button className="icon-btn small" onClick={() => setSeen((s) => ({ ...s, [circle.id]: week }))} aria-label="Dismiss last week’s wrap-up">
          <X size={13} />
        </button>
      </div>
      <p className="week-wrap-headline">
        👑 <strong>{wrap.top.name}</strong> was most consistent — {wrap.top.days} day{wrap.top.days === 1 ? '' : 's'}, {fmtMinutes(wrap.top.minutes)}
      </p>
      {wrap.mostTime && (
        <p className="small muted">
          ⏱ Most focus time: <strong>{wrap.mostTime.name}</strong> ({fmtMinutes(wrap.mostTime.minutes)})
        </p>
      )}
      <ol className="week-wrap-podium small">
        {podium.map((r, i) => (
          <li key={r.userId}>
            <span>{medals[i]}</span> <strong>{r.name}</strong>{' '}
            <span className="muted">
              · {r.days}/7 days · {fmtMinutes(r.minutes)}
            </span>
          </li>
        ))}
      </ol>
      <p className="small">
        Together: <strong>{fmtMinutes(wrap.total)}</strong>
        {goal > 0 &&
          (wrap.total >= goal ? (
            <span className="accent"> — goal of {fmtMinutes(goal)} smashed ✓</span>
          ) : (
            <span className="muted">
              {' '}
              — {fmtMinutes(goal - wrap.total)} short of the {fmtMinutes(goal)} goal
            </span>
          ))}
        . New week, fresh board — good luck!
      </p>
    </div>
  );
}

/** Ticks once a second while mounted. */
function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

const LENGTHS = [25, 50, 70, 90];

/** Study together: start a shared block, or join the one that's running. */
function Together({ circle, me }: { circle: Circle; me: string }) {
  const data = useCircles();
  const { settings } = useStore();
  const now = useNow();
  const [len, setLen] = useState(() => (LENGTHS.includes(settings.focusMin) ? settings.focusMin : 50));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const block = data.blocks.find((b) => b.circleId === circle.id && b.endsAt > now);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  if (block) {
    const inIt = block.joined.includes(me);
    const starter = data.members.find((m) => m.userId === block.startedBy && m.circleId === circle.id)?.name ?? 'Someone';
    const people = block.joined.map((u) => data.members.find((m) => m.userId === u && m.circleId === circle.id)?.name ?? 'A friend');
    const left = block.endsAt - now;
    return (
      <div className="together is-live">
        <div className="row between">
          <div>
            <div className="together-title">
              <i className="live-dot" /> Studying together · {fmtClock(left)} left
            </div>
            <div className="muted small">
              {block.startedBy === me ? 'You' : starter} started a {block.minutes}-min block
            </div>
          </div>
          {inIt ? (
            <span className="together-in small">You’re in ✓</span>
          ) : (
            <button className="btn small primary" disabled={busy || left < 60_000} onClick={() => void run(() => joinTogether(block))}>
              Join
            </button>
          )}
        </div>
        <div className="together-people">
          {people.map((n, i) => (
            <span key={block.joined[i]} className="avatar small" title={n}>
              {n.slice(0, 1).toUpperCase()}
            </span>
          ))}
          <span className="muted small">
            {people.length === 1 ? '1 person' : `${people.length} people`} in the room
          </span>
        </div>
        {inIt && <p className="muted small">Pausing or skipping leaves the room — the rest of the block carries on as your own.</p>}
        {error && <p className="error small">{error}</p>}
      </div>
    );
  }

  return (
    <div className="together">
      <div className="together-title">Study together</div>
      <p className="muted small">Start a focus block and anyone in the circle can join — everyone’s timer ends at the same time.</p>
      <div className="row">
        <div className="seg" role="radiogroup" aria-label="Block length">
          {LENGTHS.map((m) => (
            <button key={m} role="radio" aria-checked={len === m} className={`chip ${len === m ? 'is-active' : ''}`} onClick={() => setLen(m)}>
              {m}m
            </button>
          ))}
        </div>
        <button className="btn small primary" disabled={busy} onClick={() => void run(() => startTogether(circle.id, len))}>
          Start together
        </button>
      </div>
      {error && <p className="error small">{error}</p>}
    </div>
  );
}

/** Main-screen nudge: who you're studying with, a block you can join, or friends in a focus block right now. */
export function StudyingNowChip({ group, onOpen }: { group?: GroupRef; onOpen: () => void }) {
  const sync = useSync();
  const data = useCircles();
  const [busy, setBusy] = useState(false);
  if (!sync.user) return null;
  const me = sync.user.id;
  const now = Date.now();

  const mine = group && data.blocks.find((b) => b.id === group.blockId && b.endsAt > now);
  if (mine) {
    const others = blockNames(mine, data.members, me);
    return (
      <button className="studying-chip" onClick={onOpen} title="See your circle">
        <i className="live-dot" /> {others.length ? `Studying together with ${others.slice(0, 2).join(' & ')}${others.length > 2 ? ` +${others.length - 2}` : ''}` : 'Studying together — waiting for friends'}
      </button>
    );
  }
  const open: GroupBlock | undefined = data.blocks.find((b) => !b.joined.includes(me) && b.endsAt - now > 2 * 60_000);
  if (open && !group) {
    const starter = data.members.find((m) => m.userId === open.startedBy && m.circleId === open.circleId)?.name ?? 'A friend';
    return (
      <button
        className="studying-chip is-join"
        disabled={busy}
        title="Your timer will end at the same time as theirs"
        onClick={() => {
          setBusy(true);
          void joinTogether(open)
            .catch(() => onOpen())
            .finally(() => setBusy(false));
        }}
      >
        <i className="live-dot" /> Join {starter}’s block · {Math.ceil((open.endsAt - now) / 60_000)} min left
      </button>
    );
  }

  const ids = new Set(
    data.members
      .filter((m) => m.userId !== sync.user!.id)
      .filter((m) => {
        const s = data.stats[m.userId];
        return s?.studyingUntil && new Date(s.studyingUntil).getTime() > now;
      })
      .map((m) => m.userId),
  );
  if (!ids.size) return null;
  const names = [...new Set(data.members.filter((m) => ids.has(m.userId)).map((m) => m.name))];
  return (
    <button className="studying-chip" onClick={onOpen} title="See your circle">
      <i className="live-dot" /> {names.length === 1 ? `${names[0]} is studying now` : `${names.length} friends studying now`}
    </button>
  );
}

/**
 * Runs in the background while signed in: shares your numbers (debounced), refreshes the board,
 * and shows a small toast when a friend cheers you on.
 */
export function CirclesAgent({ studyingUntil, group, onOpen }: { studyingUntil: number | null; group?: GroupRef; onOpen: () => void }) {
  const sync = useSync();
  const data = useCircles();
  const { sessions, settings } = useStore();
  const [toast, setToast] = useState<string | null>(null);
  const uid = sync.user?.id;

  // Load on sign-in, then every minute (and when you come back to the tab).
  useEffect(() => {
    if (!uid) return;
    void refreshCircles();
    const id = window.setInterval(() => document.visibilityState === 'visible' && void refreshCircles(), 30_000);
    const vis = () => document.visibilityState === 'visible' && void refreshCircles();
    document.addEventListener('visibilitychange', vis);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', vis);
    };
  }, [uid]);

  // Share your numbers when they change — only if you're in a circle.
  const inCircle = data.circles.length > 0;
  useEffect(() => {
    if (!uid || !inCircle) return;
    const t = window.setTimeout(() => {
      void import('../lib/circles').then(async ({ circlesApi: api, myStats }) => (await api()).pushStats(uid, myStats(sessions, studyingUntil, settings.shareCircleStats))).catch(() => {});
    }, 1500);
    return () => window.clearTimeout(t);
  }, [uid, inCircle, sessions, studyingUntil, settings.shareCircleStats]);

  // Left a shared block early (paused, skipped, reset, or joined another)? Tell the room.
  const prevGroup = useRef(group);
  useEffect(() => {
    const prev = prevGroup.current;
    prevGroup.current = group;
    if (!prev || prev.blockId === group?.blockId || Date.now() > prev.endsAt - 5_000) return;
    void circlesApi()
      .then((a) => a.leaveBlock(prev.blockId))
      .then(() => refreshCircles())
      .catch(() => {});
  }, [group]);

  // Cheers you haven't seen yet.
  useEffect(() => {
    if (!uid) return;
    let seen: number[] = [];
    try {
      seen = JSON.parse(localStorage.getItem('stillpoint:cheersSeen') ?? '[]');
    } catch {
      /* ignore */
    }
    const fresh = data.cheers.filter((c) => c.to === uid && !seen.includes(c.id));
    if (!fresh.length) return;
    const names = [...new Set(fresh.map((c) => data.members.find((m) => m.userId === c.from)?.name ?? 'A friend'))];
    setToast(`${names.slice(0, 2).join(' & ')}${names.length > 2 ? ` +${names.length - 2}` : ''} cheered you on 👏`);
    localStorage.setItem('stillpoint:cheersSeen', JSON.stringify([...seen, ...fresh.map((c) => c.id)].slice(-200)));
  }, [uid, data.cheers, data.members]);
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 6000);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Once a week, early in the week: "your circle's week is in".
  const [wrapToast, setWrapToast] = useState<string | null>(null);
  useEffect(() => {
    if (!uid || !wrapUpWindow() || !data.loadedAt) return;
    const week = lastWeekKey();
    if (localStorage.getItem('stillpoint:circleWrapToast') === week) return;
    for (const c of data.circles) {
      const wrap = weekWrap(
        data.members.filter((m) => m.circleId === c.id),
        data.stats,
      );
      if (!wrap) continue;
      localStorage.setItem('stillpoint:circleWrapToast', week);
      setWrapToast(`📊 ${c.name}’s week is in — ${wrap.top.userId === uid ? 'you' : wrap.top.name} took the crown 👑`);
      return;
    }
  }, [uid, data.loadedAt, data.circles, data.members, data.stats]);
  useEffect(() => {
    if (!wrapToast) return;
    const t = window.setTimeout(() => setWrapToast(null), 9000);
    return () => window.clearTimeout(t);
  }, [wrapToast]);

  if (toast)
    return (
      <div className="update-toast cheer-toast" role="status" onClick={() => setToast(null)}>
        {toast}
      </div>
    );
  if (wrapToast)
    return (
      <button
        className="update-toast cheer-toast"
        onClick={() => {
          setWrapToast(null);
          onOpen();
        }}
      >
        {wrapToast} <span className="accent">See →</span>
      </button>
    );
  return null;
}
