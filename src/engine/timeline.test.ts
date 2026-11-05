import { describe, expect, it } from 'vitest';
import type { TimelineItem } from '../data/types';
import { expandTimeline, timelineDuration } from './timeline';

const e = (duration: number, note?: string): TimelineItem => ({ id: `e${duration}${note ?? ''}`, type: 'effort', duration, note });
const r = (duration: number): TimelineItem => ({ id: `r${duration}`, type: 'rest', duration });

describe('créateur de séance : timeline', () => {
  it('garde les blocs simples dans l’ordre, avec leur commentaire', () => {
    const flat = expandTimeline([e(30, 'Burpees'), r(15), e(30)]);
    expect(flat.map((x) => [x.kind, x.duration, x.label])).toEqual([['work', 30, 'Burpees'], ['rest', 15, 'Repos'], ['work', 30, 'Effort']]);
  });

  it('répète une série et retire le repos final de la dernière répétition', () => {
    const flat = expandTimeline([{ id: 's', type: 'series', reps: 3, between: 60, children: [e(40) as never, r(20) as never] }]);
    expect(flat.map((x) => x.duration)).toEqual([40, 20, 40, 20, 40]);
    expect(flat.map((x) => x.set)).toEqual([1, 1, 2, 2, 3]);
    expect(flat[0].sets).toBe(3);
  });

  it('ajoute la récupération entre séries quand la série ne finit pas par un repos', () => {
    const flat = expandTimeline([{ id: 's', type: 'series', reps: 2, between: 60, children: [e(40) as never] }]);
    expect(flat.map((x) => [x.kind, x.duration, x.label])).toEqual([['work', 40, 'Effort'], ['rest', 60, 'Récupération'], ['work', 40, 'Effort']]);
  });

  it('répète un bloc de travail, garde la série intérieure et son nom', () => {
    const items: TimelineItem[] = [{
      id: 'g', type: 'group', name: 'Cardio', reps: 2, between: 0,
      children: [{ id: 's', type: 'series', reps: 2, between: 0, children: [e(30) as never, r(10) as never] }, e(60, 'Course') as never, r(90) as never],
    }];
    const flat = expandTimeline(items);
    // 30 10 30 | 60 90 | 30 10 30 | 60  (repos final du bloc retiré)
    expect(flat.map((x) => x.duration)).toEqual([30, 10, 30, 60, 90, 30, 10, 30, 60]);
    expect(flat.every((x) => x.group === 'Cardio')).toBe(true);
    expect(flat[0]).toMatchObject({ set: 1, sets: 2, round: 1, rounds: 2 });
    expect(flat[3]).toMatchObject({ round: 1, rounds: 2, label: 'Course' });
    expect(flat[8].round).toBe(2);
    expect(timelineDuration(items)).toBe(30 + 10 + 30 + 60 + 90 + 30 + 10 + 30 + 60);
  });

  it('ignore les durées nulles et une série d’une seule répétition n’a pas de numéro', () => {
    const flat = expandTimeline([e(0), { id: 's', type: 'series', reps: 1, between: 30, children: [e(20) as never] }]);
    expect(flat).toEqual([{ kind: 'work', duration: 20, label: 'Effort', note: undefined }]);
  });
});
