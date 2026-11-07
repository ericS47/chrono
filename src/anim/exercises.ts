// Bibliothèque des exercices animés : postures clés enchaînées en boucle,
// et reconnaissance de l'exercice d'après son nom (« Squats », « 10 burpees »…).

import type { Pose, Dims, Joints, Pt } from './pose';
import { lerpPose, lowest, solve, translate } from './pose';

export type ExerciseId =
  | 'squat' | 'pushup' | 'plank' | 'jumpingjack' | 'lunge' | 'burpee' | 'climber' | 'situp' | 'highknees';

type Anchor = 'feet' | 'hands' | 'hip';

interface Frame {
  pose: Pose;
  /** Point qui reste immobile au sol pendant le passage vers cette posture. */
  anchor?: Anchor;
  /** Durée relative du passage vers la posture suivante (1 par défaut). */
  w?: number;
}

export interface ExerciseAnim {
  id: ExerciseId;
  label: string;
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
    id: 'squat', label: 'Squat', view: 'side', period: 2.4, anchor: 'feet', words: ['squat', 'flexion de jambe', 'flexions de jambe'],
    frames: [
      { pose: { ...STAND, torso: 4, armN: 10, foreN: 20, armF: 5, foreF: 12 } },
      { pose: { torso: 38, head: -22, thighN: 95, shinN: -28, thighF: 92, shinF: -30, armN: 88, foreN: 90, armF: 84, foreF: 88 } },
    ],
  },
  {
    id: 'pushup', label: 'Pompe', view: 'side', period: 2.2, anchor: 'hands', words: ['pompe', 'push up', 'pushup'],
    frames: [
      { pose: HIGH_PLANK },
      { pose: { torso: 82, head: -6, thighN: -82, shinN: -82, thighF: -82, shinF: -82, armN: -72, foreN: 40, armF: -70, foreF: 42 } },
    ],
  },
  {
    id: 'plank', label: 'Gainage', view: 'side', period: 3, anchor: 'hands', words: ['gainage', 'planche', 'plank'],
    frames: [
      { pose: { torso: 81, head: -4, thighN: -81, shinN: -81, thighF: -81, shinF: -81, armN: 0, foreN: 90, armF: 2, foreF: 90 } },
      { pose: { torso: 81.6, head: -9, thighN: -81.6, shinN: -81.6, thighF: -81.6, shinF: -81.6, armN: 0, foreN: 90, armF: 2, foreF: 90 } },
    ],
  },
  {
    id: 'jumpingjack', label: 'Jumping jack', view: 'front', period: 1.3, anchor: 'hip', words: ['jumping jack', 'jumpingjack'],
    frames: [
      { pose: { torso: 0, thighN: 3, shinN: 2, thighF: 3, shinF: 2, armN: 8, foreN: 10, armF: 8, foreF: 10 } },
      { pose: { torso: 0, thighN: 11, shinN: 10, thighF: 11, shinF: 10, armN: 90, foreN: 100, armF: 90, foreF: 100, lift: 7 } },
      { pose: { torso: 0, thighN: 20, shinN: 18, thighF: 20, shinF: 18, armN: 165, foreN: 172, armF: 165, foreF: 172 } },
      { pose: { torso: 0, thighN: 11, shinN: 10, thighF: 11, shinF: 10, armN: 90, foreN: 100, armF: 90, foreF: 100, lift: 7 } },
    ],
  },
  {
    id: 'lunge', label: 'Fente', view: 'side', period: 2.6, anchor: 'feet', words: ['fente', 'lunge'],
    frames: [
      { pose: { torso: 0, thighN: 16, shinN: 0, thighF: -16, shinF: -20, armN: 10, foreN: 15, armF: -10, foreF: -5 } },
      { pose: { torso: 2, thighN: 86, shinN: 2, thighF: -28, shinF: -100, armN: 6, foreN: 12, armF: -6, foreF: 0 } },
    ],
  },
  {
    id: 'burpee', label: 'Burpee', view: 'side', period: 3.2, anchor: 'feet', words: ['burpee'],
    frames: [
      { pose: STAND, anchor: 'feet' },
      { pose: BURPEE_LOW, anchor: 'feet', w: 0.7 },
      { pose: HIGH_PLANK, anchor: 'hands', w: 0.7 },
      { pose: BURPEE_LOW, anchor: 'hands' },
      { pose: { torso: 0, thighN: 2, shinN: 4, thighF: 0, shinF: 3, armN: 170, foreN: 175, armF: 168, foreF: 172, lift: 10 }, anchor: 'feet', w: 0.8 },
    ],
  },
  {
    id: 'climber', label: 'Mountain climber', view: 'side', period: 0.9, anchor: 'hands', words: ['mountain climber', 'climber', 'grimpeur'],
    frames: [
      { pose: { ...HIGH_PLANK, thighN: 55, shinN: -95 } },
      { pose: { ...HIGH_PLANK, thighF: 55, shinF: -95 } },
    ],
  },
  {
    id: 'situp', label: 'Abdos', view: 'side', period: 2.4, anchor: 'hip', words: ['abdo', 'sit up', 'situp', 'crunch', 'relevé de buste', 'releve de buste'],
    frames: [
      { pose: { torso: -84, head: 8, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 150, foreN: 150, armF: 146, foreF: 146 } },
      { pose: { torso: -18, head: 6, thighN: 130, shinN: 25, thighF: 128, shinF: 25, armN: 95, foreN: 98, armF: 92, foreF: 95 } },
    ],
  },
  {
    id: 'highknees', label: 'Montées de genoux', view: 'side', period: 0.75, anchor: 'hip', words: ['montee de genou', 'montees de genou', 'high knee', 'genoux haut', 'genoux poitrine'],
    frames: [
      { pose: { torso: -2, thighN: 95, shinN: 5, thighF: 2, shinF: 2, armN: -35, foreN: 30, armF: 45, foreF: 120, lift: 2 } },
      { pose: { torso: -2, thighN: 2, shinN: 2, thighF: 95, shinF: 5, armN: 45, foreN: 120, armF: -35, foreF: 30, lift: 2 } },
    ],
  },
];

export const EXERCISE_BY_ID: Record<ExerciseId, ExerciseAnim> = Object.fromEntries(EXERCISES.map((e) => [e.id, e])) as Record<ExerciseId, ExerciseAnim>;

/** Minuscules, sans accents ni ponctuation, pluriels simples retirés. */
export function normalizeName(s: string): string {
  return ` ${s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()} `
    .replace(/(\w{3,})s(?= )/g, '$1');
}

/** Exercice animé correspondant à un nom, ou null si inconnu. */
export function matchExercise(name: string | undefined): ExerciseId | null {
  if (!name) return null;
  const n = normalizeName(name);
  for (const e of EXERCISES) {
    if (e.words.some((w) => n.includes(normalizeName(w).trimEnd()))) return e.id;
  }
  return null;
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
  const js = ex.frames.map((f) => solve(f.pose, d, ex.view));
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
export function frameAt(p: Placed, sec: number): { j: Joints; pose: Pose } {
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
  const j0 = solve(pose, p.d, p.ex.view);
  const dy = GROUND - (pose.lift ?? 0) - lowest(j0, p.d);
  return { j: translate(j0, dx, dy), pose };
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
