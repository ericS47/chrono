// Contenu de la mini-fenêtre (image dans l'image) : calculé depuis la séance et l'heure,
// sans rien compter (le temps vient toujours de l'heure de début de phase).

import type { Session } from '../engine/session';
import * as T from '../engine/timer';
import { fmtClock } from './format';

export interface PipView {
  /** Couleur de fond (couleurs de phase du design). */
  bg: string;
  word: string;
  time: string;
  sub: string;
  /** « Tour 2/8 », « Série 1/4 » ou vide. */
  count: string;
  /** Avancement de la phase (0 à 1), null pour une phase ouverte. */
  progress: number | null;
}

export const PIP_COLORS = { work: '#FFBE98', rest: '#DDE2EA', prep: '#D9DCF7', done: '#CFE8DC' } as const;

export function pipView(s: Session | null, now: number): PipView {
  if (!s) return { bg: PIP_COLORS.done, word: 'CHRONO', time: '--:--', sub: 'Aucune séance en cours', count: '', progress: null };
  const r = s.run;
  if (r.status === 'finished') {
    return { bg: PIP_COLORS.done, word: 'BRAVO', time: fmtClock(T.activeTime(r) / 1000), sub: s.workout.name, count: '', progress: 1 };
  }
  const ph = s.phases[r.index];
  const next = s.phases[r.index + 1];
  if (r.status === 'idle' || !ph) {
    return { bg: PIP_COLORS.prep, word: 'PRÊT ?', time: '00', sub: s.workout.name, count: '', progress: 0 };
  }
  const el = T.elapsed(r, now);
  const rem = T.remaining(r, now);
  let time: string;
  if (ph.countUp || rem === null) time = fmtClock(el / 1000);
  else {
    const sec = Math.ceil(rem / 1000);
    time = sec < 60 ? String(sec).padStart(2, '0') : fmtClock(sec);
  }
  const word = r.status === 'paused' ? 'EN PAUSE' : ph.kind === 'prep' ? 'PRÊT ?' : ph.kind === 'rest' ? 'REPOS' : 'EFFORT';
  const nextText = next ? `Ensuite : ${next.kind === 'rest' ? 'Repos' : next.label}` : 'Dernière étape';
  const generic = ['Effort', 'AMRAP', 'For Time', 'Chrono', 'Minuteur', 'Préparation'];
  const sub = ph.kind === 'work' && !generic.includes(ph.label) ? ph.label : nextText;
  const count = ph.rounds && ph.round ? `Tour ${ph.round}/${ph.rounds}` : ph.sets && ph.set ? `Série ${ph.set}/${ph.sets}` : '';
  return {
    bg: ph.kind === 'work' ? PIP_COLORS.work : ph.kind === 'rest' ? PIP_COLORS.rest : PIP_COLORS.prep,
    word, time, sub, count,
    progress: ph.duration ? T.progress(r, now) : null,
  };
}
