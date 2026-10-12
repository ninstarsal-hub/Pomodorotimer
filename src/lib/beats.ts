import { useEffect, useState } from 'react';

/* Generative break beats — lofi / chillhop / house, synthesised live with Web Audio.
   No streams or accounts: always free, works offline, never runs out. */

export type BeatStyle = 'lofi' | 'bounce' | 'house';

interface Pattern {
  bpm: number;
  swing: number; // 0 = straight, ~0.6 = lazy lofi swing
  kick: number[];
  snare: number[];
  hat: number[];
  openHat: number[];
  stab: number[]; // steps where the chord is (re)struck; [] = hold the chord for the bar
  bass: number[];
  chords: number[][]; // MIDI notes, one chord per bar
  crackle: number;
  tone: number; // master low-pass cutoff (Hz)
  melody: number; // chance of a melody note on each 8th
}

export const BEAT_STYLES: { id: BeatStyle; name: string; blurb: string }[] = [
  { id: 'lofi', name: 'Lofi', blurb: 'Lazy swung beats, warm keys, vinyl crackle' },
  { id: 'bounce', name: 'Chillhop', blurb: 'A bit more bounce — head-nod tempo' },
  { id: 'house', name: 'Deep house', blurb: 'Four-on-the-floor to get you moving' },
];

const PATTERNS: Record<BeatStyle, Pattern> = {
  lofi: {
    bpm: 76,
    swing: 0.6,
    kick: [0, 7, 10],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12, 14],
    openHat: [],
    stab: [],
    bass: [0, 7, 10],
    chords: [
      [50, 57, 60, 64, 65], // Dm9
      [43, 53, 57, 59, 64], // G13
      [48, 55, 59, 62, 64], // Cmaj9
      [45, 55, 59, 60, 64], // Am9
    ],
    crackle: 1,
    tone: 2600,
    melody: 0.28,
  },
  bounce: {
    bpm: 90,
    swing: 0.55,
    kick: [0, 3, 8, 11],
    snare: [4, 12],
    hat: [0, 2, 4, 6, 8, 10, 12],
    openHat: [14],
    stab: [0, 6, 10],
    bass: [0, 3, 8, 11, 14],
    chords: [
      [51, 58, 62, 65, 67], // Ebmaj9
      [50, 57, 60, 65, 69], // Dm9
      [48, 58, 62, 63, 67], // Cm9
      [46, 57, 62, 65, 69], // Bbmaj7(9)
    ],
    crackle: 0.5,
    tone: 3600,
    melody: 0.22,
  },
  house: {
    bpm: 120,
    swing: 0.5,
    kick: [0, 4, 8, 12],
    snare: [4, 12],
    hat: [],
    openHat: [2, 6, 10, 14],
    stab: [3, 6, 11, 14],
    bass: [2, 6, 10, 14],
    chords: [
      [45, 60, 64, 67, 71], // Am9
      [41, 57, 60, 64, 67], // Fmaj9
      [48, 59, 62, 64, 67], // Cmaj7(9)
      [43, 57, 59, 62, 66], // G6/9
    ],
    crackle: 0,
    tone: 5200,
    melody: 0,
  },
};

const hz = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12);

type Listener = () => void;

class BeatEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private filter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private crackleSrc: AudioBufferSourceNode | null = null;
  private crackleGain: GainNode | null = null;
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private pattern: Pattern = PATTERNS.lofi;
  private listeners = new Set<Listener>();
  private volume = 0.6;
  style: BeatStyle | null = null;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctor: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.filter = ctx.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.Q.value = 0.4;
    this.filter.connect(this.master).connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return ctx;
  }

  subscribe(l: Listener) {
    this.listeners.add(l);
    return () => void this.listeners.delete(l);
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  async play(style: BeatStyle, volume = this.volume) {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
    this.volume = volume;
    const switching = this.style !== null;
    this.style = style;
    this.pattern = PATTERNS[style];
    this.filter.frequency.setTargetAtTime(this.pattern.tone, ctx.currentTime, 0.1);
    this.setCrackle(this.pattern.crackle);
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(volume * 0.9, ctx.currentTime, switching ? 0.05 : 0.4);
    if (!switching || this.timer === null) {
      this.step = 0;
      this.nextTime = ctx.currentTime + 0.08;
    }
    if (this.timer === null) this.timer = window.setInterval(() => this.schedule(), 25);
    this.emit();
  }

  stop() {
    if (!this.ctx || this.style === null) return;
    const ctx = this.ctx;
    this.style = null;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.3);
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    window.setTimeout(() => {
      if (this.style === null) this.setCrackle(0);
    }, 1500);
    this.emit();
  }

  setVolume(v: number) {
    this.volume = v;
    if (this.ctx && this.style) this.master.gain.setTargetAtTime(v * 0.9, this.ctx.currentTime, 0.1);
  }

  /* ---------- sequencer ---------- */

  private schedule() {
    const ctx = this.ctx!;
    // Background tabs throttle timers to ~1/s, so look further ahead there.
    const ahead = document.hidden ? 1.6 : 0.15;
    const p = this.pattern;
    const sixteenth = 60 / p.bpm / 4;
    while (this.nextTime < ctx.currentTime + ahead) {
      const s = this.step % 16;
      const bar = Math.floor(this.step / 16) % p.chords.length;
      // Swing: delay every off-beat 16th.
      const t = this.nextTime + (s % 2 === 1 ? (p.swing - 0.5) * 2 * sixteenth : 0);
      this.playStep(s, bar, t, sixteenth);
      this.nextTime += sixteenth;
      this.step++;
    }
  }

  private playStep(s: number, bar: number, t: number, sixteenth: number) {
    const p = this.pattern;
    const chord = p.chords[bar];
    const fill = Math.floor(this.step / 16) % 4 === 3; // small variation on the last bar of each phrase
    if (p.kick.includes(s) || (fill && s === 14 && p.bpm < 100)) this.kick(t);
    if (p.snare.includes(s)) p.bpm >= 110 ? this.clap(t) : this.snare(t);
    if (p.hat.includes(s)) this.hat(t, s % 4 === 0 ? 0.5 : 0.32, 0.05);
    if (p.openHat.includes(s)) this.hat(t, 0.4, 0.22);
    if (p.bass.includes(s)) {
      const root = chord[0] - 12;
      const note = p.bpm >= 110 ? root : s === 10 || s === 14 ? root + 7 : root;
      this.bass(t, hz(note), sixteenth * (p.bpm >= 110 ? 1.6 : 3));
    }
    if (p.stab.length ? p.stab.includes(s) : s === 0) {
      const len = p.stab.length ? sixteenth * (p.bpm >= 110 ? 1.2 : 2.5) : sixteenth * 15;
      chord.slice(1).forEach((n, i) => this.keys(t + i * (p.stab.length ? 0 : 0.012), hz(n), len, p.stab.length ? 0.07 : 0.06));
    }
    if (p.melody > 0 && s % 2 === 0 && s !== 0 && Math.random() < p.melody) {
      const tones = chord.slice(1);
      const n = tones[Math.floor(Math.random() * tones.length)] + 12;
      this.keys(t, hz(n), sixteenth * 3, 0.05, true);
    }
  }

  /* ---------- instruments ---------- */

  private env(g: GainNode, t: number, peak: number, attack: number, decay: number) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  }

  private kick(t: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    this.env(g, t, 0.9, 0.004, 0.38);
    o.connect(g).connect(this.filter);
    o.start(t);
    o.stop(t + 0.45);
  }

  private noiseHit(t: number, type: BiquadFilterType, freq: number, peak: number, decay: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    this.env(g, t, peak, 0.002, decay);
    src.connect(f).connect(g).connect(this.filter);
    src.start(t, Math.random() * 1.5);
    src.stop(t + decay + 0.05);
  }

  private snare(t: number) {
    this.noiseHit(t, 'bandpass', 1800, 0.35, 0.18);
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'triangle';
    o.frequency.setValueAtTime(220, t);
    o.frequency.exponentialRampToValueAtTime(160, t + 0.08);
    this.env(g, t, 0.18, 0.002, 0.1);
    o.connect(g).connect(this.filter);
    o.start(t);
    o.stop(t + 0.15);
  }

  private clap(t: number) {
    [0, 0.012, 0.024].forEach((d, i) => this.noiseHit(t + d, 'bandpass', 1400, i === 2 ? 0.32 : 0.18, i === 2 ? 0.16 : 0.02));
  }

  private hat(t: number, peak: number, decay: number) {
    this.noiseHit(t, 'highpass', 7500, peak * 0.4, decay);
  }

  private bass(t: number, f: number, len: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.42, t + 0.015);
    g.gain.setTargetAtTime(0.0001, t + len * 0.7, len * 0.15);
    o.connect(g).connect(this.filter);
    o.start(t);
    o.stop(t + len + 0.3);
  }

  /** Soft electric-piano-ish tone: sine + quiet octave, gentle decay. */
  private keys(t: number, f: number, len: number, peak: number, bell = false) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.012);
    g.gain.setTargetAtTime(peak * 0.35, t + 0.05, 0.4);
    g.gain.setTargetAtTime(0.0001, t + len, 0.12);
    g.connect(this.filter);
    const partials: [OscillatorType, number, number][] = [
      ['sine', 1, 1],
      ['triangle', 2, bell ? 0.25 : 0.12],
    ];
    for (const [type, mult, level] of partials) {
      const o = ctx.createOscillator();
      const lg = ctx.createGain();
      o.type = type;
      o.frequency.value = f * mult;
      o.detune.value = (Math.random() - 0.5) * 8; // a little tape wobble
      lg.gain.value = level;
      o.connect(lg).connect(g);
      o.start(t);
      o.stop(t + len + 0.8);
    }
  }

  private setCrackle(level: number) {
    const ctx = this.ctx!;
    if (level > 0 && !this.crackleSrc) {
      const buf = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < d.length; i++) {
        d[i] = (Math.random() * 2 - 1) * 0.015 + (Math.random() < 0.0004 ? (Math.random() * 2 - 1) * 0.6 : 0);
      }
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = 2500;
      f.Q.value = 0.5;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f).connect(g).connect(this.master);
      src.start();
      this.crackleSrc = src;
      this.crackleGain = g;
    }
    if (this.crackleGain) this.crackleGain.gain.setTargetAtTime(level * 0.5, ctx.currentTime, 0.3);
    if (level === 0 && this.crackleSrc) {
      const src = this.crackleSrc;
      window.setTimeout(() => src.stop(), 1500);
      this.crackleSrc = null;
      this.crackleGain = null;
    }
  }
}

export const beats = new BeatEngine();

/** Which break-beat style is playing right now (null = none). */
export function useBeatStyle() {
  const [style, setStyle] = useState(beats.style);
  useEffect(() => beats.subscribe(() => setStyle(beats.style)), []);
  return style;
}
