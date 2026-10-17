export type Mode = 'focus' | 'short' | 'long';

export interface Settings {
  focusMin: number;
  shortMin: number;
  longMin: number;
  longEvery: number;
  autoStartBreaks: boolean;
  autoStartFocus: boolean;
  /** Minute into a focus block at which a recall checkpoint appears. 0 = off. */
  checkpointMin: number;
  warmupQuiz: boolean;
  reflectAfterFocus: boolean;
  notifications: boolean;
  chimeVolume: number;
  syncSoundWithTimer: boolean;
  accent: string;
  background: BackgroundSetting;
  dim: number;
  blur: number;
  /** Daily focus goal in minutes (0 = no goal). Streaks count days that hit it. */
  dailyGoalMin: number;
  /** Weekly focus goal in minutes (0 = no goal). */
  weeklyGoalMin: number;
  /** Show the next-exam countdown in the top bar. */
  showExamWidget: boolean;
  /** Break beats style to start automatically when a break begins ('off' = never). */
  breakBeats: 'off' | 'lofi' | 'bounce' | 'house';
  beatVolume: number;
  /** Suggest breaks in a recommended order (doodle → walk → rest → recharge) instead of at random. */
  breakPlan: boolean;
  /** Gentle motion in illustrated scene backgrounds (clouds, steam, twinkle). */
  sceneMotion: boolean;
  /** Notice when you leave the Stillpoint tab during focus (you decide whether it was studying). */
  awayTracking: boolean;
  theme: 'dark' | 'light' | 'system';
  /** Interface size: 1 = normal, 1.1 = large, 1.2 = larger. */
  textScale: number;
  /** Share weekly focus numbers with study circles. */
  shareCircleStats: boolean;
}

export interface BackgroundSetting {
  kind: 'preset' | 'url' | 'upload';
  preset: string;
  url: string;
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  estimate: number;
  pomos: number;
  done: boolean;
  day: string;
  deckId?: string;
  createdAt: number;
  /** YYYY-MM-DD the assignment is due; due-dated tasks stay on Today until done. */
  due?: string;
  /** Day it was marked done. */
  doneDay?: string;
}

export interface Session {
  id: string;
  day: string;
  at: number;
  minutes: number;
  taskId?: string;
  subject?: string;
  intention?: string;
  rating?: number;
  recall?: string;
  /** The study session (morning, evening…) this block belongs to. */
  studySessionId?: string;
  /** "Biology · Session 3" — the section picked under the timer, if any. */
  section?: string;
  /** Time away from the Stillpoint tab: how often, how long, and whether it was studying (your call). */
  away?: { count: number; ms: number; kind?: 'study' | 'distracted' };
}

/** A sitting of one or more focus blocks — e.g. a morning session and a night session on the same day. */
export interface StudySession {
  id: string;
  startedAt: number;
  /** Last activity (a focus block finishing); a long gap means the next block starts a new session. */
  lastAt: number;
  endedAt?: number;
  /** Overall focus for the session, 1–5. */
  rating?: number;
  /** Habits and conditions you ticked when ending it (see SESSION_FACTORS; custom ones are "custom:Text"). */
  factors: string[];
  /** Tools Stillpoint saw you use (focus sounds, break music, doodle pad), to pre-tick factors. */
  used: string[];
  note?: string;
}

export interface Deck {
  id: string;
  title: string;
  subject: string;
  content: string;
  autoCloze: boolean;
  createdAt: number;
  /** Section titles the student has already studied; only these (plus the current one) are quizzed. */
  studied?: string[];
  /** Day (YYYY-MM-DD) each section was first marked studied. */
  studiedOn?: Record<string, string>;
  /** Edits to generated questions, by card id; null = deleted. */
  edits?: Record<string, { front: string; back: string } | null>;
  /** Questions the student wrote themselves. */
  custom?: Card[];
}

export interface Exam {
  id: string;
  title: string;
  /** YYYY-MM-DD */
  date: string;
  deckId: string;
  /** Sections the exam covers ([] = all sections of the notes). */
  sections: string[];
}

export interface Card {
  id: string;
  deckId: string;
  kind: 'qa' | 'cloze' | 'prompt';
  front: string;
  back: string;
  auto?: boolean;
  /** The section (heading) of the notes this card came from; '' before the first heading. */
  section: string;
  /** Changed by the student (edited or self-written). */
  edited?: boolean;
  /** The front is a question/instruction to answer as written (from Q:/A: or a "?" line). */
  ask?: boolean;
  /** A diagram question: name the label hidden under this box. */
  image?: { diagramId: string; boxId: string };
}

/** An image with labels covered by boxes — each box becomes a "name the hidden part" question. */
export interface Diagram {
  id: string;
  deckId: string;
  section: string;
  title: string;
  /** Box positions as fractions (0–1) of the image size, so they scale with it. */
  boxes: { id: string; x: number; y: number; w: number; h: number; label: string }[];
  createdAt: number;
}

export interface ReviewState {
  box: number;
  due: number;
  seen: number;
  correct: number;
  last: number;
}

export interface Distraction {
  id: string;
  text: string;
  at: number;
  done: boolean;
}

export interface TimerState {
  mode: Mode;
  running: boolean;
  endAt: number | null;
  remaining: number;
  cycle: number;
  checkpointFired: boolean;
  intention: string;
  started: boolean;
  /** Free-recall notes written at the checkpoint, attached to the session. */
  recall: string;
  /** This block uses other apps on purpose (Claude, Docs, a textbook site…), so time away isn't a distraction. */
  otherApps?: boolean;
  /** Time spent away from the Stillpoint tab during this focus block. */
  awayCount?: number;
  awayMs?: number;
  /** When the tab was last hidden (null = visible). */
  awaySince?: number | null;
}
