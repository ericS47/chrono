import { db } from './db';
import type { ScheduledSession } from './types';
import { addDays, isoDate, parseIsoDate, uid } from '../lib/format';

export async function setOccurrenceStatus(schedId: string, date: string, status: 'done' | 'skipped' | null): Promise<void> {
  const s = await db.schedules.get(schedId);
  if (!s) return;
  const next = { ...s.status };
  if (status) next[date] = status;
  else delete next[date];
  await db.schedules.put({ ...s, status: next });
}

/** Décale une occurrence au lendemain (même heure). */
export async function postpone(s: ScheduledSession, date: string, days = 1): Promise<void> {
  const target = isoDate(addDays(parseIsoDate(date), days));
  if (!s.weekdays.length) {
    await db.schedules.put({ ...s, date: target });
    return;
  }
  await setOccurrenceStatus(s.id, date, 'skipped');
  await db.schedules.put({
    id: uid(), workoutId: s.workoutId, date: target, time: s.time, weekdays: [], reminderMinutes: s.reminderMinutes, status: {}, createdAt: Date.now(),
  });
}
