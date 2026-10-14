import { useEffect, useState } from 'react';
import { Copy, Download, Link2, Share2, X } from 'lucide-react';
import { useStore } from '../store';
import type { Deck } from '../lib/types';
import { deckCards, deckSections } from '../lib/quiz';
import { downloadShared, fromShared, readShareCode, shareLink, type SharedDeck } from '../lib/share';

/** Long links can get cut off by some messaging apps; past this, suggest the file instead. */
const LONG_LINK = 8000;

/** Share panel inside a notes set: copy a link, use the phone/OS share sheet, or download a file. */
export function ShareBox({ deck }: { deck: Deck }) {
  const { diagrams } = useStore();
  const hasDiagrams = diagrams.some((d) => d.deckId === deck.id);
  const [link, setLink] = useState<string | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    let live = true;
    shareLink(deck)
      .then((l) => live && setLink(l))
      .catch(() => live && setMsg('This browser can’t make share links — use the file instead.'));
    return () => {
      live = false;
    };
  }, [deck]);

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setMsg('Link copied — paste it to a classmate.');
    } catch {
      setMsg('Couldn’t copy automatically — select the link above and copy it.');
    }
  };
  const nativeShare = async () => {
    if (!link) return;
    try {
      await navigator.share({ title: `${deck.title} — Stillpoint notes`, text: `My ${deck.title} notes for Stillpoint — opens with quizzes ready:`, url: link });
    } catch {
      /* cancelled */
    }
  };

  return (
    <div className="share-box">
      <div className="eyebrow">Share these notes</div>
      <p className="muted small">
        Anyone who opens the link gets a copy of these notes and questions in their own Stillpoint — your progress and ratings stay private. Nothing is uploaded; the notes travel inside the link.
      </p>
      {link ? (
        <>
          <input readOnly value={link} onFocus={(e) => e.target.select()} aria-label="Share link" />
          <div className="row wrap">
            <button className="btn small primary" onClick={() => void copy()}>
              <Copy size={13} /> Copy link
            </button>
            {'share' in navigator && (
              <button className="btn small" onClick={() => void nativeShare()}>
                <Share2 size={13} /> Share…
              </button>
            )}
            <button className="btn small" onClick={() => downloadShared(deck)}>
              <Download size={13} /> Download file
            </button>
          </div>
          {link.length > LONG_LINK && (
            <p className="muted small">These notes are long ({Math.round(link.length / 1000)}k characters), so some apps may cut the link off. If it doesn’t open properly, send the file instead — they can drop it into Notes → Upload files.</p>
          )}
        </>
      ) : (
        !msg && <p className="muted small">Making link…</p>
      )}
      {hasDiagrams && <p className="muted small">Diagrams aren’t included — images are too big for a link. Classmates can add their own from the same picture.</p>}
      {msg && <p className="small accent">{msg}</p>}
    </div>
  );
}

/** Opened a share link: preview the notes and add them to this Stillpoint. */
export function SharedImport({ onDone }: { onDone: (opened: boolean) => void }) {
  const { setDecks } = useStore();
  const [shared, setShared] = useState<SharedDeck | null>(null);
  const [error, setError] = useState('');
  const code = location.hash.startsWith('#share=') ? location.hash.slice(7) : '';

  useEffect(() => {
    if (!code) return;
    readShareCode(code)
      .then(setShared)
      .catch(() => setError('This share link is incomplete or broken — it may have been cut off when it was sent. Ask for the file version instead.'));
  }, [code]);

  const clearHash = () => history.replaceState(null, '', location.pathname + location.search);
  if (!code) return null;

  const preview = shared ? fromShared(shared) : null;
  const questions = preview ? deckCards(preview).length : 0;
  const sections = preview ? deckSections(preview).filter(Boolean).length : 0;

  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Shared notes">
      <div className="modal">
        <div className="modal-head">
          <div>
            <div className="eyebrow">
              <Link2 size={12} /> Shared with you
            </div>
            <h3>{shared ? shared.title : error ? 'Couldn’t open these notes' : 'Opening…'}</h3>
          </div>
          <button
            className="icon-btn"
            onClick={() => {
              clearHash();
              onDone(false);
            }}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
        {error && <p className="error small">{error}</p>}
        {shared && (
          <>
            <p className="muted">
              {shared.subject ? `${shared.subject} · ` : ''}
              {questions} question{questions === 1 ? '' : 's'}
              {sections > 1 ? ` across ${sections} sections` : ''}. Add them to your Stillpoint to quiz yourself and plan for the exam — your copy is yours to edit.
            </p>
            <div className="row">
              <button
                className="btn primary"
                onClick={() => {
                  setDecks((ds) => [preview!, ...ds]);
                  clearHash();
                  onDone(true);
                }}
              >
                Add to my notes
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  clearHash();
                  onDone(false);
                }}
              >
                No thanks
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
