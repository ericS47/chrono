import { useEffect, useMemo, useRef, useState } from 'react';
import type { Character } from './characters';
import { figureSvg } from './draw';
import type { Exercise } from './exercises';

/** Personnage animé qui répète un exercice. Le temps est calculé depuis l’heure de départ (pas de ticks). */
export function Figure({ exercise, character, paused = false }: { exercise: Exercise; character: Character; paused?: boolean }) {
  const reduced = useMemo(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false, []);
  // Au repos (ou si l’animation est réduite) : pose la plus parlante, au milieu de la boucle.
  const [k, setK] = useState(0.5);
  const start = useRef(0);

  useEffect(() => {
    if (paused || reduced) {
      setK(0.5);
      return;
    }
    start.current = performance.now();
    let raf = 0;
    let last = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last < 33) return; // ~30 images par seconde suffisent
      last = now;
      setK((((now - start.current) / 1000) / exercise.duration) % 1);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [paused, reduced, exercise]);

  const svg = useMemo(
    () => figureSvg(character, exercise.pose(k), exercise.chair, { title: `${character.name} : ${exercise.label}` }),
    [character, exercise, k],
  );
  // Le SVG est fabriqué ici, à partir de constantes : aucune donnée de l’utilisateur n’y entre.
  return <div className="figure" dangerouslySetInnerHTML={{ __html: svg }} />;
}
