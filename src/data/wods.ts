// Bibliothèque de WOD connus, pré-remplis. Copiés dans « Mes séances » à la demande.

import type { Block, Exercise, Workout } from './types';
import { uid } from '../lib/format';

const ex = (name: string, reps?: string, load?: string): Exercise => ({ name, reps, load });

function blk(mode: Block['mode'], params: Block['params'], exercises: Exercise[], name?: string): Block {
  return { id: uid(), mode, params, exercises, restAfter: 0, name };
}

function wod(name: string, description: string, tags: string[], blocks: Block[]): Workout {
  return { id: `wod-${name.toLowerCase().replace(/[^a-z]/g, '')}`, name, description, tags, favorite: false, blocks, prepSeconds: null, createdAt: 0, updatedAt: 0 };
}

export function knownWods(): Workout[] {
  return [
    wod('Cindy', 'Un max de tours en 20 minutes.', ['CrossFit', 'cardio'], [
      blk('amrap', { duration: 20 * 60 }, [ex('tractions', '5'), ex('pompes', '10'), ex('squats', '15')]),
    ]),
    wod('Fran', '21-15-9 répétitions, le plus vite possible.', ['CrossFit', 'HIIT'], [
      blk('fortime', { duration: 10 * 60 }, [ex('thrusters', '21-15-9', '43 kg / 29 kg'), ex('tractions', '21-15-9')]),
    ]),
    wod('Murph', 'En hommage au Lt Michael Murphy. Gilet de 9 kg conseillé. Tractions, pompes et squats peuvent être fractionnés.', ['CrossFit', 'endurance'], [
      blk('fortime', { duration: 0 }, [ex('course', '1,6 km'), ex('tractions', '100'), ex('pompes', '200'), ex('squats', '300'), ex('course', '1,6 km')]),
    ]),
    wod('Grace', '30 épaulés-jetés, au plus vite.', ['CrossFit', 'force'], [
      blk('fortime', { duration: 0 }, [ex('épaulé-jeté', '30', '61 kg / 43 kg')]),
    ]),
    wod('Helen', '3 tours, au plus vite.', ['CrossFit', 'cardio'], [
      blk('fortime', { duration: 0 }, [ex('course', '400 m'), ex('kettlebell swings', '21', '24 kg / 16 kg'), ex('tractions', '12')]),
    ]),
    wod('Annie', '50-40-30-20-10 répétitions de chaque.', ['CrossFit', 'gainage'], [
      blk('fortime', { duration: 0 }, [ex('double-unders', '50-40-30-20-10'), ex('abdos sit-ups', '50-40-30-20-10')]),
    ]),
    wod('Diane', '21-15-9 répétitions.', ['CrossFit', 'force'], [
      blk('fortime', { duration: 0 }, [ex('soulevé de terre', '21-15-9', '102 kg / 70 kg'), ex('pompes en équilibre', '21-15-9')]),
    ]),
    wod('Karen', '150 wall balls, au plus vite.', ['CrossFit', 'cardio'], [
      blk('fortime', { duration: 0 }, [ex('wall balls', '150', '9 kg / 6 kg')]),
    ]),
    wod('Jackie', 'Au plus vite.', ['CrossFit', 'cardio'], [
      blk('fortime', { duration: 0 }, [ex('rameur', '1000 m'), ex('thrusters', '50', '20 kg / 15 kg'), ex('tractions', '30')]),
    ]),
    wod('Mary', 'Un max de tours en 20 minutes.', ['CrossFit', 'gymnastique'], [
      blk('amrap', { duration: 20 * 60 }, [ex('pompes en équilibre', '5'), ex('pistols alternés', '10'), ex('tractions', '15')]),
    ]),
    wod('Chelsea', 'Chaque minute pendant 30 minutes : les trois exercices.', ['CrossFit', 'EMOM'], [
      blk('emom', { interval: 60, rounds: 30, rotate: false }, [ex('tractions', '5'), ex('pompes', '10'), ex('squats', '15')]),
    ]),
    wod('Tabata classique', '8 tours de 20 s d’effort / 10 s de repos.', ['HIIT', 'cardio'], [
      blk('tabata', { work: 20, rest: 10, rounds: 8, sets: 1 }, [ex('burpees')]),
    ]),
    wod('Tabata gainage', '4 exercices de gainage en alternance, 2 séries.', ['gainage', 'HIIT'], [
      blk('tabata', { work: 20, rest: 10, rounds: 8, sets: 2, setRest: 60 }, [ex('planche'), ex('planche latérale droite'), ex('planche latérale gauche'), ex('hollow hold')]),
    ]),
    wod('5×5 force', 'Squat, développé couché, rowing : 5 séries de 5.', ['force', 'musculation'], [
      blk('strength', {
        lifts: [
          { name: 'Squat', sets: 5, reps: '5', load: '', rest: 180 },
          { name: 'Développé couché', sets: 5, reps: '5', load: '', rest: 180 },
          { name: 'Rowing barre', sets: 5, reps: '5', load: '', rest: 120 },
        ],
      }, []),
    ]),
    wod('Fractionné 30/30', 'Échauffement 10 min, 10 × (30 s vite / 30 s lent), retour au calme.', ['course', 'cardio'], [
      blk('run', { repeats: 1, segments: [{ name: 'Échauffement', duration: 600, kind: 'work', pace: 'facile' }] }, [], 'Échauffement'),
      blk('run', { repeats: 10, segments: [{ name: 'Vite', duration: 30, kind: 'work', pace: 'VMA' }, { name: 'Lent', duration: 30, kind: 'rest', pace: 'trot' }] }, [], '30/30'),
      blk('run', { repeats: 1, segments: [{ name: 'Retour au calme', duration: 300, kind: 'work', pace: 'très facile' }] }, [], 'Retour au calme'),
    ]),
    wod('Mobilité 10 min', 'Routine douce pour les hanches et les épaules.', ['mobilité'], [
      blk('custom', {
        repeats: 1,
        steps: [
          { name: 'Rotations des épaules', duration: 60, kind: 'work' },
          { name: 'Chat-vache', duration: 60, kind: 'work' },
          { name: 'Fente basse gauche', duration: 60, kind: 'work' },
          { name: 'Fente basse droite', duration: 60, kind: 'work' },
          { name: 'Pigeon gauche', duration: 60, kind: 'work' },
          { name: 'Pigeon droit', duration: 60, kind: 'work' },
          { name: 'Squat profond', duration: 60, kind: 'work' },
          { name: 'Ouverture thoracique', duration: 60, kind: 'work' },
          { name: 'Ischios debout', duration: 60, kind: 'work' },
          { name: 'Respiration', duration: 60, kind: 'work' },
        ],
      }, []),
    ]),
  ];
}

/** Copie d'un WOD avec de nouveaux identifiants, prête à être enregistrée. */
export function copyWorkout(w: Workout, name = w.name): Workout {
  const now = Date.now();
  return {
    ...structuredClone(w),
    id: uid(),
    name,
    favorite: false,
    blocks: w.blocks.map((b) => ({ ...structuredClone(b), id: uid() })),
    createdAt: now,
    updatedAt: now,
  };
}
