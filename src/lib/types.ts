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
  aiAccessCode: string;
  aiAutoGenerate: boolean;
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
  /** Questions written by the AI from this deck's notes. */
  aiCards?: Card[];
  /** Fingerprint of the notes the AI questions were generated from. */
  aiSource?: string;
  aiGeneratedAt?: number;
  /** Quiz from the AI questions (true) or the built-in parser (false). */
  useAi?: boolean;
}

export interface Card {
  id: string;
  deckId: string;
  kind: 'qa' | 'cloze' | 'prompt';
  front: string;
  back: string;
  auto?: boolean;
  ai?: boolean;
  /** For AI cards: false when the question was written from general knowledge of a topic the notes only name. */
  fromNotes?: boolean;
  topic?: string;
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
