import { useEffect, useState } from 'react';
import { getClient, syncAvailable } from './sync';
import { dayKey } from './storage';
import type { Session } from './types';

/*
 * Study circles: small private groups of friends who see each other's weekly focus numbers.
 * Only these numbers are shared — minutes, which days you studied, streak, and whether you're in a focus block now.
 */

export interface Circle {
  id: string;
  name: string;
  inviteCode: string;
  owner: string;
  weeklyGoalMin: number;
}
export interface MemberStats {
  weekStart: string;
  weekMinutes: number;
  /** Bit per day of the week, Monday = 1. */
  weekDays: number;
  streak: number;
  todayMinutes: number;
  studyingUntil: string | null;
  visible: boolean;
  updatedAt: string;
  /** Last week's numbers, kept so the Monday wrap-up still works after the new week starts. */
  prevWeekStart?: string | null;
  prevWeekMinutes?: number;
  prevWeekDays?: number;
}
export interface Member {
  circleId: string;
  userId: string;
  name: string;
  /** Profile icon id (lib/achievements). */
  avatar?: string | null;
}
export interface Cheer {
  circleId: string;
  from: string;
  to: string;
  day: string;
  id: number;
}

/** A shared focus block: everyone who joins counts down to the same end time. */
export interface GroupBlock {
  id: string;
  circleId: string;
  startedBy: string;
  minutes: number;
  endsAt: number;
  joined: string[];
}

/** Everything circles need from the server — Supabase in production, a stand-in in tests. */
export interface CirclesApi {
  myCircles(): Promise<Circle[]>;
  members(circleIds: string[]): Promise<Member[]>;
  stats(userIds: string[]): Promise<Record<string, MemberStats>>;
  cheersToday(): Promise<Cheer[]>;
  pushStats(uid: string, s: Omit<MemberStats, 'updatedAt'>): Promise<void>;
  create(name: string, displayName: string): Promise<string>;
  preview(code: string): Promise<{ id: string; name: string; members: number } | null>;
  join(code: string, displayName: string): Promise<string>;
  leave(circleId: string): Promise<void>;
  update(circleId: string, name: string, goal: number): Promise<void>;
  newInvite(circleId: string): Promise<string>;
  remove(circleId: string, userId: string): Promise<void>;
  setName(name: string): Promise<void>;
  setAvatar(icon: string): Promise<void>;
  cheer(circleId: string, to: string): Promise<boolean>;
  /** Running blocks in these circles. Throws if study-together isn't set up on the server. */
  activeBlocks(circleIds: string[]): Promise<GroupBlock[]>;
  startBlock(circleId: string, minutes: number): Promise<{ id: string; endsAt: number }>;
  joinBlock(blockId: string): Promise<number>;
  leaveBlock(blockId: string): Promise<void>;
}

const mockFactory = (globalThis as { __STILLPOINT_CIRCLES_MOCK__?: () => CirclesApi }).__STILLPOINT_CIRCLES_MOCK__;
export const circlesAvailable = syncAvailable;

const fail = (e: { message?: string } | null) => {
  if (e) throw new Error(e.message ?? 'Something went wrong');
};

let hasPrevColumns = true;
let hasAvatarColumn = true;

async function supabaseApi(): Promise<CirclesApi> {
  const sb = await getClient();
  return {
    async myCircles() {
      const { data, error } = await sb.from('circles').select('id,name,invite_code,owner,weekly_goal_min').order('created_at');
      fail(error);
      return (data ?? []).map((c) => ({ id: c.id, name: c.name, inviteCode: c.invite_code, owner: c.owner, weeklyGoalMin: c.weekly_goal_min }));
    },
    async members(ids) {
      if (!ids.length) return [];
      const q = (cols: string) => sb.from('circle_members').select(cols).in('circle_id', ids).order('joined_at');
      type Row = { circle_id: string; user_id: string; display_name: string; avatar?: string | null };
      let res = hasAvatarColumn ? await q('circle_id,user_id,display_name,avatar') : await q('circle_id,user_id,display_name');
      // Icons come from an update to circles-together.sql; work without them until it's run.
      if (res.error && hasAvatarColumn && /avatar/.test(res.error.message)) {
        hasAvatarColumn = false;
        res = await q('circle_id,user_id,display_name');
      }
      fail(res.error);
      return ((res.data ?? []) as unknown as Row[]).map((m) => ({ circleId: m.circle_id, userId: m.user_id, name: m.display_name, avatar: m.avatar ?? null }));
    },
    async stats(ids) {
      if (!ids.length) return {};
      const { data, error } = await sb.from('member_stats').select('*').in('user_id', ids);
      fail(error);
      return Object.fromEntries(
        (data ?? []).map((s) => [
          s.user_id,
          {
            weekStart: s.week_start,
            weekMinutes: s.week_minutes,
            weekDays: s.week_days,
            streak: s.streak,
            todayMinutes: s.today_minutes,
            studyingUntil: s.studying_until,
            visible: s.visible,
            updatedAt: s.updated_at,
            prevWeekStart: s.prev_week_start ?? null,
            prevWeekMinutes: s.prev_week_minutes ?? 0,
            prevWeekDays: s.prev_week_days ?? 0,
          },
        ]),
      );
    },
    async cheersToday() {
      const since = new Date(Date.now() - 36 * 3600_000).toISOString();
      const { data, error } = await sb.from('cheers').select('id,circle_id,from_user,to_user,day').gte('created_at', since);
      fail(error);
      return (data ?? []).map((c) => ({ id: c.id, circleId: c.circle_id, from: c.from_user, to: c.to_user, day: c.day }));
    },
    async pushStats(uid, s) {
      const row = {
        user_id: uid,
        week_start: s.weekStart,
        week_minutes: s.weekMinutes,
        week_days: s.weekDays,
        streak: s.streak,
        today_minutes: s.todayMinutes,
        studying_until: s.studyingUntil,
        visible: s.visible,
        updated_at: new Date().toISOString(),
      };
      const prev = { prev_week_start: s.prevWeekStart ?? null, prev_week_minutes: s.prevWeekMinutes ?? 0, prev_week_days: s.prevWeekDays ?? 0 };
      if (hasPrevColumns) {
        const { error } = await sb.from('member_stats').upsert({ ...row, ...prev });
        if (!error) return;
        // The weekly wrap-up columns come from an update to circles-together.sql; work without them until it's run.
        if (!/prev_week/.test(error.message)) fail(error);
        hasPrevColumns = false;
      }
      fail((await sb.from('member_stats').upsert(row)).error);
    },
    async create(name, displayName) {
      const { data, error } = await sb.rpc('create_circle', { p_name: name, p_display_name: displayName });
      fail(error);
      return data as string;
    },
    async preview(code) {
      const { data, error } = await sb.rpc('circle_preview', { p_code: code });
      fail(error);
      return (data as { id: string; name: string; members: number } | null) ?? null;
    },
    async join(code, displayName) {
      const { data, error } = await sb.rpc('join_circle', { p_code: code, p_display_name: displayName });
      fail(error);
      return data as string;
    },
    async leave(id) {
      fail((await sb.rpc('leave_circle', { p_circle: id })).error);
    },
    async update(id, name, goal) {
      fail((await sb.rpc('update_circle', { p_circle: id, p_name: name, p_goal: goal })).error);
    },
    async newInvite(id) {
      const { data, error } = await sb.rpc('new_invite_code', { p_circle: id });
      fail(error);
      return data as string;
    },
    async remove(id, user) {
      fail((await sb.rpc('remove_member', { p_circle: id, p_user: user })).error);
    },
    async setName(name) {
      fail((await sb.rpc('set_display_name', { p_name: name })).error);
    },
    async setAvatar(icon) {
      if (!hasAvatarColumn) return;
      fail((await sb.rpc('set_avatar', { p_icon: icon })).error);
    },
    async cheer(id, to) {
      const { data, error } = await sb.rpc('send_cheer', { p_circle: id, p_to: to });
      fail(error);
      return !!data;
    },
    async activeBlocks(ids) {
      if (!ids.length) return [];
      const { data, error } = await sb.from('circle_blocks').select('id,circle_id,started_by,minutes,ends_at').in('circle_id', ids).gt('ends_at', new Date().toISOString());
      fail(error);
      if (!data?.length) return [];
      const joins = await sb.from('circle_block_joins').select('block_id,user_id').in('block_id', data.map((b) => b.id)).order('joined_at');
      fail(joins.error);
      return data.map((b) => ({
        id: b.id,
        circleId: b.circle_id,
        startedBy: b.started_by,
        minutes: b.minutes,
        endsAt: new Date(b.ends_at).getTime(),
        joined: (joins.data ?? []).filter((j) => j.block_id === b.id).map((j) => j.user_id),
      }));
    },
    async startBlock(id, minutes) {
      const { data, error } = await sb.rpc('start_circle_block', { p_circle: id, p_minutes: minutes });
      fail(error);
      const d = data as { id: string; ends_at: string };
      return { id: d.id, endsAt: new Date(d.ends_at).getTime() };
    },
    async joinBlock(id) {
      const { data, error } = await sb.rpc('join_circle_block', { p_block: id });
      fail(error);
      return new Date(data as string).getTime();
    },
    async leaveBlock(id) {
      fail((await sb.rpc('leave_circle_block', { p_block: id })).error);
    },
  };
}

let api: Promise<CirclesApi> | null = null;
export function circlesApi() {
  api ??= mockFactory ? Promise.resolve(mockFactory()) : supabaseApi();
  return api;
}

/* ---------- your own numbers (computed on this device from your focus blocks) ---------- */

export function weekStartKey(d = new Date()) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return dayKey(x);
}

/** Minutes that count: finished focus blocks, minus time you marked as a distraction. */
const countedMinutes = (s: Session) => Math.max(0, s.minutes - (s.away?.kind === 'distracted' ? Math.round(s.away.ms / 60_000) : 0));

export function myStats(sessions: Session[], studyingUntil: number | null, visible: boolean): Omit<MemberStats, 'updatedAt'> {
  const now = new Date();
  const weekStart = weekStartKey(now);
  const byDay = new Map<string, number>();
  for (const s of sessions) byDay.set(s.day, (byDay.get(s.day) ?? 0) + countedMinutes(s));
  let weekMinutes = 0;
  let weekDays = 0;
  const [y, m, d] = weekStart.split('-').map(Number);
  for (let i = 0; i < 7; i++) {
    const min = byDay.get(dayKey(new Date(y, m - 1, d + i))) ?? 0;
    weekMinutes += min;
    if (min > 0) weekDays |= 1 << i;
  }
  // Streak: days in a row with any focus, counting today only once it has some.
  let streak = 0;
  const cur = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!byDay.get(dayKey(cur))) cur.setDate(cur.getDate() - 1);
  while ((byDay.get(dayKey(cur)) ?? 0) > 0 && streak < 3650) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  // Last week too, for the circle's Monday wrap-up.
  const [py, pm, pd] = [y, m - 1, d - 7];
  let prevWeekMinutes = 0;
  let prevWeekDays = 0;
  for (let i = 0; i < 7; i++) {
    const min = byDay.get(dayKey(new Date(py, pm, pd + i))) ?? 0;
    prevWeekMinutes += min;
    if (min > 0) prevWeekDays |= 1 << i;
  }
  return {
    weekStart,
    prevWeekStart: dayKey(new Date(py, pm, pd)),
    prevWeekMinutes: Math.min(10080, prevWeekMinutes),
    prevWeekDays,
    weekMinutes: Math.min(10080, weekMinutes),
    weekDays,
    streak,
    todayMinutes: Math.min(1440, byDay.get(dayKey(now)) ?? 0),
    studyingUntil: studyingUntil && studyingUntil > Date.now() ? new Date(studyingUntil).toISOString() : null,
    visible,
  };
}

/* ---------- reading the board ---------- */

export const popcount = (n: number) => {
  let c = 0;
  for (let x = n; x; x &= x - 1) c++;
  return c;
};

export interface BoardRow {
  userId: string;
  name: string;
  avatar?: string | null;
  isMe: boolean;
  hidden: boolean;
  minutes: number;
  /** Focus minutes today (0 if they haven't studied or synced today). */
  today: number;
  days: number;
  dayMask: number;
  streak: number;
  studyingNow: boolean;
}

/** Stats from an older week count as zero this week; a streak that hasn't been updated for 2+ days has ended. */
export function boardRows(members: Member[], stats: Record<string, MemberStats>, me: string): BoardRow[] {
  const week = weekStartKey();
  const now = Date.now();
  return members
    .map((m) => {
      const s = stats[m.userId];
      const current = s && s.weekStart === week;
      const fresh = s && now - new Date(s.updatedAt).getTime() < 2 * 86_400_000;
      // Today's number is only today's if it was last updated today.
      const updatedToday = s && dayKey(new Date(s.updatedAt)) === dayKey();
      return {
        userId: m.userId,
        name: m.name,
        avatar: m.avatar,
        isMe: m.userId === me,
        hidden: !s,
        minutes: current ? s.weekMinutes : 0,
        today: updatedToday ? s.todayMinutes : 0,
        days: current ? popcount(s.weekDays) : 0,
        dayMask: current ? s.weekDays : 0,
        streak: s && fresh ? s.streak : 0,
        studyingNow: !!s?.studyingUntil && new Date(s.studyingUntil).getTime() > now,
      };
    })
    .sort((a, b) => b.days - a.days || b.minutes - a.minutes || a.name.localeCompare(b.name));
}

/* ---------- weekly wrap-up ---------- */

export interface WrapRow {
  userId: string;
  name: string;
  minutes: number;
  days: number;
}
export interface WeekWrap {
  weekStart: string;
  rows: WrapRow[];
  total: number;
  /** Most consistent (most days, then minutes). */
  top: WrapRow;
  /** Most focus time, when it's someone other than `top`. */
  mostTime: WrapRow | null;
}

export function lastWeekKey(d = new Date()) {
  return weekStartKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7));
}

/** Last week's results for a circle, from each member's current or saved previous week. Null if nobody studied. */
export function weekWrap(members: Member[], stats: Record<string, MemberStats>): WeekWrap | null {
  const week = lastWeekKey();
  const rows: WrapRow[] = [];
  for (const m of members) {
    const s = stats[m.userId];
    if (!s) continue;
    const src = s.weekStart === week ? { min: s.weekMinutes, mask: s.weekDays } : s.prevWeekStart === week ? { min: s.prevWeekMinutes ?? 0, mask: s.prevWeekDays ?? 0 } : null;
    rows.push({ userId: m.userId, name: m.name, minutes: src?.min ?? 0, days: src ? popcount(src.mask) : 0 });
  }
  rows.sort((a, b) => b.days - a.days || b.minutes - a.minutes || a.name.localeCompare(b.name));
  const total = rows.reduce((a, r) => a + r.minutes, 0);
  if (!total) return null;
  const byTime = [...rows].sort((a, b) => b.minutes - a.minutes)[0];
  return { weekStart: week, rows, total, top: rows[0], mostTime: byTime.userId !== rows[0].userId ? byTime : null };
}

/** The wrap-up shows for the first three days of the new week. */
export const wrapUpWindow = () => (new Date().getDay() + 6) % 7 <= 2;

/* ---------- shared state ---------- */

export interface CirclesState {
  loading: boolean;
  error: string;
  circles: Circle[];
  members: Member[];
  stats: Record<string, MemberStats>;
  cheers: Cheer[];
  blocks: GroupBlock[];
  /** False until supabase/circles-together.sql has been run. */
  togetherReady: boolean;
  loadedAt: number;
}
let state: CirclesState = { loading: false, error: '', circles: [], members: [], stats: {}, cheers: [], blocks: [], togetherReady: false, loadedAt: 0 };
const listeners = new Set<() => void>();
const set = (p: Partial<CirclesState>) => {
  state = { ...state, ...p };
  listeners.forEach((l) => l());
};

export function useCircles() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    listeners.add(l);
    return () => void listeners.delete(l);
  }, []);
  return state;
}

let inflight: Promise<void> | null = null;
export function refreshCircles() {
  inflight ??= (async () => {
    set({ loading: true });
    try {
      const a = await circlesApi();
      const circles = await a.myCircles();
      const members = await a.members(circles.map((c) => c.id));
      const ids = [...new Set(members.map((m) => m.userId))];
      const [stats, cheers, blocks] = await Promise.all([
        a.stats(ids),
        a.cheersToday(),
        a.activeBlocks(circles.map((c) => c.id)).catch((e) => {
          console.warn('Study together unavailable:', e);
          return null;
        }),
      ]);
      set({ circles, members, stats, cheers, blocks: blocks ?? [], togetherReady: blocks !== null, error: '', loadedAt: Date.now() });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : 'Couldn’t load circles' });
    } finally {
      set({ loading: false });
      inflight = null;
    }
  })();
  return inflight;
}

export function resetCircles() {
  set({ circles: [], members: [], stats: {}, cheers: [], blocks: [], loadedAt: 0, error: '' });
}

/* ---------- study together ---------- */

/** Where your timer is when you're in a shared block. */
export interface GroupRef {
  blockId: string;
  circleId: string;
  endsAt: number;
}

/** Ask the timer (in App) to join a shared block. */
export function joinGroupTimer(g: GroupRef) {
  window.dispatchEvent(new CustomEvent<GroupRef>('stillpoint:groupBlock', { detail: g }));
}

export async function startTogether(circleId: string, minutes: number) {
  const b = await (await circlesApi()).startBlock(circleId, minutes);
  joinGroupTimer({ blockId: b.id, circleId, endsAt: b.endsAt });
  await refreshCircles();
}

export async function joinTogether(block: GroupBlock) {
  const endsAt = await (await circlesApi()).joinBlock(block.id);
  joinGroupTimer({ blockId: block.id, circleId: block.circleId, endsAt });
  await refreshCircles();
}

/** Names of the other people in a block (first names from your circles). */
export function blockNames(block: GroupBlock, members: Member[], me: string) {
  return block.joined.filter((u) => u !== me).map((u) => members.find((m) => m.userId === u && m.circleId === block.circleId)?.name ?? 'A friend');
}
