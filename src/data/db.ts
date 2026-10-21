// Stockage local (IndexedDB via Dexie). Rien ne quitte le téléphone.

import Dexie, { type Table } from 'dexie';
import type { ScheduledSession, SessionLog, Settings, Workout } from './types';
import { DEFAULT_SETTINGS, normalizeSettings } from './defaults';

export class ChronoDB extends Dexie {
  workouts!: Table<Workout, string>;
  schedules!: Table<ScheduledSession, string>;
  logs!: Table<SessionLog, string>;
  settings!: Table<Settings, string>;

  constructor(name = 'chrono') {
    super(name);
    this.version(1).stores({
      workouts: 'id, name, favorite, updatedAt',
      schedules: 'id, workoutId, date',
      logs: 'id, workoutId, startedAt',
      settings: 'id',
    });
  }
}

export const db = new ChronoDB();

export async function getSettings(d: ChronoDB = db): Promise<Settings> {
  return normalizeSettings(await d.settings.get('settings'));
}

export async function saveSettings(s: Settings, d: ChronoDB = db): Promise<void> {
  await d.settings.put({ ...s, id: 'settings' });
}

export async function saveWorkout(w: Workout, d: ChronoDB = db): Promise<void> {
  await d.workouts.put({ ...w, updatedAt: Date.now() });
}

/** Supprime une séance et ses planifications (l'historique garde sa copie). */
export async function deleteWorkout(id: string, d: ChronoDB = db): Promise<void> {
  await d.transaction('rw', d.workouts, d.schedules, async () => {
    await d.workouts.delete(id);
    await d.schedules.where('workoutId').equals(id).delete();
  });
}

/** Supprime l'historique plus vieux que `months` mois. Retourne le nombre supprimé. */
export async function pruneHistory(months: number, now = Date.now(), d: ChronoDB = db): Promise<number> {
  if (months <= 0) return 0;
  const limit = new Date(now);
  limit.setMonth(limit.getMonth() - months);
  return d.logs.where('startedAt').below(limit.getTime()).delete();
}

export interface Backup {
  app: 'chrono';
  version: 1;
  exportedAt: string;
  workouts: Workout[];
  schedules: ScheduledSession[];
  logs: SessionLog[];
  settings: Settings;
}

export async function exportBackup(d: ChronoDB = db): Promise<Backup> {
  return {
    app: 'chrono',
    version: 1,
    exportedAt: new Date().toISOString(),
    workouts: await d.workouts.toArray(),
    schedules: await d.schedules.toArray(),
    logs: await d.logs.toArray(),
    settings: await getSettings(d),
  };
}

/** Importe une sauvegarde. `replace` vide d'abord les données existantes, sinon fusionne. */
export async function importBackup(data: unknown, replace: boolean, d: ChronoDB = db): Promise<{ workouts: number; logs: number }> {
  const b = data as Partial<Backup>;
  if (!b || b.app !== 'chrono' || !Array.isArray(b.workouts)) throw new Error('Ce fichier n’est pas une sauvegarde Chrono.');
  await d.transaction('rw', [d.workouts, d.schedules, d.logs, d.settings], async () => {
    if (replace) {
      await Promise.all([d.workouts.clear(), d.schedules.clear(), d.logs.clear()]);
    }
    await d.workouts.bulkPut(b.workouts ?? []);
    await d.schedules.bulkPut(b.schedules ?? []);
    await d.logs.bulkPut(b.logs ?? []);
    if (b.settings) await d.settings.put(normalizeSettings(b.settings));
  });
  return { workouts: b.workouts.length, logs: (b.logs ?? []).length };
}

export { DEFAULT_SETTINGS };
