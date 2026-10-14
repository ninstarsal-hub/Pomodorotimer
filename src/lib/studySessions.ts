import type { Session, StudySession } from './types';

/** Blocks more than this far apart belong to different sessions (e.g. morning vs evening). */
export const SESSION_GAP = 2.5 * 60 * 60 * 1000;

export const SESSION_FACTORS: { id: string; label: string; emoji: string }[] = [
  { id: 'water', label: 'Stayed hydrated', emoji: '💧' },
  { id: 'phone', label: 'Phone away', emoji: '📵' },
  { id: 'slept', label: 'Slept well', emoji: '😴' },
  { id: 'ate', label: 'Ate beforehand', emoji: '🍎' },
  { id: 'caffeine', label: 'Caffeine', emoji: '☕' },
  { id: 'planned', label: 'Planned tasks first', emoji: '📝' },
  { id: 'moved', label: 'Moved on breaks', emoji: '🚶' },
  { id: 'outside', label: 'Went outside', emoji: '🌳' },
  { id: 'doodle', label: 'Doodled on breaks', emoji: '✏️' },
  { id: 'sounds', label: 'Focus sounds', emoji: '🎧' },
  { id: 'music', label: 'Break music', emoji: '🎵' },
  { id: 'quiet', label: 'Quiet place', emoji: '🤫' },
  { id: 'lights-low', label: 'Lights low', emoji: '🌙' },
  { id: 'daylight', label: 'Bright / daylight', emoji: '☀️' },
  { id: 'away', label: 'Away from home', emoji: '📍' },
  { id: 'others', label: 'Studied with others', emoji: '👥' },
];

export function factorLabel(id: string) {
  if (id.startsWith('custom:')) return id.slice(7);
  return SESSION_FACTORS.find((f) => f.id === id)?.label ?? id;
}

export function factorEmoji(id: string) {
  return SESSION_FACTORS.find((f) => f.id === id)?.emoji ?? '✦';
}

export type TimeOfDay = 'Morning' | 'Afternoon' | 'Evening' | 'Night';

export function timeOfDay(at: number): TimeOfDay {
  const h = new Date(at).getHours();
  if (h >= 5 && h < 12) return 'Morning';
  if (h >= 12 && h < 17) return 'Afternoon';
  if (h >= 17 && h < 21) return 'Evening';
  return 'Night';
}

export const sessionTitle = (s: StudySession) => `${timeOfDay(s.startedAt)} session`;

export function blocksOf(s: StudySession, blocks: Session[]) {
  return blocks.filter((b) => b.studySessionId === s.id).sort((a, b) => a.at - b.at);
}

/** Is this session still going? (Not ended, and the last block was recent.) */
export const isLive = (s: StudySession | undefined, now = Date.now()): boolean => !!s && !s.endedAt && now - s.lastAt < SESSION_GAP;

/* ---------- insights: what goes with your best sessions ---------- */

export interface Insight {
  kind: 'time' | 'factor' | 'factor-time' | 'fatigue' | 'negative';
  text: string;
  detail?: string;
}

const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const fmt = (n: number) => n.toFixed(1);

function factorEffects(rated: StudySession[]) {
  const ids = new Set(rated.flatMap((s) => s.factors));
  const out: { id: string; diff: number; withAvg: number; withoutAvg: number; n: number }[] = [];
  for (const id of ids) {
    const withF = rated.filter((s) => s.factors.includes(id)).map((s) => s.rating!);
    const without = rated.filter((s) => !s.factors.includes(id)).map((s) => s.rating!);
    if (withF.length < 2 || without.length < 2) continue;
    const w = avg(withF);
    const wo = avg(without);
    out.push({ id, diff: w - wo, withAvg: w, withoutAvg: wo, n: withF.length });
  }
  return out.sort((a, b) => b.diff - a.diff);
}

export const MIN_RATED = 3;

export function sessionInsights(sessions: StudySession[], blocks: Session[]): Insight[] {
  const rated = sessions.filter((s) => s.rating);
  if (rated.length < MIN_RATED) return [];
  const out: Insight[] = [];

  // Best time of day.
  const byTime = new Map<TimeOfDay, number[]>();
  for (const s of rated) byTime.set(timeOfDay(s.startedAt), [...(byTime.get(timeOfDay(s.startedAt)) ?? []), s.rating!]);
  const times = [...byTime].filter(([, r]) => r.length >= 2).map(([t, r]) => ({ t, a: avg(r), n: r.length }));
  if (times.length >= 2) {
    times.sort((a, b) => b.a - a.a);
    const best = times[0];
    const worst = times[times.length - 1];
    if (best.a - worst.a >= 0.4)
      out.push({ kind: 'time', text: `You focus best in ${best.t.toLowerCase()} sessions.`, detail: `${fmt(best.a)} average vs ${fmt(worst.a)} for ${worst.t.toLowerCase()} sessions.` });
  }

  // Habits and conditions that go with better (or worse) sessions.
  const effects = factorEffects(rated);
  for (const e of effects.filter((x) => x.diff >= 0.5).slice(0, 3))
    out.push({ kind: 'factor', text: `Sessions where you ticked “${factorLabel(e.id)}” go better.`, detail: `${fmt(e.withAvg)} average focus with it vs ${fmt(e.withoutAvg)} without (${e.n} sessions).` });
  const worst = effects.filter((x) => x.diff <= -0.5).pop();
  if (worst)
    out.push({ kind: 'negative', text: `Sessions with “${factorLabel(worst.id)}” tend to go worse.`, detail: `${fmt(worst.withAvg)} with it vs ${fmt(worst.withoutAvg)} without.` });

  // Within a time of day (e.g. mornings vs nights can need different things).
  for (const [t] of byTime) {
    const inT = rated.filter((s) => timeOfDay(s.startedAt) === t);
    if (inT.length < 4) continue;
    const top = factorEffects(inT)[0];
    if (top && top.diff >= 0.6 && !out.some((o) => o.kind === 'factor' && o.text.includes(factorLabel(top.id))))
      out.push({ kind: 'factor-time', text: `In ${t.toLowerCase()} sessions, “${factorLabel(top.id)}” makes the biggest difference.`, detail: `${fmt(top.withAvg)} vs ${fmt(top.withoutAvg)}.` });
  }

  // Time lost to other tabs (only what you marked as a distraction — studying elsewhere never counts).
  const ratedBlocks = blocks.filter((b) => b.rating);
  const distracted = ratedBlocks.filter((b) => b.away?.kind === 'distracted');
  const clean = ratedBlocks.filter((b) => !b.away || b.away.kind === 'study');
  if (distracted.length >= 3 && clean.length >= 3) {
    const d = avg(distracted.map((b) => b.rating!));
    const c = avg(clean.map((b) => b.rating!));
    if (c - d >= 0.5)
      out.push({ kind: 'negative', text: 'Blocks where you drifted to other tabs rate lower.', detail: `${fmt(d)} vs ${fmt(c)} when you stayed on task. Phone or tabs away might help.` });
  }
  const awayByTime = new Map<TimeOfDay, number[]>();
  for (const b of blocks.filter((x) => x.away?.kind === 'distracted')) awayByTime.set(timeOfDay(b.at), [...(awayByTime.get(timeOfDay(b.at)) ?? []), b.away!.ms]);
  const worstTime = [...awayByTime].filter(([, v]) => v.length >= 3).sort((a, b) => b[1].length - a[1].length)[0];
  if (worstTime)
    out.push({ kind: 'negative', text: `Most of your distracted blocks happen in the ${worstTime[0].toLowerCase()}.`, detail: `${worstTime[1].length} blocks, about ${Math.round(avg(worstTime[1]) / 60_000)} min away each.` });

  // Where focus fades within a session, from your per-block ratings.
  const byIndex: number[][] = [];
  for (const s of sessions) {
    blocksOf(s, blocks).forEach((b, i) => {
      if (b.rating) (byIndex[i] ??= []).push(b.rating);
    });
  }
  const means = byIndex.map((r) => (r && r.length >= 3 ? avg(r) : null));
  if (means[0] != null) {
    const drop = means.findIndex((m, i) => i > 0 && m != null && means[0]! - m >= 0.6);
    if (drop > 0)
      out.push({
        kind: 'fatigue',
        text: `Your focus usually drops by block ${drop + 1}.`,
        detail: `Block 1 averages ${fmt(means[0]!)}, block ${drop + 1} averages ${fmt(means[drop]!)}. Try a long break or ending the session after block ${drop}.`,
      });
  }

  return out;
}
