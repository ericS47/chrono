// Bibliothèque des exercices animés : postures clés enchaînées en boucle,
// et reconnaissance de l'exercice d'après son nom (« Squats », « 10 burpees »…).

import type { Pose, Dims, Joints, Pt } from './pose';
import { lerpPose, lowest, rotate, solve, translate } from './pose';
import { setExerciseLabels } from '../engine/timeline';
import type { VariantKey } from './variants';
import { MI_HANDS_CHEST, deadliftFrames, sideLungeFrames, sumoFrames, variantsOf } from './variants';
import { DEADBUG, haloFrames, RENEGADE, sideBend } from './variants';

/** Exercices écrits à la main. */
export type BaseExerciseId =
  | 'squat' | 'pushup' | 'plank' | 'jumpingjack' | 'lunge' | 'burpee' | 'climber' | 'situp' | 'highknees'
  | 'kneepushup' | 'bridge' | 'superman' | 'sideplank' | 'legraise' | 'calfraise' | 'jumpsquat' | 'birddog' | 'tapping'
  | 'buttkicks' | 'shuffleright' | 'shuffleleft' | 'shufflealt'
  | 'kbswing' | 'kbgoblet' | 'bandcurl' | 'bandraise'
  | 'dbcurl' | 'dbpress' | 'dbrow' | 'sittostand' | 'kneeext' | 'chairdips'
  | 'seatedmarch' | 'seateddbcurl' | 'seateddbpress' | 'seatedbandrow' | 'seatedkbraise'
  | 'ringpress' | 'ringbridge'
  | 'bulgarian' | 'toeraise' | 'legabduction' | 'legadduction' | 'kickback'
  | 'sumosquat' | 'sidelunge' | 'deadlift' | 'bandwalk' // MI : squat sumo, fente latérale, soulevé de terre, marche latérale
  | 'pressup' | 'pressforward' | 'curlbw' | 'tricepsbw' | 'shrug' | 'uprightrow' | 'lateralbw' | 'frontbw' | 'pecfly'
  | 'arnold' | 'dbarnold'
  | 'situpfull' | 'obliques' | 'shouldertap' | 'dynplank' | 'woodchop' | 'goodmorning' | 'supermanfront' | 'supermanside'
  // MS avec matériel
  | 'dbkickback' | 'dbhammer' | 'dbpullover' | 'dbfloorpress' | 'ringoverhead' | 'ringbehind' | 'ringside'
  // Cardio
  | 'shadowbox' | 'jumprope' | 'thruster' | 'kbhighpull'
  // Tronc : exercices ajoutés pour les variantes avec matériel.
  | 'deadbug' | 'sidebend' | 'renegaderow' | 'halo';
/** Exercice écrit à la main, ou une de ses variantes générées (chaise, matériel) : « curlbw-db-c »… */
export type ExerciseId = BaseExerciseId | `${BaseExerciseId}-${VariantKey}`;

export type Anchor = 'feet' | 'hands' | 'hip';

export interface Frame {
  pose: Pose;
  /** Point qui reste immobile au sol pendant le passage vers cette posture. */
  anchor?: Anchor;
  /** Durée relative du passage vers la posture suivante (1 par défaut). */
  w?: number;
  /** Déplacement latéral imposé (position de la hanche), pour les pas chassés. */
  x?: number;
}

/** Catégories : membres inférieurs, membres supérieurs, tronc (abdos compris), cardio. */
export type ExerciseGroup = 'mi' | 'ms' | 'tronc' | 'cardio';
export const GROUP_LABELS: Record<ExerciseGroup, string> = { mi: 'MI · membres inférieurs', ms: 'MS · membres supérieurs', tronc: 'Tronc', cardio: 'Cardio' };

export interface ExerciseAnim {
  id: ExerciseId;
  label: string;
  group: ExerciseGroup;
  /** Catégories supplémentaires (l'exercice apparaît aussi dans ces bandeaux). */
  also?: ExerciseGroup[];
  view: 'side' | 'front';
  /** Durée d'un cycle, en secondes. */
  period: number;
  anchor: Anchor;
  frames: Frame[];
  /** Mots reconnus dans le nom de l'exercice (sans accents, en minuscules). */
  words: string[];
  /** Matériel (sans matériel par défaut), dessiné avec l'avatar. */
  equipment?: Equipment;
  /** Branches où l'exercice apparaît (par défaut : chaise s'il y en a une, sinon debout). */
  positions?: Position[];
  /** Exercice sur chaise : chaise posée sous la hanche (assis) ou sous les mains (dips), d'après la première posture. */
  chairUnder?: ChairUnder;
  /** Où se tient le matériel (par défaut selon le matériel et la vue). */
  grip?: Grip;
}

/**
 * Prise du matériel : `one` un seul objet tenu à deux mains, `each` un par main,
 * `hands` anneau entre les mains, `knees` / `ankles` anneau ou élastique autour des genoux / des chevilles,
 * `foot` élastique sous le pied proche (pied avant d'une fente), une extrémité dans chaque main,
 * `near` une seule charge dans la main proche (élastique : du pied à la main proches) ;
 * haltère avec `ankles` : serré entre les pieds.
 */
export type Grip = 'one' | 'each' | 'hands' | 'knees' | 'ankles'
  // MS : `hammer` haltère en prise neutre (curl marteau), `back` élastique passé dans le dos,
  // `side` anneau serré entre le bras et la hanche.
  | 'hammer' | 'back' | 'side'
  // MI
  | 'foot'
  // Tronc
  | 'near';

/** Matériel : sans matériel, kettlebell, élastique, haltères, anneau de Pilates. */
export type Equipment = 'none' | 'kettlebell' | 'band' | 'dumbbell' | 'ring';
export const EQUIPMENT_LABELS: Record<Equipment, string> = { none: 'Sans matériel', kettlebell: 'Kettlebell', band: 'Élastique', dumbbell: 'Haltères', ring: 'Anneau de Pilates' };

/** Position : debout (ou au sol), ou sur une chaise (dessinée avec l'avatar). */
export type Position = 'standing' | 'chair';
/**
 * Appui sur la chaise : hanche (assis), mains (dips, dos à la chaise), pied arrière (squat sur une jambe),
 * mains sur l'assise face à la chaise (`incline` : pompe inclinée, gainage) ou mains sur le dossier (`rest`).
 */
export type ChairUnder = 'hip' | 'hands' | 'foot' | 'incline' | 'rest';
export const POSITION_LABELS: Record<Position, string> = { standing: 'Debout', chair: 'Chaise' };
export const positionOf = (e: ExerciseAnim): Position => (e.chairUnder ? 'chair' : 'standing');
/** L'exercice apparaît-il dans cette branche (debout ou chaise) ? */
export const inPosition = (e: ExerciseAnim, pos: Position): boolean => (e.positions ?? [positionOf(e)]).includes(pos);
export const equipmentOf = (e: ExerciseAnim): Equipment => e.equipment ?? 'none';
/** L'exercice appartient-il à cette catégorie (principale ou supplémentaire) ? */
export const inGroup = (e: ExerciseAnim, g: ExerciseGroup): boolean => e.group === g || !!e.also?.includes(g);

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

// ---------- Cardio : boxe dans le vide ----------
/** Appui décalé, genoux fléchis, en garde. */
const SHADOW_LEGS = { torso: 6, head: -4, thighN: 18, shinN: 2, thighF: -8, shinF: -18 };
const GUARD = { armN: 24, foreN: 165, armF: 22, foreF: 163 };

// ---------- MI : marche latérale (les autres postures MI sont dans variants.ts) ----------

/** Marche latérale, mini-bande aux genoux, en demi-squat : deux pas à droite, deux pas à gauche (pied d'appui fixe). */
function bandWalkFrames(): Frame[] {
  const arms = MI_HANDS_CHEST;
  const joined: Pose = { torso: 0, thighN: 10, shinN: 4, thighF: 10, shinF: 4, legReach: 0.8, ...arms };
  const apart: Pose = { torso: 0, thighN: 18, shinN: 12, thighF: 18, shinF: 12, legReach: 0.8, ...arms };
  const d = 5.8;
  return [
    { pose: joined, x: -4 * d }, { pose: apart, x: -3 * d }, { pose: joined, x: -2 * d }, { pose: apart, x: -d },
    { pose: joined, x: 0 }, { pose: apart, x: -d }, { pose: joined, x: -2 * d }, { pose: apart, x: -3 * d },
  ].map((f) => ({ ...f, x: f.x + 2 * d, w: 0.5 }));
}

const BASE: ExerciseAnim[] = [
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
    id: 'burpee', label: 'Burpee', group: 'cardio', view: 'side', period: 3.2, anchor: 'feet', words: ['burpee'],
    frames: [
      { pose: STAND, anchor: 'feet' },
      { pose: BURPEE_LOW, anchor: 'feet', w: 0.7 },
      { pose: HIGH_PLANK, anchor: 'hands', w: 0.7 },
      { pose: BURPEE_LOW, anchor: 'hands' },
      { pose: { torso: 0, thighN: 2, shinN: 4, thighF: 0, shinF: 3, armN: 170, foreN: 175, armF: 168, foreF: 172, lift: 10 }, anchor: 'feet', w: 0.8 },
    ],
  },
  {
    id: 'climber', label: 'Mountain climber', group: 'tronc', view: 'side', period: 0.9, anchor: 'hands', words: ['mountain climber', 'climber', 'grimpeur'],
    frames: [
      { pose: { ...HIGH_PLANK, thighN: 55, shinN: -95 } },
      { pose: { ...HIGH_PLANK, thighF: 55, shinF: -95 } },
    ],
  },
  {
    id: 'situp', label: 'Abdos', group: 'tronc', view: 'side', period: 2.4, anchor: 'hip', words: ['abdo', 'crunch', 'relevé de buste', 'releve de buste'],
    frames: [
      { pose: { torso: -84, head: 8, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 150, foreN: 150, armF: 146, foreF: 146 } },
      { pose: { torso: -18, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 95, foreN: 98, armF: 92, foreF: 95 } },
    ],
  },
  {
    id: 'highknees', label: 'Montées de genoux', group: 'mi', also: ['cardio'], view: 'side', period: 0.75, anchor: 'hip', words: ['montee de genou', 'montees de genou', 'high knee', 'genoux haut', 'genoux poitrine'],
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
    id: 'legraise', label: 'Relevés de jambes', group: 'tronc', view: 'side', period: 2.6, anchor: 'hip',
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
    id: 'jumpsquat', label: 'Squat sauté', group: 'mi', also: ['cardio'], view: 'side', period: 1.5, anchor: 'feet',
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
    id: 'tapping', label: 'Tipping', group: 'cardio', view: 'side', period: 0.4, anchor: 'hip',
    words: ['tapping', 'tipping', 'pietinement', 'fast feet', 'appuis rapides', 'pas rapides'],
    frames: [
      { pose: { torso: 16, head: -12, thighN: 42, shinN: -22, thighF: 26, shinF: -18, armN: 25, foreN: 105, armF: -15, foreF: 75, lift: 1 } },
      { pose: { torso: 16, head: -12, thighN: 26, shinN: -18, thighF: 42, shinF: -22, armN: -15, foreN: 75, armF: 25, foreF: 105, lift: 1 } },
    ],
  },
  {
    id: 'buttkicks', label: 'Talons-fesses', group: 'cardio', also: ['mi'], view: 'side', period: 0.62, anchor: 'hip',
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
    id: 'kbswing', label: 'Kettlebell swing', group: 'mi', also: ['cardio'], view: 'side', period: 1.7, anchor: 'feet', equipment: 'kettlebell',
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
    words: ['curl elastique', 'curl biceps elastique', 'curl a l elastique'],
    frames: [
      { pose: { ...STAND, armN: 4, foreN: 12, armF: 2, foreF: 10 } },
      { pose: { ...STAND, armN: 8, foreN: 150, armF: 6, foreF: 148 } },
    ],
  },
  {
    id: 'bandraise', label: 'Élévations latérales (élastique)', group: 'ms', view: 'front', period: 2.4, anchor: 'hip', equipment: 'band',
    words: ['elevation laterale elastique', 'elevations laterale elastique', 'elevation laterale a l elastique'],
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
    words: ['elevation frontale assis', 'elevation frontale kettlebell', 'elevation frontale assis kettlebell'],
    frames: [
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 30, foreN: 32, armF: 28, foreF: 30 } },
      { pose: { torso: 0, thighN: 90, shinN: 0, thighF: 88, shinF: 0, armN: 95, foreN: 95, armF: 93, foreF: 93 } },
    ],
  },
  {
    id: 'ringpress', label: 'Compression anneau (bras)', group: 'ms', view: 'front', period: 2.2, anchor: 'hip', equipment: 'ring',
    words: ['compression anneau', 'anneau pilates', 'anneau de pilates', 'cercle pilates', 'magic circle', 'presse anneau'],
    frames: [
      { pose: { torso: 0, thighN: 5, shinN: 4, thighF: 5, shinF: 4, armN: 55, foreN: -95, armF: 55, foreF: -95 } },
      { pose: { torso: 0, thighN: 5, shinN: 4, thighF: 5, shinF: 4, armN: 45, foreN: -98, armF: 45, foreF: -98 }, w: 0.5 },
      { pose: { torso: 0, thighN: 5, shinN: 4, thighF: 5, shinF: 4, armN: 45, foreN: -98, armF: 45, foreF: -98 } },
    ],
  },
  {
    id: 'ringbridge', label: 'Pont fessier avec anneau', group: 'mi', view: 'side', period: 2.8, anchor: 'feet', equipment: 'ring',
    words: ['pont fessier anneau', 'pont avec anneau', 'pont fessier avec anneau', 'adduction anneau'],
    frames: [
      { pose: { torso: -88, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 70, foreN: 85, armF: 68, foreF: 85 } },
      { pose: { torso: -112, head: 14, thighN: 100, shinN: -5, thighF: 98, shinF: -5, armN: 60, foreN: 80, armF: 58, foreF: 80 }, w: 0.5 },
      { pose: { torso: -112, head: 14, thighN: 100, shinN: -5, thighF: 98, shinF: -5, armN: 60, foreN: 80, armF: 58, foreF: 80 } },
    ],
  },

  // ---------- Sans matériel : MI ----------
  {
    id: 'bulgarian', label: 'Squat bulgare', group: 'mi', view: 'side', period: 2.8, anchor: 'feet', chairUnder: 'foot', positions: ['standing', 'chair'],
    words: ['squat sur une jambe', 'squat bulgare', 'fente bulgare', 'split squat', 'squat une jambe'],
    frames: [
      { pose: { torso: 6, thighN: 10, shinN: 0, thighF: -40, shinF: -70, armN: 30, foreN: -20, armF: 28, foreF: -22 } },
      { pose: { torso: 14, head: -8, thighN: 80, shinN: -15, thighF: -15, shinF: -138, armN: 30, foreN: -20, armF: 28, foreF: -22 } },
    ],
  },
  {
    id: 'toeraise', label: 'Relevé de la pointe des pieds', group: 'mi', view: 'side', period: 1.6, anchor: 'feet',
    words: ['releve de la pointe', 'releve de pointe', 'pointe de pied', 'pointe des pied', 'flexion dorsale', 'releve pointe'],
    frames: [
      { pose: { ...STAND, armN: 4, foreN: 8, armF: -4, foreF: 2 } },
      { pose: { ...STAND, armN: 4, foreN: 8, armF: -4, foreF: 2, heel: -28 }, w: 0.6 },
      { pose: { ...STAND, armN: 4, foreN: 8, armF: -4, foreF: 2, heel: -28 } },
    ],
  },
  {
    id: 'legabduction', label: 'Abduction de la jambe', group: 'mi', view: 'front', period: 2.2, anchor: 'hip',
    words: ['abduction de la jambe', 'abduction de jambe', 'abduction de hanche', 'abduction hanche', 'abduction'],
    frames: [
      { pose: { torso: 0, thighN: 4, shinN: 3, thighF: 3, shinF: 2, armN: 35, foreN: -60, armF: 35, foreF: -60 } },
      { pose: { torso: 0, thighN: 38, shinN: 36, thighF: 3, shinF: 2, armN: 35, foreN: -60, armF: 35, foreF: -60 }, w: 0.6 },
      { pose: { torso: 0, thighN: 38, shinN: 36, thighF: 3, shinF: 2, armN: 35, foreN: -60, armF: 35, foreF: -60 } },
    ],
  },
  {
    id: 'legadduction', label: 'Adduction de la jambe', group: 'mi', view: 'front', period: 2.2, anchor: 'hip',
    words: ['adduction de la jambe', 'adduction de jambe', 'adduction de hanche', 'adduction hanche', 'adduction'],
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 4, shinF: 3, armN: 35, foreN: -60, armF: 35, foreF: -60 } },
      { pose: { torso: 0, thighN: -16, shinN: -18, thighF: 4, shinF: 3, armN: 35, foreN: -60, armF: 35, foreF: -60 }, w: 0.6 },
      { pose: { torso: 0, thighN: -16, shinN: -18, thighF: 4, shinF: 3, armN: 35, foreN: -60, armF: 35, foreF: -60 } },
    ],
  },
  {
    id: 'kickback', label: 'Extension de la jambe vers l’arrière', group: 'mi', view: 'side', period: 2.2, anchor: 'hip',
    words: ['extension de la jambe vers l arriere', 'extension de jambe vers l arriere', 'extension de jambe arriere', 'extension de hanche', 'kickback', 'kick back', 'jambe arriere'],
    frames: [
      { pose: { torso: 12, head: -6, thighN: 0, shinN: 0, thighF: -1, shinF: -1, armN: 30, foreN: -20, armF: 28, foreF: -22 } },
      { pose: { torso: 22, head: -10, thighN: -48, shinN: -55, thighF: -1, shinF: -1, armN: 30, foreN: -20, armF: 28, foreF: -22 }, w: 0.6 },
      { pose: { torso: 22, head: -10, thighN: -48, shinN: -55, thighF: -1, shinF: -1, armN: 30, foreN: -20, armF: 28, foreF: -22 } },
    ],
  },
  // ---------- MI : squat sumo, fente latérale, soulevé de terre, marche latérale ----------
  {
    id: 'sumosquat', label: 'Squat sumo', group: 'mi', view: 'front', period: 2.6, anchor: 'hip',
    words: ['squat sumo', 'sumo squat', 'squat jambes ecartees', 'squat plie'],
    frames: sumoFrames(MI_HANDS_CHEST),
  },
  {
    id: 'sidelunge', label: 'Fente latérale', group: 'mi', view: 'front', period: 3.6, anchor: 'feet',
    words: ['fente laterale', 'fentes laterale', 'side lunge', 'lateral lunge', 'fente sur le cote'],
    frames: sideLungeFrames(MI_HANDS_CHEST),
  },
  {
    id: 'deadlift', label: 'Soulevé de terre jambes tendues (haltères)', group: 'mi', view: 'side', period: 2.8, anchor: 'feet', equipment: 'dumbbell',
    words: ['souleve de terre', 'souleve de terre jambes tendue', 'souleve de terre roumain', 'deadlift', 'romanian deadlift', 'rdl',
      'souleve de terre haltere', 'souleve de terre jambes tendues haltere'],
    frames: deadliftFrames({ armN: 3, foreN: 4, armF: 1, foreF: 2 }),
  },
  {
    id: 'bandwalk', label: 'Marche latérale (élastique)', group: 'mi', view: 'front', period: 3.6, anchor: 'hip', equipment: 'band', grip: 'knees',
    words: ['marche laterale', 'marche laterale elastique', 'pas lateral', 'pas lateral elastique', 'pas lateraux', 'monster walk', 'band walk', 'marche en crabe'],
    frames: bandWalkFrames(),
  },
  // ---------- Sans matériel : MS ----------
  {
    id: 'pressup', label: 'Poussée des épaules vers le haut', group: 'ms', view: 'front', period: 2.4, anchor: 'hip',
    words: ['poussee des epaules vers le haut', 'poussee epaule vers le haut', 'poussee vers le haut', 'developpe epaule sans charge'],
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 92, foreN: 178, armF: 92, foreF: 178 } },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 162, foreN: 172, armF: 162, foreF: 172 } },
    ],
  },
  {
    id: 'pressforward', label: 'Poussée des épaules vers l’avant', group: 'ms', view: 'side', period: 2.2, anchor: 'feet',
    words: ['poussee des epaules vers l avant', 'poussee epaule vers l avant', 'poussee vers l avant', 'poussee avant'],
    frames: [
      { pose: { ...STAND, armN: -55, foreN: 95, armF: -53, foreF: 93 } },
      { pose: { ...STAND, armN: 90, foreN: 90, armF: 88, foreF: 88 } },
    ],
  },
  {
    id: 'curlbw', label: 'Biceps (flexion des coudes)', group: 'ms', view: 'side', period: 2.2, anchor: 'feet',
    words: ['curl biceps', 'curl', 'biceps', 'flexion du coude', 'flexion des coude'],
    frames: [
      { pose: { ...STAND, armN: 4, foreN: 10, armF: 2, foreF: 8 } },
      { pose: { ...STAND, armN: 8, foreN: 150, armF: 6, foreF: 148 } },
    ],
  },
  {
    id: 'tricepsbw', label: 'Triceps (extension au-dessus de la tête)', group: 'ms', view: 'side', period: 2.2, anchor: 'feet',
    words: ['triceps', 'extension triceps', 'extension des triceps', 'extension au dessus de la tete'],
    frames: [
      { pose: { ...STAND, armN: 168, foreN: -25, armF: 166, foreF: -27 } },
      { pose: { ...STAND, armN: 172, foreN: 176, armF: 170, foreF: 174 } },
    ],
  },
  {
    id: 'shrug', label: 'Haussement des épaules', group: 'ms', view: 'front', period: 1.8, anchor: 'hip',
    words: ['haussement des epaule', 'haussement d epaule', 'hausser les epaule', 'shrug'],
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 6, foreN: 4, armF: 6, foreF: 4 } },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 6, foreN: 4, armF: 6, foreF: 4, shrug: 4 }, w: 0.5 },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 6, foreN: 4, armF: 6, foreF: 4, shrug: 4 } },
    ],
  },
  {
    id: 'uprightrow', label: 'Tirage menton', group: 'ms', view: 'front', period: 2.2, anchor: 'hip',
    words: ['tirage menton', 'tirage au menton', 'upright row', 'rowing menton'],
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 12, foreN: -14, armF: 12, foreF: -14 } },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 78, foreN: -112, armF: 78, foreF: -112 } },
    ],
  },
  {
    id: 'lateralbw', label: 'Élévations latérales', group: 'ms', view: 'front', period: 2.4, anchor: 'hip',
    words: ['elevation laterale', 'elevations laterale', 'lateral raise', 'abduction d epaule', 'abduction epaule'],
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 8, foreN: 10, armF: 8, foreF: 10 } },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 88, foreN: 90, armF: 88, foreF: 90 } },
    ],
  },
  {
    id: 'frontbw', label: 'Élévation frontale', group: 'ms', view: 'side', period: 2.4, anchor: 'feet',
    words: ['elevation frontale', 'elevations frontale', 'front raise', 'flexion d epaule'],
    frames: [
      { pose: { ...STAND, armN: 6, foreN: 8, armF: 4, foreF: 6 } },
      { pose: { ...STAND, armN: 92, foreN: 92, armF: 90, foreF: 90 } },
    ],
  },
  {
    id: 'pecfly', label: 'Pectoraux (coudes à 90°, se touchent devant)', group: 'ms', view: 'side', period: 2.4, anchor: 'feet',
    words: ['pectoraux', 'pectoral', 'butterfly', 'ecarte pectoraux', 'coude a 90', 'coudes qui se touchent'],
    frames: [
      // Coudes serrés devant, à hauteur d'épaules, avant-bras verticaux.
      { pose: { ...STAND, armN: 90, foreN: 180, armF: 88, foreF: 178 }, w: 0.5 },
      { pose: { ...STAND, armN: 90, foreN: 180, armF: 88, foreF: 178 } },
      // Coudes écartés sur les côtés : de profil, le haut du bras pivote vers nous.
      { pose: { ...STAND, armN: 90, foreN: 180, armF: 88, foreF: 178, reachUpper: 0.15 }, w: 0.5 },
      { pose: { ...STAND, armN: 90, foreN: 180, armF: 88, foreF: 178, reachUpper: 0.15 } },
    ],
  },
  // ---------- Sans matériel : tronc ----------
  {
    id: 'situpfull', label: 'Sit-up', group: 'tronc', view: 'side', period: 2.6, anchor: 'hip',
    words: ['sit up', 'situp', 'sit-up', 'v up', 'v-up', 'relevé en v', 'releve en v'],
    frames: [
      { pose: { torso: -88, head: 4, thighN: 92, shinN: 92, thighF: 91, shinF: 91, armN: 270, foreN: 270, armF: 272, foreF: 272 } },
      { pose: { torso: -70, head: 6, thighN: 115, shinN: 115, thighF: 114, shinF: 114, armN: 185, foreN: 185, armF: 187, foreF: 187 }, w: 0.5 },
      { pose: { torso: -35, head: 6, thighN: 140, shinN: 140, thighF: 139, shinF: 139, armN: 128, foreN: 130, armF: 126, foreF: 128 }, w: 0.6 },
      { pose: { torso: -35, head: 6, thighN: 140, shinN: 140, thighF: 139, shinF: 139, armN: 128, foreN: 130, armF: 126, foreF: 128 } },
    ],
  },
  {
    id: 'obliques', label: 'Obliques (toucher les chevilles)', group: 'tronc', view: 'side', period: 2, anchor: 'hip',
    words: ['oblique', 'toucher les cheville', 'touche cheville', 'touche talon', 'heel touch'],
    frames: [
      // Buste relevé et fixe ; rotation à droite (cheville de devant), puis à gauche (cheville de derrière), bras tendus.
      { pose: { torso: -58, thighN: 145, shinN: 10, thighF: 143, shinF: 10, head: 18, twist: 1, armN: 66, foreN: 66, armF: 80, foreF: 80 }, w: 0.35 },
      { pose: { torso: -58, thighN: 145, shinN: 10, thighF: 143, shinF: 10, head: 18, twist: 1, armN: 66, foreN: 66, armF: 80, foreF: 80 } },
      { pose: { torso: -58, thighN: 145, shinN: 10, thighF: 143, shinF: 10, head: -4, twist: -1, armN: 80, foreN: 80, armF: 66, foreF: 66 }, w: 0.35 },
      { pose: { torso: -58, thighN: 145, shinN: 10, thighF: 143, shinF: 10, head: -4, twist: -1, armN: 80, foreN: 80, armF: 66, foreF: 66 } },
    ],
  },
  {
    id: 'shouldertap', label: 'Shoulder tap', group: 'tronc', view: 'side', period: 1.6, anchor: 'feet',
    words: ['shoulder tap', 'shoulder taps', 'tap epaule', 'touche epaule', 'toucher l epaule'],
    frames: [
      { pose: HIGH_PLANK },
      { pose: { ...HIGH_PLANK, armN: 55, foreN: -150 } },
      { pose: HIGH_PLANK },
      { pose: { ...HIGH_PLANK, armF: 55, foreF: -150 } },
    ],
  },
  {
    id: 'dynplank', label: 'Gainage dynamique', group: 'tronc', view: 'side', period: 3, anchor: 'feet',
    words: ['gainage dynamique', 'planche dynamique', 'plank up down', 'up down plank'],
    frames: [
      { pose: { torso: 81, head: -4, thighN: -81, shinN: -81, thighF: -81, shinF: -81, armN: 0, foreN: 90, armF: 2, foreF: 90 } },
      { pose: { torso: 74, head: -5, thighN: -74, shinN: -74, thighF: -74, shinF: -74, armN: 0, foreN: 0, armF: 2, foreF: 90 }, w: 0.8 },
      { pose: HIGH_PLANK },
      { pose: { torso: 74, head: -5, thighN: -74, shinN: -74, thighF: -74, shinF: -74, armN: 0, foreN: 90, armF: 3, foreF: 3 }, w: 0.8 },
    ],
  },
  {
    id: 'woodchop', label: 'Bûcheron', group: 'tronc', view: 'side', period: 2.4, anchor: 'feet',
    words: ['bucheron', 'wood chop', 'woodchop'],
    frames: [
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: 2, foreN: 4, armF: 0, foreF: 2 } },
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: -78, foreN: 8, armF: -76, foreF: 6 }, w: 0.6 },
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: -78, foreN: 8, armF: -76, foreF: 6 } },
    ],
  },
  {
    id: 'goodmorning', label: 'Good morning', group: 'tronc', view: 'side', period: 2.6, anchor: 'feet',
    words: ['good morning', 'goodmorning', 'bonjour'],
    frames: [
      { pose: { torso: 0, thighN: 2, shinN: 0, thighF: 1, shinF: -1, armN: 150, foreN: -40, armF: 148, foreF: -42 } },
      { pose: { torso: 75, head: -10, thighN: 14, shinN: -6, thighF: 13, shinF: -6, armN: 225, foreN: 40, armF: 223, foreF: 38 } },
    ],
  },
  {
    id: 'supermanfront', label: 'Superman frontal', group: 'tronc', view: 'side', period: 2.6, anchor: 'feet',
    words: ['superman frontal', 'superman debout', 'superman incline'],
    frames: [
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: -92, foreN: -92, armF: -90, foreF: -90 } },
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: 0, foreN: 4, armF: 2, foreF: 6 }, w: 0.8 },
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: 92, foreN: 92, armF: 90, foreF: 90 }, w: 0.5 },
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: 92, foreN: 92, armF: 90, foreF: 90 } },
    ],
  },
  {
    id: 'supermanside', label: 'Superman latéral', group: 'tronc', view: 'side', period: 2.4, anchor: 'feet',
    words: ['superman lateral', 'superman lateraux', 'oiseau', 'reverse fly'],
    frames: [
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: 2, foreN: 6, armF: 0, foreF: 4 } },
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: 30, foreN: 40, armF: 28, foreF: 38, reach: 0.28 }, w: 0.5 },
      { pose: { torso: 88, head: -12, thighN: 22, shinN: -12, thighF: 20, shinF: -12, armN: 30, foreN: 40, armF: 28, foreF: 38, reach: 0.28 } },
    ],
  },
  {
    id: 'arnold', label: 'Développé Arnold', group: 'ms', view: 'side', period: 3, anchor: 'feet',
    words: ['developpe arnold', 'arnold press', 'arnold'],
    frames: [
      // Coudes à 90° écartés sur les côtés (de profil, le haut du bras pivote vers nous), avant-bras vers le haut.
      { pose: { ...STAND, armN: 90, foreN: 178, armF: 88, foreF: 176, reachUpper: 0.15 }, w: 0.9 },
      // Poussée au-dessus de la tête, puis retour coudes écartés.
      { pose: { ...STAND, armN: 170, foreN: 176, armF: 168, foreF: 174 }, w: 0.9 },
      { pose: { ...STAND, armN: 90, foreN: 178, armF: 88, foreF: 176, reachUpper: 0.15 }, w: 0.8 },
      // Les coudes se rejoignent devant, bras toujours à 90°, puis se réécartent.
      { pose: { ...STAND, armN: 90, foreN: 178, armF: 88, foreF: 176 }, w: 0.8 },
    ],
  },
  {
    id: 'dbarnold', label: 'Développé Arnold (haltères)', group: 'ms', view: 'side', period: 3, anchor: 'feet', equipment: 'dumbbell',
    words: ['developpe arnold haltere', 'arnold press haltere', 'arnold haltere'],
    frames: [
      // Coudes à 90° écartés sur les côtés (de profil, le haut du bras pivote vers nous), avant-bras vers le haut.
      { pose: { ...STAND, armN: 90, foreN: 178, armF: 88, foreF: 176, reachUpper: 0.15 }, w: 0.9 },
      // Poussée au-dessus de la tête, puis retour coudes écartés.
      { pose: { ...STAND, armN: 170, foreN: 176, armF: 168, foreF: 174 }, w: 0.9 },
      { pose: { ...STAND, armN: 90, foreN: 178, armF: 88, foreF: 176, reachUpper: 0.15 }, w: 0.8 },
      // Les coudes se rejoignent devant, bras toujours à 90°, puis se réécartent.
      { pose: { ...STAND, armN: 90, foreN: 178, armF: 88, foreF: 176 }, w: 0.8 },
    ],
  },
  // ---------- MS avec matériel ----------
  {
    id: 'dbkickback', label: 'Kickback triceps (haltères)', group: 'ms', view: 'side', period: 2.2, anchor: 'feet', equipment: 'dumbbell',
    words: ['kickback triceps', 'kick back triceps', 'extension triceps buste penche'],
    // Buste penché, haut des bras collé au buste : l'avant-bras pend, puis se tend vers l'arrière.
    frames: [
      { pose: { torso: 62, head: -22, thighN: 22, shinN: -10, thighF: 20, shinF: -10, armN: -72, foreN: 6, armF: -70, foreF: 4 } },
      { pose: { torso: 62, head: -22, thighN: 22, shinN: -10, thighF: 20, shinF: -10, armN: -74, foreN: -76, armF: -72, foreF: -74 }, w: 0.5 },
      { pose: { torso: 62, head: -22, thighN: 22, shinN: -10, thighF: 20, shinF: -10, armN: -74, foreN: -76, armF: -72, foreF: -74 } },
    ],
  },
  {
    id: 'dbhammer', label: 'Curl marteau (haltères)', group: 'ms', view: 'side', period: 2.2, anchor: 'feet', equipment: 'dumbbell', grip: 'hammer',
    words: ['curl marteau', 'hammer curl'],
    frames: [
      { pose: { ...STAND, armN: 4, foreN: 10, armF: 2, foreF: 8 } },
      { pose: { ...STAND, armN: 8, foreN: 150, armF: 6, foreF: 148 } },
    ],
  },
  {
    id: 'dbpullover', label: 'Pull-over (haltère)', group: 'ms', view: 'side', period: 2.8, anchor: 'feet', equipment: 'dumbbell', grip: 'one',
    words: ['pull over', 'pullover'],
    // Allongé sur le dos, genoux pliés : un haltère à deux mains, de la verticale jusque derrière la tête.
    frames: [
      { pose: { torso: -88, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 178, foreN: 186, armF: 176, foreF: 184 } },
      { pose: { torso: -88, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 248, foreN: 256, armF: 246, foreF: 254 } },
    ],
  },
  {
    id: 'dbfloorpress', label: 'Développé couché au sol (haltères)', group: 'ms', view: 'side', period: 2.4, anchor: 'feet', equipment: 'dumbbell',
    words: ['developpe couche au sol', 'developpe au sol', 'floor press'],
    // Allongé sur le dos : coudes posés au sol sur les côtés (le haut du bras pivote vers nous), puis bras tendus vers le plafond.
    frames: [
      { pose: { torso: -88, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 180, foreN: 178, armF: 178, foreF: 176, reachUpper: 0.12 } },
      { pose: { torso: -88, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 180, foreN: 178, armF: 178, foreF: 176 } },
    ],
  },
  {
    id: 'ringoverhead', label: 'Compression anneau au-dessus de la tête', group: 'ms', view: 'front', period: 2.2, anchor: 'hip', equipment: 'ring',
    words: ['compression anneau au dessus de la tete', 'anneau au dessus de la tete', 'compression au dessus de la tete'],
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 160, foreN: -150, armF: 160, foreF: -150 } },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 158, foreN: -136, armF: 158, foreF: -136 }, w: 0.5 },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 158, foreN: -136, armF: 158, foreF: -136 } },
    ],
  },
  {
    id: 'ringbehind', label: 'Compression anneau derrière le dos', group: 'ms', view: 'side', period: 2.2, anchor: 'feet', equipment: 'ring', grip: 'hands',
    words: ['compression anneau derriere le dos', 'anneau derriere le dos', 'anneau dans le dos'],
    // Bras tendus derrière les fesses, anneau entre les paumes : on serre en remontant un peu les bras.
    frames: [
      { pose: { ...STAND, armN: -20, foreN: -20, armF: -22, foreF: -22 } },
      { pose: { ...STAND, armN: -32, foreN: -32, armF: -34, foreF: -34 }, w: 0.5 },
      { pose: { ...STAND, armN: -32, foreN: -32, armF: -34, foreF: -34 } },
    ],
  },
  {
    id: 'ringside', label: 'Compression anneau contre la hanche', group: 'ms', view: 'front', period: 2.2, anchor: 'hip', equipment: 'ring', grip: 'side',
    words: ['compression anneau contre la hanche', 'anneau contre la hanche', 'anneau sous le bras', 'compression coude hanche'],
    // Anneau entre l'intérieur du bras et la hanche : le bras le serre contre le corps ; l'autre main sur la hanche.
    frames: [
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 36, foreN: 18, armF: 35, foreF: -60 } },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 27, foreN: 10, armF: 35, foreF: -60 }, w: 0.5 },
      { pose: { torso: 0, thighN: 6, shinN: 5, thighF: 6, shinF: 5, armN: 27, foreN: 10, armF: 35, foreF: -60 } },
    ],
  },
  // ---------- Cardio ----------
  {
    id: 'shadowbox', label: 'Boxe dans le vide', group: 'cardio', view: 'side', period: 1.2, anchor: 'feet',
    words: ['boxe dans le vide', 'shadow boxing', 'shadowboxing', 'shadow box', 'boxe'],
    frames: [
      // En garde, poings au menton, jambes fléchies en appui décalé ; direct du bras avant, garde, direct du bras arrière.
      { pose: { ...SHADOW_LEGS, ...GUARD }, w: 0.5 },
      { pose: { ...SHADOW_LEGS, torso: 2, armN: 86, foreN: 90, armF: 24, foreF: 163 }, w: 0.5 },
      { pose: { ...SHADOW_LEGS, ...GUARD }, w: 0.5 },
      { pose: { ...SHADOW_LEGS, torso: 10, twist: -0.6, armN: 24, foreN: 165, armF: 84, foreF: 88 }, w: 0.5 },
    ],
  },
  {
    id: 'jumprope', label: 'Corde à sauter imaginaire', group: 'cardio', view: 'side', period: 0.5, anchor: 'feet',
    words: ['corde a sauter', 'saut a la corde', 'saute a la corde', 'jump rope', 'corde imaginaire'],
    frames: [
      // Petits sauts sur l'avant des pieds, mains à hauteur des hanches qui font tourner la corde.
      { pose: { ...STAND, torso: 2, thighN: 3, shinN: 0, thighF: 1, shinF: -1, heel: 22, armN: 14, foreN: 72, armF: 12, foreF: 70 } },
      { pose: { ...STAND, torso: 2, thighN: 1, shinN: 3, thighF: -1, shinF: 1, heel: 34, lift: 5, armN: 10, foreN: 34, armF: 8, foreF: 32 } },
    ],
  },
  {
    id: 'thruster', label: 'Thruster (haltères)', group: 'cardio', view: 'side', period: 2.6, anchor: 'feet', equipment: 'dumbbell',
    words: ['thruster', 'squat developpe', 'squat poussee'],
    frames: [
      // Haltères aux épaules, squat, puis on remonte en poussant les haltères au-dessus de la tête.
      { pose: { ...STAND, torso: 2, armN: 24, foreN: 172, armF: 22, foreF: 170 } },
      { pose: { torso: 34, head: -18, thighN: 95, shinN: -28, thighF: 92, shinF: -30, armN: 56, foreN: 194, armF: 54, foreF: 192 }, w: 0.7 },
      { pose: { ...STAND, armN: 172, foreN: 176, armF: 170, foreF: 174 }, w: 0.4 },
      { pose: { ...STAND, armN: 172, foreN: 176, armF: 170, foreF: 174 }, w: 0.8 },
    ],
  },
  {
    id: 'kbhighpull', label: 'High pull (kettlebell)', group: 'cardio', view: 'side', period: 1.8, anchor: 'feet', equipment: 'kettlebell', grip: 'one',
    words: ['high pull', 'tirage haut', 'tirage menton sumo', 'souleve tirage menton'],
    frames: [
      // Kettlebell entre les pieds, hanches en arrière ; on se relève d'un coup en tirant la kettlebell sous le menton, coudes hauts.
      { pose: { torso: 58, head: -22, thighN: 34, shinN: -14, thighF: 32, shinF: -14, armN: 0, foreN: 0, armF: -2, foreF: -2 }, w: 0.8 },
      { pose: { ...STAND, torso: -2, armN: 160, foreN: 50, armF: 158, foreF: 48, reach: 0.5 }, w: 0.5 },
      { pose: { ...STAND, torso: -2, armN: 160, foreN: 50, armF: 158, foreF: 48, reach: 0.5 } },
    ],
  },
  // ---------- Tronc : bases des variantes avec matériel ----------
  {
    // Sur le dos, bras tendus vers le plafond, genoux à 90° ; bras et jambe opposés s'allongent vers le sol.
    id: 'deadbug', label: 'Dead bug', group: 'tronc', view: 'side', period: 3.6, anchor: 'hip',
    words: ['dead bug', 'deadbug', 'insecte mort'],
    frames: [
      { pose: DEADBUG, w: 0.5 },
      { pose: { ...DEADBUG, armN: 262, foreN: 262, thighF: 100, shinF: 100 } },
      { pose: DEADBUG, w: 0.5 },
      { pose: { ...DEADBUG, armF: 260, foreF: 260, thighN: 100, shinN: 100 } },
    ],
  },
  {
    // De face : le buste s'incline d'un côté puis de l'autre, la main glisse le long de la cuisse.
    id: 'sidebend', label: 'Flexion latérale du buste', group: 'tronc', view: 'front', period: 3.2, anchor: 'hip',
    words: ['flexion laterale du buste', 'flexion laterale', 'inclinaison laterale', 'inclinaison du buste', 'side bend'],
    frames: [
      { pose: sideBend(0), w: 0.5 },
      { pose: sideBend(24) },
      { pose: sideBend(0), w: 0.5 },
      { pose: sideBend(-24) },
    ],
  },
  {
    // Gainage bras tendus sur deux haltères, tirage d'un bras puis de l'autre.
    id: 'renegaderow', label: 'Renegade row (haltères)', group: 'tronc', view: 'side', period: 3.2, anchor: 'feet', equipment: 'dumbbell',
    words: ['renegade row', 'rowing renegade', 'rowing en gainage', 'rowing en planche', 'gainage rowing'],
    frames: [
      { pose: RENEGADE, w: 0.5 },
      { pose: { ...RENEGADE, armN: -112, foreN: -8 } },
      { pose: RENEGADE, w: 0.5 },
      { pose: { ...RENEGADE, armF: -110, foreF: -6 } },
    ],
  },
  {
    // De face : la charge tourne autour de la tête (devant le menton, oreille droite, derrière la tête, oreille gauche).
    // Les bras font un tour complet : la dernière posture (durée nulle) reprend la première, angles décalés de 360°.
    id: 'halo', label: 'Halo (kettlebell)', group: 'tronc', view: 'front', period: 3.6, anchor: 'hip', equipment: 'kettlebell', grip: 'one',
    words: ['halo', 'kettlebell halo', 'halo kettlebell'],
    frames: haloFrames({ thighN: 6, shinN: 5, thighF: 6, shinF: 5 }),
  },
];

/** Tous les exercices : ceux écrits à la main, puis leurs variantes sur chaise et avec matériel. */
export const EXERCISES: ExerciseAnim[] = [...BASE, ...variantsOf(BASE)];

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
/**
 * Chaise, fixe pendant le mouvement et placée d'après la première posture :
 * dessus de l'assise (`seatY`), bord gauche de l'assise (`x0`) et côté du dossier.
 * De face (`back: 'behind'`), `x0` est le milieu de l'assise et le dossier est derrière l'avatar.
 */
export interface ChairPos { seatY: number; x0: number; back: 'left' | 'right' | 'behind' }
export const CHAIR_DEPTH = 20;
export const CHAIR_BACK = 30;
/** De face : demi-largeur de l'assise. */
export const CHAIR_HALF = 13;
export function chairPos(p: Placed): ChairPos | null {
  if (!p.ex.chairUnder) return null;
  const j0 = frameAt(p, 0).j;
  const hand = p.d.wFore * 0.5;
  switch (p.ex.chairUnder) {
    case 'hands': return { seatY: j0.handN[1] + hand, x0: j0.handN[0] + 1.5 - CHAIR_DEPTH, back: 'left' };
    case 'foot': return { seatY: Math.max(j0.ankleF[1], j0.toeF[1]) + 2.4, x0: Math.max(j0.ankleF[0], j0.toeF[0]) + 4 - CHAIR_DEPTH, back: 'left' };
    case 'incline': return { seatY: j0.handN[1] + hand, x0: j0.handN[0] - 3, back: 'right' };
    case 'rest': return { seatY: j0.handN[1] + hand + CHAIR_BACK, x0: j0.handN[0] - 1.2, back: 'left' };
    default:
      if (p.ex.view === 'front') return { seatY: j0.hip[1] + p.d.wTorso * 0.47, x0: j0.hip[0], back: 'behind' };
      return { seatY: j0.hip[1] + p.d.wTorso * 0.47, x0: j0.hip[0] + 9 - CHAIR_DEPTH, back: 'left' };
  }
}

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
    const [l, r] = chair.back === 'behind' ? [chair.x0 - CHAIR_HALF, chair.x0 + CHAIR_HALF] : [chair.x0, chair.x0 + CHAIR_DEPTH];
    half = Math.max(half, VIEW_W / 2 - (l - 1), r + 1 - VIEW_W / 2);
    top = Math.min(top, chair.seatY - CHAIR_BACK + ref.head);
  }
  const pad = 9;
  const y = Math.max(0, top - ref.head - pad);
  const box = { x: VIEW_W / 2 - half - pad, y, w: 2 * (half + pad), h: GROUND + 6 - y };
  boxes.set(ex.id, box);
  return box;
}

export type { Pt };
