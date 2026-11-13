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
  /**
   * Avancement dans le bloc de travail en cours : numéro de l'étape (effort ou série, les repos
   * ne comptent pas) et nombre d'étapes du bloc. Hors bloc de travail : étape de la séance.
   */
  item?: number;
  items?: number;
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

/**
 * Numéro d'étape de chaque élément : les repos (et les blocs de durée nulle) ne comptent pas et
 * gardent le numéro de l'étape qui précède (1 avant la première). Renvoie aussi le nombre d'étapes.
 */
function numbering(items: TimelineItem[]): { at: number[]; total: number } {
  let n = 0;
  const at = items.map((x) => {
    if (!isRest(x) && (x.type === 'series' || x.type === 'group' || x.duration > 0)) n++;
    return Math.max(1, n);
  });
  return { at, total: n };
}

/** Met à plat un élément (bloc simple, série ou bloc de travail), sans l'avancement de la séance. */
function expandItem(item: TimelineItem): TimelineFlatStep[] {
  if (item.type !== 'series' && item.type !== 'group') return [step(item)];
  const out: TimelineFlatStep[] = [];
  const it: TimelineSeries | TimelineGroup = item;
  const name = it.type === 'group' ? it.name.trim() || undefined : undefined;
  const reps = Math.max(1, it.reps);
  const kids: TimelineItem[] = it.children;
  // Bloc de travail : avancement dans le bloc (étape 3 sur 5).
  const num = numbering(kids);
  const place = (i: number) => (it.type === 'group' && num.total > 0 ? { item: num.at[i], items: num.total } : {});
  for (let r = 1; r <= reps; r++) {
    kids.forEach((k, i) => {
      if (r === reps && i === kids.length - 1 && isRest(k)) return;
      for (const x of expandItem(k)) {
        if (it.type === 'series') out.push(reps > 1 ? { ...x, set: r, sets: reps } : x);
        else out.push({ ...x, group: x.group ?? name, ...(reps > 1 && x.round === undefined ? { round: r, rounds: reps } : {}), ...place(i) });
      }
    });
    if (r < reps && it.between > 0 && !isRest(kids[kids.length - 1])) {
      out.push({
        kind: 'rest', duration: it.between, label: 'Récupération',
        ...(it.type === 'series' ? { set: r, sets: reps } : { group: name, round: r, rounds: reps, ...place(kids.length - 1) }),
      });
    }
  }
  return out;
}

export function expandTimeline(items: TimelineItem[]): TimelineFlatStep[] {
  // Hors bloc de travail, l'avancement est celui de la séance (s'il y a plusieurs étapes).
  const top = numbering(items);
  const out: TimelineFlatStep[] = [];
  items.forEach((item, i) => {
    for (const x of expandItem(item)) {
      out.push(x.items === undefined && top.total > 1 ? { ...x, item: top.at[i], items: top.total } : x);
    }
  });
  return out.filter((x) => x.duration > 0);
}

export function timelineDuration(items: TimelineItem[]): number {
  return expandTimeline(items).reduce((t, x) => t + x.duration, 0);
}
