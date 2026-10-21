import type { Settings, Workout } from '../data/types';
import { mergeSound } from '../data/defaults';
import { prepareSession } from '../engine/session';
import { audio } from '../audio/audio';
import { go } from './router';

export function launchWorkout(
  w: Workout,
  settings: Settings,
  opts: { quick?: boolean; scheduledId?: string; scheduledDate?: string; prepSeconds?: number } = {},
): void {
  audio.unlock();
  prepareSession(w, {
    prepSeconds: opts.prepSeconds ?? w.prepSeconds ?? settings.prepSeconds,
    sound: mergeSound(settings.sound, w.sound),
    vibration: settings.vibration,
    quick: opts.quick,
    scheduledId: opts.scheduledId,
    scheduledDate: opts.scheduledDate,
  });
  go('/chrono');
}
