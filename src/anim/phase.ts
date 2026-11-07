// Quel(s) exercice(s) animer pendant une phase d'effort.

import type { Block } from '../data/types';
import type { Phase } from '../engine/phases';
import type { ExerciseId } from './exercises';
import { isExerciseId, matchExercise } from './exercises';

export interface PhaseAnim {
  id: ExerciseId;
  /** Nom tel qu'écrit dans la séance (« 10 burpees »). */
  name: string;
}

/**
 * Exercices reconnus pour une phase : celui du nom de la phase (Tabata, EMOM, créateur…),
 * sinon la liste des exercices du bloc (AMRAP, For Time…). L'exercice choisi dans le créateur passe avant.
 * Rien pendant la préparation et le repos.
 */
export function phaseAnims(ph: Phase | undefined, block: Block | undefined): PhaseAnim[] {
  if (!ph || ph.kind !== 'work') return [];
  // Choisi à la main dans le créateur : prioritaire sur le nom.
  if (isExerciseId(ph.exercise)) return [{ id: ph.exercise, name: ph.label }];
  const own = matchExercise(ph.label);
  if (own) return [{ id: own, name: ph.label }];
  const out: PhaseAnim[] = [];
  for (const e of block?.exercises ?? []) {
    const id = matchExercise(e.name);
    if (id) out.push({ id, name: [e.reps, e.name].filter(Boolean).join(' ') });
  }
  return out;
}
