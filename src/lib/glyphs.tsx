import type { ReactNode } from 'react';

/*
 * Stillpoint's own badge characters, drawn in the same line style as the rest of the app's icons
 * (24×24, round caps). Used where the icon library has nothing that fits.
 */

export type Glyph = ((p: { size?: number; strokeWidth?: number }) => ReactNode) & { displayName?: string };

const dot = (cx: number, cy: number, r = 0.95) => <circle cx={cx} cy={cy} r={r} fill="currentColor" stroke="none" />;

function make(name: string, body: ReactNode): Glyph {
  const G: Glyph = ({ size = 24, strokeWidth = 1.8 }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {body}
    </svg>
  );
  G.displayName = name;
  return G;
}

export const Dragon = make(
  'Dragon',
  <>
    <path d="M5.5 20C4 18.5 3 16.5 3 14.5 3 9.5 6.5 6 11 6c3 0 5.2 1.2 6.6 3.1l3.3 1.3c.9.4.9 1.7 0 2.1l-3.6 1.4C16.4 17 13.6 19 10 19" />
    <path d="M9.2 6.4 7 2.8l4.1 3.3" />
    <path d="M12.6 6.1 12.3 3l2.4 3.6" />
    <path d="M17.5 12.4h-3.2" />
    <path d="M4.2 10.2 1.8 9.4l1.5 2.7" />
    <path d="M3.2 14.4 1 14.6l2.3 1.6" />
    <path d="M13 9.6l2 .7" />
    {dot(19.6, 11.1, 0.7)}
  </>,
);

export const Owl = make(
  'Owl',
  <>
    <path d="M6 20.5V11a6 6 0 0 1 12 0v9.5" />
    <path d="M6 11 5.2 4.5 9.2 7.6" />
    <path d="M18 11l.8-6.5-4 3.1" />
    <circle cx="9.4" cy="11.2" r="2.1" />
    <circle cx="14.6" cy="11.2" r="2.1" />
    {dot(9.4, 11.2, 0.7)}
    {dot(14.6, 11.2, 0.7)}
    <path d="m11.1 14.3.9 1.4.9-1.4" />
    <path d="M9 20.5h6" />
  </>,
);

export const Fox = make(
  'Fox',
  <>
    <path d="M4 3.5 9 8h6l5-4.5-.7 8.6L12 20.5l-7.3-8.4Z" />
    <path d="M4.8 12.2 9 14.2" />
    <path d="M19.2 12.2 15 14.2" />
    {dot(9.4, 11.6)}
    {dot(14.6, 11.6)}
    <path d="m11 16.4 1 1 1-1" />
  </>,
);

export const Frog = make(
  'Frog',
  <>
    <circle cx="7.8" cy="7.2" r="2.6" />
    <circle cx="16.2" cy="7.2" r="2.6" />
    {dot(7.8, 7.2, 0.8)}
    {dot(16.2, 7.2, 0.8)}
    <path d="M5.4 8.6C3.9 9.7 3 11.6 3 13.8 3 17.6 7 20 12 20s9-2.4 9-6.2c0-2.2-.9-4.1-2.4-5.2" />
    <path d="M10.4 9.6h3.2" />
    <path d="M8 14.6c2.4 1.9 5.6 1.9 8 0" />
  </>,
);

export const Penguin = make(
  'Penguin',
  <>
    <path d="M12 3C8.3 3 6.5 6.6 6.5 11.5S8.3 21 12 21s5.5-4.6 5.5-9.5S15.7 3 12 3Z" />
    <path d="M12 9c-1.9 0-2.8 2.4-2.8 5s.9 5 2.8 5 2.8-2.4 2.8-5-.9-5-2.8-5Z" />
    {dot(10.4, 6.6, 0.8)}
    {dot(13.6, 6.6, 0.8)}
    <path d="m11.2 8 .8 1 .8-1" />
    <path d="m6.6 12-2.3 3.4" />
    <path d="m17.4 12 2.3 3.4" />
    <path d="M9.5 21h1.5M13 21h1.5" />
  </>,
);

export const Duck = make(
  'Duck',
  <>
    <path d="M8.3 9.9A3.6 3.6 0 1 1 13.4 10c2.2.4 5.3-.4 7.6-1.8.2 6.2-3.4 10.8-9 10.8-4.6 0-7.8-2.6-7.8-6 0-1.9 1.7-3.2 4.1-3.1Z" />
    <path d="M7.6 6.6H4.8c-.8 0-.9 1.6 0 1.7l3 .2" />
    {dot(10.8, 6.2, 0.8)}
    <path d="M9.5 14.2c1.9 1.8 5.1 1.8 7.4-.6" />
  </>,
);

export const Bee = make(
  'Bee',
  <>
    <ellipse cx="12" cy="14.4" rx="4.8" ry="5.8" />
    <path d="M7.5 12.6h9M7.5 16.2h9" />
    <path d="M9.6 9.4C8.2 6 4.5 5.4 4.2 7.8c-.3 2 2.9 2.9 5 2.4" />
    <path d="M14.4 9.4c1.4-3.4 5.1-4 5.4-1.6.3 2-2.9 2.9-5 2.4" />
    <path d="M10.6 8.8 9.4 5.2M13.4 8.8l1.2-3.6" />
    <path d="M12 20.2v1.5" />
  </>,
);

export const Octopus = make(
  'Octopus',
  <>
    <path d="M6 12.2C6 7.4 8.6 4 12 4s6 3.4 6 8.2" />
    <path d="M6 12.2c0 2.8-1.5 4.3-3 5.6" />
    <path d="M9 13.2c0 3-1 5.1-2 6.6" />
    <path d="M12 13.4V20.5" />
    <path d="M15 13.2c0 3 1 5.1 2 6.6" />
    <path d="M18 12.2c0 2.8 1.5 4.3 3 5.6" />
    <path d="M6 12.2c3.8 1.6 8.2 1.6 12 0" />
    {dot(10, 9.2)}
    {dot(14, 9.2)}
  </>,
);

export const Whale = make(
  'Whale',
  <>
    <path d="M18.6 12.4C18.2 9.4 15.3 7.2 11 7.2 6.4 7.2 3 9.8 3 13.4c0 2.6 1.9 4.6 4.6 4.6H11c4.2 0 7.2-2 7.6-4.6" />
    <path d="M18.6 12.4c1.2-.6 2.3-2.2 3-4 .5 2.2.1 3.9-1 4.9 1.1 1 1.5 2.7 1 4.9-.7-1.8-1.8-3.4-3-3.8" />
    <path d="M5.2 15.4c3.4 1.6 8 1.6 11.4-.4" />
    {dot(7.2, 11.6)}
    <path d="M10.6 7V4.6M8.9 4.8l1.7-.6 1.7.6" />
  </>,
);

export const Mushroom = make(
  'Mushroom',
  <>
    <path d="M3 12.2C3 7.6 7 4 12 4s9 3.6 9 8.2Z" />
    <path d="M9.2 12.2v5.6c0 1.6 1.2 2.4 2.8 2.4s2.8-.8 2.8-2.4v-5.6" />
    <circle cx="8" cy="8.4" r="1.2" />
    <circle cx="13.2" cy="6.8" r="1.1" />
    <circle cx="16.6" cy="9.4" r="1" />
  </>,
);

export const Cactus = make(
  'Cactus',
  <>
    <path d="M10 20.5V5.5a2 2 0 0 1 4 0v15" />
    <path d="M10 13.5H8a2 2 0 0 1-2-2V8.5" />
    <path d="M14 11h2a2 2 0 0 0 2-2V6.5" />
    <path d="M6.5 20.5h11" />
  </>,
);

export const Ufo = make(
  'UFO',
  <>
    <path d="M8.2 10.8C8.2 7.9 9.9 6 12 6s3.8 1.9 3.8 4.8" />
    <ellipse cx="12" cy="12.4" rx="9" ry="3" />
    {dot(7.6, 12.6, 0.8)}
    {dot(12, 13.2, 0.8)}
    {dot(16.4, 12.6, 0.8)}
    <path d="m9.2 15.8-1.8 4.7M14.8 15.8l1.8 4.7" />
  </>,
);

/* ---------- Stillpoint signature ---------- */

export const Mark = make(
  'Stillpoint',
  <>
    <circle cx="12" cy="12" r="8.5" />
    {dot(12, 12, 2.6)}
  </>,
);

export const Ripple = make(
  'Ripple',
  <>
    {dot(12, 12, 1.5)}
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="8.6" opacity="0.5" />
  </>,
);

export const Cairn = make(
  'Cairn',
  <>
    <ellipse cx="12" cy="19" rx="7" ry="2.2" />
    <ellipse cx="12" cy="14.6" rx="5" ry="1.9" />
    <ellipse cx="12" cy="10.6" rx="3.6" ry="1.6" />
    <ellipse cx="12" cy="7.2" rx="2.2" ry="1.3" />
  </>,
);

export const Candle = make(
  'Candle',
  <>
    <path d="M9 11h6v9.5H9z" />
    <path d="M12 3c1.6 2 2 3.4 1.2 4.6a1.5 1.5 0 0 1-2.4 0C10 6.4 10.4 5 12 3Z" />
    <path d="M12 8.6V11" />
  </>,
);
