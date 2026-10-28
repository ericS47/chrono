// Moteur de chrono pur : aucune minuterie interne. Le temps est toujours
// calculé à partir de l'heure de début de la phase (horloge passée en
// paramètre), jamais en comptant des ticks : aucune dérive, même en pause
// ou si le navigateur ralentit la page.

import type { Phase } from './phases';

export type RunStatus = 'idle' | 'running' | 'paused' | 'finished';

export interface RunState {
  phases: Phase[];
  index: number;
  status: RunStatus;
  /** Instant (ms) où la phase courante a commencé, décalé des pauses. */
  phaseStart: number;
  pausedAt: number | null;
  startedAt: number | null;
  endedAt: number | null;
  /** Temps réellement passé dans chaque phase (ms). */
  spent: number[];
  /** Tours comptés au tap, par bloc. */
  roundCount: Record<number, number>;
  /** Tours intermédiaires (ms depuis le début de la phase), par index de phase. */
  laps: Record<number, number[]>;
}

export type EngineEvent =
  | { type: 'phase'; index: number; auto: boolean }
  | { type: 'finish' };

export function createRun(phases: Phase[]): RunState {
  return {
    phases,
    index: 0,
    status: phases.length ? 'idle' : 'finished',
    phaseStart: 0,
    pausedAt: null,
    startedAt: null,
    endedAt: null,
    spent: phases.map(() => 0),
    roundCount: {},
    laps: {},
  };
}

export function start(s: RunState, now: number): RunState {
  if (s.status !== 'idle') return s;
  return { ...s, status: 'running', phaseStart: now, startedAt: now };
}

/** Temps écoulé dans la phase courante (ms). */
export function elapsed(s: RunState, now: number): number {
  if (s.status === 'idle') return 0;
  if (s.status === 'finished') return s.spent[s.index] ?? 0;
  const ref = s.status === 'paused' && s.pausedAt !== null ? s.pausedAt : now;
  return Math.max(0, ref - s.phaseStart);
}

/** Temps restant dans la phase courante (ms), null pour une phase ouverte. */
export function remaining(s: RunState, now: number): number | null {
  const ph = s.phases[s.index];
  if (!ph || ph.duration === null) return null;
  return Math.max(0, ph.duration * 1000 - elapsed(s, now));
}

/** Somme des durées restantes connues (phase courante incluse), en ms. */
export function totalRemaining(s: RunState, now: number): number {
  if (s.status === 'finished') return 0;
  let t = remaining(s, now) ?? 0;
  for (let i = s.index + 1; i < s.phases.length; i++) t += (s.phases[i].duration ?? 0) * 1000;
  return t;
}

/** Progression de la phase courante entre 0 et 1 (0 pour une phase ouverte). */
export function progress(s: RunState, now: number): number {
  const ph = s.phases[s.index];
  if (!ph || ph.duration === null || ph.duration === 0) return 0;
  return Math.min(1, elapsed(s, now) / (ph.duration * 1000));
}

function finishAt(s: RunState, at: number, events: EngineEvent[]): RunState {
  events.push({ type: 'finish' });
  return { ...s, status: 'finished', endedAt: at, pausedAt: null };
}

/**
 * Fait avancer le chrono jusqu'à `now`. Si plusieurs phases se sont écoulées
 * (page gelée en arrière-plan), elles sont toutes franchies, chacune à son
 * heure exacte de fin.
 */
export function tick(s: RunState, now: number): { state: RunState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  if (s.status !== 'running') return { state: s, events };
  let st = s;
  for (;;) {
    const ph = st.phases[st.index];
    if (ph.duration === null) break;
    const end = st.phaseStart + ph.duration * 1000;
    if (now < end) break;
    const spent = st.spent.slice();
    spent[st.index] = ph.duration * 1000;
    if (st.index >= st.phases.length - 1) {
      st = finishAt({ ...st, spent }, end, events);
      break;
    }
    st = { ...st, spent, index: st.index + 1, phaseStart: end };
    events.push({ type: 'phase', index: st.index, auto: true });
  }
  return { state: st, events };
}

export function pause(s: RunState, now: number): RunState {
  if (s.status !== 'running') return s;
  return { ...s, status: 'paused', pausedAt: now };
}

export function resume(s: RunState, now: number): RunState {
  if (s.status !== 'paused' || s.pausedAt === null) return s;
  return { ...s, status: 'running', phaseStart: s.phaseStart + (now - s.pausedAt), pausedAt: null };
}

/** Passe à la phase suivante (ou termine la séance). Garde l'état pause. */
export function next(s: RunState, now: number): { state: RunState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  if (s.status === 'finished') return { state: s, events };
  let st = s.status === 'idle' ? start(s, now) : s;
  const spent = st.spent.slice();
  spent[st.index] = elapsed(st, now);
  if (st.index >= st.phases.length - 1) {
    return { state: finishAt({ ...st, spent }, now, events), events };
  }
  st = {
    ...st,
    spent,
    index: st.index + 1,
    phaseStart: now,
    pausedAt: st.status === 'paused' ? now : null,
  };
  events.push({ type: 'phase', index: st.index, auto: false });
  return { state: st, events };
}

/**
 * Revient au début de la phase courante, ou à la phase précédente si l'on
 * est dans les 3 premières secondes.
 */
export function prev(s: RunState, now: number): { state: RunState; events: EngineEvent[] } {
  const events: EngineEvent[] = [];
  if (s.status === 'idle' || s.status === 'finished') return { state: s, events };
  const back = elapsed(s, now) < 3000 && s.index > 0;
  const index = back ? s.index - 1 : s.index;
  const spent = s.spent.slice();
  spent[s.index] = 0;
  if (back) spent[index] = 0;
  const st: RunState = { ...s, spent, index, phaseStart: now, pausedAt: s.status === 'paused' ? now : null };
  events.push({ type: 'phase', index, auto: false });
  return { state: st, events };
}

/** Termine la séance immédiatement. */
export function stop(s: RunState, now: number): RunState {
  if (s.status === 'finished') return s;
  const spent = s.spent.slice();
  spent[s.index] = elapsed(s, now);
  return { ...s, spent, status: 'finished', endedAt: now, pausedAt: null };
}

export function addRound(s: RunState, delta = 1): RunState {
  const b = s.phases[s.index]?.blockIndex ?? 0;
  const n = Math.max(0, (s.roundCount[b] ?? 0) + delta);
  return { ...s, roundCount: { ...s.roundCount, [b]: n } };
}

export function lap(s: RunState, now: number): RunState {
  if (s.status !== 'running') return s;
  const list = [...(s.laps[s.index] ?? []), elapsed(s, now)];
  return { ...s, laps: { ...s.laps, [s.index]: list } };
}

/** Temps actif total (ms) : préparation exclue. */
export function activeTime(s: RunState): number {
  return s.phases.reduce((t, ph, i) => t + (ph.kind === 'prep' ? 0 : s.spent[i] ?? 0), 0);
}

/** Temps passé dans les phases d'effort d'un bloc (ms). */
export function blockWorkTime(s: RunState, blockIndex: number): number {
  return s.phases.reduce(
    (t, ph, i) => t + (ph.blockIndex === blockIndex && ph.kind === 'work' && ph.mode !== null ? s.spent[i] ?? 0 : 0),
    0,
  );
}

/**
 * Décale tous les instants d'un état de `delta` ms. Sert à reprendre une séance
 * enregistrée : l'horloge de la page repart de zéro à chaque ouverture.
 */
export function shiftRun(s: RunState, delta: number): RunState {
  const sh = (t: number | null) => (t === null ? null : t + delta);
  return {
    ...s,
    phaseStart: s.status === 'idle' ? s.phaseStart : s.phaseStart + delta,
    pausedAt: sh(s.pausedAt),
    startedAt: sh(s.startedAt),
    endedAt: sh(s.endedAt),
  };
}
