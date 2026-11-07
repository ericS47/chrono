// Squelette 2D des personnages (vue de profil, tourné vers la droite).
// Module pur : aucune dépendance à React ni au DOM, donc testable et utilisable en script.
//
// Convention des angles (en degrés, absolus) : 0 = vers le bas, +90 = vers l’avant (la droite),
// 180 = vers le haut, −90 = vers l’arrière. L’axe y de l’écran descend : le sol est à y = 0.

export type Pt = [number, number];

/** Longueurs des segments (unités du dessin ; un personnage debout mesure environ 200). */
export const SEG = {
  thigh: 48,
  shin: 46,
  foot: 16,
  torso: 62,
  neck: 7,
  head: 17,
  upper: 34,
  fore: 32,
} as const;

/** Hauteur de la cheville quand le pied est à plat au sol (demi-épaisseur de la chaussure). */
export const ANKLE_H = 5;

export interface Leg {
  thigh: number;
  shin: number;
  /** Angle du pied : 90 = à plat vers l’avant, plus petit = pointe vers le bas. */
  foot: number;
}

export type Arm = [upper: number, fore: number];

export interface Pose {
  hip: Pt;
  /** Inclinaison du buste vers l’avant (0 = droit). */
  torso: number;
  /** Inclinaison de la tête par rapport au buste. */
  head: number;
  /** Rotation de la tête : 0 = de profil, 1 = face au spectateur, −1 = de dos. */
  turn: number;
  armN: Arm;
  armF: Arm;
  legN: Leg;
  legF: Leg;
}

export interface Joints {
  hip: Pt;
  shoulder: Pt;
  headC: Pt;
  armN: { elbow: Pt; wrist: Pt };
  armF: { elbow: Pt; wrist: Pt };
  legN: { knee: Pt; ankle: Pt; toe: Pt };
  legF: { knee: Pt; ankle: Pt; toe: Pt };
}

const RAD = Math.PI / 180;

/** Vecteur unitaire d’un angle (0 = bas, 90 = avant). */
export const dir = (deg: number): Pt => [Math.sin(deg * RAD), Math.cos(deg * RAD)];

export const add = (p: Pt, deg: number, len: number): Pt => {
  const d = dir(deg);
  return [p[0] + d[0] * len, p[1] + d[1] * len];
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

/**
 * Cinématique inverse à deux segments : angles absolus [premier, second] pour que l’extrémité
 * atteigne `target` (ou s’en approche au plus près si elle est trop loin).
 * `bend` = +1 : articulation vers l’avant (genou) ; −1 : vers l’arrière (coude).
 */
export function solveLimb(origin: Pt, target: Pt, a: number, b: number, bend: 1 | -1): [number, number] {
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  const d = Math.min(Math.max(Math.hypot(dx, dy), Math.abs(a - b) + 1e-3), a + b - 1e-3);
  const cosA = (a * a + d * d - b * b) / (2 * a * d);
  const alpha = Math.acos(Math.min(1, Math.max(-1, cosA))) / RAD;
  const phi = Math.atan2(dx, dy) / RAD;
  const first = phi + bend * alpha;
  const mid = add(origin, first, a);
  const second = Math.atan2(target[0] - mid[0], target[1] - mid[1]) / RAD;
  return [first, second];
}

/** Jambe dont la cheville atteint `ankle` (genou vers l’avant). */
export function solveLeg(hip: Pt, ankle: Pt, foot = 90): Leg {
  const [thigh, shin] = solveLimb(hip, ankle, SEG.thigh, SEG.shin, 1);
  return { thigh, shin, foot };
}

/** Bras dont le poignet atteint `wrist` (coude vers l’arrière et le bas). */
export function solveArm(shoulder: Pt, wrist: Pt): Arm {
  return solveLimb(shoulder, wrist, SEG.upper, SEG.fore, -1);
}

export function shoulderOf(pose: Pick<Pose, 'hip' | 'torso'>): Pt {
  return add(pose.hip, 180 - pose.torso, SEG.torso);
}

function legJoints(hip: Pt, leg: Leg) {
  const knee = add(hip, leg.thigh, SEG.thigh);
  const ankle = add(knee, leg.shin, SEG.shin);
  const toe = add(ankle, leg.foot, SEG.foot);
  return { knee, ankle, toe };
}

function armJoints(shoulder: Pt, arm: Arm) {
  const elbow = add(shoulder, arm[0], SEG.upper);
  const wrist = add(elbow, arm[1], SEG.fore);
  return { elbow, wrist };
}

export function joints(pose: Pose): Joints {
  const shoulder = shoulderOf(pose);
  return {
    hip: pose.hip,
    shoulder,
    headC: add(shoulder, 180 - (pose.torso + pose.head), SEG.neck + SEG.head),
    armN: armJoints(shoulder, pose.armN),
    armF: armJoints(shoulder, pose.armF),
    legN: legJoints(pose.hip, pose.legN),
    legF: legJoints(pose.hip, pose.legF),
  };
}
