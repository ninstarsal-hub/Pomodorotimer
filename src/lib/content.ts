/** `ink` is a deeper shade of the same accent, used in the light theme so text stays readable. */
export const ACCENTS = [
  { id: 'sand', value: '#e7cba9', ink: '#9a6a3c' },
  { id: 'sage', value: '#a9c4a4', ink: '#4f7a49' },
  { id: 'mist', value: '#a8bfd9', ink: '#47698f' },
  { id: 'lilac', value: '#c4b1dc', ink: '#755aa0' },
  { id: 'rose', value: '#e0aeb0', ink: '#a1515a' },
  { id: 'bone', value: '#e8e6e1', ink: '#55524c' },
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

export type BreakTool = 'breathe' | 'doodle' | 'music';

export interface BreakIdea {
  title: string;
  body: string;
  /** The research behind it, in one line. */
  why?: string;
  tool?: BreakTool;
  /** Only suggested on long breaks (needs more than a few minutes). */
  long?: boolean;
}

export const BREAK_IDEAS: BreakIdea[] = [
  { title: 'Look far away', body: '20-20-20: look at something ~20 feet away for 20 seconds. Your eyes have been locked at screen distance.', why: 'Recommended by optometrists to relax the focusing muscles and reduce digital eye strain.' },
  { title: 'Move', body: 'Stand up, stretch your hips and shoulders, or walk a lap. Light movement boosts alertness for the next block.', why: 'Breaking up sitting with light activity improves alertness and mood compared with staying seated.' },
  { title: 'Hydrate', body: 'Refill your water. Even mild dehydration measurably dulls attention.', why: 'Losing ~1–2% of body water is linked to worse attention and mood in studies of young adults.' },
  { title: 'Box breathing', body: 'Inhale 4 · hold 4 · exhale 4 · hold 4. Four rounds lowers arousal without making you sleepy.', why: 'Slow, paced breathing calms the stress response; a 2023 Stanford study found 5 minutes of breathwork a day improved mood.', tool: 'breathe' },
  { title: 'Rest your mind', body: 'Close your eyes and do nothing for a minute. “Wakeful rest” right after learning helps memories consolidate.', why: 'People who rested quietly for 10 minutes after learning remembered more a week later (Dewar et al., 2012).' },
  { title: 'Avoid the feed', body: 'Skip social media this break — it hijacks the same attention you need to come back to.', why: 'Phone breaks left people less efficient afterwards than other kinds of breaks (Kang & Kurtzberg, 2019).' },
  { title: 'Teach it back', body: 'Say out loud, as if to a friend, the one idea you just worked on. Gaps become obvious fast.', why: 'Explaining to someone else (the “protégé effect”) strengthens understanding more than re-reading.' },
  { title: 'Doodle', body: 'Open the doodle pad below and draw anything — shapes, patterns, a diagram of what you just learned. No skill needed.', why: 'Doodlers recalled 29% more of what they’d heard (Andrade, 2010), and 45 minutes of free art-making lowered cortisol in most people (Kaimal et al., 2016).', tool: 'doodle' },
  { title: 'Draw what you learned', body: 'Sketch the last topic from memory as a diagram, flowchart or mind map. Then glance at your notes to check.', why: 'Drawing information produces better recall than writing it out — the “drawing effect” (Wammes et al., 2016).', tool: 'doodle' },
  { title: 'Go green', body: 'Step outside, look at trees or the sky, or at least look out a window at something natural.', why: 'Just 40 seconds looking at a green roof improved attention afterwards vs. a concrete roof (Lee et al., 2015); nature restores directed attention.' },
  { title: 'Exercise snack', body: '20 jumping jacks, 15 squats or a flight of stairs — just enough to get your heart rate up.', why: 'A short bout of moderate exercise improves attention and executive function for a while afterwards (Chang et al., 2012 meta-analysis).' },
  { title: 'Dance to one song', body: 'Put on a song you love (or the break beats below) and move. Silly is fine.', why: 'Music you enjoy lifts mood and arousal, which carries over into better performance (Thompson et al., 2001).', tool: 'music' },
  { title: 'Brain dump', body: 'Write down whatever is nagging you — worries, to-dos, random thoughts — for two minutes. Then let it go.', why: 'Writing out worries for 10 minutes before an exam raised anxious students’ scores (Ramirez & Beilock, 2011).' },
  { title: 'Talk to someone', body: 'Have a quick chat with a friend, roommate or family member — in person or a call, not a feed.', why: 'Short social micro-breaks are linked to more energy at work (Fritz et al., 2011).' },
  { title: 'Tense & release', body: 'Squeeze your fists, shoulders, then face for 5 seconds each, and let go. Notice the difference.', why: 'Progressive muscle relaxation reliably lowers stress and anxiety.' },
  { title: 'Walk outside', body: 'Take a 5-minute walk — outside if you can, even just around the block or down the hall and back.', why: 'Walking boosted creative thinking by about 60% compared with sitting (Oppezzo & Schwartz, 2014), and being outdoors adds the attention-restoring effect of nature.' },
  { title: 'Recharge', body: 'Get outside or move around, then eat a real snack and drink some water. Running on empty? Take a 10–20 minute nap instead.', why: 'Longer breaks work best when they actually restore energy — movement, food and daylight — rather than more screen time.', long: true },
  { title: 'Power nap', body: 'Lie down for 10–20 minutes with an alarm set. Keep it short so you don’t wake up groggy.', why: 'A 10-minute nap improved alertness and performance right away, without the grogginess of longer naps (Brooks & Lack, 2006).', long: true },
  { title: 'Eat something real', body: 'Have a proper snack — fruit, nuts, yogurt, a sandwich. Step away from the desk to eat it.', why: 'Long sessions on an empty stomach drain focus; eating away from your desk also gives you real mental distance.', long: true },
];

export interface PlanStep {
  /** Short name shown in the plan strip. */
  label: string;
  idea: string;
  /** Why this break comes at this point in the set. */
  reason: string;
}

/** The recommended order for breaks in a set: start light, then move, then calm down, then truly recharge. */
export const BREAK_PLAN: { short: PlanStep[]; long: PlanStep } = {
  short: [
    { label: 'Doodle', idea: 'Doodle', reason: 'After one block your brain just needs a light, creative reset — no need to get up yet.' },
    { label: 'Walk', idea: 'Walk outside', reason: 'You’ve been sitting for two blocks now. Get your body moving and some fresh air.' },
    { label: 'Rest', idea: 'Rest your mind', reason: 'Fatigue builds by the third block — calm down instead of revving up, and give your eyes a rest.' },
  ],
  long: { label: 'Recharge', idea: 'Recharge', reason: 'You finished a full set. Step away properly: move, eat, refill — this is where you recover for the next round.' },
};

/** Which recommended break this is. `cycle` = focus blocks finished so far. */
export function planStep(long: boolean, cycle: number, longEvery: number) {
  if (long) return { step: BREAK_PLAN.long, index: Math.max(longEvery - 1, 0) };
  const pos = Math.max((cycle % longEvery) - 1, 0); // 1st, 2nd, 3rd break of the set
  const step = BREAK_PLAN.short[pos % BREAK_PLAN.short.length];
  return { step, index: pos };
}

export const ideaByTitle = (title: string) => BREAK_IDEAS.find((i) => i.title === title)!;

/** Pick a break idea that suits the break length, avoiding the one just shown. */
export function pickBreakIdea(long: boolean, avoid?: BreakIdea) {
  const pool = BREAK_IDEAS.filter((i) => (long || !i.long) && i !== avoid);
  return pool[Math.floor(Math.random() * pool.length)];
}

/** Upbeat playlists for breaks — lyrics welcome here. Users can add their own too. */
export const BREAK_MEDIA: MediaItem[] = [
  { id: 'sp-moodbooster', name: 'Mood Booster', note: 'Spotify · feel-good pop', url: 'https://open.spotify.com/playlist/37i9dQZF1DX3rxVfibe1L0' },
  { id: 'sp-happyhits', name: 'Happy Hits!', note: 'Spotify · upbeat hits', url: 'https://open.spotify.com/playlist/37i9dQZF1DXdPec7aLTmlC' },
  { id: 'sp-chillhits', name: 'Chill Hits', note: 'Spotify · relaxed pop', url: 'https://open.spotify.com/playlist/37i9dQZF1DX4WYpdgoIcn6' },
  { id: 'sp-lofibeats', name: 'Lofi Beats', note: 'Spotify · lofi hip hop', url: 'https://open.spotify.com/playlist/37i9dQZF1DWWQRwui0ExPn' },
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
