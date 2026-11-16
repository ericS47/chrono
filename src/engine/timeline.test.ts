import { describe, expect, it } from 'vitest';
import type { TimelineItem } from '../data/types';
import { expandTimeline, setExerciseLabels, timelineDuration } from './timeline';

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

describe('créateur de séance : avancement dans le bloc de travail', () => {
  const pos = (items: TimelineItem[]) => expandTimeline(items).map((x) => (x.items ? `${x.item}/${x.items}` : '-'));

  it('numérote les étapes du bloc (un effort : une étape, une série : une étape par répétition) ; un repos garde le numéro de l’étape qui précède', () => {
    const items: TimelineItem[] = [{
      id: 'g', type: 'group', name: 'Haut du corps', reps: 1, between: 0,
      children: [
        e(30, 'Pompes') as never, r(15) as never,
        { id: 's', type: 'series', reps: 2, between: 0, children: [e(20) as never, r(10) as never] },
        r(15) as never, e(40, 'Gainage') as never,
      ],
    }];
    // Pompes, repos | série : 20 10 20 | repos | Gainage
    expect(pos(items)).toEqual(['1/4', '1/4', '2/4', '2/4', '3/4', '3/4', '4/4']);
    // La série reste indiquée à part.
    expect(expandTimeline(items)[4]).toMatchObject({ set: 2, sets: 2, item: 3, items: 4 });
  });

  it('bloc répété : compte les passages, récupération comprise', () => {
    const items: TimelineItem[] = [{ id: 'g', type: 'group', name: '', reps: 2, between: 60, children: [e(30) as never, e(40) as never] }];
    expect(pos(items)).toEqual(['1/2', '1/2', '1/2', '2/2', '2/2']);
  });

  it('bloc répété 7 fois avec une série de 5 : 1/7 à 7/7 ; bloc fait une fois avec une série × 7 : 1/7 à 7/7', () => {
    const serie = (n: number): TimelineItem => ({ id: 's', type: 'series', reps: n, between: 0, children: [e(20) as never, r(10) as never] });
    const rep = pos([{ id: 'g', type: 'group', name: '', reps: 7, between: 0, children: [serie(5) as never] }]);
    expect(rep[0]).toBe('1/7');
    expect(new Set(rep)).toEqual(new Set(['1/7', '2/7', '3/7', '4/7', '5/7', '6/7', '7/7']));
    const once = pos([{ id: 'g', type: 'group', name: '', reps: 1, between: 0, children: [serie(7) as never] }]);
    expect(once).toEqual(['1/7', '1/7', '2/7', '2/7', '3/7', '3/7', '4/7', '4/7', '5/7', '5/7', '6/7', '6/7', '7/7']);
  });

  it('chaque bloc de travail a son propre compte', () => {
    const g = (id: string, n: number): TimelineItem => ({ id, type: 'group', name: id, reps: 1, between: 0, children: Array.from({ length: n }, (_, i) => e(10 + i) as never) });
    expect(pos([g('a', 2), r(30), g('b', 3)])).toEqual(['1/2', '2/2', '1/2', '1/3', '2/3', '3/3']);
  });

  it('hors bloc de travail : avancement dans la séance, rien s’il n’y a qu’une étape', () => {
    expect(pos([e(30), r(10), e(30), r(10), e(30)])).toEqual(['1/3', '1/3', '2/3', '2/3', '3/3']);
    expect(pos([e(30)])).toEqual(['-']);
    // Une série seule : une étape par répétition.
    expect(pos([{ id: 's', type: 'series', reps: 3, between: 0, children: [e(20) as never, r(10) as never] }])).toEqual(['1/3', '1/3', '2/3', '2/3', '3/3']);
  });
});

describe('créateur de séance : exercice animé choisi', () => {
  it('garde l’exercice choisi, et le nomme quand il n’y a pas de commentaire', () => {
    setExerciseLabels((id) => (id === 'squat' ? 'Squat' : undefined));
    const items: TimelineItem[] = [
      { id: 'a', type: 'effort', duration: 30, exercise: 'squat' },
      { id: 'b', type: 'effort', duration: 30, note: '20 squats sautés', exercise: 'squat' },
      { id: 'c', type: 'rest', duration: 15, exercise: 'squat' },
    ];
    const flat = expandTimeline(items);
    expect(flat.map((x) => [x.label, x.exercise])).toEqual([['Squat', 'squat'], ['20 squats sautés', 'squat'], ['Repos', undefined]]);
    setExerciseLabels(() => undefined);
  });
});
