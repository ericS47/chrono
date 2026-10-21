// Séance en cours : relie le moteur pur (timer.ts) au son, à la vibration
// et à l'interface. Un seul chrono tourne à la fois.

import { useSyncExternalStore } from 'react';
import type { SoundSettings, Workout } from '../data/types';
import { audio } from '../audio/audio';
import { computeCues } from './cues';
import { buildPhases, type Phase } from './phases';
import * as T from './timer';
import { setMediaSession, vibrate } from '../lib/platform';

export interface Session {
  workout: Workout;
  phases: Phase[];
  run: T.RunState;
  sound: SoundSettings;
  vibration: boolean;
  /** Séance lancée depuis le chrono rapide (pas encore dans la bibliothèque). */
  quick: boolean;
  scheduledId?: string;
  scheduledDate?: string;
  /** Son coupé depuis l'écran du chrono. */
  muted: boolean;
}

let current: Session | null = null;
let timer: number | null = null;
const listeners = new Set<() => void>();
let onFinish: (() => void) | null = null;

const emit = () => listeners.forEach((l) => l());
const now = () => performance.now();

function set(s: Session | null): void {
  current = s;
  emit();
}

export function getSession(): Session | null {
  return current;
}

export function useSession(): Session | null {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null,
  );
}

export function setFinishHandler(fn: (() => void) | null): void {
  onFinish = fn;
}

function effectiveSound(s: Session): SoundSettings {
  return s.muted ? { ...s.sound, silent: true } : s.sound;
}

function reschedule(s: Session, includeEntry: boolean): void {
  const r = s.run;
  if (r.status !== 'running') {
    audio.cancel();
    return;
  }
  audio.schedule(computeCues(s.phases, r.index, T.elapsed(r, now()) / 1000, effectiveSound(s), includeEntry), effectiveSound(s));
}

function buzz(s: Session, ph: Phase | undefined): void {
  if (!s.vibration || !ph) return;
  vibrate(ph.kind === 'rest' ? [400] : [180, 90, 180]);
}

function media(s: Session): void {
  const ph = s.phases[s.run.index];
  if (s.run.status === 'finished' || !ph) {
    setMediaSession('', '', null);
    return;
  }
  const where = ph.rounds && ph.round ? `Tour ${ph.round}/${ph.rounds} – ` : '';
  setMediaSession(`${where}${ph.kind === 'rest' ? 'Repos' : ph.label}`, s.workout.name, {
    play: () => toggle(),
    pause: () => toggle(),
    next: () => skip(),
  });
}

function loop(): void {
  if (timer !== null) return;
  timer = window.setInterval(() => {
    if (!current || current.run.status !== 'running') return;
    const { state, events } = T.tick(current.run, now());
    if (!events.length) return;
    const s = { ...current, run: state };
    set(s);
    handleEvents(s, events);
  }, 200);
}

function stopLoop(): void {
  if (timer !== null) clearInterval(timer);
  timer = null;
}

function handleEvents(s: Session, events: T.EngineEvent[]): void {
  for (const e of events) {
    if (e.type === 'phase') buzz(s, s.phases[e.index]);
    if (e.type === 'finish') {
      if (s.vibration) vibrate([300, 120, 300, 120, 600]);
      finished();
    }
  }
  media(s);
}

function finished(): void {
  stopLoop();
  setMediaSession('', '', null);
  // Laisse le gong de fin se jouer : pas d'annulation audio ici.
  onFinish?.();
}

export interface StartOptions {
  prepSeconds: number;
  sound: SoundSettings;
  vibration: boolean;
  quick?: boolean;
  scheduledId?: string;
  scheduledDate?: string;
}

/** Prépare une séance (sans la démarrer) : l'écran du chrono affiche « Démarrer ». */
export function prepareSession(workout: Workout, o: StartOptions): Session {
  const phases = buildPhases(workout, o.prepSeconds);
  audio.cancel();
  stopLoop();
  const s: Session = {
    workout, phases, run: T.createRun(phases), sound: o.sound, vibration: o.vibration, quick: !!o.quick,
    scheduledId: o.scheduledId, scheduledDate: o.scheduledDate, muted: false,
  };
  set(s);
  return s;
}

function update(fn: (r: T.RunState, t: number) => { state: T.RunState; events: T.EngineEvent[] } | T.RunState, includeEntry: boolean): void {
  if (!current) return;
  const t = now();
  const res = fn(current.run, t);
  const { state, events } = 'phases' in res ? { state: res, events: [] as T.EngineEvent[] } : res;
  const s = { ...current, run: state };
  set(s);
  reschedule(s, includeEntry);
  if (events.length) handleEvents(s, events);
  else media(s);
}

export function begin(): void {
  audio.unlock();
  update((r, t) => T.start(r, t), true);
  loop();
}

export function toggle(): void {
  if (!current) return;
  audio.unlock();
  const st = current.run.status;
  if (st === 'idle') return begin();
  if (st === 'running') update((r, t) => T.pause(r, t), false);
  else if (st === 'paused') update((r, t) => T.resume(r, t), false);
}

export function skip(): void {
  audio.unlock();
  const wasIdle = current?.run.status === 'idle';
  update((r, t) => T.next(r, t), true);
  if (wasIdle) loop();
}

export function back(): void {
  update((r, t) => T.prev(r, t), true);
}

export function addRound(delta = 1): void {
  if (!current) return;
  set({ ...current, run: T.addRound(current.run, delta) });
  if (current.vibration && delta > 0) vibrate(40);
}

export function lap(): void {
  if (!current) return;
  set({ ...current, run: T.lap(current.run, now()) });
}

export function setMuted(muted: boolean): void {
  if (!current) return;
  const s = { ...current, muted };
  set(s);
  reschedule(s, false);
}

/** Arrête la séance (bouton « Terminer ») : elle passe à l'état terminé. */
export function finishNow(): void {
  if (!current) return;
  audio.cancel();
  set({ ...current, run: T.stop(current.run, now()) });
  finished();
}

/** Abandonne et oublie la séance. */
export function discard(): void {
  audio.cancel();
  stopLoop();
  setMediaSession('', '', null);
  set(null);
}

export const clock = now;
