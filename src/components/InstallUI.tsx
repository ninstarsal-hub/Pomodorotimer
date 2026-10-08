import { Download, RefreshCw, X } from 'lucide-react';
import { usePersistentState } from '../lib/storage';
import { applyUpdate, useInstall, useUpdateAvailable } from '../lib/pwa';

/** Small "Install" button in the top bar — only when the browser can install it and it isn't installed yet. */
export function InstallButton() {
  const { installed, canPrompt, install } = useInstall();
  const [dismissed, setDismissed] = usePersistentState('installDismissed', false);
  if (installed || !canPrompt || dismissed) return null;
  return (
    <span className="install-pill">
      <button className="install-btn" onClick={() => void install()} title="Install Stillpoint as an app — its own window, works offline">
        <Download size={14} /> Install app
      </button>
      <button className="install-x" onClick={() => setDismissed(true)} aria-label="Hide install button" title="Hide (you can install later from Settings)">
        <X size={12} />
      </button>
    </span>
  );
}

/** "Install the app" section for Settings, with instructions for browsers that have no install prompt. */
export function InstallSection() {
  const { installed, method, install } = useInstall();
  return (
    <section className="card">
      <div className="eyebrow">Install as an app</div>
      {installed ? (
        <p className="small">
          ✓ You’re using the installed app. It works offline and updates itself. Your data is shared with this browser’s version of the site.
        </p>
      ) : (
        <>
          <p className="muted small">Get Stillpoint in its own window with a Dock/taskbar icon. It works offline, updates automatically, and it’s free. Your notes and progress carry over.</p>
          {method === 'prompt' && (
            <button className="btn primary" onClick={() => void install()}>
              <Download size={14} /> Install Stillpoint
            </button>
          )}
          {method === 'safari-mac' && (
            <p className="small">
              In Safari, choose <strong>File → Add to Dock</strong> (macOS Sonoma or later), or click the <strong>Share</strong> button → <strong>Add to Dock</strong>.
            </p>
          )}
          {method === 'ios' && (
            <p className="small">
              Tap the <strong>Share</strong> button, then <strong>Add to Home Screen</strong>.
            </p>
          )}
          {method === 'other' && (
            <p className="small">
              In <strong>Chrome</strong> or <strong>Edge</strong>, click the install icon at the right end of the address bar (or menu → <strong>Install Stillpoint</strong> / <strong>Apps → Install this site as an app</strong>). Firefox doesn’t support installing sites yet.
            </p>
          )}
        </>
      )}
    </section>
  );
}

/** Bottom toast when a new version has been downloaded in the background. */
export function UpdateToast() {
  const ready = useUpdateAvailable();
  if (!ready) return null;
  return (
    <div className="update-toast" role="status">
      <RefreshCw size={14} className="accent" />
      <span>A new version of Stillpoint is ready.</span>
      <button className="btn small primary" onClick={applyUpdate}>
        Refresh
      </button>
    </div>
  );
}
