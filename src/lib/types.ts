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
}
