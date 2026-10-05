import { useEffect, useRef, useState } from 'react';
import type { BackgroundSetting } from '../lib/types';
import { getBlob } from '../lib/storage';

interface Props {
  bg: BackgroundSetting;
  dim: number;
  blur: number;
  uploadVersion: number;
}

export function Background({ bg, dim, blur, uploadVersion }: Props) {
  const [uploadUrl, setUploadUrl] = useState<string | null>(null);

  useEffect(() => {
    if (bg.kind !== 'upload') return;
    let url: string | null = null;
    let cancelled = false;
    getBlob('background').then((blob) => {
      if (cancelled || !blob) return;
      url = URL.createObjectURL(blob);
      setUploadUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [bg.kind, uploadVersion]);

  const imageUrl = bg.kind === 'url' ? bg.url : bg.kind === 'upload' ? uploadUrl : null;

  return (
    <div className="bg" aria-hidden>
      {imageUrl ? (
        <div className="bg-image" style={{ backgroundImage: `url("${imageUrl.replace(/"/g, '%22')}")`, filter: blur ? `blur(${blur}px)` : undefined }} />
      ) : (
        <Preset id={bg.preset} />
      )}
      <div className="bg-dim" style={{ opacity: imageUrl ? dim : dim * 0.6 }} />
      <div className="bg-grain" />
      <div className="bg-vignette" />
    </div>
  );
}

function Preset({ id }: { id: string }) {
  if (id === 'stars') return <Canvas draw={drawStars} />;
  if (id === 'rain') return <Canvas draw={drawRain} className="bg-rain" />;
  if (id === 'matte') return <div className="bg-preset bg-matte" />;
  return (
    <div className={`bg-preset bg-blobs bg-${id}`}>
      <span />
      <span />
      <span />
    </div>
  );
}

type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, t: number, state: Record<string, unknown>) => void;

function Canvas({ draw, className }: { draw: DrawFn; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;
    const state: Record<string, unknown> = {};
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      delete state.items;
    };
    resize();
    window.addEventListener('resize', resize);
    const loop = (t: number) => {
      draw(ctx, window.innerWidth, window.innerHeight, t, state);
      if (!reduce) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [draw]);
  return <canvas ref={ref} className={`bg-canvas ${className ?? ''}`} />;
}

interface Star {
  x: number;
  y: number;
  r: number;
  p: number;
  s: number;
}

const drawStars: DrawFn = (ctx, w, h, t, state) => {
  if (!state.items) {
    const n = Math.floor((w * h) / 5000);
    state.items = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.1 + 0.2, p: Math.random() * Math.PI * 2, s: 0.3 + Math.random() * 0.9 }));
  }
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#05060a');
  g.addColorStop(1, '#0d0f17');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  for (const s of state.items as Star[]) {
    const a = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t / 1000 * s.s + s.p));
    ctx.fillStyle = `rgba(235,235,245,${a * 0.8})`;
    ctx.beginPath();
    ctx.arc((s.x + t * 0.002 * s.r) % w, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
};

interface Drop {
  x: number;
  y: number;
  l: number;
  v: number;
}

const drawRain: DrawFn = (ctx, w, h, _t, state) => {
  if (!state.items) {
    const n = Math.floor(w / 6);
    state.items = Array.from({ length: n }, () => ({ x: Math.random() * w, y: Math.random() * h, l: 8 + Math.random() * 18, v: 4 + Math.random() * 6 }));
  }
  ctx.fillStyle = 'rgba(9,11,14,0.35)';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(170,190,215,0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of state.items as Drop[]) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x - d.l * 0.12, d.y + d.l);
    d.y += d.v;
    d.x -= d.v * 0.12;
    if (d.y > h) {
      d.y = -20;
      d.x = Math.random() * (w + 50);
    }
  }
  ctx.stroke();
};
