// Roue de la santé : une roue de cases « exercice » (chacune plusieurs fois) et quelques cases « repos ».
// Logique pure : construction de la roue et angle d'arrêt.

import { shuffle, type Rng } from './battleship';

export type Segment<T> = { kind: 'exercise'; exercise: T } | { kind: 'rest' };

/** Au plus 8 exercices différents sur la roue (au-delà, les cases deviennent trop petites). */
export const MAX_WHEEL_EXERCISES = 8;

/**
 * Construit la roue : chaque exercice revient plusieurs fois (12 cases d'exercice au moins),
 * deux cases voisines n'ont jamais le même exercice (s'il y en a au moins deux),
 * et les cases « repos » sont moins nombreuses, réparties régulièrement.
 */
export function buildWheel<T>(pool: readonly T[], rng: Rng = Math.random): Segment<T>[] {
  const distinct = shuffle([...new Set(pool)], rng).slice(0, MAX_WHEEL_EXERCISES);
  if (!distinct.length) return [];
  const copies = Math.max(2, Math.ceil(12 / distinct.length));
  // Tours successifs : chaque tour contient chaque exercice une fois, dans un ordre mélangé,
  // sans répéter le dernier exercice du tour précédent en premier.
  const order: T[] = [];
  for (let c = 0; c < copies; c++) {
    let round = shuffle(distinct, rng);
    if (order.length && distinct.length > 1 && round[0] === order[order.length - 1]) round = [...round.slice(1), round[0]];
    order.push(...round);
  }
  // Fermeture du cercle : la dernière case touche la première.
  if (distinct.length > 2 && order[order.length - 1] === order[0]) {
    const k = order.length - 2;
    [order[k], order[order.length - 1]] = [order[order.length - 1], order[k]];
  }
  const rests = Math.max(1, Math.floor(order.length / 6));
  const segs: Segment<T>[] = order.map((exercise) => ({ kind: 'exercise', exercise }));
  // Repos insérés à intervalles réguliers (ils séparent aussi deux exercices).
  const step = segs.length / rests;
  for (let r = rests - 1; r >= 0; r--) segs.splice(Math.round(r * step + step / 2), 0, { kind: 'rest' });
  return segs;
}

/** Index de la case sous l'aiguille (en haut) quand la roue a tourné de `rotation` degrés (sens horaire). */
export function segmentAt(rotation: number, n: number): number {
  const a = (((-rotation % 360) + 360) % 360);
  return Math.floor(a / (360 / n)) % n;
}

/**
 * Angle final pour s'arrêter sur la case `k` : quelques tours complets depuis `from`,
 * puis la case sous l'aiguille, un peu décalée du centre (`jitter` entre -1 et 1) pour faire naturel.
 */
export function landingRotation(from: number, k: number, n: number, turns = 5, jitter = 0): number {
  const seg = 360 / n;
  const center = (k + 0.5) * seg + jitter * seg * 0.35;
  const target = -center;
  const delta = (((target - from) % 360) + 360) % 360;
  return from + turns * 360 + delta;
}
