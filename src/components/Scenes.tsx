import { useMemo, type ReactElement } from 'react';

/*
 * Illustrated background scenes, drawn as layered flat SVG (no image files: instant, offline, crisp at any size).
 * Each has one slow ambient motion (clouds, steam, twinkle, shimmer) that can be switched off in Settings.
 */

export const SCENES = [
  { id: 'scene-mountains', name: 'Mountains' },
  { id: 'scene-cafe', name: 'Café' },
  { id: 'scene-lake', name: 'Lakeside' },
  { id: 'scene-dunes', name: 'Dunes' },
  { id: 'scene-city', name: 'City night' },
];

export const isScene = (id: string) => id.startsWith('scene-');

/** Small deterministic random generator so scenes look the same on every load. */
function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A mountain ridge across the full width: jagged peaks around `base`, filled to the bottom. */
function ridge(seed: number, base: number, amp: number, step: number, sharp = 0.6) {
  const r = rng(seed);
  let d = `M0 900 L0 ${base}`;
  for (let x = 0; x <= 1600 + step; x += step) {
    const peak = base - amp * (0.3 + 0.7 * r());
    const mid = base - amp * (0.1 + sharp * 0.4 * r());
    d += ` L${x - step / 2} ${peak.toFixed(0)} L${x} ${mid.toFixed(0)}`;
  }
  return d + ' L1600 900 Z';
}

/** A soft rolling hill line (for dunes), via smooth curves. */
function hills(seed: number, base: number, amp: number, n: number) {
  const r = rng(seed);
  const w = 1600 / n;
  let d = `M0 900 L0 ${base}`;
  for (let i = 0; i < n; i++) {
    const x = i * w;
    d += ` C${x + w * 0.3} ${base - amp * r()}, ${x + w * 0.7} ${base - amp * r()}, ${x + w} ${base - amp * 0.3 * r()}`;
  }
  return d + ' L1600 900 Z';
}

/** Row of pine-tree silhouettes standing on a baseline. */
function pines(seed: number, y: number, from: number, to: number, size: number, gap: number) {
  const r = rng(seed);
  const out: string[] = [];
  for (let x = from; x < to; x += gap * (0.6 + r() * 0.8)) {
    const h = size * (0.6 + r() * 0.7);
    const w = h * 0.32;
    const by = y + r() * 14;
    out.push(`M${x} ${by - h} L${x - w} ${by} L${x + w} ${by} Z M${x} ${by - h * 0.75} L${x - w * 1.25} ${by - h * 0.08} L${x + w * 1.25} ${by - h * 0.08} Z`);
  }
  return out.join(' ');
}

function Stars({ seed, n, maxY, twinkle }: { seed: number; n: number; maxY: number; twinkle?: boolean }) {
  const stars = useMemo(() => {
    const r = rng(seed);
    return Array.from({ length: n }, () => ({ x: r() * 1600, y: r() * maxY, s: 0.6 + r() * 1.4, d: r() * 6 }));
  }, [seed, n, maxY]);
  return (
    <g fill="#e8e6f2">
      {stars.map((s, i) => (
        <circle key={i} cx={s.x} cy={s.y} r={s.s} opacity={0.35 + (s.s - 0.6) * 0.35} className={twinkle && i % 3 === 0 ? 'sc-twinkle' : undefined} style={twinkle ? { animationDelay: `${-s.d}s` } : undefined} />
      ))}
    </g>
  );
}

function Cloud({ x, y, s, o = 0.07 }: { x: number; y: number; s: number; o?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`} fill="#fff" opacity={o}>
      <ellipse cx="0" cy="0" rx="120" ry="26" />
      <ellipse cx="-40" cy="-16" rx="60" ry="26" />
      <ellipse cx="35" cy="-22" rx="70" ry="32" />
    </g>
  );
}

function Mountains() {
  return (
    <>
      <defs>
        <linearGradient id="mt-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#121829" />
          <stop offset="0.45" stopColor="#2d2a46" />
          <stop offset="0.75" stopColor="#6b4a5a" />
          <stop offset="1" stopColor="#b37a63" />
        </linearGradient>
        <radialGradient id="mt-sun">
          <stop offset="0" stopColor="#f6d2a2" stopOpacity="0.9" />
          <stop offset="0.25" stopColor="#f0b98a" stopOpacity="0.45" />
          <stop offset="1" stopColor="#f0b98a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#mt-sky)" />
      <Stars seed={3} n={40} maxY={260} />
      <circle cx="1060" cy="560" r="320" fill="url(#mt-sun)" />
      <circle cx="1060" cy="560" r="46" fill="#f8dcb2" opacity="0.85" />
      <g className="sc-drift">
        <Cloud x={300} y={250} s={1.2} />
        <Cloud x={900} y={180} s={0.9} o={0.05} />
        <Cloud x={1400} y={300} s={1.1} />
        <Cloud x={1900} y={220} s={1} o={0.05} />
      </g>
      <path d={ridge(11, 560, 200, 180)} fill="#4d3c57" />
      <path d={ridge(12, 620, 170, 150)} fill="#3a2d47" />
      <path d={ridge(13, 690, 150, 130)} fill="#2a2136" />
      <path d={ridge(14, 770, 110, 110, 0.3)} fill="#1b1624" />
      <path d={pines(15, 800, -20, 1640, 90, 34)} fill="#120f19" />
      <rect y="840" width="1600" height="60" fill="#120f19" />
    </>
  );
}

function Cafe() {
  const bokeh = useMemo(() => {
    const r = rng(21);
    const warm = ['#f2b872', '#e98f5f', '#f6d58f', '#9ec3e6', '#e7a5b3'];
    return Array.from({ length: 34 }, () => ({ x: 330 + r() * 940, y: 170 + r() * 420, r: 8 + r() * 26, c: warm[Math.floor(r() * warm.length)], o: 0.15 + r() * 0.3 }));
  }, []);
  const drops = useMemo(() => {
    const r = rng(22);
    return Array.from({ length: 60 }, () => ({ x: 320 + r() * 960, y: 120 + r() * 520, l: 14 + r() * 24 }));
  }, []);
  return (
    <>
      <defs>
        <linearGradient id="cf-wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1d1512" />
          <stop offset="1" stopColor="#2a1d16" />
        </linearGradient>
        <linearGradient id="cf-night" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0c1524" />
          <stop offset="1" stopColor="#1f2a3c" />
        </linearGradient>
        <radialGradient id="cf-lamp">
          <stop offset="0" stopColor="#ffcf8a" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffcf8a" stopOpacity="0" />
        </radialGradient>
        <filter id="cf-soft" x="-50%" y="-20%" width="200%" height="140%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <clipPath id="cf-glass">
          <rect x="310" y="110" width="980" height="540" />
        </clipPath>
        {bokeh.map((b, i) => (
          <radialGradient key={i} id={`cf-b${i}`}>
            <stop offset="0" stopColor={b.c} stopOpacity={b.o} />
            <stop offset="0.7" stopColor={b.c} stopOpacity={b.o * 0.6} />
            <stop offset="1" stopColor={b.c} stopOpacity="0" />
          </radialGradient>
        ))}
      </defs>
      <rect width="1600" height="900" fill="url(#cf-wall)" />
      {/* window onto a rainy street at night */}
      <rect x="310" y="110" width="980" height="540" fill="url(#cf-night)" />
      <g clipPath="url(#cf-glass)">
        <path d="M310 520 L420 520 L420 430 L520 430 L520 480 L640 480 L640 400 L760 400 L760 500 L900 500 L900 440 L1010 440 L1010 470 L1130 470 L1130 410 L1290 410 L1290 650 L310 650 Z" fill="#141c2a" />
        {bokeh.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill={`url(#cf-b${i})`} />
        ))}
        <g className="sc-rain" stroke="#b9cbe0" strokeOpacity="0.22" strokeWidth="1.2">
          {drops.map((d, i) => (
            <line key={i} x1={d.x} y1={d.y} x2={d.x - 3} y2={d.y + d.l} />
          ))}
          {drops.map((d, i) => (
            <line key={`b${i}`} x1={d.x} y1={d.y - 540} x2={d.x - 3} y2={d.y - 540 + d.l} />
          ))}
        </g>
      </g>
      <g fill="none" stroke="#0f0a08" strokeWidth="18">
        <rect x="310" y="110" width="980" height="540" />
        <line x1="800" y1="110" x2="800" y2="650" />
        <line x1="310" y1="380" x2="1290" y2="380" />
      </g>
      {/* hanging lamp */}
      <line x1="1380" y1="0" x2="1380" y2="150" stroke="#0e0907" strokeWidth="3" />
      <circle cx="1380" cy="190" r="240" fill="url(#cf-lamp)" />
      <path d="M1330 190 Q1380 120 1430 190 Z" fill="#2e211a" />
      <ellipse cx="1380" cy="192" rx="18" ry="6" fill="#ffd79a" />
      {/* plant */}
      <g fill="#24331f">
        <path d="M170 690 C120 600 110 540 150 470 C170 560 180 610 185 690 Z" />
        <path d="M190 690 C210 590 250 530 300 500 C270 580 240 630 205 690 Z" />
        <path d="M180 690 C160 620 90 590 50 600 C100 630 140 660 170 690 Z" fill="#1c2918" />
      </g>
      <path d="M140 690 L240 690 L228 760 L152 760 Z" fill="#3b2a21" />
      {/* counter */}
      <rect y="700" width="1600" height="200" fill="#2c1e17" />
      <rect y="700" width="1600" height="12" fill="#3d2a20" />
      {/* cup + steam */}
      <ellipse cx="1050" cy="742" rx="90" ry="14" fill="#1a110d" />
      <path d="M990 660 L1110 660 L1100 735 Q1050 750 1000 735 Z" fill="#cdbfb0" />
      <path d="M1108 676 Q1145 680 1140 702 Q1135 722 1102 718" fill="none" stroke="#cdbfb0" strokeWidth="9" />
      <ellipse cx="1050" cy="660" rx="60" ry="9" fill="#4a2e1f" />
      <g className="sc-steam" fill="none" stroke="#f3ece4" strokeWidth="7" strokeLinecap="round" filter="url(#cf-soft)">
        <path d="M1030 640 C1015 610 1045 590 1030 560 C1018 535 1040 520 1032 500" />
        <path d="M1062 640 C1078 612 1050 592 1066 562 C1078 540 1058 522 1066 504" />
      </g>
      {/* book */}
      <rect x="560" y="676" width="230" height="26" rx="3" fill="#5a3b3b" />
      <rect x="570" y="654" width="210" height="24" rx="3" fill="#3f4a5c" />
    </>
  );
}

function Lake() {
  // Broken moonlight on the water: short dashes that widen and scatter toward the shore.
  const reflection = useMemo(() => {
    const r = rng(36);
    return Array.from({ length: 22 }, (_, i) => {
      const t = i / 21;
      const spread = 30 + t * 110;
      const w = 16 + r() * (50 + t * 40);
      return { x: 1120 + (r() - 0.5) * spread * 2 - w / 2, y: 662 + t * 220 + r() * 6, w, o: 0.45 - t * 0.3 + r() * 0.1, d: r() * 4 };
    });
  }, []);
  return (
    <>
      <defs>
        <linearGradient id="lk-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#060a14" />
          <stop offset="1" stopColor="#1a2440" />
        </linearGradient>
        <linearGradient id="lk-water" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#141c32" />
          <stop offset="1" stopColor="#05070d" />
        </linearGradient>
        <radialGradient id="lk-moon">
          <stop offset="0" stopColor="#eae5d3" stopOpacity="0.5" />
          <stop offset="1" stopColor="#eae5d3" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#lk-sky)" />
      <Stars seed={31} n={110} maxY={560} twinkle />
      <circle cx="1120" cy="210" r="170" fill="url(#lk-moon)" />
      <circle cx="1120" cy="210" r="40" fill="#ece7d6" />
      <path d={ridge(32, 560, 180, 200)} fill="#1a2238" />
      <path d={ridge(33, 610, 110, 140, 0.4)} fill="#121a2c" />
      <rect y="640" width="1600" height="260" fill="url(#lk-water)" />
      {/* moon reflection */}
      <g fill="#ece7d6">
        {reflection.map((l, i) => (
          <rect key={i} className="sc-shimmer" style={{ animationDelay: `${-l.d}s` }} x={l.x} y={l.y} width={l.w} height="2.5" rx="1.25" opacity={l.o} />
        ))}
      </g>
      <path d={pines(34, 660, -30, 420, 170, 40)} fill="#070a12" />
      <path d={pines(35, 660, 1350, 1650, 150, 40)} fill="#070a12" />
      <rect y="660" width="430" height="20" fill="#070a12" />
      <rect x="1340" y="660" width="260" height="20" fill="#070a12" />
    </>
  );
}

function Dunes() {
  return (
    <>
      <defs>
        <linearGradient id="dn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#1b1530" />
          <stop offset="0.55" stopColor="#53304a" />
          <stop offset="1" stopColor="#b8684f" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#dn-sky)" />
      <Stars seed={41} n={30} maxY={240} />
      <circle cx="420" cy="520" r="70" fill="#f2b483" opacity="0.8" />
      <g className="sc-drift slow">
        <Cloud x={600} y={320} s={1.4} o={0.06} />
        <Cloud x={1300} y={260} s={1} o={0.05} />
        <Cloud x={2000} y={330} s={1.2} o={0.06} />
      </g>
      <path d={hills(42, 600, 120, 3)} fill="#7a4537" />
      <path d={hills(43, 680, 140, 4)} fill="#5c3029" />
      <path d={hills(44, 770, 120, 3)} fill="#3e211f" />
      <path d={hills(45, 850, 80, 2)} fill="#271515" />
    </>
  );
}

function City() {
  const layers = useMemo(() => {
    const out: { x: number; w: number; h: number; layer: number; windows: { x: number; y: number; lit: boolean; tw: boolean }[] }[] = [];
    [0, 1, 2].forEach((layer) => {
      const r = rng(51 + layer);
      let x = -20;
      while (x < 1620) {
        const w = 60 + r() * (layer === 2 ? 140 : 100);
        const h = (layer === 0 ? 300 : layer === 1 ? 240 : 170) + r() * (layer === 0 ? 260 : 200);
        const windows: { x: number; y: number; lit: boolean; tw: boolean }[] = [];
        if (layer > 0)
          for (let wy = 900 - h + 20; wy < 880; wy += 22)
            for (let wx = x + 10; wx < x + w - 14; wx += 18) if (r() < 0.55) windows.push({ x: wx, y: wy, lit: r() < 0.4, tw: r() < 0.05 });
        out.push({ x, w, h, layer, windows });
        x += w + r() * 12;
      }
    });
    return out;
  }, []);
  const fills = ['#141a30', '#0e1324', '#090c17'];
  return (
    <>
      <defs>
        <linearGradient id="ct-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#070914" />
          <stop offset="0.7" stopColor="#1c1e3c" />
          <stop offset="1" stopColor="#3a2a4a" />
        </linearGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#ct-sky)" />
      <Stars seed={50} n={50} maxY={380} twinkle />
      <circle cx="260" cy="160" r="34" fill="#e8e3d2" opacity="0.9" />
      {layers.map((b, i) => (
        <g key={i}>
          <rect x={b.x} y={900 - b.h} width={b.w} height={b.h} fill={fills[b.layer]} />
          {b.windows.map((w, j) => (
            <rect
              key={j}
              x={w.x}
              y={w.y}
              width="8"
              height="10"
              fill={w.lit ? '#f1c27d' : '#1d2440'}
              opacity={w.lit ? (b.layer === 1 ? 0.45 : 0.75) : 0.6}
              className={w.tw ? 'sc-window' : undefined}
              style={w.tw ? { animationDelay: `${-(j % 13) * 3}s` } : undefined}
            />
          ))}
        </g>
      ))}
    </>
  );
}

const DRAW: Record<string, () => ReactElement> = {
  'scene-mountains': Mountains,
  'scene-cafe': Cafe,
  'scene-lake': Lake,
  'scene-dunes': Dunes,
  'scene-city': City,
};

export function Scene({ id, animate = true, blur = 0 }: { id: string; animate?: boolean; blur?: number }) {
  const Draw = DRAW[id] ?? Mountains;
  return (
    <svg
      className={`bg-scene ${animate ? '' : 'is-still'}`}
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMax slice"
      style={blur ? { filter: `blur(${blur}px)` } : undefined}
      aria-hidden
    >
      <Draw />
    </svg>
  );
}
