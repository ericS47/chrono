import { describe, expect, it } from 'vitest';
import type { Equipment, Position } from './exercises';
import { EXERCISES, EXERCISE_BY_ID, equipmentOf, inGroup, inPosition, matchExercise, positionOf } from './exercises';

const cardio = (eq: Equipment, pos: Position) =>
  EXERCISES.filter((e) => inGroup(e, 'cardio') && equipmentOf(e) === eq && inPosition(e, pos));

describe('cardio : exercices par matériel et par position', () => {
  it('au moins 4 exercices debout avec chaque matériel, et des versions sur chaise', () => {
    // Minimums (debout / chaise) : haltères 5 / 3, kettlebell 4 / 1, élastique 5 / 2, anneau 4 / 2.
    const min: Record<Exclude<Equipment, 'none'>, [number, number]> = {
      dumbbell: [5, 3], kettlebell: [4, 1], band: [5, 2], ring: [4, 2],
    };
    for (const [eq, [s, c]] of Object.entries(min) as [Exclude<Equipment, 'none'>, [number, number]][]) {
      expect(cardio(eq, 'standing').length, `${eq} debout`).toBeGreaterThanOrEqual(s);
      expect(cardio(eq, 'chair').length, `${eq} chaise`).toBeGreaterThanOrEqual(c);
    }
  });
  it('sans matériel : au moins 10 debout et 4 sur chaise', () => {
    expect(cardio('none', 'standing').length).toBeGreaterThanOrEqual(10);
    expect(cardio('none', 'chair').length).toBeGreaterThanOrEqual(4);
  });
  it('le squat sauté et le kettlebell swing sont aussi en cardio, sans quitter les MI', () => {
    for (const id of ['jumpsquat', 'kbswing', 'jumpsquat-db', 'jumpsquat-kb', 'highknees-band'] as const) {
      expect(inGroup(EXERCISE_BY_ID[id], 'mi')).toBe(true);
      expect(inGroup(EXERCISE_BY_ID[id], 'cardio')).toBe(true);
    }
  });
});

describe('cardio : nouveaux identifiants', () => {
  it('matériel, position et prise', () => {
    const cases: [string, Equipment, Position][] = [
      ['shadowbox', 'none', 'standing'],
      ['shadowbox-c', 'none', 'chair'],
      ['shadowbox-db', 'dumbbell', 'standing'],
      ['shadowbox-db-c', 'dumbbell', 'chair'],
      ['jumprope-c', 'none', 'chair'],
      ['tapping-c', 'none', 'chair'],
      ['jumpingjack-db-c', 'dumbbell', 'chair'],
      ['jumpingjack-band', 'band', 'standing'],
      ['jumpingjack-ring-c', 'ring', 'chair'],
      ['thruster', 'dumbbell', 'standing'],
      ['thruster-kb', 'kettlebell', 'standing'],
      ['thruster-kb-c', 'kettlebell', 'chair'],
      ['thruster-band-c', 'band', 'chair'],
      ['thruster-ring', 'ring', 'standing'],
      ['kbhighpull', 'kettlebell', 'standing'],
      ['burpee-db', 'dumbbell', 'standing'],
      ['highknees-ring', 'ring', 'standing'],
      ['shufflealt-band', 'band', 'standing'],
    ];
    for (const [id, eq, pos] of cases) {
      const e = EXERCISES.find((x) => x.id === id);
      expect(e, id).toBeDefined();
      expect(equipmentOf(e!), id).toBe(eq);
      expect(positionOf(e!), id).toBe(pos);
      expect(inGroup(e!, 'cardio'), id).toBe(true);
    }
    expect(EXERCISE_BY_ID['jumpingjack-band'].grip).toBe('ankles');
    expect(EXERCISE_BY_ID['jumpingjack-band-c'].grip).toBe('knees');
    expect(EXERCISE_BY_ID['thruster-kb'].grip).toBe('one');
    expect(EXERCISE_BY_ID['thruster-ring-c'].grip).toBe('hands');
    expect(EXERCISE_BY_ID['highknees-ring'].grip).toBe('hands');
    // Thruster depuis la chaise : on se lève, les pieds restent fixes.
    expect(EXERCISE_BY_ID['thruster-db-c'].anchor).toBe('feet');
    expect(EXERCISE_BY_ID['thruster-db-c'].label).toBe('Thruster assis-debout (haltères)');
  });
  it('libellés en français dans le style existant', () => {
    expect(EXERCISE_BY_ID['shadowbox-db-c'].label).toBe('Boxe dans le vide assis (haltères)');
    expect(EXERCISE_BY_ID['jumpsquat-kb'].label).toBe('Squat sauté (kettlebell)');
    expect(EXERCISE_BY_ID['jumpingjack-ring-c'].label).toBe('Jumping jack assis (anneau)');
    expect(EXERCISE_BY_ID['tapping-c'].label).toBe('Tipping assis');
  });
});

describe('cardio : reconnaissance par le nom', () => {
  it('reconnaît les nouveaux exercices', () => {
    expect(matchExercise('Boxe dans le vide')).toBe('shadowbox');
    expect(matchExercise('Shadow boxing')).toBe('shadowbox');
    expect(matchExercise('Boxe assis')).toBe('shadowbox-c');
    expect(matchExercise('Boxe dans le vide avec haltères')).toBe('shadowbox-db');
    expect(matchExercise('Boxe haltères assis')).toBe('shadowbox-db-c');
    expect(matchExercise('Corde à sauter')).toBe('jumprope');
    expect(matchExercise('Corde à sauter assis')).toBe('jumprope-c');
    expect(matchExercise('Tipping assis')).toBe('tapping-c');
    expect(matchExercise('Jumping jacks haltères')).toBe('jumpingjack-db');
    expect(matchExercise('Jumping jack assis haltères')).toBe('jumpingjack-db-c');
    expect(matchExercise('Jumping jack élastique')).toBe('jumpingjack-band');
    expect(matchExercise('Jumping jack anneau')).toBe('jumpingjack-ring');
    expect(matchExercise('Thruster')).toBe('thruster');
    expect(matchExercise('Thrusters kettlebell')).toBe('thruster-kb');
    expect(matchExercise('Thruster élastique sur chaise')).toBe('thruster-band-c');
    expect(matchExercise('Thruster anneau')).toBe('thruster-ring');
    expect(matchExercise('High pull kettlebell')).toBe('kbhighpull');
    expect(matchExercise('Squat sauté haltères')).toBe('jumpsquat-db');
    expect(matchExercise('Squat sauté kettlebell')).toBe('jumpsquat-kb');
    expect(matchExercise('Jump squat élastique')).toBe('jumpsquat-band');
    expect(matchExercise('Squats sautés anneau')).toBe('jumpsquat-ring');
    expect(matchExercise('Montées de genoux élastique')).toBe('highknees-band');
    expect(matchExercise('Montées de genoux anneau')).toBe('highknees-ring');
    expect(matchExercise('Pas chassés élastique')).toBe('shufflealt-band');
    expect(matchExercise('Burpees haltères')).toBe('burpee-db');
  });
  it('les noms existants donnent toujours le même exercice', () => {
    expect(matchExercise('Jumping jacks')).toBe('jumpingjack');
    expect(matchExercise('Jumping jack assis')).toBe('jumpingjack-c');
    expect(matchExercise('10 Burpees')).toBe('burpee');
    expect(matchExercise('Tipping rapide')).toBe('tapping');
    expect(matchExercise('Talons-fesses')).toBe('buttkicks');
    expect(matchExercise('Pas chassé D')).toBe('shuffleright');
    expect(matchExercise('Pas chassé à gauche')).toBe('shuffleleft');
    expect(matchExercise('Pas chassés')).toBe('shufflealt');
    expect(matchExercise('Montées de genoux')).toBe('highknees');
    expect(matchExercise('Montée de genou assis')).toBe('seatedmarch');
    expect(matchExercise('Squats sautés')).toBe('jumpsquat');
    expect(matchExercise('Kettlebell swing')).toBe('kbswing');
    expect(matchExercise('Goblet squat')).toBe('kbgoblet');
    expect(matchExercise('Squat kettlebell')).toBe('kbgoblet');
    expect(matchExercise('Tirage menton')).toBe('uprightrow');
    expect(matchExercise('Rameur')).toBeNull();
  });
});
