import { describe, expect, it } from 'vitest';
import type { Session } from '../engine/session';
import type { Phase } from '../engine/phases';
import * as T from '../engine/timer';
import { DEFAULT_SOUND } from '../data/defaults';
import { PIP_COLORS, pipView } from './pipView';

const P = (p: Partial<Phase>): Phase => ({ kind: 'work', label: 'Effort', duration: 20, countUp: false, blockIndex: 0, mode: 'tabata', ...p });
const phases: Phase[] = [
  P({ kind: 'prep', label: 'Préparation', duration: 10, mode: null }),
  P({ label: 'Burpees', duration: 20, round: 1, rounds: 8 }),
  P({ kind: 'rest', label: 'Repos', duration: 10, round: 1, rounds: 8 }),
  P({ label: 'Squats', duration: 90, round: 2, rounds: 8 }),
];
const session = (run: T.RunState): Session => ({
  workout: { id: 'w', name: 'Tabata', tags: [], favorite: false, blocks: [], createdAt: 0, updatedAt: 0 },
  phases, run, sound: DEFAULT_SOUND, vibration: false, muted: false, quick: true,
});

describe('mini-fenêtre', () => {
  it('sans séance', () => {
    expect(pipView(null, 0).word).toBe('CHRONO');
  });
  it('avant le départ', () => {
    const v = pipView(session(T.createRun(phases)), 0);
    expect(v.word).toBe('PRÊT ?');
    expect(v.bg).toBe(PIP_COLORS.prep);
  });
  it('pendant l’effort : temps restant calculé depuis le début de la phase, nom, tour', () => {
    let r = T.start(T.createRun(phases), 1000);
    r = T.next(r, 1000).state; // effort « Burpees », commencé à 1000 ms
    const v = pipView(session(r), 1000 + 6400);
    expect(v).toMatchObject({ word: 'EFFORT', time: '14', sub: 'Burpees', count: 'Tour 1/8', bg: PIP_COLORS.work });
    expect(v.progress).toBeCloseTo(0.32, 2);
  });
  it('au repos : la suite est annoncée', () => {
    let r = T.start(T.createRun(phases), 0);
    r = T.next(r, 0).state;
    r = T.next(r, 0).state;
    const v = pipView(session(r), 3000);
    expect(v).toMatchObject({ word: 'REPOS', time: '07', sub: 'Ensuite : Squats', bg: PIP_COLORS.rest });
  });
  it('plus d’une minute : m:ss ; en pause : figé', () => {
    let r = T.start(T.createRun(phases), 0);
    for (let i = 0; i < 3; i++) r = T.next(r, 0).state;
    expect(pipView(session(r), 5000).time).toBe('1:25');
    r = T.pause(r, 5000);
    const v = pipView(session(r), 60_000);
    expect(v.word).toBe('EN PAUSE');
    expect(v.time).toBe('1:25');
  });
});
