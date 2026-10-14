import { useState } from 'react';
import { Copy, ExternalLink, X } from 'lucide-react';

/** Instagram, TikTok, Snapchat… open links in their own mini-browser with separate storage. */
export function inAppBrowser(): string | null {
  const ua = navigator.userAgent;
  if (/Instagram/i.test(ua)) return 'Instagram';
  if (/FBAN|FBAV|FB_IAB|FBIOS/i.test(ua)) return 'Facebook';
  if (/musical_ly|TikTok|Bytedance|BytedanceWebview/i.test(ua)) return 'TikTok';
  if (/Snapchat/i.test(ua)) return 'Snapchat';
  if (/\bLine\//i.test(ua)) return 'LINE';
  if (/Twitter/i.test(ua)) return 'X';
  if (/LinkedInApp/i.test(ua)) return 'LinkedIn';
  return null;
}

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent);

/** "Open this in Safari/Chrome" — otherwise notes saved here disappear when they open the site normally. */
export function InAppBanner() {
  const app = inAppBrowser();
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem('stillpoint:inAppHidden') === '1';
    } catch {
      return false;
    }
  });
  const [copied, setCopied] = useState(false);
  if (!app || hidden) return null;

  const url = location.origin + '/';
  const ios = isIOS();
  const openChrome = () => {
    // Android: hand the page to Chrome directly.
    location.href = `intent://${location.host}/#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`;
  };

  return (
    <div className="inapp-banner" role="status">
      <div className="grow">
        <strong>Open in {ios ? 'Safari' : 'your browser'} to keep your notes</strong>
        <span className="small">
          {app}’s built-in browser keeps its own storage, so anything you save here won’t be there next time.{' '}
          {ios ? 'Tap ••• (top right) → “Open in external browser”, or copy the link into Safari.' : 'Tap below, or use ⋮ → “Open in Chrome”.'}
        </span>
      </div>
      <div className="row">
        {!ios && (
          <button className="btn small primary" onClick={openChrome}>
            <ExternalLink size={13} /> Open in Chrome
          </button>
        )}
        <button
          className={`btn small ${ios ? 'primary' : ''}`}
          onClick={() =>
            void navigator.clipboard
              ?.writeText(url)
              .then(() => setCopied(true))
              .catch(() => {})
          }
        >
          <Copy size={13} /> {copied ? 'Copied' : 'Copy link'}
        </button>
        <button
          className="icon-btn small"
          aria-label="Dismiss"
          onClick={() => {
            setHidden(true);
            try {
              sessionStorage.setItem('stillpoint:inAppHidden', '1');
            } catch {
              /* ignore */
            }
          }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
