import { describe, expect, it } from 'vitest';
import { playTurn, specialOf, type Player } from './goose';

const p = (name: string, pos = 0, skip = 0): Player => ({ name, pos, skip });

describe('playTurn', () => {
  it('avance de la somme des dés', () => {
    const { players, turn } = playTurn([p('Ana', 1)], 0, [1, 2]);
    expect(players[0].pos).toBe(4);
    expect(turn.path).toEqual([4]);
  });

  it('oie : rejoue la même distance, et les deux cases donnent un exercice', () => {
    const { players, turn } = playTurn([p('Ana', 2)], 0, [2, 1]); // 5 = oie → 8
    expect(players[0].pos).toBe(8);
    expect(turn.path).toEqual([5, 8]);
  });

  it('oies enchaînées', () => {
    const { turn } = playTurn([p('Ana', 0)], 0, [4, 5].reverse() as [number, number]); // premier lancer 5+4 → 53
    expect(turn.path).toEqual([53]);
    const r = playTurn([p('Ana', 1)], 0, [2, 2]); // 5 (oie) → 9 (oie) → 13
    expect(r.turn.path).toEqual([5, 9, 13]);
  });

  it('premier lancer 6 et 3 : case 26', () => {
    expect(playTurn([p('Ana')], 0, [3, 6]).players[0].pos).toBe(26);
  });

  it('pont → 12, labyrinthe → 30, tête de mort → départ', () => {
    expect(playTurn([p('A', 2)], 0, [1, 3]).turn.path).toEqual([6, 12]);
    expect(playTurn([p('A', 40)], 0, [1, 1]).turn.path).toEqual([42, 30]);
    const death = playTurn([p('A', 55)], 0, [1, 2]);
    expect(death.players[0].pos).toBe(0);
    expect(death.turn.path).toEqual([58]);
  });

  it('il faut tomber pile sur 63 : on recule du surplus', () => {
    const r = playTurn([p('A', 60)], 0, [3, 4]); // 67 → 59 (oie, en reculant) → 52
    expect(r.turn.path).toEqual([59, 52]);
    expect(r.players[0].pos).toBe(52);
    expect(playTurn([p('A', 57)], 0, [3, 3]).turn.won).toBe(true);
  });

  it('hôtel : passe 2 tours', () => {
    let ps = playTurn([p('A', 16)], 0, [1, 2]).players;
    expect(ps[0]).toMatchObject({ pos: 19, skip: 2 });
    ps = playTurn(ps, 0, [6, 6]).players;
    expect(ps[0]).toMatchObject({ pos: 19, skip: 1 });
    ps = playTurn(ps, 0, [6, 6]).players;
    ps = playTurn(ps, 0, [1, 1]).players;
    expect(ps[0].pos).toBe(21);
  });

  it('puits : délivré quand un autre joueur arrive, qui prend sa place', () => {
    let ps = playTurn([p('A', 28), p('B', 26)], 0, [1, 2]).players;
    expect(ps[0]).toMatchObject({ pos: 31, skip: 3 });
    const r = playTurn(ps, 1, [2, 3]);
    expect(r.players[1]).toMatchObject({ pos: 31, skip: 3 });
    expect(r.players[0]).toMatchObject({ pos: 26, skip: 0 });
    ps = r.players;
  });

  it('case occupée : l’autre joueur part à notre case de départ', () => {
    const r = playTurn([p('A', 1), p('B', 4)], 0, [1, 2]);
    expect(r.players[1].pos).toBe(1);
    expect(r.turn.bumped).toEqual({ index: 1, to: 1 });
  });

  it('cases spéciales', () => {
    expect(specialOf(9)).toBe('goose');
    expect(specialOf(63)).toBe('end');
    expect(specialOf(10)).toBeNull();
  });
});
