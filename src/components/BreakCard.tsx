import { Fragment, useEffect, useRef, useState } from 'react';
import { Download, Eraser, Music, PenLine, RefreshCw, Square, Wind } from 'lucide-react';
import { BREAK_PLAN, ideaByTitle, pickBreakIdea, planStep, type BreakIdea, type BreakTool } from '../lib/content';
import { BEAT_STYLES, beats, useBeatStyle } from '../lib/beats';
import { useStore } from '../store';

interface Props {
  long: boolean;
  /** Focus blocks finished so far — decides which recommended break this is. */
  cycle: number;
  longEvery: number;
  intention: string;
  onOpenSound: () => void;
}

/** Render with a `key` per break so each break gets a fresh suggestion. */
export function BreakCard({ long, cycle, longEvery, intention, onOpenSound }: Props) {
  const { settings } = useStore();
  const plan = settings.breakPlan ? planStep(long, cycle, longEvery) : null;
  const recommended = plan ? ideaByTitle(plan.step.idea) : null;
  const [idea, setIdea] = useState<BreakIdea>(() => recommended ?? pickBreakIdea(long));
  const [tool, setTool] = useState<BreakTool | null>(idea.tool ?? null);
  const onPlan = !!recommended && idea === recommended;

  const backToPlan = () => {
    if (!recommended) return;
    setIdea(recommended);
    setTool((t) => (t === 'doodle' ? t : (recommended.tool ?? null)));
  };

  const another = () => {
    const next = pickBreakIdea(long, idea);
    setIdea(next);
    // Keep a doodle that's in progress open; otherwise follow the new idea.
    setTool((t) => (t === 'doodle' ? t : (next.tool ?? null)));
  };

  const toggleTool = (t: BreakTool) => setTool((cur) => (cur === t ? null : t));

  return (
    <div className="break-card fade-zen">
      <div className="row between break-head">
        <div className="eyebrow">{plan ? (onPlan ? `${long ? 'Long break' : `Break ${plan.index + 1}`} · recommended` : 'Something different') : `${long ? 'Long break' : 'Break'} suggestion`}</div>
        <button className="link-btn small" onClick={another} title="Show a different idea">
          <RefreshCw size={12} /> Another idea
        </button>
      </div>
      <h3>{idea.title}</h3>
      <p>{idea.body}</p>
      {onPlan && plan && <p className="break-reason">{plan.step.reason}</p>}
      {idea.why && <p className="break-why">{idea.why}</p>}
      {plan && <PlanStrip long={long} index={plan.index} longEvery={longEvery} offPlan={!onPlan} onBack={backToPlan} />}

      <div className="break-tools" role="group" aria-label="Break tools">
        <button className={`chip ${tool === 'doodle' ? 'is-active' : ''}`} onClick={() => toggleTool('doodle')}>
          <PenLine size={13} /> Doodle pad
        </button>
        <button className={`chip ${tool === 'breathe' ? 'is-active' : ''}`} onClick={() => toggleTool('breathe')}>
          <Wind size={13} /> Breathe
        </button>
        <button className={`chip ${tool === 'music' ? 'is-active' : ''}`} onClick={() => toggleTool('music')}>
          <Music size={13} /> Break beats
        </button>
      </div>

      {tool === 'doodle' && <DoodlePad />}
      {tool === 'breathe' && <Breather />}
      {tool === 'music' && <BeatPicker onOpenSound={onOpenSound} />}

      {intention && (
        <p className="muted small">
          Last block’s intention: <em>“{intention}”</em> — did you get there?
        </p>
      )}
    </div>
  );
}

/** "Doodle → Walk → Rest → Recharge" with this break highlighted. */
function PlanStrip({ long, index, longEvery, offPlan, onBack }: { long: boolean; index: number; longEvery: number; offPlan: boolean; onBack: () => void }) {
  const shorts = Array.from({ length: Math.max(longEvery - 1, 0) }, (_, i) => BREAK_PLAN.short[i % BREAK_PLAN.short.length]);
  const steps = [...shorts.map((s, i) => ({ ...s, current: !long && i === index })), { ...BREAK_PLAN.long, current: long }];
  return (
    <div className="plan-strip" aria-label="Recommended break plan">
      {steps.map((s, i) => (
        <Fragment key={i}>
          {i > 0 && <span className="plan-arrow">→</span>}
          <span className={`plan-step ${s.current ? 'is-current' : ''} ${i < (long ? steps.length - 1 : index) ? 'is-done' : ''}`}>{s.label}</span>
        </Fragment>
      ))}
      {offPlan && (
        <button className="link-btn small" onClick={onBack}>
          Back to recommended
        </button>
      )}
    </div>
  );
}

/** Quick play/stop for the generative break beats. */
export function BeatPicker({ onOpenSound }: { onOpenSound?: () => void }) {
  const playing = useBeatStyle();
  const { settings } = useStore();
  return (
    <div className="beat-picker">
      <div className="beat-row">
        {BEAT_STYLES.map((b) => (
          <button
            key={b.id}
            className={`chip ${playing === b.id ? 'is-active' : ''}`}
            onClick={() => (playing === b.id ? beats.stop() : void beats.play(b.id, settings.beatVolume))}
            title={b.blurb}
            aria-pressed={playing === b.id}
          >
            {playing === b.id ? <span className="eq" aria-hidden><i /><i /><i /></span> : null}
            {b.name}
          </button>
        ))}
        {playing && (
          <button className="chip" onClick={() => beats.stop()} aria-label="Stop break beats">
            <Square size={11} /> Stop
          </button>
        )}
      </div>
      {onOpenSound && (
        <button className="link-btn small" onClick={onOpenSound}>
          More break music & your own playlists →
        </button>
      )}
    </div>
  );
}

function Breather() {
  const phases = ['Inhale', 'Hold', 'Exhale', 'Hold'];
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setI((x) => (x + 1) % 4), 4000);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="breather">
      <div className={`breather-orb phase-${i}`} />
      <span>{phases[i]}</span>
    </div>
  );
}

const INKS = ['accent', '#e8e6e1', '#a9c4a4', '#a8bfd9', '#e0aeb0'];

/** A small sketchpad. Kept for the whole session, so you can come back to a doodle next break. */
let savedDoodle: string | null = null;

function DoodlePad() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const [ink, setInk] = useState(INKS[0]);
  const [size, setSize] = useState(3);
  const [empty, setEmpty] = useState(!savedDoodle);
  const hasInk = useRef(!!savedDoodle);

  useEffect(() => {
    const c = canvas.current!;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = Math.round(rect.width * dpr);
    c.height = Math.round(rect.height * dpr);
    const ctx = c.getContext('2d')!;
    ctx.scale(dpr, dpr);
    c.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (savedDoodle) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = savedDoodle;
    }
    return () => {
      savedDoodle = hasInk.current ? c.toDataURL('image/png') : null;
    };
  }, []);

  const color = () => (ink === 'accent' ? getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#e7cba9' : ink);

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const down = (e: React.PointerEvent) => {
    canvas.current!.setPointerCapture(e.pointerId);
    drawing.current = point(e);
    move(e);
  };

  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const ctx = canvas.current!.getContext('2d')!;
    const p = point(e);
    ctx.strokeStyle = color();
    ctx.lineWidth = size * (e.pointerType === 'pen' && e.pressure ? 0.5 + e.pressure : 1);
    ctx.beginPath();
    ctx.moveTo(drawing.current.x, drawing.current.y);
    ctx.lineTo(p.x + 0.01, p.y);
    ctx.stroke();
    drawing.current = p;
    if (!hasInk.current) {
      hasInk.current = true;
      setEmpty(false);
    }
  };

  const up = () => {
    drawing.current = null;
  };

  const clear = () => {
    const c = canvas.current!;
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height);
    hasInk.current = false;
    savedDoodle = null;
    setEmpty(true);
  };

  const save = () => {
    // Export on a dark background so light ink stays visible.
    const c = canvas.current!;
    const out = document.createElement('canvas');
    out.width = c.width;
    out.height = c.height;
    const ctx = out.getContext('2d')!;
    ctx.fillStyle = '#121212';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(c, 0, 0);
    const a = document.createElement('a');
    a.href = out.toDataURL('image/png');
    a.download = `stillpoint-doodle-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  };

  return (
    <div className="doodle">
      <div className="doodle-canvas-wrap">
        <canvas
          ref={canvas}
          className="doodle-canvas"
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
          aria-label="Doodle pad — draw with your mouse, trackpad or pen"
          role="img"
        />
        {empty && <span className="doodle-hint">Draw anything…</span>}
      </div>
      <div className="doodle-bar">
        <div className="row inks">
          {INKS.map((c) => (
            <button
              key={c}
              className={`ink ${ink === c ? 'is-active' : ''}`}
              style={{ background: c === 'accent' ? 'var(--accent)' : c }}
              onClick={() => setInk(c)}
              aria-label={`Ink colour ${c === 'accent' ? 'accent' : c}`}
            />
          ))}
          <button className={`ink-size ${size === 3 ? 'is-active' : ''}`} onClick={() => setSize(3)} aria-label="Thin pen">
            <i style={{ width: 4, height: 4 }} />
          </button>
          <button className={`ink-size ${size === 8 ? 'is-active' : ''}`} onClick={() => setSize(8)} aria-label="Thick pen">
            <i style={{ width: 9, height: 9 }} />
          </button>
        </div>
        <div className="row">
          <button className="icon-btn small" onClick={clear} aria-label="Clear doodle" title="Clear">
            <Eraser size={14} />
          </button>
          <button className="icon-btn small" onClick={save} disabled={empty} aria-label="Save doodle as image" title="Save as PNG">
            <Download size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
