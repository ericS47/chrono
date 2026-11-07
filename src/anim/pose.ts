// Squelette articulé de l'avatar : à partir d'une posture (angles des membres),
// calcule la position des articulations. Pur et testé.
//
// Repère écran : x vers la droite, y vers le bas. Vue de profil, l'avatar regarde à droite.
// Angle d'un membre (en degrés) : 0 = vers le bas, 90 = vers l'avant (droite), 180 = vers le haut,
// -90 = vers l'arrière. Buste : 0 = droit, 90 = penché en avant à l'horizontale, -90 = allongé sur le dos.
// Vue de face : 0 = vers le bas, angle positif = vers l'extérieur (bras ou jambe qui s'écarte).

import type { Avatar } from './avatar';

export interface Pose {
  torso: number;
  /** Tête, par rapport au buste. */
  head?: number;
  /** Membres proches (n) et éloignés (f) ; de face : côté droit de l'écran (n) et gauche (f). */
  thighN: number; shinN: number; thighF: number; shinF: number;
  armN: number; foreN: number; armF: number; foreF: number;
  /** Hauteur de saut au-dessus du sol. */
  lift?: number;
}

export type Pt = [number, number];

export interface Dims {
  head: number; neck: number; torso: number; thigh: number; shin: number; foot: number; arm: number; fore: number;
  /** Épaisseurs. */
  wTorso: number; wThigh: number; wShin: number; wArm: number; wFore: number;
  /** Vue de face : demi-largeur des épaules et des hanches. */
  shoulderHalf: number; hipHalf: number;
  belly: number; bust: number;
  /** Penché en avant (senior). */
  stoop: number;
}

export interface Joints {
  hip: Pt; neck: Pt; headC: Pt;
  /** Vecteurs unitaires du buste : vers le haut et vers l'avant (poitrine). */
  up: Pt; front: Pt;
  shoulderN: Pt; shoulderF: Pt; hipN: Pt; hipF: Pt;
  kneeN: Pt; ankleN: Pt; toeN: Pt; kneeF: Pt; ankleF: Pt; toeF: Pt;
  elbowN: Pt; handN: Pt; elbowF: Pt; handF: Pt;
}

const rad = (d: number) => (d * Math.PI) / 180;
/** Vecteur unitaire d'un membre d'angle a. */
const dir = (a: number): Pt => [Math.sin(rad(a)), Math.cos(rad(a))];
const add = (p: Pt, v: Pt, k = 1): Pt => [p[0] + v[0] * k, p[1] + v[1] * k];

export function dims(av: Avatar): Dims {
  const s = { petite: 0.92, moyenne: 1, grande: 1.08 }[av.height] * (av.age === 'jeune' ? 0.96 : 1);
  const f = av.sex === 'f';
  const b = {
    mince: { limb: 0.82, torso: 0.82, belly: 0 },
    moyenne: { limb: 1, torso: 1, belly: 0 },
    forte: { limb: 1.3, torso: 1.4, belly: 4.5 },
    musclee: { limb: 1.3, torso: 1.18, belly: 0 },
  }[av.build];
  const arms = av.build === 'musclee' ? 1.1 : 1;
  return {
    head: 7.3 * (av.age === 'jeune' ? 1.06 : 1) * s,
    neck: 2 * s,
    torso: 30 * s,
    thigh: 24 * s,
    shin: 23 * s,
    foot: 7 * s,
    arm: 17 * s,
    fore: 16 * s,
    wTorso: (f ? 15 : 16) * b.torso * s,
    wThigh: (f ? 9.5 : 9) * b.limb * s,
    wShin: 7 * b.limb * s,
    wArm: (f ? 5.5 : 6) * b.limb * arms * s,
    wFore: (f ? 4.6 : 5) * b.limb * arms * s,
    shoulderHalf: (f ? 9 : 11) * (av.build === 'musclee' ? 1.15 : b.torso > 1 ? 1.12 : b.torso < 1 ? 0.92 : 1) * s,
    hipHalf: (f ? 7.5 : 6.5) * b.torso * s,
    belly: (b.belly + (av.age === 'senior' ? 1.5 : 0)) * s,
    bust: f ? 3.6 * (b.torso > 1 ? 1.2 : 1) * s : 0,
    stoop: av.age === 'senior' ? 4 : 0,
  };
}

/** Position des articulations, la hanche en (0, 0). */
export function solve(p: Pose, d: Dims, view: 'side' | 'front'): Joints {
  const hip: Pt = [0, 0];
  if (view === 'front') {
    const up: Pt = [0, -1];
    const neck: Pt = [0, -d.torso];
    const headC = add(neck, up, d.neck + d.head);
    const sN: Pt = [d.shoulderHalf, -d.torso + 2];
    const sF: Pt = [-d.shoulderHalf, -d.torso + 2];
    const hN: Pt = [d.hipHalf * 0.75, 0];
    const hF: Pt = [-d.hipHalf * 0.75, 0];
    const mirror = (a: number): Pt => { const v = dir(a); return [-v[0], v[1]]; };
    const kneeN = add(hN, dir(p.thighN), d.thigh);
    const ankleN = add(kneeN, dir(p.shinN), d.shin);
    const kneeF = add(hF, mirror(p.thighF), d.thigh);
    const ankleF = add(kneeF, mirror(p.shinF), d.shin);
    const elbowN = add(sN, dir(p.armN), d.arm);
    const handN = add(elbowN, dir(p.foreN), d.fore);
    const elbowF = add(sF, mirror(p.armF), d.arm);
    const handF = add(elbowF, mirror(p.foreF), d.fore);
    return {
      hip, neck, headC, up, front: [0, 0], shoulderN: sN, shoulderF: sF, hipN: hN, hipF: hF,
      kneeN, ankleN, toeN: add(ankleN, [0.6, 0.8], 2), kneeF, ankleF, toeF: add(ankleF, [-0.6, 0.8], 2),
      elbowN, handN, elbowF, handF,
    };
  }
  const t = p.torso + d.stoop;
  const up: Pt = [Math.sin(rad(t)), -Math.cos(rad(t))];
  const front: Pt = [-up[1], up[0]];
  const neck = add(hip, up, d.torso);
  const h = rad(t + (p.head ?? 0) + d.stoop);
  const headC = add(neck, [Math.sin(h), -Math.cos(h)], d.neck + d.head);
  const shoulder = add(neck, up, -2.5);
  const leg = (thigh: number, shin: number) => {
    const knee = add(hip, dir(thigh), d.thigh);
    const ankle = add(knee, dir(shin), d.shin);
    // Le pied reste à peu près perpendiculaire au tibia, à plat quand on est debout.
    const toe = add(ankle, dir(shin + 90 - Math.min(0, shin) * 0.15), d.foot);
    return { knee, ankle, toe };
  };
  const arm = (a: number, f: number) => {
    const elbow = add(shoulder, dir(a), d.arm);
    return { elbow, hand: add(elbow, dir(f), d.fore) };
  };
  const ln = leg(p.thighN, p.shinN);
  const lf = leg(p.thighF, p.shinF);
  const an = arm(p.armN, p.foreN);
  const af = arm(p.armF, p.foreF);
  return {
    hip, neck, headC, up, front, shoulderN: shoulder, shoulderF: shoulder, hipN: hip, hipF: hip,
    kneeN: ln.knee, ankleN: ln.ankle, toeN: ln.toe, kneeF: lf.knee, ankleF: lf.ankle, toeF: lf.toe,
    elbowN: an.elbow, handN: an.hand, elbowF: af.elbow, handF: af.hand,
  };
}

/** Points qui peuvent toucher le sol, avec leur rayon (épaisseur). */
function contacts(j: Joints, d: Dims): [Pt, number][] {
  return [
    [j.ankleN, 2.5], [j.toeN, 2.5], [j.ankleF, 2.5], [j.toeF, 2.5],
    [j.kneeN, d.wShin / 2], [j.kneeF, d.wShin / 2],
    [j.handN, d.wFore / 2 + 0.6], [j.handF, d.wFore / 2 + 0.6],
    [j.elbowN, d.wArm / 2], [j.elbowF, d.wArm / 2],
    [j.hip, d.wTorso / 2], [j.headC, d.head],
    [add(j.hip, j.up, d.torso * 0.5), d.wTorso / 2 + d.belly * 0.5],
  ];
}

/** Hauteur du point le plus bas (y max), hanche en (0, 0). */
export function lowest(j: Joints, d: Dims): number {
  return Math.max(...contacts(j, d).map(([p, r]) => p[1] + r));
}

export function translate(j: Joints, dx: number, dy: number): Joints {
  const out = { ...j } as Record<keyof Joints, Pt>;
  for (const k of Object.keys(j) as (keyof Joints)[]) {
    if (k === 'up' || k === 'front') continue;
    out[k] = [j[k][0] + dx, j[k][1] + dy];
  }
  return out as Joints;
}

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const l = (x: number | undefined, y: number | undefined) => (x ?? 0) + ((y ?? 0) - (x ?? 0)) * t;
  return {
    torso: l(a.torso, b.torso), head: l(a.head, b.head),
    thighN: l(a.thighN, b.thighN), shinN: l(a.shinN, b.shinN), thighF: l(a.thighF, b.thighF), shinF: l(a.shinF, b.shinF),
    armN: l(a.armN, b.armN), foreN: l(a.foreN, b.foreN), armF: l(a.armF, b.armF), foreF: l(a.foreF, b.foreF),
    lift: l(a.lift, b.lift),
  };
}
