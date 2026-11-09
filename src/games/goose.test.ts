import { describe, expect, it } from 'vitest';
import { ELEVATORS, GEESE, playTurn, specialOf, type Player } from './goose';

const p = (name: string, pos = 0, skip = 0): Player => ({ name, pos, skip });

describe('playTurn (un seul dé)', () => {
  it('avance de la valeur du dé', () => {
    const { players, turn } = playTurn([p('Ana', 1)], 0, 3);
    expect(players[0].pos).toBe(4);
    expect(turn.path).toEqual([4]);
    expect(turn.die).toBe(3);
  });

  it('oie : rejoue la même distance, et les deux cases donnent un exercice', () => {
    const { players, turn } = playTurn([p('Ana', 2)], 0, 3); // 5 = oie → 8
    expect(players[0].pos).toBe(8);
    expect(turn.path).toEqual([5, 8]);
  });

  it('oies enchaînées', () => {
    expect(playTurn([p('Ana', 0)], 0, 5).turn.path).toEqual([5, 10]);
    expect(playTurn([p('Ana', 4)], 0, 5).turn.path).toEqual([9, 14, 19]); // 9 → 14 (oie) → 19 (hôtel)
  });

  it('ascenseurs : on monte ou on descend, et on fait les deux exercices', () => {
    const up = playTurn([p('A', 1)], 0, 2); // 3 → 22
    expect(up.turn.path).toEqual([3, 22]);
    expect(up.players[0].pos).toBe(22);
    const down = playTurn([p('A', 22)], 0, 3); // 25 → 8
    expect(down.turn.path).toEqual([25, 8]);
  });

  it('ascenseurs : départ et arrivée hors des cases spéciales', () => {
    for (const [from, to] of Object.entries(ELEVATORS)) {
      expect(specialOf(to)).toBeNull();
      expect(GEESE).not.toContain(Number(from));
    }
  });

  it('pont → 12, labyrinthe → 30, tête de mort → départ', () => {
    expect(playTurn([p('A', 2)], 0, 4).turn.path).toEqual([6, 12]);
    expect(playTurn([p('A', 40)], 0, 2).turn.path).toEqual([42, 30]);
    const death = playTurn([p('A', 55)], 0, 3);
    expect(death.players[0].pos).toBe(0);
    expect(death.turn.path).toEqual([58]);
  });

  it('il faut tomber pile sur 63 : on recule du surplus', () => {
    const r = playTurn([p('A', 60)], 0, 6); // 66 → 60
    expect(r.turn.path).toEqual([60]);
    expect(playTurn([p('A', 58)], 0, 5).turn.won).toBe(true);
    // 62 + 6 = 68 : on recule de 5, case 58 (tête de mort) → départ.
    expect(playTurn([p('A', 62)], 0, 6).players[0].pos).toBe(0);
  });

  it('hôtel : passe 2 tours', () => {
    let ps = playTurn([p('A', 16)], 0, 3).players;
    expect(ps[0]).toMatchObject({ pos: 19, skip: 2 });
    ps = playTurn(ps, 0, 6).players;
    expect(ps[0]).toMatchObject({ pos: 19, skip: 1 });
    ps = playTurn(ps, 0, 6).players;
    ps = playTurn(ps, 0, 2).players;
    expect(ps[0].pos).toBe(21);
  });

  it('puits : délivré quand un autre joueur arrive, qui prend sa place', () => {
    const ps = playTurn([p('A', 28), p('B', 26)], 0, 3).players;
    expect(ps[0]).toMatchObject({ pos: 31, skip: 3 });
    const r = playTurn(ps, 1, 5);
    expect(r.players[1]).toMatchObject({ pos: 31, skip: 3 });
    expect(r.players[0]).toMatchObject({ pos: 26, skip: 0 });
  });

  it('case occupée : l’autre joueur part à notre case de départ', () => {
    const r = playTurn([p('A', 1), p('B', 4)], 0, 3);
    expect(r.players[1].pos).toBe(1);
    expect(r.turn.bumped).toEqual({ index: 1, to: 1 });
  });

  it('cases spéciales', () => {
    expect(specialOf(9)).toBe('goose');
    expect(specialOf(63)).toBe('end');
    expect(specialOf(3)).toBe('up');
    expect(specialOf(25)).toBe('down');
    expect(specialOf(10)).toBeNull();
  });
});
