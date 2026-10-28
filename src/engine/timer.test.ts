import { describe, expect, it } from 'vitest';
import { buildPhases } from './phases';
import { defaultBlock } from '../data/defaults';
import * as T from './timer';

const tabata = () => buildPhases({ blocks: [{ ...defaultBlock('tabata'), params: { work: 20, rest: 10, rounds: 2 } }] }, 10);
// phases : prep 10, work 20, rest 10, work 20

describe('moteur de chrono', () => {
  it('avance à partir de l’heure de départ, sans dérive', () => {
    let s = T.start(T.createRun(tabata()), 1000);
    expect(T.remaining(s, 1000)).toBe(10_000);
    let r = T.tick(s, 1000 + 10_500);
    expect(r.events).toEqual([{ type: 'phase', index: 1, auto: true }]);
    s = r.state;
    // La phase 1 a commencé à 11 000 exactement, pas à 11 500.
    expect(s.phaseStart).toBe(11_000);
    expect(T.remaining(s, 11_500)).toBe(19_500);
  });

  it('franchit plusieurs phases d’un coup si la page a été gelée', () => {
    const s = T.start(T.createRun(tabata()), 0);
    const r = T.tick(s, 45_000);
    expect(r.state.index).toBe(3);
    expect(r.state.phaseStart).toBe(40_000);
    expect(r.events.map((e) => e.type)).toEqual(['phase', 'phase', 'phase']);
    const end = T.tick(r.state, 60_000);
    expect(end.state.status).toBe('finished');
    expect(end.state.endedAt).toBe(60_000);
    expect(end.events).toEqual([{ type: 'finish' }]);
  });

  it('la pause gèle le temps et la reprise le décale', () => {
    let s = T.start(T.createRun(tabata()), 0);
    s = T.pause(s, 4000);
    expect(T.remaining(s, 100_000)).toBe(6000);
    expect(T.tick(s, 100_000).events).toEqual([]);
    s = T.resume(s, 100_000);
    expect(T.remaining(s, 101_000)).toBe(5000);
    expect(T.tick(s, 106_000).state.index).toBe(1);
  });

  it('passer et revenir en arrière', () => {
    let s = T.start(T.createRun(tabata()), 0);
    s = T.next(s, 2000).state;
    expect(s.index).toBe(1);
    expect(s.spent[0]).toBe(2000);
    // Dans les 3 premières secondes : retour à la phase précédente.
    s = T.prev(s, 3000).state;
    expect(s.index).toBe(0);
    // Plus tard : redémarre la phase courante.
    s = T.prev(s, 8000).state;
    expect(s.index).toBe(0);
    expect(T.remaining(s, 8000)).toBe(10_000);
  });

  it('passer en pause reste en pause', () => {
    let s = T.pause(T.start(T.createRun(tabata()), 0), 1000);
    s = T.next(s, 5000).state;
    expect(s.status).toBe('paused');
    expect(T.elapsed(s, 50_000)).toBe(0);
  });

  it('les phases ouvertes attendent l’utilisateur', () => {
    const ph = buildPhases({ blocks: [defaultBlock('stopwatch')] }, 0);
    let s = T.start(T.createRun(ph), 0);
    expect(T.tick(s, 1e9).state.status).toBe('running');
    s = T.lap(s, 30_000);
    s = T.lap(s, 65_000);
    expect(s.laps[0]).toEqual([30_000, 65_000]);
    const r = T.next(s, 90_000);
    expect(r.state.status).toBe('finished');
    expect(T.activeTime(r.state)).toBe(90_000);
  });

  it('compte les tours et le temps restant total', () => {
    let s = T.start(T.createRun(tabata()), 0);
    s = T.addRound(T.addRound(s));
    s = T.addRound(s, -1);
    expect(s.roundCount[0]).toBe(1);
    expect(T.totalRemaining(s, 5000)).toBe(5000 + 20_000 + 10_000 + 20_000);
    expect(T.progress(s, 5000)).toBeCloseTo(0.5);
  });

  it('arrêt anticipé et temps d’effort par bloc', () => {
    let s = T.start(T.createRun(tabata()), 0);
    s = T.tick(s, 25_000).state;
    s = T.stop(s, 25_000);
    expect(s.status).toBe('finished');
    expect(T.activeTime(s)).toBe(15_000);
    expect(T.blockWorkTime(s, 0)).toBe(15_000);
  });

  it('reprend une séance enregistrée au même point, horloge décalée', () => {
    const s = T.pause(T.start(T.createRun(tabata()), 1000), 16_000);
    const moved = T.shiftRun(s, -900_000);
    expect(T.elapsed(moved, 5)).toBe(T.elapsed(s, 999_999));
    expect(moved.startedAt).toBe(1000 - 900_000);
    const r = T.shiftRun(T.start(T.createRun(tabata()), 1000), 50_000);
    expect(T.remaining(r, 51_000 + 4000)).toBe(6000);
    expect(T.shiftRun(T.createRun(tabata()), 500).phaseStart).toBe(0);
  });
});
