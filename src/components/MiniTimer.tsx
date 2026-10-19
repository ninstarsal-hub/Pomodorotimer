import { useEffect } from 'react';
import { Pause, Play, SkipForward } from 'lucide-react';
import type { Mode } from '../lib/types';
import { fmtClock } from '../lib/storage';
import { blockNames, useCircles } from '../lib/circles';
import { useSync } from '../lib/sync';

interface DocPip {
  requestWindow(o: { width: number; height: number }): Promise<Window>;
}
const docPip = (globalThis as { documentPictureInPicture?: DocPip }).documentPictureInPicture;

/** Chrome and Edge on desktop. Elsewhere the button stays hidden. */
export const miniTimerSupported = !!docPip;

/** Opens the always-on-top window and gives it the app's styles and theme. */
export async function openMiniWindow() {
  const w = await docPip!.requestWindow({ width: 260, height: 170 });
  for (const sheet of [...document.styleSheets]) {
    try {
      const style = w.document.createElement('style');
      style.textContent = [...sheet.cssRules].map((r) => r.cssText).join('\n');
      w.document.head.appendChild(style);
    } catch {
      // Cross-origin sheets (fonts) can't be read; link them instead.
      if (sheet.href) {
        const link = w.document.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        w.document.head.appendChild(link);
      }
    }
  }
  for (const a of [...document.documentElement.attributes]) w.document.documentElement.setAttribute(a.name, a.value);
  w.document.documentElement.style.removeProperty('zoom');
  w.document.title = 'Stillpoint timer';
  w.document.body.className = 'mini-body';
  return w;
}

const LABEL: Record<Mode, string> = { focus: 'Focus', short: 'Short break', long: 'Long break' };

interface Props {
  win: Window;
  mode: Mode;
  remaining: number;
  total: number;
  running: boolean;
  started: boolean;
  endAt: number | null;
  group?: { blockId: string; circleId: string; endsAt: number };
  onStart: () => void;
  onPause: () => void;
  onSkip: () => void;
  /** The main tab is throttled while it's in the background; the mini window keeps the clock moving. */
  onTick: (now: number) => void;
}

export function MiniTimer(p: Props) {
  const data = useCircles();
  const me = useSync().user?.id ?? '';
  const block = p.group ? data.blocks.find((b) => b.id === p.group!.blockId) : undefined;
  const others = block ? blockNames(block, data.members, me) : [];

  useEffect(() => {
    if (!p.running) return;
    const id = p.win.setInterval(() => p.onTick(Date.now()), 250);
    return () => p.win.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.running, p.win]);

  useEffect(() => {
    p.win.document.title = p.started ? `${fmtClock(p.remaining)} · ${LABEL[p.mode]}` : 'Stillpoint timer';
  }, [p.win, p.remaining, p.mode, p.started]);

  const progress = p.total ? Math.min(1, Math.max(0, 1 - p.remaining / p.total)) : 0;

  return (
    <div className={`mini mode-${p.mode}`}>
      <div className="mini-mode">
        {LABEL[p.mode]}
        {p.group && <span className="mini-group"> · together{others.length ? ` with ${others.slice(0, 2).join(' & ')}${others.length > 2 ? ` +${others.length - 2}` : ''}` : ''}</span>}
      </div>
      <div className="mini-time">{fmtClock(p.remaining)}</div>
      <div className="mini-bar">
        <span style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="mini-controls">
        <button className="ctrl primary" onClick={p.running ? p.onPause : p.onStart} aria-label={p.running ? 'Pause' : 'Start'}>
          {p.running ? <Pause size={16} strokeWidth={1.8} /> : <Play size={16} strokeWidth={1.8} />}
          <span>{p.running ? 'Pause' : p.started ? 'Resume' : 'Start'}</span>
        </button>
        <button className="ctrl ghost" onClick={p.onSkip} aria-label="Skip" title="Skip">
          <SkipForward size={15} strokeWidth={1.6} />
        </button>
      </div>
    </div>
  );
}
