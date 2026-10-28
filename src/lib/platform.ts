// Fonctions du téléphone : écran allumé, vibration, contrôles média,
// stockage persistant, et rappels (notifications du navigateur).

import type { ScheduledSession, Workout } from '../data/types';
import { upcomingReminders } from '../data/schedule';

// ---------- Écran toujours allumé ----------
// API Wake Lock. Elle peut être refusée hors d'un geste (iPhone) : on la redemande
// à chaque tap tant qu'elle n'est pas accordée, et à chaque retour dans l'app.
// Navigateurs sans cette API : vidéo en lecture (avec piste son silencieuse,
// non répétée en boucle, sinon le téléphone l'ignore pour la mise en veille).

let lock: WakeLockSentinel | null = null;
let wantLock = false;
let requesting = false;
let video: HTMLVideoElement | null = null;

const hasWakeLock = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

function fallbackVideo(): HTMLVideoElement {
  if (!video) {
    const v = document.createElement('video');
    v.src = 'keep-awake.mp4';
    v.playsInline = true;
    v.setAttribute('playsinline', '');
    v.setAttribute('aria-hidden', 'true');
    v.volume = 0;
    // Pas de « loop » : on revient au début juste avant la fin.
    v.addEventListener('timeupdate', () => {
      if (v.duration && v.currentTime > v.duration - 1) v.currentTime = 0.1;
    });
    Object.assign(v.style, { position: 'fixed', width: '2px', height: '2px', opacity: '0.01', pointerEvents: 'none', bottom: '0', left: '0' });
    document.body.appendChild(v);
    video = v;
  }
  return video;
}

function acquire(): void {
  if (!wantLock || document.visibilityState !== 'visible') return;
  if (!hasWakeLock()) {
    const v = fallbackVideo();
    if (v.paused) void v.play().catch(() => undefined);
    return;
  }
  if (lock || requesting) return;
  requesting = true;
  navigator.wakeLock.request('screen')
    .then((l) => {
      lock = l;
      l.addEventListener('release', () => (lock = null));
    })
    .catch(() => undefined)
    .finally(() => (requesting = false));
}

export function setKeepAwake(on: boolean): void {
  wantLock = on;
  if (on) acquire();
  else {
    if (lock) void lock.release();
    lock = null;
    video?.pause();
  }
}

/** Vrai si l'écran est réellement maintenu allumé en ce moment. */
export const keepingAwake = () => (hasWakeLock() ? !!lock : !!video && !video.paused);

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', acquire);
  document.addEventListener('pointerdown', () => {
    if (wantLock && !keepingAwake()) acquire();
  }, { capture: true, passive: true });
}

// ---------- Plein écran ----------

export function enterFullscreen(): void {
  const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
  try {
    if (el.requestFullscreen) void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => undefined);
    else el.webkitRequestFullscreen?.();
  } catch {
    /* non pris en charge (iPhone) : l'affichage agrandi suffit */
  }
}

export function exitFullscreen(): void {
  const d = document as Document & { webkitExitFullscreen?: () => void; webkitFullscreenElement?: Element };
  try {
    if (d.fullscreenElement) void d.exitFullscreen().catch(() => undefined);
    else if (d.webkitFullscreenElement) d.webkitExitFullscreen?.();
  } catch {
    /* rien à faire */
  }
}

// ---------- Vibration ----------

export function vibrate(pattern: number | number[]): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    /* non supporté */
  }
}

// ---------- Contrôles média (notification / écran verrouillé) ----------

export function setMediaSession(title: string, artist: string, handlers: { play?: () => void; pause?: () => void; next?: () => void } | null): void {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  try {
    if (!handlers) {
      ms.metadata = null;
      (['play', 'pause', 'nexttrack'] as MediaSessionAction[]).forEach((a) => ms.setActionHandler(a, null));
      return;
    }
    ms.metadata = new MediaMetadata({ title, artist, album: 'Chrono' });
    ms.setActionHandler('play', handlers.play ?? null);
    ms.setActionHandler('pause', handlers.pause ?? null);
    ms.setActionHandler('nexttrack', handlers.next ?? null);
  } catch {
    /* non supporté */
  }
}

// ---------- Stockage ----------

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    return (await navigator.storage?.persist?.()) ?? false;
  } catch {
    return false;
  }
}

export async function storageInfo(): Promise<{ usage: number; quota: number; persisted: boolean } | null> {
  try {
    const est = await navigator.storage?.estimate?.();
    const persisted = (await navigator.storage?.persisted?.()) ?? false;
    if (!est) return null;
    return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted };
  } catch {
    return null;
  }
}

// ---------- Rappels ----------

let webTimers: number[] = [];

export async function notificationPermission(): Promise<'granted' | 'denied' | 'default' | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  return Notification.permission;
}

export async function requestNotifications(): Promise<boolean> {
  if (typeof Notification === 'undefined') return false;
  return (await Notification.requestPermission()) === 'granted';
}

/**
 * Programme les rappels des prochaines 24 h.
 * Rappel uniquement si l'app est ouverte (limite du navigateur).
 */
export async function syncReminders(schedules: ScheduledSession[], workouts: Workout[]): Promise<number> {
  const names = new Map(workouts.map((w) => [w.id, w.name]));
  const list = upcomingReminders(schedules, new Date(), 30).slice(0, 60);
  const body = (sid: string, at: Date, minutes: number | null) =>
    `${names.get(sid) ?? 'Séance'} à ${new Date(at.getTime() + (minutes ?? 0) * 60_000).toTimeString().slice(0, 5)}`;

  webTimers.forEach((t) => clearTimeout(t));
  webTimers = [];
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return 0;
  const horizon = Date.now() + 24 * 3600_000;
  for (const r of list.filter((x) => x.at.getTime() < horizon)) {
    webTimers.push(
      window.setTimeout(() => {
        const text = body(r.sched.workoutId, r.at, r.sched.reminderMinutes);
        navigator.serviceWorker?.ready
          .then((reg) => reg.showNotification('Séance prévue', { body: text, icon: 'icon-192.png', tag: r.sched.id + r.date }))
          .catch(() => new Notification('Séance prévue', { body: text }));
      }, r.at.getTime() - Date.now()),
    );
  }
  return webTimers.length;
}
