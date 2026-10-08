import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, ChartColumn, Headphones, Lightbulb, ListTodo, Maximize2, Minimize2, Settings as SettingsIcon, X } from 'lucide-react';
import { useStore } from './store';
import { usePersistentState, dayKey, fmtClock, uid } from './lib/storage';
import { chime, engine } from './lib/audio';
import { buildQuiz, isDue } from './lib/quiz';
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

type Panel = 'today' | 'plan' | 'sound' | 'notes' | 'stats' | 'learn' | 'settings';

const PANELS: { id: Panel; label: string; icon: typeof ListTodo }[] = [
  { id: 'today', label: 'Today', icon: ListTodo },
  { id: 'plan', label: 'Exam plan', icon: CalendarDays },
  { id: 'sound', label: 'Sound', icon: Headphones },
  { id: 'notes', label: 'Notes & Quiz', icon: BookOpen },
  { id: 'stats', label: 'Progress', icon: ChartColumn },
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
  const total = durations[timer.mode];
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

  const finishPhase = useCallback(
    (skipped: boolean) => {
      const t = timer;
      if (t.mode === 'focus') {
        const minutes = skipped ? Math.floor(elapsed / 60_000) : settings.focusMin;
        let sessionId: string | null = null;
        if (minutes >= 1) {
          sessionId = uid();
          const at = Date.now();
          setSessions((s) => [
            ...s,
            { id: sessionId!, day: dayKey(), at, minutes, taskId: activeTask?.id, subject: activeTask?.subject || undefined, intention: t.intention || undefined, recall: t.recall || undefined },
          ]);
          if (activeTask && !skipped) setTasks((ts) => ts.map((x) => (x.id === activeTask.id ? { ...x, pomos: x.pomos + 1 } : x)));
        }
        const cycle = skipped ? t.cycle : t.cycle + 1;
        const next: Mode = !skipped && cycle % settings.longEvery === 0 ? 'long' : 'short';
        if (!skipped) {
          chime(settings.chimeVolume);
          notify('Focus block complete', `Nice work. ${MODE_LABEL[next]} — ${next === 'long' ? settings.longMin : settings.shortMin} min.`, settings.notifications);
          if (settings.reflectAfterFocus && sessionId) setReflectionId(sessionId);
        }
        goTo(next, settings.autoStartBreaks && !skipped, { cycle, intention: t.intention, recall: '' });
      } else {
        if (!skipped) {
          chime(settings.chimeVolume);
          notify('Break is over', 'Ready for the next focus block?', settings.notifications);
        }
        goTo('focus', settings.autoStartFocus && !skipped, { intention: '', recall: '' });
      }
      setCheckpoint(false);
    },
    [timer, elapsed, settings, activeTask, setSessions, setTasks, goTo],
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
    setTimer((t) => ({ ...t, running: true, started: true, endAt: Date.now() + t.remaining }));
    if (firstStart && timer.mode === 'focus' && settings.warmupQuiz) {
      // Warm up on earlier sections that are due for review — never on material you haven't studied yet.
      const due = earlierCards.filter((c) => isDue(reviews[c.id]));
      const items = buildQuiz(due, reviews, 2).map((i) => ({ ...i, earlier: true }));
      if (items.length) store.setQuiz({ items, title: 'Warm-up', subtitle: 'Quick review of sections you’ve already studied, before you dive in.' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.notifications, settings.warmupQuiz, timer.started, timer.mode, earlierCards, reviews, setTimer]);

  const pause = useCallback(() => {
    setTimer((t) => ({ ...t, running: false, endAt: null, remaining: t.endAt ? Math.max(0, t.endAt - Date.now()) : t.remaining }));
  }, [setTimer]);

  const reset = useCallback(() => {
    setTimer((t) => ({ ...t, running: false, started: false, endAt: null, remaining: durations[t.mode], checkpointFired: false }));
    setCheckpoint(false);
  }, [durations, setTimer]);

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

  // Tab title
  useEffect(() => {
    document.title = timer.started ? `${fmtClock(remaining)} · ${MODE_LABEL[timer.mode]} — Stillpoint` : 'Stillpoint';
  }, [remaining, timer.mode, timer.started]);

  // Accent colour
  useEffect(() => {
    document.documentElement.style.setProperty('--accent', settings.accent);
  }, [settings.accent]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable="true"]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (store.quiz || store.builderOpen || reflectionId || recallOpen) return;
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
  }, [timer.running, start, pause, reset, finishPhase, store.quiz, store.builderOpen, reflectionId, recallOpen]);

  const todayMinutes = sessions.filter((s) => s.day === store.today).reduce((a, s) => a + s.minutes, 0);
  const openTasks = tasks.filter((t) => !t.done && t.day === store.today);

  return (
    <div className={`app ${zen ? 'is-zen' : ''} ${panel ? 'has-panel' : ''} mode-${timer.mode}`}>
      <Background bg={settings.background} dim={settings.dim} blur={settings.blur} uploadVersion={store.uploadVersion} />

      <header className="topbar fade-zen" ref={topbarRef}>
        <div className="brand-wrap">
          <div className="brand">
            <span className="brand-mark" aria-hidden />
            <span>Stillpoint</span>
          </div>
          <ExamWidget onOpenPlan={() => setPanel('plan')} />
        </div>
        <nav className="nav" aria-label="Panels">
          {PANELS.map(({ id, label, icon: Icon }) => (
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
        >
          {!timer.running && <Agenda onOpenPlan={() => setPanel('plan')} />}
        </TimerView>
      </main>

      <footer className="footer fade-zen">
        <ParkingInput onOpen={() => setPanel('today')} />
        <GoalStat minutes={todayMinutes} goal={settings.dailyGoalMin} onClick={() => setPanel('stats')} />
      </footer>

      <MediaDock />

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
              {panel === 'stats' && <StatsPanel />}
              {panel === 'learn' && <LearnPanel />}
              {panel === 'settings' && <SettingsPanel />}
            </div>
          </>
        )}
      </aside>
      {panel && <div className="scrim" onClick={() => setPanel(null)} />}

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
