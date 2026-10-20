import { Pause, PictureInPicture2, Play, RotateCcw, SkipForward } from 'lucide-react';
import type { Mode, Task } from '../lib/types';
import { fmtClock } from '../lib/storage';
import { TIMER_PRESETS } from '../lib/content';
import { BreakCard } from './BreakCard';
import { StuckHelper } from './StuckHelper';
import { useStore } from '../store';
import { deckSections, sectionLabel } from '../lib/quiz';

interface Props {
  mode: Mode;
  remaining: number;
  total: number;
  running: boolean;
  started: boolean;
  cycle: number;
  longEvery: number;
  intention: string;
  onIntention: (v: string) => void;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onSkip: () => void;
  onMode: (m: Mode) => void;
  openTasks: Task[];
  onOpenToday: () => void;
  onOpenSound: () => void;
  /** Start the set over at block 1. */
  onResetSet: () => void;
  /** This block uses other apps on purpose (shown when away tracking is on). */
  otherApps: boolean;
  onOtherApps?: (v: boolean) => void;
  /** Open the always-on-top mini timer (only where the browser supports it). */
  onMini?: () => void;
  miniOpen?: boolean;
  /** What the break should fit: the block just finished, time seated, focus since the last long break, and this break's length. */
  breakInfo: { lastBlockMin: number; seatedMin: number; sinceLongMin: number; breakMin: number };
  onExtendBreak: (min: number) => void;
  children?: React.ReactNode;
}

const MODES: { id: Mode; label: string }[] = [
  { id: 'focus', label: 'Focus' },
  { id: 'short', label: 'Short break' },
  { id: 'long', label: 'Long break' },
];

export function TimerView(p: Props) {
  const { settings, setSettings, activeTask, setActiveTaskId, cards, setBuilderOpen } = useStore();
  const progress = p.total ? 1 - p.remaining / p.total : 0;
  const R = 46;
  const C = 2 * Math.PI * R;

  const isBreak = p.mode !== 'focus';
  const posInSet = p.cycle % p.longEvery;
  const activePreset = TIMER_PRESETS.find((t) => t.focus === settings.focusMin && t.short === settings.shortMin && t.long === settings.longMin);

  return (
    <section className="timer">
      <div className="mode-tabs fade-zen" role="tablist">
        {MODES.map((m) => (
          <button key={m.id} role="tab" aria-selected={p.mode === m.id} className={`mode-tab ${p.mode === m.id ? 'is-active' : ''}`} onClick={() => p.onMode(m.id)}>
            {m.label}
          </button>
        ))}
      </div>

      <div className={`dial ${p.running ? 'is-running' : ''}`}>
        <svg viewBox="0 0 100 100" className="dial-ring" aria-hidden>
          <circle cx="50" cy="50" r={R} className="ring-track" />
          <circle cx="50" cy="50" r={R} className="ring-progress" strokeDasharray={C} strokeDashoffset={C * (1 - progress)} transform="rotate(-90 50 50)" />
        </svg>
        <div className="dial-inner">
          <div className="dial-mode">{p.mode === 'focus' ? 'Focus' : p.mode === 'short' ? 'Short break' : 'Long break'}</div>
          <div className="dial-time" aria-live="off">
            {fmtClock(p.remaining)}
          </div>
          {posInSet > 0 && !p.running ? (
            <button
              className="cycle-dots is-resettable"
              onClick={p.onResetSet}
              title="Start over at block 1"
              aria-label={`${posInSet} of ${p.longEvery} focus blocks done before a long break. Click to start over at block 1.`}
            >
              {Array.from({ length: p.longEvery }, (_, i) => (
                <span key={i} className={i < posInSet ? 'is-done' : ''} />
              ))}
            </button>
          ) : (
            <div className="cycle-dots" aria-label={`${posInSet} of ${p.longEvery} focus blocks before a long break`}>
              {Array.from({ length: p.longEvery }, (_, i) => (
                <span key={i} className={i < posInSet ? 'is-done' : ''} />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="controls">
        <button className="ctrl ghost" onClick={p.onReset} aria-label="Reset (R)" title="Reset (R)">
          <RotateCcw size={18} strokeWidth={1.6} />
        </button>
        <button className="ctrl primary" onClick={p.running ? p.onPause : p.onStart} aria-label={p.running ? 'Pause' : 'Start'}>
          {p.running ? <Pause size={22} strokeWidth={1.8} /> : <Play size={22} strokeWidth={1.8} />}
          <span>{p.running ? 'Pause' : p.started ? 'Resume' : 'Start'}</span>
        </button>
        <button className="ctrl ghost" onClick={p.onSkip} aria-label="Skip (S)" title="Skip (S)">
          <SkipForward size={18} strokeWidth={1.6} />
        </button>
        {p.onMini && (
          <button
            className={`ctrl ghost ${p.miniOpen ? 'is-active' : ''}`}
            onClick={p.onMini}
            aria-label={p.miniOpen ? 'Close mini timer' : 'Mini timer — stays on top of other apps'}
            title={p.miniOpen ? 'Close mini timer' : 'Mini timer — stays on top of other apps'}
          >
            <PictureInPicture2 size={18} strokeWidth={1.6} />
          </button>
        )}
      </div>

      {!isBreak ? (
        <div className="focus-meta fade-zen">
          <TaskPicker activeTask={activeTask} tasks={p.openTasks} onPick={setActiveTaskId} onOpenToday={p.onOpenToday} />
          <SectionPicker />
          {p.children}
          {p.started && <StuckHelper />}
          {cards.length > 0 && !p.started && (
            <button className="link-btn quiz-link" onClick={() => setBuilderOpen(true)}>
              Test yourself — generate a quiz
            </button>
          )}
          {p.onOtherApps && (
            <label className="other-apps" title="Time on other tabs or apps during this block counts as studying, not distraction">
              <input type="checkbox" checked={p.otherApps} onChange={(e) => p.onOtherApps!(e.target.checked)} />
              <span>Studying in other apps too (Claude, Docs, textbook…)</span>
            </label>
          )}
          <input
            className="intention"
            value={p.intention}
            onChange={(e) => p.onIntention(e.target.value)}
            placeholder="This block, I will…"
            maxLength={120}
            aria-label="Session intention"
          />
          {!p.started && (
            <div className="presets">
              {TIMER_PRESETS.map((t) => (
                <button
                  key={t.id}
                  className={`chip ${activePreset?.id === t.id ? 'is-active' : ''}`}
                  title={t.hint}
                  onClick={() => setSettings((s) => ({ ...s, focusMin: t.focus, shortMin: t.short, longMin: t.long }))}
                >
                  {t.name} <span className="muted">{t.focus}/{t.short}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <BreakCard
          key={`${p.mode}-${p.cycle}`}
          long={p.mode === 'long'}
          cycle={p.cycle}
          longEvery={p.longEvery}
          intention={p.intention}
          onOpenSound={p.onOpenSound}
          info={p.breakInfo}
          onExtend={p.onExtendBreak}
        />
      )}
    </section>
  );
}

function TaskPicker({ activeTask, tasks, onPick, onOpenToday }: { activeTask: Task | null; tasks: Task[]; onPick: (id: string | null) => void; onOpenToday: () => void }) {
  if (!tasks.length && !activeTask) {
    return (
      <button className="task-pill empty" onClick={onOpenToday}>
        + Plan what you’ll work on today
      </button>
    );
  }
  return (
    <label className="task-pill">
      <span className="muted">Working on</span>
      <select value={activeTask?.id ?? ''} onChange={(e) => onPick(e.target.value || null)}>
        <option value="">— nothing specific —</option>
        {activeTask && !tasks.includes(activeTask) && <option value={activeTask.id}>{activeTask.title}</option>}
        {tasks.map((t) => (
          <option key={t.id} value={t.id}>
            {t.subject ? `${t.subject} · ` : ''}
            {t.title} ({t.pomos}/{t.estimate})
          </option>
        ))}
      </select>
    </label>
  );
}

/** "Studying: Biology · Session 3" — scopes checkpoint quizzes to this section (plus earlier studied ones). */
function SectionPicker() {
  const { decks, studyingNow, setStudyingNow, activeTask } = useStore();
  if (!decks.length) return null;
  // Put the active task's notes first.
  const ordered = [...decks].sort((a, b) => Number(b.id === activeTask?.deckId) - Number(a.id === activeTask?.deckId));
  const value = studyingNow ? `${studyingNow.deckId}\u0000${studyingNow.section}` : '';
  return (
    <label className={`task-pill section-pill ${studyingNow ? '' : 'is-unset'}`}>
      <span className="muted">Section</span>
      <select
        value={value}
        onChange={(e) => {
          if (!e.target.value) return setStudyingNow(null);
          const [deckId, section] = e.target.value.split('\u0000');
          setStudyingNow({ deckId, section });
        }}
        aria-label="Section you're studying"
      >
        <option value="">— pick what you’re studying —</option>
        {ordered.map((d) => (
          <optgroup key={d.id} label={d.title}>
            {deckSections(d).map((sec) => (
              <option key={sec || '__none'} value={`${d.id}\u0000${sec}`}>
                {sectionLabel(sec, d)}
                {d.studied?.includes(sec) ? ' ✓' : ''}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
