// Fonctions du téléphone : écran allumé, vibration, contrôles média,
// stockage persistant, et rappels (notifications du navigateur).

import type { ScheduledSession, Workout } from '../data/types';
import { upcomingReminders } from '../data/schedule';

// ---------- Écran toujours allumé ----------

let lock: WakeLockSentinel | null = null;
let wantLock = false;

async function acquire(): Promise<void> {
  if (!wantLock || lock || !('wakeLock' in navigator) || document.visibilityState !== 'visible') return;
  try {
    lock = await navigator.wakeLock.request('screen');
    lock.addEventListener('release', () => (lock = null));
  } catch {
    lock = null;
  }
}

export function setKeepAwake(on: boolean): void {
  wantLock = on;
  if (on) void acquire();
  else if (lock) {
    void lock.release();
    lock = null;
  }
}

if (typeof document !== 'undefined') {
  // Le verrou est perdu quand l'app passe en arrière-plan : on le reprend au retour.
  document.addEventListener('visibilitychange', () => void acquire());
}

export const wakeLockSupported = () => typeof navigator !== 'undefined' && 'wakeLock' in navigator;

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
