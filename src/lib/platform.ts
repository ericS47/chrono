// Fonctions du téléphone : écran allumé, vibration, contrôles média,
// stockage persistant, et rappels (notifications du navigateur).

import type { ScheduledSession, Workout } from '../data/types';
import { upcomingReminders } from '../data/schedule';

// ---------- Écran toujours allumé ----------
// API Wake Lock quand elle marche ; sinon (anciens iPhone, app sur l'écran d'accueil)
// une petite vidéo muette jouée en boucle empêche aussi la mise en veille.

let lock: WakeLockSentinel | null = null;
let wantLock = false;
let video: HTMLVideoElement | null = null;

// Sur iPhone, l'API Wake Lock est acceptée mais inopérante dans l'app installée
// avant iOS 18.4 : on garde la vidéo en plus.
const isIOS = typeof navigator !== 'undefined'
  && (/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

function fallbackVideo(): HTMLVideoElement {
  if (!video) {
    video = document.createElement('video');
    video.src = 'keep-awake.mp4';
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.setAttribute('aria-hidden', 'true');
    Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0', pointerEvents: 'none', top: '0', left: '0' });
    document.body.appendChild(video);
  }
  return video;
}

const hasWakeLock = () => 'wakeLock' in navigator;
const useVideo = () => isIOS || !hasWakeLock();
let requesting = false;

function playVideo(): void {
  const v = fallbackVideo();
  if (v.paused) void v.play().catch(() => undefined);
}

function acquire(): void {
  if (!wantLock || document.visibilityState !== 'visible') return;
  // Lancée tout de suite (sans attendre) : iPhone exige qu'elle démarre pendant le tap.
  if (useVideo()) playVideo();
  if (!hasWakeLock() || lock || requesting) return;
  requesting = true;
  navigator.wakeLock.request('screen')
    .then((l) => {
      lock = l;
      l.addEventListener('release', () => (lock = null));
    })
    .catch(() => playVideo())
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
export const keepingAwake = () => (useVideo() ? !!video && !video.paused : !!lock);

if (typeof document !== 'undefined') {
  // Le verrou est perdu quand l'app passe en arrière-plan : on le reprend au retour,
  // et à chaque tap (certains navigateurs exigent un geste pour l'accorder).
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
