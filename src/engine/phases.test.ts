import { describe, expect, it } from 'vitest';
import { blockSummary, buildBlockPhases, buildPhases, estimateWorkout } from './phases';
import { defaultBlock } from '../data/defaults';
import type { Block } from '../data/types';

const block = (mode: Block['mode'], params: Block['params'] = {}, extra: Partial<Block> = {}): Block => ({
  ...defaultBlock(mode), params: { ...defaultBlock(mode).params, ...params }, ...extra,
});

describe('buildBlockPhases', () => {
  it('Tabata : 8 × (20 s / 10 s) sans repos final', () => {
    const ph = buildBlockPhases(block('tabata'), 0);
    expect(ph).toHaveLength(15);
    expect(ph.filter((p) => p.kind === 'work').every((p) => p.duration === 20)).toBe(true);
    expect(ph.filter((p) => p.kind === 'rest').every((p) => p.duration === 10)).toBe(true);
    expect(ph.at(-1)!.kind).toBe('work');
    expect(ph[0]).toMatchObject({ round: 1, rounds: 8 });
  });

  it('Intervalles en séries : le repos entre séries remplace le dernier repos de la série', () => {
    const ph = buildBlockPhases(block('interval', { work: 30, rest: 15, rounds: 3, sets: 2, setRest: 90 }), 0);
    expect(ph.map((p) => p.duration)).toEqual([30, 15, 30, 15, 30, 90, 30, 15, 30, 15, 30]);
    expect(ph[5].label).toBe('Repos entre séries');
  });

  it('EMOM : un intervalle par tour, exercices en alternance', () => {
    const ph = buildBlockPhases(block('emom', { interval: 60, rounds: 4 }, { exercises: [{ name: 'burpees', reps: '10' }, { name: 'squats' }] }), 0);
    expect(ph.map((p) => p.label)).toEqual(['10 burpees', 'squats', '10 burpees', 'squats']);
    expect(ph.every((p) => p.duration === 60)).toBe(true);
  });

  it('EMOM sans alternance garde un libellé neutre', () => {
    const ph = buildBlockPhases(block('emom', { rounds: 2, rotate: false }, { exercises: [{ name: 'a' }, { name: 'b' }] }), 0);
    expect(ph.map((p) => p.label)).toEqual(['Minute 1', 'Minute 2']);
  });

  it('AMRAP : une phase avec compteur de tours', () => {
    const [p] = buildBlockPhases(block('amrap', { duration: 720 }), 0);
    expect(p).toMatchObject({ duration: 720, countUp: false, roundCounter: true });
  });

  it('For Time : chrono qui monte, time cap optionnel', () => {
    expect(buildBlockPhases(block('fortime', { duration: 0 }), 0)[0]).toMatchObject({ duration: null, countUp: true, action: 'done' });
    expect(buildBlockPhases(block('fortime', { duration: 600 }), 0)[0]).toMatchObject({ duration: 600, countUp: true });
  });

  it('Musculation : séries ouvertes + repos chronométré, pas de repos final', () => {
    const ph = buildBlockPhases(block('strength', {
      lifts: [{ name: 'Squat', sets: 2, reps: '5', load: '100 kg', rest: 90 }, { name: 'Dips', sets: 1, reps: '10', rest: 60 }],
    }), 0);
    expect(ph.map((p) => [p.kind, p.duration])).toEqual([['work', null], ['rest', 90], ['work', null], ['rest', 90], ['work', null]]);
    expect(ph[0]).toMatchObject({ label: 'Squat', set: 1, sets: 2, action: 'setDone', detail: '5 reps · 100 kg' });
    expect(ph[3].detail).toBe('Ensuite : Dips');
  });

  it('Course et Personnalisé : segments répétés', () => {
    const run = buildBlockPhases(block('run', { repeats: 2, segments: [{ name: 'Vite', duration: 30, kind: 'work', pace: '4:00' }, { name: 'Lent', duration: 30, kind: 'rest' }] }), 0);
    expect(run).toHaveLength(4);
    expect(run[0]).toMatchObject({ label: 'Vite', detail: 'Allure 4:00', round: 1, rounds: 2 });
    const custom = buildBlockPhases(block('custom', { repeats: 1, steps: [{ name: 'A', duration: 10, kind: 'work' }, { name: 'zéro', duration: 0, kind: 'rest' }] }), 0);
    expect(custom).toHaveLength(1);
  });
});

describe('buildPhases', () => {
  it('ajoute la préparation et les transitions entre blocs', () => {
    const w = { blocks: [block('amrap', { duration: 60 }, { restAfter: 120 }), block('countdown', { duration: 30 }, { restAfter: 60 })] };
    const ph = buildPhases(w, 10);
    expect(ph.map((p) => [p.kind, p.duration])).toEqual([['prep', 10], ['work', 60], ['rest', 120], ['work', 30]]);
    expect(buildPhases(w, 0)[0].kind).toBe('work');
  });

  it('estime la durée totale', () => {
    expect(estimateWorkout({ blocks: [block('tabata')] })).toBe(8 * 20 + 7 * 10);
    expect(estimateWorkout({ blocks: [block('amrap', { duration: 600 }, { restAfter: 60 }), block('emom', { rounds: 5 })] })).toBe(600 + 60 + 300);
  });

  it('résume un bloc', () => {
    expect(blockSummary(block('amrap', { duration: 720 }))).toBe('AMRAP 12′');
    expect(blockSummary(block('tabata'))).toBe('Tabata 8×');
    expect(blockSummary(block('emom', { interval: 120, rounds: 5 }))).toBe('E2MOM × 5');
    expect(blockSummary(block('interval', { work: 40, rest: 20, rounds: 10 }))).toBe('Intervalles 40/20 × 10');
  });
});
