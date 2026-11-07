// Corps de l'avatar dessiné avec des formes anatomiques (cuisses, mollets, biceps, buste, fessiers),
// en trois styles : aplat, trait animé (contour + ombre), mannequin articulé.

import type { Avatar } from './avatar';
import { mix } from './avatar';
import type { Dims, Joints, Pt } from './pose';

export type BodyStyle = 'flat' | 'cel' | 'mannequin';

export interface Colors { skin: string; skinFar: string; hair: string; top: string; topFar: string; bottom: string; bottomFar: string; shoe: string }

const INK = '#14183A';
const shade = (c: string, k = 0.2) => mix(c, INK, k);

/** Profil d'un membre : [position 0 → 1, demi-largeur côté arrière, côté avant] (× largeur du membre). */
type Prof = [number, number, number][];

const THIGH: Prof = [[0, 0.62, 0.6], [0.3, 0.62, 0.64], [0.72, 0.47, 0.5], [1, 0.4, 0.41]];
const SHIN: Prof = [[0, 0.5, 0.48], [0.27, 0.66, 0.47], [0.62, 0.44, 0.39], [0.9, 0.31, 0.32], [1, 0.3, 0.3]];
const ARM: Prof = [[0, 0.64, 0.64], [0.38, 0.56, 0.66], [0.72, 0.48, 0.52], [1, 0.42, 0.42]];
const FORE: Prof = [[0, 0.5, 0.5], [0.28, 0.6, 0.56], [1, 0.36, 0.36]];

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
  let d = `M${P(0)[0].toFixed(2)},${P(0)[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const p0 = P(i - 1), p1 = P(i), p2 = P(i + 1), p3 = P(i + 2);
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += `C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return d + 'Z';
}

/**
 * Contour d'un membre de a à b. `w` : largeur de référence ; `grow` : épaisseur ajoutée (vêtement) ;
 * `t0`, `t1` : portion du membre (manche, short) ; `backOnly` : seulement la moitié arrière (ombre).
 */
function limb(a: Pt, b: Pt, prof: Prof, w: number, o: { t0?: number; t1?: number; grow?: number; backOnly?: boolean; caps?: boolean; cap0?: number } = {}): string {
  const { t0 = 0, t1 = 1, grow = 0, backOnly = false, caps = true, cap0 = 0.85 } = o;
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
  const u: Pt = [(b[0] - a[0]) / L, (b[1] - a[1]) / L];
  // Normale : côté arrière du membre (vue de profil, l'avatar regarde à droite).
  const nb: Pt = [-u[1], u[0]];
  const ts = [t0, ...prof.map((p) => p[0]).filter((t) => t > t0 && t < t1), t1];
  const at = (t: number, off: number): Pt => [a[0] + u[0] * L * t + nb[0] * off, a[1] + u[1] * L * t + nb[1] * off];
  const back = ts.map((t) => at(t, (interp(prof, t)[0] + grow / w) * w));
  const front = ts.map((t) => at(t, backOnly ? -interp(prof, t)[1] * w * 0.12 : -(interp(prof, t)[1] + grow / w) * w)).reverse();
  const r1 = (interp(prof, t0)[0] + interp(prof, t0)[1]) / 2 * w + grow;
  const r2 = (interp(prof, t1)[0] + interp(prof, t1)[1]) / 2 * w + grow;
  const end = at(t1, 0);
  const start = at(t0, 0);
  const pts: Pt[] = [
    ...back,
    ...(caps && t1 === 1 && !backOnly ? [[end[0] + u[0] * r2 * 0.85, end[1] + u[1] * r2 * 0.85] as Pt] : []),
    ...front,
    ...(caps && t0 === 0 && !backOnly ? [[start[0] - u[0] * r1 * cap0, start[1] - u[1] * r1 * cap0] as Pt] : []),
  ];
  return smooth(pts);
}

interface Look { stroke?: string; sw: number; shadeOn: boolean; joints: boolean }
const LOOKS: Record<BodyStyle, Look> = {
  flat: { sw: 0, shadeOn: false, joints: false },
  cel: { stroke: INK, sw: 0.75, shadeOn: true, joints: false },
  mannequin: { stroke: 'rgba(20,24,58,0.35)', sw: 0.5, shadeOn: false, joints: true },
};

function Shape({ d, fill, look, shadow }: { d: string; fill: string; look: Look; shadow?: string }) {
  return (
    <>
      <path d={d} fill={fill} stroke={look.stroke ?? 'none'} strokeWidth={look.sw} strokeLinejoin="round" />
      {look.shadeOn && shadow && <path d={shadow} fill={INK} opacity={0.16} />}
    </>
  );
}

function Joint({ p, r, fill, look }: { p: Pt; r: number; fill: string; look: Look }) {
  if (!look.joints) return null;
  return <circle cx={p[0]} cy={p[1]} r={r} fill={shade(fill, 0.12)} stroke={look.stroke} strokeWidth={look.sw} />;
}

function Leg({ hip, knee, ankle, toe, d, av, skin, bottom, shoe, look }: {
  hip: Pt; knee: Pt; ankle: Pt; toe: Pt; d: Dims; av: Avatar; skin: string; bottom: string; shoe: string; look: Look;
}) {
  const legging = av.bottomType === 'legging';
  const fl = Math.hypot(toe[0] - ankle[0], toe[1] - ankle[1]) || 1;
  const f: Pt = [(toe[0] - ankle[0]) / fl, (toe[1] - ankle[1]) / fl];
  const heel: Pt = [ankle[0] - f[0] * 2.4, ankle[1] - f[1] * 2.4];
  const tip: Pt = [toe[0] + f[0] * 0.8, toe[1] + f[1] * 0.8];
  // Chaussure : la normale « arrière » du pied pointe vers la semelle.
  const SHOE: Prof = [[0, 0.95, 1.05], [0.45, 1, 0.75], [1, 0.6, 0.45]];
  return (
    <g>
      <Shape d={limb(hip, knee, THIGH, d.wThigh, { cap0: 0.15 })} fill={skin} look={look} shadow={limb(hip, knee, THIGH, d.wThigh, { backOnly: true })} />
      <Shape d={limb(knee, ankle, SHIN, d.wShin)} fill={skin} look={look} shadow={limb(knee, ankle, SHIN, d.wShin, { backOnly: true })} />
      {legging ? (
        <>
          <Shape d={limb(hip, knee, THIGH, d.wThigh, { grow: 0.35, cap0: 0.15 })} fill={bottom} look={look} shadow={limb(hip, knee, THIGH, d.wThigh, { backOnly: true, grow: 0.35 })} />
          <Shape d={limb(knee, ankle, SHIN, d.wShin, { grow: 0.3, t1: 0.92, caps: true })} fill={bottom} look={look} shadow={limb(knee, ankle, SHIN, d.wShin, { backOnly: true, t1: 0.92 })} />
        </>
      ) : (
        <Shape d={limb(hip, knee, THIGH, d.wThigh, { grow: 0.6, t1: 0.6, cap0: 0.15 })} fill={bottom} look={look} shadow={limb(hip, knee, THIGH, d.wThigh, { backOnly: true, grow: 0.6, t1: 0.6 })} />
      )}
      <Joint p={knee} r={d.wShin * 0.5} fill={legging ? bottom : skin} look={look} />
      <Shape d={limb(heel, tip, SHOE, 2.4 * (d.wShin / 7))} fill={shoe} look={look} />
    </g>
  );
}

function Arm({ shoulder, elbow, hand, d, skin, top, look }: { shoulder: Pt; elbow: Pt; hand: Pt; d: Dims; skin: string; top: string; look: Look }) {
  const L = Math.hypot(hand[0] - elbow[0], hand[1] - elbow[1]) || 1;
  const u: Pt = [(hand[0] - elbow[0]) / L, (hand[1] - elbow[1]) / L];
  const hc: Pt = [hand[0] + u[0] * 1.2, hand[1] + u[1] * 1.2];
  const ang = (Math.atan2(u[1], u[0]) * 180) / Math.PI;
  return (
    <g>
      <Shape d={limb(shoulder, elbow, ARM, d.wArm)} fill={skin} look={look} shadow={limb(shoulder, elbow, ARM, d.wArm, { backOnly: true })} />
      <Shape d={limb(elbow, hand, FORE, d.wFore)} fill={skin} look={look} shadow={limb(elbow, hand, FORE, d.wFore, { backOnly: true })} />
      <ellipse cx={hc[0]} cy={hc[1]} rx={d.wFore * 0.62} ry={d.wFore * 0.46} transform={`rotate(${ang} ${hc[0]} ${hc[1]})`} fill={skin} stroke={look.stroke ?? 'none'} strokeWidth={look.sw} />
      <Shape d={limb(shoulder, elbow, ARM, d.wArm, { grow: 0.7, t1: 0.42 })} fill={top} look={look} shadow={limb(shoulder, elbow, ARM, d.wArm, { backOnly: true, grow: 0.7, t1: 0.42 })} />
      <Joint p={elbow} r={d.wFore * 0.5} fill={skin} look={look} />
    </g>
  );
}

// ---------- Buste ----------

/** Profil du buste de profil : [k (0 hanche → 1 cou), arrière, avant] en unités. */
function sideTorsoProf(av: Avatar, d: Dims): Prof {
  const s = d.wTorso / 16;
  const f = av.sex === 'f';
  const bel = d.belly;
  const p: Prof = f
    ? [[-0.08, 6.2, 5.4], [0.05, 8.2, 6.2], [0.2, 7.6, 6.2 + bel * 0.6], [0.42, 5.9, 5.3 + bel], [0.6, 6.5, 6.4 + d.bust * 0.5], [0.72, 6.7, 6.6 + d.bust], [0.86, 6.5, 6.2], [0.97, 5, 4.2], [1.05, 3, 2.4]]
    : [[-0.08, 5.8, 5.4], [0.05, 7.3, 6.6], [0.2, 7.1, 6.9 + bel * 0.6], [0.42, 6.6, 6.5 + bel], [0.68, 7.6, 8.3], [0.86, 7.4, 7.2], [0.97, 5.5, 4.5], [1.05, 3.4, 2.6]];
  return p.map(([k, b, fr]) => [k, b * s, fr * s]);
}

function torsoPath(j: Joints, d: Dims, prof: Prof, k0: number, k1: number, grow = 0, backOnly = false): string {
  const ks = [k0, ...prof.map((p) => p[0]).filter((k) => k > k0 && k < k1), k1];
  const at = (k: number, off: number): Pt => [j.hip[0] + j.up[0] * d.torso * k + j.front[0] * off, j.hip[1] + j.up[1] * d.torso * k + j.front[1] * off];
  const back = ks.map((k) => at(k, -(interp(prof, k)[0] + grow)));
  const front = ks.map((k) => at(k, backOnly ? -interp(prof, k)[0] * 0.3 : interp(prof, k)[1] + grow)).reverse();
  return smooth([...back, ...front]);
}

function SideHead({ j, d, av, c, look }: { j: Joints; d: Dims; av: Avatar; c: Colors; look: Look }) {
  const [hx, hy] = j.headC;
  const ux = j.headC[0] - j.neck[0];
  const uy = j.headC[1] - j.neck[1];
  const l = Math.hypot(ux, uy) || 1;
  const up: Pt = [ux / l, uy / l];
  const front: Pt = [-up[1], up[0]];
  const r = d.head;
  const at = (f: number, u: number): Pt => [hx + front[0] * f * r + up[0] * u * r, hy + front[1] * f * r + up[1] * u * r];
  const eye = at(0.56, 0.1);
  const hairC = at(-0.16, 0.12);
  const tail = at(-1.15, 0.05);
  const neckTop = at(-0.05, -0.55);
  return (
    <g>
      <Shape d={limb(j.neck, neckTop, [[0, 0.5, 0.5], [1, 0.42, 0.42]], d.wArm * 1.2)} fill={c.skin} look={look} />
      {av.sex === 'f' && <ellipse cx={tail[0]} cy={tail[1]} rx={r * 0.42} ry={r * 0.62} fill={c.hair} transform={`rotate(${(Math.atan2(up[1], up[0]) * 180) / Math.PI + 90} ${tail[0]} ${tail[1]})`} />}
      <circle cx={hairC[0]} cy={hairC[1]} r={r * (av.age === 'senior' && av.sex === 'm' ? 0.98 : 1.04)} fill={c.hair} stroke={look.stroke ?? 'none'} strokeWidth={look.sw} />
      <circle cx={hx + front[0] * r * 0.1} cy={hy + front[1] * r * 0.1} r={r * 0.94} fill={c.skin} />
      <circle cx={eye[0]} cy={eye[1]} r={0.85} fill={INK} />
    </g>
  );
}

export function SideBody({ j, d, av, c, style }: { j: Joints; d: Dims; av: Avatar; c: Colors; style: BodyStyle }) {
  const look = LOOKS[style];
  const prof = sideTorsoProf(av, d);
  return (
    <g>
      <Arm shoulder={j.shoulderF} elbow={j.elbowF} hand={j.handF} d={d} skin={c.skinFar} top={c.topFar} look={look} />
      <Leg hip={j.hipF} knee={j.kneeF} ankle={j.ankleF} toe={j.toeF} d={d} av={av} skin={c.skinFar} bottom={c.bottomFar} shoe={c.shoe} look={look} />
      {/* Buste : haut, puis bassin (bas du vêtement). */}
      <Shape d={torsoPath(j, d, prof, -0.08, 1.05)} fill={c.top} look={look} shadow={torsoPath(j, d, prof, -0.08, 1.05, 0, true)} />
      <Shape d={torsoPath(j, d, prof, -0.08, 0.22, 0.15)} fill={c.bottom} look={look} shadow={torsoPath(j, d, prof, -0.08, 0.22, 0.15, true)} />
      <Joint p={j.hip} r={d.wThigh * 0.55} fill={c.bottom} look={look} />
      <Leg hip={j.hipN} knee={j.kneeN} ankle={j.ankleN} toe={j.toeN} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} look={look} />
      <SideHead j={j} d={d} av={av} c={c} look={look} />
      <Joint p={j.shoulderN} r={d.wArm * 0.62} fill={c.top} look={look} />
      <Arm shoulder={j.shoulderN} elbow={j.elbowN} hand={j.handN} d={d} skin={c.skin} top={c.top} look={look} />
    </g>
  );
}

export function FrontBody({ j, d, av, c, style }: { j: Joints; d: Dims; av: Avatar; c: Colors; style: BodyStyle }) {
  const look = LOOKS[style];
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
  const [hx, hy] = j.headC;
  const r = d.head;
  return (
    <g>
      <Leg hip={j.hipF} knee={j.kneeF} ankle={j.ankleF} toe={j.toeF} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} look={look} />
      <Leg hip={j.hipN} knee={j.kneeN} ankle={j.ankleN} toe={j.toeN} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} look={look} />
      <Arm shoulder={j.shoulderF} elbow={j.elbowF} hand={j.handF} d={d} skin={c.skin} top={c.top} look={look} />
      <Arm shoulder={j.shoulderN} elbow={j.elbowN} hand={j.handN} d={d} skin={c.skin} top={c.top} look={look} />
      <Shape d={limb(j.neck, [hx, hy + r * 0.5], [[0, 0.5, 0.5], [1, 0.42, 0.42]], d.wArm * 1.25)} fill={c.skin} look={look} />
      <Shape d={half(-0.06, 1)} fill={c.top} look={look} />
      <Shape d={half(-0.06, 0.18, 0.3)} fill={c.bottom} look={look} />
      <Joint p={j.shoulderN} r={d.wArm * 0.6} fill={c.top} look={look} />
      <Joint p={j.shoulderF} r={d.wArm * 0.6} fill={c.top} look={look} />
      {f && <rect x={hx - r * 1.08} y={hy - r * 0.3} width={r * 2.16} height={r * 1.5} rx={r * 0.6} fill={c.hair} />}
      <circle cx={hx} cy={hy - r * 0.08} r={r * 1.04} fill={c.hair} stroke={look.stroke ?? 'none'} strokeWidth={look.sw} />
      <circle cx={hx} cy={hy + r * 0.06} r={r * 0.92} fill={c.skin} />
      <path d={`M${hx - r * 0.98},${hy - r * 0.1} A${r},${r} 0 0 1 ${hx + r * 0.98},${hy - r * 0.1} Q${hx},${hy - r * 0.62} ${hx - r * 0.98},${hy - r * 0.1} Z`} fill={c.hair} />
      <circle cx={hx - r * 0.35} cy={hy + r * 0.12} r={0.8} fill={INK} />
      <circle cx={hx + r * 0.35} cy={hy + r * 0.12} r={0.8} fill={INK} />
    </g>
  );
}
