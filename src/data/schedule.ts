// Récurrence simple des séances planifiées (« tous les lundis et jeudis »).

import type { ScheduledSession } from './types';
import { addDays, isoDate, parseIsoDate } from '../lib/format';

export interface Occurrence {
  sched: ScheduledSession;
  date: string;
  time: string;
  status: 'planned' | 'done' | 'skipped';
}

/** La séance planifiée a-t-elle lieu ce jour-là ? */
export function occursOn(s: ScheduledSession, date: string): boolean {
  if (date < s.date) return false;
  if (s.until && date > s.until) return false;
  if (!s.weekdays.length) return date === s.date;
  return s.weekdays.includes(parseIsoDate(date).getDay());
}

/** Occurrences entre deux dates incluses (AAAA-MM-JJ), triées par date et heure. */
export function occurrencesBetween(list: ScheduledSession[], from: string, to: string): Occurrence[] {
  const out: Occurrence[] = [];
  for (let d = parseIsoDate(from); isoDate(d) <= to; d = addDays(d, 1)) {
    const date = isoDate(d);
    for (const s of list) {
      if (occursOn(s, date)) out.push({ sched: s, date, time: s.time, status: s.status[date] ?? 'planned' });
    }
  }
  return out.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
}

export function occurrenceTime(date: string, time: string): Date {
  const d = parseIsoDate(date);
  const [h, m] = time.split(':').map(Number);
  d.setHours(h, m, 0, 0);
  return d;
}

/** Rappels à programmer dans les `days` prochains jours. */
export function upcomingReminders(list: ScheduledSession[], now: Date, days = 30): { sched: ScheduledSession; date: string; at: Date }[] {
  const occ = occurrencesBetween(list, isoDate(now), isoDate(addDays(now, days)));
  return occ
    .filter((o) => o.status === 'planned' && o.sched.reminderMinutes !== null)
    .map((o) => ({ sched: o.sched, date: o.date, at: new Date(occurrenceTime(o.date, o.time).getTime() - (o.sched.reminderMinutes ?? 0) * 60_000) }))
    .filter((r) => r.at.getTime() > now.getTime());
}

/** Nombre de semaines actives consécutives (au moins une séance), en finissant par la semaine courante ou la précédente. */
export function activeWeekStreak(dates: Date[], now: Date): number {
  const weekKey = (d: Date) => {
    const m = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
    return isoDate(m);
  };
  const weeks = new Set(dates.map(weekKey));
  let cur = new Date(now);
  if (!weeks.has(weekKey(cur))) cur = addDays(cur, -7);
  let n = 0;
  while (weeks.has(weekKey(cur))) {
    n++;
    cur = addDays(cur, -7);
  }
  return n;
}
