// Conversion d'une séance (blocs) en une liste plate de phases.
// Un seul moteur de chrono sert ensuite tous les modes.

import type { Block, Mode, Workout } from '../data/types';
import { MODE_LABELS } from '../data/types';
import { fmtShort } from '../lib/format';

export type PhaseKind = 'prep' | 'work' | 'rest';

export interface Phase {
  kind: PhaseKind;
  /** Nom affiché : exercice, « Repos », « Préparation »… */
  label: string;
  /** Durée en secondes, null = phase ouverte (terminée par l'utilisateur). */
  duration: number | null;
  /** Affichage en chrono qui monte plutôt qu'en décompte. */
  countUp: boolean;
  blockIndex: number;
  mode: Mode | null;
  detail?: string;
  round?: number;
  rounds?: number;
  set?: number;
  sets?: number;
  /** Bouton principal attendu pour finir une phase ouverte. */
  action?: 'done' | 'setDone';
  /** Compteur de tours au tap (AMRAP, For Time). */
  roundCounter?: boolean;
  /** Tours intermédiaires (chrono simple). */
  laps?: boolean;
}

const DEFAULTS = {
  amrap: 12 * 60,
  emomInterval: 60,
  emomRounds: 10,
  tabata: { work: 20, rest: 10, rounds: 8 },
  interval: { work: 40, rest: 20, rounds: 10 },
  countdown: 5 * 60,
};

export function blockTitle(block: Block): string {
  return block.name?.trim() || MODE_LABELS[block.mode];
}

/** Résumé court d'un bloc : « AMRAP 12′ », « Tabata 8× »… */
export function blockSummary(block: Block): string {
  const p = block.params;
  const name = block.name?.trim();
  let s: string;
  switch (block.mode) {
    case 'amrap':
      s = `AMRAP ${fmtShort(p.duration ?? DEFAULTS.amrap)}`;
      break;
    case 'fortime':
      s = p.duration ? `For Time · cap ${fmtShort(p.duration)}` : 'For Time';
      break;
    case 'emom': {
      const iv = p.interval ?? DEFAULTS.emomInterval;
      const r = p.rounds ?? DEFAULTS.emomRounds;
      s = iv === 60 ? `EMOM ${r}′` : `E${iv / 60 === Math.round(iv / 60) ? iv / 60 : fmtShort(iv)}MOM × ${r}`;
      break;
    }
    case 'tabata':
      s = `Tabata ${(p.rounds ?? 8) * (p.sets ?? 1)}×`;
      break;
    case 'interval':
      s = `Intervalles ${p.work ?? 40}/${p.rest ?? 20} × ${p.rounds ?? 10}${(p.sets ?? 1) > 1 ? ` × ${p.sets}` : ''}`;
      break;
    case 'stopwatch':
      s = 'Chrono libre';
      break;
    case 'countdown':
      s = `Minuteur ${fmtShort(p.duration ?? DEFAULTS.countdown)}`;
      break;
    case 'custom':
      s = `${(p.steps ?? []).length} étapes${(p.repeats ?? 1) > 1 ? ` × ${p.repeats}` : ''}`;
      break;
    case 'strength': {
      const n = (p.lifts ?? []).length;
      s = `Muscu · ${n} exercice${n > 1 ? 's' : ''}`;
      break;
    }
    case 'run': {
      const n = (p.segments ?? []).length;
      s = `Course · ${n} segment${n > 1 ? 's' : ''}${(p.repeats ?? 1) > 1 ? ` × ${p.repeats}` : ''}`;
      break;
    }
  }
  return name && name !== MODE_LABELS[block.mode] ? `${name} · ${s}` : s;
}

function exerciseName(block: Block, i: number, fallback: string, rotating = false): string {
  if (rotating && block.params.rotate === false) return fallback;
  const list = block.exercises.filter((e) => e.name.trim());
  if (!list.length) return fallback;
  const e = list[i % list.length];
  return e.reps ? `${e.reps} ${e.name}` : e.name;
}

export function buildBlockPhases(block: Block, blockIndex: number): Phase[] {
  const p = block.params;
  const base = { blockIndex, mode: block.mode } as const;
  const out: Phase[] = [];

  switch (block.mode) {
    case 'fortime': {
      const cap = p.duration && p.duration > 0 ? p.duration : null;
      out.push({
        ...base, kind: 'work', label: exerciseName(block, 0, 'For Time'), duration: cap, countUp: true,
        detail: cap ? `Time cap ${fmtShort(cap)}` : 'Au plus vite', action: 'done', roundCounter: true,
      });
      break;
    }
    case 'amrap': {
      const d = p.duration ?? DEFAULTS.amrap;
      out.push({ ...base, kind: 'work', label: 'AMRAP', duration: d, countUp: false, detail: `AMRAP ${fmtShort(d)}`, roundCounter: true });
      break;
    }
    case 'emom': {
      const iv = p.interval ?? DEFAULTS.emomInterval;
      const rounds = p.rounds ?? DEFAULTS.emomRounds;
      for (let r = 1; r <= rounds; r++) {
        out.push({
          ...base, kind: 'work', label: exerciseName(block, r - 1, `Minute ${r}`, true), duration: iv, countUp: false,
          round: r, rounds, detail: blockSummary(block),
        });
      }
      break;
    }
    case 'tabata':
    case 'interval': {
      const d = block.mode === 'tabata' ? DEFAULTS.tabata : DEFAULTS.interval;
      const work = p.work ?? d.work;
      const rest = p.rest ?? d.rest;
      const rounds = p.rounds ?? d.rounds;
      const sets = Math.max(1, p.sets ?? 1);
      const setRest = p.setRest ?? 0;
      const detail = `${MODE_LABELS[block.mode]} ${work}″ / ${rest}″`;
      for (let s = 1; s <= sets; s++) {
        for (let r = 1; r <= rounds; r++) {
          out.push({
            ...base, kind: 'work', label: exerciseName(block, r - 1, 'Effort', true), duration: work, countUp: false,
            round: r, rounds, set: s, sets, detail,
          });
          const lastOfSet = r === rounds;
          const lastOverall = lastOfSet && s === sets;
          if (lastOverall) continue;
          const restDur = lastOfSet && setRest > 0 ? setRest : rest;
          if (restDur > 0) {
            out.push({
              ...base, kind: 'rest', label: lastOfSet && setRest > 0 ? 'Repos entre séries' : 'Repos', duration: restDur,
              countUp: false, round: r, rounds, set: s, sets, detail,
            });
          }
        }
      }
      break;
    }
    case 'stopwatch':
      out.push({ ...base, kind: 'work', label: 'Chrono', duration: null, countUp: true, action: 'done', laps: true, detail: 'Chrono libre' });
      break;
    case 'countdown': {
      const d = p.duration ?? DEFAULTS.countdown;
      out.push({ ...base, kind: 'work', label: exerciseName(block, 0, 'Minuteur'), duration: d, countUp: false, detail: `Minuteur ${fmtShort(d)}` });
      break;
    }
    case 'custom': {
      const steps = (p.steps ?? []).filter((st) => st.duration > 0);
      const repeats = Math.max(1, p.repeats ?? 1);
      for (let r = 1; r <= repeats; r++) {
        for (const st of steps) {
          out.push({
            ...base, kind: st.kind, label: st.name || (st.kind === 'rest' ? 'Repos' : 'Effort'), duration: st.duration,
            countUp: false, round: repeats > 1 ? r : undefined, rounds: repeats > 1 ? repeats : undefined,
            detail: blockTitle(block),
          });
        }
      }
      break;
    }
    case 'strength': {
      const lifts = (p.lifts ?? []).filter((l) => l.name.trim() && l.sets > 0);
      lifts.forEach((l, li) => {
        for (let s = 1; s <= l.sets; s++) {
          out.push({
            ...base, kind: 'work', label: l.name, duration: null, countUp: true, set: s, sets: l.sets,
            detail: [l.reps && `${l.reps} reps`, l.load].filter(Boolean).join(' · ') || 'Musculation', action: 'setDone',
          });
          const last = li === lifts.length - 1 && s === l.sets;
          if (!last && l.rest > 0) {
            const nextName = s < l.sets ? l.name : lifts[li + 1].name;
            out.push({
              ...base, kind: 'rest', label: 'Repos', duration: l.rest, countUp: false, set: s, sets: l.sets,
              detail: `Ensuite : ${nextName}`,
            });
          }
        }
      });
      break;
    }
    case 'run': {
      const segs = (p.segments ?? []).filter((sg) => sg.duration > 0);
      const repeats = Math.max(1, p.repeats ?? 1);
      for (let r = 1; r <= repeats; r++) {
        for (const sg of segs) {
          out.push({
            ...base, kind: sg.kind, label: sg.name || (sg.kind === 'rest' ? 'Récup' : 'Course'), duration: sg.duration,
            countUp: false, round: repeats > 1 ? r : undefined, rounds: repeats > 1 ? repeats : undefined,
            detail: sg.pace ? `Allure ${sg.pace}` : 'Course',
          });
        }
      }
      break;
    }
  }
  return out.filter((ph) => ph.duration === null || ph.duration > 0);
}

export function buildPhases(workout: Pick<Workout, 'blocks'>, prepSeconds: number): Phase[] {
  const out: Phase[] = [];
  const blocks = workout.blocks;
  blocks.forEach((b, i) => {
    out.push(...buildBlockPhases(b, i));
    if (b.restAfter > 0 && i < blocks.length - 1) {
      out.push({
        kind: 'rest', label: 'Transition', duration: b.restAfter, countUp: false, blockIndex: i, mode: null,
        detail: `Ensuite : ${blockTitle(blocks[i + 1])}`,
      });
    }
  });
  if (out.length && prepSeconds > 0) {
    out.unshift({
      kind: 'prep', label: 'Préparation', duration: prepSeconds, countUp: false, blockIndex: 0, mode: null,
      detail: blocks.length ? blockSummary(blocks[0]) : undefined,
    });
  }
  return out;
}

/** Temps estimé d'un bloc en secondes. Les séries de musculation comptent 40 s. */
export function estimateBlock(block: Block): number {
  return buildBlockPhases(block, 0).reduce((t, ph) => t + (ph.duration ?? (ph.action === 'setDone' ? 40 : 0)), 0);
}

export function estimateWorkout(workout: Pick<Workout, 'blocks'>): number {
  return workout.blocks.reduce(
    (t, b, i) => t + estimateBlock(b) + (i < workout.blocks.length - 1 ? b.restAfter : 0),
    0,
  );
}
