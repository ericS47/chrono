// Créateur de séance : la timeline (blocs, séries, blocs de travail) mise à plat.
// Une série ou un bloc de travail qui finit par un repos s'en sert de récupération
// entre deux répétitions, et ce repos est retiré après la dernière.

import type { TimelineGroup, TimelineItem, TimelineSeries, TimelineStep } from '../data/types';

export interface TimelineFlatStep {
  kind: 'work' | 'rest';
  duration: number;
  /** Commentaire du bloc, sinon « Effort », « Repos » ou « Récupération ». */
  label: string;
  note?: string;
  /** Exercice animé choisi dans le créateur. */
  exercise?: string;
  /** Répétition de la série en cours. */
  set?: number;
  sets?: number;
  /** Passage du bloc de travail en cours. */
  round?: number;
  rounds?: number;
  /** Nom du bloc de travail. */
  group?: string;
}

/** Libellés des exercices animés, pour nommer un bloc sans commentaire. */
let exerciseLabel: (id: string) => string | undefined = () => undefined;
export function setExerciseLabels(fn: (id: string) => string | undefined): void {
  exerciseLabel = fn;
}

function step(s: TimelineStep): TimelineFlatStep {
  const note = s.note?.trim() || undefined;
  const exercise = s.type === 'effort' && s.exercise ? s.exercise : undefined;
  const label = note ?? (exercise && exerciseLabel(exercise)) ?? (s.type === 'effort' ? 'Effort' : 'Repos');
  return { kind: s.type === 'effort' ? 'work' : 'rest', duration: s.duration, label, note, ...(exercise ? { exercise } : {}) };
}

const isRest = (x: TimelineItem | undefined) => x?.type === 'rest';

export function expandTimeline(items: TimelineItem[]): TimelineFlatStep[] {
  const out: TimelineFlatStep[] = [];
  for (const item of items) {
    if (item.type !== 'series' && item.type !== 'group') {
      out.push(step(item));
      continue;
    }
    const it: TimelineSeries | TimelineGroup = item;
    const name = it.type === 'group' ? it.name.trim() || undefined : undefined;
    const reps = Math.max(1, it.reps);
    const kids: TimelineItem[] = it.children;
    for (let r = 1; r <= reps; r++) {
      kids.forEach((k, i) => {
        if (r === reps && i === kids.length - 1 && isRest(k)) return;
        for (const x of expandTimeline([k])) {
          if (it.type === 'series') out.push(reps > 1 ? { ...x, set: r, sets: reps } : x);
          else out.push({ ...x, group: x.group ?? name, ...(reps > 1 && x.round === undefined ? { round: r, rounds: reps } : {}) });
        }
      });
      if (r < reps && it.between > 0 && !isRest(kids[kids.length - 1])) {
        out.push({
          kind: 'rest', duration: it.between, label: 'Récupération',
          ...(it.type === 'series' ? { set: r, sets: reps } : { group: name, round: r, rounds: reps }),
        });
      }
    }
  }
  return out.filter((x) => x.duration > 0);
}

export function timelineDuration(items: TimelineItem[]): number {
  return expandTimeline(items).reduce((t, x) => t + x.duration, 0);
}
