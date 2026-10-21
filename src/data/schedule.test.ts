import { describe, expect, it } from 'vitest';
import { activeWeekStreak, occurrencesBetween, occursOn, upcomingReminders } from './schedule';
import type { ScheduledSession } from './types';

const s = (o: Partial<ScheduledSession>): ScheduledSession => ({
  id: 'a', workoutId: 'w', date: '2026-10-19', time: '18:30', weekdays: [], reminderMinutes: 15, status: {}, createdAt: 0, ...o,
});

describe('planification', () => {
  it('séance unique', () => {
    expect(occursOn(s({}), '2026-10-19')).toBe(true);
    expect(occursOn(s({}), '2026-10-20')).toBe(false);
  });

  it('récurrence lundi + jeudi, avec date de fin', () => {
    const r = s({ weekdays: [1, 4], until: '2026-11-01' });
    const occ = occurrencesBetween([r], '2026-10-01', '2026-11-30');
    expect(occ.map((o) => o.date)).toEqual(['2026-10-19', '2026-10-22', '2026-10-26', '2026-10-29']);
  });

  it('statut par occurrence et tri par heure', () => {
    const a = s({ id: 'a', time: '18:30', status: { '2026-10-19': 'done' } });
    const b = s({ id: 'b', time: '07:00' });
    const occ = occurrencesBetween([a, b], '2026-10-19', '2026-10-19');
    expect(occ.map((o) => [o.sched.id, o.status])).toEqual([['b', 'planned'], ['a', 'done']]);
  });

  it('rappels à venir uniquement', () => {
    const r = s({ weekdays: [1] });
    const now = new Date(2026, 9, 19, 18, 20); // lundi 18:20, rappel du jour à 18:15 déjà passé
    const list = upcomingReminders([r], now, 14);
    expect(list.map((x) => x.date)).toEqual(['2026-10-26', '2026-11-02']);
    expect(list[0].at.getHours()).toBe(18);
    expect(list[0].at.getMinutes()).toBe(15);
    expect(upcomingReminders([s({ reminderMinutes: null, date: '2026-10-25' })], now)).toEqual([]);
  });

  it('série de semaines actives', () => {
    const now = new Date(2026, 9, 21);
    const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);
    expect(activeWeekStreak([d(2026, 10, 20), d(2026, 10, 14), d(2026, 10, 6)], now)).toBe(3);
    expect(activeWeekStreak([d(2026, 10, 14), d(2026, 10, 6)], now)).toBe(2);
    expect(activeWeekStreak([d(2026, 9, 1)], now)).toBe(0);
  });
});
