import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { usePersistentState, dayKey } from './lib/storage';
import { deckCards, type QuizItem } from './lib/quiz';
import type { SoundParams } from './lib/audio';
import type { Problem, ProblemRef, ProblemSet } from './lib/problems';
import { SOUND_PRESETS } from './lib/audio';
import type { Card, Deck, Diagram, Distraction, Exam, ReviewState, Session, Settings, StudySession, Task } from './lib/types';
import { diagramCards } from './lib/diagrams';
import { isLive } from './lib/studySessions';
import { uid } from './lib/storage';

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
  dailyGoalMin: 60,
  weeklyGoalMin: 300,
  showExamWidget: true,
  breakBeats: 'off',
  beatVolume: 0.5,
  breakPlan: true,
  sceneMotion: true,
  awayTracking: true,
  theme: 'dark',
  textScale: 1,
  shareCircleStats: true,
  avatar: '',
};

export const sectionKey = (deckId: string, section: string) => `${deckId}\u0000${section}`;

export interface BuilderInit {
  scope?: string[];
  weakFirst?: boolean;
  count?: number;
}

export interface StudyPointer {
  deckId: string;
  section: string;
}

export interface MediaLink {
  id: string;
  name: string;
  url: string;
  /** 'break' links are listed under Break music instead of focus music. */
  kind?: 'break';
}

export interface QuizRequest {
  items: QuizItem[];
  title: string;
  subtitle?: string;
  /** Cram mode: missed questions come back at the end of the round until you get them (up to 3 extra tries). */
  repeatMissed?: boolean;
}

export type ReviewLog = Record<string, { total: number; correct: number }>;
/** Per day: how many questions were answered from each section (key = sectionKey). */
export type SectionLog = Record<string, Record<string, number>>;

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
  const [builderInit, setBuilderInit] = useState<BuilderInit | null>(null);
  const builderOpen = builderInit !== null;
  const setBuilderOpen = (open: boolean, init: BuilderInit = {}) => setBuilderInit(open ? init : null);
  const [exams, setExams] = usePersistentState<Exam[]>('exams', []);
  const [sectionLog, setSectionLog] = usePersistentState<SectionLog>('sectionLog', {});
  const [problemSets, setProblemSets] = usePersistentState<ProblemSet[]>('problemSets', []);
  const [practiceRun, setPracticeRun] = useState<{ refs: ProblemRef[]; title: string } | null>(null);
  const updateProblem = (setId: string, problemId: string, fn: (p: Problem) => Problem) =>
    setProblemSets((ss) => ss.map((set) => (set.id !== setId ? set : { ...set, problems: set.problems.map((p) => (p.id === problemId ? fn(p) : p)) })));
  const [uploadVersion, setUploadVersion] = useState(0);
  const [listenOpen, setListenOpen] = useState(false);

  /* ---------- study sessions (a sitting of several focus blocks) ---------- */
  const [studySessions, setStudySessions] = usePersistentState<StudySession[]>('studySessions', []);
  const [activeStudyId, setActiveStudyId] = usePersistentState<string | null>('activeStudySession', null);
  const [customFactors, setCustomFactors] = usePersistentState<string[]>('customFactors', []);
  const activeStudy = studySessions.find((s) => s.id === activeStudyId);
  const liveStudy = activeStudy && isLive(activeStudy) ? activeStudy : null;

  /** The session a new focus block belongs to — continuing the live one or starting a fresh one. */
  const ensureStudySession = (): { id: string; isNew: boolean } => {
    if (liveStudy) return { id: liveStudy.id, isNew: false };
    const now = Date.now();
    const s: StudySession = { id: uid(), startedAt: now, lastAt: now, factors: [], used: [] };
    // A session that just went quiet (long gap) is closed where it stopped, so it can still be rated later.
    setStudySessions((ss) => [...ss.map((x) => (x.id === activeStudyId && !x.endedAt ? { ...x, endedAt: x.lastAt } : x)), s]);
    setActiveStudyId(s.id);
    return { id: s.id, isNew: true };
  };
  const touchStudySession = (id: string) => setStudySessions((ss) => ss.map((x) => (x.id === id ? { ...x, lastAt: Date.now() } : x)));
  /** Note that a tool was used this session (focus sounds, break music, doodle) — pre-ticks the review. */
  const markUsed = (tag: string) => {
    if (!liveStudy || liveStudy.used.includes(tag)) return;
    setStudySessions((ss) => ss.map((x) => (x.id === liveStudy.id ? { ...x, used: [...x.used, tag] } : x)));
  };
  const updateStudySession = (id: string, patch: Partial<StudySession>) => setStudySessions((ss) => ss.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const endStudySession = (id: string, patch: Partial<StudySession> = {}) => {
    setStudySessions((ss) => ss.map((x) => (x.id === id ? { ...x, endedAt: x.endedAt ?? Date.now(), ...patch } : x)));
    if (id === activeStudyId) setActiveStudyId(null);
  };

  const [diagrams, setDiagrams] = usePersistentState<Diagram[]>('diagrams', []);
  const cards = useMemo<Card[]>(() => [...decks.flatMap(deckCards), ...diagramCards(diagrams, decks)], [decks, diagrams]);

  /* ---------- sections: what you're studying now, and what you've already covered ---------- */
  const [studyingNow, setStudyingNowRaw] = usePersistentState<StudyPointer | null>('studyingNow', null);
  // Ignore a pointer to notes or a section that no longer exists.
  const current = studyingNow && decks.some((d) => d.id === studyingNow.deckId) ? studyingNow : null;

  const setStudyingNow = (ptr: StudyPointer | null) => {
    setStudyingNowRaw(ptr);
    // Whatever you're studying now counts as studied from here on.
    if (ptr) setStudied(ptr.deckId, ptr.section, true);
  };
  const setStudied = (deckId: string, section: string, studied: boolean) =>
    setDecks((ds) =>
      ds.map((d) => {
        if (d.id !== deckId) return d;
        const list = (d.studied ?? []).filter((x) => x !== section);
        if (studied && d.studied?.includes(section)) return d;
        const studiedOn = { ...d.studiedOn };
        if (studied) studiedOn[section] = dayKey();
        else delete studiedOn[section];
        return { ...d, studied: studied ? [...list, section] : list, studiedOn };
      }),
    );

  const pools = useMemo(() => {
    const studied = new Map(decks.map((d) => [d.id, new Set(d.studied ?? [])]));
    const isCurrent = (c: Card) => !!current && c.deckId === current.deckId && c.section === current.section;
    const currentCards = cards.filter(isCurrent);
    // Earlier material: sections you've marked studied, in any class, excluding the one you're on.
    const earlierCards = cards.filter((c) => !isCurrent(c) && studied.get(c.deckId)?.has(c.section));
    return { currentCards, earlierCards, unlocked: [...currentCards, ...earlierCards] };
  }, [cards, decks, current]);

  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;
  const today = dayKey();

  const logReview = (correct: boolean, card?: Card) => {
    setReviewLog((log) => {
      const d = log[today] ?? { total: 0, correct: 0 };
      return { ...log, [today]: { total: d.total + 1, correct: d.correct + (correct ? 1 : 0) } };
    });
    if (card) {
      const k = sectionKey(card.deckId, card.section);
      setSectionLog((log) => ({ ...log, [today]: { ...log[today], [k]: (log[today]?.[k] ?? 0) + 1 } }));
    }
  };

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
    builderOpen,
    builderInit,
    setBuilderOpen,
    exams,
    setExams,
    problemSets,
    setProblemSets,
    updateProblem,
    practiceRun,
    setPracticeRun,
    sectionLog,
    uploadVersion,
    listenOpen,
    setListenOpen,
    diagrams,
    setDiagrams,
    studySessions,
    setStudySessions,
    liveStudy,
    ensureStudySession,
    touchStudySession,
    markUsed,
    updateStudySession,
    endStudySession,
    customFactors,
    setCustomFactors,
    setUploadVersion,
    cards,
    today,
    studyingNow: current,
    setStudyingNow,
    setStudied,
    ...pools,
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
