import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { usePersistentState, dayKey } from './lib/storage';
import { parseCards, type QuizItem } from './lib/quiz';
import type { SoundParams } from './lib/audio';
import { SOUND_PRESETS } from './lib/audio';
import type { Card, Deck, Distraction, ReviewState, Session, Settings, Task } from './lib/types';

export const DEFAULT_SETTINGS: Settings = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStartBreaks: true,
  autoStartFocus: false,
  checkpointMin: 15,
  warmupQuiz: true,
  reflectAfterFocus: true,
  notifications: true,
  chimeVolume: 0.5,
  syncSoundWithTimer: false,
  accent: '#e7cba9',
  background: { kind: 'preset', preset: 'aurora', url: '' },
  dim: 0.55,
  blur: 0,
};

export interface MediaLink {
  id: string;
  name: string;
  url: string;
}

export interface QuizRequest {
  items: QuizItem[];
  title: string;
  subtitle?: string;
}

export type ReviewLog = Record<string, { total: number; correct: number }>;

function useStoreValue() {
  const [settings, setSettings] = usePersistentState<Settings>('settings', DEFAULT_SETTINGS);
  const [tasks, setTasks] = usePersistentState<Task[]>('tasks', []);
  const [sessions, setSessions] = usePersistentState<Session[]>('sessions', []);
  const [decks, setDecks] = usePersistentState<Deck[]>('decks', []);
  const [reviews, setReviews] = usePersistentState<Record<string, ReviewState>>('reviews', {});
  const [reviewLog, setReviewLog] = usePersistentState<ReviewLog>('reviewLog', {});
  const [distractions, setDistractions] = usePersistentState<Distraction[]>('distractions', []);
  const [activeTaskId, setActiveTaskId] = usePersistentState<string | null>('activeTask', null);
  const [soundParams, setSoundParams] = usePersistentState<SoundParams>('sound', SOUND_PRESETS[0].params);
  const [soundPresetId, setSoundPresetId] = usePersistentState<string>('soundPreset', SOUND_PRESETS[0].id);
  const [customMedia, setCustomMedia] = usePersistentState<MediaLink[]>('media', []);
  const [soundPlaying, setSoundPlaying] = useState(false);
  const [nowPlaying, setNowPlaying] = useState<{ name: string; embed: string } | null>(null);
  const [quiz, setQuiz] = useState<QuizRequest | null>(null);
  const [uploadVersion, setUploadVersion] = useState(0);

  const cards = useMemo<Card[]>(() => decks.flatMap(parseCards), [decks]);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const today = dayKey();

  const logReview = (correct: boolean) =>
    setReviewLog((log) => {
      const d = log[today] ?? { total: 0, correct: 0 };
      return { ...log, [today]: { total: d.total + 1, correct: d.correct + (correct ? 1 : 0) } };
    });

  return {
    settings,
    setSettings,
    tasks,
    setTasks,
    sessions,
    setSessions,
    decks,
    setDecks,
    reviews,
    setReviews,
    reviewLog,
    logReview,
    setReviewLog,
    distractions,
    setDistractions,
    activeTaskId,
    setActiveTaskId,
    activeTask,
    soundParams,
    setSoundParams,
    soundPresetId,
    setSoundPresetId,
    soundPlaying,
    setSoundPlaying,
    customMedia,
    setCustomMedia,
    nowPlaying,
    setNowPlaying,
    quiz,
    setQuiz,
    uploadVersion,
    setUploadVersion,
    cards,
    today,
  };
}

export type Store = ReturnType<typeof useStoreValue>;

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useStore outside provider');
  return v;
}
