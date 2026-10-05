export const ACCENTS = [
  { id: 'sand', value: '#e7cba9' },
  { id: 'sage', value: '#a9c4a4' },
  { id: 'mist', value: '#a8bfd9' },
  { id: 'lilac', value: '#c4b1dc' },
  { id: 'rose', value: '#e0aeb0' },
  { id: 'bone', value: '#e8e6e1' },
];

export const BACKGROUND_PRESETS = [
  { id: 'matte', name: 'Matte' },
  { id: 'aurora', name: 'Aurora' },
  { id: 'ember', name: 'Ember' },
  { id: 'ocean', name: 'Deep Sea' },
  { id: 'forest', name: 'Forest' },
  { id: 'dusk', name: 'Dusk' },
  { id: 'stars', name: 'Night Sky' },
  { id: 'rain', name: 'Rain' },
];

export const TIMER_PRESETS = [
  { id: 'classic', name: 'Classic', focus: 25, short: 5, long: 15, hint: '25 / 5 — the original Pomodoro' },
  { id: 'deep', name: 'Deep', focus: 50, short: 10, long: 20, hint: '50 / 10 — longer immersion for reading & writing' },
  { id: 'ultradian', name: 'Ultradian', focus: 90, short: 20, long: 30, hint: '90 / 20 — one full ultradian cycle' },
  { id: 'sprint', name: 'Sprint', focus: 15, short: 3, long: 10, hint: '15 / 3 — for low-energy days or getting started' },
];

export interface MediaItem {
  id: string;
  name: string;
  note: string;
  url: string;
}

/** Curated lyric-free streams and playlists. Users can add their own links too. */
export const CURATED_MEDIA: MediaItem[] = [
  { id: 'yt-lofigirl', name: 'Lofi Girl — beats to study to', note: 'YouTube · 24/7 live', url: 'https://www.youtube.com/watch?v=jfKfPfyJRdk' },
  { id: 'yt-synth', name: 'Lofi Girl — synthwave radio', note: 'YouTube · 24/7 live', url: 'https://www.youtube.com/watch?v=4xDzrJKXOOY' },
  { id: 'yt-chillhop', name: 'Chillhop Radio', note: 'YouTube · 24/7 live', url: 'https://www.youtube.com/watch?v=5yx6BWlEVcY' },
  { id: 'sp-deepfocus', name: 'Deep Focus', note: 'Spotify · ambient & post-rock', url: 'https://open.spotify.com/playlist/37i9dQZF1DWZeKCadgRdKQ' },
  { id: 'sp-piano', name: 'Peaceful Piano', note: 'Spotify · solo piano', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO' },
  { id: 'sp-brainfood', name: 'Brain Food', note: 'Spotify · electronic, minimal vocals', url: 'https://open.spotify.com/playlist/37i9dQZF1DWXLeA8Omikj7' },
];

/** Convert a YouTube / Spotify / SoundCloud share link into an embeddable URL. */
export function toEmbed(url: string): string | null {
  try {
    const u = new URL(url.trim());
    const host = u.hostname.replace(/^www\.|^m\./, '');
    if (host === 'youtube.com' || host === 'music.youtube.com') {
      const list = u.searchParams.get('list');
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}?autoplay=1${list ? `&list=${list}` : ''}`;
      if (list) return `https://www.youtube.com/embed/videoseries?list=${list}&autoplay=1`;
      const live = u.pathname.match(/^\/(?:live|shorts|embed)\/([\w-]+)/);
      if (live) return `https://www.youtube.com/embed/${live[1]}?autoplay=1`;
    }
    if (host === 'youtu.be') return `https://www.youtube.com/embed/${u.pathname.slice(1)}?autoplay=1`;
    if (host === 'open.spotify.com') {
      const m = u.pathname.match(/\/(playlist|album|track|show|episode)\/(\w+)/);
      if (m) return `https://open.spotify.com/embed/${m[1]}/${m[2]}?theme=0`;
    }
    if (host === 'soundcloud.com') {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(u.toString())}&auto_play=true&color=%23222222`;
    }
  } catch {
    /* not a URL */
  }
  return null;
}

export const BREAK_IDEAS = [
  { title: 'Look far away', body: '20-20-20: look at something ~20 feet away for 20 seconds. Your eyes have been locked at screen distance.' },
  { title: 'Move', body: 'Stand up, stretch your hips and shoulders, or walk a lap. Light movement boosts alertness for the next block.' },
  { title: 'Hydrate', body: 'Refill your water. Even mild dehydration measurably dulls attention.' },
  { title: 'Box breathing', body: 'Inhale 4 · hold 4 · exhale 4 · hold 4. Four rounds lowers arousal without making you sleepy.', breathe: true },
  { title: 'Rest your mind', body: 'Close your eyes and do nothing for a minute. “Wakeful rest” right after learning helps memories consolidate.' },
  { title: 'Avoid the feed', body: 'Skip social media this break — it hijacks the same attention you need to come back to.' },
  { title: 'Teach it back', body: 'Say out loud, as if to a friend, the one idea you just worked on. Gaps become obvious fast.' },
];

export interface Strategy {
  id: string;
  title: string;
  tag: string;
  why: string;
  how: string[];
}

export const STRATEGIES: Strategy[] = [
  {
    id: 'recall',
    title: 'Active recall',
    tag: 'Highest impact',
    why: 'Pulling information out of memory strengthens it far more than re-reading or highlighting (the “testing effect”). It also exposes what you only think you know.',
    how: ['Close the book and write everything you remember, then check.', 'Turn notes into questions — Stillpoint does this automatically in Notes.', 'Use the mid-session checkpoint quizzes instead of skipping them.'],
  },
  {
    id: 'spacing',
    title: 'Spaced repetition',
    tag: 'Highest impact',
    why: 'Reviewing just as you start to forget beats cramming. The same total time, spread out, produces much longer-lasting memory.',
    how: ['Grade cards honestly — “Again” brings a card back sooner.', 'Do a short review of due cards at the start of each day.', 'Start revising for exams weeks out, a little each day.'],
  },
  {
    id: 'interleave',
    title: 'Interleaving',
    tag: 'Problem solving',
    why: 'Mixing problem types forces you to choose the right method, which is exactly what exams test. Blocked practice feels easier but transfers worse.',
    how: ['Alternate subjects or problem types between pomodoros.', 'Shuffle practice problems from different chapters.', 'Queue different-subject tasks back-to-back in Today.'],
  },
  {
    id: 'elaborate',
    title: 'Elaboration',
    tag: 'Understanding',
    why: 'Asking “why?” and “how does this connect?” links new ideas to what you already know, making them easier to retrieve.',
    how: ['After each section, ask: why is this true? how does it relate to X?', 'Compare and contrast similar concepts.', 'Use “# Heading” in notes to get explain-it-yourself prompts.'],
  },
  {
    id: 'feynman',
    title: 'Feynman technique',
    tag: 'Understanding',
    why: 'Explaining in plain language reveals gaps. If you can’t explain it simply, you don’t understand it yet.',
    how: ['Pick a concept, explain it as if to a 12-year-old.', 'Where you stall or reach for jargon, go back to the source.', 'Simplify and use an analogy, then try again.'],
  },
  {
    id: 'dual',
    title: 'Dual coding',
    tag: 'Memory',
    why: 'Combining words with visuals (diagrams, timelines, flowcharts) gives two routes back to the same memory.',
    how: ['Redraw a diagram from memory, then compare.', 'Turn a process into a flowchart.', 'Sketch a timeline for history topics.'],
  },
  {
    id: 'pretest',
    title: 'Pre-testing',
    tag: 'Before you start',
    why: 'Attempting questions before you study — even getting them wrong — primes your attention for the answers.',
    how: ['Skim end-of-chapter questions and guess before reading.', 'Use the warm-up quiz at the start of a session.', 'Write down what you expect a lecture to cover.'],
  },
  {
    id: 'environment',
    title: 'Protect attention',
    tag: 'Focus',
    why: 'Even a phone in sight reduces available working memory. Each switch costs minutes to fully re-engage.',
    how: ['Phone in another room or face-down and silenced.', 'Write stray thoughts in the parking lot instead of acting on them.', 'Choose lyric-free audio for reading — lyrics compete for the same language processing.'],
  },
  {
    id: 'sleep',
    title: 'Sleep & breaks',
    tag: 'Recovery',
    why: 'Memory consolidates during sleep and quiet rest. An all-nighter trades tomorrow’s recall for tonight’s hours.',
    how: ['Keep breaks screen-free when you can.', 'Study the hardest material earlier; review before bed.', 'Take the long break seriously — it is part of the method.'],
  },
];

export const SAMPLE_NOTES = `# Cell respiration
Cellular respiration converts glucose into ATP, the cell's energy currency.
Glycolysis :: Splits glucose into two pyruvate molecules in the cytoplasm
Krebs cycle :: Series of reactions in the mitochondrial matrix that produces NADH and FADH2
The electron transport chain produces about **34 ATP** per glucose molecule.
Where does glycolysis occur?
In the cytoplasm
Q: What is the final electron acceptor in aerobic respiration?
A: Oxygen
Fermentation - regenerates NAD+ when oxygen is absent

# Photosynthesis
Photosynthesis happens in the ==chloroplast== and stores energy in glucose.
The light reactions take place in the thylakoid membranes and split water, releasing oxygen.`;
