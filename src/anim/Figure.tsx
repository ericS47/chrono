// Dessin animé de l'avatar qui fait un exercice (SVG généré, sans image téléchargée).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Avatar } from './avatar';
import { DEFAULT_AVATAR } from './avatar';
import { mix, SKIN_TONES } from './avatar';
import type { ChairPos, ExerciseAnim, ExerciseId } from './exercises';
import { CHAIR_BACK, CHAIR_DEPTH, CHAIR_HALF, chairPos, EXERCISE_BY_ID, frameAt, frameBox, GROUND, place, VIEW_W } from './exercises';
import { dims } from './pose';
import type { Colors } from './Body';
import { FrontBody, SideBody } from './Body';
import type { Joints, Pt } from './pose';

const SHOE = '#6E7891';

function colors(av: Avatar): Colors {
  const skin = SKIN_TONES[av.skin]?.color ?? SKIN_TONES[2].color;
  const hair = av.age === 'senior' && !['#9A9A9A', '#E6E3DD'].includes(av.hair) ? mix(av.hair, '#B9B6B0', 0.65) : av.hair;
  const dark = (c: string) => mix(c, '#14183A', 0.22);
  return { skin, skinFar: dark(skin), hair, top: av.top, topFar: dark(av.top), bottom: av.bottom, bottomFar: dark(av.bottom), shoe: SHOE };
}

/** Kettlebell tenue par les mains : boule sous les mains, anse autour. */
function Kettlebell({ hand, r }: { hand: Pt; r: number }) {
  const [x, y] = hand;
  const cy = y + r * 1.15;
  return (
    <g>
      <path d={`M${x - r * 0.62},${cy - r * 0.55} C${x - r * 0.75},${y - r * 0.95} ${x + r * 0.75},${y - r * 0.95} ${x + r * 0.62},${cy - r * 0.55}`} fill="none" stroke="#2B2F3A" strokeWidth={r * 0.32} strokeLinecap="round" />
      <circle cx={x} cy={cy} r={r} fill="#2B2F3A" />
      <ellipse cx={x - r * 0.35} cy={cy - r * 0.35} rx={r * 0.28} ry={r * 0.18} fill="#FFFFFF" opacity={0.18} />
    </g>
  );
}

const BAND = '#3BB273';
/** Élastique tendu du pied à la main. */
function Band({ foot, hand }: { foot: Pt; hand: Pt }) {
  return <line x1={foot[0]} y1={foot[1]} x2={hand[0]} y2={hand[1]} stroke={BAND} strokeWidth={1.7} strokeLinecap="round" />;
}

/** Point à la fraction `t` du segment a → b. */
const along = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
/** Point p + u·k + v·l. */
const add2 = (p: Pt, u: Pt, k: number, v: Pt, l: number): Pt => [p[0] + u[0] * k + v[0] * l, p[1] + u[1] * k + v[1] * l];

/** Mini-bande ou anneau autour des deux jambes (genoux ou chevilles) : de face, tendu entre les jambes ; de profil, vu par la tranche. */
function LegLoop({ a, b, color, view, ry, edge }: { a: Pt; b: Pt; color: string; view: 'side' | 'front'; ry: number; edge: Pt }) {
  const cx = (a[0] + b[0]) / 2;
  const cy = (a[1] + b[1]) / 2;
  if (view === 'front') {
    const rx = Math.max(3, Math.abs(b[0] - a[0]) / 2 + 2);
    return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={color} strokeWidth={1.9} />;
  }
  // De profil : la boucle suit le membre (vers `edge`), et relie les deux jambes si elles sont écartées.
  const ang = (Math.atan2(edge[1] - cy, edge[0] - cx) * 180) / Math.PI;
  const gap = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return (
    <g>
      {gap > 3 && <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={color} strokeWidth={1.7} strokeLinecap="round" />}
      <ellipse cx={a[0]} cy={a[1]} rx={ry} ry={2.2} fill="none" stroke={color} strokeWidth={1.6} transform={`rotate(${ang + 90} ${a[0]} ${a[1]})`} />
    </g>
  );
}

const IRON = '#2B2F3A';

/** Haltère tenu en main : de profil, vu de bout (un disque) ; de face, à plat. */
function Dumbbell({ hand, view, angle }: { hand: Pt; view: 'side' | 'front'; angle?: number }) {
  const [x, y] = hand;
  if (angle !== undefined) {
    // Prise neutre (curl marteau) : de profil, la barre se voit en long, perpendiculaire à l'avant-bras.
    return (
      <g transform={`rotate(${angle} ${x} ${y})`}>
        <rect x={x - 4.5} y={y - 0.9} width={9} height={1.8} rx={0.9} fill="#6B6F76" />
        <rect x={x - 6.5} y={y - 3.2} width={2.8} height={6.4} rx={1.1} fill={IRON} />
        <rect x={x + 3.7} y={y - 3.2} width={2.8} height={6.4} rx={1.1} fill={IRON} />
      </g>
    );
  }
  if (view === 'side') {
    return (
      <g>
        <circle cx={x} cy={y} r={3.8} fill={IRON} />
        <circle cx={x} cy={y} r={1.3} fill="#6B6F76" />
      </g>
    );
  }
  return (
    <g>
      <rect x={x - 5} y={y - 0.9} width={10} height={1.8} rx={0.9} fill="#6B6F76" />
      <rect x={x - 7} y={y - 3.4} width={3} height={6.8} rx={1.2} fill={IRON} />
      <rect x={x + 4} y={y - 3.4} width={3} height={6.8} rx={1.2} fill={IRON} />
    </g>
  );
}

const WOOD = '#B07A4E';
const WOOD_DARK = '#8C5D38';
/**
 * Chaise : de profil (l'avatar regarde à droite), assise de `x0` à `x0 + CHAIR_DEPTH`, dossier à gauche ou à droite ;
 * de face, assise centrée sur `x0`, dossier derrière l'avatar.
 */
function Chair({ seatY, x0, back }: ChairPos) {
  const legW = 1.8;
  if (back === 'behind') {
    const l = x0 - CHAIR_HALF;
    const w = CHAIR_HALF * 2;
    return (
      <g>
        <rect x={l + 0.6} y={seatY - CHAIR_BACK} width={2.2} height={CHAIR_BACK} rx={1.1} fill={WOOD_DARK} />
        <rect x={l + w - 2.8} y={seatY - CHAIR_BACK} width={2.2} height={CHAIR_BACK} rx={1.1} fill={WOOD_DARK} />
        <rect x={l} y={seatY - CHAIR_BACK} width={w} height={6} rx={1.6} fill={WOOD_DARK} />
        <rect x={l + 0.4} y={seatY} width={legW} height={GROUND - seatY} fill={WOOD_DARK} />
        <rect x={l + w - legW - 0.4} y={seatY} width={legW} height={GROUND - seatY} fill={WOOD_DARK} />
        <rect x={l - 0.5} y={seatY} width={w + 1} height={2.8} rx={1.2} fill={WOOD} />
      </g>
    );
  }
  const depth = CHAIR_DEPTH;
  const bx = back === 'left' ? x0 : x0 + depth - 2.4;
  return (
    <g>
      <rect x={bx} y={seatY - CHAIR_BACK} width={2.4} height={CHAIR_BACK} rx={1.2} fill={WOOD_DARK} />
      <rect x={x0} y={seatY} width={legW} height={GROUND - seatY} fill={WOOD_DARK} />
      <rect x={x0 + depth - legW} y={seatY} width={legW} height={GROUND - seatY} fill={WOOD_DARK} />
      <rect x={x0 - 0.5} y={seatY} width={depth + 1} height={2.6} rx={1.2} fill={WOOD} />
    </g>
  );
}

const RING = '#3DB8AD';
/** Anneau de Pilates : de face, tenu entre les mains ; de profil, serré entre les genoux (ou tenu à deux mains, `hands`). */
function Ring({ j, view, grip }: { j: Joints; view: 'side' | 'front'; grip?: string }) {
  if (grip === 'side') {
    // Anneau serré entre l'intérieur du bras (côté droit de l'écran) et la hanche : il s'aplatit quand le bras serre.
    const m = along(j.elbowN, j.handN, 0.3);
    const inner = j.shoulderN[0] - 2.5;
    const rx = Math.max(2.5, (m[0] - inner) / 2);
    return <ellipse cx={(m[0] + inner) / 2} cy={m[1] + 1} rx={rx} ry={7.5} fill="none" stroke={RING} strokeWidth={1.9} />;
  }
  if (grip === 'inside' && view === 'front') {
    // Mains à l'intérieur de l'anneau, contre les poignées : l'anneau déborde de chaque côté.
    const [ax, ay] = j.handF;
    const [bx, by] = j.handN;
    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2;
    const rx = Math.abs(bx - ax) / 2 + 3.6;
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={rx} ry={8} fill="none" stroke={RING} strokeWidth={1.9} />
        <rect x={cx - rx - 1.6} y={cy - 2.8} width={3.2} height={5.6} rx={1.3} fill="#2B2F3A" opacity={0.85} />
        <rect x={cx + rx - 1.6} y={cy - 2.8} width={3.2} height={5.6} rx={1.3} fill="#2B2F3A" opacity={0.85} />
      </g>
    );
  }
  if (grip === 'knees' || grip === 'ankles') {
    const [a, b] = grip === 'knees' ? [j.kneeN, j.kneeF] : [along(j.kneeN, j.ankleN, 0.8), along(j.kneeF, j.ankleF, 0.8)];
    if (view === 'front') return <LegLoop a={a} b={b} color={RING} view={view} ry={6} edge={a} />;
    const ang = (Math.atan2(a[1] - j.hipN[1], a[0] - j.hipN[0]) * 180) / Math.PI;
    return <ellipse cx={a[0]} cy={a[1]} rx={2.4} ry={7} fill="none" stroke={RING} strokeWidth={1.9} transform={`rotate(${ang} ${a[0]} ${a[1]})`} />;
  }
  if (view === 'side' && grip === 'hands') {
    // De profil, l'anneau serré entre les paumes est vu de face : un cercle devant les mains.
    const [x, y] = [(j.handN[0] + j.handF[0]) / 2, (j.handN[1] + j.handF[1]) / 2];
    return (
      <g>
        <circle cx={x} cy={y} r={7.5} fill="none" stroke={RING} strokeWidth={1.9} />
        <rect x={x - 2.2} y={y - 2.8} width={4.4} height={5.6} rx={1.5} fill="#2B2F3A" opacity={0.85} />
      </g>
    );
  }
  if (view === 'front') {
    const [ax, ay] = j.handF;
    const [bx, by] = j.handN;
    const cx = (ax + bx) / 2;
    const cy = (ay + by) / 2;
    // Mains à des hauteurs différentes (flexion latérale) : l'anneau suit la ligne des mains.
    const tilt = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    const tilted = Math.abs(tilt) > 0.5 && Math.abs(tilt) < 60;
    const rx = tilted ? Math.hypot(bx - ax, by - ay) / 2 + 1 : Math.max(3, Math.abs(bx - ax) / 2 + 1);
    return (
      <g>
        <ellipse cx={cx} cy={cy} rx={rx} ry={8} fill="none" stroke={RING} strokeWidth={1.9} transform={tilted ? `rotate(${tilt} ${cx} ${cy})` : undefined} />
        <rect x={ax - 2.2} y={ay - 2.8} width={4.4} height={5.6} rx={1.5} fill="#2B2F3A" opacity={0.85} />
        <rect x={bx - 2.2} y={by - 2.8} width={4.4} height={5.6} rx={1.5} fill="#2B2F3A" opacity={0.85} />
      </g>
    );
  }
  // De profil, l'anneau est vu par la tranche, entre les genoux.
  const [kx, ky] = j.kneeN;
  const ang = (Math.atan2(j.kneeN[1] - j.hipN[1], j.kneeN[0] - j.hipN[0]) * 180) / Math.PI;
  return <ellipse cx={kx} cy={ky} rx={2.4} ry={7} fill="none" stroke={RING} strokeWidth={1.9} transform={`rotate(${ang} ${kx} ${ky})`} />;
}

/** Matériel tenu ou utilisé (dessiné par-dessus le corps ; la chaise est dessinée derrière). */
function Equipment({ ex, j }: { ex: ExerciseAnim; j: Joints }) {
  const { view, grip } = ex;
  const kind = ex.equipment;
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const apart = Math.hypot(j.handN[0] - j.handF[0], j.handN[1] - j.handF[1]) > 8;
  if (grip === 'near') {
    // Une seule charge, dans la main proche (flexion latérale…).
    if (kind === 'kettlebell') return <Kettlebell hand={j.handN} r={4.5} />;
    if (kind === 'dumbbell') return <Dumbbell hand={j.handN} view={view} />;
    if (kind === 'band') return <Band foot={mid(j.ankleN, j.toeN)} hand={j.handN} />;
  }
  if (kind === 'dumbbell' && grip === 'ankles') {
    // Haltère serré entre les pieds (relevés de jambes).
    return <Dumbbell hand={mid(mid(j.ankleN, j.toeN), mid(j.ankleF, j.toeF))} view={view} />;
  }
  if (kind === 'kettlebell') {
    // Une kettlebell à deux mains si elles sont proches, sinon une par main.
    if (grip === 'each' || (grip !== 'one' && apart)) {
      return <g><Kettlebell hand={j.handF} r={4} /><Kettlebell hand={j.handN} r={4} /></g>;
    }
    return <Kettlebell hand={mid(j.handN, j.handF)} r={5} />;
  }
  if (kind === 'ring') return <Ring j={j} view={view} grip={grip} />;
  if (kind === 'dumbbell') {
    if (grip === 'one') return <Dumbbell hand={mid(j.handN, j.handF)} view={view} />;
    if (grip === 'hammer') {
      const ang = (e: Pt, h: Pt) => (Math.atan2(h[1] - e[1], h[0] - e[0]) * 180) / Math.PI + 90;
      return (
        <g>
          <Dumbbell hand={j.handF} view={view} angle={ang(j.elbowF, j.handF)} />
          <Dumbbell hand={j.handN} view={view} angle={ang(j.elbowN, j.handN)} />
        </g>
      );
    }
    return (
      <g>
        <Dumbbell hand={j.handF} view={view} />
        <Dumbbell hand={j.handN} view={view} />
      </g>
    );
  }
  if (grip === 'knees' || grip === 'ankles') {
    const t = grip === 'knees' ? 0.12 : 0.8;
    const [a, b] = [along(j.kneeN, j.ankleN, t), along(j.kneeF, j.ankleF, t)];
    return <LegLoop a={a} b={b} color={BAND} view={view} ry={grip === 'knees' ? 4.5 : 3.6} edge={j.ankleN} />;
  }
  if (grip === 'back') {
    // Élastique passé dans le dos, sous les omoplates, une extrémité dans chaque main.
    const back = add2(mid(j.shoulderN, j.shoulderF), j.front, -5.5, j.up, -4);
    return (
      <g>
        <Band foot={back} hand={j.handF} />
        <Band foot={back} hand={j.handN} />
      </g>
    );
  }
  if (grip === 'foot') {
    // Élastique sous le pied proche, une extrémité dans chaque main.
    const foot = mid(j.ankleN, j.toeN);
    return <g><Band foot={foot} hand={j.handF} /><Band foot={foot} hand={j.handN} /></g>;
  }
  return (
    <g>
      <Band foot={mid(j.ankleF, j.toeF)} hand={j.handF} />
      <Band foot={mid(j.ankleN, j.toeN)} hand={j.handN} />
    </g>
  );
}

/** Gabarit le plus encombrant : sert à cadrer chaque exercice. */
const REF = dims({ ...DEFAULT_AVATAR, sex: 'm', build: 'forte', height: 'grande' });

/** Image fixe de l'avatar à l'instant `sec` du mouvement. */
export function FigureFrame({ exercise, avatar, sec, title }: { exercise: ExerciseId; avatar: Avatar; sec: number; title?: string }) {
  const placed = useMemo(() => place(EXERCISE_BY_ID[exercise], dims(avatar)), [exercise, avatar]);
  const c = useMemo(() => colors(avatar), [avatar]);
  const { j, flat, roll } = frameAt(placed, sec);
  // Chaise : fixe au sol, placée d'après la première posture (sous la hanche, ou sous les mains).
  const chair = useMemo(() => chairPos(placed), [placed]);
  const b = frameBox(placed.ex, REF);
  const ex = placed.ex;
  return (
    <svg viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} className={`figure ${b.w > b.h * 1.25 ? 'wide' : ''}`} role="img" aria-label={title ?? `Animation : ${ex.label}`}>
      <ellipse cx={VIEW_W / 2} cy={GROUND + 2} rx={Math.min(ex.view === 'front' ? 26 : 48, b.w / 2 - 3)} ry={3.2} fill="rgba(20,24,58,0.12)" />
      {chair && <Chair {...chair} />}
      {ex.view === 'front'
        ? <g transform={roll ? `rotate(${roll} ${flat.hip[0]} ${flat.hip[1]})` : undefined}><FrontBody j={flat} d={placed.d} av={avatar} c={c} /></g>
        : <SideBody j={j} d={placed.d} av={avatar} c={c} />}
      {ex.equipment && ex.equipment !== 'none' && (ex.view === 'front' && roll
        // Corps basculé (gainage latéral) : le matériel est dessiné droit puis basculé avec le corps.
        ? <g transform={`rotate(${roll} ${flat.hip[0]} ${flat.hip[1]})`}><Equipment ex={ex} j={flat} /></g>
        : <Equipment ex={ex} j={j} />)}
    </svg>
  );
}

/** Avatar animé en boucle ; `playing` à false fige le mouvement. */
export function ExerciseFigure({ exercise, avatar, playing = true }: { exercise: ExerciseId; avatar: Avatar; playing?: boolean }) {
  const [sec, setSec] = useState(0);
  const base = useRef<number | null>(null);
  const offset = useRef(0);
  useEffect(() => {
    if (!playing) {
      base.current = null;
      return;
    }
    let raf = 0;
    let last = 0;
    const loop = (t: number) => {
      if (base.current === null) base.current = t - offset.current * 1000;
      // ~30 images par seconde suffisent et ménagent la batterie.
      if (t - last > 32) {
        last = t;
        offset.current = (t - base.current) / 1000;
        setSec(offset.current);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [playing]);
  return <FigureFrame exercise={exercise} avatar={avatar} sec={sec} />;
}
