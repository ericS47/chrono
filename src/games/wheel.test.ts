import { describe, expect, it } from 'vitest';
import { buildWheel, landingRotation, MAX_WHEEL_EXERCISES, segmentAt } from './wheel';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const sameNeighbours = (segs: ReturnType<typeof buildWheel<string>>) =>
  segs.some((s, i) => {
    const t = segs[(i + 1) % segs.length];
    return s.kind === 'exercise' && t.kind === 'exercise' && s.exercise === t.exercise;
  });

describe('buildWheel', () => {
  it('chaque exercice plusieurs fois, moins de repos que d’exercices, jamais deux fois le même côte à côte', () => {
    for (const n of [2, 3, 5, 8, 12]) {
      for (let seed = 1; seed < 15; seed++) {
        const pool = Array.from({ length: n }, (_, i) => `ex${i}`);
        const segs = buildWheel(pool, seeded(seed));
        const ex = segs.filter((s) => s.kind === 'exercise');
        const rests = segs.length - ex.length;
        const counts = new Map<string, number>();
        for (const s of ex) if (s.kind === 'exercise') counts.set(s.exercise, (counts.get(s.exercise) ?? 0) + 1);
        expect(counts.size).toBe(Math.min(n, MAX_WHEEL_EXERCISES));
        expect(Math.min(...counts.values())).toBeGreaterThanOrEqual(2);
        expect(ex.length).toBeGreaterThanOrEqual(12);
        expect(rests).toBeGreaterThanOrEqual(1);
        expect(rests).toBeLessThan(ex.length / 4);
        expect(sameNeighbours(segs)).toBe(false);
      }
    }
  });
  it('un seul exercice : repos entre les répétitions possibles, mais au moins une case repos', () => {
    const segs = buildWheel(['a'], seeded(1));
    expect(segs.some((s) => s.kind === 'rest')).toBe(true);
  });
  it('aucun exercice : roue vide', () => {
    expect(buildWheel([], seeded(1))).toEqual([]);
  });
});

describe('rotation', () => {
  it('la roue s’arrête bien sur la case visée, après plusieurs tours', () => {
    for (const n of [7, 14, 18]) {
      let r = 0;
      for (let k = 0; k < n; k++) {
        for (const j of [-1, 0, 1]) {
          const next = landingRotation(r, k, n, 5, j);
          expect(next - r).toBeGreaterThanOrEqual(5 * 360);
          expect(segmentAt(next, n)).toBe(k);
          r = next;
        }
      }
    }
  });
});
