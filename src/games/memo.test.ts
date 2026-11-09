import { describe, expect, it } from 'vitest';
import { deal, isPair, LEVELS, ranking } from './memo';

function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

describe('deal', () => {
  it('chaque niveau : le bon nombre de cartes, chaque exercice exactement deux fois', () => {
    const pool = Array.from({ length: 20 }, (_, i) => `ex${i}`);
    for (const l of LEVELS) {
      const cards = deal(pool, l.pairs, seeded(l.pairs))!;
      expect(cards).toHaveLength(l.pairs * 2);
      const counts = new Map<string, number>();
      for (const c of cards) counts.set(c, (counts.get(c) ?? 0) + 1);
      expect(counts.size).toBe(l.pairs);
      expect([...counts.values()].every((n) => n === 2)).toBe(true);
    }
  });
  it('pas assez d’exercices différents : null', () => {
    expect(deal(['a', 'b', 'a'], 3)).toBeNull();
    expect(deal(['a', 'b', 'c'], 3)).not.toBeNull();
  });
  it('niveaux de plus en plus grands', () => {
    expect(LEVELS.map((l) => l.pairs)).toEqual([6, 8, 10, 12]);
  });
});

describe('isPair et ranking', () => {
  it('même exercice, cartes différentes', () => {
    const cards = ['a', 'b', 'a'];
    expect(isPair(cards, 0, 2)).toBe(true);
    expect(isPair(cards, 0, 1)).toBe(false);
    expect(isPair(cards, 0, 0)).toBe(false);
  });
  it('classement avec ex æquo', () => {
    expect(ranking([3, 5, 3, 1])).toEqual([2, 1, 2, 4]);
  });
});
