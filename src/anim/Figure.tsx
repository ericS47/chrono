// Dessin animé de l'avatar qui fait un exercice (SVG généré, sans image téléchargée).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Avatar } from './avatar';
import { DEFAULT_AVATAR } from './avatar';
import { mix, SKIN_TONES } from './avatar';
import type { ExerciseId } from './exercises';
import { EXERCISE_BY_ID, frameAt, frameBox, GROUND, place, VIEW_W } from './exercises';
import type { Dims, Joints, Pt } from './pose';
import { dims } from './pose';
import type { BodyStyle } from './Body';
import { FrontBody, SideBody } from './Body';

const SHOE = '#2B2F3A';

interface Colors { skin: string; skinFar: string; hair: string; top: string; topFar: string; bottom: string; bottomFar: string; shoe: string }

function colors(av: Avatar): Colors {
  const skin = SKIN_TONES[av.skin]?.color ?? SKIN_TONES[2].color;
  const hair = av.age === 'senior' && !['#9A9A9A', '#E6E3DD'].includes(av.hair) ? mix(av.hair, '#B9B6B0', 0.65) : av.hair;
  const dark = (c: string) => mix(c, '#14183A', 0.22);
  return { skin, skinFar: dark(skin), hair, top: av.top, topFar: dark(av.top), bottom: av.bottom, bottomFar: dark(av.bottom), shoe: SHOE };
}

const lerp = (a: Pt, b: Pt, t: number): Pt => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

function Seg({ a, b, w, c }: { a: Pt; b: Pt; w: number; c: string }) {
  return <line x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={c} strokeWidth={w} strokeLinecap="round" />;
}

function Leg({ hip, knee, ankle, toe, d, av, skin, bottom, shoe }: {
  hip: Pt; knee: Pt; ankle: Pt; toe: Pt; d: Dims; av: Avatar; skin: string; bottom: string; shoe: string;
}) {
  const legging = av.bottomType === 'legging';
  return (
    <g>
      <Seg a={hip} b={knee} w={d.wThigh} c={skin} />
      <Seg a={knee} b={ankle} w={d.wShin} c={skin} />
      {legging ? (
        <>
          <Seg a={hip} b={knee} w={d.wThigh + 0.6} c={bottom} />
          <Seg a={knee} b={lerp(knee, ankle, 0.9)} w={d.wShin + 0.6} c={bottom} />
        </>
      ) : (
        <Seg a={hip} b={lerp(hip, knee, 0.62)} w={d.wThigh + 0.7} c={bottom} />
      )}
      <Seg a={ankle} b={toe} w={4.6} c={shoe} />
    </g>
  );
}

function Arm({ shoulder, elbow, hand, d, skin, top }: { shoulder: Pt; elbow: Pt; hand: Pt; d: Dims; skin: string; top: string }) {
  return (
    <g>
      <Seg a={shoulder} b={elbow} w={d.wArm} c={skin} />
      <Seg a={elbow} b={hand} w={d.wFore} c={skin} />
      <Seg a={shoulder} b={lerp(shoulder, elbow, 0.42)} w={d.wArm + 1.6} c={top} />
      <circle cx={hand[0]} cy={hand[1]} r={d.wFore * 0.62} fill={skin} />
    </g>
  );
}

function SideHead({ j, d, av, c }: { j: Joints; d: Dims; av: Avatar; c: Colors }) {
  const [hx, hy] = j.headC;
  const ux = (j.headC[0] - j.neck[0]);
  const uy = (j.headC[1] - j.neck[1]);
  const l = Math.hypot(ux, uy) || 1;
  const up: Pt = [ux / l, uy / l];
  const front: Pt = [-up[1], up[0]];
  const r = d.head;
  const at = (f: number, u: number): Pt => [hx + front[0] * f * r + up[0] * u * r, hy + front[1] * f * r + up[1] * u * r];
  const eye = at(0.55, 0.12);
  const hairC = at(-0.16, 0.12);
  const long = av.sex === 'f';
  const tail = at(-1.15, 0.05);
  return (
    <g>
      <Seg a={j.neck} b={at(0, -0.6)} w={d.wArm * 0.95} c={c.skin} />
      {long && <ellipse cx={tail[0]} cy={tail[1]} rx={r * 0.42} ry={r * 0.62} fill={c.hair} transform={`rotate(${(Math.atan2(up[1], up[0]) * 180) / Math.PI + 90} ${tail[0]} ${tail[1]})`} />}
      <circle cx={hairC[0]} cy={hairC[1]} r={r * (av.age === 'senior' && av.sex === 'm' ? 0.98 : 1.04)} fill={c.hair} />
      <circle cx={hx + front[0] * r * 0.1} cy={hy + front[1] * r * 0.1} r={r * 0.94} fill={c.skin} />
      <circle cx={eye[0]} cy={eye[1]} r={0.85} fill="#14183A" />
    </g>
  );
}

function SideFigure({ j, d, av, c }: { j: Joints; d: Dims; av: Avatar; c: Colors }) {
  const chest = (k: number, f: number): Pt => [j.hip[0] + j.up[0] * d.torso * k + j.front[0] * f, j.hip[1] + j.up[1] * d.torso * k + j.front[1] * f];
  const shoulder = j.shoulderN;
  return (
    <g>
      <Arm shoulder={j.shoulderF} elbow={j.elbowF} hand={j.handF} d={d} skin={c.skinFar} top={c.topFar} />
      <Leg hip={j.hipF} knee={j.kneeF} ankle={j.ankleF} toe={j.toeF} d={d} av={av} skin={c.skinFar} bottom={c.bottomFar} shoe={c.shoe} />
      {/* Buste */}
      <Seg a={chest(0.12, 0)} b={chest(0.86, 0)} w={d.wTorso} c={c.top} />
      {d.belly > 0 && <circle cx={chest(0.38, d.wTorso * 0.22)[0]} cy={chest(0.38, d.wTorso * 0.22)[1]} r={d.wTorso * 0.3 + d.belly * 0.55} fill={c.top} />}
      {d.bust > 0 && <circle cx={chest(0.7, d.wTorso * 0.38)[0]} cy={chest(0.7, d.wTorso * 0.38)[1]} r={d.bust} fill={c.top} />}
      <circle cx={j.hip[0]} cy={j.hip[1]} r={d.wTorso * 0.47} fill={c.bottom} />
      <Seg a={chest(0.02, 0)} b={chest(0.2, 0)} w={d.wTorso} c={c.bottom} />
      <Leg hip={j.hipN} knee={j.kneeN} ankle={j.ankleN} toe={j.toeN} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} />
      <SideHead j={j} d={d} av={av} c={c} />
      <Arm shoulder={shoulder} elbow={j.elbowN} hand={j.handN} d={d} skin={c.skin} top={c.top} />
    </g>
  );
}

function FrontFigure({ j, d, av, c }: { j: Joints; d: Dims; av: Avatar; c: Colors }) {
  const [nx, ny] = j.neck;
  const sh = d.shoulderHalf;
  const hh = d.hipHalf;
  const waist = Math.max(hh, sh * 0.78) + d.belly * 0.6;
  const yHip = j.hip[1];
  const torso = `M${nx - sh},${ny + 1} Q${nx},${ny - 2} ${nx + sh},${ny + 1} L${j.hip[0] + waist},${(ny + yHip) / 2} L${j.hip[0] + hh},${yHip - 1} L${j.hip[0] - hh},${yHip - 1} L${j.hip[0] - waist},${(ny + yHip) / 2} Z`;
  const [hx, hy] = j.headC;
  const r = d.head;
  return (
    <g>
      <Leg hip={j.hipF} knee={j.kneeF} ankle={j.ankleF} toe={j.toeF} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} />
      <Leg hip={j.hipN} knee={j.kneeN} ankle={j.ankleN} toe={j.toeN} d={d} av={av} skin={c.skin} bottom={c.bottom} shoe={c.shoe} />
      <rect x={j.hip[0] - hh - 1} y={yHip - 5} width={2 * hh + 2} height={8} rx={3} fill={c.bottom} />
      <Arm shoulder={j.shoulderF} elbow={j.elbowF} hand={j.handF} d={d} skin={c.skin} top={c.top} />
      <Arm shoulder={j.shoulderN} elbow={j.elbowN} hand={j.handN} d={d} skin={c.skin} top={c.top} />
      <path d={torso} fill={c.top} strokeLinejoin="round" stroke={c.top} strokeWidth={3} />
      <Seg a={j.neck} b={[hx, hy + r * 0.6]} w={d.wArm} c={c.skin} />
      {av.sex === 'f' && <rect x={hx - r * 1.08} y={hy - r * 0.3} width={r * 2.16} height={r * 1.5} rx={r * 0.6} fill={c.hair} />}
      <circle cx={hx} cy={hy - r * 0.08} r={r * 1.04} fill={c.hair} />
      <circle cx={hx} cy={hy + r * 0.06} r={r * 0.92} fill={c.skin} />
      <path d={`M${hx - r * 0.98},${hy - r * 0.1} A${r},${r} 0 0 1 ${hx + r * 0.98},${hy - r * 0.1} Q${hx},${hy - r * 0.62} ${hx - r * 0.98},${hy - r * 0.1} Z`} fill={c.hair} />
      <circle cx={hx - r * 0.35} cy={hy + r * 0.12} r={0.8} fill="#14183A" />
      <circle cx={hx + r * 0.35} cy={hy + r * 0.12} r={0.8} fill="#14183A" />
    </g>
  );
}

/** Gabarit le plus encombrant : sert à cadrer chaque exercice. */
const REF = dims({ ...DEFAULT_AVATAR, sex: 'm', build: 'forte', height: 'grande' });

/** Image fixe de l'avatar à l'instant `sec` du mouvement. */
export function FigureFrame({ exercise, avatar, sec, title, body = 'simple' }: { exercise: ExerciseId; avatar: Avatar; sec: number; title?: string; body?: BodyStyle | 'simple' }) {
  const placed = useMemo(() => place(EXERCISE_BY_ID[exercise], dims(avatar)), [exercise, avatar]);
  const c = useMemo(() => colors(avatar), [avatar]);
  const { j } = frameAt(placed, sec);
  const b = frameBox(placed.ex, REF);
  const ex = placed.ex;
  return (
    <svg viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} className={`figure ${b.w > b.h * 1.25 ? 'wide' : ''}`} role="img" aria-label={title ?? `Animation : ${ex.label}`}>
      <ellipse cx={VIEW_W / 2} cy={GROUND + 2} rx={Math.min(ex.view === 'front' ? 26 : 48, b.w / 2 - 3)} ry={3.2} fill="rgba(20,24,58,0.12)" />
      {body === 'simple'
        ? ex.view === 'front' ? <FrontFigure j={j} d={placed.d} av={avatar} c={c} /> : <SideFigure j={j} d={placed.d} av={avatar} c={c} />
        : ex.view === 'front' ? <FrontBody j={j} d={placed.d} av={avatar} c={c} style={body} /> : <SideBody j={j} d={placed.d} av={avatar} c={c} style={body} />}
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
