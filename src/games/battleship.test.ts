import { describe, expect, it } from 'vitest';
import { aiShot, allSunk, assignRows, canPlace, colOf, FLEET, newBoard, placeFleet, remainingFleet, rowOf, shipCells, shoot, SIZE, type Board } from './battleship';

/** Générateur pseudo-aléatoire reproductible. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('placeFleet', () => {
  it('place toute la flotte, sans chevauchement ni contact', () => {
    for (let seed = 1; seed < 60; seed++) {
      const ships = placeFleet(seeded(seed));
      expect(ships.map((s) => s.length)).toEqual(FLEET);
      const all = ships.flat();
      expect(new Set(all).size).toBe(all.length);
      ships.forEach((a, i) => ships.forEach((b, j) => {
        if (i === j) return;
        for (const x of a) for (const y of b) {
          expect(Math.max(Math.abs(rowOf(x) - rowOf(y)), Math.abs(colOf(x) - colOf(y)))).toBeGreaterThan(1);
        }
      }));
      for (const s of ships) {
        const straight = s.every((x) => rowOf(x) === rowOf(s[0])) || s.every((x) => colOf(x) === colOf(s[0]));
        expect(straight).toBe(true);
        expect(s.every((x) => x >= 0 && x < SIZE * SIZE)).toBe(true);
      }
    }
  });
});

describe('shoot', () => {
  const board: Board = { ships: [[0, 1]], shots: [] };
  it('raté, touché, coulé, et case déjà visée', () => {
    let r = shoot(board, 5);
    expect(r.result).toBe('miss');
    r = shoot(r.board, 0);
    expect(r.result).toBe('hit');
    expect(shoot(r.board, 0).board.shots).toHaveLength(2);
    r = shoot(r.board, 1);
    expect(r.result).toBe('sunk');
    expect(allSunk(r.board)).toBe(true);
  });
});

describe('aiShot', () => {
  it('ne vise jamais deux fois la même case et finit toujours la partie', () => {
    for (let seed = 1; seed < 30; seed++) {
      const rng = seeded(seed);
      let b = newBoard(rng);
      while (!allSunk(b)) {
        const cell = aiShot(b, rng);
        expect(b.shots).not.toContain(cell);
        b = shoot(b, cell).board;
      }
      expect(b.shots.length).toBeLessThan(SIZE * SIZE);
    }
  });

  it('après un touché, vise une case voisine', () => {
    const b: Board = { ships: [[44, 45, 46]], shots: [45] };
    for (let seed = 1; seed < 20; seed++) expect([35, 55, 44, 46]).toContain(aiShot(b, seeded(seed)));
  });

  it('après deux touchés alignés, continue dans l’alignement', () => {
    const b: Board = { ships: [[44, 45, 46]], shots: [44, 45] };
    for (let seed = 1; seed < 20; seed++) expect([43, 46]).toContain(aiShot(b, seeded(seed)));
  });
});

describe('assignRows', () => {
  it('10 lignes ; avec 3 exercices, chacun 3 ou 4 fois', () => {
    const rows = assignRows(['a', 'b', 'c'], seeded(3));
    expect(rows).toHaveLength(SIZE);
    for (const x of ['a', 'b', 'c']) {
      const n = rows.filter((r) => r === x).length;
      expect(n === 3 || n === 4).toBe(true);
    }
  });
  it('plus de 10 exercices : 10 différents', () => {
    const list = Array.from({ length: 15 }, (_, i) => i);
    const rows = assignRows(list, seeded(7));
    expect(new Set(rows).size).toBe(SIZE);
  });
  it('aucun exercice : aucune ligne', () => {
    expect(assignRows([], seeded(1))).toEqual([]);
  });
});

describe('placement à la main', () => {
  it('shipCells : horizontal, vertical, et refus hors de la grille', () => {
    expect(shipCells(0, 3, true)).toEqual([0, 1, 2]);
    expect(shipCells(0, 3, false)).toEqual([0, 10, 20]);
    expect(shipCells(8, 3, true)).toBeNull();
    expect(shipCells(80, 3, false)).toBeNull();
  });
  it('canPlace : refuse le chevauchement et le contact, même en diagonale', () => {
    const ships = [[0, 1, 2]];
    expect(canPlace(ships, [1, 11])).toBe(false);
    expect(canPlace(ships, [13, 14])).toBe(false);
    expect(canPlace(ships, [4, 5])).toBe(true);
    expect(canPlace(ships, [20, 21])).toBe(true);
  });
  it('remainingFleet : ce qui reste à poser', () => {
    expect(remainingFleet([])).toEqual([5, 4, 3, 3, 2]);
    expect(remainingFleet([[0, 1, 2], [40, 41, 42, 43, 44]])).toEqual([4, 3, 2]);
  });
});
