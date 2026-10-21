import { describe, expect, it } from 'vitest';
import { computeCues, entryEvent } from './cues';
import { buildPhases } from './phases';
import { defaultBlock, DEFAULT_SOUND } from '../data/defaults';
import type { SoundSettings } from '../data/types';

const phases = buildPhases({ blocks: [{ ...defaultBlock('tabata'), params: { work: 20, rest: 10, rounds: 2 } }] }, 10);
const quiet: SoundSettings = { ...DEFAULT_SOUND, voice: false };

describe('signaux programmés', () => {
  it('événement d’entrée selon la phase', () => {
    expect(entryEvent(phases, 0)).toBeNull();
    expect(entryEvent(phases, 1)).toBe('start');
    expect(entryEvent(phases, 2)).toBe('workEnd');
    expect(entryEvent(phases, 3)).toBe('restEnd');
  });

  it('programme toute la suite : décomptes, changements de phase et fin', () => {
    const cues = computeCues(phases, 0, 0, quiet);
    const at = (e: string) => cues.filter((c) => c.event === e).map((c) => c.at);
    expect(at('countdown')).toEqual([7, 8, 9, 27, 28, 29, 37, 38, 39, 57, 58, 59]);
    expect(at('start')).toEqual([10]);
    expect(at('workEnd')).toEqual([30]);
    expect(at('restEnd')).toEqual([40]);
    expect(at('finish')).toEqual([60]);
  });

  it('tient compte du temps déjà écoulé et ignore le passé', () => {
    const cues = computeCues(phases, 1, 18.5, quiet);
    expect(cues[0]).toEqual({ at: 0.5, event: 'countdown' });
    expect(cues.every((c) => c.at >= 0)).toBe(true);
  });

  it('respecte les réglages : silencieux, signal coupé, nombre de bips', () => {
    expect(computeCues(phases, 0, 0, { ...quiet, silent: true })).toEqual([]);
    const noCount = computeCues(phases, 0, 0, { ...quiet, events: { ...quiet.events, countdown: { enabled: false, sound: 'bip' } } });
    expect(noCount.some((c) => c.event === 'countdown')).toBe(false);
    const five = computeCues(phases, 1, 0, { ...quiet, countdownBeeps: 5 });
    expect(five.filter((c) => c.event === 'countdown' && c.at < 20).map((c) => c.at)).toEqual([15, 16, 17, 18, 19]);
  });

  it('annonces vocales : phase, tour, mi-temps', () => {
    const long = buildPhases({ blocks: [{ ...defaultBlock('emom'), params: { interval: 60, rounds: 2 } }] }, 0);
    const cues = computeCues(long, 0, 0, DEFAULT_SOUND, true);
    const says = cues.filter((c) => c.say).map((c) => c.say);
    expect(says).toContain('Minute 1. Tour 1 sur 2');
    expect(says).toContain('Mi-temps');
    expect(says).toContain('30 secondes');
    expect(says.at(-1)).toBe('Séance terminée');
  });

  it('s’arrête à la première phase ouverte', () => {
    const ph = buildPhases({ blocks: [defaultBlock('countdown'), defaultBlock('stopwatch'), defaultBlock('countdown')] }, 0);
    const cues = computeCues(ph, 0, 0, quiet);
    expect(Math.max(...cues.map((c) => c.at))).toBe(300);
  });
});
