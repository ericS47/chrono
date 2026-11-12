import { describe, expect, it } from 'vitest';
import { EXERCISES, EXERCISE_BY_ID, equipmentOf, inGroup, inPosition, matchExercise, positionOf } from './exercises';
import type { Equipment, ExerciseId, Position } from './exercises';

const count = (eq: Equipment, pos: Position) =>
  EXERCISES.filter((e) => inGroup(e, 'ms') && equipmentOf(e) === eq && inPosition(e, pos)).length;

describe('MS : exercices avec matériel', () => {
  it('assez d’exercices par matériel et par position', () => {
    for (const eq of ['dumbbell', 'kettlebell', 'band'] as const) {
      expect(count(eq, 'standing')).toBeGreaterThanOrEqual(12);
      expect(count(eq, 'chair')).toBeGreaterThanOrEqual(11);
    }
    expect(count('ring', 'standing')).toBeGreaterThanOrEqual(8);
    expect(count('ring', 'chair')).toBeGreaterThanOrEqual(7);
    expect(count('none', 'standing')).toBeGreaterThanOrEqual(12);
    expect(count('none', 'chair')).toBeGreaterThanOrEqual(12);
  });

  it('matériel, position, catégorie et prise des nouveaux exercices', () => {
    const cases: [ExerciseId, Equipment, Position][] = [
      ['dbrow-db-c', 'dumbbell', 'chair'],
      ['dbrow-kb', 'kettlebell', 'standing'],
      ['dbrow-kb-c', 'kettlebell', 'chair'],
      ['dbrow-band', 'band', 'standing'],
      ['dbrow-band-c', 'band', 'chair'],
      ['dbkickback', 'dumbbell', 'standing'],
      ['dbkickback-db-c', 'dumbbell', 'chair'],
      ['dbkickback-band', 'band', 'standing'],
      ['dbkickback-band-c', 'band', 'chair'],
      ['dbhammer', 'dumbbell', 'standing'],
      ['dbhammer-db-c', 'dumbbell', 'chair'],
      ['dbhammer-kb', 'kettlebell', 'standing'],
      ['dbhammer-kb-c', 'kettlebell', 'chair'],
      ['dbpullover', 'dumbbell', 'standing'],
      ['dbpullover-kb', 'kettlebell', 'standing'],
      ['dbfloorpress', 'dumbbell', 'standing'],
      ['dbfloorpress-kb', 'kettlebell', 'standing'],
      ['pushup-db', 'dumbbell', 'standing'],
      ['pushup-band', 'band', 'standing'],
      ['pushup-band-c', 'band', 'chair'],
      ['pressforward-band', 'band', 'standing'],
      ['pressforward-band-c', 'band', 'chair'],
      ['ringpress-c', 'ring', 'chair'],
      ['ringoverhead', 'ring', 'standing'],
      ['ringoverhead-c', 'ring', 'chair'],
      ['ringbehind', 'ring', 'standing'],
      ['ringside', 'ring', 'standing'],
      ['ringside-c', 'ring', 'chair'],
    ];
    for (const [id, eq, pos] of cases) {
      const e = EXERCISE_BY_ID[id];
      expect(e, id).toBeDefined();
      expect(e.group).toBe('ms');
      expect(equipmentOf(e), id).toBe(eq);
      expect(positionOf(e), id).toBe(pos);
    }
    // Prises particulières : elles doivent suivre l'exercice sur chaise.
    expect(EXERCISE_BY_ID['dbhammer-db-c'].grip).toBe('hammer');
    expect(EXERCISE_BY_ID['pushup-band-c'].grip).toBe('back');
    expect(EXERCISE_BY_ID['pushup-band-c'].chairUnder).toBe('incline');
    expect(EXERCISE_BY_ID['ringside-c'].grip).toBe('side');
  });

  it('libellés', () => {
    expect(EXERCISE_BY_ID['dbrow-kb'].label).toBe('Rowing buste penché (kettlebell)');
    expect(EXERCISE_BY_ID['dbrow-db-c'].label).toBe('Rowing buste penché assis (haltères)');
    expect(EXERCISE_BY_ID['dbkickback-band-c'].label).toBe('Kickback triceps assis (élastique)');
    expect(EXERCISE_BY_ID['pushup-band-c'].label).toBe('Pompe inclinée sur chaise (élastique)');
    expect(EXERCISE_BY_ID['pressforward-band'].label).toBe('Poussée vers l’avant (élastique)');
  });

  it('reconnaît les nouveaux exercices par leur nom', () => {
    expect(matchExercise('Rowing buste penché kettlebell')).toBe('dbrow-kb');
    expect(matchExercise('Rowing buste penché assis (haltères)')).toBe('dbrow-db-c');
    expect(matchExercise('Rowing penché élastique')).toBe('dbrow-band');
    expect(matchExercise('Kickback triceps')).toBe('dbkickback');
    expect(matchExercise('Kickback triceps élastique assis')).toBe('dbkickback-band-c');
    expect(matchExercise('Curl marteau')).toBe('dbhammer');
    expect(matchExercise('Curl marteau kettlebell')).toBe('dbhammer-kb');
    expect(matchExercise('Curl marteau haltères assis')).toBe('dbhammer-db-c');
    expect(matchExercise('Pull-over')).toBe('dbpullover');
    expect(matchExercise('Pull-over kettlebell')).toBe('dbpullover-kb');
    expect(matchExercise('Développé couché au sol')).toBe('dbfloorpress');
    expect(matchExercise('Floor press kettlebell')).toBe('dbfloorpress-kb');
    expect(matchExercise('Pompes sur haltères')).toBe('pushup-db');
    expect(matchExercise('Pompes élastique')).toBe('pushup-band');
    expect(matchExercise('Poussée vers l’avant élastique')).toBe('pressforward-band');
    expect(matchExercise('Compression anneau assis')).toBe('ringpress-c');
    expect(matchExercise('Compression anneau au-dessus de la tête')).toBe('ringoverhead');
    expect(matchExercise('Compression anneau derrière le dos')).toBe('ringbehind');
    expect(matchExercise('Anneau contre la hanche')).toBe('ringside');
  });

  it('les noms MS déjà reconnus ne changent pas', () => {
    expect(matchExercise('Rowing haltère')).toBe('dbrow');
    expect(matchExercise('Rowing kettlebell')).toBe('dbrow');
    expect(matchExercise('Rowing élastique')).toBe('seatedbandrow');
    expect(matchExercise('Rowing assis')).toBe('seatedbandrow');
    expect(matchExercise('Pompes')).toBe('pushup');
    expect(matchExercise('Pompes sur les genoux')).toBe('kneepushup');
    expect(matchExercise('Pompes sur chaise')).toBe('pushup-c');
    expect(matchExercise('Curl biceps')).toBe('curlbw');
    expect(matchExercise('Curl haltères')).toBe('dbcurl');
    expect(matchExercise('Curl assis')).toBe('seateddbcurl');
    expect(matchExercise('Triceps')).toBe('tricepsbw');
    expect(matchExercise('Anneau de Pilates')).toBe('ringpress');
    expect(matchExercise('Compression anneau')).toBe('ringpress');
    expect(matchExercise('Développé épaules')).toBe('dbpress');
    expect(matchExercise('Poussée des épaules vers l’avant')).toBe('pressforward');
    expect(matchExercise('Dips sur chaise')).toBe('chairdips');
    expect(matchExercise('Kickback')).toBe('kickback');
  });
});
