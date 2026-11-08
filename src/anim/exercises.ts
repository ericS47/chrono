// Bibliothèque des exercices animés : postures clés enchaînées en boucle,
// et reconnaissance de l'exercice d'après son nom (« Squats », « 10 burpees »…).

import type { Pose, Dims, Joints, Pt } from './pose';
import { lerpPose, lowest, rotate, solve, translate } from './pose';
import { setExerciseLabels } from '../engine/timeline';

export type ExerciseId =
  | 'squat' | 'pushup' | 'plank' | 'jumpingjack' | 'lunge' | 'burpee' | 'climber' | 'situp' | 'highknees'
  | 'kneepushup' | 'bridge' | 'superman' | 'sideplank' | 'legraise' | 'calfraise' | 'jumpsquat' | 'birddog' | 'tapping'
  | 'buttkicks' | 'shuffleright' | 'shuffleleft' | 'shufflealt'
  | 'kbswing' | 'kbgoblet' | 'bandcurl' | 'bandraise'
  | 'dbcurl' | 'dbpress' | 'dbrow' | 'sittostand' | 'kneeext' | 'chairdips'
  | 'seatedmarch' | 'seateddbcurl' | 'seateddbpress' | 'seatedbandrow' | 'seatedkbraise';

type Anchor = 'feet' | 'hands' | 'hip';

interface Frame {
  pose: Pose;
  /** Point qui reste immobile au sol pendant le passage vers cette posture. */
  anchor?: Anchor;
  /** Durée relative du passage vers la posture suivante (1 par défaut). */
  w?: number;
  /** Déplacement latéral imposé (position de la hanche), pour les pas chassés. */
  x?: number;
}

/** Catégories : membres inférieurs, membres supérieurs, tronc, abdominaux, cardio. */
export type ExerciseGroup = 'mi' | 'ms' | 'tronc' | 'abdo' | 'cardio';
export const GROUP_LABELS: Record<ExerciseGroup, string> = { mi: 'MI · membres inférieurs', ms: 'MS · membres supérieurs', tronc: 'Tronc', abdo: 'Abdo', cardio: 'Cardio' };

export interface ExerciseAnim {
  id: ExerciseId;
  label: string;
  group: ExerciseGroup;
  view: 'side' | 'front';
  /** Durée d'un cycle, en secondes. */
  period: number;
  anchor: Anchor;
  frames: Frame[];
  /** Mots reconnus dans le nom de l'exercice (sans accents, en minuscules). */
  words: string[];
  /** Matériel (sans matériel par défaut), dessiné avec l'avatar. */
  equipment?: Equipment;
  /** Exercice sur chaise : chaise posée sous la hanche (assis) ou sous les mains (dips), d'après la première posture. */
  chairUnder?: 'hip' | 'hands';
}

/** Matériel : sans matériel, kettlebell, élastique, haltères. */
export type Equipment = 'none' | 'kettlebell' | 'band' | 'dumbbell';
export const EQUIPMENT_LABELS: Record<Equipment, string> = { none: 'Sans matériel', kettlebell: 'Kettlebell', band: 'Élastique', dumbbell: 'Haltères' };

/** Position : debout (ou au sol), ou sur une chaise (dessinée avec l'avatar). */
export type Position = 'standing' | 'chair';
export const POSITION_LABELS: Record<Position, string> = { standing: 'Debout', chair: 'Chaise' };
export const positionOf = (e: ExerciseAnim): Position => (e.chairUnder ? 'chair' : 'standing');
export const equipmentOf = (e: ExerciseAnim): Equipment => e.equipment ?? 'none';

const STAND: Pose = { torso: 0, thighN: 0, shinN: 0, thighF: -1, shinF: -1, armN: 8, foreN: 14, armF: -5, foreF: 3 };
const HIGH_PLANK: Pose = { torso: 68, head: -6, thighN: -68, shinN: -68, thighF: -68, shinF: -68, armN: 0, foreN: 0, armF: 3, foreF: 3 };
const BURPEE_LOW: Pose = { torso: 60, head: -30, thighN: 100, shinN: -35, thighF: 98, shinF: -35, armN: 35, foreN: 35, armF: 33, foreF: 33 };

// ---------- Pas chassés (vue de face, comme dans un miroir) ----------

const SH_ARMS = { armN: 28, foreN: 70, armF: 28, foreF: 70 };
const SH_JOINED: Pose = { torso: 0, thighN: 3, shinN: 2, thighF: 3, shinF: 2, ...SH_ARMS, lift: 3 };
/** Jambe écartée du côté du déplacement (n : droite de l'écran, f : gauche). */
const shApart = (side: 'n' | 'f'): Pose => side === 'n'
  ? { torso: 0, thighN: 22, shinN: 19, thighF: 6, shinF: 4, ...SH_ARMS, armN: 36, armF: 22 }
  : { torso: 0, thighN: 6, shinN: 4, thighF: 22, shinF: 19, ...SH_ARMS, armN: 22, armF: 36 };
/** Pas chassés dans un sens : de x0 à x0 + 3 pas (pas de ±8), puis retour éclair au départ. */
function shuffleOneWay(dir: 1 | -1): Frame[] {
  const side = dir === 1 ? 'n' : 'f';
  const out: Frame[] = [];
  for (let k = 0; k < 3; k++) {
    const x = dir * (-12 + k * 8);
    out.push({ pose: SH_JOINED, x });
    out.push({ pose: shApart(side), x: x + dir * 5 });
  }
  out.push({ pose: SH_JOINED, x: dir * 12, w: 0.25 });
  return out;
}
/** Pas chassé alterné : trois pas à droite, trois pas à gauche. */
function shuffleAlt(): Frame[] {
  const out: Frame[] = [];
  for (let k = 0; k < 3; k++) {
    out.push({ pose: SH_JOINED, x: -12 + k * 8 });
    out.push({ pose: shApart('n'), x: -12 + k * 8 + 5 });
  }
  for (let k = 0; k < 3; k++) {
    out.push({ pose: SH_JOINED, x: 12 - k * 8 });
    out.push({ pose: shApart('f'), x: 12 - k * 8 - 5 });
  }
  return out;
}

export const EXERCISES: ExerciseAnim[] = [
  {
    id: 'squat', label: 'Squat', group: 'mi', view: 'side', period: 2.4, anchor: 'feet', words: ['squat', 'flexion de jambe', 'flexions de jambe'],
    frames: [
      { pose: { ...STAND, torso: 4, armN: 10, foreN: 20, armF: 5, foreF: 12 } },
      { pose: { torso: 38, head: -22, thighN: 95, shinN: -28, thighF: 92, shinF: -30, armN: 88, foreN: 90, armF: 84, foreF: 88 } },
    ],
  },
  {
    id: 'pushup', label: 'Pompe', group: 'ms', view: 'side', period: 2.2, anchor: 'hands', words: ['pompe', 'push up', 'pushup'],
    frames: [
      { pose: HIGH_PLANK },
      { pose: { torso: 82, head: -6, thighN: -82, shinN: -82, thighF: -82, shinF: -82, armN: -72, foreN: 40, armF: -70, foreF: 42 } },
    ],
  },
  {
    id: 'plank', label: 'Gainage', group: 'tronc', view: 'side', period: 3, anchor: 'hands', words: ['gainage', 'planche', 'plank'],
    frames: [
      { pose: { torso: 81, head: -4, thighN: -81, shinN: -81, thighF: -81, shinF: -81, armN: 0, foreN: 90, armF: 2, foreF: 90 } },
      { pose: { torso: 81.6, head: -9, thighN: -81.6, shinN: -81.6, thighF: -81.6, shinF: -81.6, armN: 0, foreN: 90, armF: 2, foreF: 90 } },
    ],
  },
  {
    id: 'jumpingjack', label: 'Jumping jack', group: 'cardio', view: 'front', period: 1.3, anchor: 'hip', words: ['jumping jack', 'jumpingjack'],
    frames: [
      { pose: { torso: 0, thighN: 3, shinN: 2, thighF: 3, shinF: 2, armN: 8, foreN: 10, armF: 8, foreF: 10 } },
      { pose: { torso: 0, thighN: 11, shinN: 10, thighF: 11, shinF: 10, armN: 90, foreN: 100, armF: 90, foreF: 100, lift: 7 } },
      { pose: { torso: 0, thighN: 20, shinN: 18, thighF: 20, shinF: 18, armN: 165, foreN: 172, armF: 165, foreF: 172 } },
      { pose: { torso: 0, thighN: 11, shinN: 10, thighF: 11, shinF: 10, armN: 90, foreN: 100, armF: 90, foreF: 100, lift: 7 } },
    ],
  },
  {
    id: 'lunge', label: 'Fente', group: 'mi', view: 'side', period: 2.6, anchor: 'feet', words: ['fente', 'lunge'],
    frames: [
      { pose: { torso: 0, thighN: 16, shinN: 0, thighF: -16, shinF: -20, armN: 10, foreN: 15, armF: -10, foreF: -5 } },
      { pose: { torso: 2, thighN: 86, shinN: 2, thighF: -28, shinF: -100, armN: 6, foreN: 12, armF: -6, foreF: 0 } },
    ],
  },
  {
    id: 'burpee', label: 'Burpee', group: 'ms', view: 'side', period: 3.2, anchor: 'feet', words: ['burpee'],
    frames: [
      { pose: STAND, anchor: 'feet' },
      { pose: BURPEE_LOW, anchor: 'feet', w: 0.7 },
      { pose: HIGH_PLANK, anchor: 'hands', w: 0.7 },
      { pose: BURPEE_LOW, anchor: 'hands' },
      { pose: { torso: 0, thighN: 2, shinN: 4, thighF: 0, shinF: 3, armN: 170, foreN: 175, armF: 168, foreF: 172, lift: 10 }, anchor: 'feet', w: 0.8 },
    ],
  },
  {
    id: 'climber', label: 'Mountain climber', group: 'cardio', view: 'side', period: 0.9, anchor: 'hands', words: ['mountain climber', 'climber', 'grimpeur'],
    frames: [
      { pose: { ...HIGH_PLANK, thighN: 55, shinN: -95 } },
      { pose: { ...HIGH_PLANK, thighF: 55, shinF: -95 } },
    ],
  },
  {
    id: 'situp', label: 'Abdos', group: 'abdo', view: 'side', period: 2.4, anchor: 'hip', words: ['abdo', 'sit up', 'situp', 'crunch', 'relevé de buste', 'releve de buste'],
    frames: [
      { pose: { torso: -84, head: 8, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 150, foreN: 150, armF: 146, foreF: 146 } },
      { pose: { torso: -18, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 95, foreN: 98, armF: 92, foreF: 95 } },
    ],
  },
  {
    id: 'highknees', label: 'Montées de genoux', group: 'mi', view: 'side', period: 0.75, anchor: 'hip', words: ['montee de genou', 'montees de genou', 'high knee', 'genoux haut', 'genoux poitrine'],
    frames: [
      { pose: { torso: -2, thighN: 95, shinN: 5, thighF: 2, shinF: 2, armN: -35, foreN: 30, armF: 45, foreF: 120, lift: 2 } },
      { pose: { torso: -2, thighN: 2, shinN: 2, thighF: 95, shinF: 5, armN: 45, foreN: 120, armF: -35, foreF: 30, lift: 2 } },
    ],
  },
  {
    id: 'kneepushup', label: 'Pompe sur les genoux', group: 'ms', view: 'side', period: 2.2, anchor: 'hands',
    words: ['pompe sur les genou', 'pompe genou', 'pompe a genou', 'knee push up', 'knee pushup'],
    frames: [
      { pose: { torso: 50, head: -6, thighN: -50, shinN: -100, thighF: -50, shinF: -100, armN: 0, foreN: 0, armF: 3, foreF: 3 } },
      { pose: { torso: 72, head: -6, thighN: -72, shinN: -100, thighF: -72, shinF: -100, armN: -72, foreN: 40, armF: -70, foreF: 42 } },
    ],
  },
  {
    id: 'bridge', label: 'Pont fessier', group: 'mi', view: 'side', period: 2.8, anchor: 'feet',
    words: ['pont fessier', 'pont', 'glute bridge', 'hip thrust', 'releve de bassin'],
    frames: [
      { pose: { torso: -88, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 70, foreN: 85, armF: 68, foreF: 85 } },
      { pose: { torso: -112, head: 14, thighN: 100, shinN: -5, thighF: 98, shinF: -5, armN: 60, foreN: 80, armF: 58, foreF: 80 }, w: 0.5 },
      { pose: { torso: -112, head: 14, thighN: 100, shinN: -5, thighF: 98, shinF: -5, armN: 60, foreN: 80, armF: 58, foreF: 80 } },
    ],
  },
  {
    id: 'superman', label: 'Superman', group: 'tronc', view: 'side', period: 2.8, anchor: 'hip', words: ['superman'],
    frames: [
      { pose: { torso: 90, head: 0, thighN: -90, shinN: -90, thighF: -90, shinF: -90, armN: 90, foreN: 90, armF: 92, foreF: 92 } },
      { pose: { torso: 80, head: -8, thighN: -100, shinN: -102, thighF: -100, shinF: -102, armN: 105, foreN: 108, armF: 107, foreF: 110 }, w: 0.5 },
      { pose: { torso: 80, head: -8, thighN: -100, shinN: -102, thighF: -100, shinF: -102, armN: 105, foreN: 108, armF: 107, foreF: 110 } },
    ],
  },
  {
    id: 'sideplank', label: 'Gainage latéral', group: 'tronc', view: 'front', period: 3, anchor: 'hands',
    words: ['gainage lateral', 'planche laterale', 'side plank', 'gainage sur le cote'],
    frames: [
      { pose: { torso: 0, roll: 70, thighN: 2, shinN: 1, thighF: 2, shinF: 1, armN: 70, foreN: 160, armF: 110, foreF: 110 } },
      { pose: { torso: 0, roll: 66, thighN: 2, shinN: 1, thighF: 2, shinF: 1, armN: 74, foreN: 156, armF: 112, foreF: 112 } },
    ],
  },
  {
    id: 'legraise', label: 'Relevés de jambes', group: 'abdo', view: 'side', period: 2.6, anchor: 'hip',
    words: ['releve de jambe', 'releves de jambe', 'leg raise', 'levee de jambe'],
    frames: [
      { pose: { torso: -88, head: 6, thighN: 92, shinN: 92, thighF: 91, shinF: 91, armN: 70, foreN: 85, armF: 68, foreF: 85 } },
      { pose: { torso: -88, head: 6, thighN: 168, shinN: 168, thighF: 166, shinF: 166, armN: 70, foreN: 85, armF: 68, foreF: 85 } },
    ],
  },
  {
    id: 'calfraise', label: 'Mollets', group: 'mi', view: 'side', period: 1.6, anchor: 'feet',
    words: ['mollet', 'calf raise', 'montee sur pointe', 'extension de cheville'],
    frames: [
      { pose: { ...STAND, armN: 4, foreN: 8, armF: -4, foreF: 2 } },
      { pose: { ...STAND, armN: 4, foreN: 8, armF: -4, foreF: 2, heel: 45 }, w: 0.6 },
      { pose: { ...STAND, armN: 4, foreN: 8, armF: -4, foreF: 2, heel: 45 } },
    ],
  },
  {
    id: 'jumpsquat', label: 'Squat sauté', group: 'mi', view: 'side', period: 1.5, anchor: 'feet',
    words: ['squat saute', 'jump squat', 'squat jump', 'saut squat'],
    frames: [
      { pose: { torso: 38, head: -22, thighN: 95, shinN: -28, thighF: 92, shinF: -30, armN: -35, foreN: -25, armF: -38, foreF: -28 }, w: 0.55 },
      { pose: { torso: 0, thighN: 2, shinN: 2, thighF: 0, shinF: 0, armN: 160, foreN: 165, armF: 158, foreF: 163, lift: 12, heel: 30 } },
    ],
  },
  {
    id: 'birddog', label: 'Bird dog', group: 'tronc', view: 'side', period: 4, anchor: 'hip',
    words: ['bird dog', 'birddog', 'quadrupedie', 'superman a 4 pattes', 'chien d arret'],
    frames: [
      { pose: { torso: 72, head: -10, thighN: 0, shinN: -90, thighF: 0, shinF: -90, armN: 0, foreN: 0, armF: 2, foreF: 2 } },
      { pose: { torso: 72, head: -14, thighN: 0, shinN: -90, thighF: -72, shinF: -72, armN: 108, foreN: 108, armF: 2, foreF: 2 }, w: 0.8 },
      { pose: { torso: 72, head: -10, thighN: 0, shinN: -90, thighF: 0, shinF: -90, armN: 0, foreN: 0, armF: 2, foreF: 2 } },
      { pose: { torso: 72, head: -14, thighN: -72, shinN: -72, thighF: 0, shinF: -90, armN: 0, foreN: 0, armF: 108, foreF: 108 }, w: 0.8 },
    ],
  },
  {
    id: 'tapping', label: 'Tapping', group: 'cardio', view: 'side', period: 0.4, anchor: 'hip',
    words: ['tapping', 'tipping', 'pietinement', 'fast feet', 'appuis rapides', 'pas rapides'],
    frames: [
      { pose: { torso: 16, head: -12, thighN: 42, shinN: -22, thighF: 26, shinF: -18, armN: 25, foreN: 105, armF: -15, foreF: 75, lift: 1 } },
      { pose: { torso: 16, head: -12, thighN: 26, shinN: -18, thighF: 42, shinF: -22, armN: -15, foreN: 75, armF: 25, foreF: 105, lift: 1 } },
    ],
  },
  {
    id: 'buttkicks', label: 'Talons-fesses', group: 'cardio', view: 'side', period: 0.62, anchor: 'hip',
    words: ['talon fesse', 'talons fesses', 'talon aux fesse', 'butt kick', 'heel kick'],
    frames: [
      { pose: { torso: 6, head: -4, thighN: 8, shinN: -150, thighF: -2, shinF: 2, armN: -30, foreN: 50, armF: 35, foreF: 115, lift: 3 } },
      { pose: { torso: 6, head: -4, thighN: -2, shinN: 2, thighF: 8, shinF: -150, armN: 35, foreN: 115, armF: -30, foreF: 50, lift: 3 } },
    ],
  },
  {
    id: 'shuffleright', label: 'Pas chassé droite', group: 'cardio', view: 'front', period: 2.4, anchor: 'hip',
    words: ['pas chasse d', 'pas chasse droite', 'pas chasse a droite', 'pas chasse vers la droite', 'chasse droite', 'chasse d'],
    frames: shuffleOneWay(1),
  },
  {
    id: 'shuffleleft', label: 'Pas chassé gauche', group: 'cardio', view: 'front', period: 2.4, anchor: 'hip',
    words: ['pas chasse g', 'pas chasse gauche', 'pas chasse a gauche', 'pas chasse vers la gauche', 'chasse gauche', 'chasse g'],
    frames: shuffleOneWay(-1),
  },
  {
    id: 'shufflealt', label: 'Pas chassé alterné', group: 'cardio', view: 'front', period: 4.2, anchor: 'hip',
    words: ['pas chasse alterne', 'pas chasse', 'chasse alterne', 'pas chasses', 'shuffle'],
    frames: shuffleAlt(),
  },
  {
    id: 'kbswing', label: 'Kettlebell swing', group: 'mi', view: 'side', period: 1.7, anchor: 'feet', equipment: 'kettlebell',
    words: ['kettlebell swing', 'swing kettlebell', 'swing', 'kb swing'],
    frames: [
      { pose: { torso: 68, head: -30, thighN: 28, shinN: -12, thighF: 26, shinF: -12, armN: -18, foreN: -22, armF: -16, foreF: -20 }, w: 0.8 },
      { pose: { torso: -2, head: 0, thighN: 0, shinN: 0, thighF: -1, shinF: -1, armN: 92, foreN: 92, armF: 90, foreF: 90 } },
    ],
  },
  {
    id: 'kbgoblet', label: 'Goblet squat', group: 'mi', view: 'side', period: 2.6, anchor: 'feet', equipment: 'kettlebell',
    words: ['goblet squat', 'squat goblet', 'goblet', 'squat kettlebell', 'squat avec kettlebell'],
    frames: [
      { pose: { torso: 2, thighN: 0, shinN: 0, thighF: -1, shinF: -1, armN: 22, foreN: 160, armF: 20, foreF: 158 } },
      { pose: { torso: 28, head: -14, thighN: 98, shinN: -30, thighF: 95, shinF: -32, armN: 40, foreN: 172, armF: 38, foreF: 170 } },
    ],
  },
  {
    id: 'bandcurl', label: 'Curl biceps (élastique)', group: 'ms', view: 'side', period: 2.2, anchor: 'feet', equipment: 'band',
    words: ['curl biceps', 'curl', 'flexion du coude', 'biceps'],
    frames: [
      { pose: { ...STAND, armN: 4, foreN: 12, armF: 2, foreF: 10 } },
      { pose: { ...STAND, armN: 8, foreN: 150, armF: 6, foreF: 148 } },
    ],
  },
  {
    id: 'bandraise', label: 'Élévations latérales (élastique)', group: 'ms', view: 'front', period: 2.4, anchor: 'hip', equipment: 'band',
    words: ['elevation laterale', 'elevations laterale', 'lateral raise', 'abduction d epaule', 'abduction epaule'],
    frames: [
      { pose: { torso: 0, thighN: 7, shinN: 6, thighF: 7, shinF: 6, armN: 10, foreN: 12, armF: 10, foreF: 12 } },
      { pose: { torso: 0, thighN: 7, shinN: 6, thighF: 7, shinF: 6, armN: 86, foreN: 90, armF: 86, foreF: 90 } },
    ],
  },
  {
    id: 'dbcurl', label: 'Curl biceps (haltères)', group: 'ms', view: 'side', period: 2.2, anchor: 'feet', equipment: 'dumbbell',
    words: ['curl haltere', 'curl biceps haltere', 'curl avec haltere', 'curl biceps aux haltere'],
    frames: [
      { pose: { ...STAND, armN: 4, foreN: 10, armF: 2, foreF: 8 } },
      { pose: { ...STAND, armN: 8, foreN: 150, armF: 6, foreF: 148 } },
    ],
  },
  {
    id: 'dbpress', label: 'Développé épaules', group: 'ms', view: 'front', period: 2.4, anchor: 'hip', equipment: 'dumbbell',
    words: ['developpe epaule', 'developpe militaire', 'shoulder press', 'presse epaule'],
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 92, foreN: 178, armF: 92, foreF: 178 } },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 162, foreN: 172, armF: 162, foreF: 172 } },
    ],
  },
  {
    id: 'dbrow', label: 'Rowing haltère', group: 'ms', view: 'side', period: 2.2, anchor: 'feet', equipment: 'dumbbell',
    words: ['rowing haltere', 'rowing', 'tirage haltere', 'row'],
    frames: [
      { pose: { torso: 62, head: -22, thighN: 22, shinN: -10, thighF: 20, shinF: -10, armN: 2, foreN: 2, armF: 0, foreF: 0 } },
      { pose: { torso: 62, head: -22, thighN: 22, shinN: -10, thighF: 20, shinF: -10, armN: -62, foreN: 8, armF: -60, foreF: 6 } },
    ],
  },
  {
    id: 'sittostand', label: 'Assis-debout', group: 'mi', view: 'side', period: 3.4, anchor: 'feet', chairUnder: 'hip',
    words: ['assis debout', 'lever de chaise', 'se lever de la chaise', 'sit to stand', 'debout assis'],
    frames: [
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 80, foreN: 85, armF: 78, foreF: 83 }, w: 0.6 },
      { pose: { torso: 42, head: -15, thighN: 62, shinN: -12, thighF: 60, shinF: -12, armN: 85, foreN: 88, armF: 83, foreF: 86 }, w: 0.7 },
      { pose: { ...STAND, armN: 75, foreN: 82, armF: 73, foreF: 80 }, w: 0.5 },
      { pose: { ...STAND, armN: 75, foreN: 82, armF: 73, foreF: 80 }, w: 0.7 },
      { pose: { torso: 42, head: -15, thighN: 62, shinN: -12, thighF: 60, shinF: -12, armN: 85, foreN: 88, armF: 83, foreF: 86 }, w: 0.7 },
    ],
  },
  {
    id: 'kneeext', label: 'Extension de genou assis', group: 'mi', view: 'side', period: 2.6, anchor: 'hip', chairUnder: 'hip',
    words: ['extension de genou', 'extension genou', 'extension de jambe assis', 'levee de jambe assis', 'leve de jambe assis', 'quadriceps assis'],
    frames: [
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 20, foreN: 60, armF: 18, foreF: 58 } },
      { pose: { torso: 0, thighN: 90, shinN: 86, thighF: 88, shinF: 0, armN: 20, foreN: 60, armF: 18, foreF: 58 }, w: 0.5 },
      { pose: { torso: 0, thighN: 90, shinN: 86, thighF: 88, shinF: 0, armN: 20, foreN: 60, armF: 18, foreF: 58 } },
    ],
  },
  {
    id: 'chairdips', label: 'Dips sur chaise', group: 'ms', view: 'side', period: 2.4, anchor: 'hands', chairUnder: 'hands',
    words: ['dips', 'dip sur chaise', 'dips sur chaise', 'triceps chaise', 'extension triceps chaise'],
    frames: [
      { pose: { torso: 0, thighN: 70, shinN: 45, thighF: 68, shinF: 45, armN: -12, foreN: -12, armF: -10, foreF: -10 } },
      { pose: { torso: 6, thighN: 85, shinN: 75, thighF: 83, shinF: 75, armN: -80, foreN: 12, armF: -78, foreF: 14 } },
    ],
  },
  {
    id: 'seatedmarch', label: 'Montée de genou assis', group: 'mi', view: 'side', period: 1.8, anchor: 'hip', chairUnder: 'hip',
    words: ['montee de genou assis', 'montees de genou assis', 'marche assis', 'genou assis'],
    frames: [
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 20, foreN: 60, armF: 18, foreF: 58 } },
      { pose: { torso: 0, thighN: 125, shinN: 20, thighF: 88, shinF: 0, armN: 20, foreN: 60, armF: 18, foreF: 58 } },
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 20, foreN: 60, armF: 18, foreF: 58 } },
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 123, shinF: 20, armN: 20, foreN: 60, armF: 18, foreF: 58 } },
    ],
  },
  {
    id: 'seateddbcurl', label: 'Curl biceps assis (haltères)', group: 'ms', view: 'side', period: 2.2, anchor: 'hip', equipment: 'dumbbell', chairUnder: 'hip',
    words: ['curl assis', 'curl biceps assis', 'curl haltere assis'],
    frames: [
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 4, foreN: 10, armF: 2, foreF: 8 } },
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 8, foreN: 150, armF: 6, foreF: 148 } },
    ],
  },
  {
    id: 'seateddbpress', label: 'Développé épaules assis', group: 'ms', view: 'side', period: 2.4, anchor: 'hip', equipment: 'dumbbell', chairUnder: 'hip',
    words: ['developpe epaule assis', 'developpe assis', 'shoulder press assis'],
    frames: [
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 20, foreN: 170, armF: 18, foreF: 168 } },
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 172, foreN: 176, armF: 170, foreF: 174 } },
    ],
  },
  {
    id: 'seatedbandrow', label: 'Rowing assis (élastique)', group: 'ms', view: 'side', period: 2.4, anchor: 'hip', equipment: 'band', chairUnder: 'hip',
    words: ['rowing assis', 'rowing elastique', 'tirage assis', 'tirage elastique'],
    frames: [
      { pose: { torso: 10, thighN: 90, shinN: 30, thighF: 88, shinF: 30, armN: 58, foreN: 62, armF: 56, foreF: 60 } },
      { pose: { torso: -4, thighN: 90, shinN: 30, thighF: 88, shinF: 30, armN: -35, foreN: 75, armF: -33, foreF: 73 } },
    ],
  },
  {
    id: 'seatedkbraise', label: 'Élévation frontale assis (kettlebell)', group: 'ms', view: 'side', period: 2.4, anchor: 'hip', equipment: 'kettlebell', chairUnder: 'hip',
    words: ['elevation frontale assis', 'elevation frontale', 'front raise'],
    frames: [
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 30, foreN: 32, armF: 28, foreF: 30 } },
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 95, foreN: 95, armF: 93, foreF: 93 } },
    ],
  },
];

export const EXERCISE_BY_ID: Record<ExerciseId, ExerciseAnim> = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<ExerciseId, ExerciseAnim>;

export function isExerciseId(id: string | undefined): id is ExerciseId {
  return !!id && id in EXERCISE_BY_ID;
}

// Un bloc du créateur sans commentaire prend le nom de l'exercice choisi (affichage et voix).
setExerciseLabels((id) => (isExerciseId(id) ? EXERCISE_BY_ID[id].label : undefined));

/** Minuscules, sans accents ni ponctuation, pluriels simples retirés. */
export function normalizeName(s: string): string {
  return ` ${s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
    .replace(/(\w{3,})s(?= )/g, '$1');
}

/** Exercice animé correspondant à un nom, ou null si inconnu. */
export function matchExercise(name: string | undefined): ExerciseId | null {
  if (!name) return null;
  const n = normalizeName(name);
  let best: ExerciseId | null = null;
  let len = 0;
  for (const e of EXERCISES) {
    for (const w of e.words) {
      const k = normalizeName(w).trimEnd();
      // Le mot le plus long l'emporte : « pompe sur les genoux » avant « pompe », « squat sauté » avant « squat ».
      if (k.length > len && n.includes(k)) {
        best = e.id;
        len = k.length;
      }
    }
  }
  return best;
}

// ---------- Placement dans le dessin ----------

export const VIEW_W = 150;
export const VIEW_H = 150;
export const GROUND = 140;

const anchorX = (j: Joints, a: Anchor): number =>
  a === 'feet' ? j.ankleN[0] : a === 'hands' ? j.handN[0] : j.hip[0];

export interface Placed {
  ex: ExerciseAnim;
  d: Dims;
  /** Décalage horizontal de chaque posture clé (point d'appui immobile). */
  tx: number[];
  /** Temps cumulé (0 à 1) du début de chaque passage. */
  starts: number[];
}

/** Prépare un exercice pour un avatar : décalages horizontaux et centrage. */
export function place(ex: ExerciseAnim, d: Dims): Placed {
  const js = ex.frames.map((f) => rotate(solve(f.pose, d, ex.view), f.pose.roll ?? 0));
  const tx: number[] = [];
  js.forEach((j, i) => {
    const a = ex.frames[i].anchor ?? ex.anchor;
    const x = ex.frames[i].x;
    if (x !== undefined) tx.push(x - j.hip[0]);
    else if (i === 0) tx.push(-anchorX(j, a));
    else tx.push(anchorX(js[i - 1], a) + tx[i - 1] - anchorX(j, a));
  });
  // Centrage horizontal sur l'ensemble du mouvement.
  let min = Infinity;
  let max = -Infinity;
  js.forEach((j, i) => {
    for (const k of Object.keys(j) as (keyof Joints)[]) {
      if (k === 'up' || k === 'front') continue;
      const x = j[k][0] + tx[i];
      min = Math.min(min, x - 6);
      max = Math.max(max, x + 6);
    }
  });
  const c = VIEW_W / 2 - (min + max) / 2;
  const ws = ex.frames.map((f) => f.w ?? 1);
  const total = ws.reduce((a, b) => a + b, 0);
  const starts: number[] = [];
  ws.reduce((acc, w) => (starts.push(acc / total), acc + w), 0);
  return { ex, d, tx: tx.map((x) => x + c), starts };
}

const ease = (t: number) => t * t * (3 - 2 * t);

/** Articulations à l'instant `sec`, posées sur le sol du dessin. */
/**
 * `j` : articulations posées sur le sol (corps basculé compris).
 * `flat` et `roll` : les mêmes avant bascule, et l'angle de bascule, pour le dessin
 * (le corps est dessiné droit puis tourné d'un bloc autour de la hanche).
 */
export function frameAt(p: Placed, sec: number): { j: Joints; flat: Joints; roll: number; pose: Pose } {
  const n = p.ex.frames.length;
  const ph = (((sec / p.ex.period) % 1) + 1) % 1;
  let i = n - 1;
  while (i > 0 && p.starts[i] > ph) i--;
  const end = i + 1 < n ? p.starts[i + 1] : 1;
  const t = ease((ph - p.starts[i]) / (end - p.starts[i]));
  const a = p.ex.frames[i];
  const b = p.ex.frames[(i + 1) % n];
  const pose = lerpPose(a.pose, b.pose, t);
  const dx = p.tx[i] + (p.tx[(i + 1) % n] - p.tx[i]) * t;
  const roll = pose.roll ?? 0;
  const flat0 = solve(pose, p.d, p.ex.view);
  const j0 = rotate(flat0, roll);
  const dy = GROUND - (pose.lift ?? 0) - lowest(j0, p.d);
  return { j: translate(j0, dx, dy), flat: translate(flat0, dx, dy), roll, pose };
}

/**
 * Cadre serré d'un exercice : le mouvement complet du plus grand avatar possible,
 * pour qu'une pompe (allongée) remplisse le dessin autant qu'un squat.
 * Un avatar plus petit reste plus petit dans le même cadre.
 */
/** Chaise : dessus de l'assise et bord avant, d'après la première posture (fixe pendant le mouvement). */
export function chairPos(p: Placed): { seatY: number; front: number } | null {
  if (!p.ex.chairUnder) return null;
  const j0 = frameAt(p, 0).j;
  if (p.ex.chairUnder === 'hands') return { seatY: j0.handN[1] + p.d.wFore * 0.5, front: j0.handN[0] + 1.5 };
  return { seatY: j0.hip[1] + p.d.wTorso * 0.47, front: j0.hip[0] + 9 };
}
export const CHAIR_DEPTH = 20;
export const CHAIR_BACK = 30;

export interface Box { x: number; y: number; w: number; h: number }
const boxes = new Map<ExerciseId, Box>();
export function frameBox(ex: ExerciseAnim, ref: Dims): Box {
  const hit = boxes.get(ex.id);
  if (hit) return hit;
  const p = place(ex, ref);
  let half = 0;
  let top = GROUND;
  for (let i = 0; i < 48; i++) {
    const { j } = frameAt(p, (ex.period * i) / 48);
    for (const k of Object.keys(j) as (keyof Joints)[]) {
      if (k === 'up' || k === 'front') continue;
      half = Math.max(half, Math.abs(j[k][0] - VIEW_W / 2));
      top = Math.min(top, j[k][1]);
    }
  }
  // Chaise : le cadre l'inclut entièrement (dossier compris).
  const chair = chairPos(p);
  if (chair) {
    half = Math.max(half, VIEW_W / 2 - (chair.front - CHAIR_DEPTH - 1), chair.front + 1 - VIEW_W / 2);
    top = Math.min(top, chair.seatY - CHAIR_BACK + ref.head);
  }
  const pad = 9;
  const y = Math.max(0, top - ref.head - pad);
  const box = { x: VIEW_W / 2 - half - pad, y, w: 2 * (half + pad), h: GROUND + 6 - y };
  boxes.set(ex.id, box);
  return box;
}

export type { Pt };
