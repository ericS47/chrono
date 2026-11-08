import { describe, expect, it } from 'vitest';
import { DEFAULT_AVATAR, normalizeAnim, type Avatar } from './avatar';
import { EXERCISES, frameAt, GROUND, matchExercise, place, VIEW_W } from './exercises';
import { dims, lowest, solve } from './pose';
import { phaseAnims } from './phase';
import type { Phase } from '../engine/phases';
import type { Block } from '../data/types';

describe('reconnaissance des exercices', () => {
  it('reconnaît les noms courants, au pluriel et avec accents', () => {
    expect(matchExercise('Squats')).toBe('squat');
    expect(matchExercise('20 air squats')).toBe('squat');
    expect(matchExercise('Pompes')).toBe('pushup');
    expect(matchExercise('Push-ups')).toBe('pushup');
    expect(matchExercise('Gainage')).toBe('plank');
    expect(matchExercise('Jumping jacks')).toBe('jumpingjack');
    expect(matchExercise('Fentes avant')).toBe('lunge');
    expect(matchExercise('10 Burpees')).toBe('burpee');
    expect(matchExercise('Mountain climbers')).toBe('climber');
    expect(matchExercise('Abdos')).toBe('situp');
    expect(matchExercise('Sit-ups')).toBe('situpfull');
    expect(matchExercise('Montées de genoux')).toBe('highknees');
    // Renforcement : le nom le plus précis l'emporte.
    expect(matchExercise('Pompes sur les genoux')).toBe('kneepushup');
    expect(matchExercise('10 pompes')).toBe('pushup');
    expect(matchExercise('Squats sautés')).toBe('jumpsquat');
    expect(matchExercise('Gainage latéral')).toBe('sideplank');
    expect(matchExercise('Gainage')).toBe('plank');
    expect(matchExercise('Pont fessier')).toBe('bridge');
    // Sans matériel (MI, MS, tronc).
    expect(matchExercise('Squat sur une jambe')).toBe('bulgarian');
    expect(matchExercise('Relevé de la pointe des pieds')).toBe('toeraise');
    expect(matchExercise('Abduction de la jambe')).toBe('legabduction');
    expect(matchExercise('Adduction de la jambe')).toBe('legadduction');
    expect(matchExercise('Extension de la jambe vers l’arrière')).toBe('kickback');
    expect(matchExercise('Poussée des épaules vers le haut')).toBe('pressup');
    expect(matchExercise('Poussée des épaules vers l’avant')).toBe('pressforward');
    expect(matchExercise('Triceps')).toBe('tricepsbw');
    expect(matchExercise('Haussement des épaules')).toBe('shrug');
    expect(matchExercise('Tirage menton')).toBe('uprightrow');
    expect(matchExercise('Pectoraux')).toBe('pecfly');
    expect(matchExercise('Obliques')).toBe('obliques');
    expect(matchExercise('Shoulder tap')).toBe('shouldertap');
    expect(matchExercise('Gainage dynamique')).toBe('dynplank');
    expect(matchExercise('Bûcheron')).toBe('woodchop');
    expect(matchExercise('Good morning')).toBe('goodmorning');
    expect(matchExercise('Superman frontal')).toBe('supermanfront');
    expect(matchExercise('Superman latéral')).toBe('supermanside');
    expect(matchExercise('Superman')).toBe('superman');
    expect(matchExercise('Développé Arnold')).toBe('arnold');
    expect(matchExercise('Développé Arnold haltères')).toBe('dbarnold');
    expect(matchExercise('Superman')).toBe('superman');
    expect(matchExercise('Développé Arnold')).toBe('arnold');
    expect(matchExercise('Développé Arnold haltères')).toBe('dbarnold');
    expect(matchExercise('Relevés de jambes')).toBe('legraise');
    expect(matchExercise('Mollets')).toBe('calfraise');
    expect(matchExercise('Bird dog')).toBe('birddog');
    expect(matchExercise('Tapping')).toBe('tapping');
    expect(matchExercise('Talons-fesses')).toBe('buttkicks');
    expect(matchExercise('Kettlebell swing')).toBe('kbswing');
    expect(matchExercise('Goblet squat')).toBe('kbgoblet');
    expect(matchExercise('Curl biceps')).toBe('curlbw');
    expect(matchExercise('Curl élastique')).toBe('bandcurl');
    expect(matchExercise('Élévations latérales')).toBe('lateralbw');
    expect(matchExercise('Élévations latérales élastique')).toBe('bandraise');
    expect(matchExercise('Curl haltères')).toBe('dbcurl');
    expect(matchExercise('Développé épaules')).toBe('dbpress');
    expect(matchExercise('Rowing haltère')).toBe('dbrow');
    expect(matchExercise('Assis-debout')).toBe('sittostand');
    expect(matchExercise('Extension de genou')).toBe('kneeext');
    expect(matchExercise('Dips sur chaise')).toBe('chairdips');
    expect(matchExercise('Curl assis')).toBe('seateddbcurl');
    expect(matchExercise('Développé épaules assis')).toBe('seateddbpress');
    expect(matchExercise('Rowing assis')).toBe('seatedbandrow');
    expect(matchExercise('Montée de genou assis')).toBe('seatedmarch');
    expect(matchExercise('Élévation frontale')).toBe('frontbw');
    expect(matchExercise('Élévation frontale assis')).toBe('seatedkbraise');
    expect(matchExercise('Anneau de Pilates')).toBe('ringpress');
    expect(matchExercise('Pont fessier avec anneau')).toBe('ringbridge');
    expect(matchExercise('Pont fessier')).toBe('bridge');
    // Sans matériel (MI, MS, tronc).
    expect(matchExercise('Squat sur une jambe')).toBe('bulgarian');
    expect(matchExercise('Relevé de la pointe des pieds')).toBe('toeraise');
    expect(matchExercise('Abduction de la jambe')).toBe('legabduction');
    expect(matchExercise('Adduction de la jambe')).toBe('legadduction');
    expect(matchExercise('Extension de la jambe vers l’arrière')).toBe('kickback');
    expect(matchExercise('Poussée des épaules vers le haut')).toBe('pressup');
    expect(matchExercise('Poussée des épaules vers l’avant')).toBe('pressforward');
    expect(matchExercise('Triceps')).toBe('tricepsbw');
    expect(matchExercise('Haussement des épaules')).toBe('shrug');
    expect(matchExercise('Tirage menton')).toBe('uprightrow');
    expect(matchExercise('Pectoraux')).toBe('pecfly');
    expect(matchExercise('Obliques')).toBe('obliques');
    expect(matchExercise('Shoulder tap')).toBe('shouldertap');
    expect(matchExercise('Gainage dynamique')).toBe('dynplank');
    expect(matchExercise('Bûcheron')).toBe('woodchop');
    expect(matchExercise('Good morning')).toBe('goodmorning');
    expect(matchExercise('Superman frontal')).toBe('supermanfront');
    expect(matchExercise('Superman latéral')).toBe('supermanside');
    expect(matchExercise('Superman')).toBe('superman');
    expect(matchExercise('Développé Arnold')).toBe('arnold');
    expect(matchExercise('Développé Arnold haltères')).toBe('dbarnold');
    expect(matchExercise('Pas chassé D')).toBe('shuffleright');
    expect(matchExercise('Pas chassés droite')).toBe('shuffleright');
    expect(matchExercise('Pas chassé G')).toBe('shuffleleft');
    expect(matchExercise('Pas chassé à gauche')).toBe('shuffleleft');
    expect(matchExercise('Pas chassé alterné')).toBe('shufflealt');
    expect(matchExercise('Pas chassés')).toBe('shufflealt');
    expect(matchExercise('Tipping rapide')).toBe('tapping');
  });
  it('ne devine pas un exercice inconnu', () => {
    expect(matchExercise('Effort')).toBeNull();
    expect(matchExercise('Rameur')).toBeNull();
    expect(matchExercise('')).toBeNull();
    expect(matchExercise(undefined)).toBeNull();
  });
});

const AVATARS: Avatar[] = [
  DEFAULT_AVATAR,
  { ...DEFAULT_AVATAR, sex: 'm', build: 'forte', height: 'grande', age: 'senior' },
  { ...DEFAULT_AVATAR, build: 'mince', height: 'petite', age: 'jeune' },
];

describe('animation', () => {
  it('chaque posture reste dans le dessin et touche le sol', () => {
    for (const av of AVATARS) {
      for (const ex of EXERCISES) {
        const p = place(ex, dims(av));
        for (let i = 0; i < 24; i++) {
          const { j, pose } = frameAt(p, (ex.period * i) / 24);
          for (const [k, v] of Object.entries(j)) {
            if (k === 'up' || k === 'front') continue;
            expect(Number.isFinite(v[0]) && Number.isFinite(v[1])).toBe(true);
            expect(v[0]).toBeGreaterThan(0);
            expect(v[0]).toBeLessThan(VIEW_W);
            expect(v[1]).toBeGreaterThan(0);
          }
          // Point le plus bas posé au sol (ou en l'air pendant un saut).
          const low = lowest(j, p.d);
          expect(low).toBeCloseTo(GROUND - (pose.lift ?? 0), 5);
        }
      }
    }
  });
  it('la boucle est continue (fin du cycle = début)', () => {
    for (const ex of EXERCISES) {
      const p = place(ex, dims(DEFAULT_AVATAR));
      const a = frameAt(p, 0).j;
      const b = frameAt(p, ex.period - 1e-6).j;
      expect(Math.abs(a.headC[0] - b.headC[0])).toBeLessThan(0.01);
      expect(Math.abs(a.headC[1] - b.headC[1])).toBeLessThan(0.01);
    }
  });
  it('un avatar plus grand est plus grand', () => {
    const stand = { torso: 0, thighN: 0, shinN: 0, thighF: 0, shinF: 0, armN: 0, foreN: 0, armF: 0, foreF: 0 };
    const h = (av: Avatar) => {
      const d = dims(av);
      const j = solve(stand, d, 'side');
      return lowest(j, d) - (j.headC[1] - d.head);
    };
    expect(h({ ...DEFAULT_AVATAR, height: 'grande' })).toBeGreaterThan(h(DEFAULT_AVATAR));
    expect(h({ ...DEFAULT_AVATAR, height: 'petite' })).toBeLessThan(h(DEFAULT_AVATAR));
  });
});

describe('catégories', () => {
  it('abdos dans le tronc ; montées de genoux et talons-fesses en MI et en cardio', async () => {
    const { EXERCISE_BY_ID, inGroup } = await import('./exercises');
    expect(EXERCISE_BY_ID.situp.group).toBe('tronc');
    expect(EXERCISE_BY_ID.burpee.group).toBe('cardio');
    expect(EXERCISE_BY_ID.climber.group).toBe('tronc');
    for (const id of ['highknees', 'buttkicks'] as const) {
      expect(inGroup(EXERCISE_BY_ID[id], 'mi')).toBe(true);
      expect(inGroup(EXERCISE_BY_ID[id], 'cardio')).toBe(true);
    }
  });
});

describe('réglages', () => {
  it('activé par défaut, et complète un avatar partiel', () => {
    expect(normalizeAnim(undefined).enabled).toBe(true);
    expect(normalizeAnim({ enabled: false }).enabled).toBe(false);
    const a = normalizeAnim({ enabled: true, avatar: { sex: 'm' } as Avatar });
    expect(a.enabled).toBe(true);
    expect(a.avatar.sex).toBe('m');
    expect(a.avatar.top).toBe(DEFAULT_AVATAR.top);
    expect(normalizeAnim({ avatar: { ...DEFAULT_AVATAR, skin: 42 } }).avatar.skin).toBe(DEFAULT_AVATAR.skin);
  });
});

describe('exercices d’une phase', () => {
  const ph = (p: Partial<Phase>): Phase => ({ kind: 'work', label: 'Effort', duration: 20, countUp: false, blockIndex: 0, mode: 'tabata', ...p });
  const block = { id: 'b', mode: 'amrap', params: {}, restAfter: 0, exercises: [{ name: 'Pompes', reps: '10' }, { name: 'Rameur' }, { name: 'Squats', reps: '15' }] } as Block;
  it('prend le nom de la phase', () => {
    expect(phaseAnims(ph({ label: 'Burpees' }), block)).toEqual([{ id: 'burpee', name: 'Burpees' }]);
  });
  it('sinon les exercices reconnus du bloc', () => {
    expect(phaseAnims(ph({ label: 'AMRAP' }), block)).toEqual([{ id: 'pushup', name: '10 Pompes' }, { id: 'squat', name: '15 Squats' }]);
  });
  it('rien au repos ni à la préparation', () => {
    expect(phaseAnims(ph({ kind: 'rest', label: 'Squats' }), block)).toEqual([]);
    expect(phaseAnims(ph({ kind: 'prep', label: 'Préparation' }), block)).toEqual([]);
  });
});

describe('exercice choisi dans le créateur', () => {
  const base: Phase = { kind: 'work', label: 'Jambes', duration: 30, countUp: false, blockIndex: 0, mode: 'custom' };
  it('passe avant la reconnaissance par le nom', () => {
    expect(phaseAnims({ ...base, label: 'Pompes', exercise: 'squat' }, undefined)).toEqual([{ id: 'squat', name: 'Pompes' }]);
    expect(phaseAnims({ ...base, exercise: 'lunge' }, undefined)).toEqual([{ id: 'lunge', name: 'Jambes' }]);
  });
  it('ignore un exercice inconnu', () => {
    expect(phaseAnims({ ...base, exercise: 'nimporte' }, undefined)).toEqual([]);
  });
});
