import { useLiveQuery } from 'dexie-react-hooks';
import { db, getSettings } from './db';
import { DEFAULT_SETTINGS } from './defaults';
import type { ScheduledSession, SessionLog, Settings, Workout } from './types';

export function useSettings(): Settings {
  return useLiveQuery(() => getSettings(), [], DEFAULT_SETTINGS);
}

export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(() => db.workouts.orderBy('updatedAt').reverse().toArray(), []);
}

export function useWorkout(id: string | undefined): Workout | undefined | null {
  return useLiveQuery(async () => (id ? (await db.workouts.get(id)) ?? null : null), [id]);
}

export function useSchedules(): ScheduledSession[] | undefined {
  return useLiveQuery(() => db.schedules.toArray(), []);
}

export function useLogs(): SessionLog[] | undefined {
  return useLiveQuery(() => db.logs.orderBy('startedAt').reverse().toArray(), []);
}

export function useLog(id: string | undefined): SessionLog | undefined | null {
  return useLiveQuery(async () => (id ? (await db.logs.get(id)) ?? null : null), [id]);
}
