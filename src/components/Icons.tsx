import { useEffect, useMemo, useState } from 'react';
import { Lock } from 'lucide-react';
import { useStore } from '../store';
import { ICONS, achStats, earnedIds, getIcon, hasBadge, type IconDef } from '../lib/achievements';
import { useCircles } from '../lib/circles';

export function useAchievements() {
  const { sessions, reviewLog, exams, decks, tasks } = useStore();
  const circles = useCircles().circles.length;
  return useMemo(() => achStats({ sessions, reviewLog, exams, decks, tasks, circles }), [sessions, reviewLog, exams, decks, tasks, circles]);
}

/** A Stillpoint badge: a coloured coin with a line-drawn symbol; earned ones get a bronze, silver or gold ring. */
export function Badge({ icon, size = 32, locked, children }: { icon: IconDef; size?: number; locked?: boolean; children?: React.ReactNode }) {
  const Glyph = icon.glyph;
  return (
    <span
      className={`badge style-${icon.style} ${icon.tier ? `tier-${icon.tier}` : ''} ${locked ? 'is-locked' : ''}`}
      style={{ width: size, height: size, ['--hue' as string]: String(icon.hue) }}
      aria-hidden
    >
      <Glyph size={Math.round(size * (icon.style === 'sticker' ? 0.56 : 0.52))} strokeWidth={icon.style === 'sticker' ? 2 : 1.8} />
      {children}
    </span>
  );
}

/** A person's badge, or their initial if they haven't picked one. */
export function Avatar({ icon, name, small, size, children }: { icon?: string | null; name: string; small?: boolean; size?: number; children?: React.ReactNode }) {
  const def = getIcon(icon);
  if (def)
    return (
      <span className="avatar-badge" title={name}>
        <Badge icon={def} size={size ?? (small ? 24 : 32)}>
          {children}
        </Badge>
      </span>
    );
  return (
    <span className={`avatar ${small ? 'small' : ''}`} aria-hidden title={name} style={size ? { width: size, height: size } : undefined}>
      {name.slice(0, 1).toUpperCase()}
      {children}
    </span>
  );
}

function Tile({ icon, unlocked, active, onPick, progress }: { icon: IconDef; unlocked: boolean; active: boolean; onPick: () => void; progress?: [number, number] }) {
  const pct = progress ? Math.min(100, Math.round((progress[0] / progress[1]) * 100)) : 100;
  return (
    <button
      className={`icon-tile ${active ? 'is-active' : ''} ${unlocked ? '' : 'is-locked'}`}
      disabled={!unlocked}
      onClick={onPick}
      title={icon.unlock ? `${icon.name} — ${icon.unlock.how}` : icon.name}
      aria-label={`${icon.name}${unlocked ? '' : ` (locked: ${icon.unlock?.how})`}`}
    >
      <Badge icon={icon} size={34} locked={!unlocked} />
      {!unlocked && (
        <span className="icon-lock">
          <Lock size={10} />
        </span>
      )}
      {icon.unlock && (
        <>
          <span className="icon-name">{icon.name}</span>
          {!unlocked && progress && (
            <span className="icon-progress" aria-hidden>
              <span style={{ width: `${pct}%` }} />
            </span>
          )}
        </>
      )}
    </button>
  );
}

/** Free icons, then the ones you earn — each locked one shows what it takes and how close you are. */
export function IconPicker({ value, onPick }: { value: string; onPick: (id: string) => void }) {
  const stats = useAchievements();
  const { earnedBadges } = useStore();
  const groups = ['Stillpoint', 'Study', 'Nature', 'Animals', 'Food', 'Fun'] as const;
  const earned = ICONS.filter((i) => i.unlock);
  return (
    <div className="icon-picker">
      {groups.map((g, gi) => (
        <div key={g} className="icon-group">
          <div className="field-label">{g}</div>
          <div className="icon-grid">
            {gi === 0 && (
              <button className={`icon-tile ${!value ? 'is-active' : ''}`} onClick={() => onPick('')} title="Your initial" aria-label="Use my initial">
                <span className="avatar">Aa</span>
              </button>
            )}
            {ICONS.filter((i) => i.group === g).map((i) => (
              <Tile key={i.id} icon={i} unlocked active={value === i.id} onPick={() => onPick(i.id)} />
            ))}
          </div>
        </div>
      ))}
      <div className="field-label">Earned by studying</div>
      <div className="icon-grid earned">
        {earned.map((i) => {
          const p = i.unlock!.progress(stats);
          return <Tile key={i.id} icon={i} unlocked={hasBadge(i, stats, earnedBadges)} active={value === i.id} progress={p} onPick={() => onPick(i.id)} />;
        })}
      </div>
    </div>
  );
}

/** Progress panel: your icon, how many you've earned, and what's next. */
export function AchievementsCard() {
  const { settings, setSettings, earnedBadges } = useStore();
  const stats = useAchievements();
  const earned = ICONS.filter((i) => i.unlock);
  const got = earned.filter((i) => hasBadge(i, stats, earnedBadges));
  // Closest locked icons, by % done.
  const next = earned
    .filter((i) => !hasBadge(i, stats, earnedBadges))
    .map((i) => {
      const [a, b] = i.unlock!.progress(stats);
      return { i, a, b, pct: a / b };
    })
    .sort((x, y) => y.pct - x.pct)
    .slice(0, 3);
  const [open, setOpen] = useState(false);

  return (
    <section className="card achievements" id="achievements">
      <div className="row between">
        <div className="eyebrow">Badges</div>
        <span className="muted small">
          {got.length}/{earned.length} earned
        </span>
      </div>
      <div className="row">
        <Avatar icon={settings.avatar} name="?" size={52} />
        <div className="grow">
          <div className="small">{getIcon(settings.avatar) ? `${getIcon(settings.avatar)!.name} — friends in your circles see it next to your name.` : 'Pick a badge for your study circles.'}</div>
          {next.length > 0 && (
            <ul className="next-up small">
              {next.map(({ i, a, b }) => (
                <li key={i.id}>
                  <Badge icon={i} size={20} locked />
                  <span>
                    <strong>{i.name}</strong>{' '}
                    <span className="muted">
                      — {i.unlock!.how.toLowerCase()} · {Math.min(a, b)}/{b}
                      {i.unlock!.unit ? ` ${i.unlock!.unit}` : ''}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <button className="btn small" onClick={() => setOpen((o) => !o)}>
        {open ? 'Done' : 'Choose your badge'}
      </button>
      {open && <IconPicker value={settings.avatar} onPick={(id) => setSettings((s) => ({ ...s, avatar: id }))} />}
    </section>
  );
}

const ANNOUNCE = 'stillpoint:badgeToast';

/** Watches for newly earned badges, keeps them forever and celebrates them. */
export function UnlockToast({ onOpen, quiet }: { onOpen: () => void; quiet: boolean }) {
  const stats = useAchievements();
  const { earnedBadges, setEarnedBadges } = useStore();
  // Badges still to celebrate on this device (kept until shown, so a reload doesn't swallow the moment).
  const [msg, setMsg] = useState<string | null>(() => localStorage.getItem(ANNOUNCE));
  const ids = earnedIds(stats).join(',');

  // Save new badges for good (they sync like the rest of your data), and celebrate them.
  useEffect(() => {
    if (quiet) return;
    const fresh = (ids ? ids.split(',') : []).filter((id) => !earnedBadges.includes(id));
    if (!fresh.length) return;
    setEarnedBadges((kept) => [...new Set([...kept, ...fresh])]);
    const all = [...new Set([...(localStorage.getItem(ANNOUNCE)?.split(',') ?? []), ...fresh])].join(',');
    localStorage.setItem(ANNOUNCE, all);
    setMsg(all);
  }, [ids, quiet, earnedBadges, setEarnedBadges]);

  const done = () => {
    localStorage.removeItem(ANNOUNCE);
    setMsg(null);
  };
  useEffect(() => {
    if (!msg || quiet) return;
    const t = window.setTimeout(done, 9000);
    return () => window.clearTimeout(t);
  }, [msg, quiet]);

  if (!msg || quiet) return null;
  const fresh = msg.split(',').map((id) => getIcon(id)!).filter(Boolean);
  if (!fresh.length) return null;
  return (
    <button
      className="update-toast unlock-toast"
      onClick={() => {
        done();
        onOpen();
      }}
    >
      <span className="unlock-badges">
        {fresh.slice(0, 5).map((i) => (
          <Badge key={i.id} icon={i} size={24} />
        ))}
      </span>
      {fresh.length === 1 ? (
        <span>
          New badge: <strong>{fresh[0].name}</strong> <span className="muted">— {fresh[0].unlock!.how.toLowerCase()}</span>
        </span>
      ) : (
        <span>
          You’ve earned <strong>{fresh.length} badges</strong>
        </span>
      )}
      <span className="accent">See →</span>
    </button>
  );
}
