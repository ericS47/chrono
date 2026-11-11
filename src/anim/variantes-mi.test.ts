import { describe, expect, it } from 'vitest';
import { EXERCISE_BY_ID, EXERCISES, equipmentOf, inGroup, inPosition, matchExercise, positionOf, type Equipment, type ExerciseId } from './exercises';

const count = (eq: Equipment, pos: 'standing' | 'chair') =>
  EXERCISES.filter((e) => inGroup(e, 'mi') && equipmentOf(e) === eq && inPosition(e, pos)).length;

describe('MI : variantes avec matériel', () => {
  it('chaque matériel propose assez d’exercices MI, debout et sur chaise', () => {
    for (const eq of ['dumbbell', 'kettlebell', 'band', 'ring'] as const) expect(count(eq, 'standing')).toBeGreaterThanOrEqual(8);
    expect(count('dumbbell', 'chair')).toBeGreaterThanOrEqual(5);
    expect(count('kettlebell', 'chair')).toBeGreaterThanOrEqual(4);
    expect(count('band', 'chair')).toBeGreaterThanOrEqual(6);
    expect(count('ring', 'chair')).toBeGreaterThanOrEqual(5);
    expect(count('none', 'standing')).toBeGreaterThanOrEqual(14);
    expect(count('none', 'chair')).toBeGreaterThanOrEqual(10);
  });

  it('matériel, position, catégorie et prise des nouveaux exercices', () => {
    const cases: [ExerciseId, Equipment, 'standing' | 'chair'][] = [
      ['sumosquat', 'none', 'standing'], ['sumosquat-c', 'none', 'chair'],
      ['sumosquat-db', 'dumbbell', 'standing'], ['sumosquat-db-c', 'dumbbell', 'chair'],
      ['sumosquat-kb', 'kettlebell', 'standing'], ['sumosquat-kb-c', 'kettlebell', 'chair'],
      ['sumosquat-band', 'band', 'standing'], ['sumosquat-ring', 'ring', 'standing'], ['sumosquat-ring-c', 'ring', 'chair'],
      ['sidelunge', 'none', 'standing'], ['sidelunge-db', 'dumbbell', 'standing'], ['sidelunge-kb', 'kettlebell', 'standing'], ['sidelunge-ring', 'ring', 'standing'],
      ['deadlift', 'dumbbell', 'standing'], ['deadlift-kb', 'kettlebell', 'standing'], ['deadlift-band', 'band', 'standing'],
      ['bandwalk', 'band', 'standing'],
      ['bridge-db', 'dumbbell', 'standing'], ['bridge-kb', 'kettlebell', 'standing'],
      ['lunge-band', 'band', 'standing'], ['lunge-ring', 'ring', 'standing'],
      ['calfraise-kb', 'kettlebell', 'standing'], ['calfraise-band-c', 'band', 'chair'],
      ['calfraise-ring', 'ring', 'standing'], ['calfraise-ring-c', 'ring', 'chair'],
      ['seatedmarch-db-c', 'dumbbell', 'chair'],
    ];
    for (const [id, eq, pos] of cases) {
      const e = EXERCISE_BY_ID[id];
      expect(e, id).toBeDefined();
      expect(equipmentOf(e), id).toBe(eq);
      expect(positionOf(e), id).toBe(pos);
      expect(e.group, id).toBe('mi');
    }
    expect(EXERCISE_BY_ID['bridge-db'].grip).toBe('one');
    expect(EXERCISE_BY_ID['lunge-band'].grip).toBe('foot');
    expect(EXERCISE_BY_ID['calfraise-ring'].grip).toBe('ankles');
    expect(EXERCISE_BY_ID['calfraise-ring-c'].grip).toBe('knees');
    expect(EXERCISE_BY_ID['bandwalk'].grip).toBe('knees');
    expect(EXERCISE_BY_ID['sumosquat-ring'].view).toBe('front');
    expect(EXERCISE_BY_ID['lunge-ring'].grip).toBe('hands');
  });

  it('libellés en français', () => {
    expect(EXERCISE_BY_ID['sumosquat-kb'].label).toBe('Squat sumo (kettlebell)');
    expect(EXERCISE_BY_ID['sumosquat-c'].label).toBe('Squat sumo sur chaise');
    expect(EXERCISE_BY_ID['deadlift-band'].label).toBe('Soulevé de terre jambes tendues (élastique)');
    expect(EXERCISE_BY_ID['calfraise-band-c'].label).toBe('Mollets assis (élastique)');
    expect(EXERCISE_BY_ID['seatedmarch-db-c'].label).toBe('Montée de genou assis (haltères)');
    expect(EXERCISE_BY_ID['bridge-kb'].label).toBe('Pont fessier (kettlebell)');
  });

  it('reconnaît les nouveaux exercices par leur nom', () => {
    expect(matchExercise('Squat sumo')).toBe('sumosquat');
    expect(matchExercise('Squats sumo kettlebell')).toBe('sumosquat-kb');
    expect(matchExercise('Squat sumo avec haltère')).toBe('sumosquat-db');
    expect(matchExercise('Squat sumo élastique')).toBe('sumosquat-band');
    expect(matchExercise('Squat sumo anneau')).toBe('sumosquat-ring');
    expect(matchExercise('Squat sumo sur chaise')).toBe('sumosquat-c');
    expect(matchExercise('Squat sumo kettlebell assis')).toBe('sumosquat-kb-c');
    expect(matchExercise('Squat sumo sur chaise (haltères)')).toBe('sumosquat-db-c');
    expect(matchExercise('Squat sumo sur chaise avec anneau')).toBe('sumosquat-ring-c');
    expect(matchExercise('Fentes latérales')).toBe('sidelunge');
    expect(matchExercise('Fente latérale kettlebell')).toBe('sidelunge-kb');
    expect(matchExercise('Fente latérale haltère')).toBe('sidelunge-db');
    expect(matchExercise('Soulevé de terre')).toBe('deadlift');
    expect(matchExercise('Soulevé de terre jambes tendues')).toBe('deadlift');
    expect(matchExercise('Soulevé de terre kettlebell')).toBe('deadlift-kb');
    expect(matchExercise('Soulevé de terre jambes tendues élastique')).toBe('deadlift-band');
    expect(matchExercise('Marche latérale élastique')).toBe('bandwalk');
    expect(matchExercise('Pont fessier haltère')).toBe('bridge-db');
    expect(matchExercise('Pont fessier kettlebell')).toBe('bridge-kb');
    expect(matchExercise('Fente élastique')).toBe('lunge-band');
    expect(matchExercise('Fente avec anneau')).toBe('lunge-ring');
    expect(matchExercise('Mollets kettlebell')).toBe('calfraise-kb');
    expect(matchExercise('Mollets anneau')).toBe('calfraise-ring');
    expect(matchExercise('Mollets anneau assis')).toBe('calfraise-ring-c');
    expect(matchExercise('Mollets élastique assis')).toBe('calfraise-band-c');
    expect(matchExercise('Montée de genou assis haltères')).toBe('seatedmarch-db-c');
    expect(matchExercise('Montée de genou assis (haltères)')).toBe('seatedmarch-db-c');
  });

  it('les noms MI déjà reconnus donnent le même exercice', () => {
    const before: [string, ExerciseId][] = [
      ['Squats', 'squat'], ['Fentes avant', 'lunge'], ['Pont fessier', 'bridge'], ['Pont fessier avec anneau', 'ringbridge'],
      ['Mollets', 'calfraise'], ['Goblet squat', 'kbgoblet'], ['Squat kettlebell', 'kbgoblet'], ['Kettlebell swing', 'kbswing'],
      ['Assis-debout', 'sittostand'], ['Extension de genou', 'kneeext'], ['Montée de genou assis', 'seatedmarch'],
      ['Squat bulgare', 'bulgarian'], ['Relevé de la pointe des pieds', 'toeraise'], ['Abduction de la jambe', 'legabduction'],
      ['Adduction de la jambe', 'legadduction'], ['Extension de la jambe vers l’arrière', 'kickback'],
      ['Squat haltères', 'squat-db'], ['Fente kettlebell', 'lunge-kb'], ['Mollets assis', 'calfraise-c'],
      ['Pont fessier élastique', 'bridge-band'], ['Montée de genou assis élastique', 'seatedmarch'],
      ['Montées de genoux', 'highknees'], ['Squats sautés', 'jumpsquat'], ['Pas chassés', 'shufflealt'], ['Pas chassé alterné', 'shufflealt'],
    ];
    for (const [name, id] of before) expect(matchExercise(name), name).toBe(id);
  });
});
