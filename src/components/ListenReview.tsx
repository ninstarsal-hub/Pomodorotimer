import { useEffect, useRef, useState } from 'react';
import { Check, Headphones, Pause, Play, SkipForward, X } from 'lucide-react';
import { useStore } from '../store';
import { hasMath, isDue, schedule, shuffle } from '../lib/quiz';
import type { Card } from '../lib/types';

/** Make a card sound right when read aloud: no LaTeX/markdown symbols, blanks said as "blank". */
export function speakable(s: string) {
  return s
    .replace(/\$\$?([^$]+)\$\$?/g, (_, m: string) =>
      m
        .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '$1 over $2')
        .replace(/\^\{?2\}?/g, ' squared')
        .replace(/\^\{?3\}?/g, ' cubed')
        .replace(/\^\{?([^}\s]+)\}?/g, ' to the power of $1')
        .replace(/\\(sqrt)/g, 'square root of ')
        .replace(/\\[a-zA-Z]+/g, (w) => w.slice(1))
        .replace(/[{}]/g, ''),
    )
    .replace(/_{2,}/g, ' blank ')
    .replace(/\*\*|==|__|`/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type Phase = 'question' | 'thinking' | 'answer' | 'gap';

/** Hands-free review for walks: reads each due question, pauses for you to answer in your head, then reads the answer. */
export function ListenReview({ onClose }: { onClose: () => void }) {
  const { unlocked, reviews, setReviews, logReview } = useStore();
  const supported = typeof window !== 'undefined' && 'speechSynthesis' in window;
  const [queue] = useState<Card[]>(() => {
    const pool = unlocked.filter((c) => !c.image);
    const due = pool.filter((c) => isDue(reviews[c.id]));
    return shuffle(due.length ? due : pool).slice(0, 20);
  });
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>('question');
  const [playing, setPlaying] = useState(false);
  const [think, setThink] = useState(6);
  const [rate, setRate] = useState(1);
  const [graded, setGraded] = useState<Record<string, boolean>>({});
  const timer = useRef<number | null>(null);
  const card = queue[i];
  const done = i >= queue.length;

  const stopAll = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
    if (supported) window.speechSynthesis.cancel();
  };

  const say = (text: string, then: () => void) => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    // Some browsers never fire "end" (no voices, background tabs) — move on after a generous estimate anyway.
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (timer.current) window.clearTimeout(timer.current);
      then();
    };
    u.onend = finish;
    u.onerror = finish;
    timer.current = window.setTimeout(finish, 2500 + (text.split(/\s+/).length / (2.6 * rate)) * 1000);
    window.speechSynthesis.speak(u);
  };

  // Drive the sequence: question → think → answer → short gap → next.
  useEffect(() => {
    if (!supported || !playing || done) return;
    stopAll();
    if (phase === 'question') {
      const lead = card.kind === 'cloze' ? 'Fill in the blank. ' : card.kind === 'qa' && !card.ask && !hasMath(card.front) && !/\?\s*$/.test(card.front) ? 'Define: ' : '';
      say(`${lead}${speakable(card.front)}`, () => setPhase('thinking'));
    }
    else if (phase === 'thinking') timer.current = window.setTimeout(() => setPhase('answer'), think * 1000);
    else if (phase === 'answer') say(`Answer: ${speakable(card.back)}`, () => setPhase('gap'));
    else
      timer.current = window.setTimeout(() => {
        setI((x) => x + 1);
        setPhase('question');
      }, 1800);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, phase, i]);

  useEffect(() => () => stopAll(), []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (done) {
      setPlaying(false);
      if (supported) say(`That's all ${queue.length}. Nice work.`, () => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const next = () => {
    stopAll();
    setI((x) => x + 1);
    setPhase('question');
  };

  /** Optional: tap if you're looking at your phone — feeds spaced repetition like a normal review. */
  const grade = (knew: boolean) => {
    if (!card || card.id in graded) return;
    setGraded((g) => ({ ...g, [card.id]: knew }));
    setReviews((r) => ({ ...r, [card.id]: schedule(r[card.id], knew ? 'good' : 'again') }));
    logReview(knew, card);
  };

  const knew = Object.values(graded).filter(Boolean).length;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Listen mode">
      <div className="modal listen">
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              <Headphones size={12} /> Listen mode
            </div>
            <h3>Review on the go</h3>
          </div>
          <button
            className="icon-btn"
            onClick={() => {
              stopAll();
              onClose();
            }}
            aria-label="Close listen mode"
          >
            <X size={18} />
          </button>
        </div>

        {!supported ? (
          <p className="muted">This browser can’t read text aloud. Try Chrome, Edge or Safari.</p>
        ) : !queue.length ? (
          <p className="muted">Nothing to review yet — mark some sections as studied in Notes first.</p>
        ) : done ? (
          <div className="quiz-done">
            <div className="score">{Object.keys(graded).length ? `${knew}/${Object.keys(graded).length}` : queue.length}</div>
            <p>{Object.keys(graded).length ? 'Questions you tapped were saved to your reviews.' : `You listened to ${queue.length} questions. Answering in your head still counts as retrieval practice.`}</p>
            <button className="btn primary wide" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <>
            <p className="muted small">
              Put your phone in your pocket: Stillpoint reads a question, pauses so you can answer in your head, then reads the answer. {i + 1} of {queue.length}.
            </p>
            <div className={`listen-card phase-${phase}`}>
              <p className="listen-q">{card.front}</p>
              {(phase === 'answer' || phase === 'gap') && <p className="listen-a">{card.back}</p>}
              {phase === 'thinking' && playing && <p className="muted small listen-think">Thinking time…</p>}
            </div>
            <div className="listen-controls">
              <button className="play-btn" onClick={() => (playing ? (stopAll(), setPlaying(false)) : (setPhase('question'), setPlaying(true)))} aria-label={playing ? 'Pause' : 'Play'}>
                {playing ? <Pause size={20} /> : <Play size={20} />}
              </button>
              <button className="btn small" onClick={next} aria-label="Next question">
                <SkipForward size={14} /> Next
              </button>
              <span className="grow" />
              <button className={`btn small ${graded[card.id] === true ? 'primary' : ''}`} onClick={() => grade(true)} disabled={card.id in graded} title="Optional — saves to your reviews">
                <Check size={13} /> Knew it
              </button>
              <button className={`btn small ${graded[card.id] === false ? 'danger' : ''}`} onClick={() => grade(false)} disabled={card.id in graded}>
                Missed it
              </button>
            </div>
            <div className="row wrap listen-settings">
              <label className="small muted">
                Thinking time{' '}
                <select value={think} onChange={(e) => setThink(Number(e.target.value))}>
                  {[3, 6, 10, 15].map((s) => (
                    <option key={s} value={s}>
                      {s}s
                    </option>
                  ))}
                </select>
              </label>
              <label className="small muted">
                Voice speed{' '}
                <select value={rate} onChange={(e) => setRate(Number(e.target.value))}>
                  <option value={0.85}>Slower</option>
                  <option value={1}>Normal</option>
                  <option value={1.15}>Faster</option>
                </select>
              </label>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
