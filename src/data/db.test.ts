import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { ChronoDB, deleteWorkout, exportBackup, getSettings, importBackup, pruneHistory, saveSettings, saveWorkout } from './db';
import { newWorkout } from './defaults';
import type { SessionLog } from './types';

const log = (id: string, startedAt: number): SessionLog => ({
  id, workoutId: null, workoutName: 'x', snapshot: null, startedAt, endedAt: startedAt, durationSec: 60, results: [], manual: true,
});

describe('stockage local', () => {
  it('réglages par défaut puis sauvegardés', async () => {
    const d = new ChronoDB('t1');
    const s = await getSettings(d);
    expect(s.prepSeconds).toBe(10);
    await saveSettings({ ...s, prepSeconds: 30 }, d);
    expect((await getSettings(d)).prepSeconds).toBe(30);
  });

  it('supprimer une séance supprime ses planifications', async () => {
    const d = new ChronoDB('t2');
    const w = newWorkout();
    await saveWorkout(w, d);
    await d.schedules.put({ id: 's', workoutId: w.id, date: '2026-10-21', time: '18:00', weekdays: [], reminderMinutes: null, status: {}, createdAt: 0 });
    await deleteWorkout(w.id, d);
    expect(await d.workouts.count()).toBe(0);
    expect(await d.schedules.count()).toBe(0);
  });

  it('nettoie l’historique ancien', async () => {
    const d = new ChronoDB('t3');
    const now = new Date(2026, 9, 21).getTime();
    await d.logs.bulkPut([log('old', new Date(2026, 0, 1).getTime()), log('new', new Date(2026, 9, 1).getTime())]);
    expect(await pruneHistory(6, now, d)).toBe(1);
    expect((await d.logs.toArray()).map((l) => l.id)).toEqual(['new']);
    expect(await pruneHistory(0, now, d)).toBe(0);
  });

  it('export puis import (remplacement et fusion)', async () => {
    const a = new ChronoDB('t4');
    await saveWorkout(newWorkout('A'), a);
    await a.logs.put(log('l1', 1));
    const backup = JSON.parse(JSON.stringify(await exportBackup(a)));
    const b = new ChronoDB('t5');
    await saveWorkout(newWorkout('B'), b);
    await importBackup(backup, false, b);
    expect(await b.workouts.count()).toBe(2);
    await importBackup(backup, true, b);
    expect((await b.workouts.toArray()).map((w) => w.name)).toEqual(['A']);
    await expect(importBackup({ foo: 1 }, true, b)).rejects.toThrow();
  });
});
