import type { Block, Mode, Settings, SoundSettings, Workout } from './types';
import { uid } from '../lib/format';

export const DEFAULT_SOUND: SoundSettings = {
  master: 0.9,
  beepVolume: 0.8,
  voiceVolume: 1,
  events: {
    start: { enabled: true, sound: 'aigu' },
    workEnd: { enabled: true, sound: 'double' },
    restEnd: { enabled: true, sound: 'aigu' },
    countdown: { enabled: true, sound: 'bip' },
    halfway: { enabled: true, sound: 'cloche' },
    finish: { enabled: true, sound: 'gong' },
  },
  voice: true,
  announcePhase: true,
  announceRound: true,
  announceRemaining: true,
  countdownBeeps: 3,
  silent: false,
  background: true,
};

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings',
  sound: DEFAULT_SOUND,
  prepSeconds: 10,
  vibration: true,
  keepAwake: true,
  theme: 'light',
  saveMode: 'ask',
  historyMonths: 0,
};

/** Fusionne des réglages partiels (anciens ou surchargés) avec les valeurs par défaut. */
export function mergeSound(base: SoundSettings, over?: Partial<SoundSettings>): SoundSettings {
  if (!over) return base;
  return { ...base, ...over, events: { ...base.events, ...(over.events ?? {}) } };
}

export function normalizeSettings(s: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(s ?? {}),
    id: 'settings',
    sound: mergeSound(DEFAULT_SOUND, s?.sound),
  };
}

export function defaultBlock(mode: Mode): Block {
  const params: Block['params'] = (() => {
    switch (mode) {
      case 'amrap': return { duration: 12 * 60 };
      case 'fortime': return { duration: 0 };
      case 'emom': return { interval: 60, rounds: 10 };
      case 'tabata': return { work: 20, rest: 10, rounds: 8, sets: 1, setRest: 60 };
      case 'interval': return { work: 40, rest: 20, rounds: 10, sets: 1, setRest: 60 };
      case 'stopwatch': return {};
      case 'countdown': return { duration: 5 * 60 };
      case 'custom': return {
        repeats: 3,
        steps: [
          { name: 'Squats', duration: 40, kind: 'work' },
          { name: 'Repos', duration: 20, kind: 'rest' },
          { name: 'Pompes', duration: 40, kind: 'work' },
          { name: 'Repos', duration: 20, kind: 'rest' },
        ],
      };
      case 'strength': return {
        lifts: [{ name: 'Squat', sets: 4, reps: '8', load: '', rest: 90 }],
      };
      case 'run': return {
        repeats: 1,
        segments: [
          { name: 'Échauffement', duration: 600, kind: 'work', pace: 'facile' },
          { name: 'Rapide', duration: 60, kind: 'work', pace: '4:30/km' },
          { name: 'Récup', duration: 60, kind: 'rest', pace: 'marche' },
        ],
      };
    }
  })();
  return { id: uid(), mode, params, exercises: [], restAfter: 0 };
}

export function newWorkout(name = 'Nouvelle séance'): Workout {
  const now = Date.now();
  return { id: uid(), name, description: '', tags: [], favorite: false, blocks: [defaultBlock('amrap')], prepSeconds: null, createdAt: now, updatedAt: now };
}

export const SUGGESTED_TAGS = ['cardio', 'force', 'mobilité', 'HIIT', 'course', 'gainage', 'full body'];
