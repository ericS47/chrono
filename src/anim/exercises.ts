// Bibliothèque des exercices animés : postures clés enchaînées en boucle,
// et reconnaissance de l'exercice d'après son nom (« Squats », « 10 burpees »…).

import type { Pose, Dims, Joints, Pt } from './pose';
import { lerpPose, lowest, rotate, solve, translate } from './pose';
import { setExerciseLabels } from '../engine/timeline';

export type ExerciseId =
  | 'squat' | 'pushup' | 'plank' | 'jumpingjack' | 'lunge' | 'burpee' | 'climber' | 'situp' | 'highknees'
  | 'kneepushup' | 'bridge' | 'superman' | 'sideplank' | 'legraise' | 'calfraise' | 'jumpsquat' | 'birddog';

type Anchor = 'feet' | 'hands' | 'hip';

interface Frame {
  pose: Pose;
  /** Point qui reste immobile au sol pendant le passage vers cette posture. */
  anchor?: Anchor;
  /** Durée relative du passage vers la posture suivante (1 par défaut). */
  w?: number;
}

/** Catégories : membres inférieurs, membres supérieurs, tronc, abdominaux. */
export type ExerciseGroup = 'mi' | 'ms' | 'tronc' | 'abdo';
export const GROUP_LABELS: Record<ExerciseGroup, string> = { mi: 'MI · membres inférieurs', ms: 'MS · membres supérieurs', tronc: 'Tronc', abdo: 'Abdo' };

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
}

const STAND: Pose = { torso: 0, thighN: 0, shinN: 0, thighF: -1, shinF: -1, armN: 8, foreN: 14, armF: -5, foreF: 3 };
const HIGH_PLANK: Pose = { torso: 68, head: -6, thighN: -68, shinN: -68, thighF: -68, shinF: -68, armN: 0, foreN: 0, armF: 3, foreF: 3 };
const BURPEE_LOW: Pose = { torso: 60, head: -30, thighN: 100, shinN: -35, thighF: 98, shinF: -35, armN: 35, foreN: 35, armF: 33, foreF: 33 };

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
    id: 'jumpingjack', label: 'Jumping jack', group: 'mi', view: 'front', period: 1.3, anchor: 'hip', words: ['jumping jack', 'jumpingjack'],
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
    id: 'climber', label: 'Mountain climber', group: 'abdo', view: 'side', period: 0.9, anchor: 'hands', words: ['mountain climber', 'climber', 'grimpeur'],
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
    if (i === 0) tx.push(-anchorX(j, a));
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
  const pad = 9;
  const y = Math.max(0, top - ref.head - pad);
  const box = { x: VIEW_W / 2 - half - pad, y, w: 2 * (half + pad), h: GROUND + 6 - y };
  boxes.set(ex.id, box);
  return box;
}

export type { Pt };
