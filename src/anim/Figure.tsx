// Dessin animé de l'avatar qui fait un exercice (SVG généré, sans image téléchargée).

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Avatar } from './avatar';
import { DEFAULT_AVATAR } from './avatar';
import { mix, SKIN_TONES } from './avatar';
import type { ExerciseId } from './exercises';
import { EXERCISE_BY_ID, frameAt, frameBox, GROUND, place, VIEW_W } from './exercises';
import { dims } from './pose';
import type { Colors } from './Body';
import { FrontBody, SideBody } from './Body';

const SHOE = '#6E7891';

function colors(av: Avatar): Colors {
  const skin = SKIN_TONES[av.skin]?.color ?? SKIN_TONES[2].color;
  const hair = av.age === 'senior' && !['#9A9A9A', '#E6E3DD'].includes(av.hair) ? mix(av.hair, '#B9B6B0', 0.65) : av.hair;
  const dark = (c: string) => mix(c, '#14183A', 0.22);
  return { skin, skinFar: dark(skin), hair, top: av.top, topFar: dark(av.top), bottom: av.bottom, bottomFar: dark(av.bottom), shoe: SHOE };
}

/** Gabarit le plus encombrant : sert à cadrer chaque exercice. */
const REF = dims({ ...DEFAULT_AVATAR, sex: 'm', build: 'forte', height: 'grande' });

/** Image fixe de l'avatar à l'instant `sec` du mouvement. */
export function FigureFrame({ exercise, avatar, sec, title }: { exercise: ExerciseId; avatar: Avatar; sec: number; title?: string }) {
  const placed = useMemo(() => place(EXERCISE_BY_ID[exercise], dims(avatar)), [exercise, avatar]);
  const c = useMemo(() => colors(avatar), [avatar]);
  const { j } = frameAt(placed, sec);
  const b = frameBox(placed.ex, REF);
  const ex = placed.ex;
  return (
    <svg viewBox={`${b.x} ${b.y} ${b.w} ${b.h}`} className={`figure ${b.w > b.h * 1.25 ? 'wide' : ''}`} role="img" aria-label={title ?? `Animation : ${ex.label}`}>
      <ellipse cx={VIEW_W / 2} cy={GROUND + 2} rx={Math.min(ex.view === 'front' ? 26 : 48, b.w / 2 - 3)} ry={3.2} fill="rgba(20,24,58,0.12)" />
      {ex.view === 'front' ? <FrontBody j={j} d={placed.d} av={avatar} c={c} /> : <SideBody j={j} d={placed.d} av={avatar} c={c} />}
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
