// Mémo sportif : des paires de cartes « exercice », retournées deux par deux.
// Paire trouvée : retirée, un point, pas d'exercice, on rejoue. Sinon : les deux exercices, et au suivant.

import { shuffle, type Rng } from './battleship';

export type LevelId = 'facile' | 'moyen' | 'difficile' | 'expert';

export const LEVELS: { id: LevelId; label: string; pairs: number; cols: number }[] = [
  { id: 'facile', label: 'Facile', pairs: 6, cols: 3 },
  { id: 'moyen', label: 'Moyen', pairs: 8, cols: 4 },
  { id: 'difficile', label: 'Difficile', pairs: 10, cols: 4 },
  { id: 'expert', label: 'Expert', pairs: 12, cols: 4 },
];

export const levelOf = (id: LevelId) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];

/**
 * Distribue les cartes : `pairs` exercices différents tirés dans la liste, chacun en deux exemplaires, mélangés.
 * Pas assez d'exercices : null.
 */
export function deal<T>(pool: readonly T[], pairs: number, rng: Rng = Math.random): T[] | null {
  const distinct = [...new Set(pool)];
  if (distinct.length < pairs) return null;
  const picked = shuffle(distinct, rng).slice(0, pairs);
  return shuffle([...picked, ...picked], rng);
}

/** Deux cartes retournées : même exercice ? */
export const isPair = <T>(cards: readonly T[], a: number, b: number) => a !== b && cards[a] === cards[b];

/** Classement : points décroissants (ex æquo : même rang). */
export function ranking(scores: number[]): number[] {
  return scores.map((s) => 1 + scores.filter((t) => t > s).length);
}
