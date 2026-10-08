import { useEffect, useState } from 'react';

/* ---------- service worker: offline support + update notice ---------- */

type Listener = (ready: boolean) => void;
let waiting: ServiceWorker | null = null;
const listeners = new Set<Listener>();
const announce = () => listeners.forEach((l) => l(!!waiting));

export function registerServiceWorker() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      const track = (sw: ServiceWorker | null) => {
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          // Only show "update available" when replacing an existing version, not on first install.
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            waiting = sw;
            announce();
          }
        });
      };
      if (reg.waiting && navigator.serviceWorker.controller) {
        waiting = reg.waiting;
        announce();
      }
      reg.addEventListener('updatefound', () => track(reg.installing));
      // Check for a new version now and then (installed apps can stay open for days).
      setInterval(() => void reg.update(), 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void reg.update());
    } catch {
      /* offline support is a bonus; the app works without it */
    }
  });
  let reloading = false;
  navigator.serviceWorker?.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
}

export function applyUpdate() {
  waiting?.postMessage('skip-waiting');
}

export function useUpdateAvailable() {
  const [ready, setReady] = useState(!!waiting);
  useEffect(() => {
    listeners.add(setReady);
    return () => void listeners.delete(setReady);
  }, []);
  return ready;
}

/* ---------- install ---------- */

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

let deferred: InstallPromptEvent | null = null;
const installListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // we show our own button instead of the browser's mini-infobar
    deferred = e as InstallPromptEvent;
    installListeners.forEach((l) => l());
  });
  window.addEventListener('appinstalled', () => {
    deferred = null;
    installListeners.forEach((l) => l());
  });
}

export type InstallMethod = 'prompt' | 'safari-mac' | 'ios' | 'other';

function detect(): InstallMethod {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg|OPR|Firefox/.test(ua)) return 'safari-mac';
  return 'other';
}

export function isInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function useInstall() {
  const [, force] = useState(0);
  useEffect(() => {
    const l = () => force((x) => x + 1);
    installListeners.add(l);
    const mq = window.matchMedia('(display-mode: standalone)');
    mq.addEventListener('change', l);
    return () => {
      installListeners.delete(l);
      mq.removeEventListener('change', l);
    };
  }, []);
  const installed = isInstalled();
  const method: InstallMethod = deferred ? 'prompt' : detect();
  const install = async () => {
    if (!deferred) return false;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    force((x) => x + 1);
    return outcome === 'accepted';
  };
  return { installed, method, canPrompt: !!deferred, install };
}
