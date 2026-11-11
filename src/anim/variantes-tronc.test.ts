import { describe, expect, it } from 'vitest';
import type { Equipment, ExerciseId, Position } from './exercises';
import { EXERCISE_BY_ID, EXERCISES, equipmentOf, inGroup, inPosition, matchExercise, place, frameAt } from './exercises';
import { DEFAULT_AVATAR } from './avatar';
import { dims } from './pose';

const count = (eq: Equipment, pos: Position) =>
  EXERCISES.filter((e) => inGroup(e, 'tronc') && equipmentOf(e) === eq && inPosition(e, pos)).length;

describe('tronc : variantes avec matériel', () => {
  it('assez d’exercices par matériel et par position', () => {
    const min: [Equipment, number, number][] = [
      ['dumbbell', 9, 6],
      ['kettlebell', 9, 6],
      ['band', 7, 5],
      ['ring', 9, 6],
    ];
    for (const [eq, s, c] of min) {
      expect(count(eq, 'standing'), `${eq} debout`).toBeGreaterThanOrEqual(s);
      expect(count(eq, 'chair'), `${eq} chaise`).toBeGreaterThanOrEqual(c);
    }
  });

  it('matériel, position, prise et catégorie des nouveaux exercices', () => {
    const cases: [ExerciseId, Equipment, Position][] = [
      ['deadbug', 'none', 'standing'],
      ['deadbug-c', 'none', 'chair'],
      ['deadbug-ring', 'ring', 'standing'],
      ['sidebend-db', 'dumbbell', 'standing'],
      ['sidebend-kb-c', 'kettlebell', 'chair'],
      ['sidebend-band-c', 'band', 'chair'],
      ['sidebend-ring-c', 'ring', 'chair'],
      ['situp-c', 'none', 'chair'],
      ['situp-kb', 'kettlebell', 'standing'],
      ['situp-ring-c', 'ring', 'chair'],
      ['plank-ring-c', 'ring', 'chair'],
      ['climber-band-c', 'band', 'chair'],
      ['renegaderow', 'dumbbell', 'standing'],
      ['renegaderow-kb', 'kettlebell', 'standing'],
      ['halo', 'kettlebell', 'standing'],
      ['halo-db-c', 'dumbbell', 'chair'],
      ['legraise-db', 'dumbbell', 'standing'],
      ['situpfull-ring-c', 'ring', 'chair'],
    ];
    for (const [id, eq, pos] of cases) {
      const e = EXERCISE_BY_ID[id];
      expect(e, id).toBeDefined();
      expect(equipmentOf(e), id).toBe(eq);
      expect(inPosition(e, pos), id).toBe(true);
      expect(inGroup(e, 'tronc'), id).toBe(true);
    }
    expect(EXERCISE_BY_ID['sidebend-db'].grip).toBe('near');
    expect(EXERCISE_BY_ID['legraise-db'].grip).toBe('ankles');
    expect(EXERCISE_BY_ID['halo-db'].grip).toBe('one');
    expect(EXERCISE_BY_ID['renegaderow-kb'].grip).toBe('each');
    expect(EXERCISE_BY_ID['plank-ring'].grip).toBe('ankles');
    expect(EXERCISE_BY_ID['situpfull-ring-c'].label).toBe('Genou poitrine assis (anneau)');
    expect(EXERCISE_BY_ID['plank-ring-c'].label).toBe('Gainage incliné sur chaise (anneau)');
    expect(EXERCISE_BY_ID['sidebend-kb-c'].label).toBe('Flexion latérale du buste assis (kettlebell)');
  });

  it('la flexion latérale incline bien le buste (tête décalée vers le côté)', () => {
    const p = place(EXERCISE_BY_ID['sidebend-db'], dims(DEFAULT_AVATAR));
    const neutral = frameAt(p, 0).j;
    // Deuxième posture : buste penché vers le côté proche (droite de l'écran).
    const bent = frameAt(p, p.ex.period * p.starts[1] + 1e-9).j;
    expect(bent.headC[0] - bent.hip[0]).toBeGreaterThan(neutral.headC[0] - neutral.hip[0] + 8);
  });

  it('reconnaît les nouveaux exercices par leur nom', () => {
    expect(matchExercise('Dead bug')).toBe('deadbug');
    expect(matchExercise('Dead bug assis')).toBe('deadbug-c');
    expect(matchExercise('Dead bug avec haltère')).toBe('deadbug-db');
    expect(matchExercise('Dead bug kettlebell')).toBe('deadbug-kb');
    expect(matchExercise('Dead bug anneau')).toBe('deadbug-ring');
    expect(matchExercise('Flexion latérale du buste')).toBe('sidebend');
    expect(matchExercise('Flexions latérales haltère')).toBe('sidebend-db');
    expect(matchExercise('Flexion latérale assis kettlebell')).toBe('sidebend-kb-c');
    expect(matchExercise('Flexion latérale élastique')).toBe('sidebend-band');
    expect(matchExercise('Flexion latérale du buste assis (anneau)')).toBe('sidebend-ring-c');
    expect(matchExercise('Abdos assis')).toBe('situp-c');
    expect(matchExercise('Crunch haltère')).toBe('situp-db');
    expect(matchExercise('Abdos kettlebell')).toBe('situp-kb');
    expect(matchExercise('Crunch avec anneau')).toBe('situp-ring');
    expect(matchExercise('Abdos assis (anneau)')).toBe('situp-ring-c');
    expect(matchExercise('Relevés de jambes haltère')).toBe('legraise-db');
    expect(matchExercise('Gainage anneau')).toBe('plank-ring');
    expect(matchExercise('Gainage latéral élastique')).toBe('sideplank-band');
    expect(matchExercise('Gainage latéral anneau')).toBe('sideplank-ring');
    expect(matchExercise('Mountain climber élastique')).toBe('climber-band');
    expect(matchExercise('Bird dog élastique')).toBe('birddog-band');
    expect(matchExercise('Superman anneau')).toBe('superman-ring');
    expect(matchExercise('Superman frontal élastique')).toBe('supermanfront-band');
    expect(matchExercise('Renegade row')).toBe('renegaderow');
    expect(matchExercise('Renegade row kettlebell')).toBe('renegaderow-kb');
    expect(matchExercise('Halo')).toBe('halo');
    expect(matchExercise('Halo haltère')).toBe('halo-db');
    expect(matchExercise('Halo assis kettlebell')).toBe('halo-kb-c');
  });

  it('les noms existants du tronc gardent leur exercice', () => {
    expect(matchExercise('Abdos')).toBe('situp');
    expect(matchExercise('Crunch')).toBe('situp');
    expect(matchExercise('Sit-ups')).toBe('situpfull');
    expect(matchExercise('Gainage')).toBe('plank');
    expect(matchExercise('Gainage latéral')).toBe('sideplank');
    expect(matchExercise('Gainage dynamique')).toBe('dynplank');
    expect(matchExercise('Relevés de jambes')).toBe('legraise');
    expect(matchExercise('Relevés de jambes anneau')).toBe('legraise-ring');
    expect(matchExercise('Superman')).toBe('superman');
    expect(matchExercise('Superman frontal')).toBe('supermanfront');
    expect(matchExercise('Bird dog')).toBe('birddog');
    expect(matchExercise('Mountain climbers')).toBe('climber');
    expect(matchExercise('Obliques anneau')).toBe('obliques-ring');
    expect(matchExercise('Bûcheron kettlebell assis')).toBe('woodchop-kb-c');
    expect(matchExercise('Rowing haltère')).toBe('dbrow');
    expect(matchExercise('Levée de jambe assis')).toBe('kneeext');
  });
});
