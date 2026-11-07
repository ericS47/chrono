// Exercices animés : chaque exercice est une fonction « phase de la boucle (0 à 1) → pose ».
// Les pieds restent plantés grâce à la cinématique inverse (solveLeg / solveArm).

import { ANKLE_H, lerp, solveArm, solveLeg, shoulderOf, type Pose, type Pt } from './rig';

export type ChairMode = 'none' | 'sit' | 'hold';

export interface Exercise {
  id: string;
  label: string;
  chair: ChairMode;
  /** Durée d’une boucle, en secondes. */
  duration: number;
  /** Pose à la phase k (0 inclus, 1 exclu ; la boucle est continue). */
  pose: (k: number) => Pose;
}

const TAU = Math.PI * 2;

/** 0 → 1 → 0, doux aux deux bouts (k = 0 : 0 ; k = 0,5 : 1). */
export const wave = (k: number): number => (1 - Math.cos(TAU * k)) / 2;

/** 0 → 1 (montée), maintien, 1 → 0 (descente), pause. Doux aux transitions. */
export function pulse(k: number, rise: number, hold: number): number {
  const ease = (x: number) => (1 - Math.cos(Math.PI * Math.min(1, Math.max(0, x)))) / 2;
  const kk = ((k % 1) + 1) % 1;
  if (kk < rise) return ease(kk / rise);
  if (kk < rise + hold) return 1;
  if (kk < 2 * rise + hold) return ease(1 - (kk - rise - hold) / rise);
  return 0;
}

const GROUND: number = -ANKLE_H;
const FLAT = 90;

// ——— Positions de départ communes ———

/** Assis sur une chaise : hanche, chevilles posées au sol. */
const SIT_HIP: Pt = [0, -48];
const SIT_ANKLE_N: Pt = [46, GROUND];
const SIT_ANKLE_F: Pt = [38, GROUND];
const SIT_N = solveLeg(SIT_HIP, SIT_ANKLE_N);
const SIT_F = solveLeg(SIT_HIP, SIT_ANKLE_F);

/** Mains posées sur les cuisses (assis). */
const ON_THIGH_N = solveArm(shoulderOf({ hip: SIT_HIP, torso: 0 }), [26, -58]);
const ON_THIGH_F = solveArm(shoulderOf({ hip: SIT_HIP, torso: 0 }), [10, -58]);

const seated = (over: Partial<Pose> = {}): Pose => ({
  hip: SIT_HIP,
  torso: 0,
  head: 0,
  turn: 0,
  armN: ON_THIGH_N,
  armF: ON_THIGH_F,
  legN: SIT_N,
  legF: SIT_F,
  ...over,
});

// ——— Fentes ———

function lunge(step: number, topH: number, botH: number, lean: number) {
  // Pied avant à plat ; pied arrière sur la pointe, talon décollé.
  const backFoot = 50;
  const front: Pt = [step / 2, GROUND];
  const back: Pt = [-step / 2, GROUND - 16 * Math.cos((backFoot * Math.PI) / 180)];
  return (k: number): Pose => {
    const hip: Pt = [0, -lerp(topH, botH, wave(k))];
    const sh = shoulderOf({ hip, torso: lean });
    const hand = solveArm(sh, [hip[0] + 11, hip[1] - 10]);
    return {
      hip,
      torso: lean,
      head: 0,
      turn: 0,
      armN: hand,
      armF: hand,
      legN: solveLeg(hip, front, FLAT),
      legF: solveLeg(hip, back, backFoot),
    };
  };
}

// ——— Debout, main sur une chaise ———

const HOLD_BAR: Pt = [50, -100];
const STAND_HIP: Pt = [0, -96];

function legBack(k: number): Pose {
  const w = pulse(k, 0.3, 0.2);
  const torso = 14;
  const sh = shoulderOf({ hip: STAND_HIP, torso });
  const arm = solveArm(sh, HOLD_BAR);
  const standing = solveLeg(STAND_HIP, [3, GROUND]);
  const rest = solveLeg(STAND_HIP, [0, GROUND]);
  const swing = -lerp(0, 36, w);
  return {
    hip: STAND_HIP,
    torso,
    head: 0,
    turn: 0,
    armN: arm,
    armF: arm,
    legN: { thigh: lerp(rest.thigh, swing, w), shin: lerp(rest.shin, swing, w), foot: lerp(FLAT, swing + 105, w) },
    legF: standing,
  };
}

// ——— Assis ———

function legRaise(k: number): Pose {
  const w = pulse(k, 0.3, 0.2);
  return seated({
    legN: { thigh: SIT_N.thigh, shin: lerp(SIT_N.shin, 88, w), foot: lerp(FLAT, SIT_N.shin + 128, w) },
  });
}

function warrior(k: number): Pose {
  const w = pulse(k, 0.25, 0.4);
  const hip: Pt = [-6, -48];
  const sh = shoulderOf({ hip, torso: 0 });
  const front = solveLeg(hip, [46, GROUND]);
  const back = solveLeg(hip, [-79, GROUND - 16 * Math.cos(Math.PI / 3)], 60);
  // Bras : le long du corps (vers le bas) → tendus à l’horizontale, devant et derrière.
  const down = solveArm(sh, [sh[0] + 14, sh[1] + 52]);
  return {
    hip,
    torso: 0,
    head: 0,
    turn: 0,
    armN: [lerp(down[0], 90, w), lerp(down[1], 90, w)],
    armF: [lerp(down[0], -90, w), lerp(down[1], -90, w)],
    legN: front,
    legF: back,
  };
}

function punches(k: number): Pose {
  // Garde : poing près de l’épaule ; coup : bras tendu à l’horizontale.
  const arm = (kk: number): [number, number] => {
    const p = pulse(kk, 0.18, 0.06);
    return [lerp(25, 90, p), lerp(165, 90, p)];
  };
  const pn = pulse(k, 0.18, 0.06);
  const pf = pulse(k + 0.5, 0.18, 0.06);
  return seated({ armN: arm(k), armF: arm(k + 0.5), torso: 5 * (pn - pf) });
}

function headTurns(k: number): Pose {
  return seated({ turn: Math.sin(TAU * k), head: 3 * Math.sin(TAU * k * 2) });
}

function ankleCircles(k: number): Pose {
  const shin = 52;
  return seated({
    legN: { thigh: SIT_N.thigh, shin, foot: shin + 100 + 32 * Math.sin(TAU * k) },
  });
}

export const EXERCISES: Exercise[] = [
  { id: 'fente-grand-pas', label: 'Fente, grand pas', chair: 'none', duration: 3, pose: lunge(88, 83, 57, 12) },
  { id: 'fente-petit-pas', label: 'Fente, petit pas', chair: 'none', duration: 3, pose: lunge(50, 90, 66, 0) },
  { id: 'jambe-arriere', label: 'Levée de jambe arrière', chair: 'hold', duration: 3.2, pose: legBack },
  { id: 'jambe-avant', label: 'Levée de jambe', chair: 'sit', duration: 3.2, pose: legRaise },
  { id: 'guerrier', label: 'Posture du guerrier', chair: 'sit', duration: 4, pose: warrior },
  { id: 'coups-de-poing', label: 'Coups de poing', chair: 'sit', duration: 2, pose: punches },
  { id: 'rotations-tete', label: 'Rotations de tête', chair: 'sit', duration: 4, pose: headTurns },
  { id: 'rotations-cheville', label: 'Rotations de cheville', chair: 'sit', duration: 2, pose: ankleCircles },
];

export const exerciseById = (id: string): Exercise => EXERCISES.find((e) => e.id === id) ?? EXERCISES[0];

/** Position de la barre du dossier tenue à deux mains (pour dessiner la chaise). */
export const HOLD_BAR_POINT = HOLD_BAR;
