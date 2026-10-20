import {
  Anchor, Apple, Atom, Banana, Bike, Bird, Bot, BookOpen, Brain, Bug, Carrot, Cat, Cherry, CircleCheckBig, Clover, Coffee, Compass, Cookie, Croissant,
  Dice5, Dna, Dog, Donut, Dumbbell, Earth, Egg, Feather, Fish, Flame, FlaskConical, Flower2, Footprints, Gamepad2, Gem, Ghost, GraduationCap,
  Guitar, HandMetal, Handshake, Headphones, Hourglass, IceCreamCone, Key, Leaf, Library, Lightbulb, Microscope, Moon, MountainSnow, Music, Orbit,
  Origami, Palette, Panda, PawPrint, Pencil, Pizza, Popcorn, Puzzle, Rabbit, Rainbow, Rat, Rocket, Sailboat, Shell, Snail, Snowflake, Sprout,
  Squirrel, Star, Sun, Sunrise, Target, Telescope, Tent, Timer, TreePine, Trophy, Turtle, PartyPopper, Users, Zap, type LucideIcon,
} from 'lucide-react';
import { Bee, Cactus, Cairn, Candle, Dragon, Duck, Fox, Frog, Mark, Mushroom, Octopus, Owl, Penguin, Ripple, Ufo, Whale, type Glyph } from './glyphs';

type GlyphLike = LucideIcon | Glyph;
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
  /** Times you came back after 7+ days off. */
  comebacks: number;
  bestDayAnswers: number;
  circles: number;
}

export type Tier = 'bronze' | 'silver' | 'gold';
/** Badge looks: Stillpoint (matte black + your accent), coin, sticker and neon. */
export type BadgeStyle = 'mono' | 'coin' | 'sticker' | 'neon';
export type IconGroup = 'Stillpoint' | 'Study' | 'Nature' | 'Animals' | 'Food' | 'Fun' | 'Earned';

export interface IconDef {
  id: string;
  /** The symbol in the middle of the badge. */
  glyph: GlyphLike;
  /** Badge colour (HSL hue). */
  hue: number;
  name: string;
  group: IconGroup;
  style: BadgeStyle;
  /** Earned badges get a bronze, silver or gold ring by how hard they are. */
  tier?: Tier;
  /** How to unlock it, and your progress as [have, need]. Missing = free. */
  unlock?: { how: string; progress: (s: AchStats) => [number, number]; unit?: string };
}

const h = (min: number) => Math.floor(min / 60);

type Free = [id: string, glyph: GlyphLike, hue: number, name: string];
const STYLE: Record<Exclude<IconGroup, 'Earned'>, BadgeStyle> = { Stillpoint: 'mono', Study: 'coin', Nature: 'coin', Animals: 'sticker', Food: 'sticker', Fun: 'neon' };
const group = (g: Exclude<IconGroup, 'Earned'>, items: Free[]): IconDef[] => items.map(([id, glyph, hue, name]) => ({ id, glyph, hue, name, group: g, style: STYLE[g] }));

export const ICONS: IconDef[] = [
  ...group('Stillpoint', [
    ['mark', Mark, 35, 'Stillpoint'],
    ['ripple', Ripple, 35, 'Ripple'],
    ['cairn', Cairn, 35, 'Cairn'],
    ['candle', Candle, 35, 'Candle'],
    ['feather', Feather, 35, 'Feather'],
    ['orbit', Orbit, 35, 'Orbit'],
  ]),
  ...group('Study', [
    ['book', BookOpen, 28, 'Book'],
    ['pencil', Pencil, 45, 'Pencil'],
    ['headphones', Headphones, 265, 'Headphones'],
    ['coffee', Coffee, 20, 'Coffee'],
    ['lightbulb', Lightbulb, 52, 'Idea'],
    ['microscope', Microscope, 175, 'Microscope'],
    ['telescope', Telescope, 235, 'Telescope'],
    ['atom', Atom, 195, 'Atom'],
    ['dna', Dna, 300, 'DNA'],
    ['flask', FlaskConical, 150, 'Flask'],
    ['palette', Palette, 320, 'Palette'],
    ['music', Music, 280, 'Music'],
    ['guitar', Guitar, 15, 'Guitar'],
    ['compass', Compass, 205, 'Compass'],
    ['key', Key, 42, 'Key'],
    ['puzzle', Puzzle, 190, 'Puzzle'],
  ]),
  ...group('Nature', [
    ['leaf', Leaf, 135, 'Leaf'],
    ['moon', Moon, 230, 'Moon'],
    ['star', Star, 50, 'Star'],
    ['sun', Sun, 40, 'Sun'],
    ['rainbow', Rainbow, 300, 'Rainbow'],
    ['snowflake', Snowflake, 200, 'Snowflake'],
    ['flower', Flower2, 330, 'Flower'],
    ['clover', Clover, 120, 'Clover'],
    ['tree', TreePine, 150, 'Pine'],
    ['mushroom', Mushroom, 5, 'Mushroom'],
    ['cactus', Cactus, 100, 'Cactus'],
    ['earth', Earth, 190, 'Earth'],
  ]),
  ...group('Animals', [
    ['cat', Cat, 35, 'Cat'],
    ['dog', Dog, 22, 'Dog'],
    ['panda', Panda, 150, 'Panda'],
    ['fox', Fox, 24, 'Fox'],
    ['frog', Frog, 105, 'Frog'],
    ['penguin', Penguin, 205, 'Penguin'],
    ['duck', Duck, 52, 'Duck'],
    ['bee', Bee, 45, 'Bee'],
    ['octopus', Octopus, 320, 'Octopus'],
    ['rabbit', Rabbit, 340, 'Bunny'],
    ['squirrel', Squirrel, 28, 'Squirrel'],
    ['turtle-free', Turtle, 140, 'Turtle'],
    ['snail', Snail, 85, 'Snail'],
    ['bird', Bird, 190, 'Bird'],
    ['fish', Fish, 210, 'Fish'],
    ['bug', Bug, 0, 'Ladybug'],
    ['rat', Rat, 270, 'Mouse'],
  ]),
  ...group('Food', [
    ['pizza', Pizza, 8, 'Pizza'],
    ['donut', Donut, 330, 'Donut'],
    ['cookie', Cookie, 32, 'Cookie'],
    ['croissant', Croissant, 38, 'Croissant'],
    ['icecream', IceCreamCone, 345, 'Ice cream'],
    ['popcorn', Popcorn, 50, 'Popcorn'],
    ['cherry', Cherry, 355, 'Cherry'],
    ['apple', Apple, 5, 'Apple'],
    ['carrot', Carrot, 25, 'Carrot'],
    ['banana', Banana, 55, 'Banana'],
    ['egg', Egg, 45, 'Egg'],
  ]),
  ...group('Fun', [
    ['ghost', Ghost, 260, 'Ghost'],
    ['bot', Bot, 190, 'Robot'],
    ['ufo', Ufo, 140, 'UFO'],
    ['gamepad', Gamepad2, 280, 'Gamer'],
    ['dice', Dice5, 330, 'Dice'],
    ['origami', Origami, 175, 'Origami'],
    ['rock', HandMetal, 300, 'Rock on'],
    ['shell', Shell, 20, 'Shell'],
    ['anchor', Anchor, 210, 'Anchor'],
    ['tent', Tent, 110, 'Camper'],
    ['bike', Bike, 160, 'Bike'],
    ['dumbbell', Dumbbell, 0, 'Gym'],
    ['paw', PawPrint, 35, 'Paw'],
    ['zap', Zap, 55, 'Zap'],
  ]),
  // earned
  ...(
    [
      { id: 'seedling', glyph: Sprout, hue: 120, name: 'Seedling', tier: 'bronze', unlock: { how: 'Finish your first focus block', progress: (s) => [s.blocks, 1] } },
      { id: 'fire', glyph: Flame, hue: 18, name: 'On Fire', tier: 'silver', unlock: { how: 'Study 7 days in a row', progress: (s) => [s.longestStreak, 7], unit: 'days' } },
      { id: 'dragon', glyph: Dragon, hue: 350, name: 'Dragon', tier: 'gold', unlock: { how: 'Study 30 days in a row', progress: (s) => [s.longestStreak, 30], unit: 'days' } },
      { id: 'hourglass', glyph: Hourglass, hue: 40, name: 'Hourglass', tier: 'bronze', unlock: { how: '10 hours of focus in total', progress: (s) => [h(s.totalMin), 10], unit: 'h' } },
      { id: 'mountain', glyph: MountainSnow, hue: 205, name: 'Summit', tier: 'gold', unlock: { how: '100 hours of focus in total', progress: (s) => [h(s.totalMin), 100], unit: 'h' } },
      { id: 'diamond', glyph: Gem, hue: 185, name: 'Diamond', tier: 'gold', unlock: { how: '250 hours of focus in total', progress: (s) => [h(s.totalMin), 250], unit: 'h' } },
      { id: 'owl', glyph: Owl, hue: 255, name: 'Night Owl', tier: 'silver', unlock: { how: 'Finish 10 blocks after 10pm', progress: (s) => [s.nightBlocks, 10], unit: 'blocks' } },
      { id: 'rooster', glyph: Sunrise, hue: 32, name: 'Early Bird', tier: 'silver', unlock: { how: 'Finish 10 blocks before 8am', progress: (s) => [s.earlyBlocks, 10], unit: 'blocks' } },
      { id: 'brain', glyph: Brain, hue: 330, name: 'Big Brain', tier: 'silver', unlock: { how: 'Answer 500 quiz questions', progress: (s) => [s.answered, 500], unit: 'questions' } },
      { id: 'target', glyph: Target, hue: 0, name: 'Sharpshooter', tier: 'gold', unlock: { how: 'Get 1,000 quiz answers right', progress: (s) => [s.correct, 1000], unit: 'right' } },
      { id: 'turtle', glyph: Footprints, hue: 75, name: 'Marathon', tier: 'silver', unlock: { how: '4 hours of focus in one day', progress: (s) => [h(s.bestDayMin), 4], unit: 'h' } },
      { id: 'whale', glyph: Whale, hue: 210, name: 'Deep Diver', tier: 'silver', unlock: { how: 'Finish 10 blocks of 70+ minutes', progress: (s) => [s.longBlocks, 10], unit: 'blocks' } },
      { id: 'handshake', glyph: Handshake, hue: 160, name: 'Teammate', tier: 'silver', unlock: { how: 'Finish 5 study-together blocks', progress: (s) => [s.togetherBlocks, 5], unit: 'blocks' } },
      { id: 'grad', glyph: GraduationCap, hue: 255, name: 'Graduate', tier: 'silver', unlock: { how: 'Log how 3 exams went', progress: (s) => [s.wrapUps, 3], unit: 'exams' } },
      { id: 'books', glyph: Library, hue: 12, name: 'Bookworm', tier: 'bronze', unlock: { how: 'Add notes for 5 classes', progress: (s) => [s.classes, 5], unit: 'classes' } },
      { id: 'check', glyph: CircleCheckBig, hue: 140, name: 'Closer', tier: 'silver', unlock: { how: 'Complete 50 tasks', progress: (s) => [s.tasksDone, 50], unit: 'tasks' } },
      { id: 'surf', glyph: Sailboat, hue: 195, name: 'Weekend Warrior', tier: 'bronze', unlock: { how: 'Study on a Saturday and Sunday of the same weekend', progress: (s) => [s.weekends, 1] } },
      { id: 'timer', glyph: Timer, hue: 15, name: 'Pomodoro Pro', tier: 'silver', unlock: { how: 'Finish 100 focus blocks', progress: (s) => [s.blocks, 100], unit: 'blocks' } },
      { id: 'trophy', glyph: Trophy, hue: 48, name: 'Quiz Whiz', tier: 'silver', unlock: { how: 'Answer 100 questions in one day', progress: (s) => [s.bestDayAnswers, 100], unit: 'questions' } },
      { id: 'comeback', glyph: PartyPopper, hue: 300, name: 'Comeback Kid', tier: 'bronze', unlock: { how: 'Get back to studying after a week or more off', progress: (s) => [s.comebacks, 1] } },
      { id: 'circle', glyph: Users, hue: 170, name: 'Social Studier', tier: 'bronze', unlock: { how: 'Join or start a study circle', progress: (s) => [s.circles, 1] } },
      { id: 'rocket', glyph: Rocket, hue: 275, name: 'Perfect Week', tier: 'gold', unlock: { how: 'Study every day, Monday to Sunday', progress: (s) => [s.perfectWeeks, 1] } },
    ] as Omit<IconDef, 'group' | 'style'>[]
  ).map((i) => ({ ...i, group: 'Earned' as const, style: 'coin' as const })),
];

const byId = new Map(ICONS.map((i) => [i.id, i]));
export const getIcon = (id?: string | null) => (id ? byId.get(id) : undefined);
export const isUnlocked = (icon: IconDef, s: AchStats) => !icon.unlock || icon.unlock.progress(s)[0] >= icon.unlock.progress(s)[1];
export const earnedIds = (s: AchStats) => ICONS.filter((i) => i.unlock && isUnlocked(i, s)).map((i) => i.id);
/** Earned now, or ever — badges never re-lock. */
export const hasBadge = (icon: IconDef, s: AchStats, kept: string[]) => isUnlocked(icon, s) || kept.includes(icon.id);

const parse = (day: string) => {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export function achStats(data: { sessions: Session[]; reviewLog: ReviewLog; exams: Exam[]; decks: { id: string }[]; tasks: Task[]; circles?: number }): AchStats {
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
  let comebacks = 0;
  let prev: Date | null = null;
  for (const d of days) {
    const cur = parse(d);
    const gap = prev ? Math.round((cur.getTime() - prev.getTime()) / 86_400_000) : 0;
    if (gap >= 8) comebacks++;
    run = gap === 1 ? run + 1 : 1;
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
  let bestDayAnswers = 0;
  for (const v of Object.values(reviewLog)) {
    answered += v.total;
    correct += v.correct;
    bestDayAnswers = Math.max(bestDayAnswers, v.total);
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
    comebacks,
    bestDayAnswers,
    circles: data.circles ?? 0,
  };
}
