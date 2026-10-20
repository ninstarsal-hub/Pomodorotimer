import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, ChartColumn, PencilRuler, Headphones, Lightbulb, ListTodo, Maximize2, Minimize2, Settings as SettingsIcon, Users, X } from 'lucide-react';
import { useStore } from './store';
import { usePersistentState, dayKey, fmtClock, uid } from './lib/storage';
import { chime, engine } from './lib/audio';
import { buildQuiz, isDue, sectionLabel } from './lib/quiz';
import type { Mode, TimerState } from './lib/types';
import { Background } from './components/Background';
import { TimerView } from './components/TimerView';
import { TodayPanel } from './components/TodayPanel';
import { SoundPanel } from './components/SoundPanel';
import { NotesPanel } from './components/NotesPanel';
import { StatsPanel } from './components/StatsPanel';
import { LearnPanel } from './components/LearnPanel';
import { SettingsPanel } from './components/SettingsPanel';
import { MediaDock } from './components/MediaDock';
import { QuizModal } from './components/QuizModal';
import { QuizBuilder } from './components/QuizBuilder';
import { ReflectionModal, RecallModal } from './components/Reflection';
import { Checkpoint } from './components/Checkpoint';
import { ParkingInput } from './components/ParkingInput';
import { Agenda } from './components/Agenda';
import { PlanPanel } from './components/PlanPanel';
import { GoalStat } from './components/GoalStat';
import { ExamWidget } from './components/ExamWidget';
import { Welcome } from './components/Welcome';
import { InAppBanner } from './components/InAppBanner';
import { SyncChoice } from './components/Account';
import { ACCENTS } from './lib/content';
import { ListenReview } from './components/ListenReview';
import { WeeklyRecapPrompt } from './components/WeeklyRecap';
import { ExamWrapUp } from './components/ExamWrapUp';
import { SharedImport } from './components/ShareNotes';
import { CirclesAgent, CirclesPanel, StudyingNowChip } from './components/Circles';
import { circlesAvailable, type GroupRef } from './lib/circles';
import { MiniTimer, miniTimerSupported, openMiniWindow } from './components/MiniTimer';
import { createPortal } from 'react-dom';
import { useSync } from './lib/sync';
import { SessionReview } from './components/SessionReview';
import { SessionPill } from './components/SessionPill';
import { sessionTitle } from './lib/studySessions';
import { isOnToday } from './lib/assignments';
import { BackupNudge, InstallButton, UpdateToast } from './components/InstallUI';
import { UndoToast } from './components/UndoToast';
import { PracticePanel } from './components/PracticePanel';
import { PracticeRunner } from './components/PracticeRunner';
import { beats } from './lib/beats';

type Panel = 'today' | 'plan' | 'sound' | 'notes' | 'practice' | 'stats' | 'circles' | 'learn' | 'settings';

const PANELS: { id: Panel; label: string; icon: typeof ListTodo }[] = [
  { id: 'today', label: 'Today', icon: ListTodo },
  { id: 'plan', label: 'Exam plan', icon: CalendarDays },
  { id: 'sound', label: 'Sound', icon: Headphones },
  { id: 'notes', label: 'Notes & Quiz', icon: BookOpen },
  { id: 'practice', label: 'Practice problems', icon: PencilRuler },
  { id: 'stats', label: 'Progress', icon: ChartColumn },
  { id: 'circles', label: 'Study circles', icon: Users },
  { id: 'learn', label: 'Strategies', icon: Lightbulb },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

const MODE_LABEL: Record<Mode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };

function notify(title: string, body: string, enabled: boolean) {
  if (!enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon: '/icon.svg', silent: true });
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}

export default function App() {
  const store = useStore();
  const { settings, tasks, setTasks, sessions, setSessions, activeTask, reviews, soundParams } = store;
  const [panel, setPanel] = useState<Panel | null>(null);
  const [zen, setZen] = useState(false);
  const [checkpoint, setCheckpoint] = useState(false);
  const [reflectionId, setReflectionId] = useState<string | null>(null);
  const [recallOpen, setRecallOpen] = useState(false);
  const [review, setReview] = useState<{ id: string; ending: boolean } | null>(null);
  const [shareOpen, setShareOpen] = useState(() => location.hash.startsWith('#share='));
  // Back from Google sign-in with an invite waiting? Go straight to it.
  const syncUser = useSync().user;
  useEffect(() => {
    if (syncUser && localStorage.getItem('stillpoint:pendingJoin')) setPanel('circles');
  }, [syncUser]);

  // Circle invite links (#join=CODE): remember the code (it survives the Google sign-in round trip) and open Circles.
  useEffect(() => {
    const check = () => {
      if (!location.hash.startsWith('#join=')) return;
      const code = location.hash.slice(6).replace(/[^\w-]/g, '').slice(0, 40);
      history.replaceState(null, '', location.pathname + location.search);
      if (code && circlesAvailable) {
        localStorage.setItem('stillpoint:pendingJoin', code);
        window.dispatchEvent(new Event('stillpoint:pendingJoin'));
        setPanel('circles');
      }
    };
    check();
    window.addEventListener('hashchange', check);
    return () => window.removeEventListener('hashchange', check);
  }, []);

  // Panels open just below the top bar, whose height changes (wrapping on phones, exam countdown).
  const topbarRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = topbarRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const durations: Record<Mode, number> = useMemo(
    () => ({ focus: settings.focusMin * 60_000, short: settings.shortMin * 60_000, long: settings.longMin * 60_000 }),
    [settings.focusMin, settings.shortMin, settings.longMin],
  );

  const [timer, setTimer] = usePersistentState<TimerState>('timer', {
    mode: 'focus',
    running: false,
    endAt: null,
    remaining: durations.focus,
    cycle: 0,
    checkpointFired: false,
    intention: '',
    started: false,
    recall: '',
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!timer.running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [timer.running]);

  const remaining = timer.running && timer.endAt ? Math.max(0, timer.endAt - now) : timer.remaining;
  const total = timer.mode === 'focus' && timer.focusMs ? timer.focusMs : durations[timer.mode];
  const elapsed = total - remaining;

  // Keep an untouched timer in sync with duration settings.
  useEffect(() => {
    if (!timer.started && !timer.running && timer.remaining !== durations[timer.mode]) {
      setTimer((t) => ({ ...t, remaining: durations[t.mode] }));
    }
  }, [durations, timer.started, timer.running, timer.mode, timer.remaining, setTimer]);

  const { currentCards, earlierCards, studyingNow } = store;

  /**
   * Checkpoint quiz: mostly the section you're on, plus one question from a section
   * you studied earlier (any class) so older material stays fresh. Never unstudied sections.
   */
  const checkpointQuiz = useCallback(() => {
    const n = 3;
    const fromCurrent = buildQuiz(currentCards, reviews, earlierCards.length ? n - 1 : n);
    const fromEarlier = buildQuiz(earlierCards, reviews, n - fromCurrent.length).map((i) => ({ ...i, earlier: true }));
    const items = [...fromCurrent, ...fromEarlier];
    if (items.length) store.setQuiz({ items, title: 'Recall checkpoint', subtitle: 'Retrieval now strengthens memory more than another read-through.' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCards, earlierCards, reviews]);

  /* ---------- phase transitions ---------- */

  const goTo = useCallback(
    (mode: Mode, autoStart: boolean, patch: Partial<TimerState> = {}) => {
      setTimer((t) => ({
        ...t,
        focusMs: undefined,
        group: undefined,
        ...patch,
        mode,
        running: autoStart,
        started: autoStart,
        endAt: autoStart ? Date.now() + durations[mode] : null,
        remaining: durations[mode],
        checkpointFired: false,
      }));
    },
    [durations, setTimer],
  );

  /** Saves a finished (or partly finished) focus block to your history. */
  const recordSession = useCallback(
    (t: TimerState, minutes: number): string | null => {
      if (minutes < 1) return null;
      const sessionId = uid();
      const at = Date.now();
      const studySessionId = store.ensureStudySession().id;
      // Include a stretch away that's still open (e.g. the block ended while you were in another tab).
      const openAway = t.awaySince && Date.now() - t.awaySince >= 10_000 ? Date.now() - t.awaySince : 0;
      const awayMs = (t.awayMs ?? 0) + openAway;
      const awayCount = (t.awayCount ?? 0) + (openAway ? 1 : 0);
      const away = awayMs >= 60_000 ? { count: awayCount, ms: awayMs, kind: t.otherApps ? ('study' as const) : undefined } : undefined;
      store.touchStudySession(studySessionId);
      const deck = studyingNow ? store.decks.find((d) => d.id === studyingNow.deckId) : undefined;
      const section = deck ? [deck.title, studyingNow!.section ? sectionLabel(studyingNow!.section, deck) : ''].filter(Boolean).join(' · ') : undefined;
      setSessions((s) => [
        ...s,
        {
          id: sessionId,
          day: dayKey(),
          at,
          minutes,
          taskId: activeTask?.id,
          subject: activeTask?.subject || undefined,
          intention: t.intention || undefined,
          recall: t.recall || undefined,
          studySessionId,
          section,
          ...(away ? { away } : {}),
        },
      ]);
      return sessionId;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeTask, setSessions, studyingNow, store.liveStudy?.id],
  );

  const finishPhase = useCallback(
    (skipped: boolean) => {
      const t = timer;
      if (t.mode === 'focus') {
        const minutes = skipped ? (t.group ? Math.round : Math.floor)(elapsed / 60_000) : t.focusMs ? Math.round(t.focusMs / 60_000) : settings.focusMin;
        const sessionId = recordSession(t, minutes);
        if (sessionId) {
          if (activeTask && !skipped) setTasks((ts) => ts.map((x) => (x.id === activeTask.id ? { ...x, pomos: x.pomos + 1 } : x)));
        }
        const cycle = skipped ? t.cycle : t.cycle + 1;
        const next: Mode = !skipped && cycle % settings.longEvery === 0 ? 'long' : 'short';
        if (!skipped) {
          chime(settings.chimeVolume);
          notify('Focus block complete', `Nice work. ${MODE_LABEL[next]} — ${next === 'long' ? settings.longMin : settings.shortMin} min.`, settings.notifications);
          if (settings.reflectAfterFocus && sessionId) setReflectionId(sessionId);
        }
        goTo(next, settings.autoStartBreaks && !skipped, { cycle, intention: t.intention, recall: '', awayCount: 0, awayMs: 0, awaySince: null });
      } else {
        if (!skipped) {
          chime(settings.chimeVolume);
          notify('Break is over', 'Ready for the next focus block?', settings.notifications);
        }
        goTo('focus', settings.autoStartFocus && !skipped, { intention: '', recall: '' });
      }
      setCheckpoint(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timer, elapsed, settings, activeTask, setTasks, goTo, recordSession],
  );

  // Phase completion
  useEffect(() => {
    if (timer.running && remaining <= 0) finishPhase(false);
  }, [timer.running, remaining, finishPhase]);

  // Mid-focus recall checkpoint
  useEffect(() => {
    const cp = settings.checkpointMin;
    if (timer.mode !== 'focus' || !timer.running || timer.checkpointFired || cp <= 0 || cp >= settings.focusMin) return;
    if (elapsed >= cp * 60_000) {
      setTimer((t) => ({ ...t, checkpointFired: true }));
      setCheckpoint(true);
      chime(settings.chimeVolume * 0.6, 'soft');
      notify('Recall checkpoint', `${cp} minutes in — take 60 seconds to test yourself.`, settings.notifications);
    }
  }, [elapsed, timer.mode, timer.running, timer.checkpointFired, settings.checkpointMin, settings.focusMin, settings.chimeVolume, settings.notifications, setTimer]);

  /* ---------- controls ---------- */

  const start = useCallback(() => {
    if (settings.notifications && typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission();
    }
    const firstStart = !timer.started;
    // A focus block after a long gap (new day, or evening after a morning session) starts a fresh session and set.
    const fresh = firstStart && timer.mode === 'focus' && store.ensureStudySession().isNew;
    setTimer((t) => ({ ...t, running: true, started: true, endAt: Date.now() + t.remaining, ...(fresh ? { cycle: 0 } : {}) }));
    if (firstStart && timer.mode === 'focus' && settings.warmupQuiz) {
      // Warm up on earlier sections that are due for review — never on material you haven't studied yet.
      const due = earlierCards.filter((c) => isDue(reviews[c.id]));
      const items = buildQuiz(due, reviews, 2).map((i) => ({ ...i, earlier: true }));
      if (items.length) store.setQuiz({ items, title: 'Warm-up', subtitle: 'Quick review of sections you’ve already studied, before you dive in.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifications, settings.warmupQuiz, timer.started, timer.mode, earlierCards, reviews, setTimer, store.liveStudy?.id]);

  /**
   * Leaving a shared block early saves the time you spent in it. What's left becomes its own block,
   * so finishing it solo (or rejoining) adds only the rest.
   */
  const saveGroupPart = useCallback(() => {
    const t = timer;
    if (t.mode !== 'focus' || !t.group) return null;
    const rem = t.endAt ? Math.max(0, t.endAt - Date.now()) : t.remaining;
    recordSession(t, Math.round(((t.focusMs ?? rem) - rem) / 60_000));
    return rem;
  }, [timer, recordSession]);

  const pause = useCallback(() => {
    const rem = saveGroupPart();
    if (rem !== null) {
      setTimer((t) => ({ ...t, running: false, endAt: null, remaining: rem, focusMs: rem, group: undefined, awayCount: 0, awayMs: 0, awaySince: null }));
      return;
    }
    setTimer((t) => ({ ...t, running: false, endAt: null, remaining: t.endAt ? Math.max(0, t.endAt - Date.now()) : t.remaining }));
  }, [setTimer, saveGroupPart]);

  const reset = useCallback(() => {
    saveGroupPart();
    setTimer((t) => ({ ...t, running: false, started: false, endAt: null, remaining: durations[t.mode], checkpointFired: false, awayCount: 0, awayMs: 0, awaySince: null, focusMs: undefined, group: undefined }));
    setCheckpoint(false);
  }, [durations, setTimer, saveGroupPart]);

  // Study together: a circle's shared block. Your timer counts down to the same end time as everyone else's.
  const joinGroup = useCallback(
    (g: GroupRef) => {
      const rem = g.endsAt - Date.now();
      if (rem < 60_000) return;
      // Save the part of a solo focus block you were already in.
      if (timer.mode === 'focus' && timer.started && timer.group?.blockId !== g.blockId) finishPhase(true);
      store.ensureStudySession();
      setTimer((t) => ({
        ...t,
        mode: 'focus',
        running: true,
        started: true,
        endAt: g.endsAt,
        remaining: rem,
        focusMs: rem,
        group: g,
        checkpointFired: false,
        awayCount: 0,
        awayMs: 0,
        awaySince: null,
      }));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [timer.mode, timer.started, timer.group?.blockId, finishPhase, setTimer],
  );
  const joinGroupRef = useRef(joinGroup);
  joinGroupRef.current = joinGroup;
  useEffect(() => {
    const on = (e: Event) => joinGroupRef.current((e as CustomEvent<GroupRef>).detail);
    window.addEventListener('stillpoint:groupBlock', on);
    return () => window.removeEventListener('stillpoint:groupBlock', on);
  }, []);

  // Mini timer: a small always-on-top window (Chrome/Edge on desktop).
  const [mini, setMini] = useState<Window | null>(null);
  const openMini = useCallback(async () => {
    if (mini) return mini.close();
    const w = await openMiniWindow().catch(() => null);
    if (!w) return;
    w.addEventListener('pagehide', () => setMini(null));
    setMini(w);
  }, [mini]);

  const switchMode = useCallback((mode: Mode) => goTo(mode, false), [goTo]);

  // Focus sounds follow the timer, if enabled.
  const syncRef = useRef(settings.syncSoundWithTimer);
  syncRef.current = settings.syncSoundWithTimer;
  useEffect(() => {
    if (!syncRef.current) return;
    if (timer.mode === 'focus' && timer.running) {
      void engine.play(soundParams);
      store.setSoundPlaying(true);
    } else {
      engine.stop();
      store.setSoundPlaying(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.mode, timer.running]);

  // Break beats: start with a running break (if enabled), always stop when focus resumes.
  useEffect(() => {
    if (timer.mode === 'focus') {
      if (timer.running) beats.stop();
    } else if (timer.running && settings.breakBeats !== 'off' && !beats.style) {
      void beats.play(settings.breakBeats, settings.beatVolume);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer.mode, timer.running]);

  // Away tracking: time spent on other tabs/apps during a running focus block (glances under 10s don't count).
  useEffect(() => {
    if (!settings.awayTracking || timer.mode !== 'focus' || !timer.running) return;
    // A stretch "away" left open by a pause or reload doesn't count once you're back.
    if (!document.hidden) setTimer((t) => (t.awaySince ? { ...t, awaySince: null } : t));
    const onVis = () => {
      const now = Date.now();
      if (document.hidden) setTimer((t) => (t.awaySince ? t : { ...t, awaySince: now }));
      else
        setTimer((t) => {
          if (!t.awaySince) return t;
          const ms = now - t.awaySince;
          return ms < 10_000 ? { ...t, awaySince: null } : { ...t, awaySince: null, awayCount: (t.awayCount ?? 0) + 1, awayMs: (t.awayMs ?? 0) + ms };
        });
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [settings.awayTracking, timer.mode, timer.running, setTimer]);

  // Coming back after a long gap (new day, or hours later): the old set is over, so start at block 1 in focus mode.
  useEffect(() => {
    if (timer.running || store.liveStudy) return;
    // Only an untouched timer — never one you've paused mid-block or mid-break.
    if (!timer.started && (timer.cycle !== 0 || timer.mode !== 'focus')) goTo('focus', false, { cycle: 0, intention: '', recall: '' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.liveStudy?.id, timer.running]);

  // Note tools used this session so the end-of-session review can pre-tick them.
  useEffect(() => {
    if (store.soundPlaying) store.markUsed('sounds');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.soundPlaying, store.liveStudy?.id]);
  useEffect(() => beats.subscribe(() => beats.style && store.markUsed('music')));

  // Tab title
  useEffect(() => {
    document.title = timer.started ? `${fmtClock(remaining)} · ${MODE_LABEL[timer.mode]} — Stillpoint` : 'Stillpoint';
  }, [remaining, timer.mode, timer.started]);

  // Light / dark (following the system if asked)
  const [systemLight, setSystemLight] = useState(() => window.matchMedia('(prefers-color-scheme: light)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const on = () => setSystemLight(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  const theme = settings.theme === 'system' ? (systemLight ? 'light' : 'dark') : settings.theme;

  // Accent colour
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', theme === 'light' ? (ACCENTS.find((x) => x.value === settings.accent)?.ink ?? settings.accent) : settings.accent);
  }, [settings.accent, theme]);

  // Theme + interface size
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  useEffect(() => {
    (document.documentElement.style as CSSStyleDeclaration & { zoom: string }).zoom = settings.textScale === 1 ? '' : String(settings.textScale);
  }, [settings.textScale]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (store.quiz || store.builderOpen || store.practiceRun || reflectionId || recallOpen) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (timer.running) pause();
        else start();
      } else if (e.key === 'r') reset();
      else if (e.key === 's') finishPhase(true);
      else if (e.key === 'z') setZen((z) => !z);
      else if (e.key === 'Escape') {
        setPanel(null);
        setZen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [timer.running, start, pause, reset, finishPhase, store.quiz, store.builderOpen, store.practiceRun, reflectionId, recallOpen]);

  const todayMinutes = sessions.filter((s) => s.day === store.today).reduce((a, s) => a + s.minutes, 0);
  const openTasks = tasks.filter((t) => !t.done && isOnToday(t, store.today));

  return (
    <div className={`app ${zen ? 'is-zen' : ''} ${panel ? 'has-panel' : ''} mode-${timer.mode}`}>
      <Background bg={settings.background} dim={settings.dim} blur={settings.blur} uploadVersion={store.uploadVersion} motion={settings.sceneMotion} />

      <header className="topbar fade-zen" ref={topbarRef}>
        <div className="brand-wrap">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <span>Stillpoint</span>
          </div>
          <ExamWidget onOpenPlan={() => setPanel('plan')} />
        </div>
        <InstallButton />
        <nav className="nav" aria-label="Panels">
          {PANELS.filter((p) => p.id !== 'circles' || circlesAvailable).map(({ id, label, icon: Icon }) => (
            <button key={id} className={`icon-btn ${panel === id ? 'is-active' : ''}`} onClick={() => setPanel(panel === id ? null : id)} aria-label={label} data-tip={label}>
              <Icon size={18} strokeWidth={1.6} />
            </button>
          ))}
          <span className="nav-sep" />
          <button className="icon-btn" onClick={() => setZen((z) => !z)} aria-label="Zen mode" data-tip="Zen mode (Z)">
            {zen ? <Minimize2 size={18} strokeWidth={1.6} /> : <Maximize2 size={18} strokeWidth={1.6} />}
          </button>
        </nav>
      </header>

      <main className="stage">
        <TimerView
          mode={timer.mode}
          remaining={remaining}
          total={total}
          running={timer.running}
          started={timer.started}
          cycle={timer.cycle}
          longEvery={settings.longEvery}
          intention={timer.intention}
          onIntention={(intention) => setTimer((t) => ({ ...t, intention }))}
          onStart={start}
          onPause={pause}
          onReset={reset}
          onSkip={() => finishPhase(true)}
          onMode={switchMode}
          openTasks={openTasks}
          onOpenToday={() => setPanel('today')}
          onOpenSound={() => setPanel('sound')}
          onResetSet={() => goTo('focus', false, { cycle: 0, intention: '', recall: '' })}
          onMini={miniTimerSupported ? () => void openMini() : undefined}
          miniOpen={!!mini}
          otherApps={!!timer.otherApps}
          onOtherApps={settings.awayTracking ? (v) => setTimer((t) => ({ ...t, otherApps: v })) : undefined}
        >
          {!timer.running && <Agenda onOpenPlan={() => setPanel('plan')} onOpenToday={() => setPanel('today')} />}
        </TimerView>
      </main>

      <footer className="footer fade-zen">
        <ParkingInput onOpen={() => setPanel('today')} />
        {circlesAvailable && <StudyingNowChip group={timer.group} onOpen={() => setPanel('circles')} />}
        {store.liveStudy && !timer.running && (
          <SessionPill
            title={sessionTitle(store.liveStudy)}
            blocks={sessions.filter((s) => s.studySessionId === store.liveStudy!.id).length}
            onEnd={() => setReview({ id: store.liveStudy!.id, ending: true })}
          />
        )}
        <GoalStat minutes={todayMinutes} goal={settings.dailyGoalMin} onClick={() => setPanel('stats')} />
      </footer>

      {circlesAvailable && <CirclesAgent studyingUntil={timer.mode === 'focus' && timer.running ? timer.endAt : null} group={timer.group} onOpen={() => setPanel('circles')} />}
      {mini &&
        createPortal(
          <MiniTimer
            win={mini}
            mode={timer.mode}
            remaining={remaining}
            total={total}
            running={timer.running}
            started={timer.started}
            endAt={timer.endAt}
            group={timer.group}
            onStart={start}
            onPause={pause}
            onSkip={() => finishPhase(true)}
            onTick={setNow}
          />,
          mini.document.body,
        )}
      <InAppBanner />
      <SyncChoice />
      <MediaDock />
      <UpdateToast />
      <UndoToast />
      {!timer.running && <BackupNudge />}

      {checkpoint && (
        <Checkpoint
          minutes={settings.checkpointMin}
          hasCards={currentCards.length + earlierCards.length > 0}
          hint={store.decks.length > 0 && !studyingNow ? 'Tip: choose the section you’re studying under the timer to get questions on it.' : undefined}
          onQuiz={() => {
            setCheckpoint(false);
            checkpointQuiz();
          }}
          onRecall={() => {
            setCheckpoint(false);
            setRecallOpen(true);
          }}
          onDismiss={() => setCheckpoint(false)}
        />
      )}

      <aside className={`drawer ${panel ? 'is-open' : ''}`} aria-hidden={!panel}>
        {panel && (
          <>
            <div className="drawer-head">
              <h2>{PANELS.find((p) => p.id === panel)?.label}</h2>
              <button className="icon-btn" onClick={() => setPanel(null)} aria-label="Close panel">
                <X size={18} strokeWidth={1.6} />
              </button>
            </div>
            <div className="drawer-body">
              {panel === 'today' && <TodayPanel />}
              {panel === 'plan' && <PlanPanel />}
              {panel === 'sound' && <SoundPanel />}
              {panel === 'notes' && <NotesPanel />}
              {panel === 'practice' && <PracticePanel />}
              {panel === 'stats' && <StatsPanel />}
              {panel === 'circles' && <CirclesPanel />}
              {panel === 'learn' && <LearnPanel />}
              {panel === 'settings' && <SettingsPanel />}
            </div>
          </>
        )}
      </aside>
      {panel && <div className="scrim" onClick={() => setPanel(null)} />}

      {store.practiceRun && <PracticeRunner key={store.practiceRun.refs.map((r) => r.problemId).join('|')} />}
      {store.builderOpen && (
        <QuizBuilder
          onClose={() => store.setBuilderOpen(false)}
          onStartBlock={() => {
            // Quiz time counts as a focus block; skip the mid-block checkpoint since you're already testing yourself.
            setPanel(null);
            setTimer((t) =>
              t.mode === 'focus' && t.running
                ? { ...t, checkpointFired: true }
                : { ...t, mode: 'focus', running: true, started: true, endAt: Date.now() + durations.focus, remaining: durations.focus, checkpointFired: true },
            );
          }}
        />
      )}
      {shareOpen ? (
        <SharedImport
          onDone={(added) => {
            setShareOpen(false);
            if (added) setPanel('notes');
          }}
        />
      ) : (
        <>
          {panel !== 'circles' && <Welcome onOpen={setPanel} />}
          {!timer.running && !store.quiz && !reflectionId && <ExamWrapUp fallback={<WeeklyRecapPrompt onOpenPlan={() => setPanel('plan')} />} />}
        </>
      )}
      {review && (
        <SessionReview
          id={review.id}
          ending={review.ending}
          onClose={() => setReview(null)}
          onDone={() => {
            if (review.ending) goTo('focus', false, { cycle: 0, intention: '', recall: '' });
            setReview(null);
          }}
        />
      )}
      {store.listenOpen && <ListenReview onClose={() => store.setListenOpen(false)} />}
      {store.quiz && <QuizModal request={store.quiz} onClose={() => store.setQuiz(null)} />}
      {recallOpen && (
        <RecallModal
          initial={timer.recall}
          onSave={(recall) => {
            setTimer((t) => ({ ...t, recall }));
            setRecallOpen(false);
          }}
          onClose={() => setRecallOpen(false)}
        />
      )}
      {reflectionId && !store.quiz && <ReflectionModal sessionId={reflectionId} onClose={() => setReflectionId(null)} />}
    </div>
  );
}
