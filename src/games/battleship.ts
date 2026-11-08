// Bataille navale contre l'ordinateur : grille 10 × 10, flotte placée au hasard,
// chaque ligne (A à J) associée à un exercice. Logique pure, sans interface.

export const SIZE = 10;
/** Flotte : porte-avions, croiseur, deux sous-marins, torpilleur. */
export const FLEET = [5, 4, 3, 3, 2];
export const ROWS = 'ABCDEFGHIJ';

export type Rng = () => number;
export type ShotResult = 'miss' | 'hit' | 'sunk';

export interface Board {
  /** Cases de chaque bateau (numéro de case = ligne × 10 + colonne). */
  ships: number[][];
  /** Cases déjà visées, dans l'ordre. */
  shots: number[];
}

export const rowOf = (cell: number) => Math.floor(cell / SIZE);
export const colOf = (cell: number) => cell % SIZE;
export const cellName = (cell: number) => `${ROWS[rowOf(cell)]}${colOf(cell) + 1}`;

const randInt = (n: number, rng: Rng) => Math.min(n - 1, Math.floor(rng() * n));

export function shuffle<T>(list: readonly T[], rng: Rng = Math.random): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1, rng);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function neighbors(cell: number): number[] {
  const r = rowOf(cell), c = colOf(cell);
  const out: number[] = [];
  if (r > 0) out.push(cell - SIZE);
  if (r < SIZE - 1) out.push(cell + SIZE);
  if (c > 0) out.push(cell - 1);
  if (c < SIZE - 1) out.push(cell + 1);
  return out;
}

/** Place la flotte au hasard : pas de chevauchement, et les bateaux ne se touchent pas (même en diagonale). */
export function placeFleet(rng: Rng = Math.random, fleet: number[] = FLEET): number[][] {
  for (;;) {
    const blocked = new Set<number>();
    const ships: number[][] = [];
    let ok = true;
    for (const len of fleet) {
      let placed: number[] | null = null;
      for (let t = 0; t < 200 && !placed; t++) {
        const horiz = rng() < 0.5;
        const r = randInt(horiz ? SIZE : SIZE - len + 1, rng);
        const c = randInt(horiz ? SIZE - len + 1 : SIZE, rng);
        const cells = Array.from({ length: len }, (_, i) => (horiz ? r * SIZE + c + i : (r + i) * SIZE + c));
        if (cells.every((x) => !blocked.has(x))) placed = cells;
      }
      if (!placed) { ok = false; break; }
      ships.push(placed);
      for (const x of placed) {
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const rr = rowOf(x) + dr, cc = colOf(x) + dc;
            if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) blocked.add(rr * SIZE + cc);
          }
        }
      }
    }
    if (ok) return ships;
  }
}

export const newBoard = (rng: Rng = Math.random): Board => ({ ships: placeFleet(rng), shots: [] });

export function isSunk(board: Board, ship: number[]): boolean {
  return ship.every((x) => board.shots.includes(x));
}

/** Tire sur une case (déjà visée : résultat inchangé, rien n'est ajouté). */
export function shoot(board: Board, cell: number): { board: Board; result: ShotResult } {
  const next = board.shots.includes(cell) ? board : { ...board, shots: [...board.shots, cell] };
  const ship = next.ships.find((s) => s.includes(cell));
  if (!ship) return { board: next, result: 'miss' };
  return { board: next, result: isSunk(next, ship) ? 'sunk' : 'hit' };
}

export const allSunk = (board: Board): boolean => board.ships.every((s) => isSunk(board, s));

/** Bateau coulé auquel appartient la case, s'il y en a un. */
export const sunkShipAt = (board: Board, cell: number): number[] | undefined =>
  board.ships.find((s) => s.includes(cell) && isSunk(board, s));

/**
 * Tir de l'ordinateur sur la grille du joueur. Il sait seulement ce qu'un joueur saurait :
 * raté, touché, coulé. Bateau touché non coulé : il vise autour, dans l'alignement s'il en a deux.
 * Sinon il cherche au hasard, une case sur deux (en damier), loin des bateaux déjà coulés.
 */
export function aiShot(board: Board, rng: Rng = Math.random): number {
  const shot = new Set(board.shots);
  const isHit = (x: number) => shot.has(x) && board.ships.some((s) => s.includes(x));
  const sunk = new Set(board.ships.filter((s) => isSunk(board, s)).flat());
  const open = (x: number) => !shot.has(x);
  // Autour d'un bateau coulé, il n'y a pas d'autre bateau (ils ne se touchent pas).
  const nearSunk = new Set<number>();
  for (const x of sunk) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const rr = rowOf(x) + dr, cc = colOf(x) + dc;
        if (rr >= 0 && rr < SIZE && cc >= 0 && cc < SIZE) nearSunk.add(rr * SIZE + cc);
      }
    }
  }

  const live = board.shots.filter((x) => isHit(x) && !sunk.has(x));
  if (live.length) {
    if (live.length >= 2) {
      const sameRow = live.every((x) => rowOf(x) === rowOf(live[0]));
      const step = sameRow ? 1 : SIZE;
      const sorted = [...live].sort((a, b) => a - b);
      const ends = [sorted[0] - step, sorted[sorted.length - 1] + step].filter((x) =>
        x >= 0 && x < SIZE * SIZE && (sameRow ? rowOf(x) === rowOf(live[0]) : colOf(x) === colOf(live[0])) && open(x));
      if (ends.length) return ends[randInt(ends.length, rng)];
    }
    const around = [...new Set(live.flatMap(neighbors))].filter(open);
    if (around.length) return around[randInt(around.length, rng)];
  }

  const free = Array.from({ length: SIZE * SIZE }, (_, i) => i).filter((x) => open(x) && !nearSunk.has(x));
  const parity = free.filter((x) => (rowOf(x) + colOf(x)) % 2 === 0);
  const pool = parity.length ? parity : free.length ? free : Array.from({ length: SIZE * SIZE }, (_, i) => i).filter(open);
  return pool[randInt(pool.length, rng)];
}

/**
 * Exercice de chaque ligne (10 lignes, ou `count` cases), réparti au hasard.
 * Plus d'exercices que de places : tirés au hasard, sans doublon. Moins : chacun revient autant de fois que possible (à un près).
 */
export function assignRows<T>(exercises: readonly T[], rng: Rng = Math.random, count = SIZE): T[] {
  if (!exercises.length) return [];
  if (exercises.length >= count) return shuffle(exercises, rng).slice(0, count);
  const order = shuffle(exercises, rng);
  const rows = Array.from({ length: count }, (_, i) => order[i % order.length]);
  return shuffle(rows, rng);
}
