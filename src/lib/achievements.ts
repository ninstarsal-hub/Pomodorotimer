import {
  Bot, Brain, BookOpen, Cat, CircleCheckBig, CloudMoon, Coffee, Dog, Donut, Flame, Footprints, Gem, Ghost, GraduationCap, Handshake, Headphones,
  Hourglass, Leaf, Library, Microscope, Moon, MountainSnow, Palette, Panda, Pencil, Pizza, Puzzle, Rabbit, Rocket, Sailboat, Snail, Sparkles,
  Sprout, Squirrel, Star, Sunrise, Target, Waves, type LucideIcon,
} from 'lucide-react';
import type { Exam, Session, Task } from './types';
import type { ReviewLog } from '../store';

/*
 * Stillpoint badges: profile icons for circles. Free ones anyone can pick; the rest unlock by studying.
 * Everything is worked out on your device from your own history.
 */

export interface AchStats {
  blocks: number;
  totalMin: number;
  longestStreak: number;
  nightBlocks: number;
  earlyBlocks: number;
  answered: number;
  correct: number;
  bestDayMin: number;
  longBlocks: number;
  togetherBlocks: number;
  wrapUps: number;
  classes: number;
  tasksDone: number;
  weekends: number;
  perfectWeeks: number;
}

export type Tier = 'bronze' | 'silver' | 'gold';

export interface IconDef {
  id: string;
  /** Line-drawn symbol in the middle of the badge. */
  glyph: LucideIcon;
  /** Badge colour (HSL hue). */
  hue: number;
  name: string;
  /** Earned badges get a bronze, silver or gold ring by how hard they are. */
  tier?: Tier;
  /** How to unlock it, and your progress as [have, need]. Missing = free. */
  unlock?: { how: string; progress: (s: AchStats) => [number, number]; unit?: string };
}

const h = (min: number) => Math.floor(min / 60);

export const ICONS: IconDef[] = [
  // free — serious
  { id: 'book', glyph: BookOpen, hue: 28, name: 'Book' },
  { id: 'pencil', glyph: Pencil, hue: 45, name: 'Pencil' },
  { id: 'headphones', glyph: Headphones, hue: 265, name: 'Headphones' },
  { id: 'coffee', glyph: Coffee, hue: 20, name: 'Coffee' },
  { id: 'moon', glyph: Moon, hue: 230, name: 'Moon' },
  { id: 'star', glyph: Star, hue: 50, name: 'Star' },
  { id: 'leaf', glyph: Leaf, hue: 135, name: 'Leaf' },
  { id: 'puzzle', glyph: Puzzle, hue: 190, name: 'Puzzle' },
  { id: 'microscope', glyph: Microscope, hue: 175, name: 'Microscope' },
  { id: 'palette', glyph: Palette, hue: 320, name: 'Palette' },
  // free — fun
  { id: 'cat', glyph: Cat, hue: 35, name: 'Cat' },
  { id: 'dog', glyph: Dog, hue: 15, name: 'Dog' },
  { id: 'panda', glyph: Panda, hue: 150, name: 'Panda' },
  { id: 'rabbit', glyph: Rabbit, hue: 340, name: 'Bunny' },
  { id: 'squirrel', glyph: Squirrel, hue: 25, name: 'Squirrel' },
  { id: 'snail', glyph: Snail, hue: 95, name: 'Snail' },
  { id: 'ghost', glyph: Ghost, hue: 250, name: 'Ghost' },
  { id: 'bot', glyph: Bot, hue: 200, name: 'Robot' },
  { id: 'pizza', glyph: Pizza, hue: 8, name: 'Pizza' },
  { id: 'donut', glyph: Donut, hue: 330, name: 'Donut' },
  // earned
  { id: 'seedling', glyph: Sprout, hue: 120, name: 'Seedling', tier: 'bronze', unlock: { how: 'Finish your first focus block', progress: (s) => [s.blocks, 1] } },
  { id: 'fire', glyph: Flame, hue: 18, name: 'On Fire', tier: 'silver', unlock: { how: 'Study 7 days in a row', progress: (s) => [s.longestStreak, 7], unit: 'days' } },
  { id: 'comet', glyph: Sparkles, hue: 285, name: 'Supernova', tier: 'gold', unlock: { how: 'Study 30 days in a row', progress: (s) => [s.longestStreak, 30], unit: 'days' } },
  { id: 'hourglass', glyph: Hourglass, hue: 40, name: 'Hourglass', tier: 'bronze', unlock: { how: '10 hours of focus in total', progress: (s) => [h(s.totalMin), 10], unit: 'h' } },
  { id: 'mountain', glyph: MountainSnow, hue: 205, name: 'Summit', tier: 'gold', unlock: { how: '100 hours of focus in total', progress: (s) => [h(s.totalMin), 100], unit: 'h' } },
  { id: 'diamond', glyph: Gem, hue: 185, name: 'Diamond', tier: 'gold', unlock: { how: '250 hours of focus in total', progress: (s) => [h(s.totalMin), 250], unit: 'h' } },
  { id: 'owl', glyph: CloudMoon, hue: 245, name: 'Night Owl', tier: 'silver', unlock: { how: 'Finish 10 blocks after 10pm', progress: (s) => [s.nightBlocks, 10], unit: 'blocks' } },
  { id: 'rooster', glyph: Sunrise, hue: 32, name: 'Early Bird', tier: 'silver', unlock: { how: 'Finish 10 blocks before 8am', progress: (s) => [s.earlyBlocks, 10], unit: 'blocks' } },
  { id: 'brain', glyph: Brain, hue: 330, name: 'Big Brain', tier: 'silver', unlock: { how: 'Answer 500 quiz questions', progress: (s) => [s.answered, 500], unit: 'questions' } },
  { id: 'target', glyph: Target, hue: 0, name: 'Sharpshooter', tier: 'gold', unlock: { how: 'Get 1,000 quiz answers right', progress: (s) => [s.correct, 1000], unit: 'right' } },
  { id: 'turtle', glyph: Footprints, hue: 75, name: 'Marathon', tier: 'silver', unlock: { how: '4 hours of focus in one day', progress: (s) => [h(s.bestDayMin), 4], unit: 'h' } },
  { id: 'whale', glyph: Waves, hue: 210, name: 'Deep Diver', tier: 'silver', unlock: { how: 'Finish 10 blocks of 70+ minutes', progress: (s) => [s.longBlocks, 10], unit: 'blocks' } },
  { id: 'handshake', glyph: Handshake, hue: 160, name: 'Teammate', tier: 'silver', unlock: { how: 'Finish 5 study-together blocks', progress: (s) => [s.togetherBlocks, 5], unit: 'blocks' } },
  { id: 'grad', glyph: GraduationCap, hue: 255, name: 'Graduate', tier: 'silver', unlock: { how: 'Log how 3 exams went', progress: (s) => [s.wrapUps, 3], unit: 'exams' } },
  { id: 'books', glyph: Library, hue: 12, name: 'Bookworm', tier: 'bronze', unlock: { how: 'Add notes for 5 classes', progress: (s) => [s.classes, 5], unit: 'classes' } },
  { id: 'check', glyph: CircleCheckBig, hue: 140, name: 'Closer', tier: 'silver', unlock: { how: 'Complete 50 tasks', progress: (s) => [s.tasksDone, 50], unit: 'tasks' } },
  { id: 'surf', glyph: Sailboat, hue: 195, name: 'Weekend Warrior', tier: 'bronze', unlock: { how: 'Study on a Saturday and Sunday of the same weekend', progress: (s) => [s.weekends, 1] } },
  { id: 'rocket', glyph: Rocket, hue: 275, name: 'Perfect Week', tier: 'gold', unlock: { how: 'Study every day, Monday to Sunday', progress: (s) => [s.perfectWeeks, 1] } },
];

const byId = new Map(ICONS.map((i) => [i.id, i]));
export const getIcon = (id?: string | null) => (id ? byId.get(id) : undefined);
export const isUnlocked = (icon: IconDef, s: AchStats) => !icon.unlock || icon.unlock.progress(s)[0] >= icon.unlock.progress(s)[1];
export const earnedIds = (s: AchStats) => ICONS.filter((i) => i.unlock && isUnlocked(i, s)).map((i) => i.id);

const parse = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function achStats(data: { sessions: Session[]; reviewLog: ReviewLog; exams: Exam[]; decks: { id: string }[]; tasks: Task[] }): AchStats {
  const { sessions, reviewLog, exams, decks, tasks } = data;
  const byDay = new Map<string, number>();
  let nightBlocks = 0;
  let earlyBlocks = 0;
  let longBlocks = 0;
  let togetherBlocks = 0;
  let totalMin = 0;
  for (const s of sessions) {
    totalMin += s.minutes;
    byDay.set(s.day, (byDay.get(s.day) ?? 0) + s.minutes);
    const hour = new Date(s.at).getHours();
    if (hour >= 22 || hour < 4) nightBlocks++;
    else if (hour < 8) earlyBlocks++;
    if (s.minutes >= 70) longBlocks++;
    if (s.together) togetherBlocks++;
  }
  const days = [...byDay.keys()].sort();
  const have = new Set(days);

  let longestStreak = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = parse(d);
    run = prev && Math.round((cur.getTime() - prev.getTime()) / 86_400_000) === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = cur;
  }

  let weekends = 0;
  let perfectWeeks = 0;
  const mondays = new Set<string>();
  for (const d of days) {
    const x = parse(d);
    if (x.getDay() === 6 && have.has(key(new Date(x.getFullYear(), x.getMonth(), x.getDate() + 1)))) weekends++;
    mondays.add(key(new Date(x.getFullYear(), x.getMonth(), x.getDate() - ((x.getDay() + 6) % 7))));
  }
  for (const m of mondays) {
    const x = parse(m);
    if (Array.from({ length: 7 }, (_, i) => key(new Date(x.getFullYear(), x.getMonth(), x.getDate() + i))).every((k) => have.has(k))) perfectWeeks++;
  }

  let answered = 0;
  let correct = 0;
  for (const v of Object.values(reviewLog)) {
    answered += v.total;
    correct += v.correct;
  }

  return {
    blocks: sessions.length,
    totalMin,
    longestStreak,
    nightBlocks,
    earlyBlocks,
    answered,
    correct,
    bestDayMin: Math.max(0, ...byDay.values()),
    longBlocks,
    togetherBlocks,
    wrapUps: exams.filter((e) => e.result).length,
    classes: decks.length,
    tasksDone: tasks.filter((t) => t.done).length,
    weekends,
    perfectWeeks,
  };
}
