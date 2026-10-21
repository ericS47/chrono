// Modèle de données de Chrono (voir le plan, section « Modèle de données »).
// Toutes les durées sont en secondes.

export type Mode =
  | 'fortime'
  | 'amrap'
  | 'emom'
  | 'tabata'
  | 'interval'
  | 'stopwatch'
  | 'countdown'
  | 'custom'
  | 'strength'
  | 'run';

export interface Exercise {
  name: string;
  reps?: string;
  load?: string;
}

export interface CustomStep {
  name: string;
  duration: number;
  kind: 'work' | 'rest';
}

export interface StrengthExercise {
  name: string;
  sets: number;
  reps: string;
  load?: string;
  rest: number;
}

export interface RunSegment {
  name: string;
  duration: number;
  pace?: string;
  kind: 'work' | 'rest';
}

export interface BlockParams {
  /** AMRAP, compte à rebours : durée. For Time : time cap (0 = sans limite). */
  duration?: number;
  /** EMOM : intervalle. */
  interval?: number;
  /** Tabata / Intervalles. */
  work?: number;
  rest?: number;
  /** EMOM / Tabata / Intervalles : nombre de tours. */
  rounds?: number;
  sets?: number;
  setRest?: number;
  /** EMOM / Tabata / Intervalles : un exercice différent à chaque tour (défaut : oui). */
  rotate?: boolean;
  /** Personnalisé. */
  steps?: CustomStep[];
  /** Personnalisé / Course : répétitions de la liste. */
  repeats?: number;
  /** Musculation. */
  lifts?: StrengthExercise[];
  /** Course. */
  segments?: RunSegment[];
}

export interface Block {
  id: string;
  mode: Mode;
  name?: string;
  params: BlockParams;
  exercises: Exercise[];
  /** Repos après le bloc (s). */
  restAfter: number;
}

export interface Workout {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  favorite: boolean;
  blocks: Block[];
  /** Délai de préparation propre à la séance (null = réglage par défaut). */
  prepSeconds?: number | null;
  /** Surcharge des réglages son pour cette séance. */
  sound?: Partial<SoundSettings>;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduledSession {
  id: string;
  workoutId: string;
  /** Date de première occurrence, AAAA-MM-JJ. */
  date: string;
  /** HH:mm */
  time: string;
  /** Jours de la semaine (0 = dimanche … 6 = samedi). Vide = séance unique. */
  weekdays: number[];
  /** Dernière date de la récurrence (incluse), optionnelle. */
  until?: string;
  /** Rappel X minutes avant (null = pas de rappel). */
  reminderMinutes: number | null;
  /** Statut par occurrence (date AAAA-MM-JJ). Absent = prévue. */
  status: Record<string, 'done' | 'skipped'>;
  createdAt: number;
}

export interface BlockResult {
  blockIndex: number;
  timeSec?: number;
  rounds?: number;
  reps?: number;
  loads?: string;
}

export interface SessionLog {
  id: string;
  workoutId: string | null;
  workoutName: string;
  /** Copie de la séance au moment où elle a été faite. */
  snapshot: Workout | null;
  startedAt: number;
  endedAt: number;
  durationSec: number;
  results: BlockResult[];
  rpe?: number;
  note?: string;
  manual: boolean;
  scheduledId?: string;
  scheduledDate?: string;
}

export type SoundEvent = 'start' | 'workEnd' | 'restEnd' | 'countdown' | 'halfway' | 'finish';
export type SoundName = 'bip' | 'double' | 'aigu' | 'gong' | 'cloche' | 'sifflet';

export interface SoundSettings {
  master: number;
  beepVolume: number;
  voiceVolume: number;
  events: Record<SoundEvent, { enabled: boolean; sound: SoundName }>;
  voice: boolean;
  announcePhase: boolean;
  announceRound: boolean;
  announceRemaining: boolean;
  /** Nombre de bips du décompte final (0 à 5). */
  countdownBeeps: number;
  silent: boolean;
}

export interface Settings {
  id: 'settings';
  sound: SoundSettings;
  prepSeconds: number;
  vibration: boolean;
  keepAwake: boolean;
  theme: 'light' | 'dark' | 'system';
  saveMode: 'ask' | 'always' | 'never';
  /** Suppression auto de l'historique plus vieux que X mois (0 = jamais). */
  historyMonths: number;
}

export const MODE_LABELS: Record<Mode, string> = {
  fortime: 'For Time',
  amrap: 'AMRAP',
  emom: 'EMOM',
  tabata: 'Tabata',
  interval: 'Intervalles',
  stopwatch: 'Chrono',
  countdown: 'Compte à rebours',
  custom: 'Personnalisé',
  strength: 'Musculation',
  run: 'Course',
};

export const MODE_DESC: Record<Mode, string> = {
  fortime: 'Au plus vite',
  amrap: 'Max de tours',
  emom: 'Chaque minute',
  tabata: '20″ / 10″',
  interval: 'Sur mesure',
  stopwatch: 'Libre',
  countdown: 'Minuteur',
  custom: 'Étapes libres',
  strength: 'Séries × reps',
  run: 'Segments',
};

/** Couleurs des modes (tuiles de l'accueil). */
export const MODE_COLORS: Record<Mode, string> = {
  amrap: '#FFBE98',
  emom: '#3DD6C6',
  fortime: '#FFC93C',
  tabata: '#B9A6FF',
  interval: '#FF9F5A',
  stopwatch: '#8FA3FF',
  countdown: '#9BD3F5',
  custom: '#F5A8C8',
  strength: '#B5D98A',
  run: '#7FD1A8',
};

export const ALL_MODES: Mode[] = [
  'amrap', 'emom', 'fortime', 'tabata', 'interval', 'stopwatch', 'countdown', 'custom', 'strength', 'run',
];
