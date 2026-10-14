import { useState } from 'react';
import { Cloud, CloudOff, LogOut, RefreshCw } from 'lucide-react';
import { deleteAccount, resolveChoice, signIn, signOut, syncAvailable, syncNow, useSync } from '../lib/sync';

const ago = (t: number) => {
  const s = Math.round((Date.now() - t) / 1000);
  return s < 60 ? 'just now' : s < 3600 ? `${Math.round(s / 60)} min ago` : new Date(t).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', month: 'short', day: 'numeric' });
};

/** Settings → Account & sync. Hidden entirely until sync is configured. */
export function AccountSection() {
  const sync = useSync();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!syncAvailable) return null;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card account">
      <div className="eyebrow">Account & sync</div>
      {!sync.user ? (
        <>
          <p className="muted small">Sign in to keep your notes, progress and plans in sync between your laptop and phone. Optional — Stillpoint works fully without an account.</p>
          <button className="btn primary google-btn" disabled={busy || sync.status === 'syncing'} onClick={() => void run(signIn)}>
            <GoogleMark /> {sync.status === 'syncing' ? 'Signing in…' : 'Sign in with Google'}
          </button>
          <p className="small muted">Status: not signed in on this device.</p>
          {sync.error && <p className="error small">{sync.error}</p>}
        </>
      ) : (
        <>
          <div className="row between">
            <span className="small">
              Signed in as <strong>{sync.user.email}</strong>
            </span>
            <button className="btn small ghost" onClick={() => void run(signOut)} disabled={busy}>
              <LogOut size={13} /> Sign out
            </button>
          </div>
          <div className="row sync-row">
            {sync.status === 'error' ? <CloudOff size={14} className="danger-ink" /> : <Cloud size={14} className="accent" />}
            <span className="small grow">
              {sync.status === 'syncing'
                ? 'Syncing…'
                : sync.status === 'error'
                  ? `Couldn’t sync (${sync.error}). Your notes are safe on this device; it’ll retry.`
                  : sync.status === 'needs-choice'
                    ? 'Waiting for you to choose which copy to keep.'
                    : sync.lastSync
                      ? `Synced ${ago(sync.lastSync)}`
                      : 'Connected'}
            </span>
            <button className="icon-btn small" onClick={() => void syncNow()} aria-label="Sync now" title="Sync now">
              <RefreshCw size={13} />
            </button>
          </div>
          <p className="muted small">Changes sync a few seconds after you make them, and when you come back to Stillpoint. If you edit the same thing on two devices at once, the most recent edit wins.</p>
          <details className="small">
            <summary className="muted">Delete my account</summary>
            <p className="muted">Deletes your account and the cloud copy of your data. Notes on this device stay here.</p>
            <button
              className="btn small danger"
              disabled={busy}
              onClick={() => confirm('Delete your Stillpoint account and its cloud copy? This can’t be undone. Notes on this device stay.') && void run(deleteAccount)}
            >
              Delete account & cloud data
            </button>
          </details>
        </>
      )}
      {error && <p className="error small">{error}</p>}
      <details className="small privacy">
        <summary className="muted">Privacy</summary>
        <p className="muted">
          Without an account, everything stays in this browser and nothing is sent anywhere except anonymous visit counts. With an account, your Stillpoint data (notes, questions, progress, plans,
          settings and images you add) is stored in a private database only your account can read, so it can sync between your devices. Your Google name, email and Google account ID are used only to sign
          you in. Nothing is sold or shared, and you can delete your account and cloud copy at any time from here.
        </p>
      </details>
    </section>
  );
}

/** After signing in on a device that already has notes, while the account has notes too. */
export function SyncChoice() {
  const sync = useSync();
  if (sync.status !== 'needs-choice' || !sync.choice) return null;
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Choose which data to keep">
      <div className="modal">
        <div className="eyebrow">Account & sync</div>
        <h3>This device and your account both have notes</h3>
        <p className="muted">Which copy should Stillpoint keep? The other one will be replaced. If you’re not sure, download a backup first from Settings → Your data.</p>
        <div className="stack-sm">
          <button className="btn primary" onClick={() => void resolveChoice('account')}>
            Use my account’s data <span className="muted small">— recommended if you’ve used Stillpoint elsewhere</span>
          </button>
          <button className="btn" onClick={() => void resolveChoice('device')}>
            Use this device’s data <span className="muted small">— replaces what’s in your account</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z" />
    </svg>
  );
}
