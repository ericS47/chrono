// Routeur minimal par hash (#/planning) : marche sur GitHub Pages, hors-ligne et dans Capacitor.

import { useSyncExternalStore } from 'react';

const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

const read = () => window.location.hash.replace(/^#/, '') || '/';

export function useRoute(): string[] {
  const path = useSyncExternalStore(subscribe, read, () => '/');
  return path.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
}

export function useQuery(): URLSearchParams {
  const path = useSyncExternalStore(subscribe, read, () => '/');
  return new URLSearchParams(path.split('?')[1] ?? '');
}

export function go(path: string, replace = false): void {
  const h = '#' + path;
  if (replace) window.location.replace(h);
  else window.location.hash = path;
}

export function back(fallback = '/'): void {
  if (window.history.length > 1) window.history.back();
  else go(fallback, true);
}
