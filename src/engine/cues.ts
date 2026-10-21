// Calcul à l'avance de tous les signaux sonores et annonces vocales à venir,
// pour qu'ils soient programmés d'un coup dans le moteur audio (Web Audio)
// et jouent même si la page est ralentie.

import type { SoundEvent, SoundSettings } from '../data/types';
import type { Phase } from './phases';

export interface Cue {
  /** Secondes à partir de maintenant. */
  at: number;
  event?: SoundEvent;
  say?: string;
}

const NUM_FR = ['zéro', 'un', 'deux', 'trois', 'quatre', 'cinq'];

/** Son joué à l'entrée dans la phase i. */
export function entryEvent(phases: Phase[], i: number): SoundEvent | null {
  const ph = phases[i];
  if (!ph || ph.kind === 'prep') return null;
  if (ph.kind === 'rest') return 'workEnd';
  const prevPh = phases[i - 1];
  if (!prevPh || prevPh.kind === 'prep') return 'start';
  return prevPh.kind === 'rest' ? 'restEnd' : 'workEnd';
}

/** Annonce vocale à l'entrée dans la phase i. */
export function entrySpeech(phases: Phase[], i: number, s: SoundSettings): string | undefined {
  const ph = phases[i];
  if (!ph || !s.voice || s.silent) return undefined;
  const parts: string[] = [];
  if (s.announcePhase) {
    if (ph.kind === 'prep') parts.push('Préparation');
    else if (ph.kind === 'rest') parts.push(ph.label === 'Transition' ? 'Repos' : ph.label);
    else if (ph.label === 'Effort' || ph.label === ph.mode?.toUpperCase()) parts.push('Go');
    else parts.push(ph.label);
  }
  if (s.announceRound && ph.kind === 'work') {
    if (ph.rounds && ph.rounds > 1 && ph.round) parts.push(`Tour ${ph.round} sur ${ph.rounds}`);
    else if (ph.sets && ph.sets > 1 && ph.set) parts.push(`Série ${ph.set} sur ${ph.sets}`);
  }
  return parts.length ? parts.join('. ') : undefined;
}

/**
 * Signaux à venir à partir de la phase `index`, dont `elapsedSec` secondes
 * sont déjà écoulées. S'arrête à la première phase ouverte (durée inconnue).
 * `includeEntry` : jouer aussi le signal d'entrée de la phase courante.
 */
export function computeCues(
  phases: Phase[],
  index: number,
  elapsedSec: number,
  s: SoundSettings,
  includeEntry = false,
): Cue[] {
  const cues: Cue[] = [];
  const ev = (e: SoundEvent) => !s.silent && s.events[e].enabled;
  let t0 = -elapsedSec;

  for (let i = index; i < phases.length; i++) {
    const ph = phases[i];
    if (i > index || includeEntry) {
      const e = entryEvent(phases, i);
      const say = entrySpeech(phases, i, s);
      if (e && ev(e)) cues.push({ at: t0, event: e });
      if (say) cues.push({ at: t0 + 0.35, say });
    }
    if (ph.duration === null) break;
    const d = ph.duration;
    const end = t0 + d;

    if (ph.kind === 'work' && d >= 60 && s.events.halfway.enabled && !s.silent) {
      cues.push({ at: t0 + d / 2, event: 'halfway', say: s.voice ? 'Mi-temps' : undefined });
    }
    if (s.voice && s.announceRemaining && !s.silent) {
      if (d >= 180) cues.push({ at: end - 60, say: 'Plus qu’une minute' });
      if (d >= 60) cues.push({ at: end - 30, say: '30 secondes' });
      else if (d >= 25 && ph.kind === 'rest') cues.push({ at: end - 10, say: '10 secondes' });
    }
    const n = Math.min(Math.max(0, Math.round(s.countdownBeeps)), 5);
    if (ev('countdown') && d > n) {
      for (let k = n; k >= 1; k--) {
        // La voix ne compte pas « 3-2-1 » si les bips sont actifs : les bips suffisent.
        cues.push({ at: end - k, event: 'countdown' });
      }
    } else if (s.voice && !s.silent && n > 0 && d > n) {
      for (let k = n; k >= 1; k--) cues.push({ at: end - k, say: NUM_FR[k] });
    }
    if (i === phases.length - 1) {
      if (ev('finish')) cues.push({ at: end, event: 'finish' });
      if (s.voice && !s.silent) cues.push({ at: end + 0.4, say: 'Séance terminée' });
    }
    t0 = end;
  }
  return cues.filter((c) => c.at >= -0.05).sort((a, b) => a.at - b.at);
}
