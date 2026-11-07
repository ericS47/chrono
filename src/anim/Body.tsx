// Corps de l'avatar, style dessin animé : formes anatomiques (cuisses, mollets, biceps, buste, fessiers),
// contour continu autour de chaque partie du corps et ombre douce sur l'arrière des membres.
//
// Chaque groupe (bras, jambe, buste + tête) est dessiné deux fois : d'abord son contour (formes
// épaissies), puis ses couleurs par-dessus. Les membres d'un même groupe se fondent ainsi sans
// trait au coude ou au genou, comme un dessin à la main.

import { createContext, useContext, type ReactNode } from 'react';
import type { Avatar } from './avatar';
import { mix } from './avatar';
import type { Dims, Joints, Pt } from './pose';

export interface Colors { skin: string; skinFar: string; hair: string; top: string; topFar: string; bottom: string; bottomFar: string; shoe: string }

const INK = '#14183A';
const SW = 0.8;
const line = (c: string) => mix(c, INK, 0.72);

const Pass = createContext<'outline' | 'fill'>('fill');

/** Dessine son contenu en deux passes : contour, puis couleurs. */
function Layer({ children }: { children: ReactNode }) {
  return (
    <g>
      <Pass.Provider value="outline">{children}</Pass.Provider>
      <Pass.Provider value="fill">{children}</Pass.Provider>
    </g>
  );
}

/** Une forme : contour (1re passe), couleur + ombre (2e passe). `edge` : liseré visible (vêtements). */
function Shape({ d, fill, shadow, edge }: { d: string; fill: string; shadow?: string; edge?: boolean }) {
  const pass = useContext(Pass);
  if (pass === 'outline') return <path d={d} fill={line(fill)} stroke={line(fill)} strokeWidth={SW * 2} strokeLinejoin="round" />;
  return (
    <>
      <path d={d} fill={fill} stroke={edge ? line(fill) : 'none'} strokeWidth={SW * 0.7} strokeLinejoin="round" />
      {shadow && <path d={shadow} fill={INK} opacity={0.15} />}
    </>
  );
}

/** Détail sans contour (yeux, sourcils, bouche), dessiné seulement avec les couleurs. */
function Detail({ children }: { children: ReactNode }) {
  return useContext(Pass) === 'fill' ? <>{children}</> : null;
}

// ---------- Géométrie ----------

/** Profil d'un membre : [position 0 → 1, demi-largeur côté arrière, côté avant] (× largeur du membre). */
type Prof = [number, number, number][];

const THIGH: Prof = [[0, 0.62, 0.6], [0.3, 0.62, 0.64], [0.72, 0.47, 0.5], [1, 0.4, 0.41]];
const SHIN: Prof = [[0, 0.5, 0.48], [0.27, 0.66, 0.47], [0.62, 0.44, 0.39], [0.9, 0.31, 0.32], [1, 0.3, 0.3]];
const ARM: Prof = [[0, 0.64, 0.64], [0.38, 0.56, 0.66], [0.72, 0.48, 0.52], [1, 0.42, 0.42]];
const FORE: Prof = [[0, 0.5, 0.5], [0.28, 0.6, 0.56], [1, 0.36, 0.36]];
const NECK: Prof = [[0, 0.52, 0.5], [1, 0.42, 0.42]];

function interp(p: Prof, t: number): [number, number] {
  for (let i = 1; i < p.length; i++) {
    if (t <= p[i][0]) {
      const [t0, b0, f0] = p[i - 1];
      const [t1, b1, f1] = p[i];
      const k = (t - t0) / (t1 - t0 || 1);
      return [b0 + (b1 - b0) * k, f0 + (f1 - f0) * k];
    }
  }
  const l = p[p.length - 1];
  return [l[1], l[2]];
}

/** Chemin fermé et lissé (Catmull-Rom) passant par les points. */
function smooth(pts: Pt[]): string {
  const n = pts.length;
  const P = (i: number) => pts[(i + n) % n];
  const f = (v: number) => v.toFixed(2);
  let d = `M${f(P(0)[0])},${f(P(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)},${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)},${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])},${f(p2[1])}`;
  }
  return d + 'Z';
}

function ellipse(c: Pt, rx: number, ry: number, ang = 0): string {
  const a = (ang * Math.PI) / 180;
  const pts: Pt[] = [];
  for (let i = 0; i < 8; i++) {
    const t = (i / 8) * Math.PI * 2;
    const x = Math.cos(t) * rx;
    const y = Math.sin(t) * ry;
    pts.push([c[0] + x * Math.cos(a) - y * Math.sin(a), c[1] + x * Math.sin(a) + y * Math.cos(a)]);
  }
  return smooth(pts);
}

interface LimbOpts { t0?: number; t1?: number; grow?: number; cap0?: number; cap1?: number; band?: number }

/**
 * Contour d'un membre de a à b. `w` : largeur de référence ; `grow` : épaisseur ajoutée (vêtement) ;
 * `t0`, `t1` : portion du membre (manche, short) ; `band` : seulement une bande côté arrière (ombre, semelle).
 */
function limb(a: Pt, b: Pt, prof: Prof, w: number, o: LimbOpts = {}): string {
  const { t0 = 0, t1 = 1, grow = 0, cap0 = 0.85, cap1 = 0.85, band } = o;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  // Normale : côté arrière du membre (vue de profil, l'avatar regarde à droite).
  const nb: Pt = [-u[1], u[0]];
  const ts = [t0, ...prof.map((p) => p[0]).filter((t) => t > t0 && t < t1), t1];
  const at = (t: number, off: number): Pt => [a[0] + u[0] * L * t + nb[0] * off, a[1] + u[1] * L * t + nb[1] * off];
  const back = ts.map((t) => at(t, interp(prof, t)[0] * w + grow));
  const front = ts.map((t) => at(t, band !== undefined ? interp(prof, t)[0] * w * (1 - band * 2) : -(interp(prof, t)[1] * w + grow))).reverse();
  if (band !== undefined) return smooth([...back, ...front]);
  const r = (t: number) => ((interp(prof, t)[0] + interp(prof, t)[1]) / 2) * w + grow;
  const end = at(t1, 0);
  const start = at(t0, 0);
  return smooth([
    ...back,
    [end[0] + u[0] * r(t1) * cap1, end[1] + u[1] * r(t1) * cap1],
    ...front,
    [start[0] - u[0] * r(t0) * cap0, start[1] - u[1] * r(t0) * cap0],
  ]);
}

/** Points exprimés dans un repère local (origine, axe « avant », axe « haut »), en unités r. */
function local(o: Pt, fwd: Pt, up: Pt, r: number, pts: [number, number][]): Pt[] {
  return pts.map(([f, u]) => [o[0] + (fwd[0] * f + up[0] * u) * r, o[1] + (fwd[1] * f + up[1] * u) * r]);
}

// ---------- Membres ----------

function Leg({ hip, knee, ankle, toe, d, av, skin, bottom, shoe }: {
  hip: Pt; knee: Pt; ankle: Pt; toe: Pt; d: Dims; av: Avatar; skin: string; bottom: string; shoe: string;
}) {
  const legging = av.bottomType === 'legging';
  const fl = Math.hypot(toe[0] - ankle[0], toe[1] - ankle[1]) || 1;
  const f: Pt = [(toe[0] - ankle[0]) / fl, (toe[1] - ankle[1]) / fl];
  const heel: Pt = [ankle[0] - f[0] * 2.6, ankle[1] - f[1] * 2.6];
  const tip: Pt = [toe[0] + f[0] * 1, toe[1] + f[1] * 1];
  // Basket : tige arrondie, semelle claire (la normale « arrière » du pied pointe vers le sol).
  const SHOE: Prof = [[0, 0.9, 1.15], [0.4, 1, 0.95], [0.75, 0.95, 0.65], [1, 0.62, 0.4]];
  const sw = 2.5 * (d.wShin / 7);
  return (
    <Layer>
      <Shape d={limb(hip, knee, THIGH, d.wThigh, { cap0: 0.15 })} fill={skin} shadow={limb(hip, knee, THIGH, d.wThigh, { band: 0.35 })} />
      <Shape d={limb(knee, ankle, SHIN, d.wShin)} fill={skin} shadow={limb(knee, ankle, SHIN, d.wShin, { band: 0.35 })} />
      <Shape d={limb(heel, tip, SHOE, sw)} fill={shoe} />
      <Shape d={limb(heel, tip, SHOE, sw, { band: 0.3 })} fill="#ECEAE4" />
      {legging ? (
        <>
          <Shape d={limb(hip, knee, THIGH, d.wThigh, { grow: 0.35, cap0: 0.15 })} fill={bottom} shadow={limb(hip, knee, THIGH, d.wThigh, { band: 0.35, grow: 0.35 })} />
          <Shape d={limb(knee, ankle, SHIN, d.wShin, { grow: 0.3, t1: 0.9, cap1: 0.3 })} fill={bottom} shadow={limb(knee, ankle, SHIN, d.wShin, { band: 0.35, t1: 0.9 })} />
        </>
      ) : (
        <Shape d={limb(hip, knee, THIGH, d.wThigh, { grow: 0.6, t1: 0.58, cap0: 0.15, cap1: 0.25 })} fill={bottom} edge shadow={limb(hip, knee, THIGH, d.wThigh, { band: 0.35, grow: 0.6, t1: 0.58 })} />
      )}
    </Layer>
  );
}

function Arm({ shoulder, elbow, hand, d, skin, top }: { shoulder: Pt; elbow: Pt; hand: Pt; d: Dims; skin: string; top: string }) {
  const L = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) || 1;
  const u: Pt = [(hand[0] - elbow[0]) / L, (hand[1] - elbow[1]) / L];
  const n: Pt = [u[1], -u[0]]; // côté avant de l'avant-bras (pouce)
  const w = d.wFore;
  // Main en moufle avec le pouce.
  const palm = smooth(local(hand, u, n, w, [[-0.3, -0.42], [0.5, -0.5], [1.15, -0.38], [1.4, 0], [1.15, 0.3], [0.7, 0.5], [0.55, 0.85], [0.2, 0.75], [-0.3, 0.42]]));
  return (
    <Layer>
      <Shape d={limb(shoulder, elbow, ARM, d.wArm)} fill={skin} shadow={limb(shoulder, elbow, ARM, d.wArm, { band: 0.35 })} />
      <Shape d={limb(elbow, hand, FORE, w)} fill={skin} shadow={limb(elbow, hand, FORE, w, { band: 0.35 })} />
      <Shape d={palm} fill={skin} />
      {/* Manche courte et épaule arrondie. */}
      <Shape d={ellipse(shoulder, d.wArm * 0.78, d.wArm * 0.78)} fill={top} />
      <Shape d={limb(shoulder, elbow, ARM, d.wArm, { grow: 0.7, t1: 0.4, cap1: 0.3 })} fill={top} edge shadow={limb(shoulder, elbow, ARM, d.wArm, { band: 0.35, grow: 0.7, t1: 0.4 })} />
    </Layer>
  );
}

// ---------- Tête ----------

// Tête de profil, en unités du rayon : (avant, haut) depuis le centre du crâne.
const FACE: [number, number][] = [[0, 1], [0.58, 0.86], [0.88, 0.5], [0.92, 0.28], [1.1, 0.05], [0.92, -0.06], [0.93, -0.3], [0.8, -0.6], [0.5, -0.8], [0.08, -0.66], [-0.32, -0.55], [-0.78, -0.22], [-0.96, 0.22], [-0.7, 0.76]];
const HAIR_F: [number, number][] = [[-0.1, 1.12], [0.55, 1.02], [0.95, 0.62], [0.72, 0.6], [0.4, 0.68], [0.1, 0.5], [-0.3, 0.18], [-0.55, -0.05], [-0.95, 0.05], [-1.06, 0.5], [-0.75, 0.98]];
const HAIR_M: [number, number][] = [[-0.1, 1.1], [0.5, 1.02], [0.9, 0.66], [0.62, 0.66], [0.2, 0.58], [-0.25, 0.34], [-0.62, 0.2], [-0.98, 0.25], [-1.0, 0.6], [-0.7, 0.98]];
const TAIL: [number, number][] = [[-0.8, 0.62], [-1.25, 0.6], [-1.55, 0.25], [-1.6, -0.3], [-1.38, -0.75], [-1.3, -0.3], [-1.22, 0.1], [-0.92, 0.3]];

function SideHead({ j, d, av, c }: { j: Joints; d: Dims; av: Avatar; c: Colors }) {
  const ux = j.headC[0] - j.neck[0];
  const uy = j.headC[1] - j.neck[1];
  const l = Math.hypot(ux, uy) || 1;
  const up: Pt = [ux / l, uy / l];
  const fwd: Pt = [-up[1], up[0]];
  const r = d.head;
  const P = (pts: [number, number][]) => local(j.headC, fwd, up, r, pts);
  const [eye] = P([[0.56, 0.2]]);
  const brow = P([[0.42, 0.42], [0.58, 0.47], [0.74, 0.43]]);
  const ear = P([[-0.12, 0.02]])[0];
  const bald = av.age === 'senior' && av.sex === 'm';
  const hair = av.sex === 'f' ? HAIR_F : bald ? HAIR_M.map(([f, u]) => [f, u > 0.6 ? u - 0.08 : u] as [number, number]) : HAIR_M;
  const neckTop = P([[-0.1, -0.5]])[0];
  const deg = (Math.atan2(up[1], up[0]) * 180) / Math.PI;
  return (
    <>
      <Shape d={limb(j.neck, neckTop, NECK, d.wArm * 1.25)} fill={c.skin} />
      {av.sex === 'f' && <Shape d={smooth(P(TAIL))} fill={c.hair} />}
      <Shape d={smooth(P(FACE))} fill={c.skin} />
      <Shape d={smooth(P(hair))} fill={c.hair} />
      <Shape d={ellipse(ear, r * 0.2, r * 0.27, deg + 90)} fill={c.skin} />
      <Detail>
        <ellipse cx={eye[0]} cy={eye[1]} rx={r * 0.1} ry={r * 0.15} transform={`rotate(${deg + 90} ${eye[0]} ${eye[1]})`} fill={INK} />
        <path d={`M${brow[0][0]},${brow[0][1]} Q${brow[1][0]},${brow[1][1]} ${brow[2][0]},${brow[2][1]}`} stroke={line(c.hair)} strokeWidth={0.7} fill="none" strokeLinecap="round" />
      </Detail>
    </>
  );
}

function FrontHead({ j, d, av, c }: { j: Joints; d: Dims; av: Avatar; c: Colors }) {
  const r = d.head;
  const o = j.headC;
  const P = (pts: [number, number][]) => local(o, [1, 0], [0, -1], r, pts);
  const face = P([[0, 1], [0.72, 0.82], [0.92, 0.25], [0.82, -0.35], [0.45, -0.82], [0, -0.92], [-0.45, -0.82], [-0.82, -0.35], [-0.92, 0.25], [-0.72, 0.82]]);
  const f = av.sex === 'f';
  const hairPts: [number, number][] = f
    ? [[0, 1.12], [0.82, 0.95], [1.08, 0.3], [1.1, -0.55], [0.86, -0.75], [0.84, 0.1], [0.6, 0.58], [0, 0.66], [-0.6, 0.58], [-0.84, 0.1], [-0.86, -0.75], [-1.1, -0.55], [-1.08, 0.3], [-0.82, 0.95]]
    : [[0, 1.1], [0.8, 0.92], [1.0, 0.4], [0.86, 0.36], [0.55, 0.6], [0, 0.66], [-0.55, 0.6], [-0.86, 0.36], [-1.0, 0.4], [-0.8, 0.92]];
  const [eL, eR] = P([[-0.34, 0.14], [0.34, 0.14]]);
  const mouth = P([[-0.2, -0.45], [0, -0.55], [0.2, -0.45]]);
  return (
    <>
      <Shape d={limb(j.neck, [o[0], o[1] + r * 0.5], NECK, d.wArm * 1.3)} fill={c.skin} />
      <Shape d={ellipse(P([[0.93, 0.05]])[0], r * 0.18, r * 0.26)} fill={c.skin} />
      <Shape d={ellipse(P([[-0.93, 0.05]])[0], r * 0.18, r * 0.26)} fill={c.skin} />
      <Shape d={smooth(face)} fill={c.skin} />
      <Shape d={smooth(P(hairPts))} fill={c.hair} />
      <Detail>
        <ellipse cx={eL[0]} cy={eL[1]} rx={r * 0.09} ry={r * 0.14} fill={INK} />
        <ellipse cx={eR[0]} cy={eR[1]} rx={r * 0.09} ry={r * 0.14} fill={INK} />
        <path d={`M${mouth[0][0]},${mouth[0][1]} Q${mouth[1][0]},${mouth[1][1]} ${mouth[2][0]},${mouth[2][1]}`} stroke={line(c.skin)} strokeWidth={0.7} fill="none" strokeLinecap="round" />
      </Detail>
    </>
  );
}

// ---------- Buste ----------

/** Profil du buste de profil : [k (0 hanche → 1 cou), arrière, avant] en unités. */
function sideTorsoProf(av: Avatar, d: Dims): Prof {
  const s = d.wTorso / 16;
  const bel = d.belly;
  const p: Prof = av.sex === 'f'
    ? [[-0.08, 6.2, 5.4], [0.05, 8.2, 6.2], [0.2, 7.6, 6.2 + bel * 0.6], [0.42, 5.9, 5.3 + bel], [0.6, 6.5, 6.4 + d.bust * 0.5], [0.72, 6.7, 6.6 + d.bust], [0.86, 6.5, 6.2], [0.97, 5, 4.2], [1.05, 3, 2.4]]
    : [[-0.08, 5.8, 5.4], [0.05, 7.3, 6.6], [0.2, 7.1, 6.9 + bel * 0.6], [0.42, 6.6, 6.5 + bel], [0.68, 7.6, 8.3], [0.86, 7.4, 7.2], [0.97, 5.5, 4.5], [1.05, 3.4, 2.6]];
  return p.map(([k, b, fr]) => [k, b * s, fr * s]);
}

function torsoPath(j: Joints, d: Dims, prof: Prof, k0: number, k1: number, grow = 0, band?: number): string {
  const ks = [k0, ...prof.map((p) => p[0]).filter((k) => k > k0 && k < k1), k1];
  const at = (k: number, off: number): Pt => [j.hip[0] + j.up[0] * d.torso * k + j.front[0] * off, j.hip[1] + j.up[1] * d.torso * k + j.front[1] * off];
  const back = ks.map((k) => at(k, -(interp(prof, k)[0] + grow)));
  const front = ks.map((k) => at(k, band !== undefined ? -interp(prof, k)[0] * (1 - band * 2) : interp(prof, k)[1] + grow)).reverse();
  return smooth([...back, ...front]);
}

export function SideBody({ j, d, av, c }: { j: Joints; d: Dims; av: Avatar; c: Colors }) {
  const prof = sideTorsoProf(av, d);
  return (
    <g>
      <Arm shoulder={j.shoulderF} elbow={j.elbowF} hand={j.handF} d={d} skin={c.skinFar} top={c.topFar} />
      <Leg hip={j.hipF} knee={j.kneeF} ankle={j.ankleF} toe={j.toeF} d={d} av={av} skin={c.skinFar} bottom={c.bottomFar} shoe={mix(c.shoe, INK, 0.25)} />
      <Layer>
        <SideHead j={j} d={d} av={av} c={c} />
        <Shape d={torsoPath(j, d, prof, -0.08, 1.05)} fill={c.top} shadow={torsoPath(j, d, prof, -0.08, 1.05, 0, 0.32)} />
        <Shape d={torsoPath(j, d, prof, -0.08, 0.22, 0.15)} fill={c.bottom} edge shadow={torsoPath(j, d, prof, -0.08, 0.22, 0.15, 0.32)} />
      </Layer>
      <Leg hip={j.hipN} knee={j.kneeN} ankle={j.ankleN} toe={j.toeN} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} />
      <Arm shoulder={j.shoulderN} elbow={j.elbowN} hand={j.handN} d={d} skin={c.skin} top={c.top} />
    </g>
  );
}

export function FrontBody({ j, d, av, c }: { j: Joints; d: Dims; av: Avatar; c: Colors }) {
  const f = av.sex === 'f';
  const sh = d.shoulderHalf;
  const hh = d.hipHalf;
  const prof: Prof = (f
    ? [[-0.06, hh + 3.2], [0.1, hh + 4.4], [0.42, sh * 0.68 + d.belly * 0.8], [0.7, sh * 0.95], [0.9, sh + 1], [1, 3.6]]
    : [[-0.06, hh + 2.8], [0.1, hh + 3.4], [0.42, sh * 0.76 + d.belly * 0.8], [0.7, sh * 0.98], [0.9, sh + 1.8], [1, 4]]
  ).map(([k, w]) => [k, w, w] as [number, number, number]);
  const half = (k0: number, k1: number, grow = 0): string => {
    const ks = [k0, ...prof.map((p) => p[0]).filter((k) => k > k0 && k < k1), k1];
    const at = (k: number, x: number): Pt => [j.hip[0] + x, j.hip[1] - d.torso * k];
    const right = ks.map((k) => at(k, interp(prof, k)[0] + grow));
    const left = ks.map((k) => at(k, -(interp(prof, k)[0] + grow))).reverse();
    return smooth([...right, ...left]);
  };
  return (
    <g>
      <Leg hip={j.hipF} knee={j.kneeF} ankle={j.ankleF} toe={j.toeF} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} />
      <Leg hip={j.hipN} knee={j.kneeN} ankle={j.ankleN} toe={j.toeN} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} />
      <Arm shoulder={j.shoulderF} elbow={j.elbowF} hand={j.handF} d={d} skin={c.skin} top={c.top} />
      <Arm shoulder={j.shoulderN} elbow={j.elbowN} hand={j.handN} d={d} skin={c.skin} top={c.top} />
      <Layer>
        <Shape d={half(-0.06, 1)} fill={c.top} />
        <Shape d={half(-0.06, 0.18, 0.3)} fill={c.bottom} edge />
        <FrontHead j={j} d={d} av={av} c={c} />
      </Layer>
    </g>
  );
}
