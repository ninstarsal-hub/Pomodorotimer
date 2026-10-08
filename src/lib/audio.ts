/**
 * Generative focus-sound engine built on the Web Audio API.
 *
 * Layers:
 *  - noise (white / pink / brown / rain)
 *  - ambient pad (slow, lyric-free chord drone)
 *  - amplitude modulation of the bed (the technique brain.fm-style apps use)
 *  - optional binaural beat (needs headphones)
 */

export type NoiseType = 'off' | 'white' | 'pink' | 'brown' | 'rain' | 'cafe' | 'fire' | 'ocean';
export type PadKey = 'off' | 'calm' | 'bright' | 'deep';

export interface SoundParams {
  noise: NoiseType;
  noiseLevel: number; // 0..1
  pad: PadKey;
  padLevel: number; // 0..1
  modRate: number; // Hz, 0 = off
  modDepth: number; // 0..1
  binaural: number; // beat Hz, 0 = off
  binauralLevel: number;
  volume: number; // master 0..1
}

export interface SoundPreset {
  id: string;
  name: string;
  blurb: string;
  params: SoundParams;
}

const base: SoundParams = {
  noise: 'off',
  noiseLevel: 0.5,
  pad: 'off',
  padLevel: 0.5,
  modRate: 0,
  modDepth: 0,
  binaural: 0,
  binauralLevel: 0.3,
  volume: 0.6,
};

export const SOUND_PRESETS: SoundPreset[] = [
  {
    id: 'deep',
    name: 'Deep Focus',
    blurb: 'Warm brown noise + low pad, gently modulated in the beta range (~16 Hz).',
    params: { ...base, noise: 'brown', noiseLevel: 0.55, pad: 'deep', padLevel: 0.35, modRate: 16, modDepth: 0.18 },
  },
  {
    id: 'flow',
    name: 'Flow',
    blurb: 'Pink noise + airy chords with alpha-range (~10 Hz) modulation. Good for reading.',
    params: { ...base, noise: 'pink', noiseLevel: 0.35, pad: 'calm', padLevel: 0.5, modRate: 10, modDepth: 0.14 },
  },
  {
    id: 'gamma',
    name: 'Gamma 40',
    blurb: 'Bright pad pulsed at 40 Hz. Crisp — try it for problem sets.',
    params: { ...base, noise: 'pink', noiseLevel: 0.2, pad: 'bright', padLevel: 0.5, modRate: 40, modDepth: 0.22 },
  },
  {
    id: 'rain',
    name: 'Rain Room',
    blurb: 'Soft rainfall over a quiet drone. No modulation.',
    params: { ...base, noise: 'rain', noiseLevel: 0.6, pad: 'calm', padLevel: 0.22 },
  },
  {
    id: 'cafe',
    name: 'Café',
    blurb: 'Warm, indistinct room murmur — busy enough to feel alive, too blurry to understand.',
    params: { ...base, noise: 'cafe', noiseLevel: 0.6, pad: 'calm', padLevel: 0.12 },
  },
  {
    id: 'fire',
    name: 'Fireplace',
    blurb: 'Low crackling fire with a deep, soft roar.',
    params: { ...base, noise: 'fire', noiseLevel: 0.65 },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    blurb: 'Slow waves rolling in and out — about six per minute, close to a calm breathing pace.',
    params: { ...base, noise: 'ocean', noiseLevel: 0.65, pad: 'deep', padLevel: 0.12 },
  },
  {
    id: 'brown',
    name: 'Pure Brown Noise',
    blurb: 'Just deep, steady noise to mask the room.',
    params: { ...base, noise: 'brown', noiseLevel: 0.7 },
  },
  {
    id: 'binaural',
    name: 'Binaural Beta',
    blurb: '15 Hz binaural beat over pink noise. Headphones required.',
    params: { ...base, noise: 'pink', noiseLevel: 0.25, binaural: 15, binauralLevel: 0.35 },
  },
];

const PAD_CHORDS: Record<Exclude<PadKey, 'off'>, number[]> = {
  calm: [110, 164.81, 196.0, 246.94, 261.63], // A minor 9
  bright: [130.81, 196.0, 246.94, 329.63, 392.0], // C maj7
  deep: [73.42, 110.0, 146.83, 174.61, 220.0], // D minor
};

function makeNoiseBuffer(ctx: AudioContext, type: Exclude<NoiseType, 'off'>) {
  const seconds = 8;
  const len = ctx.sampleRate * seconds;
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (type === 'white' || type === 'rain') {
        d[i] = w * 0.5;
      } else if (type === 'fire') {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3;
      } else if (type === 'pink' || type === 'cafe' || type === 'ocean') {
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
    if (type === 'fire') {
      // Sprinkle short, decaying crackles of random size.
      const crackles = seconds * (6 + Math.random() * 4);
      for (let k = 0; k < crackles; k++) {
        const at = Math.floor(Math.random() * (len - 4000));
        const size = 0.15 + Math.random() ** 3 * 0.85;
        const dur = 80 + Math.floor(Math.random() * 900);
        for (let j = 0; j < dur; j++) d[at + j] += (Math.random() * 2 - 1) * size * Math.exp((-j / dur) * 6);
      }
    }
    // crossfade the ends so the loop point is inaudible
    const fade = Math.floor(ctx.sampleRate * 0.05);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      d[i] = d[i] * t + d[len - fade + i] * (1 - t);
    }
  }
  return buf;
}

export class FocusEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private modGain!: GainNode;
  private lfo: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;
  private noiseNodes: AudioNode[] = [];
  private noiseSrc: AudioBufferSourceNode | null = null;
  private padNodes: { osc: OscillatorNode[]; gain: GainNode; extras: AudioNode[] } | null = null;
  private binNodes: { l: OscillatorNode; r: OscillatorNode; gain: GainNode } | null = null;
  private params: SoundParams = base;
  private applied: Partial<SoundParams> = {};
  playing = false;

  private ensure() {
    if (this.ctx) return this.ctx;
    const Ctor: typeof AudioContext = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctor();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    this.modGain = ctx.createGain();
    this.modGain.connect(this.master);
    return ctx;
  }

  async play(params: SoundParams) {
    const ctx = this.ensure();
    if (ctx.state === 'suspended') await ctx.resume();
    this.playing = true;
    this.applied = {};
    this.update(params);
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(this.params.volume * 0.8, ctx.currentTime, 0.6);
  }

  stop() {
    if (!this.ctx) return;
    this.playing = false;
    const ctx = this.ctx;
    this.master.gain.cancelScheduledValues(ctx.currentTime);
    this.master.gain.setTargetAtTime(0, ctx.currentTime, 0.25);
    window.setTimeout(() => {
      if (!this.playing) {
        this.teardownNoise();
        this.teardownPad();
        this.teardownBinaural();
        this.teardownLfo();
        this.applied = {};
      }
    }, 1500);
  }

  update(params: SoundParams) {
    this.params = params;
    if (!this.ctx || !this.playing) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const a = this.applied;

    this.master.gain.setTargetAtTime(params.volume * 0.8, t, 0.2);

    if (a.noise !== params.noise) {
      this.teardownNoise();
      if (params.noise !== 'off') this.buildNoise(params.noise);
    }
    if (this.noiseNodes.length) {
      const g = this.noiseNodes[this.noiseNodes.length - 1] as GainNode;
      g.gain.setTargetAtTime(params.noiseLevel * (params.noise === 'white' ? 0.35 : 0.6), t, 0.2);
    }

    if (a.pad !== params.pad) {
      this.teardownPad();
      if (params.pad !== 'off') this.buildPad(params.pad);
    }
    if (this.padNodes) this.padNodes.gain.gain.setTargetAtTime(params.padLevel * 0.18, t, 0.4);

    if (a.modRate !== params.modRate || a.modDepth !== params.modDepth) {
      this.setModulation(params.modRate, params.modDepth);
    }

    if (a.binaural !== params.binaural) {
      this.teardownBinaural();
      if (params.binaural > 0) this.buildBinaural(params.binaural);
    }
    if (this.binNodes) this.binNodes.gain.gain.setTargetAtTime(params.binauralLevel * 0.12, t, 0.2);

    this.applied = { ...params };
  }

  private buildNoise(type: Exclude<NoiseType, 'off'>) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = makeNoiseBuffer(ctx, type);
    src.loop = true;
    const nodes: AudioNode[] = [];
    let tail: AudioNode = src;
    if (type === 'rain') {
      const hp = ctx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 500;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 5200;
      const shimmer = ctx.createGain();
      shimmer.gain.value = 0.85;
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.13;
      const lfoAmt = ctx.createGain();
      lfoAmt.gain.value = 0.15;
      lfo.connect(lfoAmt).connect(shimmer.gain);
      lfo.start();
      tail.connect(hp);
      hp.connect(lp);
      lp.connect(shimmer);
      tail = shimmer;
      nodes.push(hp, lp, lfo, lfoAmt, shimmer);
    } else if (type === 'cafe') {
      // Speech-band murmur: muffled so no words come through, with irregular swells.
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 650;
      bp.Q.value = 0.6;
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 2400;
      const murmur = ctx.createGain();
      murmur.gain.value = 1.2;
      const lfos: AudioNode[] = [];
      for (const [f, amt] of [
        [0.31, 0.25],
        [0.73, 0.18],
        [1.7, 0.1],
      ]) {
        const o = ctx.createOscillator();
        o.frequency.value = f;
        const a = ctx.createGain();
        a.gain.value = amt;
        o.connect(a).connect(murmur.gain);
        o.start();
        lfos.push(o, a);
      }
      tail.connect(bp);
      bp.connect(lp);
      lp.connect(murmur);
      tail = murmur;
      nodes.push(bp, lp, ...lfos, murmur);
    } else if (type === 'ocean') {
      // Waves: a slow swell in volume and brightness, ~10 s per wave.
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      const sweep = ctx.createOscillator();
      sweep.frequency.value = 0.1;
      const sweepAmt = ctx.createGain();
      sweepAmt.gain.value = 700;
      sweep.connect(sweepAmt).connect(lp.frequency);
      const swell = ctx.createGain();
      swell.gain.value = 0.55;
      const swellAmt = ctx.createGain();
      swellAmt.gain.value = 0.45;
      sweep.connect(swellAmt).connect(swell.gain);
      sweep.start();
      tail.connect(lp);
      lp.connect(swell);
      tail = swell;
      nodes.push(lp, sweep, sweepAmt, swellAmt, swell);
    } else if (type === 'fire') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3500;
      tail.connect(lp);
      tail = lp;
      nodes.push(lp);
    } else if (type === 'white') {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 9000;
      tail.connect(lp);
      tail = lp;
      nodes.push(lp);
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    tail.connect(gain);
    gain.connect(this.modGain);
    nodes.push(gain);
    src.start();
    this.noiseSrc = src;
    this.noiseNodes = nodes;
  }

  private teardownNoise() {
    try {
      this.noiseSrc?.stop();
    } catch {
      /* already stopped */
    }
    this.noiseSrc?.disconnect();
    this.noiseNodes.forEach((n) => {
      if (n instanceof OscillatorNode) n.stop();
      n.disconnect();
    });
    this.noiseSrc = null;
    this.noiseNodes = [];
  }

  private buildPad(key: Exclude<PadKey, 'off'>) {
    const ctx = this.ctx!;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1100;
    lp.Q.value = 0.4;
    // slow filter sweep so the pad breathes
    const sweep = ctx.createOscillator();
    sweep.frequency.value = 0.05;
    const sweepAmt = ctx.createGain();
    sweepAmt.gain.value = 400;
    sweep.connect(sweepAmt).connect(lp.frequency);
    sweep.start();

    const osc: OscillatorNode[] = [];
    const extras: AudioNode[] = [lp, sweep, sweepAmt];
    PAD_CHORDS[key].forEach((f, i) => {
      for (const detune of [-6, 6]) {
        const o = ctx.createOscillator();
        o.type = i === 0 ? 'sine' : 'triangle';
        o.frequency.value = f;
        o.detune.value = detune;
        const vg = ctx.createGain();
        vg.gain.value = 0.5 / PAD_CHORDS[key].length;
        // each voice swells independently
        const swell = ctx.createOscillator();
        swell.frequency.value = 0.03 + Math.random() * 0.07;
        const swellAmt = ctx.createGain();
        swellAmt.gain.value = 0.25 / PAD_CHORDS[key].length;
        swell.connect(swellAmt).connect(vg.gain);
        swell.start();
        o.connect(vg).connect(lp);
        o.start();
        osc.push(o, swell);
        extras.push(vg, swellAmt);
      }
    });
    lp.connect(gain);
    gain.connect(this.modGain);
    this.padNodes = { osc, gain, extras };
  }

  private teardownPad() {
    if (!this.padNodes) return;
    this.padNodes.osc.forEach((o) => {
      o.stop();
      o.disconnect();
    });
    this.padNodes.extras.forEach((n) => {
      if (n instanceof OscillatorNode) n.stop();
      n.disconnect();
    });
    this.padNodes.gain.disconnect();
    this.padNodes = null;
  }

  private setModulation(rate: number, depth: number) {
    const ctx = this.ctx!;
    const t = ctx.currentTime;
    if (rate <= 0 || depth <= 0) {
      this.teardownLfo();
      this.modGain.gain.setTargetAtTime(1, t, 0.1);
      return;
    }
    if (!this.lfo) {
      this.lfo = ctx.createOscillator();
      this.lfo.type = 'sine';
      this.lfoGain = ctx.createGain();
      this.lfo.connect(this.lfoGain).connect(this.modGain.gain);
      this.lfo.start();
    }
    this.lfo.frequency.setTargetAtTime(rate, t, 0.1);
    this.lfoGain!.gain.setTargetAtTime(depth / 2, t, 0.1);
    this.modGain.gain.setTargetAtTime(1 - depth / 2, t, 0.1);
  }

  private teardownLfo() {
    if (!this.lfo) return;
    this.lfo.stop();
    this.lfo.disconnect();
    this.lfoGain?.disconnect();
    this.lfo = null;
    this.lfoGain = null;
  }

  private buildBinaural(beat: number) {
    const ctx = this.ctx!;
    const carrier = 200;
    const l = ctx.createOscillator();
    const r = ctx.createOscillator();
    l.frequency.value = carrier;
    r.frequency.value = carrier + beat;
    const merger = ctx.createChannelMerger(2);
    l.connect(merger, 0, 0);
    r.connect(merger, 0, 1);
    const gain = ctx.createGain();
    gain.gain.value = 0;
    merger.connect(gain);
    // binaural tones bypass the AM stage so the beat stays clean
    gain.connect(this.master);
    l.start();
    r.start();
    this.binNodes = { l, r, gain };
  }

  private teardownBinaural() {
    if (!this.binNodes) return;
    this.binNodes.l.stop();
    this.binNodes.r.stop();
    this.binNodes.l.disconnect();
    this.binNodes.r.disconnect();
    this.binNodes.gain.disconnect();
    this.binNodes = null;
  }
}

export const engine = new FocusEngine();

/* ---------- chime ---------- */

let chimeCtx: AudioContext | null = null;

export function chime(volume = 0.5, kind: 'end' | 'soft' = 'end') {
  if (volume <= 0) return;
  try {
    chimeCtx ??= new AudioContext();
    const ctx = chimeCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const notes = kind === 'end' ? [659.25, 880, 1318.5] : [880];
    notes.forEach((f, i) => {
      const t = ctx.currentTime + i * 0.18;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(volume * 0.25, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.8);
      o.connect(g).connect(ctx.destination);
      o.start(t);
      o.stop(t + 1.9);
    });
  } catch {
    /* audio unavailable */
  }
}
