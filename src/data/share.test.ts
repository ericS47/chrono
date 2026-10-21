import { describe, expect, it } from 'vitest';
import { decodeWorkout, encodeWorkout, shareUrl } from './share';
import { knownWods } from './wods';

describe('partage', () => {
  it('encode et décode une séance (accents compris)', () => {
    const w = { ...knownWods()[0], name: 'Séance « été » 💪', tags: ['force'] };
    const back = decodeWorkout(encodeWorkout(w));
    expect(back.name).toBe(w.name);
    expect(back.blocks[0].exercises).toEqual(w.blocks[0].exercises);
    expect(back.blocks[0].params).toEqual(w.blocks[0].params);
    expect(back.id).not.toBe(w.id);
    expect(back.tags).toEqual(['force']);
  });

  it('refuse un contenu invalide', () => {
    expect(() => decodeWorkout('abc')).toThrow();
    expect(() => decodeWorkout(btoa(JSON.stringify({ v: 1, n: 'x', b: [{ mode: 'pirate' }] })))).toThrow();
  });

  it('construit l’URL de partage', () => {
    expect(shareUrl(knownWods()[0], 'https://x.github.io/chrono/#/seances')).toMatch(/^https:\/\/x\.github\.io\/chrono\/#\/partage\/[\w-]+$/);
  });
});
